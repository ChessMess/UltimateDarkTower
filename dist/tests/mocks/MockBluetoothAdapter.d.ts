import { type IBluetoothAdapter } from '../../src/udtBluetoothAdapter';
import { type DeviceInformation } from '../../src/udtBleConnection';
/**
 * Mock Bluetooth adapter for testing.
 * Provides full control over connection behavior and allows simulating responses.
 */
export declare class MockBluetoothAdapter implements IBluetoothAdapter {
    connectShouldFail: boolean;
    disconnectShouldFail: boolean;
    writeShouldFail: boolean;
    isConnectedValue: boolean;
    mockDeviceInfo: DeviceInformation;
    private characteristicCallback?;
    private disconnectCallback?;
    private availabilityCallback?;
    connectCalls: number;
    disconnectCalls: number;
    writeCalls: number;
    lastWrittenData?: Uint8Array;
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
    simulateResponse(data: Uint8Array): void;
    simulateDisconnect(): void;
    simulateAvailabilityChange(available: boolean): void;
    reset(): void;
}
