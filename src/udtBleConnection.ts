import {
    TOWER_DEVICE_NAME,
    UART_SERVICE_UUID,
    SKULL_DROP_COUNT_POS,
    DIS_SERVICE_UUID,
} from './udtConstants';
import { Logger } from './udtLogger';
import { TowerResponseProcessor } from './udtTowerResponse';
import { getMilliVoltsFromTowerResponse, milliVoltsToPercentage } from './udtHelpers';
import { rtdt_unpack_state } from './udtTowerState';
import { type IBluetoothAdapter } from './udtBluetoothAdapter';
import { BluetoothAdapterFactory, BluetoothPlatform } from './udtBluetoothAdapterFactory';


export interface TowerEventCallbacks {
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    onBatteryLevelNotify: (millivolts: number) => void;
    onCalibrationComplete: () => void;
    onSkullDrop: (towerSkullCount: number) => void;
    onTowerResponse?: (response: Uint8Array) => void; // Optional callback for command queue response detection with response data
}

export interface DeviceInformation {
    manufacturerName?: string;
    modelNumber?: string;
    serialNumber?: string;
    hardwareRevision?: string;
    firmwareRevision?: string;
    softwareRevision?: string;
    systemId?: string;
    ieeeRegulatory?: string;
    pnpId?: string;
    lastUpdated?: Date;
}

export interface ConnectionStatus {
    isConnected: boolean;
    isGattConnected: boolean;
    lastBatteryHeartbeatMs: number;
    lastCommandResponseMs: number;
    batteryHeartbeatHealthy: boolean;
    connectionMonitoringEnabled: boolean;
    batteryHeartbeatMonitoringEnabled: boolean;
    batteryHeartbeatTimeoutMs: number;
    batteryHeartbeatVerifyConnection: boolean;
    connectionTimeoutMs: number;
}

export class UdtBleConnection {
    private logger: Logger;
    private callbacks: TowerEventCallbacks;
    private responseProcessor: TowerResponseProcessor;

    // Bluetooth adapter (platform-agnostic)
    private bluetoothAdapter: IBluetoothAdapter;

    // Connection state
    isConnected: boolean = false;
    isDisposed: boolean = false;
    performingCalibration: boolean = false;
    performingLongCommand: boolean = false;

    // Connection monitoring
    private connectionMonitorInterval: ReturnType<typeof setInterval> | null = null;
    connectionMonitorFrequency: number = 2 * 1000;
    lastSuccessfulCommand: number = 0;
    connectionTimeoutThreshold: number = 30 * 1000;
    enableConnectionMonitoring: boolean = true;

    // Battery heartbeat monitoring
    lastBatteryHeartbeat: number = 0;
    batteryHeartbeatTimeout: number = 3 * 1000;
    longTowerCommandTimeout: number = 30 * 1000;
    enableBatteryHeartbeatMonitoring: boolean = true;
    batteryHeartbeatVerifyConnection: boolean = true; // When true, verifies connection before triggering disconnection on heartbeat timeout

    // Tower state
    towerSkullDropCount: number = -1;
    lastBatteryNotification: number = 0;
    lastBatteryPercentage: string = "";
    batteryNotifyFrequency: number = 15 * 1000;
    batteryNotifyOnValueChangeOnly = false;
    batteryNotifyEnabled = true;

    // Device information
    private deviceInformation: DeviceInformation = {};

    // Logging configuration
    logTowerResponses = true;
    logTowerResponseConfig = {
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

    constructor(logger: Logger, callbacks: TowerEventCallbacks, adapter?: IBluetoothAdapter) {
        this.logger = logger;
        this.callbacks = callbacks;
        this.responseProcessor = new TowerResponseProcessor();

        // Use provided adapter or auto-detect platform
        this.bluetoothAdapter = adapter || BluetoothAdapterFactory.create(BluetoothPlatform.AUTO);

        // Set up adapter event callbacks
        this.bluetoothAdapter.onCharacteristicValueChanged((data: Uint8Array) => {
            this.onRxData(data);
        });

        this.bluetoothAdapter.onDisconnect(() => {
            this.onTowerDeviceDisconnected();
        });

        this.bluetoothAdapter.onBluetoothAvailabilityChanged((available: boolean) => {
            this.bleAvailabilityChange(available);
        });
    }

    async connect() {
        if (this.isDisposed) {
            throw new Error('UdtBleConnection instance has been disposed and cannot reconnect');
        }
        this.logger.info("Looking for Tower...", '[UDT]');
        try {
            await this.bluetoothAdapter.connect(
                TOWER_DEVICE_NAME,
                [UART_SERVICE_UUID, DIS_SERVICE_UUID]
            );

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
        } catch (error) {
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
    async writeCommand(command: Uint8Array): Promise<void> {
        return await this.bluetoothAdapter.writeCharacteristic(command);
    }

    /**
     * Processes received data from the RX characteristic (platform-agnostic).
     * Called by the adapter's onCharacteristicValueChanged callback.
     */
    private onRxData(receivedData: Uint8Array) {
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

            const millivolts = getMilliVoltsFromTowerResponse(receivedData);
            const batteryPercentage = milliVoltsToPercentage(millivolts);
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
        } else {
            // For non-battery responses, notify the command queue
            // This includes tower state responses, command acknowledgments, etc.
            if (this.callbacks.onTowerResponse) {
                this.callbacks.onTowerResponse(receivedData);
            }
        }
    }

    private handleTowerStateResponse(receivedData: Uint8Array) {
        const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];
        const state = rtdt_unpack_state(receivedData);
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
            } else {
                this.logger.info(`Skull count reset to ${dataSkullDropCount}`, '[UDT]');
            }
            this.towerSkullDropCount = dataSkullDropCount;
        }
    }

    private logTowerResponse(receivedData: Uint8Array) {
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
        } else {
            this.logger.info(logMessage, '[UDT][BLE]');
        }
    }

    private bleAvailabilityChange(available: boolean) {
        this.logger.info('Bluetooth availability changed', '[UDT][BLE]');

        if (!available && this.isConnected) {
            this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT][BLE]');
            this.handleDisconnection();
        }
    }

    private onTowerDeviceDisconnected() {
        this.logger.warn('Tower device disconnected unexpectedly', '[UDT][BLE]');
        this.handleDisconnection();
    }

    private handleDisconnection() {
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

    private startConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
        }

        this.connectionMonitorInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, this.connectionMonitorFrequency);
    }

    private stopConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
        }
    }

    private checkConnectionHealth() {
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

    setConnectionMonitoring(enabled: boolean) {
        this.enableConnectionMonitoring = enabled;
        if (enabled && this.isConnected) {
            this.startConnectionMonitoring();
        } else {
            this.stopConnectionMonitoring();
        }
    }

    configureConnectionMonitoring(frequency: number = 2000, timeout: number = 30000) {
        this.connectionMonitorFrequency = frequency;
        this.connectionTimeoutThreshold = timeout;

        if (this.enableConnectionMonitoring && this.isConnected) {
            this.startConnectionMonitoring();
        }
    }

    configureBatteryHeartbeatMonitoring(enabled: boolean = true, timeout: number = 3000, verifyConnection: boolean = true) {
        this.enableBatteryHeartbeatMonitoring = enabled;
        this.batteryHeartbeatTimeout = timeout;
        this.batteryHeartbeatVerifyConnection = verifyConnection;
    }

    async isConnectedAndResponsive(): Promise<boolean> {
        if (!this.isConnected) {
            return false;
        }

        return this.bluetoothAdapter.isGattConnected();
    }

    getConnectionStatus(): ConnectionStatus {
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

    getDeviceInformation(): DeviceInformation {
        return { ...this.deviceInformation };
    }

    private async readDeviceInformation() {
        try {
            this.logger.info('Reading device information service...', '[UDT][BLE]');
            this.deviceInformation = await this.bluetoothAdapter.readDeviceInformation();

            // Log device information
            for (const [key, value] of Object.entries(this.deviceInformation)) {
                if (key !== 'lastUpdated' && value) {
                    this.logger.info(`Device ${key}: ${value}`, '[UDT][BLE]');
                }
            }
        } catch (error) {
            this.logger.debug('Device Information Service not available', '[UDT][BLE]');
        }
    }

    async cleanup() {
        if (this.isDisposed) return;
        this.isDisposed = true;

        this.logger.info('Cleaning up UdtBleConnection instance', '[UDT][BLE]');

        this.stopConnectionMonitoring();

        if (this.isConnected) {
            await this.disconnect();
        }

        await this.bluetoothAdapter.cleanup();
    }

}
