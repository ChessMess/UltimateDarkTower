"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtBleConnection = void 0;
const udtConstants_1 = require("./udtConstants");
const udtTowerResponse_1 = require("./udtTowerResponse");
const udtHelpers_1 = require("./udtHelpers");
const udtTowerState_1 = require("./udtTowerState");
const udtBluetoothAdapterFactory_1 = require("./udtBluetoothAdapterFactory");
class UdtBleConnection {
    constructor(logger, callbacks, adapter) {
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
            DIFFERENTIAL_READINGS: false,
            BATTERY_READING: true,
            CALIBRATION_FINISHED: true,
            LOG_ALL: false,
        };
        this.logger = logger;
        this.callbacks = callbacks;
        this.responseProcessor = new udtTowerResponse_1.TowerResponseProcessor();
        // Use provided adapter or auto-detect platform
        this.bluetoothAdapter = adapter || udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.create(udtBluetoothAdapterFactory_1.BluetoothPlatform.AUTO);
        // Set up adapter event callbacks
        this.bluetoothAdapter.onCharacteristicValueChanged((data) => {
            this.onRxData(data);
        });
        this.bluetoothAdapter.onDisconnect(() => {
            this.onTowerDeviceDisconnected();
        });
        this.bluetoothAdapter.onBluetoothAvailabilityChanged((available) => {
            this.bleAvailabilityChange(available);
        });
    }
    async connect() {
        this.logger.info("Looking for Tower...", '[UDT]');
        try {
            await this.bluetoothAdapter.connect(udtConstants_1.TOWER_DEVICE_NAME, [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID]);
            this.logger.info('Tower connection complete', '[UDT][BLE]');
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
            this.logger.error(`Tower Connection Error: ${error}`, '[UDT][BLE]');
            this.isConnected = false;
            this.callbacks.onTowerDisconnect();
        }
    }
    async disconnect() {
        this.stopConnectionMonitoring();
        if (this.bluetoothAdapter.isConnected()) {
            await this.bluetoothAdapter.disconnect();
            this.logger.info("Tower disconnected", '[UDT]');
        }
        this.handleDisconnection();
    }
    /**
     * Writes a command to the tower via the Bluetooth adapter.
     * Used by UdtTowerCommands instead of direct characteristic access.
     */
    async writeCommand(command) {
        return await this.bluetoothAdapter.writeCharacteristic(command);
    }
    /**
     * Processes received data from the RX characteristic (platform-agnostic).
     * Called by the adapter's onCharacteristicValueChanged callback.
     */
    onRxData(receivedData) {
        this.lastSuccessfulCommand = Date.now();
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
        const isBattery = this.responseProcessor.isBatteryResponse(cmdKey);
        const shouldLogCommand = this.logTowerResponses &&
            this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) &&
            (!isBattery || this.batteryNotifyEnabled);
        if (shouldLogCommand) {
            this.logger.info(`${cmdKey}`, '[UDT][BLE][RCVD]');
        }
        if (this.logTowerResponses) {
            this.logTowerResponse(receivedData);
        }
        if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
            this.handleTowerStateResponse(receivedData);
        }
        if (isBattery) {
            this.lastBatteryHeartbeat = Date.now();
            const millivolts = (0, udtHelpers_1.getMilliVoltsFromTowerResponse)(receivedData);
            const batteryPercentage = (0, udtHelpers_1.milliVoltsToPercentage)(millivolts);
            const didBatteryLevelChange = this.lastBatteryPercentage !== "" && this.lastBatteryPercentage !== batteryPercentage;
            const batteryNotifyFrequencyPassed = ((Date.now() - this.lastBatteryNotification) >= this.batteryNotifyFrequency);
            const shouldNotify = this.batteryNotifyEnabled && (this.batteryNotifyOnValueChangeOnly ?
                (didBatteryLevelChange || this.lastBatteryPercentage === "") :
                batteryNotifyFrequencyPassed);
            if (shouldNotify) {
                this.logger.info(`${this.responseProcessor.commandToString(receivedData).join(' ')}`, '[UDT][BLE]');
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
    }
    handleTowerStateResponse(receivedData) {
        const dataSkullDropCount = receivedData[udtConstants_1.SKULL_DROP_COUNT_POS];
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
        const { cmdKey, command } = this.responseProcessor.getTowerCommand(receivedData[0]);
        if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
            return;
        }
        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
            return; // logged elsewhere
        }
        const logMessage = `${this.responseProcessor.commandToString(receivedData).join(' ')}`;
        if (command.critical) {
            this.logger.error(logMessage, '[UDT][BLE]');
        }
        else {
            this.logger.info(logMessage, '[UDT][BLE]');
        }
    }
    bleAvailabilityChange(available) {
        this.logger.info('Bluetooth availability changed', '[UDT][BLE]');
        if (!available && this.isConnected) {
            this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT][BLE]');
            this.handleDisconnection();
        }
    }
    onTowerDeviceDisconnected() {
        this.logger.warn('Tower device disconnected unexpectedly', '[UDT][BLE]');
        this.handleDisconnection();
    }
    handleDisconnection() {
        this.isConnected = false;
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.stopConnectionMonitoring();
        this.lastBatteryHeartbeat = 0;
        this.lastSuccessfulCommand = 0;
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
        if (!this.isConnected) {
            return;
        }
        if (!this.bluetoothAdapter.isGattConnected()) {
            this.logger.warn('GATT connection lost detected during health check', '[UDT][BLE]');
            this.handleDisconnection();
            return;
        }
        if (this.enableBatteryHeartbeatMonitoring) {
            const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
            const timeoutThreshold = this.performingLongCommand ? this.longTowerCommandTimeout : this.batteryHeartbeatTimeout;
            if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
                const operationContext = this.performingLongCommand ? ' during long command operation' : '';
                this.logger.warn(`Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`, '[UDT][BLE]');
                if (this.performingLongCommand) {
                    this.logger.info('Ignoring battery heartbeat timeout during long command - this is expected behavior', '[UDT][BLE]');
                    return;
                }
                // Before assuming disconnection, verify if the tower is actually still responsive
                if (this.batteryHeartbeatVerifyConnection) {
                    this.logger.info('Verifying tower connection status before triggering disconnection...', '[UDT][BLE]');
                    // Check if GATT is still connected via the adapter
                    if (this.bluetoothAdapter.isGattConnected()) {
                        this.logger.info('GATT connection still available - heartbeat timeout may be temporary', '[UDT][BLE]');
                        // Reset the last battery heartbeat to current time to give it another chance
                        this.lastBatteryHeartbeat = Date.now();
                        this.logger.info('Reset battery heartbeat timer - will monitor for another timeout period', '[UDT][BLE]');
                        return;
                    }
                }
                this.logger.warn('Tower possibly disconnected due to battery depletion or power loss', '[UDT][BLE]');
                this.handleDisconnection();
                return;
            }
        }
        const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
        if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
            this.logger.warn('General connection timeout detected - no responses received', '[UDT][BLE]');
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
        if (!this.isConnected) {
            return false;
        }
        return this.bluetoothAdapter.isGattConnected();
    }
    getConnectionStatus() {
        const now = Date.now();
        const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
        const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
        return {
            isConnected: this.isConnected,
            isGattConnected: this.bluetoothAdapter.isGattConnected(),
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
        try {
            this.logger.info('Reading device information service...', '[UDT][BLE]');
            this.deviceInformation = await this.bluetoothAdapter.readDeviceInformation();
            // Log device information
            for (const [key, value] of Object.entries(this.deviceInformation)) {
                if (key !== 'lastUpdated' && value) {
                    this.logger.info(`Device ${key}: ${value}`, '[UDT][BLE]');
                }
            }
        }
        catch (error) {
            this.logger.debug('Device Information Service not available', '[UDT][BLE]');
        }
    }
    async cleanup() {
        this.logger.info('Cleaning up UdtBleConnection instance', '[UDT][BLE]');
        this.stopConnectionMonitoring();
        if (this.isConnected) {
            await this.disconnect();
        }
        await this.bluetoothAdapter.cleanup();
    }
}
exports.UdtBleConnection = UdtBleConnection;
//# sourceMappingURL=udtBleConnection.js.map