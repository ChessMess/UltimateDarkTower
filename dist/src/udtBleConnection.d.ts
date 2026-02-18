import { Logger } from './udtLogger';
import { type IBluetoothAdapter } from './udtBluetoothAdapter';
export interface TowerEventCallbacks {
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    onBatteryLevelNotify: (millivolts: number) => void;
    onCalibrationComplete: () => void;
    onSkullDrop: (towerSkullCount: number) => void;
    onTowerResponse?: (response: Uint8Array) => void;
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
export declare class UdtBleConnection {
    private logger;
    private callbacks;
    private responseProcessor;
    private bluetoothAdapter;
    isConnected: boolean;
    performingCalibration: boolean;
    performingLongCommand: boolean;
    private connectionMonitorInterval;
    connectionMonitorFrequency: number;
    lastSuccessfulCommand: number;
    connectionTimeoutThreshold: number;
    enableConnectionMonitoring: boolean;
    lastBatteryHeartbeat: number;
    batteryHeartbeatTimeout: number;
    longTowerCommandTimeout: number;
    enableBatteryHeartbeatMonitoring: boolean;
    batteryHeartbeatVerifyConnection: boolean;
    towerSkullDropCount: number;
    lastBatteryNotification: number;
    lastBatteryPercentage: string;
    batteryNotifyFrequency: number;
    batteryNotifyOnValueChangeOnly: boolean;
    batteryNotifyEnabled: boolean;
    private deviceInformation;
    logTowerResponses: boolean;
    logTowerResponseConfig: {
        TOWER_STATE: boolean;
        INVALID_STATE: boolean;
        HARDWARE_FAILURE: boolean;
        MECH_JIGGLE_TRIGGERED: boolean;
        MECH_UNEXPECTED_TRIGGER: boolean;
        MECH_DURATION: boolean;
        DIFFERENTIAL_READINGS: boolean;
        BATTERY_READING: boolean;
        CALIBRATION_FINISHED: boolean;
        LOG_ALL: boolean;
    };
    constructor(logger: Logger, callbacks: TowerEventCallbacks, adapter?: IBluetoothAdapter);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Writes a command to the tower via the Bluetooth adapter.
     * Used by UdtTowerCommands instead of direct characteristic access.
     */
    writeCommand(command: Uint8Array): Promise<void>;
    /**
     * Processes received data from the RX characteristic (platform-agnostic).
     * Called by the adapter's onCharacteristicValueChanged callback.
     */
    private onRxData;
    private handleTowerStateResponse;
    private logTowerResponse;
    private bleAvailabilityChange;
    private onTowerDeviceDisconnected;
    private handleDisconnection;
    private startConnectionMonitoring;
    private stopConnectionMonitoring;
    private checkConnectionHealth;
    setConnectionMonitoring(enabled: boolean): void;
    configureConnectionMonitoring(frequency?: number, timeout?: number): void;
    configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number, verifyConnection?: boolean): void;
    isConnectedAndResponsive(): Promise<boolean>;
    getConnectionStatus(): ConnectionStatus;
    getDeviceInformation(): DeviceInformation;
    private readDeviceInformation;
    cleanup(): Promise<void>;
}
