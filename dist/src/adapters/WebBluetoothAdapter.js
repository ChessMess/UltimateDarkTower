"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebBluetoothAdapter = void 0;
const udtConstants_1 = require("../udtConstants");
const udtBluetoothAdapter_1 = require("../udtBluetoothAdapter");
/**
 * Web Bluetooth adapter implementation for browser environments.
 * Uses the Web Bluetooth API (navigator.bluetooth).
 */
class WebBluetoothAdapter {
    constructor() {
        this.device = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        // Bound event handlers for cleanup
        this.boundOnCharacteristicValueChanged = null;
        this.boundOnDeviceDisconnected = null;
        this.boundOnAvailabilityChanged = null;
    }
    async connect(deviceName, serviceUuids) {
        var _a;
        try {
            // @ts-ignore - Web Bluetooth types may not be available in all environments
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: deviceName }],
                optionalServices: serviceUuids
            });
            if (this.device === null) {
                throw new udtBluetoothAdapter_1.BluetoothDeviceNotFoundError('Tower not found');
            }
            // Set up disconnect listener
            this.boundOnDeviceDisconnected = () => {
                if (this.disconnectCallback) {
                    this.disconnectCallback();
                }
            };
            this.device.addEventListener('gattserverdisconnected', this.boundOnDeviceDisconnected);
            // Set up Bluetooth availability monitoring
            this.boundOnAvailabilityChanged = (event) => {
                if (this.availabilityCallback) {
                    this.availabilityCallback(event.value);
                }
            };
            // @ts-ignore
            if (navigator.bluetooth) {
                // @ts-ignore
                navigator.bluetooth.addEventListener('availabilitychanged', this.boundOnAvailabilityChanged);
            }
            // Connect to GATT server
            const server = await this.device.gatt.connect();
            // Get UART service
            const service = await server.getPrimaryService(udtConstants_1.UART_SERVICE_UUID);
            // Get characteristics
            this.txCharacteristic = await service.getCharacteristic(udtConstants_1.UART_TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(udtConstants_1.UART_RX_CHARACTERISTIC_UUID);
            // Set up RX notifications
            await this.rxCharacteristic.startNotifications();
            this.boundOnCharacteristicValueChanged = (event) => {
                const target = event.target;
                const receivedData = new Uint8Array(target.value.byteLength);
                for (let i = 0; i < target.value.byteLength; i++) {
                    receivedData[i] = target.value.getUint8(i);
                }
                if (this.characteristicCallback) {
                    this.characteristicCallback(receivedData);
                }
            };
            await this.rxCharacteristic.addEventListener('characteristicvaluechanged', this.boundOnCharacteristicValueChanged);
        }
        catch (error) {
            // Re-throw our own error types
            if (error instanceof udtBluetoothAdapter_1.BluetoothDeviceNotFoundError ||
                error instanceof udtBluetoothAdapter_1.BluetoothUserCancelledError ||
                error instanceof udtBluetoothAdapter_1.BluetoothConnectionError) {
                throw error;
            }
            const errorMsg = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error);
            if (errorMsg.includes('User cancelled')) {
                throw new udtBluetoothAdapter_1.BluetoothUserCancelledError('User cancelled device selection', error);
            }
            if (errorMsg.includes('not found') || (error === null || error === void 0 ? void 0 : error.name) === 'NotFoundError') {
                throw new udtBluetoothAdapter_1.BluetoothDeviceNotFoundError('Device not found', error);
            }
            throw new udtBluetoothAdapter_1.BluetoothConnectionError(`Failed to connect: ${errorMsg}`, error);
        }
    }
    async disconnect() {
        if (!this.device) {
            return;
        }
        if (this.device.gatt.connected) {
            // Remove event listeners before disconnecting
            if (this.boundOnDeviceDisconnected) {
                this.device.removeEventListener('gattserverdisconnected', this.boundOnDeviceDisconnected);
            }
            await this.device.gatt.disconnect();
        }
        this.device = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
    }
    isConnected() {
        return !!this.device;
    }
    isGattConnected() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.device) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected) !== null && _c !== void 0 ? _c : false;
    }
    async writeCharacteristic(data) {
        if (!this.txCharacteristic) {
            throw new udtBluetoothAdapter_1.BluetoothConnectionError('TX characteristic not available');
        }
        await this.txCharacteristic.writeValue(data);
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
        var _a, _b;
        const info = {};
        if (!((_b = (_a = this.device) === null || _a === void 0 ? void 0 : _a.gatt) === null || _b === void 0 ? void 0 : _b.connected)) {
            return info;
        }
        try {
            const disService = await this.device.gatt.getPrimaryService(udtConstants_1.DIS_SERVICE_UUID);
            const characteristicMap = [
                { uuid: udtConstants_1.DIS_MANUFACTURER_NAME_UUID, key: 'manufacturerName', binary: false },
                { uuid: udtConstants_1.DIS_MODEL_NUMBER_UUID, key: 'modelNumber', binary: false },
                { uuid: udtConstants_1.DIS_SERIAL_NUMBER_UUID, key: 'serialNumber', binary: false },
                { uuid: udtConstants_1.DIS_HARDWARE_REVISION_UUID, key: 'hardwareRevision', binary: false },
                { uuid: udtConstants_1.DIS_FIRMWARE_REVISION_UUID, key: 'firmwareRevision', binary: false },
                { uuid: udtConstants_1.DIS_SOFTWARE_REVISION_UUID, key: 'softwareRevision', binary: false },
                { uuid: udtConstants_1.DIS_SYSTEM_ID_UUID, key: 'systemId', binary: true },
                { uuid: udtConstants_1.DIS_IEEE_REGULATORY_UUID, key: 'ieeeRegulatory', binary: false },
                { uuid: udtConstants_1.DIS_PNP_ID_UUID, key: 'pnpId', binary: true },
            ];
            for (const { uuid, key, binary } of characteristicMap) {
                try {
                    const characteristic = await disService.getCharacteristic(uuid);
                    const value = await characteristic.readValue();
                    if (binary) {
                        const hexValue = Array.from(new Uint8Array(value.buffer))
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join(':');
                        info[key] = hexValue;
                    }
                    else {
                        info[key] = new TextDecoder().decode(value);
                    }
                }
                catch (_c) {
                    // Characteristic not available - skip
                }
            }
            info.lastUpdated = new Date();
        }
        catch (_d) {
            // DIS service not available
        }
        return info;
    }
    async cleanup() {
        // Remove Bluetooth availability listener
        // @ts-ignore
        if (navigator.bluetooth && this.boundOnAvailabilityChanged) {
            // @ts-ignore
            navigator.bluetooth.removeEventListener('availabilitychanged', this.boundOnAvailabilityChanged);
        }
        if (this.device && this.boundOnDeviceDisconnected) {
            this.device.removeEventListener('gattserverdisconnected', this.boundOnDeviceDisconnected);
        }
        if (this.isConnected()) {
            await this.disconnect();
        }
    }
}
exports.WebBluetoothAdapter = WebBluetoothAdapter;
//# sourceMappingURL=WebBluetoothAdapter.js.map