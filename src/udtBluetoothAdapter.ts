import { DeviceInformation } from './udtBleConnection';

/**
 * Platform-agnostic Bluetooth adapter interface
 * Implementations exist for Web Bluetooth and Node.js Bluetooth
 *
 * Custom adapters can be created for other platforms (React Native, Electron, etc.)
 */
export interface IBluetoothAdapter {
  // Connection lifecycle
  connect(deviceName: string, serviceUuids: string[]): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  isGattConnected(): boolean;

  // Data operations
  writeCharacteristic(data: Uint8Array): Promise<void>;

  // Event handling (callback registration)
  onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void;
  onDisconnect(callback: () => void): void;
  onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void;

  // Device information
  readDeviceInformation(): Promise<DeviceInformation>;

  // Cleanup
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
export class BluetoothError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'BluetoothError';
  }
}

/**
 * Error thrown when Bluetooth connection fails or is lost
 */
export class BluetoothConnectionError extends BluetoothError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'BluetoothConnectionError';
  }
}

/**
 * Error thrown when the requested Bluetooth device cannot be found
 */
export class BluetoothDeviceNotFoundError extends BluetoothError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'BluetoothDeviceNotFoundError';
  }
}

/**
 * Error thrown when user cancels the device selection dialog
 * (Primarily used in Web Bluetooth environments)
 */
export class BluetoothUserCancelledError extends BluetoothError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'BluetoothUserCancelledError';
  }
}

/**
 * Error thrown when a Bluetooth operation times out
 */
export class BluetoothTimeoutError extends BluetoothError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'BluetoothTimeoutError';
  }
}
