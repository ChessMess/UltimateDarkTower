import {
    type IBluetoothAdapter,
    BluetoothConnectionError,
    BluetoothDeviceNotFoundError,
    BluetoothTimeoutError,
} from '../udtBluetoothAdapter';
import {
    UART_TX_CHARACTERISTIC_UUID,
    UART_RX_CHARACTERISTIC_UUID,
    DIS_MANUFACTURER_NAME_UUID,
    DIS_MODEL_NUMBER_UUID,
    DIS_SERIAL_NUMBER_UUID,
    DIS_HARDWARE_REVISION_UUID,
    DIS_FIRMWARE_REVISION_UUID,
    DIS_SOFTWARE_REVISION_UUID,
    DIS_SYSTEM_ID_UUID,
    DIS_IEEE_REGULATORY_UUID,
    DIS_PNP_ID_UUID,
} from '../udtConstants';
import { type DeviceInformation } from '../udtBleConnection';

// Dynamic import to avoid breaking browser builds
let noble: any;
try {
    if (typeof process !== 'undefined' && process.versions?.node) {
        noble = require('@stoprocent/noble');
    }
} catch {
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
export class NodeBluetoothAdapter implements IBluetoothAdapter {
    private peripheral: any = null;
    private txCharacteristic: any = null;
    private rxCharacteristic: any = null;
    private allCharacteristics: any[] = [];

    private characteristicCallback?: (data: Uint8Array) => void;
    private disconnectCallback?: () => void;
    private availabilityCallback?: (available: boolean) => void;

    // Bound event handlers (stored for cleanup/removal from the noble singleton)
    private boundStateChangeHandler?: (state: string) => void;
    private boundDataHandler?: (data: Buffer) => void;
    private boundDisconnectHandler?: () => void;

    private isConnectedFlag = false;

    /**
     * Waits for Noble's BLE adapter to reach 'poweredOn' state.
     * Uses @stoprocent/noble's built-in waitForPoweredOnAsync().
     */
    private async ensureNobleReady(): Promise<void> {
        if (!noble) {
            throw new BluetoothConnectionError(
                '@stoprocent/noble not found. Install with: npm install @stoprocent/noble'
            );
        }

        try {
            await noble.waitForPoweredOnAsync();
        } catch (error: any) {
            throw new BluetoothConnectionError(
                `Bluetooth adapter not ready: ${error.message}`,
                error
            );
        }
    }

    async connect(deviceName: string, serviceUuids: string[]): Promise<void> {
        try {
            // Step 1: Ensure Noble's BLE adapter is powered on
            await this.ensureNobleReady();

            // Step 2: Set up Bluetooth availability monitoring
            if (this.availabilityCallback) {
                this.availabilityCallback(true);
                this.boundStateChangeHandler = (state: string) => {
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
            const txUuid = this.normalizeUuid(UART_TX_CHARACTERISTIC_UUID);
            const rxUuid = this.normalizeUuid(UART_RX_CHARACTERISTIC_UUID);

            const { characteristics } =
                await this.peripheral.discoverAllServicesAndCharacteristicsAsync();

            // Save all discovered characteristics for readDeviceInformation()
            this.allCharacteristics = characteristics;

            this.txCharacteristic = characteristics.find(
                (c: any) => this.normalizeUuid(c.uuid) === txUuid
            );
            this.rxCharacteristic = characteristics.find(
                (c: any) => this.normalizeUuid(c.uuid) === rxUuid
            );

            if (!this.txCharacteristic || !this.rxCharacteristic) {
                throw new BluetoothConnectionError(
                    'TX or RX characteristic not found on device'
                );
            }

            // Step 8: Subscribe to RX notifications
            await this.rxCharacteristic.subscribeAsync();

            // Step 9: Set up data handler for incoming notifications
            this.boundDataHandler = (data: Buffer) => {
                if (this.characteristicCallback) {
                    this.characteristicCallback(new Uint8Array(data));
                }
            };
            this.rxCharacteristic.on('data', this.boundDataHandler);

        } catch (error: any) {
            await this.cleanup();
            if (
                error instanceof BluetoothDeviceNotFoundError ||
                error instanceof BluetoothConnectionError ||
                error instanceof BluetoothTimeoutError
            ) {
                throw error;
            }
            throw new BluetoothConnectionError(
                `Connection failed: ${error.message}`,
                error
            );
        }
    }

    async disconnect(): Promise<void> {
        if (!this.peripheral) return;

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
        } catch {
            // Ignore disconnect errors
        } finally {
            this.peripheral = null;
            this.txCharacteristic = null;
            this.rxCharacteristic = null;
            this.allCharacteristics = [];
            this.isConnectedFlag = false;
        }
    }

    isConnected(): boolean {
        return this.isConnectedFlag && !!this.peripheral;
    }

    isGattConnected(): boolean {
        return (
            this.isConnectedFlag &&
            !!this.peripheral &&
            this.peripheral.state === 'connected'
        );
    }

    async writeCharacteristic(data: Uint8Array): Promise<void> {
        if (!this.txCharacteristic) {
            throw new BluetoothConnectionError('TX characteristic not available');
        }
        try {
            const buffer = Buffer.from(data);
            // writeAsync(buffer, withoutResponse) — false = write with response (reliable)
            await this.txCharacteristic.writeAsync(buffer, false);
        } catch (error: any) {
            throw new BluetoothConnectionError(
                `Write failed: ${error.message}`,
                error
            );
        }
    }

    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void {
        this.characteristicCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }

    onBluetoothAvailabilityChanged(
        callback: (available: boolean) => void
    ): void {
        this.availabilityCallback = callback;
    }

    async readDeviceInformation(): Promise<DeviceInformation> {
        const info: DeviceInformation = {};

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
                    uuid: DIS_MANUFACTURER_NAME_UUID,
                    key: 'manufacturerName',
                    binary: false,
                },
                {
                    uuid: DIS_MODEL_NUMBER_UUID,
                    key: 'modelNumber',
                    binary: false,
                },
                {
                    uuid: DIS_SERIAL_NUMBER_UUID,
                    key: 'serialNumber',
                    binary: false,
                },
                {
                    uuid: DIS_HARDWARE_REVISION_UUID,
                    key: 'hardwareRevision',
                    binary: false,
                },
                {
                    uuid: DIS_FIRMWARE_REVISION_UUID,
                    key: 'firmwareRevision',
                    binary: false,
                },
                {
                    uuid: DIS_SOFTWARE_REVISION_UUID,
                    key: 'softwareRevision',
                    binary: false,
                },
                { uuid: DIS_SYSTEM_ID_UUID, key: 'systemId', binary: true },
                {
                    uuid: DIS_IEEE_REGULATORY_UUID,
                    key: 'ieeeRegulatory',
                    binary: false,
                },
                { uuid: DIS_PNP_ID_UUID, key: 'pnpId', binary: true },
            ];

            for (const { uuid, key, binary } of characteristicMap) {
                const normalizedUuid = this.normalizeUuid(uuid);
                // Noble uses short 4-char UUIDs for standard BLE characteristics
                // (e.g. "2a29" instead of "00002a2900001000800000805f9b34fb")
                const shortUuid = this.toShortUuid(uuid);
                const char = characteristics.find(
                    (c: any) => {
                        const cUuid = this.normalizeUuid(c.uuid);
                        return cUuid === normalizedUuid || cUuid === shortUuid;
                    }
                );
                if (!char) continue;

                try {
                    const buffer = await char.readAsync();
                    if (binary) {
                        const hexValue = Array.from(new Uint8Array(buffer))
                            .map((b: number) => b.toString(16).padStart(2, '0'))
                            .join(':');
                        (info as any)[key] = hexValue;
                    } else {
                        (info as any)[key] = buffer.toString('utf-8');
                    }
                } catch {
                    // Characteristic not available - skip
                }
            }

            info.lastUpdated = new Date();
        } catch {
            // DIS service not available
        }

        return info;
    }

    async cleanup(): Promise<void> {
        // Remove Noble singleton event listeners
        if (noble) {
            if (this.boundStateChangeHandler) {
                noble.removeListener(
                    'stateChange',
                    this.boundStateChangeHandler
                );
            }
        }

        // Remove peripheral disconnect listener
        if (this.peripheral && this.boundDisconnectHandler) {
            this.peripheral.removeListener(
                'disconnect',
                this.boundDisconnectHandler
            );
        }

        await this.disconnect();

        this.characteristicCallback = undefined;
        this.disconnectCallback = undefined;
        this.availabilityCallback = undefined;
    }

    /**
     * Scans for a BLE device by name using Noble's event-driven discovery
     */
    private async scanForDevice(
        deviceName: string,
        serviceUuids: string[],
        timeoutMs: number
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                noble.stopScanning();
                noble.removeListener('discover', onDiscover);
                reject(
                    new BluetoothTimeoutError(
                        `Device scan timeout after ${timeoutMs}ms`
                    )
                );
            }, timeoutMs);

            const onDiscover = (peripheral: any) => {
                const name = peripheral.advertisement?.localName;
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
    private normalizeUuid(uuid: string): string {
        return uuid.toLowerCase().replace(/-/g, '');
    }

    /**
     * Extracts the short 4-character UUID from a standard 128-bit BLE UUID.
     * Standard BLE UUIDs follow the pattern 0000XXXX-0000-1000-8000-00805f9b34fb
     * where XXXX is the short UUID. Noble uses this short form for standard characteristics.
     */
    private toShortUuid(uuid: string): string {
        const normalized = this.normalizeUuid(uuid);
        // Standard BLE base UUID suffix
        const baseSuffix = '00001000800000805f9b34fb';
        if (normalized.startsWith('0000') && normalized.endsWith(baseSuffix)) {
            return normalized.substring(4, 8);
        }
        return normalized;
    }
}
