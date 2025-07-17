"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtTowerCommands = void 0;
const udtConstants_1 = require("./udtConstants");
const udtCommandQueue_1 = require("./udtCommandQueue");
class UdtTowerCommands {
    constructor(dependencies) {
        this.deps = dependencies;
        // Initialize command queue with the actual send function
        this.commandQueue = new udtCommandQueue_1.CommandQueue(this.deps.logger, (command) => this.sendTowerCommandDirect(command));
    }
    /**
     * Sends a command packet to the tower via the command queue
     * @param command - The command packet to send to the tower
     * @param description - Optional description for logging
     * @returns Promise that resolves when command is completed
     */
    async sendTowerCommand(command, description) {
        return await this.commandQueue.enqueue(command, description);
    }
    /**
     * Directly sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * This method is used internally by the command queue.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    async sendTowerCommandDirect(command) {
        var _a, _b, _c;
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
        }
        catch (error) {
            this.deps.logger.error(`command send error: ${error}`, '[UDT]');
            const errorMsg = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : new String(error);
            const wasCancelled = errorMsg.includes('User cancelled');
            const maxRetriesReached = this.deps.retrySendCommandCount.value >= this.deps.retrySendCommandMax;
            // Check for disconnect indicators
            const isDisconnected = errorMsg.includes('Cannot read properties of null') ||
                errorMsg.includes('GATT Server is disconnected') ||
                errorMsg.includes('Device is not connected') ||
                !((_c = (_b = this.deps.bleConnection.TowerDevice) === null || _b === void 0 ? void 0 : _b.gatt) === null || _c === void 0 ? void 0 : _c.connected);
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
            }
            else {
                this.deps.retrySendCommandCount.value = 0;
            }
        }
    }
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    async calibrate() {
        if (!this.deps.bleConnection.performingCalibration) {
            this.deps.logger.info('Performing Tower Calibration', '[UDT]');
            await this.sendTowerCommand(new Uint8Array([udtConstants_1.TOWER_COMMANDS.calibration]), 'calibrate');
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
    async playSound(soundIndex) {
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(udtConstants_1.TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, '[UDT]');
            return;
        }
        const soundCommand = this.deps.commandFactory.createSoundCommand(soundIndex);
        this.deps.commandFactory.updateCommandWithCurrentDrumPositions(soundCommand, this.deps.currentDrumPositions);
        this.deps.logger.info('Sending sound command', '[UDT]');
        await this.sendTowerCommand(soundCommand, `playSound(${soundIndex})`);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights) {
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
    async lightOverrides(light, soundIndex) {
        const lightOverrideCommand = this.deps.commandFactory.createLightOverrideCommand(light);
        this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightOverrideCommand, this.deps.currentDrumPositions);
        if (soundIndex) {
            lightOverrideCommand[udtConstants_1.AUDIO_COMMAND_POS] = soundIndex;
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
    async rotate(top, middle, bottom, soundIndex) {
        this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, '[UDT]');
        const rotateCommand = this.deps.commandFactory.createRotateCommand(top, middle, bottom);
        if (soundIndex) {
            rotateCommand[udtConstants_1.AUDIO_COMMAND_POS] = soundIndex;
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
        this.deps.currentDrumPositions.topMiddle = rotateCommand[udtConstants_1.DRUM_PACKETS.topMiddle];
        this.deps.currentDrumPositions.bottom = rotateCommand[udtConstants_1.DRUM_PACKETS.bottom];
    }
    /**
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param rotate - Rotation configuration for tower drums
     * @param lights - Light configuration object
     * @param soundIndex - Optional sound to play with the multi-command
     * @returns Promise that resolves when multi-command is sent
     */
    async multiCommand(rotate, lights, soundIndex) {
        this.deps.logDetail && this.deps.logger.debug(`MultiCommand Parameters ${JSON.stringify(rotate)} ${JSON.stringify(lights)} ${soundIndex}`, '[UDT]');
        const rotateCmd = this.deps.commandFactory.createRotateCommand(rotate.top, rotate.middle, rotate.bottom);
        const lightCmd = this.deps.commandFactory.createLightPacketCommand(lights);
        const soundCmd = soundIndex ? this.deps.commandFactory.createSoundCommand(soundIndex) : undefined;
        const multiCmd = this.deps.commandFactory.createMultiCommand(rotateCmd, lightCmd, soundCmd);
        await this.sendTowerCommand(multiCmd, 'multiCommand');
        const packetMsg = this.deps.responseProcessor.commandToPacketString(multiCmd);
        this.deps.logger.info(`multiple command sent ${packetMsg}`, '[UDT]');
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
        this.deps.logger.info('Tower skull count reset requested', '[UDT]');
        await this.sendTowerCommand(new Uint8Array([udtConstants_1.TOWER_COMMANDS.resetCounter]), 'resetTowerSkullCount');
    }
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
        // Play tower seal sound
        this.deps.logger.info('Playing tower seal sound', '[UDT]');
        await this.playSound(udtConstants_1.TOWER_AUDIO_LIBRARY.TowerSeal.value);
        // Light both the primary ledge and adjacent ledge for the seal's side
        // This ensures both left and right ledge lights are activated for the side
        const adjacentSides = {
            north: 'east',
            east: 'south',
            south: 'west',
            west: 'north'
        };
        const ledgeLights = [
            { position: seal.side, style: 'on' },
            { position: adjacentSides[seal.side], style: 'on' }
        ];
        // Remove duplicates if any
        const uniqueLedgeLights = ledgeLights.filter((light, index, self) => index === self.findIndex(l => l.position === light.position));
        // Create doorway light with light effect for the broken seal
        const doorwayLights = [{
                level: seal.level,
                position: seal.side,
                style: 'breatheFast'
            }];
        const lights = {
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
    async randomRotateLevels(level = 0) {
        // 0 = all, 1 = top, 2 = middle, 3 = bottom
        // 4 = top & middle, 5 = top & bottom, 6 = middle & bottom
        const sides = ['north', 'east', 'south', 'west'];
        const getRandomSide = () => sides[Math.floor(Math.random() * sides.length)];
        // Current positions to preserve unchanged levels
        const currentTop = this.getCurrentDrumPosition('top');
        const currentMiddle = this.getCurrentDrumPosition('middle');
        const currentBottom = this.getCurrentDrumPosition('bottom');
        let topSide, middleSide, bottomSide;
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
    getCurrentDrumPosition(level) {
        const drumPositions = udtConstants_1.drumPositionCmds[level];
        const currentValue = level === 'bottom'
            ? this.deps.currentDrumPositions.bottom
            : (level === 'top'
                ? (this.deps.currentDrumPositions.topMiddle & 0b00010110) // top bits
                : (this.deps.currentDrumPositions.topMiddle & 0b11000000)); // middle bits
        // Find matching side for current drum position
        for (const [side, value] of Object.entries(drumPositions)) {
            if (level === 'middle') {
                // For middle, compare the middle-specific bits (bits 6-7)
                if ((value & 0b11000000) === (currentValue & 0b11000000)) {
                    return side;
                }
            }
            else if (level === 'top') {
                // For top drum, we need to account for the fact that middle drum
                // position is encoded in the same byte. 
                // Check what middle position is currently set
                const middleBits = currentValue & 0b11000000;
                if (middleBits === 0b00000000) {
                    // Middle is north (0b00010000), so we need to check combined values
                    const expectedCombined = value | 0b00010000; // top value OR middle north
                    if (currentValue === expectedCombined) {
                        return side;
                    }
                }
                else {
                    // Middle is not north, so we can mask out middle bits safely
                    const topBits = currentValue & 0b00010110; // Mask to get only possible top bits
                    if (value === topBits) {
                        return side;
                    }
                }
            }
            else {
                // For bottom, direct comparison
                if (value === currentValue) {
                    return side;
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
    async setLEDStateful(layerIndex, lightIndex, effect, loop = false) {
        var _a, _b;
        const currentState = ((_b = (_a = this.deps).getCurrentTowerState) === null || _b === void 0 ? void 0 : _b.call(_a)) || null;
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
    async playSoundStateful(soundIndex, loop = false, volume) {
        var _a, _b;
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(udtConstants_1.TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, '[UDT]');
            return;
        }
        const currentState = ((_b = (_a = this.deps).getCurrentTowerState) === null || _b === void 0 ? void 0 : _b.call(_a)) || null;
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
    async rotateDrumStateful(drumIndex, position, playSound = false) {
        var _a, _b;
        const currentState = ((_b = (_a = this.deps).getCurrentTowerState) === null || _b === void 0 ? void 0 : _b.call(_a)) || null;
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
    async sendTowerStateStateful(state) {
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
    async sendTowerCommandDirectPublic(command) {
        return await this.sendTowerCommandDirect(command);
    }
    /**
     * Called when a tower response is received to notify the command queue
     * This should be called from the BLE connection response handler
     */
    onTowerResponse() {
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
    clearQueue() {
        this.commandQueue.clear();
    }
}
exports.UdtTowerCommands = UdtTowerCommands;
//# sourceMappingURL=udtTowerCommands.js.map