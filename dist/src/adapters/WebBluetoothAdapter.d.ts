import { type IBluetoothAdapter } from '../udtBluetoothAdapter';
import { type DeviceInformation } from '../udtBleConnection';
/**
 * Web Bluetooth adapter implementation for browser environments.
 * Uses the Web Bluetooth API (navigator.bluetooth).
 */
export declare class WebBluetoothAdapter implements IBluetoothAdapter {
    private device;
    private txCharacteristic;
    private rxCharacteristic;
    private characteristicCallback?;
    private disconnectCallback?;
    private availabilityCallback?;
    private boundOnCharacteristicValueChanged;
    private boundOnDeviceDisconnected;
    private boundOnAvailabilityChanged;
    connect(deviceName: string, serviceUuids: string[]): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    isGattConnected(): boolean;
    writeCharacteristic(data: Uint8Array): Promise<void>;
    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void;
    onDisconnect(callback: () => void): void;
    onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void;
    readDeviceInformation(): Promise<DeviceInformation>;
    cleanup(): Promise<void>;
}
