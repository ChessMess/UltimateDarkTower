"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtBleConnection = void 0;
const udtConstants_1 = require("./udtConstants");
const udtTowerResponse_1 = require("./udtTowerResponse");
const udtHelpers_1 = require("./udtHelpers");
const udtTowerState_1 = require("./udtTowerState");
const udtBluetoothAdapterFactory_1 = require("./udtBluetoothAdapterFactory");
class UdtBleConnection {
    constructor(logger, callbacks, adapter, recorder) {
        this.recorder = null;
        // Snapshot providers wired by UltimateDarkTower so the recorder can capture
        // higher-level state (command queue, tower state, broken seals) at the
        // moment a disconnect cause fires.
        this.snapshotProviders = null;
        // Bluetooth adapter (platform-agnostic).
        // Null until an adapter is provided or lazily created on first connect() —
        // construction never triggers platform detection, so creating an
        // UltimateDarkTower in a non-Bluetooth environment (e.g. iOS Safari) does
        // not throw. The detection error, if any, surfaces at connect() time.
        this.bluetoothAdapter = null;
        // Connection state
        this.isConnected = false;
        this.isDisposed = false;
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
        this.lastBatteryLog = 0;
        this.lastBatteryPercentage = "";
        this.batteryLogFrequency = 15 * 1000;
        this.batteryLogOnChangeOnly = false;
        this.batteryLogEnabled = true;
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
        this.recorder = recorder !== null && recorder !== void 0 ? recorder : null;
        // If an explicit adapter was provided, wire it up now. Otherwise defer
        // platform detection/creation until connect() so construction never
        // throws in environments without Bluetooth.
        if (adapter) {
            this.bluetoothAdapter = adapter;
            this.wireAdapterCallbacks(adapter);
        }
    }
    /**
     * Wires this connection's internal handlers onto a Bluetooth adapter.
     * Called when an adapter is supplied at construction, or when one is
     * lazily created on first connect().
     */
    wireAdapterCallbacks(adapter) {
        adapter.onCharacteristicValueChanged((data) => {
            this.onRxData(data);
        });
        adapter.onDisconnect(() => {
            this.onTowerDeviceDisconnected();
        });
        adapter.onBluetoothAvailabilityChanged((available) => {
            this.bleAvailabilityChange(available);
        });
    }
    /**
     * Returns the Bluetooth adapter, lazily creating one via platform
     * auto-detection on first use. Platform-detection errors (e.g. no Web
     * Bluetooth on iOS) surface here, at connect time, rather than at
     * construction.
     */
    ensureAdapter() {
        if (!this.bluetoothAdapter) {
            const adapter = udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.create(udtBluetoothAdapterFactory_1.BluetoothPlatform.AUTO);
            this.bluetoothAdapter = adapter;
            this.wireAdapterCallbacks(adapter);
        }
        return this.bluetoothAdapter;
    }
    setDiagnosticsSnapshotProviders(providers) {
        this.snapshotProviders = providers;
    }
    /**
     * Record a disconnect incident with the recorder. Public so higher layers
     * (e.g. UltimateDarkTower's beforeunload handler) can synthesize causes
     * like 'page_unload' that aren't tied to a specific BLE detection path.
     */
    recordIncidentPublic(cause) {
        return this.recordIncident(cause);
    }
    recordIncident(cause) {
        var _a, _b, _c, _d, _e, _f;
        if (!this.recorder || !this.recorder.enabled)
            return null;
        const queueSnapshot = (_b = (_a = this.snapshotProviders) === null || _a === void 0 ? void 0 : _a.commandQueue()) !== null && _b !== void 0 ? _b : {
            queueLength: 0, isProcessing: false, currentCommand: null
        };
        const towerState = ((_d = (_c = this.snapshotProviders) === null || _c === void 0 ? void 0 : _c.towerState()) !== null && _d !== void 0 ? _d : null);
        const brokenSeals = (_f = (_e = this.snapshotProviders) === null || _e === void 0 ? void 0 : _e.brokenSeals()) !== null && _f !== void 0 ? _f : [];
        return this.recorder.recordIncident({
            cause,
            connectionStatus: this.getConnectionStatus(),
            deviceInformation: this.getDeviceInformation(),
            commandQueue: queueSnapshot,
            towerState,
            brokenSeals,
        });
    }
    async connect() {
        var _a;
        if (this.isDisposed) {
            throw new Error('UdtBleConnection instance has been disposed and cannot reconnect');
        }
        this.logger.info("Looking for Tower...", '[UDT]');
        try {
            const adapter = this.ensureAdapter();
            await adapter.connect(udtConstants_1.TOWER_DEVICE_NAME, [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID]);
            this.logger.info('Tower connection complete', '[UDT][BLE]');
            this.isConnected = true;
            this.lastSuccessfulCommand = Date.now();
            this.lastBatteryHeartbeat = Date.now();
            (_a = this.recorder) === null || _a === void 0 ? void 0 : _a.beginSession();
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
            throw error;
        }
    }
    async disconnect() {
        this.stopConnectionMonitoring();
        if (this.isConnected) {
            this.recordIncident('user_initiated');
        }
        const adapter = this.bluetoothAdapter;
        if (adapter === null || adapter === void 0 ? void 0 : adapter.isConnected()) {
            await adapter.disconnect();
            this.logger.info("Tower disconnected", '[UDT]');
        }
        this.handleDisconnection();
    }
    /**
     * Writes a command to the tower via the Bluetooth adapter.
     * Used by UdtTowerCommands instead of direct characteristic access.
     */
    async writeCommand(command) {
        var _a;
        const adapter = this.bluetoothAdapter;
        if (!adapter) {
            throw new Error('Cannot write command: not connected (no Bluetooth adapter)');
        }
        (_a = this.recorder) === null || _a === void 0 ? void 0 : _a.recordCommandPayload('cmd_sent', command, { len: command.length });
        return await adapter.writeCharacteristic(command);
    }
    /**
     * Processes received data from the RX characteristic (platform-agnostic).
     * Called by the adapter's onCharacteristicValueChanged callback.
     */
    onRxData(receivedData) {
        var _a, _b;
        this.lastSuccessfulCommand = Date.now();
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
        const isBattery = this.responseProcessor.isBatteryResponse(cmdKey);
        if (((_a = this.recorder) === null || _a === void 0 ? void 0 : _a.enabled) && !isBattery) {
            this.recorder.recordCommandPayload('cmd_response', receivedData, { cmdKey, len: receivedData.length });
        }
        const shouldLogCommand = this.logTowerResponses &&
            this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) &&
            !isBattery;
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
            (_b = this.recorder) === null || _b === void 0 ? void 0 : _b.recordBattery(millivolts, (0, udtHelpers_1.milliVoltsToPercentageNumber)(millivolts));
            const didBatteryLevelChange = this.lastBatteryPercentage !== "" && this.lastBatteryPercentage !== batteryPercentage;
            const batteryLogFrequencyPassed = ((Date.now() - this.lastBatteryLog) >= this.batteryLogFrequency);
            const shouldLog = this.batteryLogEnabled && (this.batteryLogOnChangeOnly ?
                (didBatteryLevelChange || this.lastBatteryPercentage === "") :
                batteryLogFrequencyPassed);
            if (shouldLog) {
                this.logger.info(`${this.responseProcessor.commandToString(receivedData).join(' ')}`, '[UDT][BLE]');
                this.lastBatteryLog = Date.now();
                this.lastBatteryPercentage = batteryPercentage;
            }
            // Always notify so internal state and UI stay current
            this.callbacks.onBatteryLevelNotify(millivolts);
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
        var _a, _b, _c;
        const dataSkullDropCount = receivedData[udtConstants_1.SKULL_DROP_COUNT_POS];
        const state = (0, udtTowerState_1.rtdt_unpack_state)(receivedData);
        this.logger.debug(`Tower State: ${JSON.stringify(state)} `, '[UDT][BLE]');
        (_a = this.recorder) === null || _a === void 0 ? void 0 : _a.recordEvent('tower_state_response');
        if (this.performingCalibration) {
            this.performingCalibration = false;
            this.performingLongCommand = false;
            this.lastBatteryHeartbeat = Date.now();
            this.callbacks.onCalibrationComplete();
            this.logger.info('Tower calibration complete', '[UDT]');
            (_b = this.recorder) === null || _b === void 0 ? void 0 : _b.recordEvent('calibration_complete');
        }
        if (dataSkullDropCount !== this.towerSkullDropCount) {
            if (dataSkullDropCount) {
                this.callbacks.onSkullDrop(dataSkullDropCount);
                this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, '[UDT]');
                (_c = this.recorder) === null || _c === void 0 ? void 0 : _c.recordEvent('skull_drop', { count: dataSkullDropCount });
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
            this.recordIncident('bt_unavailable');
            this.handleDisconnection();
        }
    }
    onTowerDeviceDisconnected() {
        this.logger.warn('Tower device disconnected unexpectedly', '[UDT][BLE]');
        if (this.isConnected) {
            this.recordIncident('adapter_event');
        }
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
        var _a, _b, _c, _d, _e;
        if (!this.isConnected) {
            return;
        }
        if (!((_b = (_a = this.bluetoothAdapter) === null || _a === void 0 ? void 0 : _a.isGattConnected()) !== null && _b !== void 0 ? _b : false)) {
            this.logger.warn('GATT connection lost detected during health check', '[UDT][BLE]');
            this.recordIncident('gatt_health_check');
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
                    if ((_d = (_c = this.bluetoothAdapter) === null || _c === void 0 ? void 0 : _c.isGattConnected()) !== null && _d !== void 0 ? _d : false) {
                        this.logger.info('GATT connection still available - heartbeat timeout may be temporary', '[UDT][BLE]');
                        // Near-miss: the heartbeat went late but the GATT is still up. This is a
                        // strong signal worth recording for diagnostics — repeated near-misses
                        // before a real drop are the smoking gun.
                        (_e = this.recorder) === null || _e === void 0 ? void 0 : _e.recordEvent('heartbeat_late', {
                            sinceMs: timeSinceLastBatteryHeartbeat,
                            threshold: timeoutThreshold,
                        });
                        // Reset the last battery heartbeat to current time to give it another chance
                        this.lastBatteryHeartbeat = Date.now();
                        this.logger.info('Reset battery heartbeat timer - will monitor for another timeout period', '[UDT][BLE]');
                        return;
                    }
                }
                this.logger.warn('Tower possibly disconnected due to battery depletion or power loss', '[UDT][BLE]');
                this.recordIncident('heartbeat_timeout');
                this.handleDisconnection();
                return;
            }
        }
        const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
        if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
            this.logger.warn('General connection timeout detected - no responses received', '[UDT][BLE]');
            this.recordIncident('response_timeout');
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
        if (!this.isConnected) {
            return false;
        }
        return (_b = (_a = this.bluetoothAdapter) === null || _a === void 0 ? void 0 : _a.isGattConnected()) !== null && _b !== void 0 ? _b : false;
    }
    getConnectionStatus() {
        var _a, _b;
        const now = Date.now();
        const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
        const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
        return {
            isConnected: this.isConnected,
            isGattConnected: (_b = (_a = this.bluetoothAdapter) === null || _a === void 0 ? void 0 : _a.isGattConnected()) !== null && _b !== void 0 ? _b : false,
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
        const adapter = this.bluetoothAdapter;
        if (!adapter)
            return;
        try {
            this.logger.info('Reading device information service...', '[UDT][BLE]');
            this.deviceInformation = await adapter.readDeviceInformation();
            // Log device information
            for (const [key, value] of Object.entries(this.deviceInformation)) {
                if (key !== 'lastUpdated' && value) {
                    this.logger.info(`Device ${key}: ${value}`, '[UDT][BLE]');
                }
            }
        }
        catch (_a) {
            this.logger.debug('Device Information Service not available', '[UDT][BLE]');
        }
    }
    async cleanup() {
        var _a;
        if (this.isDisposed)
            return;
        this.isDisposed = true;
        this.logger.info('Cleaning up UdtBleConnection instance', '[UDT][BLE]');
        this.stopConnectionMonitoring();
        if (this.isConnected) {
            await this.disconnect();
        }
        await ((_a = this.bluetoothAdapter) === null || _a === void 0 ? void 0 : _a.cleanup());
    }
}
exports.UdtBleConnection = UdtBleConnection;
//# sourceMappingURL=udtBleConnection.js.map