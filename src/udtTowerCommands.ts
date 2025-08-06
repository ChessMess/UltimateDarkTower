import {
    TOWER_COMMANDS,
    TOWER_AUDIO_LIBRARY,
    AUDIO_COMMAND_POS,
    DRUM_PACKETS,
    drumPositionCmds,
    LIGHT_EFFECTS,
    TOWER_LAYERS,
    RING_LIGHT_POSITIONS,
    LEDGE_BASE_LIGHT_POSITIONS,
    type Lights,
    type TowerSide,
    type TowerCorner,
    type TowerLevels,
    type LedgeLight,
    type DoorwayLight,
    type SealIdentifier
} from './udtConstants';
import { type TowerState } from './udtTowerState';
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
    logDetail: boolean;
    retrySendCommandCount: { value: number };
    retrySendCommandMax: number;
    getCurrentTowerState: () => TowerState;
    setTowerState: (newState: TowerState, source: string) => void;
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
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
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
        const { command } = this.deps.commandFactory.createTransientAudioCommand(currentState, soundIndex, false);

        this.deps.logger.info('Sending sound command (stateful)', '[UDT]');

        // Send the command directly without updating state tracking 
        // Audio should not persist in state as it's a transient effect
        await this.sendTowerCommand(command, `playSound(${soundIndex})`);
    }

    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights: Lights): Promise<void> {
        this.deps.logDetail && this.deps.logger.debug(`Light Parameter ${JSON.stringify(lights)}`, '[UDT]');
        this.deps.logger.info('Sending light commands', '[UDT]');

        // Convert lights object to individual setLEDStateful calls
        const layerCommands = this.mapLightsToLayerCommands(lights);

        // Execute all light commands
        for (const { layerIndex, lightIndex, effect } of layerCommands) {
            await this.setLEDStateful(layerIndex, lightIndex, effect);
        }
    }

    /**
     * Maps the Lights object to layer/light index commands for setLEDStateful.
     * @param lights - Light configuration object
     * @returns Array of layer commands
     */
    private mapLightsToLayerCommands(lights: Lights): Array<{ layerIndex: number, lightIndex: number, effect: number, loop: boolean }> {
        const commands: Array<{ layerIndex: number, lightIndex: number, effect: number, loop: boolean }> = [];

        // Map doorway lights (top, middle, bottom rings), assumes true on loop param
        if (lights.doorway) {
            for (const doorwayLight of lights.doorway) {
                const layerIndex = this.getTowerLayerForLevel(doorwayLight.level);
                const lightIndex = this.getLightIndexForSide(doorwayLight.position);
                const effect = LIGHT_EFFECTS[doorwayLight.style] || LIGHT_EFFECTS.off;
                console.log('[cek] effect', doorwayLight.style, effect);
                commands.push({ layerIndex, lightIndex, effect, loop: true });
            }
        }

        // Map ledge lights
        if (lights.ledge) {
            for (const ledgeLight of lights.ledge) {
                const layerIndex = TOWER_LAYERS.LEDGE;
                const lightIndex = this.getLedgeLightIndexForSide(ledgeLight.position);
                const effect = LIGHT_EFFECTS[ledgeLight.style] || LIGHT_EFFECTS.off;
                commands.push({ layerIndex, lightIndex, effect, loop: false });
            }
        }

        // Map base lights (BASE1 and BASE2)
        if (lights.base) {
            for (const baseLight of lights.base) {
                // Handle both HTML attributes ('a', 'b') and proper type definitions ('bottom', 'top')
                // 'a' or 'bottom' -> BASE1 (layer 4), 'b' or 'top' -> BASE2 (layer 5)
                const layerIndex = (baseLight.position.level === 'top' || baseLight.position.level === 'b') ? TOWER_LAYERS.BASE2 : TOWER_LAYERS.BASE1;
                const lightIndex = this.getBaseLightIndexForSide(baseLight.position.side);
                const effect = LIGHT_EFFECTS[baseLight.style] || LIGHT_EFFECTS.off;
                commands.push({ layerIndex, lightIndex, effect, loop: false });
            }
        }

        return commands;
    }

    /**
     * Gets the tower layer index for a doorway light level.
     * @param level - Tower level (top, middle, bottom)
     * @returns Layer index
     */
    private getTowerLayerForLevel(level: TowerLevels): number {
        switch (level) {
            case 'top': return TOWER_LAYERS.TOP_RING;
            case 'middle': return TOWER_LAYERS.MIDDLE_RING;
            case 'bottom': return TOWER_LAYERS.BOTTOM_RING;
            default: return TOWER_LAYERS.TOP_RING;
        }
    }

    /**
     * Gets the light index for a cardinal direction (ring lights).
     * @param side - Tower side (north, east, south, west)
     * @returns Light index
     */
    private getLightIndexForSide(side: TowerSide): number {
        switch (side) {
            case 'north': return RING_LIGHT_POSITIONS.NORTH;
            case 'east': return RING_LIGHT_POSITIONS.EAST;
            case 'south': return RING_LIGHT_POSITIONS.SOUTH;
            case 'west': return RING_LIGHT_POSITIONS.WEST;
            default: return RING_LIGHT_POSITIONS.NORTH;
        }
    }

    /**
     * Maps cardinal directions to their closest corner positions for ledge lights.
     * @param side - Tower side (north, east, south, west)
     * @returns Tower corner (northeast, southeast, southwest, northwest)
     */
    private mapSideToCorner(side: TowerSide): TowerCorner {
        switch (side) {
            case 'north': return 'northeast';
            case 'east': return 'southeast';
            case 'south': return 'southwest';
            case 'west': return 'northwest';
            default: return 'northeast';
        }
    }

    /**
     * Gets the light index for ledge lights (ordinal directions).
     * @param corner - Tower corner (northeast, southeast, southwest, northwest)
     * @returns Light index
     */
    private getLedgeLightIndexForSide(corner: TowerCorner): number {
        // Map ordinal directions directly to ledge light positions
        switch (corner) {
            case 'northeast': return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
            case 'southeast': return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
            case 'southwest': return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
            case 'northwest': return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
            default: return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
        }
    }

    /**
     * Gets the light index for base lights (ordinal directions).
     * @param side - Tower side (north, east, south, west)
     * @returns Light index
     */
    private getBaseLightIndexForSide(side: TowerSide): number {
        // Convert cardinal direction to corner and get light index
        return this.getLedgeLightIndexForSide(this.mapSideToCorner(side));
    }

    /**
     * Sends a light override command to control specific light patterns using stateful commands.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light: number, soundIndex?: number): Promise<void> {
        // Validate light parameter
        if (typeof light !== 'number' || isNaN(light)) {
            this.deps.logger.error(`Invalid light parameter: ${light}. Must be a valid number.`, '[UDT]');
            return;
        }

        // Validate soundIndex if provided
        if (soundIndex !== undefined && (typeof soundIndex !== 'number' || isNaN(soundIndex) || soundIndex <= 0)) {
            this.deps.logger.error(`Invalid soundIndex parameter: ${soundIndex}. Must be a valid positive number.`, '[UDT]');
            return;
        }

        const currentState = this.deps.getCurrentTowerState();

        if (soundIndex) {
            // Use transient audio command with LED sequence modification
            const { command, stateWithoutAudio } = this.deps.commandFactory.createTransientAudioCommandWithModifications(
                currentState,
                soundIndex,
                false,
                undefined,
                { led_sequence: light }
            );

            this.deps.logger.info('Sending stateful light override with sound', '[UDT]');

            // Update our state tracking without the audio
            this.deps.setTowerState(stateWithoutAudio, 'lightOverrides');

            await this.sendTowerCommand(command, `lightOverrides(${light}, ${soundIndex})`);
        } else {
            // Create modifications for the light override only
            const modifications: Partial<TowerState> = {
                led_sequence: light
            };

            const command = this.deps.commandFactory.createStatefulCommand(currentState, modifications);

            this.deps.logger.info('Sending stateful light override', '[UDT]');
            await this.sendTowerCommand(command, `lightOverrides(${light})`);
        }
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

        // Update drum positions in tower state from the rotation command
        const towerState = this.deps.getCurrentTowerState();
        if (towerState) {
            // Extract drum positions from the raw command bytes
            const topMiddleRaw = rotateCommand[DRUM_PACKETS.topMiddle];
            const bottomRaw = rotateCommand[DRUM_PACKETS.bottom];

            // Decode positions for each drum from raw values
            const topPosition = this.decodeDrumPositionFromRaw('top', topMiddleRaw);
            const middlePosition = this.decodeDrumPositionFromRaw('middle', topMiddleRaw);
            const bottomPosition = this.decodeDrumPositionFromRaw('bottom', bottomRaw);

            // Update tower state
            towerState.drum[0].position = topPosition;
            towerState.drum[1].position = middlePosition;
            towerState.drum[2].position = bottomPosition;
        }
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

            // Update drum positions in tower state - with stateful commands we know the exact positions
            const towerState = this.deps.getCurrentTowerState();
            if (towerState) {
                towerState.drum[0].position = positionMap[top];
                towerState.drum[1].position = positionMap[middle];
                towerState.drum[2].position = positionMap[bottom];
            }
        }
    }

    /**
     * Resets the tower's internal skull drop counter to zero using stateful commands.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount(): Promise<void> {
        this.deps.logger.info('Tower skull count reset requested', '[UDT]');

        const currentState = this.deps.getCurrentTowerState();
        const modifications: Partial<TowerState> = {
            beam: { count: 0, fault: false }
        };

        const command = this.deps.commandFactory.createStatefulCommand(currentState, modifications);
        await this.sendTowerCommand(command, 'resetTowerSkullCount');

        // Update skull count in local tower state immediately to trigger UI refresh
        // This technically shouldn't be necessary, need to investiage
        // TODO: Why doesn't command coming back reflect zero skulls ...
        //       could be due to using problematic tower (not using my good tower at the moment)
        const updatedState = { ...currentState };
        updatedState.beam.count = 0;
        this.deps.setTowerState(updatedState, 'resetTowerSkullCount');
    }

    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @param volume - Optional volume override (0=loud, 1=medium, 2=quiet, 3=mute). Uses current tower state if not provided.
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal: SealIdentifier, volume?: number): Promise<void> {
        // Get the volume to use
        const actualVolume = volume !== undefined ? volume : this.deps.getCurrentTowerState().audio.volume;
        
        // Update tower's internal volume state first - tower firmware ignores volume in sound commands
        // and only uses its internal global volume state
        if (actualVolume > 0) {
            const currentState = this.deps.getCurrentTowerState();
            const stateWithVolume = { ...currentState };
            stateWithVolume.audio = { sample: 0, loop: false, volume: actualVolume };
            await this.sendTowerStateStateful(stateWithVolume);
        }
        
        this.deps.logger.info('Playing tower seal sound', '[UDT]');
        await this.playSoundStateful(TOWER_AUDIO_LIBRARY.TowerSeal.value, false, actualVolume);

        // Light both corner ledges that share the same side
        // For each cardinal direction, light both corners that include that direction
        const sideCorners: { [key in TowerSide]: [TowerCorner, TowerCorner] } = {
            north: ['northeast', 'northwest'],
            east: ['northeast', 'southeast'], 
            south: ['southeast', 'southwest'],
            west: ['southwest', 'northwest']
        };

        const ledgeLights: LedgeLight[] = sideCorners[seal.side].map(corner => ({
            position: corner,
            style: 'on'
        }));

        // Create doorway light with light effect for the broken seal
        const doorwayLights: DoorwayLight[] = [{
            level: seal.level,
            position: seal.side,
            style: 'breatheFast'
        }];

        const lights: Lights = {
            ledge: ledgeLights,
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
     * Decodes drum position from raw command byte value.
     * @param level - The drum level ('top', 'middle', 'bottom')
     * @param rawValue - The raw byte value from the command
     * @returns The position as a number (0=north, 1=east, 2=south, 3=west)
     */
    private decodeDrumPositionFromRaw(level: 'top' | 'middle' | 'bottom', rawValue: number): number {
        const drumPositions = drumPositionCmds[level];

        // Find matching side for current drum position
        for (const [side, value] of Object.entries(drumPositions)) {
            if (level === 'middle') {
                // For middle, compare the middle-specific bits (bits 6-7)
                if ((value & 0b11000000) === (rawValue & 0b11000000)) {
                    return ['north', 'east', 'south', 'west'].indexOf(side);
                }
            } else if (level === 'top') {
                // For top drum, compare the top-specific bits (bits 1, 2, 4)
                if ((value & 0b00010110) === (rawValue & 0b00010110)) {
                    return ['north', 'east', 'south', 'west'].indexOf(side);
                }
            } else {
                // For bottom, direct comparison
                if (value === rawValue) {
                    return ['north', 'east', 'south', 'west'].indexOf(side);
                }
            }
        }

        // Default to north (0) if no match found
        return 0;
    }

    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide {
        const towerState = this.deps.getCurrentTowerState();
        if (!towerState) {
            return 'north';
        }

        const drumIndex = level === 'top' ? 0 : level === 'middle' ? 1 : 2;
        const position = towerState.drum[drumIndex].position;

        // Convert numeric position to TowerSide (0=north, 1=east, 2=south, 3=west)
        const sides: TowerSide[] = ['north', 'east', 'south', 'west'];
        return sides[position] || 'north';
    }

    //#region Stateful Command Methods

    /**
     * Sends a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect, defaults to true
     * @returns Promise that resolves when command is sent
     */
    async setLEDStateful(layerIndex: number, lightIndex: number, effect: number, loop: boolean = true): Promise<void> {
        const currentState = this.deps.getCurrentTowerState();
        const command = this.deps.commandFactory.createStatefulLEDCommand(currentState, layerIndex, lightIndex, effect, loop);

        this.deps.logger.info(`Setting LED layer ${layerIndex} light ${lightIndex} to effect ${effect}${loop ? ' (looped)' : ''}`, '[UDT]');
        await this.sendTowerCommand(command, `setLEDStateful(${layerIndex}, ${lightIndex}, ${effect}, ${loop})`);
    }

    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
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
        const { command } = this.deps.commandFactory.createTransientAudioCommand(currentState, soundIndex, loop, volume);

        this.deps.logger.info(`Playing sound ${soundIndex}${loop ? ' (looped)' : ''}${volume !== undefined ? ` at volume ${volume}` : ''}`, '[UDT]');

        // Send the command directly without updating state tracking
        // Audio should not persist in state as it's a transient effect
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
     * Audio state is automatically cleared to prevent sounds from persisting across commands.
     * @param state - Complete tower state to send
     * @returns Promise that resolves when command is sent
     */
    async sendTowerStateStateful(state: TowerState): Promise<void> {
        // Create a copy of the state and clear audio to prevent persistence
        const stateToSend = { ...state };
        stateToSend.audio = { sample: 0, loop: false, volume: 0 };

        const command = this.deps.commandFactory.packTowerStateCommand(stateToSend);

        this.deps.logger.info('Sending complete tower state', '[UDT]');

        // Update our local state tracking without audio
        this.deps.setTowerState(stateToSend, 'sendTowerStateStateful');

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