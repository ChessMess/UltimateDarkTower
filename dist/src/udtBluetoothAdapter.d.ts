import { DeviceInformation } from './udtBleConnection';
/**
 * Platform-agnostic Bluetooth adapter interface
 * Implementations exist for Web Bluetooth and Node.js Bluetooth
 *
 * Custom adapters can be created for other platforms (React Native, Electron, etc.)
 */
export interface IBluetoothAdapter {
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
/**
 * Configuration for Bluetooth adapters
 */
export interface BluetoothAdapterConfig {
    uartServiceUuid: string;
    txCharacteristicUuid: string;
    rxCharacteristicUuid: string;
    disServiceUuid: string;
    deviceName: string;
}
/**
 * Standard Bluetooth error types for cross-platform handling
 * Base class for all Bluetooth-related errors
 */
export declare class BluetoothError extends Error {
    readonly originalError?: any;
    constructor(message: string, originalError?: any);
}
/**
 * Error thrown when Bluetooth connection fails or is lost
 */
export declare class BluetoothConnectionError extends BluetoothError {
    constructor(message: string, originalError?: any);
}
/**
 * Error thrown when the requested Bluetooth device cannot be found
 */
export declare class BluetoothDeviceNotFoundError extends BluetoothError {
    constructor(message: string, originalError?: any);
}
/**
 * Error thrown when user cancels the device selection dialog
 * (Primarily used in Web Bluetooth environments)
 */
export declare class BluetoothUserCancelledError extends BluetoothError {
    constructor(message: string, originalError?: any);
}
/**
 * Error thrown when a Bluetooth operation times out
 */
export declare class BluetoothTimeoutError extends BluetoothError {
    constructor(message: string, originalError?: any);
}
