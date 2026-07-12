import { type IBluetoothAdapter, BluetoothError } from '../udtBluetoothAdapter';
import { type DeviceInformation } from '../udtBleConnection';

/**
 * No-op Bluetooth adapter for software-only use (BluetoothPlatform.NONE).
 *
 * Lets consumers construct UltimateDarkTower in environments without Bluetooth
 * (e.g. iOS Safari, headless rendering) when they only need software state such
 * as broken-seal tracking and never open a BLE connection. Construction is safe
 * everywhere; actually attempting to connect or write fails loudly rather than
 * hanging silently.
 */
export class NoopBluetoothAdapter implements IBluetoothAdapter {
  // Stored but never invoked — this adapter produces no events.
  private characteristicCallback?: (data: Uint8Array) => void;
  private disconnectCallback?: () => void;
  private availabilityCallback?: (available: boolean) => void;

  async connect(_deviceName: string, _serviceUuids: string[]): Promise<void> {
    void _deviceName;
    void _serviceUuids;
    throw new BluetoothError('Bluetooth is disabled (platform: none)');
  }

  async disconnect(): Promise<void> {
    // nothing to disconnect
  }

  isConnected(): boolean {
    return false;
  }

  isGattConnected(): boolean {
    return false;
  }

  async writeCharacteristic(_data: Uint8Array): Promise<void> {
    void _data;
    throw new BluetoothError('Bluetooth is disabled (platform: none)');
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
    return {};
  }

  async cleanup(): Promise<void> {
    // nothing to clean up
  }
}
