"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeBluetoothAdapter = void 0;
const udtBluetoothAdapter_1 = require("../udtBluetoothAdapter");
const udtConstants_1 = require("../udtConstants");
// Dynamic import to avoid breaking browser builds
let noble;
try {
    if (typeof process !== 'undefined' && ((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
        noble = require('@stoprocent/noble');
    }
}
catch (_b) {
    // @stoprocent/noble not installed - will fail on adapter usage
}
/**
 * Node.js Bluetooth adapter implementation using @stoprocent/noble.
 * Noble is a singleton EventEmitter - event listeners must be carefully managed to prevent leaks.
 *
 * Install with: npm install @stoprocent/noble
 *
 * Platform requirements:
 * - macOS: Works out of the box (CoreBluetooth via XPC)
 * - Linux: Requires BlueZ (sudo apt install bluetooth bluez libbluetooth-dev)
 * - Windows: Requires Windows 10+ with BLE support
 */
class NodeBluetoothAdapter {
    constructor() {
        this.peripheral = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
        this.allCharacteristics = [];
        this.isConnectedFlag = false;
    }
    /**
     * Waits for Noble's BLE adapter to reach 'poweredOn' state.
     * Uses @stoprocent/noble's built-in waitForPoweredOnAsync().
     */
    async ensureNobleReady() {
        if (!noble) {
            throw new udtBluetoothAdapter_1.BluetoothConnectionError('@stoprocent/noble not found. Install with: npm install @stoprocent/noble');
        }
        try {
            await noble.waitForPoweredOnAsync();
        }
        catch (error) {
            throw new udtBluetoothAdapter_1.BluetoothConnectionError(`Bluetooth adapter not ready: ${error.message}`, error);
        }
    }
    async connect(deviceName, serviceUuids) {
        try {
            // Step 1: Ensure Noble's BLE adapter is powered on
            await this.ensureNobleReady();
            // Step 2: Set up Bluetooth availability monitoring
            if (this.availabilityCallback) {
                this.availabilityCallback(true);
                this.boundStateChangeHandler = (state) => {
                    if (this.availabilityCallback) {
                        this.availabilityCallback(state === 'poweredOn');
                    }
                };
                noble.on('stateChange', this.boundStateChangeHandler);
            }
            // Step 3: Normalize UUIDs for Noble (strip dashes, lowercase)
            const normalizedUuids = serviceUuids.map(u => this.normalizeUuid(u));
            // Step 4: Scan for device with timeout
            const peripheral = await this.scanForDevice(deviceName, normalizedUuids, 10000);
            this.peripheral = peripheral;
            // Step 5: Set up disconnect listener BEFORE connecting
            this.boundDisconnectHandler = () => {
                this.isConnectedFlag = false;
                if (this.disconnectCallback) {
                    this.disconnectCallback();
                }
            };
            this.peripheral.once('disconnect', this.boundDisconnectHandler);
            // Step 6: Connect to peripheral
            await this.peripheral.connectAsync();
            this.isConnectedFlag = true;
            // Step 7: Discover ALL services and characteristics at once
            // IMPORTANT: On macOS, calling discoverSomeServicesAndCharacteristicsAsync
            // multiple times causes CoreBluetooth to return ALL accumulated services
            // (not just the newly requested ones) in didDiscoverServices. Noble then
            // recreates Characteristic objects for ALL services, invalidating any
            // previously saved references. By discovering everything upfront, we
            // avoid this re-discovery problem entirely.
            const txUuid = this.normalizeUuid(udtConstants_1.UART_TX_CHARACTERISTIC_UUID);
            const rxUuid = this.normalizeUuid(udtConstants_1.UART_RX_CHARACTERISTIC_UUID);
            const { characteristics } = await this.peripheral.discoverAllServicesAndCharacteristicsAsync();
            // Save all discovered characteristics for readDeviceInformation()
            this.allCharacteristics = characteristics;
            this.txCharacteristic = characteristics.find((c) => this.normalizeUuid(c.uuid) === txUuid);
            this.rxCharacteristic = characteristics.find((c) => this.normalizeUuid(c.uuid) === rxUuid);
            if (!this.txCharacteristic || !this.rxCharacteristic) {
                throw new udtBluetoothAdapter_1.BluetoothConnectionError('TX or RX characteristic not found on device');
            }
            // Step 8: Subscribe to RX notifications
            await this.rxCharacteristic.subscribeAsync();
            // Step 9: Set up data handler for incoming notifications
            this.boundDataHandler = (data) => {
                if (this.characteristicCallback) {
                    this.characteristicCallback(new Uint8Array(data));
                }
            };
            this.rxCharacteristic.on('data', this.boundDataHandler);
        }
        catch (error) {
            await this.cleanup();
            if (error instanceof udtBluetoothAdapter_1.BluetoothDeviceNotFoundError ||
                error instanceof udtBluetoothAdapter_1.BluetoothConnectionError ||
                error instanceof udtBluetoothAdapter_1.BluetoothTimeoutError) {
                throw error;
            }
            throw new udtBluetoothAdapter_1.BluetoothConnectionError(`Connection failed: ${error.message}`, error);
        }
    }
    async disconnect() {
        if (!this.peripheral)
            return;
        try {
            // Unsubscribe from RX notifications
            if (this.rxCharacteristic) {
                if (this.boundDataHandler) {
                    this.rxCharacteristic.removeListener('data', this.boundDataHandler);
                }
                await this.rxCharacteristic.unsubscribeAsync();
            }
            // Disconnect peripheral
            await this.peripheral.disconnectAsync();
        }
        catch (_a) {
            // Ignore disconnect errors
        }
        finally {
            this.peripheral = null;
            this.txCharacteristic = null;
            this.rxCharacteristic = null;
            this.allCharacteristics = [];
            this.isConnectedFlag = false;
        }
    }
    isConnected() {
        return this.isConnectedFlag && !!this.peripheral;
    }
    isGattConnected() {
        return (this.isConnectedFlag &&
            !!this.peripheral &&
            this.peripheral.state === 'connected');
    }
    async writeCharacteristic(data) {
        if (!this.txCharacteristic) {
            throw new udtBluetoothAdapter_1.BluetoothConnectionError('TX characteristic not available');
        }
        try {
            const buffer = Buffer.from(data);
            // writeAsync(buffer, withoutResponse) — false = write with response (reliable)
            await this.txCharacteristic.writeAsync(buffer, false);
        }
        catch (error) {
            throw new udtBluetoothAdapter_1.BluetoothConnectionError(`Write failed: ${error.message}`, error);
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
        const info = {};
        if (!this.peripheral || !this.isConnectedFlag) {
            return info;
        }
        try {
            // Use characteristics discovered during connect() to avoid
            // a second discoverSomeServicesAndCharacteristicsAsync() call.
            // On macOS, re-discovery causes CoreBluetooth to return ALL
            // accumulated services, and Noble recreates characteristic objects
            // for all of them — invalidating our saved RX reference and
            // breaking notification delivery.
            const characteristics = this.allCharacteristics;
            const characteristicMap = [
                {
                    uuid: udtConstants_1.DIS_MANUFACTURER_NAME_UUID,
                    key: 'manufacturerName',
                    binary: false,
                },
                {
                    uuid: udtConstants_1.DIS_MODEL_NUMBER_UUID,
                    key: 'modelNumber',
                    binary: false,
                },
                {
                    uuid: udtConstants_1.DIS_SERIAL_NUMBER_UUID,
                    key: 'serialNumber',
                    binary: false,
                },
                {
                    uuid: udtConstants_1.DIS_HARDWARE_REVISION_UUID,
                    key: 'hardwareRevision',
                    binary: false,
                },
                {
                    uuid: udtConstants_1.DIS_FIRMWARE_REVISION_UUID,
                    key: 'firmwareRevision',
                    binary: false,
                },
                {
                    uuid: udtConstants_1.DIS_SOFTWARE_REVISION_UUID,
                    key: 'softwareRevision',
                    binary: false,
                },
                { uuid: udtConstants_1.DIS_SYSTEM_ID_UUID, key: 'systemId', binary: true },
                {
                    uuid: udtConstants_1.DIS_IEEE_REGULATORY_UUID,
                    key: 'ieeeRegulatory',
                    binary: false,
                },
                { uuid: udtConstants_1.DIS_PNP_ID_UUID, key: 'pnpId', binary: true },
            ];
            for (const { uuid, key, binary } of characteristicMap) {
                const normalizedUuid = this.normalizeUuid(uuid);
                // Noble uses short 4-char UUIDs for standard BLE characteristics
                // (e.g. "2a29" instead of "00002a2900001000800000805f9b34fb")
                const shortUuid = this.toShortUuid(uuid);
                const char = characteristics.find((c) => {
                    const cUuid = this.normalizeUuid(c.uuid);
                    return cUuid === normalizedUuid || cUuid === shortUuid;
                });
                if (!char)
                    continue;
                try {
                    const buffer = await char.readAsync();
                    if (binary) {
                        const hexValue = Array.from(new Uint8Array(buffer))
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join(':');
                        info[key] = hexValue;
                    }
                    else {
                        info[key] = buffer.toString('utf-8');
                    }
                }
                catch (_a) {
                    // Characteristic not available - skip
                }
            }
            info.lastUpdated = new Date();
        }
        catch (_b) {
            // DIS service not available
        }
        return info;
    }
    async cleanup() {
        // Remove Noble singleton event listeners
        if (noble) {
            if (this.boundStateChangeHandler) {
                noble.removeListener('stateChange', this.boundStateChangeHandler);
            }
        }
        // Remove peripheral disconnect listener
        if (this.peripheral && this.boundDisconnectHandler) {
            this.peripheral.removeListener('disconnect', this.boundDisconnectHandler);
        }
        await this.disconnect();
        this.characteristicCallback = undefined;
        this.disconnectCallback = undefined;
        this.availabilityCallback = undefined;
    }
    /**
     * Scans for a BLE device by name using Noble's event-driven discovery
     */
    async scanForDevice(deviceName, serviceUuids, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                noble.stopScanning();
                noble.removeListener('discover', onDiscover);
                reject(new udtBluetoothAdapter_1.BluetoothTimeoutError(`Device scan timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            const onDiscover = (peripheral) => {
                var _a;
                const name = (_a = peripheral.advertisement) === null || _a === void 0 ? void 0 : _a.localName;
                if (name && name.startsWith(deviceName)) {
                    clearTimeout(timeout);
                    noble.stopScanning();
                    noble.removeListener('discover', onDiscover);
                    resolve(peripheral);
                }
            };
            noble.on('discover', onDiscover);
            // Start scanning - noble accepts service UUIDs without dashes
            noble.startScanning(serviceUuids, false); // false = no duplicates
        });
    }
    /**
     * Normalizes UUID to Noble's format (lowercase, no dashes)
     */
    normalizeUuid(uuid) {
        return uuid.toLowerCase().replace(/-/g, '');
    }
    /**
     * Extracts the short 4-character UUID from a standard 128-bit BLE UUID.
     * Standard BLE UUIDs follow the pattern 0000XXXX-0000-1000-8000-00805f9b34fb
     * where XXXX is the short UUID. Noble uses this short form for standard characteristics.
     */
    toShortUuid(uuid) {
        const normalized = this.normalizeUuid(uuid);
        // Standard BLE base UUID suffix
        const baseSuffix = '00001000800000805f9b34fb';
        if (normalized.startsWith('0000') && normalized.endsWith(baseSuffix)) {
            return normalized.substring(4, 8);
        }
        return normalized;
    }
}
exports.NodeBluetoothAdapter = NodeBluetoothAdapter;
//# sourceMappingURL=NodeBluetoothAdapter.js.map