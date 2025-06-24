import { type Lights, type TowerSide, type RotateCommand, type CommandPacket } from './constants';
/**
 * @title UltimateDarkTower
 * @notes
 * The UltimateDarkTower class represents a control interface for the Return To Dark Tower device.
 * It provides methods for calibrating the tower, playing sounds, controlling lights,
 * rotating the tower, and more.
 * The class also handles the Bluetooth connection to the tower device.
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
    breakSeals(seal: Array<number> | number): void;
    randomizeLevels(level?: number): void;
    connect(): Promise<void>;
    onRxCharacteristicValueChanged: (event: any) => void;
    private handleTowerStateResponse;
    private logTowerResponse;
    disconnect(): Promise<void>;
    bleAvailabilityChange(event: any): void;
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
}
export default UltimateDarkTower;
