import type { IBluetoothAdapter, DeviceInformation } from '../../src';
interface TowerEmulatorAdapterOptions {
    /** Called when a stateful command containing audio is written to the adapter. */
    onAudioCommand?: (sample: number, loop: boolean, volume: number) => void;
}
/**
 * A software-only Bluetooth adapter that simulates tower responses for use
 * with the Tower Emulator display window. No real BLE hardware required.
 *
 * Behavior:
 * - Stateful commands (byte 0 = 0x00): echoed back immediately as TOWER_STATE responses
 * - Calibration command (byte 0 = 4): after 1.5s, responds with all 3 drums calibrated
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
    private lastStatePacket;
    constructor(options?: TowerEmulatorAdapterOptions);
    connect(_deviceName: string, _serviceUuids: string[]): Promise<void>;
    disconnect(): Promise<void>;
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
