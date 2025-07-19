import {
    TOWER_COMMANDS,
    TOWER_AUDIO_LIBRARY,
    AUDIO_COMMAND_POS,
    DRUM_PACKETS,
    drumPositionCmds,
    type Lights,
    type TowerSide,
    type LedgeLight,
    type DoorwayLight,
    type SealIdentifier
} from './udtConstants';
import { type TowerState } from './functions';
import { Logger } from './udtLogger';
import { UdtCommandFactory } from './udtCommandFactory';
import { UdtBleConnection } from './udtBleConnection';
import { TowerResponseProcessor } from './udtTowerResponse';
import { CommandQueue } from './udtCommandQueue';
import { commandToPacketString } from './udtHelpers';


export interface TowerCommandDependencies {
    logger: Logger;
    commandFactory: UdtCommandFactory;
    bleConnection: UdtBleConnection;
    responseProcessor: TowerResponseProcessor;
    currentDrumPositions: { topMiddle: number; bottom: number };
    logDetail: boolean;
    retrySendCommandCount: { value: number };
    retrySendCommandMax: number;
    getCurrentTowerState: () => TowerState;
}

export class UdtTowerCommands {
    private deps: TowerCommandDependencies;
    private commandQueue: CommandQueue;

    constructor(dependencies: TowerCommandDependencies) {
        this.deps = dependencies;

        // Initialize command queue with the actual send function
        this.commandQueue = new CommandQueue(
            this.deps.logger,
            (command: Uint8Array) => this.sendTowerCommandDirect(command)
        );
    }

    /**
     * Sends a command packet to the tower via the command queue
     * @param command - The command packet to send to the tower
     * @param description - Optional description for logging
     * @returns Promise that resolves when command is completed
     */
    async sendTowerCommand(command: Uint8Array, description?: string): Promise<void> {
        return await this.commandQueue.enqueue(command, description);
    }

    /**
     * Directly sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * This method is used internally by the command queue.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    private async sendTowerCommandDirect(command: Uint8Array): Promise<void> {
        try {
            const cmdStr = commandToPacketString(command);
            this.deps.logDetail && this.deps.logger.debug(`packet(s) sent: ${cmdStr}`, '[UDT]');
            if (!this.deps.bleConnection.txCharacteristic || !this.deps.bleConnection.isConnected) {
                this.deps.logger.warn('Tower is not connected', '[UDT]');
                return;
            }
            await this.deps.bleConnection.txCharacteristic.writeValue(command);
            this.deps.retrySendCommandCount.value = 0;
            this.deps.bleConnection.lastSuccessfulCommand = Date.now();
        } catch (error) {
            this.deps.logger.error(`command send error: ${error}`, '[UDT]');
            const errorMsg = error?.message ?? new String(error);
            const wasCancelled = errorMsg.includes('User cancelled');
            const maxRetriesReached = this.deps.retrySendCommandCount.value >= this.deps.retrySendCommandMax;

            // Check for disconnect indicators
            const isDisconnected = errorMsg.includes('Cannot read properties of null') ||
                errorMsg.includes('GATT Server is disconnected') ||
                errorMsg.includes('Device is not connected') ||
                !this.deps.bleConnection.TowerDevice?.gatt?.connected;

            if (isDisconnected) {
                this.deps.logger.warn('Disconnect detected during command send', '[UDT]');
                await this.deps.bleConnection.disconnect();
                return;
            }

            if (!maxRetriesReached && this.deps.bleConnection.isConnected && !wasCancelled) {
                this.deps.logger.info(`retrying tower command attempt ${this.deps.retrySendCommandCount.value + 1}`, '[UDT]');
                this.deps.retrySendCommandCount.value++;
                setTimeout(() => {
                    this.sendTowerCommandDirect(command);
                }, 250 * this.deps.retrySendCommandCount.value);
            } else {
                this.deps.retrySendCommandCount.value = 0;
            }
        }
    }

    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    async calibrate(): Promise<void> {
        if (!this.deps.bleConnection.performingCalibration) {
            this.deps.logger.info('Performing Tower Calibration', '[UDT]');
            await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]), 'calibrate');

            // flag to look for calibration complete tower response
            this.deps.bleConnection.performingCalibration = true;
            this.deps.bleConnection.performingLongCommand = true;
            return;
        }

        this.deps.logger.warn('Tower calibration requested when tower is already performing calibration', '[UDT]');
        return;
    }

    /**
     * Plays a sound from the tower's audio library using stateful commands that preserve existing tower state.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex: number): Promise<void> {
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, '[UDT]');
            return;
        }

        const currentState = this.deps.getCurrentTowerState();
        const command = this.deps.commandFactory.createStatefulAudioCommand(currentState, soundIndex, false);

        this.deps.logger.info('Sending sound command (stateful)', '[UDT]');
        await this.sendTowerCommand(command, `playSound(${soundIndex})`);
    }

    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights: Lights): Promise<void> {
        const lightCommand = this.deps.commandFactory.createLightPacketCommand(lights);
        this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightCommand, this.deps.currentDrumPositions);

        this.deps.logDetail && this.deps.logger.debug(`Light Parameter ${JSON.stringify(lights)}`, '[UDT]');
        this.deps.logger.info('Sending light command', '[UDT]');
        await this.sendTowerCommand(lightCommand, 'lights');
    }

    /**
     * Sends a light override command to control specific light patterns.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light: number, soundIndex?: number): Promise<void> {
        const lightOverrideCommand = this.deps.commandFactory.createLightOverrideCommand(light);
        this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightOverrideCommand, this.deps.currentDrumPositions);
        if (soundIndex) {
            lightOverrideCommand[AUDIO_COMMAND_POS] = soundIndex;
        }

        this.deps.logger.info('Sending light override' + (soundIndex ? ' with sound' : ''), '[UDT]');
        await this.sendTowerCommand(lightOverrideCommand, `lightOverrides(${light}${soundIndex ? `, ${soundIndex}` : ''})`);
    }

    /**
     * Rotates tower drums to specified positions.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    async rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void> {
        this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, '[UDT]');

        const rotateCommand = this.deps.commandFactory.createRotateCommand(top, middle, bottom);

        if (soundIndex) {
            rotateCommand[AUDIO_COMMAND_POS] = soundIndex;
        }

        this.deps.logger.info('Sending rotate command' + (soundIndex ? ' with sound' : ''), '[UDT]');

        // Flag that we're performing a long command 
        // drum rotation can exceed battery heartbeat check default
        this.deps.bleConnection.performingLongCommand = true;
        await this.sendTowerCommand(rotateCommand, `rotate(${top}, ${middle}, ${bottom}${soundIndex ? `, ${soundIndex}` : ''})`);

        // Reset the long command flag after a delay to allow for rotation completion
        // Drum rotation time varies based on number of drums moved
        setTimeout(() => {
            this.deps.bleConnection.performingLongCommand = false;
            this.deps.bleConnection.lastBatteryHeartbeat = Date.now(); // Reset heartbeat timer
        }, this.deps.bleConnection.longTowerCommandTimeout);

        // saving drum positions
        this.deps.currentDrumPositions.topMiddle = rotateCommand[DRUM_PACKETS.topMiddle];
        this.deps.currentDrumPositions.bottom = rotateCommand[DRUM_PACKETS.bottom];
    }

    /**
   * Rotates tower drums to specified positions.
   * @param top - Position for the top drum ('north', 'east', 'south', 'west')
   * @param middle - Position for the middle drum
   * @param bottom - Position for the bottom drum
   * @param soundIndex - Optional sound to play during rotation
   * @returns Promise that resolves when rotate command is sent
   */
    async rotateWithState(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void> {
        this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, '[UDT]');

        // Convert TowerSide to numeric positions
        const positionMap: { [key in TowerSide]: number } = {
            'north': 0, 'east': 1, 'south': 2, 'west': 3
        };

        this.deps.logger.info('Sending stateful rotate commands' + (soundIndex ? ' with sound' : ''), '[UDT]');

        // Flag that we're performing a long command 
        // drum rotation can exceed battery heartbeat check default
        this.deps.bleConnection.performingLongCommand = true;

        try {
            // Rotate each drum individually using the proven single-drum stateful commands
            // This approach is more reliable than trying to change all drums in one command
            await this.rotateDrumStateful(0, positionMap[top], false);
            await this.rotateDrumStateful(1, positionMap[middle], false);
            await this.rotateDrumStateful(2, positionMap[bottom], false);

            // Play sound if requested - do this after all rotations to avoid conflicts
            if (soundIndex) {
                await this.playSound(soundIndex);
            }

        } finally {
            // Reset the long command flag after a delay to allow for rotation completion
            // Drum rotation time varies based on number of drums moved
            setTimeout(() => {
                this.deps.bleConnection.performingLongCommand = false;
                this.deps.bleConnection.lastBatteryHeartbeat = Date.now(); // Reset heartbeat timer
            }, this.deps.bleConnection.longTowerCommandTimeout);

            // Update drum positions tracking - with stateful commands we know the exact positions
            // The drum position encoding for topMiddle combines top and middle drum positions
            this.deps.currentDrumPositions.topMiddle = (positionMap[top] << 2) | positionMap[middle];
            this.deps.currentDrumPositions.bottom = positionMap[bottom];
        }
    }

    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount(): Promise<void> {
        this.deps.logger.info('Tower skull count reset requested', '[UDT]');
        await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]), 'resetTowerSkullCount');
    }

    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal: SealIdentifier): Promise<void> {
        // Play tower seal sound
        this.deps.logger.info('Playing tower seal sound', '[UDT]');
        await this.playSound(TOWER_AUDIO_LIBRARY.TowerSeal.value);

        // Light both the primary ledge and adjacent ledge for the seal's side
        // This ensures both left and right ledge lights are activated for the side
        const adjacentSides: { [key in TowerSide]: TowerSide } = {
            north: 'east',
            east: 'south',
            south: 'west',
            west: 'north'
        };

        const ledgeLights: LedgeLight[] = [
            { position: seal.side, style: 'on' },
            { position: adjacentSides[seal.side], style: 'on' }
        ];

        // Remove duplicates if any
        const uniqueLedgeLights = ledgeLights.filter((light, index, self) =>
            index === self.findIndex(l => l.position === light.position)
        );

        // Create doorway light with light effect for the broken seal
        const doorwayLights: DoorwayLight[] = [{
            level: seal.level,
            position: seal.side,
            style: 'breatheFast'
        }];

        const lights: Lights = {
            ledge: uniqueLedgeLights,
            doorway: doorwayLights
        };

        this.deps.logger.info(`Breaking seal ${seal.level}-${seal.side} - lighting ledges and doorways with breath effect`, '[UDT]');
        await this.lights(lights);
    }

    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    async randomRotateLevels(level: number = 0): Promise<void> {
        // 0 = all, 1 = top, 2 = middle, 3 = bottom
        // 4 = top & middle, 5 = top & bottom, 6 = middle & bottom

        const sides: TowerSide[] = ['north', 'east', 'south', 'west'];
        const getRandomSide = (): TowerSide => sides[Math.floor(Math.random() * sides.length)];

        // Current positions to preserve unchanged levels
        const currentTop = this.getCurrentDrumPosition('top');
        const currentMiddle = this.getCurrentDrumPosition('middle');
        const currentBottom = this.getCurrentDrumPosition('bottom');

        let topSide: TowerSide, middleSide: TowerSide, bottomSide: TowerSide;

        switch (level) {
            case 0: // all levels
                topSide = getRandomSide();
                middleSide = getRandomSide();
                bottomSide = getRandomSide();
                break;
            case 1: // top only
                topSide = getRandomSide();
                middleSide = currentMiddle;
                bottomSide = currentBottom;
                break;
            case 2: // middle only
                topSide = currentTop;
                middleSide = getRandomSide();
                bottomSide = currentBottom;
                break;
            case 3: // bottom only
                topSide = currentTop;
                middleSide = currentMiddle;
                bottomSide = getRandomSide();
                break;
            case 4: // top & middle
                topSide = getRandomSide();
                middleSide = getRandomSide();
                bottomSide = currentBottom;
                break;
            case 5: // top & bottom
                topSide = getRandomSide();
                middleSide = currentMiddle;
                bottomSide = getRandomSide();
                break;
            case 6: // middle & bottom
                topSide = currentTop;
                middleSide = getRandomSide();
                bottomSide = getRandomSide();
                break;
            default:
                this.deps.logger.error('Invalid level parameter for randomRotateLevels. Must be 0-6.', '[UDT]');
                return;
        }

        this.deps.logger.info(`Random rotating levels to: top:${topSide}, middle:${middleSide}, bottom:${bottomSide}`, '[UDT]');
        await this.rotate(topSide, middleSide, bottomSide);
    }

    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide {
        const drumPositions = drumPositionCmds[level];
        const rawValue = level === 'bottom'
            ? this.deps.currentDrumPositions.bottom
            : this.deps.currentDrumPositions.topMiddle;

        // Find matching side for current drum position
        for (const [side, value] of Object.entries(drumPositions)) {
            if (level === 'middle') {
                // For middle, compare the middle-specific bits (bits 6-7)
                if ((value & 0b11000000) === (rawValue & 0b11000000)) {
                    return side as TowerSide;
                }
            } else if (level === 'top') {
                // For top drum, compare the top-specific bits (bits 1, 2, 4)
                if ((value & 0b00010110) === (rawValue & 0b00010110)) {
                    return side as TowerSide;
                }
            } else {
                // For bottom, direct comparison
                if (value === rawValue) {
                    return side as TowerSide;
                }
            }
        }

        // Default to north if no match found
        return 'north';
    }

    //#region Stateful Command Methods

    /**
     * Sends a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns Promise that resolves when command is sent
     */
    async setLEDStateful(layerIndex: number, lightIndex: number, effect: number, loop: boolean = false): Promise<void> {
        const currentState = this.deps.getCurrentTowerState();
        const command = this.deps.commandFactory.createStatefulLEDCommand(currentState, layerIndex, lightIndex, effect, loop);

        this.deps.logger.info(`Setting LED layer ${layerIndex} light ${lightIndex} to effect ${effect}${loop ? ' (looped)' : ''}`, '[UDT]');
        await this.sendTowerCommand(command, `setLEDStateful(${layerIndex}, ${lightIndex}, ${effect}, ${loop})`);
    }

    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * @param soundIndex - Index of the sound to play (1-based)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns Promise that resolves when command is sent
     */
    async playSoundStateful(soundIndex: number, loop: boolean = false, volume?: number): Promise<void> {
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, '[UDT]');
            return;
        }

        const currentState = this.deps.getCurrentTowerState();
        const command = this.deps.commandFactory.createStatefulAudioCommand(currentState, soundIndex, loop, volume);

        this.deps.logger.info(`Playing sound ${soundIndex}${loop ? ' (looped)' : ''}${volume !== undefined ? ` at volume ${volume}` : ''}`, '[UDT]');
        await this.sendTowerCommand(command, `playSoundStateful(${soundIndex}, ${loop}${volume !== undefined ? `, ${volume}` : ''})`);
    }

    /**
     * Rotates a single drum using stateful commands that preserve existing tower state.
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns Promise that resolves when command is sent
     */
    async rotateDrumStateful(drumIndex: number, position: number, playSound: boolean = false): Promise<void> {
        const currentState = this.deps.getCurrentTowerState();
        const command = this.deps.commandFactory.createStatefulDrumCommand(currentState, drumIndex, position, playSound);

        const drumNames = ['top', 'middle', 'bottom'];
        const positionNames = ['north', 'east', 'south', 'west'];
        this.deps.logger.info(`Rotating ${drumNames[drumIndex]} drum to ${positionNames[position]}${playSound ? ' with sound' : ''}`, '[UDT]');

        // Flag that we're performing a long command
        this.deps.bleConnection.performingLongCommand = true;
        await this.sendTowerCommand(command, `rotateDrumStateful(${drumIndex}, ${position}, ${playSound})`);

        // Reset the long command flag after a delay
        setTimeout(() => {
            this.deps.bleConnection.performingLongCommand = false;
            this.deps.bleConnection.lastBatteryHeartbeat = Date.now();
        }, this.deps.bleConnection.longTowerCommandTimeout);
    }

    /**
     * Sends a complete tower state using stateful commands.
     * @param state - Complete tower state to send
     * @returns Promise that resolves when command is sent
     */
    async sendTowerStateStateful(state: TowerState): Promise<void> {
        const command = this.deps.commandFactory.packTowerStateCommand(state);

        this.deps.logger.info('Sending complete tower state', '[UDT]');
        await this.sendTowerCommand(command, 'sendTowerStateStateful');
    }

    //#endregion

    /**
     * Public access to sendTowerCommandDirect for testing purposes.
     * This bypasses the command queue and sends commands directly.
     * @param command - The command packet to send directly to the tower
     * @returns Promise that resolves when command is sent
     */
    async sendTowerCommandDirectPublic(command: Uint8Array): Promise<void> {
        return await this.sendTowerCommandDirect(command);
    }

    /**
     * Called when a tower response is received to notify the command queue
     * This should be called from the BLE connection response handler
     */
    onTowerResponse(): void {
        this.commandQueue.onResponse();
    }

    /**
     * Get command queue status for debugging
     */
    getQueueStatus() {
        return this.commandQueue.getStatus();
    }

    /**
     * Clear the command queue (for cleanup or error recovery)
     */
    clearQueue(): void {
        this.commandQueue.clear();
    }
}