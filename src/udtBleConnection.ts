import {
    TOWER_DEVICE_NAME,
    UART_SERVICE_UUID,
    UART_TX_CHARACTERISTIC_UUID,
    UART_RX_CHARACTERISTIC_UUID,
    SKULL_DROP_COUNT_POS,
} from './constants';
import { Logger } from './Logger';
import { TowerResponseProcessor } from './udtTowerResponse';

export interface ConnectionCallbacks {
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    onBatteryLevelNotify: (millivolts: number) => void;
    onCalibrationComplete: () => void;
    onSkullDrop: (towerSkullCount: number) => void;
}

export interface ConnectionStatus {
    isConnected: boolean;
    isGattConnected: boolean;
    isCalibrated: boolean;
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
    private callbacks: ConnectionCallbacks;
    private responseProcessor: TowerResponseProcessor;

    // BLE connection objects
    TowerDevice = null;
    txCharacteristic = null;
    rxCharacteristic = null;

    // Connection state
    isConnected: boolean = false;
    isCalibrated: boolean = false;
    performingCalibration: boolean = false;
    performingLongCommand: boolean = false;

    // Connection monitoring
    private connectionMonitorInterval: NodeJS.Timeout | null = null;
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
    lastBatteryPercentage: string;
    batteryNotifyFrequency: number = 15 * 1000;
    batteryNotifyOnValueChangeOnly = false;

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

    constructor(logger: Logger, callbacks: ConnectionCallbacks) {
        this.logger = logger;
        this.callbacks = callbacks;
        this.responseProcessor = new TowerResponseProcessor();
    }

    async connect() {
        this.logger.info("Looking for Tower...", '[UDT]');
        try {
            // @ts-ignore
            this.TowerDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: TOWER_DEVICE_NAME }],
                optionalServices: [UART_SERVICE_UUID]
            });

            if (this.TowerDevice === null) {
                this.logger.warn("Tower not found", '[UDT]');
                return
            }

            // @ts-ignore
            navigator.bluetooth.addEventListener("availabilitychanged", this.bleAvailabilityChange);

            this.logger.info("Connecting to Tower GATT Server...", '[UDT]');
            const server = await this.TowerDevice.gatt.connect();

            this.logger.info("Getting Tower Primary Service...", '[UDT]');
            const service = await server.getPrimaryService(UART_SERVICE_UUID);

            this.logger.info("Getting Tower Characteristics...", '[UDT]');
            this.txCharacteristic = await service.getCharacteristic(
                UART_TX_CHARACTERISTIC_UUID
            );

            this.rxCharacteristic = await service.getCharacteristic(
                UART_RX_CHARACTERISTIC_UUID
            );

            this.logger.info("Subscribing to Tower...", '[UDT]');
            await this.rxCharacteristic.startNotifications();
            await this.rxCharacteristic.addEventListener(
                "characteristicvaluechanged",
                this.onRxCharacteristicValueChanged
            );

            this.TowerDevice.addEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);

            this.logger.info('Tower connection complete', '[UDT]');
            this.isConnected = true;
            this.lastSuccessfulCommand = Date.now();
            this.lastBatteryHeartbeat = Date.now();

            if (this.enableConnectionMonitoring) {
                this.startConnectionMonitoring();
            }

            this.callbacks.onTowerConnect();
        } catch (error) {
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

    onRxCharacteristicValueChanged = (event: Event) => {
        this.lastSuccessfulCommand = Date.now();

        // @ts-ignore-next-line
        const target = event.target as any;
        let receivedData = new Uint8Array(target.value.byteLength);
        for (var i = 0; i < target.value.byteLength; i++) {
            receivedData[i] = target.value.getUint8(i);
        }
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);

        if (this.logTowerResponses) {
            this.logTowerResponse(receivedData);
        }

        if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
            this.handleTowerStateResponse(receivedData);
        }

        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
            this.lastBatteryHeartbeat = Date.now();

            const millivolts = this.responseProcessor.getMilliVoltsFromTowerResponse(receivedData);
            const batteryPercentage = this.responseProcessor.milliVoltsToPercentage(millivolts);
            const didBatteryLevelChange = this.lastBatteryPercentage !== batteryPercentage;
            const batteryNotifyFrequencyPassed = ((Date.now() - this.lastBatteryNotification) >= this.batteryNotifyFrequency);

            const shouldNotify = this.batteryNotifyOnValueChangeOnly ?
                didBatteryLevelChange :
                batteryNotifyFrequencyPassed;

            if (shouldNotify) {
                this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(' ')}`, '[UDT]');
                this.lastBatteryNotification = Date.now();
                this.lastBatteryPercentage = batteryPercentage;
                this.callbacks.onBatteryLevelNotify(millivolts);
            }
        }
    }

    private handleTowerStateResponse(receivedData: Uint8Array) {
        const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];

        if (this.performingCalibration) {
            this.performingCalibration = false;
            this.performingLongCommand = false;
            this.isCalibrated = true;
            this.lastBatteryHeartbeat = Date.now();
            this.callbacks.onCalibrationComplete();
            this.logger.info('Tower calibration complete', '[UDT]');
        }

        if (dataSkullDropCount !== this.towerSkullDropCount) {
            if (!!dataSkullDropCount) {
                this.callbacks.onSkullDrop(dataSkullDropCount);
                this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, '[UDT]');
            } else {
                this.logger.info(`Skull count reset to ${dataSkullDropCount}`, '[UDT]');
            }
            this.towerSkullDropCount = dataSkullDropCount;
        }
    }

    private logTowerResponse(receivedData: Uint8Array) {
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);

        if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
            return;
        }

        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
            return; // logged elsewhere
        }

        this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(' ')}`, '[UDT]');
    }

    bleAvailabilityChange = (event: Event & { value: boolean }) => {
        this.logger.info('Bluetooth availability changed', '[UDT]');
        const availability = event.value;

        if (!availability && this.isConnected) {
            this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT]');
            this.handleDisconnection();
        }
    }

    onTowerDeviceDisconnected = (_event: Event) => {
        this.logger.warn('Tower device disconnected unexpectedly', '[UDT]');
        this.handleDisconnection();
    }

    private handleDisconnection() {
        this.isConnected = false;
        this.isCalibrated = false;
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.stopConnectionMonitoring();

        this.lastBatteryHeartbeat = 0;
        this.lastSuccessfulCommand = 0;

        this.txCharacteristic = null;
        this.rxCharacteristic = null;

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
                    if (this.TowerDevice?.gatt?.connected && this.rxCharacteristic) {
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
        if (!this.isConnected || !this.TowerDevice?.gatt?.connected) {
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
        } catch (error) {
            this.logger.warn('GATT characteristics or services no longer accessible', '[UDT]');
            return false;
        }

        return true;
    }

    getConnectionStatus(): ConnectionStatus {
        const now = Date.now();
        const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
        const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;

        return {
            isConnected: this.isConnected,
            isGattConnected: this.TowerDevice?.gatt?.connected || false,
            isCalibrated: this.isCalibrated,
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