import { Logger } from './Logger';
export interface ConnectionCallbacks {
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    onBatteryLevelNotify: (millivolts: number) => void;
    onCalibrationComplete: () => void;
    onSkullDrop: (towerSkullCount: number) => void;
    onTowerResponse?: () => void;
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
export declare class UdtBleConnection {
    private logger;
    private callbacks;
    private responseProcessor;
    TowerDevice: any;
    txCharacteristic: any;
    rxCharacteristic: any;
    isConnected: boolean;
    isCalibrated: boolean;
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
    constructor(logger: Logger, callbacks: ConnectionCallbacks);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    onRxCharacteristicValueChanged: (event: Event) => void;
    private handleTowerStateResponse;
    private logTowerResponse;
    bleAvailabilityChange: (event: Event & {
        value: boolean;
    }) => void;
    onTowerDeviceDisconnected: (_event: Event) => void;
    private handleDisconnection;
    private startConnectionMonitoring;
    private stopConnectionMonitoring;
    private checkConnectionHealth;
    setConnectionMonitoring(enabled: boolean): void;
    configureConnectionMonitoring(frequency?: number, timeout?: number): void;
    configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number, verifyConnection?: boolean): void;
    isConnectedAndResponsive(): Promise<boolean>;
    getConnectionStatus(): ConnectionStatus;
    cleanup(): Promise<void>;
}
