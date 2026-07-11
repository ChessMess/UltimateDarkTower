/**
 * RealTower — a {@link TowerSource} that relays a *physical* tower's state, with
 * live-play resilience (FR-5.3) and an optional write-back path (bridge mode).
 *
 * RealTower drives a real Return to Dark Tower through UltimateDarkTower's
 * **high-level `UltimateDarkTower` class** (Node/`@stoprocent/noble` adapter),
 * subscribes to its raw notifications, and emits each 20-byte state packet as a
 * `command` event so the relay broadcasts the tower's state to consumers. This
 * is the selectable "real master tower" source from PRD FR-5.1.
 *
 * Resilience (FR-5.3) — **delegated to the library, not reimplemented:**
 *   - `UltimateDarkTower` runs connection-health + battery-heartbeat monitoring
 *     (GATT check, verified-heartbeat with a near-miss second chance) and fires
 *     `onTowerDisconnect` on a real drop. RealTower adds only the **reconnect
 *     policy**: on `onTowerDisconnect` it reconnects with capped exponential
 *     backoff (re-emitting `companion-disconnected`/`-connected` → relay
 *     pause/resume), and it retries the initial connect in the background so the
 *     relay can start before the tower is powered on. This follows UDT's
 *     documented reconnect pattern (`docs/api/connection.md`): on disconnect,
 *     call `connect()` again (`cleanup()` is for final shutdown only).
 *
 * Verbatim relaying uses UDT's `onTowerResponse` hook — the **raw** notification
 * bytes — so the exact 20-byte packet is forwarded (not a re-encoded decode).
 *
 * Write-back ({@link sendToTower}): forwards a command verbatim to the tower via
 * `sendTowerCommandDirect`. Used by the CLI's `bridge` mode.
 *
 * Loading/testing: the Node driver (and `@stoprocent/noble`) load **lazily** when
 * `startAdvertising()` constructs `new UltimateDarkTower({ platform: NODE })` —
 * importing this module never loads noble. Tests inject a mock {@link TowerDriver},
 * so they need no Bluetooth and no noble.
 */

import { EventEmitter } from 'events';
import { UltimateDarkTower, BluetoothPlatform, TOWER_DEVICE_NAME } from 'ultimatedarktower';
import type { TowerSource, TowerSourceEventMap } from './towerSource';
import { TOWER_COMMAND_LENGTH } from './commandParser';

/**
 * The minimal high-level tower-driver surface RealTower needs. UDT's
 * `UltimateDarkTower` satisfies it structurally (`onTowerResponse` /
 * `onTowerDisconnect` assignable callbacks; `connect`/`disconnect`/
 * `sendTowerCommandDirect`). Inject a mock in tests.
 */
export interface TowerDriver {
  /** Raw bytes of each non-battery tower notification (assignable). */
  onTowerResponse: (response: Uint8Array) => void;
  /** Fired by the library's monitoring on a real disconnect (assignable). */
  onTowerDisconnect: () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendTowerCommandDirect(command: Uint8Array): Promise<void>;
}

/** Options for {@link RealTower}. */
export interface RealTowerOptions {
  /**
   * A tower driver to use instead of the default Node `UltimateDarkTower`. Inject
   * a mock for tests; omit to lazily create `new UltimateDarkTower({ platform:
   * NODE })` (which loads `@stoprocent/noble`) at connect time.
   */
  driver?: TowerDriver;
  /**
   * Auto-reconnect on a drop, and retry the initial connect in the background.
   * Default: `true`. When `false`, a connect failure rejects `startAdvertising()`
   * and a drop does not reconnect.
   */
  reconnect?: boolean;
  /** Base reconnect backoff in ms (doubles per attempt). Default: 1000. */
  reconnectBaseMs?: number;
  /** Max reconnect backoff in ms. Default: 30000. */
  reconnectMaxMs?: number;
}

/** Format an unknown error for logging. */
function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * RealTower connects to a physical tower (via UDT's `UltimateDarkTower`) and
 * relays its notifications, reconnecting on drops.
 *
 * The `TowerSource` method names (`startAdvertising`/`stopAdvertising`) read
 * awkwardly for a central — they mean "begin/stop connecting" — but are kept so
 * RealTower is interchangeable with `TowerEmulator` / `MockTower`.
 *
 * @example
 * ```ts
 * const tower = new RealTower();
 * tower.on('command', (data) => relay.broadcast(data));
 * await tower.startAdvertising(); // connects (retries if the tower isn't on yet)
 * ```
 */
export class RealTower extends EventEmitter<TowerSourceEventMap> implements TowerSource {
  private readonly _injectedDriver?: TowerDriver;
  private readonly _reconnect: boolean;
  private readonly _reconnectBaseMs: number;
  private readonly _reconnectMaxMs: number;

  private _driver: TowerDriver | null = null;
  private _connected = false;
  private _starting = false;
  /** Guards the library's onTowerDisconnect from firing a spurious pause during an intentional stop. */
  private _intentionalStop = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _reconnectAttempts = 0;

  constructor(options: RealTowerOptions = {}) {
    super();
    this._injectedDriver = options.driver;
    this._reconnect = options.reconnect ?? true;
    this._reconnectBaseMs = options.reconnectBaseMs ?? 1000;
    this._reconnectMaxMs = options.reconnectMaxMs ?? 30_000;
  }

  /**
   * Connect to the physical tower and begin relaying its notifications. With
   * `reconnect` enabled, a transient initial-connect failure does not reject —
   * it retries in the background. Rejects only if the driver cannot be created,
   * or (with `reconnect: false`) if the connection fails.
   */
  async startAdvertising(): Promise<void> {
    if (this._connected || this._starting) return;
    this._starting = true;
    this._intentionalStop = false;

    // Create + wire the driver once; reused across reconnects (callbacks persist
    // on the instance, and the library manages its own adapter on reconnect).
    if (!this._driver) {
      try {
        this._driver = this._injectedDriver ?? this.createDriver();
        this.wireDriver(this._driver);
      } catch (err) {
        this._starting = false;
        this.emit('state-change', 'error');
        throw err; // noble missing/broken — a config error, never transient
      }
    }

    try {
      await this.connectOnce();
      this._starting = false;
    } catch (err) {
      this._starting = false;
      if (this._reconnect) {
        console.warn(`[RealTower] initial connect failed, will retry: ${errMessage(err)}`);
        this.emit('state-change', 'idle');
        this.scheduleReconnect();
        return;
      }
      this.emit('state-change', 'error');
      throw err;
    }
  }

  /** Disconnect from the physical tower and release the driver. */
  async stopAdvertising(): Promise<void> {
    this._starting = false;
    this._intentionalStop = true;
    this._connected = false;
    this.clearReconnectTimer();

    const driver = this._driver;
    this._driver = null;
    if (driver) {
      try {
        // disconnect() (not cleanup()) — cleanup disposes the instance; we may be
        // shutting the source down but disconnect is sufficient and symmetrical.
        await driver.disconnect();
      } catch (err) {
        console.warn('[RealTower] disconnect error:', err);
      }
    }

    this.emit('state-change', 'idle');
  }

  /**
   * Write-back: forward a command **verbatim** to the tower (bridge mode). No
   * length filter — short app packets (e.g. the calibration opcode) are valid.
   * No-op when not connected; the reconnect loop restores the link.
   */
  async sendToTower(data: Uint8Array): Promise<void> {
    if (!this._connected || !this._driver) {
      console.warn('[RealTower] sendToTower ignored — tower not connected');
      return;
    }
    await this._driver.sendTowerCommandDirect(data);
  }

  /** True while connected to the physical tower. */
  isConnected(): boolean {
    return this._connected;
  }

  // ── private ───────────────────────────────────────────────────────────────

  /** Wire the driver callbacks once; they persist across reconnects. */
  private wireDriver(driver: TowerDriver): void {
    driver.onTowerResponse = (data: Uint8Array) => {
      // Relay only full 20-byte state packets. (Battery heartbeats are delivered
      // to the library's own battery callback, not here.)
      if (data.length !== TOWER_COMMAND_LENGTH) return;
      this.emit('command', Buffer.from(data));
    };
    driver.onTowerDisconnect = () => this.handleDrop();
  }

  /** A single connect attempt against the driver. */
  private async connectOnce(): Promise<void> {
    console.log(`[RealTower] connecting to "${TOWER_DEVICE_NAME}"…`);
    this.emit('state-change', 'advertising'); // "attempting to connect"
    await this._driver!.connect();
    this._connected = true;
    this._reconnectAttempts = 0;
    console.log('[RealTower] connected — relaying tower notifications');
    this.emit('state-change', 'connected');
    this.emit('companion-connected', TOWER_DEVICE_NAME);
  }

  /** Handle a library-detected disconnect. */
  private handleDrop(): void {
    if (this._intentionalStop) return;
    // Dedup: ignore a late disconnect signal once we're already reconnecting.
    if (!this._connected && this._reconnectTimer) return;

    const wasConnected = this._connected;
    this._connected = false;
    console.log('[RealTower] tower disconnected');

    // Only signal a pause if we were actually connected (not during initial retry).
    if (wasConnected) {
      this.emit('state-change', 'idle');
      this.emit('companion-disconnected', TOWER_DEVICE_NAME);
    }

    if (this._reconnect) this.scheduleReconnect();
  }

  /** Schedule the next reconnect attempt with capped exponential backoff. */
  private scheduleReconnect(): void {
    if (this._intentionalStop || this._reconnectTimer) return;
    const delay = Math.min(this._reconnectBaseMs * 2 ** this._reconnectAttempts, this._reconnectMaxMs);
    this._reconnectAttempts++;
    console.log(`[RealTower] reconnecting in ${delay}ms (attempt ${this._reconnectAttempts})`);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._intentionalStop) return;
      // Documented UDT reconnect pattern: just call connect() again.
      void this.connectOnce().catch((err) => {
        console.warn(`[RealTower] reconnect attempt failed: ${errMessage(err)}`);
        this.emit('state-change', 'idle');
        this.scheduleReconnect();
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  /** Lazily create the Node tower driver, with a clear error if noble is unavailable. */
  private createDriver(): TowerDriver {
    try {
      return new UltimateDarkTower({ platform: BluetoothPlatform.NODE });
    } catch (err) {
      throw new Error(
        'RealTower: could not create the Node tower driver. The real-tower path needs the optional ' +
          'native dependency "@stoprocent/noble" — install it and ensure its native build succeeded. ' +
          `Original error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
