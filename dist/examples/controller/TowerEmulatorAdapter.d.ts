import type { IBluetoothAdapter, DeviceInformation } from '../../src';
interface TowerEmulatorAdapterOptions {
    /** Called when a stateful command containing audio is written to the adapter. */
    onAudioCommand?: (sample: number, loop: boolean, volume: number) => void;
    /**
     * Called when a stateful command carries a non-zero `led_sequence` byte
     * (a `Tower.lightOverrides(N)` call). The framework strips this field from
     * tower state on every response, so the popup never sees it via the normal
     * `applyState` path — this side-channel lets the controller fire a
     * transient `playSequence(N)` on the emulator display.
     */
    onLightSequenceCommand?: (sequenceId: number) => void;
}
/**
 * A software-only Bluetooth adapter that simulates tower responses for use
 * with the Tower Emulator display window. No real BLE hardware required.
 *
 * Behavior:
 * - Stateful commands (byte 0 = 0x00): echoed back immediately as TOWER_STATE responses
 * - Calibration command (byte 0 = 4): answered with TWO responses, like real firmware — an
 *   immediate ack (so Tower.calibrate() resolves and the library arms calibration tracking),
 *   then a second TOWER_STATE emitted by completeCalibration() when the emulator popup reports
 *   its real sweep finished (or after CALIBRATION_FALLBACK_MS) — that second one fires
 *   onCalibrationComplete
 * - Other basic commands: echoes back the last known state packet
 * - Battery heartbeat: fires every 200ms so connection health monitoring stays satisfied
 */
export declare class TowerEmulatorAdapter implements IBluetoothAdapter {
    private options;
    private connected;
    private rxCallback?;
    private disconnectCallback?;
    private availabilityCallback?;
    private batteryInterval?;
    private calibrationPending;
    private calibrationFallbackTimer?;
    private lastStatePacket;
    constructor(options?: TowerEmulatorAdapterOptions);
    connect(_deviceName: string, _serviceUuids: string[]): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Emit the calibrated TOWER_STATE response that signals calibration is
     * complete. Called by the controller when the emulator popup reports its
     * visual sweep has finished (or by the fallback timer). No-op unless a
     * calibration command is currently pending, so stray calls can't inject a
     * spurious state.
     */
    completeCalibration(): void;
    private cancelCalibration;
    isConnected(): boolean;
    isGattConnected(): boolean;
    writeCharacteristic(data: Uint8Array): Promise<void>;
    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void;
    onDisconnect(callback: () => void): void;
    onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void;
    readDeviceInformation(): Promise<DeviceInformation>;
    cleanup(): Promise<void>;
    private stopBatteryHeartbeat;
    private createBatteryResponse;
    private createCalibratedStateResponse;
}
export {};
