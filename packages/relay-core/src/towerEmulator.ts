/**
 * TowerEmulator — BLE peripheral that mimics the Return to Dark Tower hardware.
 *
 * Advertises a Nordic UART GATT service with the same UUID and characteristic
 * as the real tower. When the official companion app connects and writes a
 * 20-byte command to the command characteristic (UART_TX, named from the
 * tower's perspective — the app transmits to it), TowerEmulator emits the
 * 'command' event so the relay server can broadcast it.
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
import { TOWER_STATE_NOTIFICATION_TYPE } from './commandParser';
import {
  resolveDeviceInfo,
  shouldExposeDeviceInfoService,
  type DeviceInformation,
} from './deviceInfo';

let _disWarningLogged = false;

// Delay (ms) before the TowerEmulator echoes a response for commands that trigger
// a visual animation (ledOverride != 0). The real tower only responds after the
// animation completes; without this delay the companion app sends the next
// command within ~60ms, interrupting the animation on the client's physical tower.
// Measured visually from sealReveal animation duration (~1.5-2s).
const ANIMATION_ECHO_DELAY_MS = 1600;

// ─── Device Information Service UUIDs ─────────────────────────────────────────
// The DIS *values* (manufacturer, firmware revision, …) are resolved per-instance
// from TowerEmulatorOptions.deviceInfo — see ./deviceInfo. The app reads the firmware
// revision to gate its "checking firmware" screen.
const DIS_SERVICE_UUID = '180a';
const DIS_MANUFACTURER_NAME_UUID = '2a29';
const DIS_MODEL_NUMBER_UUID = '2a24';
const DIS_HARDWARE_REVISION_UUID = '2a27';
const DIS_FIRMWARE_REVISION_UUID = '2a26';
const DIS_SOFTWARE_REVISION_UUID = '2a28';

// First notification the real tower sends immediately upon subscription.
// Pattern observed: 07 00 00 0c 10
const INITIAL_HEARTBEAT = Buffer.from([0x07, 0x00, 0x00, 0x0c, 0x10]);
import type { TowerEmulatorState } from 'ultimatedarktowerrelay-shared';

/** Construction options for {@link TowerEmulator}. */
export interface TowerEmulatorOptions {
  /**
   * Overrides for the Device Information Service identity the app reads after
   * connecting. Omitted fields fall back to `DEFAULT_DEVICE_INFO` (see
   * ./deviceInfo). The `firmwareRevision` is the value the app gates its
   * "checking firmware" screen on. Has effect only where the DIS can be exposed
   * (non-macOS — CoreBluetooth blocks 0x180A in peripheral mode).
   */
  deviceInfo?: Partial<DeviceInformation>;
}

interface TowerEmulatorEventMap {
  'state-change': [state: TowerEmulatorState];
  'command': [data: Buffer];
  'companion-connected': [address: string];
  'companion-disconnected': [address: string];
  /** Raw CoreBluetooth adapter state — fires immediately on init and on each change. */
  'ble-adapter-state': [state: BlenoState];
  /** Diagnostic: ghost BLE connection detected via write in non-connected state. */
  'ghost-connection': [state: TowerEmulatorState];
}

/**
 * TowerEmulator emulates the Return to Dark Tower BLE peripheral so the official
 * companion app believes it is connected to a real tower.
 *
 * Events:
 *   'state-change'          — TowerEmulatorState changed
 *   'command'               — 20-byte command received from companion app
 *   'companion-connected'   — companion app connected via BLE
 *   'companion-disconnected'— companion app disconnected
 *
 * @example
 * ```ts
 * const tower = new TowerEmulator();
 * tower.on('command', (data) => relayServer.broadcast(data));
 * tower.on('state-change', (state) => console.log('tower state:', state));
 * await tower.startAdvertising();
 * ```
 */
export class TowerEmulator extends EventEmitter<TowerEmulatorEventMap> {
  private _state: TowerEmulatorState = 'idle';
  private _bleAdapterState: BlenoState = 'unknown';
  private _advertising = false;
  private _txUpdateValue: ((data?: Buffer) => void) | null = null;
  private _connectedAddress = 'unknown';
  /** Last 20-byte command received from the companion app — the synthesizer's baseline for notifications. */
  private _lastCommand: Buffer | null = null;
  /** Guards against concurrent startAdvertising() calls during the async BLE wait. */
  private _isStarting = false;
  /** Resolved Device Information Service identity presented to the companion app. */
  private readonly _deviceInfo: DeviceInformation;

  // Stored handler refs so we can remove them in stopAdvertising.
  private readonly _onAccept = (address: string): void => {
    this._connectedAddress = address;
    this.setState('connected');
    this.emit('companion-connected', address);
  };

  private readonly _onDisconnect = (address: string): void => {
    // After disconnect the peripheral keeps advertising automatically.
    console.log('[TowerEmulator] companion disconnected:', address);
    this._txUpdateValue = null;
    this._connectedAddress = 'unknown';
    this.setState('advertising');
    this.emit('companion-disconnected', address);
  };

  private readonly _onStateChange = (state: BlenoState): void => {
    this._bleAdapterState = state;
    this.emit('ble-adapter-state', state);
  };

  private readonly _onServicesSetError = (err: Error): void => {
    console.error('[TowerEmulator] servicesSetError:', err);
  };

  constructor(options: TowerEmulatorOptions = {}) {
    super();
    this._deviceInfo = resolveDeviceInfo(options.deviceInfo);
    // Track raw CoreBluetooth adapter state from the moment bleno initializes.
    // This fires immediately with the current state and again on each change.
    bleno.on('stateChange', this._onStateChange);
    bleno.on('servicesSetError', this._onServicesSetError);
  }

  /** Returns the current raw CoreBluetooth adapter state. */
  getBleAdapterState(): BlenoState {
    return this._bleAdapterState;
  }

  private setState(state: TowerEmulatorState): void {
    this._state = state;
    this.emit('state-change', state);
  }

  /**
   * Start advertising as the tower emulator BLE peripheral.
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
    console.log(`[TowerEmulator] startAdvertising called (was ${this._state})`);

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
          // Ghost-connection recovery: if we receive a write while in advertising
          // state, the companion BLE link survived a stop/start cycle (macOS
          // CoreBluetooth has no peripheral-initiated disconnect API).
          if (this._state === 'advertising') {
            console.log('[TowerEmulator] ghost connection detected via write — promoting to connected');
            this.emit('ghost-connection', this._state);
            this.setState('connected');
            this.emit('companion-connected', this._connectedAddress);
          } else if (this._state === 'idle') {
            console.warn('[TowerEmulator] command received in idle state — BLE link still alive (macOS limitation)');
          }
          console.log('[TowerEmulator] command received:', data.toString('hex'));
          this._lastCommand = Buffer.from(data);
          this.emit('command', data);
          // Echo a tower-state response so the companion app's state machine advances.
          // The real tower sends a state notification after every BLE write; without
          // this the companion has no flow control and fires command pairs within 1ms.
          //
          // Clear transient fields (audio, LED override) to match real tower behavior:
          // the real tower returns these as 0 after executing an animation/sound,
          // signalling "animation complete." Without clearing, the companion app
          // interprets the echoed values as "still animating" and falls back to an
          // 18-second timeout before sending the next command.
          //
          // When the command triggers a visual animation (ledOverride != 0), delay
          // the echo to match the real tower's response timing. The real tower only
          // responds after the animation finishes (~1.5s for sealReveal, similar for
          // others). Without this delay the companion sends the next command within
          // 60ms, interrupting the animation on the client's physical tower.
          if (this._txUpdateValue) {
            const response = Buffer.from(data);
            response[0] = TOWER_STATE_NOTIFICATION_TYPE; // 0x00
            response[15] = 0; // Clear audio (sample + loop) — real tower always returns 0
            response[19] = 0; // Clear LED override — animation complete

            const hasAnimation = data[19] !== 0;
            if (hasAnimation) {
              setTimeout(() => {
                this._txUpdateValue?.(response);
              }, ANIMATION_ECHO_DELAY_MS);
            } else {
              setImmediate(() => {
                this._txUpdateValue?.(response);
              });
            }
          }
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
          console.log('[TowerEmulator] companion subscribed to state notifications');
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
          console.log('[TowerEmulator] companion unsubscribed from state notifications');
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
          makeReadChar(DIS_MANUFACTURER_NAME_UUID, this._deviceInfo.manufacturerName),
          makeReadChar(DIS_MODEL_NUMBER_UUID, this._deviceInfo.modelNumber),
          makeReadChar(DIS_HARDWARE_REVISION_UUID, this._deviceInfo.hardwareRevision),
          makeReadChar(DIS_FIRMWARE_REVISION_UUID, this._deviceInfo.firmwareRevision),
          makeReadChar(DIS_SOFTWARE_REVISION_UUID, this._deviceInfo.softwareRevision),
        ],
      });

      console.log('[TowerEmulator] waiting for poweredOn…');
      await bleno.waitForPoweredOnAsync();
      console.log('[TowerEmulator] poweredOn — starting advertising…');
      // Advertise with no service UUIDs — the UART UUID is 128-bit (18 bytes) and
      // causes CoreBluetooth to truncate "ReturnToDarkTower" to "ReturnTo" in the
      // 31-byte advertisement packet. The companion app scans by name prefix so the
      // truncated name is never matched. Omitting the UUID here lets the full name
      // fit; services are discoverable via GATT enumeration after connection.
      await bleno.startAdvertisingAsync(TOWER_DEVICE_NAME, []);
      console.log('[TowerEmulator] advertising started — setting services…');
      const services = [uartService];
      if (shouldExposeDeviceInfoService(process.platform)) {
        services.push(disService);
        console.log(`[TowerEmulator] exposing Device Information Service (firmware: ${this._deviceInfo.firmwareRevision})`);
      } else if (!_disWarningLogged) {
        console.warn(
          '[TowerEmulator] macOS detected — skipping Device Information Service (0x180A). ' +
          'CoreBluetooth blocks standard Bluetooth SIG UUIDs in peripheral mode, so the ' +
          'companion app will stall on "checking firmware". Run on Linux (e.g. Raspberry Pi) ' +
          'or Windows for a standalone tower emulator. See docs/MACOS_BLE_PERIPHERAL_LIMITATION.md.',
        );
        _disWarningLogged = true;
      }
      await bleno.setServicesAsync(services);
      console.log('[TowerEmulator] services set — tower ready');
      this._advertising = true;
      this._isStarting = false;
      this.setState('advertising');
    } catch (err) {
      console.error('[TowerEmulator] startAdvertising failed:', err);
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
    this._isStarting = false;
    if (!this._advertising) return;
    this._advertising = false;

    console.log(`[TowerEmulator] stopAdvertising (was ${this._state})`);

    const wasConnected = this._state === 'connected';

    bleno.removeListener('accept', this._onAccept);
    bleno.removeListener('disconnect', this._onDisconnect);

    // Reset session fields that _onDisconnect would normally clear but cannot,
    // because its listener is removed before bleno.disconnect() fires.
    this._txUpdateValue = null;
    this._connectedAddress = 'unknown';
    this._lastCommand = null;

    bleno.disconnect();   // no-op on macOS, but kept for Linux/other platforms
    await bleno.stopAdvertisingAsync();

    // If we were connected, bleno.disconnect() is a no-op on macOS so
    // _onDisconnect never fired. Emit manually for proper bookkeeping
    // (relay.broadcastPaused, logger, client notifications).
    if (wasConnected) {
      this.emit('companion-disconnected', 'unknown');
    }

    this.setState('idle');
  }

  /**
   * Fully tear down bleno listeners so the native addon can be finalized
   * without crashing. Call this once before process exit.
   */
  destroy(): void {
    bleno.removeListener('stateChange', this._onStateChange);
    bleno.removeListener('servicesSetError', this._onServicesSetError);
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
   * The last 20-byte command received from the companion app, as a number array,
   * or null if none received yet. Used by the {@link NotificationSynthesizer} as
   * the baseline for synthesized notifications (satisfies `NotificationSink`).
   */
  getLastCommand(): number[] | null {
    return this._lastCommand ? Array.from(this._lastCommand) : null;
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
