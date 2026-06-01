import { type IBluetoothAdapter } from '../udtBluetoothAdapter';
import { type DeviceInformation } from '../udtBleConnection';
/**
 * No-op Bluetooth adapter for software-only use (BluetoothPlatform.NONE).
 *
 * Lets consumers construct UltimateDarkTower in environments without Bluetooth
 * (e.g. iOS Safari, headless rendering) when they only need software state such
 * as broken-seal tracking and never open a BLE connection. Construction is safe
 * everywhere; actually attempting to connect or write fails loudly rather than
 * hanging silently.
 */
export declare class NoopBluetoothAdapter implements IBluetoothAdapter {
    private characteristicCallback?;
    private disconnectCallback?;
    private availabilityCallback?;
    connect(_deviceName: string, _serviceUuids: string[]): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    isGattConnected(): boolean;
    writeCharacteristic(_data: Uint8Array): Promise<void>;
    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void;
    onDisconnect(callback: () => void): void;
    onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void;
    readDeviceInformation(): Promise<DeviceInformation>;
    cleanup(): Promise<void>;
}
