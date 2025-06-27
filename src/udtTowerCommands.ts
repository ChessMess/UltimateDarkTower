import {
    TOWER_COMMANDS,
    TOWER_AUDIO_LIBRARY,
    AUDIO_COMMAND_POS,
    DRUM_PACKETS,
    drumPositionCmds,
    type Lights,
    type TowerSide,
    type TowerLevels,
    type LedgeLight,
    type DoorwayLight,
    type RotateCommand
} from './constants';
import { Logger } from './Logger';
import { UdtCommandFactory } from './udtCommandFactory';
import { UdtBleConnection } from './udtBleConnection';
import { TowerResponseProcessor } from './udtTowerResponse';

export interface TowerCommandDependencies {
    logger: Logger;
    commandFactory: UdtCommandFactory;
    bleConnection: UdtBleConnection;
    responseProcessor: TowerResponseProcessor;
    currentDrumPositions: { topMiddle: number; bottom: number };
    logDetail: boolean;
    retrySendCommandCount: { value: number };
    retrySendCommandMax: number;
}

export class UdtTowerCommands {
    private deps: TowerCommandDependencies;

    constructor(dependencies: TowerCommandDependencies) {
        this.deps = dependencies;
    }

    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    async sendTowerCommand(command: Uint8Array): Promise<void> {
        try {
            const cmdStr = this.deps.responseProcessor.commandToPacketString(command);
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
                    this.sendTowerCommand(command);
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
            await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]));

            // flag to look for calibration complete tower response
            this.deps.bleConnection.performingCalibration = true;
            this.deps.bleConnection.performingLongCommand = true;
            return;
        }

        this.deps.logger.warn('Tower calibration requested when tower is already performing calibration', '[UDT]');
        return;
    }

    /**
     * Plays a sound from the tower's audio library.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex: number): Promise<void> {
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, '[UDT]');
            return;
        }

        const soundCommand = this.deps.commandFactory.createSoundCommand(soundIndex);
        this.deps.commandFactory.updateCommandWithCurrentDrumPositions(soundCommand, this.deps.currentDrumPositions);

        this.deps.logger.info('Sending sound command', '[UDT]');
        await this.sendTowerCommand(soundCommand);
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
        await this.sendTowerCommand(lightCommand);
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
        await this.sendTowerCommand(lightOverrideCommand);
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
        await this.sendTowerCommand(rotateCommand);

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
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param rotate - Rotation configuration for tower drums
     * @param lights - Light configuration object
     * @param soundIndex - Optional sound to play with the multi-command
     * @returns Promise that resolves when multi-command is sent
     */
    async multiCommand(rotate?: RotateCommand, lights?: Lights, soundIndex?: number): Promise<void> {
        this.deps.logDetail && this.deps.logger.debug(`MultiCommand Parameters ${JSON.stringify(rotate)} ${JSON.stringify(lights)} ${soundIndex}`, '[UDT]');
        
        const rotateCmd = this.deps.commandFactory.createRotateCommand(rotate.top, rotate.middle, rotate.bottom);
        const lightCmd = this.deps.commandFactory.createLightPacketCommand(lights);
        const soundCmd = soundIndex ? this.deps.commandFactory.createSoundCommand(soundIndex) : undefined;

        const multiCmd = this.deps.commandFactory.createMultiCommand(rotateCmd, lightCmd, soundCmd);

        this.sendTowerCommand(multiCmd);

        const packetMsg = this.deps.responseProcessor.commandToPacketString(multiCmd);
        this.deps.logger.info(`multiple command sent ${packetMsg}`, '[UDT]');
    }

    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount(): Promise<void> {
        this.deps.logger.info('Tower skull count reset requested', '[UDT]');
        await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]));
    }

    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal: Array<number> | number): Promise<void> {
        // seals are numbered 1 - 12 with 1/5/8 representing north positions
        // Top: 1-4, Middle: 5-8, Bottom: 9-12

        const sealNumbers = Array.isArray(seal) ? seal : [seal];

        // Define seal to side mapping based on 1/5/8 being north positions
        const SEAL_TO_SIDE: { [key: number]: TowerSide } = {
            1: 'north', 2: 'east', 3: 'south', 4: 'west',    // Top level
            5: 'north', 6: 'east', 7: 'south', 8: 'west',    // Middle level  
            9: 'north', 10: 'east', 11: 'south', 12: 'west'  // Bottom level
        };

        const SEAL_TO_LEVEL: { [key: number]: TowerLevels } = {
            1: 'top', 2: 'top', 3: 'top', 4: 'top',
            5: 'middle', 6: 'middle', 7: 'middle', 8: 'middle',
            9: 'bottom', 10: 'bottom', 11: 'bottom', 12: 'bottom'
        };

        // Validate seal numbers
        for (const sealNum of sealNumbers) {
            if (sealNum < 1 || sealNum > 12) {
                this.deps.logger.error(`Invalid seal number: ${sealNum}. Seals must be 1-12.`, '[UDT]');
                return;
            }
        }

        // Play tower seal sound
        this.deps.logger.info('Playing tower seal sound', '[UDT]');
        await this.playSound(TOWER_AUDIO_LIBRARY.TowerSeal.value);

        // Get unique sides that need ledge lighting
        const sidesWithBrokenSeals = [...new Set(sealNumbers.map(sealNum => SEAL_TO_SIDE[sealNum]))];

        // Light both the primary ledge and adjacent ledge for each side with broken seals
        // This ensures both left and right ledge lights are activated for each side
        const ledgeLights: LedgeLight[] = [];
        const adjacentSides: { [key in TowerSide]: TowerSide } = {
            north: 'east',
            east: 'south',
            south: 'west',
            west: 'north'
        };

        sidesWithBrokenSeals.forEach(side => {
            ledgeLights.push({ position: side, style: 'on' });
            ledgeLights.push({ position: adjacentSides[side], style: 'on' });
        });

        // Remove duplicates if any
        const uniqueLedgeLights = ledgeLights.filter((light, index, self) =>
            index === self.findIndex(l => l.position === light.position)
        );

        // Create doorway lights with light effect for each broken seal
        const doorwayLights: DoorwayLight[] = sealNumbers.map(sealNum => ({
            level: SEAL_TO_LEVEL[sealNum],
            position: SEAL_TO_SIDE[sealNum],
            style: 'breatheFast'
        }));

        const lights: Lights = {
            ledge: uniqueLedgeLights,
            doorway: doorwayLights
        };

        this.deps.logger.info(`Breaking seal(s) ${sealNumbers.join(', ')} - lighting ledges and doorways with breath effect`, '[UDT]');
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
        const currentValue = level === 'bottom'
            ? this.deps.currentDrumPositions.bottom
            : (level === 'top'
                ? (this.deps.currentDrumPositions.topMiddle & 0b00010110) // top bits
                : (this.deps.currentDrumPositions.topMiddle & 0b11000000)); // middle bits

        // Find matching side for current drum position
        for (const [side, value] of Object.entries(drumPositions)) {
            if (level === 'middle') {
                // For middle, we need to mask and compare properly
                if ((value & 0b11000000) === (currentValue & 0b11000000)) {
                    return side as TowerSide;
                }
            } else if (level === 'top') {
                // For top, compare the lower bits
                if ((value & 0b00010110) === (currentValue & 0b00010110)) {
                    return side as TowerSide;
                }
            } else {
                // For bottom, direct comparison
                if (value === currentValue) {
                    return side as TowerSide;
                }
            }
        }

        // Default to north if no match found
        return 'north';
    }
}