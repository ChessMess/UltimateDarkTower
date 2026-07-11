import type { IBluetoothAdapter, DeviceInformation } from '../../src';

const EMULATED_BATTERY_MV = 3600;
const BATTERY_HEARTBEAT_INTERVAL_MS = 200;
const INITIAL_STATE_RESPONSE_DELAY_MS = 0;
const COMMAND_RESPONSE_DELAY_MS = 50;
// Safety net only. Calibration normally completes when the emulator popup
// reports its visual sweep finished (via completeCalibration()); this fires
// only if that signal never arrives — e.g. the popup is closed, headless, or
// the 3D model never loaded. Comfortably above the worst-case sweep (~20s).
const CALIBRATION_FALLBACK_MS = 30000;

// Response type byte values (from TC constants in udtConstants.ts)
const TOWER_STATE_RESPONSE = 0x00;
const BATTERY_RESPONSE = 0x07;
const CMD_CALIBRATE = 4;

interface TowerEmulatorAdapterOptions {
  /** Called when a stateful command containing audio is written to the adapter. */
  onAudioCommand?: (sample: number, loop: boolean, volume: number) => void;
  /**
   * Called when a stateful command carries a non-zero `led_sequence` byte
   * (a `Tower.lightOverrides(N)` call). The framework strips this field from
   * tower state on every response, so the popup never sees it via the normal
   * `applyState` path — this side-channel lets the controller fire a
   * transient `playSequence(N)` on the emulator display.
   */
  onLightSequenceCommand?: (sequenceId: number) => void;
}

/**
 * A software-only Bluetooth adapter that simulates tower responses for use
 * with the Tower Emulator display window. No real BLE hardware required.
 *
 * Behavior:
 * - Stateful commands (byte 0 = 0x00): echoed back immediately as TOWER_STATE responses
 * - Calibration command (byte 0 = 4): answered with TWO responses, like real firmware — an
 *   immediate ack (so Tower.calibrate() resolves and the library arms calibration tracking),
 *   then a second TOWER_STATE emitted by completeCalibration() when the emulator popup reports
 *   its real sweep finished (or after CALIBRATION_FALLBACK_MS) — that second one fires
 *   onCalibrationComplete
 * - Other basic commands: echoes back the last known state packet
 * - Battery heartbeat: fires every 200ms so connection health monitoring stays satisfied
 */
export class TowerEmulatorAdapter implements IBluetoothAdapter {
  private connected = false;
  private rxCallback?: (data: Uint8Array) => void;
  private disconnectCallback?: () => void;
  private availabilityCallback?: (available: boolean) => void;
  private batteryInterval?: ReturnType<typeof setInterval>;

  // Set while a calibration command is awaiting its completion reply. The reply
  // fires from completeCalibration() (popup-driven) or the fallback timer.
  private calibrationPending = false;
  private calibrationFallbackTimer?: ReturnType<typeof setTimeout>;

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
    this.cancelCalibration();
  }

  /**
   * Emit the calibrated TOWER_STATE response that signals calibration is
   * complete. Called by the controller when the emulator popup reports its
   * visual sweep has finished (or by the fallback timer). No-op unless a
   * calibration command is currently pending, so stray calls can't inject a
   * spurious state.
   */
  completeCalibration(): void {
    if (!this.calibrationPending) return;
    this.cancelCalibration();
    // (2) completion — a second TOWER_STATE the library reads while
    // `performingCalibration` is armed, which fires onCalibrationComplete AND
    // updates the tower state to all-drums-calibrated. The library strips the
    // 1-byte command prefix (response.slice(1)) before unpacking the real state
    // (UltimateDarkTower.updateTowerStateFromResponse), so byte 0 stays 0x00 (→
    // recognised as TOWER_STATE) and the calibrated bits live in bytes 1–2.
    const calibratedResponse = this.createCalibratedStateResponse();
    this.lastStatePacket = new Uint8Array(calibratedResponse);
    this.rxCallback?.(calibratedResponse);
  }

  private cancelCalibration(): void {
    this.calibrationPending = false;
    if (this.calibrationFallbackTimer) {
      clearTimeout(this.calibrationFallbackTimer);
      this.calibrationFallbackTimer = undefined;
    }
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

      // LED sequence detection: state_data[18] = led_sequence byte → data[19]
      // (after the 1-byte type prefix). Same fire-and-forget shape as audio:
      // framework's response handler strips it before any state propagates.
      const sequenceId = data[19];
      if (sequenceId !== 0) {
        this.options.onLightSequenceCommand?.(sequenceId);
      }
    } else if (data.length === 1 && commandType === CMD_CALIBRATE) {
      // Calibration takes TWO responses, mirroring real tower firmware:
      //   1) an immediate ack (this echo) so the library's command queue
      //      resolves Tower.calibrate() and then arms `performingCalibration`;
      //   2) a later TOWER_STATE (completeCalibration(), below) that the library
      //      sees while `performingCalibration` is armed → fires onCalibrationComplete.
      // A single response can't work: the library arms the flag only AFTER the
      // command's ack, and handleTowerStateResponse runs before the command
      // completes — so the completion state must arrive after the ack.
      this.calibrationPending = true;
      if (this.calibrationFallbackTimer) clearTimeout(this.calibrationFallbackTimer);
      this.calibrationFallbackTimer = setTimeout(() => this.completeCalibration(), CALIBRATION_FALLBACK_MS);
      // (1) ack — echo current state so the command resolves.
      setTimeout(() => this.rxCallback?.(new Uint8Array(this.lastStatePacket)), COMMAND_RESPONSE_DELAY_MS);
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
    this.cancelCalibration();
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
    // 20-byte TOWER_STATE response with all 3 drums calibrated at position 0 (north).
    // The library strips byte 0 (command prefix) before unpacking the state, so the
    // state bytes are offset by one from rtdt_unpack_state's data[] indices:
    //   Byte 0: 0x00 — command prefix / TOWER_STATE type (kept 0 so it's recognised)
    //   Byte 1 (state data[0]): drum[0].calibrated = bit 4 → 0x10
    //   Byte 2 (state data[1]): drum[1].calibrated = bit 1 (0x02) | drum[2].calibrated = bit 6 (0x40) → 0x42
    //   Bytes 3–19: zero (no LEDs, no audio, beam count 0)
    const response = new Uint8Array(20);
    response[0] = TOWER_STATE_RESPONSE;
    response[1] = 0x10; // drum[0].calibrated
    response[2] = 0x42; // drum[1].calibrated | drum[2].calibrated
    return response;
  }
}
