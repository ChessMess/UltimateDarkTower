import { type IBluetoothAdapter } from '../../src/udtBluetoothAdapter';
import { type DeviceInformation } from '../../src/udtBleConnection';

/**
 * Mock Bluetooth adapter for testing.
 * Provides full control over connection behavior and allows simulating responses.
 */
export class MockBluetoothAdapter implements IBluetoothAdapter {
    // Test control flags
    connectShouldFail = false;
    disconnectShouldFail = false;
    writeShouldFail = false;
    isConnectedValue = false;
    mockDeviceInfo: DeviceInformation = {};

    // Event callbacks
    private characteristicCallback?: (data: Uint8Array) => void;
    private disconnectCallback?: () => void;
    private availabilityCallback?: (available: boolean) => void;

    // Operation tracking for test assertions
    connectCalls = 0;
    disconnectCalls = 0;
    writeCalls = 0;
    lastWrittenData?: Uint8Array;

    async connect(deviceName: string, serviceUuids: string[]): Promise<void> {
        void deviceName;
        void serviceUuids;
        this.connectCalls++;
        if (this.connectShouldFail) {
            throw new Error('Mock connection failed');
        }
        this.isConnectedValue = true;
    }

    async disconnect(): Promise<void> {
        this.disconnectCalls++;
        if (this.disconnectShouldFail) {
            throw new Error('Mock disconnection failed');
        }
        this.isConnectedValue = false;
    }

    isConnected(): boolean {
        return this.isConnectedValue;
    }

    isGattConnected(): boolean {
        return this.isConnectedValue;
    }

    async writeCharacteristic(data: Uint8Array): Promise<void> {
        this.writeCalls++;
        this.lastWrittenData = data;
        if (this.writeShouldFail) {
            throw new Error('Mock write failed');
        }
    }

    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void {
        this.characteristicCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }

    onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void {
        this.availabilityCallback = callback;
    }

    async readDeviceInformation(): Promise<DeviceInformation> {
        return this.mockDeviceInfo;
    }

    async cleanup(): Promise<void> {
        this.isConnectedValue = false;
    }

    // Test helper methods to simulate events
    simulateResponse(data: Uint8Array): void {
        if (this.characteristicCallback) {
            this.characteristicCallback(data);
        }
    }

    simulateDisconnect(): void {
        this.isConnectedValue = false;
        if (this.disconnectCallback) {
            this.disconnectCallback();
        }
    }

    simulateAvailabilityChange(available: boolean): void {
        if (this.availabilityCallback) {
            this.availabilityCallback(available);
        }
    }

    // Reset all state for clean tests
    reset(): void {
        this.connectShouldFail = false;
        this.disconnectShouldFail = false;
        this.writeShouldFail = false;
        this.isConnectedValue = false;
        this.mockDeviceInfo = {};
        this.connectCalls = 0;
        this.disconnectCalls = 0;
        this.writeCalls = 0;
        this.lastWrittenData = undefined;
        this.characteristicCallback = undefined;
        this.disconnectCallback = undefined;
        this.availabilityCallback = undefined;
    }
}
