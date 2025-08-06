"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtBleConnection = void 0;
const udtConstants_1 = require("./udtConstants");
const udtTowerResponse_1 = require("./udtTowerResponse");
const udtHelpers_1 = require("./udtHelpers");
const udtTowerState_1 = require("./udtTowerState");
class UdtBleConnection {
    constructor(logger, callbacks) {
        // BLE connection objects
        this.TowerDevice = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        // Connection state
        this.isConnected = false;
        this.performingCalibration = false;
        this.performingLongCommand = false;
        // Connection monitoring
        this.connectionMonitorInterval = null;
        this.connectionMonitorFrequency = 2 * 1000;
        this.lastSuccessfulCommand = 0;
        this.connectionTimeoutThreshold = 30 * 1000;
        this.enableConnectionMonitoring = true;
        // Battery heartbeat monitoring
        this.lastBatteryHeartbeat = 0;
        this.batteryHeartbeatTimeout = 3 * 1000;
        this.longTowerCommandTimeout = 30 * 1000;
        this.enableBatteryHeartbeatMonitoring = true;
        this.batteryHeartbeatVerifyConnection = true; // When true, verifies connection before triggering disconnection on heartbeat timeout
        // Tower state
        this.towerSkullDropCount = -1;
        this.lastBatteryNotification = 0;
        this.lastBatteryPercentage = "";
        this.batteryNotifyFrequency = 15 * 1000;
        this.batteryNotifyOnValueChangeOnly = false;
        this.batteryNotifyEnabled = true;
        // Device information
        this.deviceInformation = {};
        // Logging configuration
        this.logTowerResponses = true;
        this.logTowerResponseConfig = {
            TOWER_STATE: true,
            INVALID_STATE: true,
            HARDWARE_FAILURE: true,
            MECH_JIGGLE_TRIGGERED: true,
            MECH_UNEXPECTED_TRIGGER: true,
            MECH_DURATION: true,
            DIFFERENTIAL_READINGS: true,
            BATTERY_READING: true,
            CALIBRATION_FINISHED: true,
            LOG_ALL: false,
        };
        this.onRxCharacteristicValueChanged = (event) => {
            this.lastSuccessfulCommand = Date.now();
            // @ts-ignore-next-line
            const target = event.target;
            let receivedData = new Uint8Array(target.value.byteLength);
            for (var i = 0; i < target.value.byteLength; i++) {
                receivedData[i] = target.value.getUint8(i);
            }
            const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
            this.logger.info(`Command: ${cmdKey}`, '[UDT][BLE][RESPONSE]');
            if (this.logTowerResponses) {
                this.logTowerResponse(receivedData);
            }
            if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
                this.handleTowerStateResponse(receivedData);
            }
            if (this.responseProcessor.isBatteryResponse(cmdKey)) {
                this.lastBatteryHeartbeat = Date.now();
                const millivolts = (0, udtHelpers_1.getMilliVoltsFromTowerResponse)(receivedData);
                const batteryPercentage = (0, udtHelpers_1.milliVoltsToPercentage)(millivolts);
                const didBatteryLevelChange = this.lastBatteryPercentage !== "" && this.lastBatteryPercentage !== batteryPercentage;
                const batteryNotifyFrequencyPassed = ((Date.now() - this.lastBatteryNotification) >= this.batteryNotifyFrequency);
                const shouldNotify = this.batteryNotifyEnabled && (this.batteryNotifyOnValueChangeOnly ?
                    (didBatteryLevelChange || this.lastBatteryPercentage === "") :
                    batteryNotifyFrequencyPassed);
                if (shouldNotify) {
                    this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(' ')}`, '[UDT]');
                    this.lastBatteryNotification = Date.now();
                    this.lastBatteryPercentage = batteryPercentage;
                    this.callbacks.onBatteryLevelNotify(millivolts);
                }
            }
            else {
                // For non-battery responses, notify the command queue
                // This includes tower state responses, command acknowledgments, etc.
                if (this.callbacks.onTowerResponse) {
                    this.callbacks.onTowerResponse(receivedData);
                }
            }
        };
        this.bleAvailabilityChange = (event) => {
            this.logger.info('Bluetooth availability changed', '[UDT]');
            const availability = event.value;
            if (!availability && this.isConnected) {
                this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT]');
                this.handleDisconnection();
            }
        };
        this.onTowerDeviceDisconnected = (event) => {
            this.logger.warn(`Tower device disconnected unexpectedly: ${event.type}`, '[UDT]');
            this.handleDisconnection();
        };
        this.logger = logger;
        this.callbacks = callbacks;
        this.responseProcessor = new udtTowerResponse_1.TowerResponseProcessor();
    }
    async connect() {
        this.logger.info("Looking for Tower...", '[UDT]');
        try {
            // @ts-ignore
            this.TowerDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: udtConstants_1.TOWER_DEVICE_NAME }],
                optionalServices: [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID]
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
            const service = await server.getPrimaryService(udtConstants_1.UART_SERVICE_UUID);
            this.logger.info("Getting Tower Characteristics...", '[UDT]');
            this.txCharacteristic = await service.getCharacteristic(udtConstants_1.UART_TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(udtConstants_1.UART_RX_CHARACTERISTIC_UUID);
            this.logger.info("Subscribing to Tower...", '[UDT]');
            await this.rxCharacteristic.startNotifications();
            await this.rxCharacteristic.addEventListener("characteristicvaluechanged", this.onRxCharacteristicValueChanged);
            this.TowerDevice.addEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
            this.logger.info('Tower connection complete', '[UDT]');
            this.isConnected = true;
            this.lastSuccessfulCommand = Date.now();
            this.lastBatteryHeartbeat = Date.now();
            // Read device information after successful connection
            await this.readDeviceInformation();
            if (this.enableConnectionMonitoring) {
                this.startConnectionMonitoring();
            }
            this.callbacks.onTowerConnect();
        }
        catch (error) {
            this.logger.error(`Tower Connection Error: ${error}`, '[UDT]');
            this.isConnected = false;
            this.callbacks.onTowerDisconnect();
        }
    }
    async disconnect() {
        if (!this.TowerDevice) {
            return;
        }
        this.stopConnectionMonitoring();
        if (this.TowerDevice.gatt.connected) {
            this.TowerDevice.removeEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
            await this.TowerDevice.gatt.disconnect();
            this.logger.info("Tower disconnected", '[UDT]');
            this.handleDisconnection();
        }
    }
    handleTowerStateResponse(receivedData) {
        const dataSkullDropCount = receivedData[udtConstants_1.SKULL_DROP_COUNT_POS];
        this.logger.debug('Tower Message Received', '[UDT][BLE]');
        const state = (0, udtTowerState_1.rtdt_unpack_state)(receivedData);
        this.logger.debug(`Tower State: ${JSON.stringify(state)} `, '[UDT][BLE]');
        if (this.performingCalibration) {
            this.performingCalibration = false;
            this.performingLongCommand = false;
            this.lastBatteryHeartbeat = Date.now();
            this.callbacks.onCalibrationComplete();
            this.logger.info('Tower calibration complete', '[UDT]');
        }
        if (dataSkullDropCount !== this.towerSkullDropCount) {
            if (dataSkullDropCount) {
                this.callbacks.onSkullDrop(dataSkullDropCount);
                this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, '[UDT]');
            }
            else {
                this.logger.info(`Skull count reset to ${dataSkullDropCount}`, '[UDT]');
            }
            this.towerSkullDropCount = dataSkullDropCount;
        }
    }
    logTowerResponse(receivedData) {
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
        if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
            return;
        }
        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
            return; // logged elsewhere
        }
        this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(' ')}`, '[UDT]');
    }
    handleDisconnection() {
        this.isConnected = false;
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.stopConnectionMonitoring();
        this.lastBatteryHeartbeat = 0;
        this.lastSuccessfulCommand = 0;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        // Clear device information on disconnect
        this.deviceInformation = {};
        this.callbacks.onTowerDisconnect();
    }
    startConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
        }
        this.connectionMonitorInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, this.connectionMonitorFrequency);
    }
    stopConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
        }
    }
    checkConnectionHealth() {
        var _a, _b;
        if (!this.isConnected || !this.TowerDevice) {
            return;
        }
        if (!this.TowerDevice.gatt.connected) {
            this.logger.warn('GATT connection lost detected during health check', '[UDT]');
            this.handleDisconnection();
            return;
        }
        if (this.enableBatteryHeartbeatMonitoring) {
            const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
            const timeoutThreshold = this.performingLongCommand ? this.longTowerCommandTimeout : this.batteryHeartbeatTimeout;
            if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
                const operationContext = this.performingLongCommand ? ' during long command operation' : '';
                this.logger.warn(`Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`, '[UDT]');
                if (this.performingLongCommand) {
                    this.logger.info('Ignoring battery heartbeat timeout during long command - this is expected behavior', '[UDT]');
                    return;
                }
                // Before assuming disconnection, verify if the tower is actually still responsive
                if (this.batteryHeartbeatVerifyConnection) {
                    this.logger.info('Verifying tower connection status before triggering disconnection...', '[UDT]');
                    // Check if GATT is still connected and characteristics are available
                    if (((_b = (_a = this.TowerDevice) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected) && this.rxCharacteristic) {
                        this.logger.info('GATT connection and characteristics still available - heartbeat timeout may be temporary', '[UDT]');
                        // Reset the last battery heartbeat to current time to give it another chance
                        // This prevents repeated false disconnections while the tower is still actually connected
                        this.lastBatteryHeartbeat = Date.now();
                        this.logger.info('Reset battery heartbeat timer - will monitor for another timeout period', '[UDT]');
                        return;
                    }
                }
                this.logger.warn('Tower possibly disconnected due to battery depletion or power loss', '[UDT]');
                this.handleDisconnection();
                return;
            }
        }
        const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
        if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
            this.logger.warn('General connection timeout detected - no responses received', '[UDT]');
            this.logger.warn('Heartbeat timeout - connection appears lost', '[UDT]');
            this.handleDisconnection();
        }
    }
    setConnectionMonitoring(enabled) {
        this.enableConnectionMonitoring = enabled;
        if (enabled && this.isConnected) {
            this.startConnectionMonitoring();
        }
        else {
            this.stopConnectionMonitoring();
        }
    }
    configureConnectionMonitoring(frequency = 2000, timeout = 30000) {
        this.connectionMonitorFrequency = frequency;
        this.connectionTimeoutThreshold = timeout;
        if (this.enableConnectionMonitoring && this.isConnected) {
            this.startConnectionMonitoring();
        }
    }
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3000, verifyConnection = true) {
        this.enableBatteryHeartbeatMonitoring = enabled;
        this.batteryHeartbeatTimeout = timeout;
        this.batteryHeartbeatVerifyConnection = verifyConnection;
    }
    async isConnectedAndResponsive() {
        var _a, _b;
        if (!this.isConnected || !((_b = (_a = this.TowerDevice) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected)) {
            return false;
        }
        // Check if characteristics are still available
        if (!this.txCharacteristic || !this.rxCharacteristic) {
            return false;
        }
        // Additional check: verify the GATT service is still accessible
        try {
            // This will throw if the service is no longer available
            if (this.txCharacteristic.service && this.rxCharacteristic.service) {
                return true;
            }
        }
        catch (error) {
            this.logger.warn('GATT characteristics or services no longer accessible', '[UDT]');
            return false;
        }
        return true;
    }
    getConnectionStatus() {
        var _a, _b;
        const now = Date.now();
        const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
        const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
        return {
            isConnected: this.isConnected,
            isGattConnected: ((_b = (_a = this.TowerDevice) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected) || false,
            lastBatteryHeartbeatMs: timeSinceLastBattery,
            lastCommandResponseMs: timeSinceLastCommand,
            batteryHeartbeatHealthy: timeSinceLastBattery >= 0 && timeSinceLastBattery < this.batteryHeartbeatTimeout,
            connectionMonitoringEnabled: this.enableConnectionMonitoring,
            batteryHeartbeatMonitoringEnabled: this.enableBatteryHeartbeatMonitoring,
            batteryHeartbeatTimeoutMs: this.batteryHeartbeatTimeout,
            batteryHeartbeatVerifyConnection: this.batteryHeartbeatVerifyConnection,
            connectionTimeoutMs: this.connectionTimeoutThreshold
        };
    }
    getDeviceInformation() {
        return Object.assign({}, this.deviceInformation);
    }
    async readDeviceInformation() {
        var _a, _b;
        if (!((_b = (_a = this.TowerDevice) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected)) {
            this.logger.warn('Cannot read device information - not connected', '[UDT]');
            return;
        }
        try {
            this.logger.info('Reading device information service...', '[UDT]');
            const disService = await this.TowerDevice.gatt.getPrimaryService(udtConstants_1.DIS_SERVICE_UUID);
            // Reset device information object
            this.deviceInformation = {};
            const characteristicMap = [
                { uuid: udtConstants_1.DIS_MANUFACTURER_NAME_UUID, name: 'Manufacturer Name', key: 'manufacturerName', logIfMissing: true },
                { uuid: udtConstants_1.DIS_MODEL_NUMBER_UUID, name: 'Model Number', key: 'modelNumber', logIfMissing: true },
                { uuid: udtConstants_1.DIS_SERIAL_NUMBER_UUID, name: 'Serial Number', key: 'serialNumber', logIfMissing: false },
                { uuid: udtConstants_1.DIS_HARDWARE_REVISION_UUID, name: 'Hardware Revision', key: 'hardwareRevision', logIfMissing: true },
                { uuid: udtConstants_1.DIS_FIRMWARE_REVISION_UUID, name: 'Firmware Revision', key: 'firmwareRevision', logIfMissing: true },
                { uuid: udtConstants_1.DIS_SOFTWARE_REVISION_UUID, name: 'Software Revision', key: 'softwareRevision', logIfMissing: true },
                { uuid: udtConstants_1.DIS_SYSTEM_ID_UUID, name: 'System ID', key: 'systemId', logIfMissing: false },
                { uuid: udtConstants_1.DIS_IEEE_REGULATORY_UUID, name: 'IEEE Regulatory', key: 'ieeeRegulatory', logIfMissing: false },
                { uuid: udtConstants_1.DIS_PNP_ID_UUID, name: 'PnP ID', key: 'pnpId', logIfMissing: false },
            ];
            for (const { uuid, name, key, logIfMissing } of characteristicMap) {
                try {
                    const characteristic = await disService.getCharacteristic(uuid);
                    const value = await characteristic.readValue();
                    if (uuid === udtConstants_1.DIS_SYSTEM_ID_UUID || uuid === udtConstants_1.DIS_PNP_ID_UUID) {
                        // These are binary data, convert to hex string
                        const hexValue = Array.from(new Uint8Array(value.buffer))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join(':');
                        this.logger.info(`Device ${name}: ${hexValue}`, '[UDT]');
                        this.deviceInformation[key] = hexValue;
                    }
                    else {
                        // Text characteristics
                        const textValue = new TextDecoder().decode(value);
                        this.logger.info(`Device ${name}: ${textValue}`, '[UDT]');
                        this.deviceInformation[key] = textValue;
                    }
                }
                catch (error) {
                    if (logIfMissing) {
                        this.logger.debug(`Device ${name} characteristic not available`, '[UDT]');
                    }
                }
            }
            // Set timestamp when device information was last read
            this.deviceInformation.lastUpdated = new Date();
        }
        catch (error) {
            this.logger.debug('Device Information Service not available', '[UDT]');
        }
    }
    async cleanup() {
        this.logger.info('Cleaning up UdtBleConnection instance', '[UDT]');
        this.stopConnectionMonitoring();
        if (this.TowerDevice) {
            this.TowerDevice.removeEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
        }
        // @ts-ignore
        if (navigator.bluetooth) {
            // @ts-ignore
            navigator.bluetooth.removeEventListener("availabilitychanged", this.bleAvailabilityChange);
        }
        if (this.isConnected) {
            await this.disconnect();
        }
    }
}
exports.UdtBleConnection = UdtBleConnection;
//# sourceMappingURL=udtBleConnection.js.map