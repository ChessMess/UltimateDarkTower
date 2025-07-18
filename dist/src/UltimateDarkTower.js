"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const udtConstants_1 = require("./udtConstants");
const udtLogger_1 = require("./udtLogger");
const udtBleConnection_1 = require("./udtBleConnection");
const udtTowerResponse_1 = require("./udtTowerResponse");
const udtCommandFactory_1 = require("./udtCommandFactory");
const udtTowerCommands_1 = require("./udtTowerCommands");
/**
 * @title UltimateDarkTower
 * @description
 * The UltimateDarkTower class is the main control interface for the Return To Dark Tower board game device.
 * It provides a comprehensive API for interacting with the tower through Bluetooth Low Energy (BLE).
 *
 * Usage:
 * 1. Create instance: const tower = new UltimateDarkTower()
 * 2. Connect to tower: await tower.connect()
 * 3. Calibrate tower: await tower.calibrate()
 * 4. Use tower commands: await tower.playSound(1), await tower.Lights({...}), etc.
 * 5. Clean up: await tower.cleanup()
 *
 * Event Callbacks:
 * - onTowerConnect: Called when tower connects
 * - onTowerDisconnect: Called when tower disconnects
 * - onCalibrationComplete: Called when calibration finishes
 * - onSkullDrop: Called when skulls are dropped into the tower
 * - onBatteryLevelNotify: Called when battery level updates
 */
class UltimateDarkTower {
    constructor() {
        // tower configuration
        this.retrySendCommandCountRef = { value: 0 };
        this.retrySendCommandMax = 5;
        // tower state
        this.currentDrumPositions = { topMiddle: 0x10, bottom: 0x42 };
        this.currentBatteryValue = 0;
        this.previousBatteryValue = 0;
        this.currentBatteryPercentage = 0;
        this.previousBatteryPercentage = 0;
        this.brokenSeals = new Set();
        // glyph position tracking
        this.glyphPositions = {
            cleanse: null,
            quest: null,
            battle: null,
            banner: null,
            reinforce: null
        };
        // call back functions
        // you overwrite these with your own functions 
        // to handle these events in your app
        this.onTowerConnect = () => { };
        this.onTowerDisconnect = () => { };
        this.onCalibrationComplete = () => { };
        this.onSkullDrop = (_towerSkullCount) => { console.log(_towerSkullCount); };
        this.onBatteryLevelNotify = (_millivolts) => { console.log(_millivolts); };
        // utility
        this._logDetail = false;
        // Initialize logger with console output by default
        this.logger = new udtLogger_1.Logger();
        this.logger.addOutput(new udtLogger_1.ConsoleOutput());
        // Initialize BLE connection with callback handlers
        const callbacks = {
            onTowerConnect: () => this.onTowerConnect(),
            onTowerDisconnect: () => {
                this.onTowerDisconnect();
                // Clear the command queue on disconnection to prevent hanging commands
                if (this.towerCommands) {
                    this.towerCommands.clearQueue();
                }
            },
            onBatteryLevelNotify: (millivolts) => {
                this.previousBatteryValue = this.currentBatteryValue;
                this.currentBatteryValue = millivolts;
                this.previousBatteryPercentage = this.currentBatteryPercentage;
                this.currentBatteryPercentage = this.milliVoltsToPercentageNumber(millivolts);
                this.onBatteryLevelNotify(millivolts);
            },
            onCalibrationComplete: () => {
                this.setGlyphPositionsFromCalibration();
                this.onCalibrationComplete();
            },
            onSkullDrop: (towerSkullCount) => this.onSkullDrop(towerSkullCount)
        };
        this.bleConnection = new udtBleConnection_1.UdtBleConnection(this.logger, callbacks);
        // Initialize response processor
        this.responseProcessor = new udtTowerResponse_1.TowerResponseProcessor(this.logDetail);
        // Initialize command factory
        this.commandFactory = new udtCommandFactory_1.UdtCommandFactory();
        // Initialize tower commands with dependencies
        const commandDependencies = {
            logger: this.logger,
            commandFactory: this.commandFactory,
            bleConnection: this.bleConnection,
            responseProcessor: this.responseProcessor,
            currentDrumPositions: this.currentDrumPositions,
            logDetail: this.logDetail,
            retrySendCommandCount: this.retrySendCommandCountRef,
            retrySendCommandMax: this.retrySendCommandMax
        };
        this.towerCommands = new udtTowerCommands_1.UdtTowerCommands(commandDependencies);
        // Set up command queue response callback now that tower commands are initialized
        callbacks.onTowerResponse = () => this.towerCommands.onTowerResponse();
    }
    get logDetail() { return this._logDetail; }
    set logDetail(value) {
        this._logDetail = value;
        this.responseProcessor.setDetailedLogging(value);
        // Update dependencies if towerCommands is already initialized
        if (this.towerCommands) {
            const commandDependencies = {
                logger: this.logger,
                commandFactory: this.commandFactory,
                bleConnection: this.bleConnection,
                responseProcessor: this.responseProcessor,
                currentDrumPositions: this.currentDrumPositions,
                logDetail: this.logDetail,
                retrySendCommandCount: this.retrySendCommandCountRef,
                retrySendCommandMax: this.retrySendCommandMax
            };
            this.towerCommands = new udtTowerCommands_1.UdtTowerCommands(commandDependencies);
        }
    }
    // Getter methods for connection state
    get isConnected() { return this.bleConnection.isConnected; }
    get isCalibrated() { return this.bleConnection.isCalibrated; }
    get performingCalibration() { return this.bleConnection.performingCalibration; }
    get performingLongCommand() { return this.bleConnection.performingLongCommand; }
    get towerSkullDropCount() { return this.bleConnection.towerSkullDropCount; }
    get txCharacteristic() { return this.bleConnection.txCharacteristic; }
    // Getter methods for battery state
    get currentBattery() { return this.currentBatteryValue; }
    get previousBattery() { return this.previousBatteryValue; }
    get currentBatteryPercent() { return this.currentBatteryPercentage; }
    get previousBatteryPercent() { return this.previousBatteryPercentage; }
    // Getter/setter methods for connection configuration
    get batteryNotifyFrequency() { return this.bleConnection.batteryNotifyFrequency; }
    set batteryNotifyFrequency(value) { this.bleConnection.batteryNotifyFrequency = value; }
    get batteryNotifyOnValueChangeOnly() { return this.bleConnection.batteryNotifyOnValueChangeOnly; }
    set batteryNotifyOnValueChangeOnly(value) { this.bleConnection.batteryNotifyOnValueChangeOnly = value; }
    get logTowerResponses() { return this.bleConnection.logTowerResponses; }
    set logTowerResponses(value) { this.bleConnection.logTowerResponses = value; }
    get logTowerResponseConfig() { return this.bleConnection.logTowerResponseConfig; }
    set logTowerResponseConfig(value) { this.bleConnection.logTowerResponseConfig = value; }
    //#region Tower Commands 
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns {Promise<void>} Promise that resolves when calibration command is sent
     */
    async calibrate() {
        return await this.towerCommands.calibrate();
    }
    /**
     * Plays a sound from the tower's audio library.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
        return await this.towerCommands.playSound(soundIndex);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async Lights(lights) {
        return await this.towerCommands.lights(lights);
    }
    /**
     * Sends a light override command to control specific light patterns.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
        return await this.towerCommands.lightOverrides(light, soundIndex);
    }
    /**
     * Rotates tower drums to specified positions.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    async Rotate(top, middle, bottom, soundIndex) {
        // Store current drum positions before rotation
        const oldTopPosition = this.getCurrentDrumPosition('top');
        const oldMiddlePosition = this.getCurrentDrumPosition('middle');
        const oldBottomPosition = this.getCurrentDrumPosition('bottom');
        const result = await this.towerCommands.rotate(top, middle, bottom, soundIndex);
        // Calculate rotation steps for each level and update glyph positions
        this.calculateAndUpdateGlyphPositions('top', oldTopPosition, top);
        this.calculateAndUpdateGlyphPositions('middle', oldMiddlePosition, middle);
        this.calculateAndUpdateGlyphPositions('bottom', oldBottomPosition, bottom);
        return result;
    }
    /**
     * DO NOT USE THIS FUNCTION - MULTIPLE SIMULTANEOUS ACTIONS CAN CAUSE TOWER DISCONNECTION
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param rotate - Rotation configuration for tower drums
     * @param lights - Light configuration object
     * @param soundIndex - Optional sound to play with the multi-command
     * @returns Promise that resolves when multi-command is sent
     * @deprecated SPECIAL USE ONLY - CAN CAUSE DISCONNECTS
     */
    async MultiCommand(rotate, lights, soundIndex) {
        // Store current drum positions before rotation if we're rotating
        let oldTopPosition;
        let oldMiddlePosition;
        let oldBottomPosition;
        if (rotate) {
            oldTopPosition = this.getCurrentDrumPosition('top');
            oldMiddlePosition = this.getCurrentDrumPosition('middle');
            oldBottomPosition = this.getCurrentDrumPosition('bottom');
        }
        const result = await this.towerCommands.multiCommand(rotate, lights, soundIndex);
        // Update glyph positions if rotation was performed
        if (rotate && oldTopPosition && oldMiddlePosition && oldBottomPosition) {
            this.calculateAndUpdateGlyphPositions('top', oldTopPosition, rotate.top);
            this.calculateAndUpdateGlyphPositions('middle', oldMiddlePosition, rotate.middle);
            this.calculateAndUpdateGlyphPositions('bottom', oldBottomPosition, rotate.bottom);
        }
        return result;
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
        return await this.towerCommands.resetTowerSkullCount();
    }
    //#endregion
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
        const result = await this.towerCommands.breakSeal(seal);
        // Track broken seal
        const sealKey = `${seal.level}-${seal.side}`;
        this.brokenSeals.add(sealKey);
        return result;
    }
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    async randomRotateLevels(level = 0) {
        // Store positions before rotation to calculate what changed
        const beforeTop = this.getCurrentDrumPosition('top');
        const beforeMiddle = this.getCurrentDrumPosition('middle');
        const beforeBottom = this.getCurrentDrumPosition('bottom');
        const result = await this.towerCommands.randomRotateLevels(level);
        // Update glyph positions based on what levels were rotated
        const afterTop = this.getCurrentDrumPosition('top');
        const afterMiddle = this.getCurrentDrumPosition('middle');
        const afterBottom = this.getCurrentDrumPosition('bottom');
        if (beforeTop !== afterTop) {
            this.calculateAndUpdateGlyphPositions('top', beforeTop, afterTop);
        }
        if (beforeMiddle !== afterMiddle) {
            this.calculateAndUpdateGlyphPositions('middle', beforeMiddle, afterMiddle);
        }
        if (beforeBottom !== afterBottom) {
            this.calculateAndUpdateGlyphPositions('bottom', beforeBottom, afterBottom);
        }
        return result;
    }
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level) {
        return this.towerCommands.getCurrentDrumPosition(level);
    }
    /**
     * Sets the initial glyph positions from calibration.
     * Called automatically when calibration completes.
     */
    setGlyphPositionsFromCalibration() {
        for (const glyphKey in udtConstants_1.GLYPHS) {
            const glyph = glyphKey;
            this.glyphPositions[glyph] = udtConstants_1.GLYPHS[glyph].side;
        }
    }
    /**
     * Gets the current position of a specific glyph.
     * @param glyph - The glyph to get position for
     * @returns The current position of the glyph, or null if not calibrated
     */
    getGlyphPosition(glyph) {
        return this.glyphPositions[glyph];
    }
    /**
     * Gets all current glyph positions.
     * @returns Object mapping each glyph to its current position (or null if not calibrated)
     */
    getAllGlyphPositions() {
        return Object.assign({}, this.glyphPositions);
    }
    /**
     * Gets all glyphs currently facing a specific direction.
     * @param direction - The direction to check for (north, east, south, west)
     * @returns Array of glyph names that are currently facing the specified direction
     */
    getGlyphsFacingDirection(direction) {
        const glyphsFacing = [];
        for (const glyphKey in this.glyphPositions) {
            const glyph = glyphKey;
            const position = this.glyphPositions[glyph];
            if (position && position.toLowerCase() === direction.toLowerCase()) {
                glyphsFacing.push(glyph);
            }
        }
        return glyphsFacing;
    }
    /**
     * Updates glyph positions after a drum rotation.
     * @param level - The drum level that was rotated
     * @param rotationSteps - Number of steps rotated (1 = 90 degrees clockwise)
     */
    updateGlyphPositionsAfterRotation(level, rotationSteps) {
        // Define the rotation order (clockwise)
        const sides = ['north', 'east', 'south', 'west'];
        // Find glyphs on the rotated level
        for (const glyphKey in udtConstants_1.GLYPHS) {
            const glyph = glyphKey;
            const glyphData = udtConstants_1.GLYPHS[glyph];
            if (glyphData.level === level && this.glyphPositions[glyph] !== null) {
                const currentPosition = this.glyphPositions[glyph];
                const currentIndex = sides.indexOf(currentPosition);
                const newIndex = (currentIndex + rotationSteps) % sides.length;
                this.glyphPositions[glyph] = sides[newIndex];
            }
        }
    }
    /**
     * Calculates rotation steps and updates glyph positions for a specific level.
     * @param level - The drum level that was rotated
     * @param oldPosition - The position before rotation
     * @param newPosition - The position after rotation
     */
    calculateAndUpdateGlyphPositions(level, oldPosition, newPosition) {
        // Calculate rotation steps
        const sides = ['north', 'east', 'south', 'west'];
        const oldIndex = sides.indexOf(oldPosition);
        const newIndex = sides.indexOf(newPosition);
        // Calculate rotation steps (positive for clockwise)
        let rotationSteps = newIndex - oldIndex;
        if (rotationSteps < 0) {
            rotationSteps += 4; // Handle wrap-around
        }
        // Only update if there was actually a rotation
        if (rotationSteps > 0) {
            this.updateGlyphPositionsAfterRotation(level, rotationSteps);
        }
    }
    /**
     * Updates glyph positions for a specific level rotation.
     * @param level - The drum level that was rotated
     * @param newPosition - The new position the drum was rotated to
     * @deprecated Use calculateAndUpdateGlyphPositions instead
     */
    updateGlyphPositionsForRotation(level, newPosition) {
        // Get the current drum position before rotation
        const currentPosition = this.getCurrentDrumPosition(level);
        // Calculate rotation steps
        const sides = ['north', 'east', 'south', 'west'];
        const currentIndex = sides.indexOf(currentPosition);
        const newIndex = sides.indexOf(newPosition);
        // Calculate rotation steps (positive for clockwise)
        let rotationSteps = newIndex - currentIndex;
        if (rotationSteps < 0) {
            rotationSteps += 4; // Handle wrap-around
        }
        // Update glyph positions
        this.updateGlyphPositionsAfterRotation(level, rotationSteps);
    }
    /**
     * Checks if a specific seal is broken.
     * @param seal - The seal identifier to check
     * @returns True if the seal is broken, false otherwise
     */
    isSealBroken(seal) {
        const sealKey = `${seal.level}-${seal.side}`;
        return this.brokenSeals.has(sealKey);
    }
    /**
     * Gets a list of all broken seals.
     * @returns Array of SealIdentifier objects representing all broken seals
     */
    getBrokenSeals() {
        return Array.from(this.brokenSeals).map(sealKey => {
            const [level, side] = sealKey.split('-');
            return { level: level, side: side };
        });
    }
    /**
     * Resets the broken seals tracking (clears all broken seals).
     */
    resetBrokenSeals() {
        this.brokenSeals.clear();
    }
    /**
     * Gets a random unbroken seal that can be passed to breakSeal().
     * @returns A random SealIdentifier that is not currently broken, or null if all seals are broken
     */
    getRandomUnbrokenSeal() {
        const allSeals = [];
        const levels = ['top', 'middle', 'bottom'];
        const sides = ['north', 'east', 'south', 'west'];
        // Generate all possible seal combinations
        for (const level of levels) {
            for (const side of sides) {
                allSeals.push({ level, side });
            }
        }
        // Filter out broken seals
        const unbrokenSeals = allSeals.filter(seal => !this.isSealBroken(seal));
        if (unbrokenSeals.length === 0) {
            return null; // All seals are broken
        }
        // Return a random unbroken seal
        const randomIndex = Math.floor(Math.random() * unbrokenSeals.length);
        return unbrokenSeals[randomIndex];
    }
    //#region bluetooth
    /**
     * Establishes a Bluetooth connection to the Dark Tower device.
     * Initializes GATT services, characteristics, and starts connection monitoring.
     * @returns {Promise<void>} Promise that resolves when connection is established
     */
    async connect() {
        await this.bleConnection.connect();
    }
    /**
     * Disconnects from the tower device and cleans up resources.
     * @returns {Promise<void>} Promise that resolves when disconnection is complete
     */
    async disconnect() {
        await this.bleConnection.disconnect();
    }
    //#endregion
    //#region utility
    /**
     * Configure logger outputs for this UltimateDarkTower instance
     * @param {LogOutput[]} outputs - Array of log outputs to use (e.g., ConsoleOutput, DOMOutput)
     */
    setLoggerOutputs(outputs) {
        // Clear existing outputs and add new ones to maintain logger instance references
        this.logger.outputs = [];
        outputs.forEach(output => this.logger.addOutput(output));
    }
    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param {Uint8Array} command - The command packet to send to the tower
     * @returns {Promise<void>} Promise that resolves when command is sent successfully
     */
    async sendTowerCommand(command) {
        return await this.towerCommands.sendTowerCommand(command);
    }
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command) {
        return this.responseProcessor.commandToPacketString(command);
    }
    /**
     * Converts battery voltage in millivolts to percentage.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    milliVoltsToPercentage(mv) {
        return this.responseProcessor.milliVoltsToPercentage(mv);
    }
    //#endregion
    //#region Connection Management
    /**
     * Enable or disable connection monitoring
     * @param {boolean} enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled) {
        this.bleConnection.setConnectionMonitoring(enabled);
    }
    /**
     * Configure connection monitoring parameters
     * @param {number} [frequency=2000] - How often to check connection (milliseconds)
     * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency = 2000, timeout = 30000) {
        this.bleConnection.configureConnectionMonitoring(frequency, timeout);
    }
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
     * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
     * @param {boolean} [verifyConnection=true] - Whether to verify connection status before triggering disconnection on heartbeat timeout
     */
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3000, verifyConnection = true) {
        this.bleConnection.configureBatteryHeartbeatMonitoring(enabled, timeout, verifyConnection);
    }
    /**
     * Check if the tower is currently connected
     * @returns {Promise<boolean>} True if connected and responsive
     */
    async isConnectedAndResponsive() {
        return await this.bleConnection.isConnectedAndResponsive();
    }
    /**
     * Get detailed connection status including heartbeat information
     * @returns {Object} Object with connection details
     */
    getConnectionStatus() {
        return this.bleConnection.getConnectionStatus();
    }
    //#endregion
    /**
     * Converts millivolts to percentage number (0-100).
     * @param mv - Battery voltage in millivolts
     * @returns Battery percentage as number (0-100)
     */
    milliVoltsToPercentageNumber(mv) {
        const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
        const levels = udtConstants_1.VOLTAGE_LEVELS.filter(v => batLevel >= v);
        return levels.length * 5;
    }
    //#region cleanup
    /**
     * Clean up resources and disconnect properly
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        this.logger.info('Cleaning up UltimateDarkTower instance', '[UDT]');
        // Clear any pending commands in the queue
        this.towerCommands.clearQueue();
        await this.bleConnection.cleanup();
    }
}
exports.default = UltimateDarkTower;
//# sourceMappingURL=UltimateDarkTower.js.map