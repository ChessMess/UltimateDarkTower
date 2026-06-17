/**
 * RealTower — a {@link TowerSource} that relays a *physical* tower's state.
 *
 * Instead of advertising a fake peripheral the official app connects to,
 * RealTower connects to a real Return to Dark Tower as a BLE **central** (via
 * UltimateDarkTower's `NodeBluetoothAdapter`), subscribes to its notifications,
 * and emits each as a `command` event so the relay broadcasts the tower's state
 * to digital consumers. This is the selectable "real master tower" source from
 * PRD FR-5.1 — the foundation of Sync's "master tower → remote mirrors" model.
 *
 * It is **read-only**: it mirrors the tower's state outward and does not write
 * commands to the tower (a write-back/driving path is a future addition).
 *
 * Hardware/loading notes:
 *   - The Node adapter (and `@stoprocent/noble`) are loaded **lazily** at
 *     `startAdvertising()` time via `BluetoothAdapterFactory.create(NODE)` —
 *     importing this module never loads noble. Tests inject a mock
 *     `IBluetoothAdapter`, so they need no Bluetooth and no noble.
 *   - `@stoprocent/noble` is an *optional* dependency; if it is missing or its
 *     native build failed, `startAdvertising()` rejects with a clear message.
 */

import { EventEmitter } from 'events';
import {
  BluetoothAdapterFactory,
  BluetoothPlatform,
  UART_SERVICE_UUID,
  DIS_SERVICE_UUID,
  TOWER_DEVICE_NAME,
  type IBluetoothAdapter,
} from 'ultimatedarktower';
import type { TowerSource, TowerSourceEventMap } from './towerSource';
import { TOWER_COMMAND_LENGTH } from './commandParser';

/** Options for {@link RealTower}. */
export interface RealTowerOptions {
  /**
   * A Bluetooth adapter to use instead of the default Node adapter. Inject a
   * mock implementing `IBluetoothAdapter` for tests; omit to lazily create a
   * `NodeBluetoothAdapter` (which loads `@stoprocent/noble`) at connect time.
   */
  adapter?: IBluetoothAdapter;
  /** BLE device name to scan for. Default: `TOWER_DEVICE_NAME` (`ReturnToDarkTower`). */
  deviceName?: string;
  /** GATT service UUIDs to discover. Default: `[UART_SERVICE_UUID, DIS_SERVICE_UUID]`. */
  serviceUuids?: string[];
}

/**
 * RealTower connects to a physical tower and relays its notifications.
 *
 * Note: the `TowerSource` seam method names (`startAdvertising` /
 * `stopAdvertising`) read awkwardly here — for a real tower they mean
 * "begin/stop connecting" — but they are kept so RealTower is interchangeable
 * with `FakeTower` / `MockTower`.
 *
 * @example
 * ```ts
 * const tower = new RealTower();
 * tower.on('command', (data) => relay.broadcast(data));
 * await tower.startAdvertising(); // connects to the real tower
 * ```
 */
export class RealTower extends EventEmitter<TowerSourceEventMap> implements TowerSource {
  private readonly _injectedAdapter?: IBluetoothAdapter;
  private readonly _deviceName: string;
  private readonly _serviceUuids: string[];

  private _adapter: IBluetoothAdapter | null = null;
  private _connecting = false;
  /** Guards the adapter's onDisconnect from firing a spurious pause during an intentional stop. */
  private _intentionalStop = false;

  constructor(options: RealTowerOptions = {}) {
    super();
    this._injectedAdapter = options.adapter;
    this._deviceName = options.deviceName ?? TOWER_DEVICE_NAME;
    this._serviceUuids = options.serviceUuids ?? [UART_SERVICE_UUID, DIS_SERVICE_UUID];
  }

  /**
   * Connect to the physical tower and begin relaying its notifications.
   * Rejects if the adapter cannot be created or the connection fails.
   */
  async startAdvertising(): Promise<void> {
    if (this._adapter || this._connecting) return;
    this._connecting = true;
    this._intentionalStop = false;

    try {
      const adapter = this._injectedAdapter ?? this.createNodeAdapter();

      // Wire callbacks before connecting so no early notification is missed.
      adapter.onCharacteristicValueChanged((data: Uint8Array) => {
        // Relay only full 20-byte state packets. A real tower also emits frequent
        // short notifications (e.g. 5-byte battery heartbeats `07 00 00 0c 10`)
        // that are not relayable state and would otherwise flood the relay's
        // invalid-command warning.
        if (data.length !== TOWER_COMMAND_LENGTH) return;
        this.emit('command', Buffer.from(data));
      });
      adapter.onDisconnect(() => this.handleAdapterDisconnect());
      adapter.onBluetoothAvailabilityChanged((available: boolean) => {
        if (!available) this.handleAdapterDisconnect();
      });

      console.log(`[RealTower] connecting to "${this._deviceName}"…`);
      await adapter.connect(this._deviceName, this._serviceUuids);

      this._adapter = adapter;
      this._connecting = false;
      console.log('[RealTower] connected — relaying tower notifications');
      this.emit('state-change', 'connected');
      this.emit('companion-connected', this._deviceName);
    } catch (err) {
      this._connecting = false;
      this._adapter = null;
      console.error('[RealTower] connect failed:', err);
      this.emit('state-change', 'error');
      throw err;
    }
  }

  /** Disconnect from the physical tower and release the adapter. */
  async stopAdvertising(): Promise<void> {
    this._connecting = false;
    this._intentionalStop = true;
    const adapter = this._adapter;
    this._adapter = null;

    if (adapter) {
      try {
        await adapter.disconnect();
      } catch (err) {
        console.warn('[RealTower] disconnect error:', err);
      }
      try {
        await adapter.cleanup();
      } catch (err) {
        console.warn('[RealTower] cleanup error:', err);
      }
    }

    this.emit('state-change', 'idle');
  }

  /** True while connected to the physical tower. */
  isConnected(): boolean {
    return this._adapter !== null;
  }

  // ── private ───────────────────────────────────────────────────────────────

  /** Handle an unexpected tower disconnect (not an intentional stopAdvertising). */
  private handleAdapterDisconnect(): void {
    if (this._intentionalStop || !this._adapter) return;
    console.log('[RealTower] tower disconnected');
    this._adapter = null;
    this.emit('state-change', 'idle');
    this.emit('companion-disconnected', this._deviceName);
  }

  /** Lazily create the Node BLE adapter, with a clear error if noble is unavailable. */
  private createNodeAdapter(): IBluetoothAdapter {
    try {
      return BluetoothAdapterFactory.create(BluetoothPlatform.NODE);
    } catch (err) {
      throw new Error(
        'RealTower: could not load the Node BLE adapter. The real-tower path needs the optional ' +
          'native dependency "@stoprocent/noble" — install it and ensure its native build succeeded. ' +
          `Original error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
