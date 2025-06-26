"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const Logger_1 = require("./Logger");
/**
 * @title UltimateDarkTower
 * @notes
 * The UltimateDarkTower class represents a control interface for the Return To Dark Tower device.
 * It provides methods for calibrating the tower, playing sounds, controlling lights,
 * rotating the tower, and more.
 * The class also handles the Bluetooth connection to the tower device.
 *
 * Disconnect Detection Features:
 *    - Listens for GATT server disconnect events
 *    - Monitors connection health with configurable heartbeat checks
 *    - Uses battery status (sent every ~200ms) as primary heartbeat for disconnect detection
 *    - Detects timeouts when no responses are received
 *    - Handles Bluetooth availability changes
 *    - Provides callback notifications for all disconnect scenarios
 *    - Battery heartbeat monitoring is ideal for detecting power loss/battery depletion
 *
 * Known Issues:
 *    Tower command complete response is not being considered. Async Await is working
 *    only on the fact that a command was sent, which is pretty much immediate, so we need
 *    to rework this a bit to take into account when a command is complete. This is all
 *    part of work still to be done.
 */
class UltimateDarkTower {
    constructor() {
        // ble
        this.TowerDevice = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        // tower configuration
        this.batteryNotifyFrequency = 15 * 1000; // App notification throttling (Tower sends every ~200ms)
        this.batteryNotifyOnValueChangeOnly = false; // overrides frequency setting if true
        this.retrySendCommandCount = 0;
        this.retrySendCommandMax = 5;
        // tower state
        this.currentDrumPositions = { topMiddle: 0x10, bottom: 0x42 };
        this.isCalibrated = false;
        this.isConnected = false;
        this.towerSkullDropCount = -1;
        this.performingCalibration = false;
        this.lastBatteryNotification = 0;
        // disconnect detection
        this.connectionMonitorInterval = null;
        this.connectionMonitorFrequency = 2 * 1000; // Check every 2 seconds (more frequent due to battery heartbeat)
        this.lastSuccessfulCommand = 0;
        this.connectionTimeoutThreshold = 30 * 1000; // 30 seconds without response
        this.enableConnectionMonitoring = true;
        // battery-based heartbeat detection
        this.lastBatteryHeartbeat = 0; // Last time we received a battery status
        this.batteryHeartbeatTimeout = 3 * 1000; // 3 seconds without battery = likely disconnected (normal is ~200ms)
        this.calibrationHeartbeatTimeout = 30 * 1000; // 30 seconds during calibration (calibration blocks battery responses)
        this.enableBatteryHeartbeatMonitoring = true;
        // call back functions
        // you overwrite these with your own functions 
        // to handle these events in your app
        this.onCalibrationComplete = () => { };
        this.onSkullDrop = (towerSkullCount) => { };
        this.onBatteryLevelNotify = (millivolts) => { };
        this.onTowerConnect = () => { };
        this.onTowerDisconnect = () => { };
        // utility
        this.logDetail = false;
        this.logTowerResponses = true;
        // allows you to log specific responses
        // [Differential Readings] & [Battery] are sent continously so
        // setting their defaults to false.
        this.logTowerResponseConfig = {
            TOWER_STATE: true,
            INVALID_STATE: true,
            HARDWARE_FAILURE: true,
            MECH_JIGGLE_TRIGGERED: true,
            MECH_UNEXPECTED_TRIGGER: true,
            MECH_DURATION: true,
            DIFFERENTIAL_READINGS: false,
            BATTERY_READING: true,
            CALIBRATION_FINISHED: true,
            LOG_ALL: false, // overrides individual
        };
        /**
         * Handles incoming data from the tower via Bluetooth characteristic notifications.
         * Processes battery status, tower state responses, and other tower communications.
         * @param {Event} event - Bluetooth characteristic value changed event
         */
        this.onRxCharacteristicValueChanged = (event) => {
            // Update last successful command timestamp
            this.lastSuccessfulCommand = Date.now();
            // convert data to byte array
            // @ts-ignore-next-line
            let receivedData = [];
            for (var i = 0; i < event.target.value.byteLength; i++) {
                receivedData[i] = event.target.value.getUint8(i);
            }
            const { cmdKey } = this.getTowerCommand(receivedData[0]);
            // log response
            if (this.logTowerResponses) {
                this.logTowerResponse(receivedData);
            }
            // tower state response check
            const isCommandTowerState = cmdKey === constants_1.TC.STATE;
            if (isCommandTowerState) {
                this.handleTowerStateResponse(receivedData);
            }
            ;
            // battery 
            const isBatteryResponse = cmdKey === constants_1.TC.BATTERY;
            if (isBatteryResponse) {
                // Update battery heartbeat - this is our most reliable connection indicator
                this.lastBatteryHeartbeat = Date.now();
                const millivolts = this.getMilliVoltsFromTowerReponse(receivedData);
                const batteryPercentage = this.millVoltsToPercentage(millivolts);
                const didBatteryLevelChange = this.lastBatteryPercentage !== batteryPercentage;
                const batteryNotifyFrequencyPassed = ((Date.now() - this.lastBatteryNotification) >= this.batteryNotifyFrequency);
                const shouldNotify = this.batteryNotifyOnValueChangeOnly ?
                    didBatteryLevelChange :
                    batteryNotifyFrequencyPassed;
                if (shouldNotify) {
                    this.logger.info(`Tower response: ${this.commandToString(receivedData).join(' ')}`, '[UDT]');
                    this.lastBatteryNotification = Date.now();
                    this.lastBatteryPercentage = batteryPercentage;
                    this.onBatteryLevelNotify(millivolts);
                }
            }
        };
        /**
         * Handles Bluetooth availability changes and manages disconnection if Bluetooth becomes unavailable.
         * @param {Event} event - Bluetooth availability change event
         */
        this.bleAvailabilityChange = (event) => {
            this.logger.info('Bluetooth availability changed', '[UDT]');
            const availability = event.value;
            if (!availability && this.isConnected) {
                this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT]');
                this.handleDisconnection();
            }
        };
        /**
         * Handles unexpected tower device disconnection events.
         * @param {Event} event - GATT server disconnected event
         */
        this.onTowerDeviceDisconnected = (event) => {
            this.logger.warn('Tower device disconnected unexpectedly', '[UDT]');
            this.handleDisconnection();
        };
        /**
         * Creates a light command packet from a lights configuration object.
         * @param {Lights} lights - Light configuration specifying doorway, ledge, and base lights
         * @returns {Uint8Array} Command packet for controlling tower lights
         */
        this.createLightPacketCommand = (lights) => {
            let packetPos = null;
            const command = new Uint8Array(20);
            const doorways = lights === null || lights === void 0 ? void 0 : lights.doorway;
            const ledges = lights === null || lights === void 0 ? void 0 : lights.ledge;
            const bases = lights === null || lights === void 0 ? void 0 : lights.base;
            doorways && doorways.forEach(dlt => {
                packetPos = constants_1.LIGHT_PACKETS.doorway[dlt.level][dlt.position];
                const shouldBitShift = constants_1.DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
                command[packetPos] += constants_1.LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 0x10 : 0x1);
            });
            ledges && ledges.forEach(llt => {
                packetPos = constants_1.LIGHT_PACKETS.ledge[llt.position];
                const shouldBitShift = constants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
                command[packetPos] += constants_1.LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 0x10 : 0x1);
            });
            bases && bases.forEach(blt => {
                packetPos = constants_1.LIGHT_PACKETS.base[blt.position.side][blt.position.level];
                const shouldBitShift = constants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
                command[packetPos] += constants_1.LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 0x10 : 0x1);
            });
            return command;
        };
        // Initialize logger with console output by default
        this.logger = new Logger_1.Logger();
        this.logger.addOutput(new Logger_1.ConsoleOutput());
    }
    //#region Tower Commands 
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns {Promise<void>} Promise that resolves when calibration command is sent
     */
    async calibrate() {
        if (!this.performingCalibration) {
            this.logger.info('Performing Tower Calibration', '[UDT]');
            await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.calibration]));
            // flag to look for calibration complete tower response
            this.performingCalibration = true;
            return;
        }
        this.logger.warn('Tower calibration requested when tower is already performing calibration', '[UDT]');
        return;
    }
    /**
     * Plays a sound from the tower's audio library.
     * @param {number} soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns {Promise<void>} Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
        const invalidIndex = soundIndex === null || soundIndex > (Object.keys(constants_1.TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0;
        if (invalidIndex) {
            this.logger.error(`attempt to play invalid sound index ${soundIndex}`, '[UDT]');
            return;
        }
        const soundCommand = this.createSoundCommand(soundIndex);
        this.updateCommandWithCurrentDrumPositions(soundCommand);
        this.logger.info('Sending sound command', '[UDT]');
        await this.sendTowerCommand(soundCommand);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param {Lights} lights - Light configuration object specifying which lights to control and their effects
     * @returns {Promise<void>} Promise that resolves when light command is sent
     */
    async Lights(lights) {
        const lightCommand = this.createLightPacketCommand(lights);
        this.updateCommandWithCurrentDrumPositions(lightCommand);
        this.logDetail && this.logger.debug(`Light Parameter ${JSON.stringify(lights)}`, '[UDT]');
        this.logger.info('Sending light command', '[UDT]');
        await this.sendTowerCommand(lightCommand);
    }
    /**
     * Sends a light override command to control specific light patterns.
     * @param {number} light - Light override value to send
     * @param {number} [soundIndex] - Optional sound to play with the light override
     * @returns {Promise<void>} Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
        const lightOverrideCommand = this.createLightOverrideCommand(light);
        this.updateCommandWithCurrentDrumPositions(lightOverrideCommand);
        if (soundIndex) {
            lightOverrideCommand[constants_1.AUDIO_COMMAND_POS] = soundIndex;
        }
        this.logger.info('Sending light override' + (soundIndex ? ' with sound' : ''), '[UDT]');
        await this.sendTowerCommand(lightOverrideCommand);
    }
    /**
     * Rotates tower drums to specified positions.
     * @param {TowerSide} top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param {TowerSide} middle - Position for the middle drum
     * @param {TowerSide} bottom - Position for the bottom drum
     * @param {number} [soundIndex] - Optional sound to play during rotation
     * @returns {Promise<void>} Promise that resolves when rotate command is sent
     */
    async Rotate(top, middle, bottom, soundIndex) {
        this.logDetail && this.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, '[UDT]');
        const rotateCommand = this.createRotateCommand(top, middle, bottom);
        if (soundIndex) {
            rotateCommand[constants_1.AUDIO_COMMAND_POS] = soundIndex;
        }
        this.logger.info('Sending rotate command' + (soundIndex ? ' with sound' : ''), '[UDT]');
        await this.sendTowerCommand(rotateCommand);
        // saving drum positions
        this.currentDrumPositions = {
            topMiddle: rotateCommand[constants_1.DRUM_PACKETS.topMiddle],
            bottom: rotateCommand[constants_1.DRUM_PACKETS.bottom]
        };
    }
    /**
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param {RotateCommand} [rotate] - Rotation configuration for tower drums
     * @param {Lights} [lights] - Light configuration object
     * @param {number} [soundIndex] - Optional sound to play with the multi-command
     * @returns {Promise<void>} Promise that resolves when multi-command is sent
     */
    async MultiCommand(rotate, lights, soundIndex) {
        this.logDetail && this.logger.debug(`MultiCommand Parameters ${JSON.stringify(rotate)} ${JSON.stringify(lights)} ${soundIndex}`, '[UDT]');
        let multiCmd = new Uint8Array(20);
        const rotateCmd = this.createRotateCommand(rotate.top, rotate.middle, rotate.bottom);
        const lightCmd = this.createLightPacketCommand(lights);
        // combine commands into single command packet
        for (let index = 0; index < 20; index++) {
            multiCmd[index] = rotateCmd[index] | lightCmd[index];
        }
        // add sound
        if (soundIndex) {
            const soundCmd = this.createSoundCommand(soundIndex);
            multiCmd[constants_1.AUDIO_COMMAND_POS] = multiCmd[constants_1.AUDIO_COMMAND_POS] | soundCmd[constants_1.AUDIO_COMMAND_POS];
        }
        this.sendTowerCommand(multiCmd);
        const packetMsg = this.commandToPacketString(multiCmd);
        this.logger.info(`multiple command sent ${packetMsg}`, '[UDT]');
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns {Promise<void>} Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
        this.logger.info('Tower skull count reset requested', '[UDT]');
        await this.sendTowerCommand(new Uint8Array([constants_1.TOWER_COMMANDS.resetCounter]));
    }
    //#endregion
    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param {Array<number> | number} seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns {Promise<void>} Promise that resolves when seal break sequence is complete
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
                this.logger.error(`Invalid seal number: ${sealNum}. Seals must be 1-12.`, '[UDT]');
                return;
            }
        }
        // Play tower seal sound
        this.logger.info('Playing tower seal sound', '[UDT]');
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
        this.logger.info(`Breaking seal(s) ${sealNumbers.join(', ')} - lighting ledges and doorways with breath effect`, '[UDT]');
        await this.Lights(lights);
    }
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param {number} [level=0] - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns {Promise<void>} Promise that resolves when rotation command is sent
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
                this.logger.error('Invalid level parameter for randomRotateLevels. Must be 0-6.', '[UDT]');
                return;
        }
        this.logger.info(`Random rotating levels to: top:${topSide}, middle:${middleSide}, bottom:${bottomSide}`, '[UDT]');
        await this.Rotate(topSide, middleSide, bottomSide);
    }
    /**
     * Gets the current position of a specific drum level.
     * @param {('top' | 'middle' | 'bottom')} level - The drum level to get position for
     * @returns {TowerSide} The current position of the specified drum level
     * @private
     */
    getCurrentDrumPosition(level) {
        const drumPositions = constants_1.drumPositionCmds[level];
        const currentValue = level === 'bottom'
            ? this.currentDrumPositions.bottom
            : (level === 'top'
                ? (this.currentDrumPositions.topMiddle & 0b00010110) // top bits
                : (this.currentDrumPositions.topMiddle & 0b11000000)); // middle bits
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
    //#region bluetooth
    /**
     * Establishes a Bluetooth connection to the Dark Tower device.
     * Initializes GATT services, characteristics, and starts connection monitoring.
     * @returns {Promise<void>} Promise that resolves when connection is established
     */
    async connect() {
        this.logger.info("Looking for Tower...", '[UDT]');
        try {
            // @ts-ignore
            this.TowerDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: constants_1.TOWER_DEVICE_NAME }],
                optionalServices: [constants_1.UART_SERVICE_UUID]
            });
            if (this.TowerDevice === null) {
                this.logger.warn("Tower not found", '[UDT]');
                return;
            }
            // @ts-ignore
            navigator.bluetooth.addEventListener("availabilitychanged", this.bleAvailabilityChange);
            this.logger.info("Connecting to Tower GATT Server...", '[UDT]');
            const server = await this.TowerDevice.gatt.connect();
            this.logger.info("Getting Tower Primary Service...", '[UDT]');
            const service = await server.getPrimaryService(constants_1.UART_SERVICE_UUID);
            this.logger.info("Getting Tower Characteristics...", '[UDT]');
            this.txCharacteristic = await service.getCharacteristic(constants_1.UART_TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(constants_1.UART_RX_CHARACTERISTIC_UUID);
            this.logger.info("Subscribing to Tower...", '[UDT]');
            await this.rxCharacteristic.startNotifications();
            await this.rxCharacteristic.addEventListener("characteristicvaluechanged", this.onRxCharacteristicValueChanged);
            // Add disconnect detection
            this.TowerDevice.addEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
            this.logger.info('Tower connection complete', '[UDT]');
            this.isConnected = true;
            this.lastSuccessfulCommand = Date.now();
            this.lastBatteryHeartbeat = Date.now(); // Initialize battery heartbeat
            // Start connection monitoring
            if (this.enableConnectionMonitoring) {
                this.startConnectionMonitoring();
            }
            this.onTowerConnect();
        }
        catch (error) {
            this.logger.error(`Tower Connection Error: ${error}`, '[UDT]');
            this.isConnected = false;
            this.onTowerDisconnect();
        }
    }
    /**
     * Processes tower state response data including calibration completion and skull drop detection.
     * @param {Uint8Array} receivedData - Raw data received from the tower
     * @private
     */
    handleTowerStateResponse(receivedData) {
        const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
        const dataSkullDropCount = receivedData[constants_1.SKULL_DROP_COUNT_POS];
        // check to see if the response for a calibration request
        if (this.performingCalibration) {
            this.performingCalibration = false;
            this.isCalibrated = true;
            // Reset battery heartbeat timer since calibration blocks battery updates
            // and it may take time for them to resume
            this.lastBatteryHeartbeat = Date.now();
            this.onCalibrationComplete();
            this.logger.info('Tower calibration complete', '[UDT]');
        }
        // skull drop check
        // Note: If IR triggers when tower is disconnected it will result in tower sending
        // skull count when tower is reconnected.
        if (dataSkullDropCount !== this.towerSkullDropCount) {
            // don't trigger if skull count is zero, this can happen if the tower is power cycled
            // or when a 'reset' command is sent.
            if (!!dataSkullDropCount) {
                this.onSkullDrop(dataSkullDropCount);
                this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, '[UDT]');
            }
            else {
                this.logger.info(`Skull count reset to ${dataSkullDropCount}`, '[UDT]');
            }
            this.towerSkullDropCount = dataSkullDropCount;
        }
    }
    /**
     * Logs tower response data based on configured logging settings.
     * @param {Uint8Array} receivedData - Raw data received from the tower
     * @private
     */
    logTowerResponse(receivedData) {
        const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
        const logAll = this.logTowerResponseConfig["LOG_ALL"];
        let canLogThisResponse = this.logTowerResponseConfig[cmdKey] || logAll;
        // in case a command is not known we want to capture its occurance
        if (!cmdKey) {
            canLogThisResponse = true;
        }
        if (!canLogThisResponse) {
            return;
        }
        const isBatteryResponse = cmdKey === constants_1.TC.BATTERY;
        if (isBatteryResponse) {
            return; // logged elsewhere
        }
        this.logger.info(`Tower response: ${this.commandToString(receivedData).join(' ')}`, '[UDT]');
    }
    /**
     * Disconnects from the tower device and cleans up resources.
     * @returns {Promise<void>} Promise that resolves when disconnection is complete
     */
    async disconnect() {
        if (!this.TowerDevice) {
            return;
        }
        // Stop monitoring before disconnecting
        this.stopConnectionMonitoring();
        if (this.TowerDevice.gatt.connected) {
            // Remove event listener before disconnecting
            this.TowerDevice.removeEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
            await this.TowerDevice.gatt.disconnect();
            this.logger.info("Tower disconnected", '[UDT]');
            this.handleDisconnection();
        }
    }
    /**
     * Centralizes disconnection handling, cleaning up state and notifying callbacks.
     * @private
     */
    handleDisconnection() {
        this.isConnected = false;
        this.isCalibrated = false;
        this.performingCalibration = false;
        this.stopConnectionMonitoring();
        // Reset heartbeat tracking
        this.lastBatteryHeartbeat = 0;
        this.lastSuccessfulCommand = 0;
        // Clean up characteristics
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        this.onTowerDisconnect();
    }
    /**
     * Starts the connection monitoring interval to periodically check connection health.
     * @private
     */
    startConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
        }
        this.connectionMonitorInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, this.connectionMonitorFrequency);
    }
    /**
     * Stops the connection monitoring interval.
     * @private
     */
    stopConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
        }
    }
    /**
     * Performs connection health checks including battery heartbeat and GATT connection status.
     * @private
     */
    checkConnectionHealth() {
        if (!this.isConnected || !this.TowerDevice) {
            return;
        }
        // Check if device is still connected at GATT level
        if (!this.TowerDevice.gatt.connected) {
            this.logger.warn('GATT connection lost detected during health check', '[UDT]');
            this.handleDisconnection();
            return;
        }
        // PRIMARY CHECK: Battery heartbeat monitoring (most reliable)
        // Tower sends battery status every ~200ms, so if we haven't received one in 3+ seconds,
        // the tower is likely disconnected (probably due to battery depletion)
        // Exception: During calibration, use longer timeout as tower doesn't send battery updates
        if (this.enableBatteryHeartbeatMonitoring) {
            const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
            const timeoutThreshold = this.performingCalibration ? this.calibrationHeartbeatTimeout : this.batteryHeartbeatTimeout;
            if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
                const operationContext = this.performingCalibration ? ' during calibration' : '';
                this.logger.warn(`Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`, '[UDT]');
                // During calibration, battery heartbeat timeouts are expected behavior, not actual disconnects
                if (this.performingCalibration) {
                    this.logger.info('Ignoring battery heartbeat timeout during calibration - this is expected behavior', '[UDT]');
                    return;
                }
                this.logger.warn('Tower possibly disconnected due to battery depletion or power loss', '[UDT]');
                this.handleDisconnection();
                return;
            }
        }
        // SECONDARY CHECK: General command response timeout
        // Check if we haven't received any response in a while
        const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
        if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
            this.logger.warn('General connection timeout detected - no responses received', '[UDT]');
            // Connection timeout detected - handle disconnection
            this.logger.warn('Heartbeat timeout - connection appears lost', '[UDT]');
            this.handleDisconnection();
        }
    }
    //#endregion
    //#region utility
    /**
     * Configure logger outputs for this UltimateDarkTower instance
     * @param {LogOutput[]} outputs - Array of log outputs to use (e.g., ConsoleOutput, DOMOutput)
     */
    setLoggerOutputs(outputs) {
        this.logger = new Logger_1.Logger();
        outputs.forEach(output => this.logger.addOutput(output));
    }
    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param {Uint8Array} command - The command packet to send to the tower
     * @returns {Promise<void>} Promise that resolves when command is sent successfully
     */
    async sendTowerCommand(command) {
        var _a, _b, _c;
        try {
            const cmdStr = this.commandToPacketString(command);
            this.logDetail && this.logger.debug(`packet(s) sent: ${cmdStr}`, '[UDT]');
            if (!this.txCharacteristic || !this.isConnected) {
                this.logger.warn('Tower is not connected', '[UDT]');
                return;
            }
            await this.txCharacteristic.writeValue(command);
            this.isConnected = true;
            this.retrySendCommandCount = 0;
            this.lastSuccessfulCommand = Date.now();
        }
        catch (error) {
            this.logger.error(`command send error: ${error}`, '[UDT]');
            const errorMsg = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : new String(error);
            const wasCancelled = errorMsg.includes('User cancelled');
            const maxRetriesReached = this.retrySendCommandCount >= this.retrySendCommandMax;
            // Check for disconnect indicators
            const isDisconnected = errorMsg.includes('Cannot read properties of null') ||
                errorMsg.includes('GATT Server is disconnected') ||
                errorMsg.includes('Device is not connected') ||
                !((_c = (_b = this.TowerDevice) === null || _b === void 0 ? void 0 : _b.gatt) === null || _c === void 0 ? void 0 : _c.connected);
            if (isDisconnected) {
                this.logger.warn('Disconnect detected during command send', '[UDT]');
                this.handleDisconnection();
                return;
            }
            if (!maxRetriesReached && this.isConnected && !wasCancelled) {
                this.logger.info(`retrying tower command attempt ${this.retrySendCommandCount + 1}`, '[UDT]');
                this.retrySendCommandCount++;
                setTimeout(() => {
                    this.sendTowerCommand(command);
                }, 250 * this.retrySendCommandCount);
            }
            else {
                this.retrySendCommandCount = 0;
            }
        }
    }
    /**
     * Updates a command packet with the current drum positions.
     * @param {CommandPacket} commandPacket - The command packet to update with current drum positions
     */
    updateCommandWithCurrentDrumPositions(commandPacket) {
        commandPacket[constants_1.DRUM_PACKETS.topMiddle] = this.currentDrumPositions.topMiddle;
        commandPacket[constants_1.DRUM_PACKETS.bottom] = this.currentDrumPositions.bottom;
    }
    /**
     * Creates a light override command packet.
     * @param {number} lightOverride - Light override value to send
     * @returns {Uint8Array} Command packet for light override
     */
    createLightOverrideCommand(lightOverride) {
        const lightOverrideCommand = new Uint8Array(20);
        lightOverrideCommand[constants_1.LIGHT_PACKETS.overrides] = lightOverride;
        return lightOverrideCommand;
    }
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param {TowerSide} top - Target position for top drum
     * @param {TowerSide} middle - Target position for middle drum
     * @param {TowerSide} bottom - Target position for bottom drum
     * @returns {Uint8Array} Command packet for rotating tower drums
     */
    createRotateCommand(top, middle, bottom) {
        const rotateCmd = new Uint8Array(20);
        rotateCmd[constants_1.DRUM_PACKETS.topMiddle] =
            constants_1.drumPositionCmds.top[top] | constants_1.drumPositionCmds.middle[middle];
        rotateCmd[constants_1.DRUM_PACKETS.bottom] = constants_1.drumPositionCmds.bottom[bottom];
        return rotateCmd;
    }
    /**
     * Creates a sound command packet for playing tower audio.
     * @param {number} soundIndex - Index of the sound to play from the audio library
     * @returns {Uint8Array} Command packet for playing sound
     */
    createSoundCommand(soundIndex) {
        const soundCommand = new Uint8Array(20);
        const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
        soundCommand[constants_1.AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }
    /**
     * Converts a command packet to a human-readable string array for logging.
     * TODO: return parsed data values rather than raw packet values
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
    commandToString(command) {
        const cmdValue = command[0];
        const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue);
        switch (cmdKey) {
            case constants_1.TC.STATE:
            case constants_1.TC.INVALID_STATE:
            case constants_1.TC.FAILURE:
            case constants_1.TC.JIGGLE:
            case constants_1.TC.UNEXPECTED:
            case constants_1.TC.DURATION:
            case constants_1.TC.DIFFERENTIAL:
            case constants_1.TC.CALIBRATION:
                return [towerCommand.name, this.commandToPacketString(command)];
            case constants_1.TC.BATTERY:
                const millivolts = this.getMilliVoltsFromTowerReponse(command);
                const retval = [towerCommand.name, this.millVoltsToPercentage(millivolts)];
                if (this.logDetail) {
                    retval.push(`${millivolts}mv`);
                    retval.push(this.commandToPacketString(command));
                }
                return retval;
            default:
                return ["Unmapped Response!", this.commandToPacketString(command)];
        }
    }
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command) {
        let cmdStr = "[";
        command.forEach(n => cmdStr += n.toString(16) + ",");
        cmdStr = cmdStr.slice(0, -1) + "]";
        return cmdStr;
    }
    /**
     * Maps a command value to its corresponding tower message definition.
     * @param {number} cmdValue - Command value received from tower
     * @returns {Object} Object containing command key and command definition
     */
    getTowerCommand(cmdValue) {
        const cmdKeys = Object.keys(constants_1.TOWER_MESSAGES);
        const cmdKey = cmdKeys.find(key => constants_1.TOWER_MESSAGES[key].value === cmdValue);
        const command = constants_1.TOWER_MESSAGES[cmdKey];
        return { cmdKey, command };
    }
    /**
     * Extracts battery voltage in millivolts from a tower battery response.
     * @param {Uint8Array} command - Battery response packet from tower
     * @returns {number} Battery voltage in millivolts
     */
    getMilliVoltsFromTowerReponse(command) {
        const mv = new Uint8Array(4);
        mv[0] = command[4];
        mv[1] = command[3];
        mv[3] = 0;
        mv[4] = 0;
        var view = new DataView(mv.buffer, 0);
        return view.getUint32(0, true);
    }
    /**
     * Converts battery voltage in millivolts to percentage.
     * Tower returns sum total battery level in millivolts for all batteries.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    millVoltsToPercentage(mv) {
        const batLevel = mv ? mv / 3 : 0; // lookup is based on sinlge AA
        const levels = constants_1.VOLTAGE_LEVELS.filter(v => batLevel >= v);
        return `${levels.length * 5}%`;
    }
    ;
    //#endregion
    //#region Connection Management
    /**
     * Enable or disable connection monitoring
     * @param {boolean} enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled) {
        this.enableConnectionMonitoring = enabled;
        if (enabled && this.isConnected) {
            this.startConnectionMonitoring();
        }
        else {
            this.stopConnectionMonitoring();
        }
    }
    /**
     * Configure connection monitoring parameters
     * @param {number} [frequency=2000] - How often to check connection (milliseconds)
     * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency = 2000, timeout = 30000) {
        this.connectionMonitorFrequency = frequency;
        this.connectionTimeoutThreshold = timeout;
        // Restart monitoring with new settings if currently enabled
        if (this.enableConnectionMonitoring && this.isConnected) {
            this.startConnectionMonitoring();
        }
    }
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
     * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
     */
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3000) {
        this.enableBatteryHeartbeatMonitoring = enabled;
        this.batteryHeartbeatTimeout = timeout;
    }
    /**
     * Check if the tower is currently connected
     * @returns {Promise<boolean>} True if connected and responsive
     */
    async isConnectedAndResponsive() {
        var _a, _b;
        if (!this.isConnected || !((_b = (_a = this.TowerDevice) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected)) {
            return false;
        }
        // Simple connectivity check - if we have a valid characteristic, assume connected
        return true;
    }
    /**
     * Get detailed connection status including heartbeat information
     * @returns {Object} Object with connection details
     */
    getConnectionStatus() {
        var _a, _b;
        const now = Date.now();
        const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
        const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
        return {
            isConnected: this.isConnected,
            isGattConnected: ((_b = (_a = this.TowerDevice) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected) || false,
            isCalibrated: this.isCalibrated,
            lastBatteryHeartbeatMs: timeSinceLastBattery,
            lastCommandResponseMs: timeSinceLastCommand,
            batteryHeartbeatHealthy: timeSinceLastBattery >= 0 && timeSinceLastBattery < this.batteryHeartbeatTimeout,
            connectionMonitoringEnabled: this.enableConnectionMonitoring,
            batteryHeartbeatMonitoringEnabled: this.enableBatteryHeartbeatMonitoring,
            batteryHeartbeatTimeoutMs: this.batteryHeartbeatTimeout,
            connectionTimeoutMs: this.connectionTimeoutThreshold
        };
    }
    //#endregion
    //#region cleanup
    /**
     * Clean up resources and disconnect properly
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        this.logger.info('Cleaning up UltimateDarkTower instance', '[UDT]');
        // Stop connection monitoring
        this.stopConnectionMonitoring();
        // Remove event listeners
        if (this.TowerDevice) {
            this.TowerDevice.removeEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
        }
        // @ts-ignore
        if (navigator.bluetooth) {
            // @ts-ignore
            navigator.bluetooth.removeEventListener("availabilitychanged", this.bleAvailabilityChange);
        }
        // Disconnect if connected
        if (this.isConnected) {
            await this.disconnect();
        }
    }
}
exports.default = UltimateDarkTower;
//# sourceMappingURL=UltimateDarkTower.js.map