"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockBluetoothAdapter = void 0;
/**
 * Mock Bluetooth adapter for testing.
 * Provides full control over connection behavior and allows simulating responses.
 */
class MockBluetoothAdapter {
    constructor() {
        // Test control flags
        this.connectShouldFail = false;
        this.disconnectShouldFail = false;
        this.writeShouldFail = false;
        this.isConnectedValue = false;
        this.mockDeviceInfo = {};
        // Operation tracking for test assertions
        this.connectCalls = 0;
        this.disconnectCalls = 0;
        this.writeCalls = 0;
    }
    async connect(deviceName, serviceUuids) {
        void deviceName;
        void serviceUuids;
        this.connectCalls++;
        if (this.connectShouldFail) {
            throw new Error('Mock connection failed');
        }
        this.isConnectedValue = true;
    }
    async disconnect() {
        this.disconnectCalls++;
        if (this.disconnectShouldFail) {
            throw new Error('Mock disconnection failed');
        }
        this.isConnectedValue = false;
    }
    isConnected() {
        return this.isConnectedValue;
    }
    isGattConnected() {
        return this.isConnectedValue;
    }
    async writeCharacteristic(data) {
        this.writeCalls++;
        this.lastWrittenData = data;
        if (this.writeShouldFail) {
            throw new Error('Mock write failed');
        }
    }
    onCharacteristicValueChanged(callback) {
        this.characteristicCallback = callback;
    }
    onDisconnect(callback) {
        this.disconnectCallback = callback;
    }
    onBluetoothAvailabilityChanged(callback) {
        this.availabilityCallback = callback;
    }
    async readDeviceInformation() {
        return this.mockDeviceInfo;
    }
    async cleanup() {
        this.isConnectedValue = false;
        this.characteristicCallback = undefined;
        this.disconnectCallback = undefined;
        this.availabilityCallback = undefined;
    }
    // Test helper methods to simulate events
    simulateResponse(data) {
        if (this.characteristicCallback) {
            this.characteristicCallback(data);
        }
    }
    simulateDisconnect() {
        this.isConnectedValue = false;
        if (this.disconnectCallback) {
            this.disconnectCallback();
        }
    }
    simulateAvailabilityChange(available) {
        if (this.availabilityCallback) {
            this.availabilityCallback(available);
        }
    }
    // Reset all state for clean tests
    reset() {
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
exports.MockBluetoothAdapter = MockBluetoothAdapter;
//# sourceMappingURL=MockBluetoothAdapter.js.map