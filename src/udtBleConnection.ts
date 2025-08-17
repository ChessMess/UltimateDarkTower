import {
    TOWER_DEVICE_NAME,
    UART_SERVICE_UUID,
    UART_TX_CHARACTERISTIC_UUID,
    UART_RX_CHARACTERISTIC_UUID,
    SKULL_DROP_COUNT_POS,
    DIS_SERVICE_UUID,
    DIS_MANUFACTURER_NAME_UUID,
    DIS_MODEL_NUMBER_UUID,
    DIS_SERIAL_NUMBER_UUID,
    DIS_HARDWARE_REVISION_UUID,
    DIS_FIRMWARE_REVISION_UUID,
    DIS_SOFTWARE_REVISION_UUID,
    DIS_SYSTEM_ID_UUID,
    DIS_IEEE_REGULATORY_UUID,
    DIS_PNP_ID_UUID,
} from './udtConstants';
import { Logger } from './udtLogger';
import { TowerResponseProcessor } from './udtTowerResponse';
import { getMilliVoltsFromTowerResponse, milliVoltsToPercentage } from './udtHelpers';
import { rtdt_unpack_state } from './udtTowerState'


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

    // BLE connection objects
    TowerDevice = null;
    txCharacteristic = null;
    rxCharacteristic = null;

    // Connection state
    isConnected: boolean = false;
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

    constructor(logger: Logger, callbacks: TowerEventCallbacks) {
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
                optionalServices: [UART_SERVICE_UUID, DIS_SERVICE_UUID]
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

        const shouldLogCommand = this.logTowerResponses &&
            this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) &&
            (!this.responseProcessor.isBatteryResponse(cmdKey) || this.batteryNotifyEnabled);

        if (shouldLogCommand) {
            this.logger.info(`${cmdKey}`, '[UDT][BLE][RCVD]');
        }

        if (this.logTowerResponses) {
            this.logTowerResponse(receivedData);
        }

        if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
            this.handleTowerStateResponse(receivedData);
        }

        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
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

    bleAvailabilityChange = (event: Event & { value: boolean }) => {
        this.logger.info('Bluetooth availability changed', '[UDT][BLE]');
        const availability = event.value;

        if (!availability && this.isConnected) {
            this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT][BLE]');
            this.handleDisconnection();
        }
    }

    onTowerDeviceDisconnected = (event: Event) => {
        this.logger.warn(`Tower device disconnected unexpectedly: ${event.type}`, '[UDT][BLE]');
        this.handleDisconnection();
    }

    private handleDisconnection() {
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

                    // Check if GATT is still connected and characteristics are available
                    if (this.TowerDevice?.gatt?.connected && this.rxCharacteristic) {
                        this.logger.info('GATT connection and characteristics still available - heartbeat timeout may be temporary', '[UDT][BLE]');

                        // Reset the last battery heartbeat to current time to give it another chance
                        // This prevents repeated false disconnections while the tower is still actually connected
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
            this.logger.warn('GATT characteristics or services no longer accessible', '[UDT][BLE]');
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
        if (!this.TowerDevice?.gatt?.connected) {
            this.logger.warn('Cannot read device information - not connected', '[UDT][BLE]');
            return;
        }

        try {
            this.logger.info('Reading device information service...', '[UDT][BLE]');
            const disService = await this.TowerDevice.gatt.getPrimaryService(DIS_SERVICE_UUID);

            // Reset device information object
            this.deviceInformation = {};

            const characteristicMap = [
                { uuid: DIS_MANUFACTURER_NAME_UUID, name: 'Manufacturer Name', key: 'manufacturerName', logIfMissing: true },
                { uuid: DIS_MODEL_NUMBER_UUID, name: 'Model Number', key: 'modelNumber', logIfMissing: true },
                { uuid: DIS_SERIAL_NUMBER_UUID, name: 'Serial Number', key: 'serialNumber', logIfMissing: false },
                { uuid: DIS_HARDWARE_REVISION_UUID, name: 'Hardware Revision', key: 'hardwareRevision', logIfMissing: true },
                { uuid: DIS_FIRMWARE_REVISION_UUID, name: 'Firmware Revision', key: 'firmwareRevision', logIfMissing: true },
                { uuid: DIS_SOFTWARE_REVISION_UUID, name: 'Software Revision', key: 'softwareRevision', logIfMissing: true },
                { uuid: DIS_SYSTEM_ID_UUID, name: 'System ID', key: 'systemId', logIfMissing: false },
                { uuid: DIS_IEEE_REGULATORY_UUID, name: 'IEEE Regulatory', key: 'ieeeRegulatory', logIfMissing: false },
                { uuid: DIS_PNP_ID_UUID, name: 'PnP ID', key: 'pnpId', logIfMissing: false },
            ];

            for (const { uuid, name, key, logIfMissing } of characteristicMap) {
                try {
                    const characteristic = await disService.getCharacteristic(uuid);
                    const value = await characteristic.readValue();

                    if (uuid === DIS_SYSTEM_ID_UUID || uuid === DIS_PNP_ID_UUID) {
                        // These are binary data, convert to hex string
                        const hexValue = Array.from(new Uint8Array(value.buffer))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join(':');
                        this.logger.info(`Device ${name}: ${hexValue}`, '[UDT][BLE]');
                        (this.deviceInformation as any)[key] = hexValue;
                    } else {
                        // Text characteristics
                        const textValue = new TextDecoder().decode(value);
                        this.logger.info(`Device ${name}: ${textValue}`, '[UDT][BLE]');
                        (this.deviceInformation as any)[key] = textValue;
                    }
                } catch (error) {
                    if (logIfMissing) {
                        this.logger.debug(`Device ${name} characteristic not available`, '[UDT][BLE]');
                    }
                }
            }

            // Set timestamp when device information was last read
            this.deviceInformation.lastUpdated = new Date();
        } catch (error) {
            this.logger.debug('Device Information Service not available', '[UDT][BLE]');
        }
    }

    async cleanup() {
        this.logger.info('Cleaning up UdtBleConnection instance', '[UDT][BLE]');

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