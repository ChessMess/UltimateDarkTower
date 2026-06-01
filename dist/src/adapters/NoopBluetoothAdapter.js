"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopBluetoothAdapter = void 0;
const udtBluetoothAdapter_1 = require("../udtBluetoothAdapter");
/**
 * No-op Bluetooth adapter for software-only use (BluetoothPlatform.NONE).
 *
 * Lets consumers construct UltimateDarkTower in environments without Bluetooth
 * (e.g. iOS Safari, headless rendering) when they only need software state such
 * as broken-seal tracking and never open a BLE connection. Construction is safe
 * everywhere; actually attempting to connect or write fails loudly rather than
 * hanging silently.
 */
class NoopBluetoothAdapter {
    async connect(_deviceName, _serviceUuids) {
        void _deviceName;
        void _serviceUuids;
        throw new udtBluetoothAdapter_1.BluetoothError('Bluetooth is disabled (platform: none)');
    }
    async disconnect() {
        // nothing to disconnect
    }
    isConnected() {
        return false;
    }
    isGattConnected() {
        return false;
    }
    async writeCharacteristic(_data) {
        void _data;
        throw new udtBluetoothAdapter_1.BluetoothError('Bluetooth is disabled (platform: none)');
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
        return {};
    }
    async cleanup() {
        // nothing to clean up
    }
}
exports.NoopBluetoothAdapter = NoopBluetoothAdapter;
//# sourceMappingURL=NoopBluetoothAdapter.js.map