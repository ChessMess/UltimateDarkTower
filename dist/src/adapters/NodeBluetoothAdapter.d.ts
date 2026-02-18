import { type IBluetoothAdapter } from '../udtBluetoothAdapter';
import { type DeviceInformation } from '../udtBleConnection';
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
export declare class NodeBluetoothAdapter implements IBluetoothAdapter {
    private peripheral;
    private txCharacteristic;
    private rxCharacteristic;
    private allCharacteristics;
    private characteristicCallback?;
    private disconnectCallback?;
    private availabilityCallback?;
    private boundStateChangeHandler?;
    private boundDataHandler?;
    private boundDisconnectHandler?;
    private isConnectedFlag;
    /**
     * Waits for Noble's BLE adapter to reach 'poweredOn' state.
     * Uses @stoprocent/noble's built-in waitForPoweredOnAsync().
     */
    private ensureNobleReady;
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
    /**
     * Scans for a BLE device by name using Noble's event-driven discovery
     */
    private scanForDevice;
    /**
     * Normalizes UUID to Noble's format (lowercase, no dashes)
     */
    private normalizeUuid;
    /**
     * Extracts the short 4-character UUID from a standard 128-bit BLE UUID.
     * Standard BLE UUIDs follow the pattern 0000XXXX-0000-1000-8000-00805f9b34fb
     * where XXXX is the short UUID. Noble uses this short form for standard characteristics.
     */
    private toShortUuid;
}
