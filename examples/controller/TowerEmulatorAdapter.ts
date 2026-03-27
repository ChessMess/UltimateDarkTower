import type { IBluetoothAdapter, DeviceInformation } from '../../src';

const EMULATED_BATTERY_MV = 3600;
const BATTERY_HEARTBEAT_INTERVAL_MS = 200;
const INITIAL_STATE_RESPONSE_DELAY_MS = 0;
const COMMAND_RESPONSE_DELAY_MS = 50;
const CALIBRATION_DELAY_MS = 1500;

// Response type byte values (from TC constants in udtConstants.ts)
const TOWER_STATE_RESPONSE = 0x00;
const BATTERY_RESPONSE = 0x07;
const CMD_CALIBRATE = 4;

interface TowerEmulatorAdapterOptions {
  /** Called when a stateful command containing audio is written to the adapter. */
  onAudioCommand?: (sample: number, loop: boolean, volume: number) => void;
}

/**
 * A software-only Bluetooth adapter that simulates tower responses for use
 * with the Tower Emulator display window. No real BLE hardware required.
 *
 * Behavior:
 * - Stateful commands (byte 0 = 0x00): echoed back immediately as TOWER_STATE responses
 * - Calibration command (byte 0 = 4): after 1.5s, responds with all 3 drums calibrated
 * - Other basic commands: echoes back the last known state packet
 * - Battery heartbeat: fires every 200ms so connection health monitoring stays satisfied
 */
export class TowerEmulatorAdapter implements IBluetoothAdapter {
  private connected = false;
  private rxCallback?: (data: Uint8Array) => void;
  private disconnectCallback?: () => void;
  private availabilityCallback?: (available: boolean) => void;
  private batteryInterval?: ReturnType<typeof setInterval>;

  // Tracks the last 20-byte stateful command so non-stateful responses preserve current state
  private lastStatePacket: Uint8Array = new Uint8Array(20);

  constructor(private options: TowerEmulatorAdapterOptions = {}) {}

  async connect(_deviceName: string, _serviceUuids: string[]): Promise<void> {
    this.connected = true;

    // Emit an initial state packet so the emulator window renders immediately after connect.
    setTimeout(() => {
      this.rxCallback?.(new Uint8Array(this.lastStatePacket));
    }, INITIAL_STATE_RESPONSE_DELAY_MS);

    this.batteryInterval = setInterval(() => {
      this.rxCallback?.(this.createBatteryResponse());
    }, BATTERY_HEARTBEAT_INTERVAL_MS);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.stopBatteryHeartbeat();
  }

  isConnected(): boolean {
    return this.connected;
  }

  isGattConnected(): boolean {
    return this.connected;
  }

  async writeCharacteristic(data: Uint8Array): Promise<void> {
    const commandType = data[0];

    if (data.length >= 20 && commandType === TOWER_STATE_RESPONSE) {
      // Stateful command — cache it and echo back as a TOWER_STATE response
      this.lastStatePacket = new Uint8Array(data);
      setTimeout(() => this.rxCallback?.(new Uint8Array(data)), COMMAND_RESPONSE_DELAY_MS);

      // Audio detection: state_data[14] = sample (bits 0–6) | loop (bit 7); state_data[17] bits 4–7 = volume
      // Command packet has a 1-byte type prefix (data[0]), so state_data[n] = data[n+1]
      const sample = data[15] & 0x7f;
      if (sample !== 0) {
        const loop = !!(data[15] & 0x80);
        const volume = (data[18] & 0xf0) >> 4;
        this.options.onAudioCommand?.(sample, loop, volume);
      }
    } else if (data.length === 1 && commandType === CMD_CALIBRATE) {
      // Calibration command — respond after delay with all 3 drums marked calibrated
      setTimeout(() => {
        const calibratedResponse = this.createCalibratedStateResponse();
        this.lastStatePacket = new Uint8Array(calibratedResponse);
        this.rxCallback?.(calibratedResponse);
      }, CALIBRATION_DELAY_MS);
    } else {
      // Other basic commands (unjam, reset counter, etc.) — echo last known state
      setTimeout(
        () => this.rxCallback?.(new Uint8Array(this.lastStatePacket)),
        COMMAND_RESPONSE_DELAY_MS
      );
    }
  }

  onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void {
    this.rxCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void {
    this.availabilityCallback = callback;
  }

  async readDeviceInformation(): Promise<DeviceInformation> {
    return {
      modelNumber: 'Tower Emulator',
      firmwareRevision: '0.0.0',
    };
  }

  async cleanup(): Promise<void> {
    this.connected = false;
    this.stopBatteryHeartbeat();
    this.lastStatePacket = new Uint8Array(20);
    this.rxCallback = undefined;
    this.disconnectCallback = undefined;
    this.availabilityCallback = undefined;
  }

  private stopBatteryHeartbeat(): void {
    if (this.batteryInterval) {
      clearInterval(this.batteryInterval);
      this.batteryInterval = undefined;
    }
  }

  private createBatteryResponse(): Uint8Array {
    // Battery response format: [0x07, 0x00, 0x00, highByte, lowByte]
    // getMilliVoltsFromTowerResponse reads bytes 3 (high) and 4 (low) as a big-endian 16-bit value
    const response = new Uint8Array(5);
    response[0] = BATTERY_RESPONSE;
    response[3] = (EMULATED_BATTERY_MV >> 8) & 0xff;
    response[4] = EMULATED_BATTERY_MV & 0xff;
    return response;
  }

  private createCalibratedStateResponse(): Uint8Array {
    // 20-byte TOWER_STATE response with all 3 drums calibrated at position 0 (north)
    // Byte 0: 0x00 (TOWER_STATE response type)
    // Byte 1 (state data[0]): drum[0].calibrated = bit 4 → 0x10
    // Byte 2 (state data[1]): drum[1].calibrated = bit 1 (0x02) | drum[2].calibrated = bit 6 (0x40) → 0x42
    // Bytes 3–19: all zeros (no LEDs, no audio, beam count 0)
    const response = new Uint8Array(20);
    response[0] = TOWER_STATE_RESPONSE;
    response[1] = 0x10; // drum[0].calibrated
    response[2] = 0x42; // drum[1].calibrated | drum[2].calibrated
    return response;
  }
}
