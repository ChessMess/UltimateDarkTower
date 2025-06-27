"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtTowerCommands = void 0;
const constants_1 = require("./constants");
/**
 * Internal command queue for managing sequential tower command processing
 * @private
 */
class CommandQueue {
    constructor(logger, sendCommandFn) {
        this.logger = logger;
        this.sendCommandFn = sendCommandFn;
        this.queue = [];
        this.currentCommand = null;
        this.timeoutHandle = null;
        this.isProcessing = false;
        this.timeoutMs = 30000; // 30 seconds
    }
    /**
     * Enqueue a command for processing
     */
    async enqueue(command, description) {
        return new Promise((resolve, reject) => {
            const queuedCommand = {
                id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                command,
                timestamp: Date.now(),
                resolve,
                reject,
                description
            };
            this.queue.push(queuedCommand);
            this.logger.debug(`Command queued: ${description || 'unnamed'} (queue size: ${this.queue.length})`, '[UDT]');
            // Start processing if not already running
            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }
    /**
     * Process the next command in the queue
     */
    async processNext() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        this.isProcessing = true;
        this.currentCommand = this.queue.shift();
        const { id, command, description, resolve, reject } = this.currentCommand;
        this.logger.debug(`Processing command: ${description || id}`, '[UDT]');
        try {
            // Set timeout for command completion
            this.timeoutHandle = setTimeout(() => {
                this.onTimeout();
            }, this.timeoutMs);
            // Send the command using the existing sendTowerCommand logic
            await this.sendCommandFn(command);
            // Command was sent successfully, now we wait for a response
            // The response will be handled by onResponse() method
        }
        catch (error) {
            // Command failed to send, reject and move to next
            this.clearTimeout();
            this.currentCommand = null;
            this.isProcessing = false;
            reject(error);
            // Continue processing next command
            this.processNext();
        }
    }
    /**
     * Called when a tower response is received
     */
    onResponse() {
        if (this.currentCommand) {
            this.clearTimeout();
            const { resolve, description, id } = this.currentCommand;
            this.logger.debug(`Command completed: ${description || id}`, '[UDT]');
            this.currentCommand = null;
            this.isProcessing = false;
            resolve();
            // Process next command in queue
            this.processNext();
        }
    }
    /**
     * Handle command timeout
     */
    onTimeout() {
        if (this.currentCommand) {
            const { description, id } = this.currentCommand;
            this.logger.warn(`Command timeout after ${this.timeoutMs}ms: ${description || id}`, '[UDT]');
            // Don't reject the promise - just log and continue
            // This allows the queue to continue processing even if a command times out
            this.currentCommand.resolve();
            this.currentCommand = null;
            this.isProcessing = false;
            // Process next command in queue
            this.processNext();
        }
    }
    /**
     * Clear the current timeout
     */
    clearTimeout() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }
    /**
     * Clear all pending commands
     */
    clear() {
        this.clearTimeout();
        // Reject all pending commands
        this.queue.forEach(cmd => {
            cmd.reject(new Error('Command queue cleared'));
        });
        this.queue = [];
        this.currentCommand = null;
        this.isProcessing = false;
        this.logger.debug('Command queue cleared', '[UDT]');
    }
    /**
     * Get queue status for debugging
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            currentCommand: this.currentCommand ? {
                id: this.currentCommand.id,
                description: this.currentCommand.description,
                timestamp: this.currentCommand.timestamp
            } : null
        };
    }
}
class UdtTowerCommands {
    constructor(dependencies) {
        this.deps = dependencies;
        // Initialize command queue with the actual send function
        this.commandQueue = new CommandQueue(this.deps.logger, (command) => this.sendTowerCommandDirect(command));
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
            await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.calibration]), 'calibrate');
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
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(constants_1.TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
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
            lightOverrideCommand[constants_1.AUDIO_COMMAND_POS] = soundIndex;
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
            rotateCommand[constants_1.AUDIO_COMMAND_POS] = soundIndex;
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
        this.deps.currentDrumPositions.topMiddle = rotateCommand[constants_1.DRUM_PACKETS.topMiddle];
        this.deps.currentDrumPositions.bottom = rotateCommand[constants_1.DRUM_PACKETS.bottom];
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
        await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.resetCounter]), 'resetTowerSkullCount');
    }
    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
        // seals are numbered 1 - 12 with 1/5/8 representing north positions
        // Top: 1-4, Middle: 5-8, Bottom: 9-12
        const sealNumbers = Array.isArray(seal) ? seal : [seal];
        // Define seal to side mapping based on 1/5/8 being north positions
        const SEAL_TO_SIDE = {
            1: 'north', 2: 'east', 3: 'south', 4: 'west',
            5: 'north', 6: 'east', 7: 'south', 8: 'west',
            9: 'north', 10: 'east', 11: 'south', 12: 'west' // Bottom level
        };
        const SEAL_TO_LEVEL = {
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
        await this.playSound(constants_1.TOWER_AUDIO_LIBRARY.TowerSeal.value);
        // Get unique sides that need ledge lighting
        const sidesWithBrokenSeals = [...new Set(sealNumbers.map(sealNum => SEAL_TO_SIDE[sealNum]))];
        // Light both the primary ledge and adjacent ledge for each side with broken seals
        // This ensures both left and right ledge lights are activated for each side
        const ledgeLights = [];
        const adjacentSides = {
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
        const uniqueLedgeLights = ledgeLights.filter((light, index, self) => index === self.findIndex(l => l.position === light.position));
        // Create doorway lights with light effect for each broken seal
        const doorwayLights = sealNumbers.map(sealNum => ({
            level: SEAL_TO_LEVEL[sealNum],
            position: SEAL_TO_SIDE[sealNum],
            style: 'breatheFast'
        }));
        const lights = {
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
        const drumPositions = constants_1.drumPositionCmds[level];
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
                    return side;
                }
            }
            else if (level === 'top') {
                // For top, compare the lower bits
                if ((value & 0b00010110) === (currentValue & 0b00010110)) {
                    return side;
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