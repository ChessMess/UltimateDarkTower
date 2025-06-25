/// <reference types="node" />
import { type Lights, type TowerSide, type RotateCommand, type CommandPacket } from './constants';
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
declare class UltimateDarkTower {
    TowerDevice: any;
    txCharacteristic: any;
    rxCharacteristic: any;
    batteryNotifyFrequency: number;
    batteryNotifyOnValueChangeOnly: boolean;
    retrySendCommandCount: number;
    retrySendCommandMax: number;
    currentDrumPositions: {
        topMiddle: number;
        bottom: number;
    };
    isCalibrated: boolean;
    isConnected: boolean;
    towerSkullDropCount: number;
    performingCalibration: boolean;
    lastBatteryNotification: number;
    lastBatteryPercentage: string;
    connectionMonitorInterval: NodeJS.Timeout | null;
    connectionMonitorFrequency: number;
    lastSuccessfulCommand: number;
    connectionTimeoutThreshold: number;
    enableConnectionMonitoring: boolean;
    lastBatteryHeartbeat: number;
    batteryHeartbeatTimeout: number;
    calibrationHeartbeatTimeout: number;
    enableBatteryHeartbeatMonitoring: boolean;
    onCalibrationComplete: () => void;
    onSkullDrop: (towerSkullCount: number) => void;
    onBatteryLevelNotify: (millivolts: number) => void;
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    logDetail: boolean;
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
    calibrate(): Promise<void>;
    requestTowerState(): Promise<void>;
    playSound(soundIndex: number): Promise<void>;
    Lights(lights: Lights): Promise<void>;
    lightOverrides(light: number, soundIndex?: number): Promise<void>;
    Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void>;
    MultiCommand(rotate?: RotateCommand, lights?: Lights, soundIndex?: number): Promise<void>;
    resetTowerSkullCount(): Promise<void>;
    breakSeal(seal: Array<number> | number): Promise<void>;
    randomizeLevels(level?: number): void;
    connect(): Promise<void>;
    onRxCharacteristicValueChanged: (event: any) => void;
    private handleTowerStateResponse;
    private logTowerResponse;
    disconnect(): Promise<void>;
    bleAvailabilityChange: (event: any) => void;
    onTowerDeviceDisconnected: (event: any) => void;
    private handleDisconnection;
    private startConnectionMonitoring;
    private stopConnectionMonitoring;
    private checkConnectionHealth;
    sendTowerCommand(command: Uint8Array): Promise<void>;
    updateCommandWithCurrentDrumPositions(commandPacket: CommandPacket): void;
    createLightPacketCommand: (lights: Lights) => Uint8Array;
    createLightOverrideCommand(lightOverride: number): Uint8Array;
    createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide): Uint8Array;
    createSoundCommand(soundIndex: number): Uint8Array;
    commandToString(command: Uint8Array): Array<string>;
    commandToPacketString(command: Uint8Array): string;
    getTowerCommand(cmdValue: number): {
        cmdKey: string;
        command: any;
    };
    getMilliVoltsFromTowerReponse(command: Uint8Array): number;
    millVoltsToPercentage(mv: number): string;
    /**
     * Enable or disable connection monitoring
     * @param enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled: boolean): void;
    /**
     * Configure connection monitoring parameters
     * @param frequency - How often to check connection (milliseconds)
     * @param timeout - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency?: number, timeout?: number): void;
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param enabled - Whether to enable battery heartbeat monitoring
     * @param timeout - How long to wait for battery status before considering disconnected (milliseconds)
     */
    configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number): void;
    /**
     * Check if the tower is currently connected
     * @returns Promise<boolean> - True if connected and responsive
     */
    isConnectedAndResponsive(): Promise<boolean>;
    /**
     * Get detailed connection status including heartbeat information
     * @returns Object with connection details
     */
    getConnectionStatus(): {
        isConnected: boolean;
        isGattConnected: any;
        isCalibrated: boolean;
        lastBatteryHeartbeatMs: number;
        lastCommandResponseMs: number;
        batteryHeartbeatHealthy: boolean;
        connectionMonitoringEnabled: boolean;
        batteryHeartbeatMonitoringEnabled: boolean;
        batteryHeartbeatTimeoutMs: number;
        connectionTimeoutMs: number;
    };
    /**
     * Clean up resources and disconnect properly
     */
    cleanup(): Promise<void>;
}
export default UltimateDarkTower;
