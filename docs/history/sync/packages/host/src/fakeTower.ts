/**
 * FakeTower — BLE peripheral that mimics the Return to Dark Tower hardware.
 *
 * Advertises a Nordic UART GATT service with the same UUID and characteristic
 * as the real tower. When the official companion app connects and writes a
 * 20-byte command to the RX characteristic, FakeTower fires `onCommandReceived`
 * (and emits the 'command' event) so the relay server can broadcast it.
 *
 * Uses @stoprocent/bleno for BLE peripheral mode on macOS/Linux.
 */

import { EventEmitter } from 'events';
import bleno, { type State as BlenoState } from '@stoprocent/bleno';
// Characteristic and PrimaryService live on Bleno.prototype, not as own enumerable
// properties of the CJS module export. Accessing them via the default import
// (bleno instance) uses prototype-chain lookup, which works correctly at runtime.
const { Characteristic, PrimaryService } = bleno;
import {
  UART_SERVICE_UUID,
  UART_RX_CHARACTERISTIC_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  TOWER_DEVICE_NAME,
} from 'ultimatedarktower';
import { buildSkullDropPacket } from './commandParser';

// ─── Device Information Service constants ────────────────────────────────────
// Captured from the real tower via BLE sniffing (captureTower.ts / UDT controller log).
const DIS_SERVICE_UUID = '180a';
const DIS_MANUFACTURER_NAME_UUID = '2a29';
const DIS_MODEL_NUMBER_UUID = '2a24';
const DIS_HARDWARE_REVISION_UUID = '2a27';
const DIS_FIRMWARE_REVISION_UUID = '2a26';
const DIS_SOFTWARE_REVISION_UUID = '2a28';

const DIS_MANUFACTURER_NAME = 'Restoration Games LLC';
const DIS_MODEL_NUMBER = 'ReturnToDarkTower';
const DIS_HARDWARE_REVISION = '1.11';
const DIS_FIRMWARE_REVISION = '79556657694099f3ca293f534b9cc5b55bfeaa31';
const DIS_SOFTWARE_REVISION = '1.0.0';

// First notification the real tower sends immediately upon subscription.
// Pattern observed: 07 00 00 0c 10
const INITIAL_HEARTBEAT = Buffer.from([0x07, 0x00, 0x00, 0x0c, 0x10]);
import type { FakeTowerState } from '@dark-tower-sync/shared';

/** Callback invoked when a tower command is intercepted. */
export type CommandReceivedCallback = (data: Buffer) => void;

interface FakeTowerEventMap {
  'state-change': [state: FakeTowerState];
  'command': [data: Buffer];
  'companion-connected': [address: string];
  'companion-disconnected': [address: string];
  /** Raw CoreBluetooth adapter state — fires immediately on init and on each change. */
  'ble-adapter-state': [state: BlenoState];
}

/**
 * FakeTower emulates the Return to Dark Tower BLE peripheral so the official
 * companion app believes it is connected to a real tower.
 *
 * Events:
 *   'state-change'          — FakeTowerState changed
 *   'command'               — 20-byte command received from companion app
 *   'companion-connected'   — companion app connected via BLE
 *   'companion-disconnected'— companion app disconnected
 *
 * @example
 * ```ts
 * const tower = new FakeTower();
 * tower.on('command', (data) => relayServer.broadcast(data));
 * tower.on('state-change', (state) => console.log('tower state:', state));
 * await tower.startAdvertising();
 * ```
 */
export class FakeTower extends EventEmitter<FakeTowerEventMap> {
  /**
   * Legacy callback — fires on every intercepted command.
   * Prefer listening to the 'command' event for new code.
   */
  onCommandReceived: CommandReceivedCallback | null = null;

  private _state: FakeTowerState = 'idle';
  private _bleAdapterState: BlenoState = 'unknown';
  private _advertising = false;
  private _txUpdateValue: ((data?: Buffer) => void) | null = null;
  private _connectedAddress = 'unknown';
  /** Last 20-byte command received from the companion app — used as baseline for injected notifications. */
  private _lastCommand: Buffer | null = null;
  /** Skull drop count sent to the companion app this session. Incremented on each injected skull drop. */
  private _skullDropCount = 0;
  /** Guards against concurrent startAdvertising() calls during the async BLE wait. */
  private _isStarting = false;

  // Stored handler refs so we can remove them in stopAdvertising.
  private readonly _onAccept = (address: string): void => {
    this._connectedAddress = address;
    this.setState('connected');
    this.emit('companion-connected', address);
  };

  private readonly _onDisconnect = (address: string): void => {
    // After disconnect the peripheral keeps advertising automatically.
    console.log('[FakeTower] companion disconnected:', address);
    this._txUpdateValue = null;
    this._connectedAddress = 'unknown';
    this._skullDropCount = 0;
    this.setState('advertising');
    this.emit('companion-disconnected', address);
  };

  private readonly _onStateChange = (state: BlenoState): void => {
    this._bleAdapterState = state;
    this.emit('ble-adapter-state', state);
  };

  constructor() {
    super();
    // Track raw CoreBluetooth adapter state from the moment bleno initializes.
    // This fires immediately with the current state and again on each change.
    bleno.on('stateChange', this._onStateChange);
  }

  /** Returns the current raw CoreBluetooth adapter state. */
  getBleAdapterState(): BlenoState {
    return this._bleAdapterState;
  }

  private setState(state: FakeTowerState): void {
    this._state = state;
    this.emit('state-change', state);
  }

  /**
   * Start advertising as the fake tower BLE peripheral.
   *
   * Waits for Bluetooth to be powered on (up to 10 s), then begins advertising
   * as "ReturnToDarkTower" with the Nordic UART service UUID. Sets up the GATT
   * service with RX (write) and TX (notify) characteristics.
   *
   * Rejects if Bluetooth times out or is unavailable.
   */
  async startAdvertising(): Promise<void> {
    if (this._advertising || this._isStarting) return;
    this._isStarting = true;

    // Register stored handler refs (removed in stopAdvertising).
    bleno.on('accept', this._onAccept);
    bleno.on('disconnect', this._onDisconnect);

    try {
      // Command-receive characteristic — companion app WRITES commands here.
      // UUID: UART_TX_CHARACTERISTIC_UUID (6e400002) = "TX from app" = companion transmits.
      // Properties on the real tower: writeWithoutResponse + write.
      const cmdChar = new Characteristic({
        uuid: UART_TX_CHARACTERISTIC_UUID,
        properties: ['write', 'writeWithoutResponse'],
        onWriteRequest: (_handle, data, _offset, _withoutResponse, callback) => {
          console.log('[FakeTower] command received:', data.toString('hex'));
          this._lastCommand = Buffer.from(data);
          this.onCommandReceived?.(data);
          this.emit('command', data);
          callback(Characteristic.RESULT_SUCCESS);
        },
      });

      // Notify characteristic — tower sends state notifications here.
      // UUID: UART_RX_CHARACTERISTIC_UUID (6e400003) = "RX from app" = companion receives.
      // Properties on the real tower: notify.
      const notifyChar = new Characteristic({
        uuid: UART_RX_CHARACTERISTIC_UUID,
        properties: ['notify'],
        onSubscribe: (_handle: unknown, _maxValueSize: number, updateValueCallback: (data?: Buffer) => void) => {
          console.log('[FakeTower] companion subscribed to state notifications');
          this._txUpdateValue = updateValueCallback;
          // Some reconnect paths do not emit a new `accept` event, but do resubscribe.
          // Promote state to connected immediately so host UI reflects the active session.
          if (this._state !== 'connected') {
            const address = this._connectedAddress;
            this.setState('connected');
            this.emit('companion-connected', address);
          }
          // The real tower sends an initial heartbeat immediately on subscription.
          // Send it on the next tick to let bleno finish the subscription handshake.
          setImmediate(() => { updateValueCallback(INITIAL_HEARTBEAT); });
        },
        onUnsubscribe: () => {
          console.log('[FakeTower] companion unsubscribed from state notifications');
          this._txUpdateValue = null;
          // Some companion disconnect paths only surface as notify unsubscribe.
          // Mirror disconnect behavior so UI state does not remain stale.
          if (this._state === 'connected') {
            const address = this._connectedAddress;
            this._connectedAddress = 'unknown';
            this.setState('advertising');
            this.emit('companion-disconnected', address);
          }
        },
      });

      const uartService = new PrimaryService({
        uuid: UART_SERVICE_UUID,
        characteristics: [cmdChar, notifyChar],
      });

      // Device Information Service — read by the companion app immediately after
      // connection to identify the tower model and firmware version.
      // Use static `value` so CoreBluetooth responds to reads automatically
      // without going through the dynamic onReadRequest/didReceiveReadRequest path.
      const makeReadChar = (uuid: string, value: string) =>
        new Characteristic({
          uuid,
          properties: ['read'],
          value: Buffer.from(value, 'utf8'),
        });

      const disService = new PrimaryService({
        uuid: DIS_SERVICE_UUID,
        characteristics: [
          makeReadChar(DIS_MANUFACTURER_NAME_UUID, DIS_MANUFACTURER_NAME),
          makeReadChar(DIS_MODEL_NUMBER_UUID, DIS_MODEL_NUMBER),
          makeReadChar(DIS_HARDWARE_REVISION_UUID, DIS_HARDWARE_REVISION),
          makeReadChar(DIS_FIRMWARE_REVISION_UUID, DIS_FIRMWARE_REVISION),
          makeReadChar(DIS_SOFTWARE_REVISION_UUID, DIS_SOFTWARE_REVISION),
        ],
      });

      // Log any service-set errors — bleno emits these separately and they are
      // otherwise silently dropped when setServicesAsync resolves on the first
      // successful servicesSet event.
      bleno.on('servicesSetError', (err: Error) => {
        console.error('[FakeTower] servicesSetError:', err);
      });

      console.log('[FakeTower] waiting for poweredOn…');
      await bleno.waitForPoweredOnAsync();
      console.log('[FakeTower] poweredOn — starting advertising…');
      // Advertise with no service UUIDs — the UART UUID is 128-bit (18 bytes) and
      // causes CoreBluetooth to truncate "ReturnToDarkTower" to "ReturnTo" in the
      // 31-byte advertisement packet. The companion app scans by name prefix so the
      // truncated name is never matched. Omitting the UUID here lets the full name
      // fit; services are discoverable via GATT enumeration after connection.
      await bleno.startAdvertisingAsync(TOWER_DEVICE_NAME, []);
      console.log('[FakeTower] advertising started — setting services…');
      await bleno.setServicesAsync([uartService, disService]);
      console.log('[FakeTower] services set — tower ready');
      this._advertising = true;
      this._isStarting = false;
      this.setState('advertising');
    } catch (err) {
      console.error('[FakeTower] startAdvertising failed:', err);
      this._advertising = false;
      this._isStarting = false;
      bleno.removeListener('accept', this._onAccept);
      bleno.removeListener('disconnect', this._onDisconnect);
      this.setState('error');
      throw err;
    }
  }

  /**
   * Stop advertising and disconnect any connected companion app.
   */
  async stopAdvertising(): Promise<void> {
    if (!this._advertising) return;
    this._advertising = false;

    bleno.removeListener('accept', this._onAccept);
    bleno.removeListener('disconnect', this._onDisconnect);

    // Reset session fields that _onDisconnect would normally clear but cannot,
    // because its listener is removed before bleno.disconnect() fires.
    this._txUpdateValue = null;
    this._connectedAddress = 'unknown';
    this._skullDropCount = 0;
    this._lastCommand = null;

    bleno.disconnect();
    await bleno.stopAdvertisingAsync();
    this.setState('idle');
  }

  /**
   * Fully tear down bleno listeners so the native addon can be finalized
   * without crashing. Call this once before process exit.
   */
  destroy(): void {
    bleno.removeListener('stateChange', this._onStateChange);
    bleno.removeAllListeners();
  }

  /**
   * Send a raw buffer to the companion app via the TX notification characteristic.
   * Returns true if the notification was sent, false if no subscriber is active.
   */
  sendTxNotification(data: Buffer): boolean {
    if (!this._txUpdateValue) return false;
    this._txUpdateValue(data);
    return true;
  }

  /**
   * Inject a skull-drop event to the companion app by sending a crafted tower state
   * notification with an incremented skull-drop count at byte {@link SKULL_DROP_COUNT_POS}.
   *
   * Uses the last command received from the companion app as the baseline packet so all
   * other state bytes (drum positions, LEDs, audio, etc.) are preserved. If no command
   * has been received yet, a zero-filled baseline is used.
   *
   * @returns `true` if the notification was sent, `false` if no companion app subscriber
   *          is active or if `_txUpdateValue` is not set.
   */
  injectSkullDrop(): boolean {
    if (!this._txUpdateValue) {
      console.log('[FakeTower] injectSkullDrop: no companion subscriber — notification not sent');
      return false;
    }

    // Increment skull count; wrap at 255 back to 1 (0 means "reset" to the UDT library).
    this._skullDropCount = this._skullDropCount >= 255 ? 1 : this._skullDropCount + 1;

    const lastCommandArray = this._lastCommand ? Array.from(this._lastCommand) : null;
    const packet = buildSkullDropPacket(lastCommandArray, this._skullDropCount);

    console.log(`[FakeTower] skull drop notification sent (count=${this._skullDropCount}):`, packet.toString('hex'));
    this._txUpdateValue(packet);
    return true;
  }

  /**
   * Resets the session skull drop counter. Called when the companion app disconnects
   * so the first drop after reconnect starts cleanly from 1.
   */
  resetSkullDropCount(): void {
    this._skullDropCount = 0;
  }

  /** Returns true if currently advertising or connected to companion app. */
  isAdvertising(): boolean {
    return this._state === 'advertising' || this._state === 'connected';
  }

  /** Returns true if the companion app is currently connected. */
  isConnected(): boolean {
    return this._state === 'connected';
  }
}
