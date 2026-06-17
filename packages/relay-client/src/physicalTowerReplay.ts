/**
 * PhysicalTowerReplay — mirrors relayed tower state onto a *local physical
 * tower* via an injected UltimateDarkTower-style driver.
 *
 * This is the FR-5.2 "remote mirror" consumer Sync's remote players use. The
 * host has a master tower (a real tower, or the official app driving a
 * FakeTower) whose 20-byte state is relayed over WebSocket; each remote player
 * runs a {@link RelayClient} *and* a PhysicalTowerReplay that writes every
 * relayed command to their own tower so it physically mirrors the master.
 * (Digital, screen-only consumers — UTDD — render `RelayClient`'s decoded
 * `state` events instead and do not use this class.)
 *
 * Design:
 *   - **Transport stays in `RelayClient`.** PhysicalTowerReplay exposes
 *     {@link handleEvent}; the app fans `RelayClient`'s single `onEvent` out to
 *     both its own UI handler and `replay.handleEvent` (composition, no new
 *     subscriber API) — exactly as Sync's `app.ts` renders *and* replays in one
 *     event switch.
 *   - **Framework-agnostic + unit-testable.** The local tower is an injected
 *     {@link TowerWriter} (UDT's `UltimateDarkTower` satisfies it structurally);
 *     this module imports no `ultimatedarktower` value and no browser global, so
 *     it can be unit-tested with a mock writer — no browser, no BLE, no
 *     hardware.
 *   - **Lifecycle stays in the app.** Web Bluetooth connect/calibrate needs a
 *     user gesture, so the browser app owns the tower lifecycle and calls
 *     {@link setTower} / {@link replayLast} (and `client.sendReady()`) on the
 *     tower's `onCalibrationComplete` / `onTowerDisconnect` callbacks.
 */

import type { RelayClientEvent } from './relayClient';

/**
 * Length of a full tower command/state packet: 1 command byte + 19 state bytes.
 * (`relayClient.ts` hard-codes the same `20`; `client` must not import `core`,
 * which would pull in bleno.)
 */
const TOWER_COMMAND_LENGTH = 20;

/**
 * The minimal write surface PhysicalTowerReplay needs from a local tower driver.
 *
 * UDT's `UltimateDarkTower` satisfies this structurally (`get isConnected`,
 * `get isCalibrated`, `async sendTowerCommandDirect(Uint8Array)`), so the
 * browser app injects `new UltimateDarkTower()` directly. Tests inject a mock.
 * Kept self-contained (no `ultimatedarktower` import) so the SDK pins no UDT
 * version for this surface.
 */
export interface TowerWriter {
  /** True while a BLE connection to the tower is open. */
  readonly isConnected: boolean;
  /** True once the tower has finished calibration and can accept state writes. */
  readonly isCalibrated: boolean;
  /** Write a raw command/state packet to the tower. */
  sendTowerCommandDirect(command: Uint8Array): Promise<void>;
}

/** Options for {@link PhysicalTowerReplay}. */
export interface PhysicalTowerReplayOptions {
  /** The local tower driver. May be set/cleared later via {@link PhysicalTowerReplay.setTower}. */
  tower?: TowerWriter | null;
  /**
   * Optional diagnostics hook, called on each write attempt's result. `error`
   * is present only when the tower write rejected.
   */
  onLog?: (message: string, error?: unknown) => void;
}

/**
 * PhysicalTowerReplay turns relayed commands into local-tower writes.
 *
 * @example
 * ```ts
 * const replay = new PhysicalTowerReplay({ onLog });
 * const client = new RelayClient({
 *   onEvent: (e) => { replay.handleEvent(e); appUiHandler(e); },
 * });
 * // on tower calibration-complete (app-driven, browser user gesture):
 * replay.setTower(tower);
 * client.sendReady(true);
 * void replay.replayLast(); // self-heal a tower that reconnected mid-session
 * ```
 */
export class PhysicalTowerReplay {
  private tower: TowerWriter | null;
  private readonly onLog: (message: string, error?: unknown) => void;
  private lastCommand: number[] | null = null;
  /** Serializes writes so concurrent relayed commands can't interleave BLE writes. */
  private queue: Promise<void> = Promise.resolve();

  constructor(options: PhysicalTowerReplayOptions = {}) {
    this.tower = options.tower ?? null;
    this.onLog = options.onLog ?? (() => undefined);
  }

  /**
   * Set (or clear, with `null`) the local tower driver — e.g. on tower connect /
   * disconnect. A tower reconnect typically supplies a fresh driver instance.
   */
  setTower(tower: TowerWriter | null): void {
    this.tower = tower;
  }

  /** The last relayed 20-byte command seen (cached for self-heal replay), or null. */
  getLastCommand(): number[] | null {
    return this.lastCommand;
  }

  /**
   * Route a {@link RelayClient} event here. Command-bearing events
   * (`tower:command`, non-null `sync:state`, `host:resend`) are cached and queued
   * for write to the local tower; all other events are ignored. (`state` is
   * deliberately *not* handled — it would double-write alongside `tower:command`
   * / `sync:state`.)
   */
  handleEvent(event: RelayClientEvent): void {
    switch (event.type) {
      case 'tower:command':
        void this.enqueue(event.data, event.seq);
        break;
      case 'sync:state':
        if (event.lastCommand) void this.enqueue(event.lastCommand, null);
        break;
      case 'host:resend':
        void this.enqueue(event.data, null);
        break;
      default:
        break;
    }
  }

  /**
   * Replay the last cached command on the local tower. Call on local-tower
   * reconnect / calibration-complete to self-heal a tower that missed commands
   * while disconnected (FR-5.3). Resolves immediately if nothing has been relayed
   * yet. The returned promise never rejects (write errors are routed to `onLog`).
   */
  replayLast(): Promise<void> {
    if (!this.lastCommand) return Promise.resolve();
    return this.enqueue(this.lastCommand, null);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** Cache the (valid) command and chain its write onto the serialized queue. */
  private enqueue(data: number[], seq: number | null): Promise<void> {
    // Only ever cache/replay a full 20-byte command, so a stray short packet
    // can't become the self-heal baseline.
    if (data.length !== TOWER_COMMAND_LENGTH) return Promise.resolve();
    this.lastCommand = data;
    // The outer `.catch` is defensive: `write()` already routes expected write
    // rejections to `onLog`, but this guarantees one failure can't leave the
    // queue rejected and drop every later command.
    const next = this.queue.then(() => this.write(data, seq)).catch(() => undefined);
    this.queue = next;
    return next;
  }

  /** Write a command to the local tower if it is ready, surfacing the result via onLog. */
  private async write(data: number[], seq: number | null): Promise<void> {
    const tower = this.tower;
    // Tower-ready gate: only write to a connected, calibrated tower.
    if (!tower || !tower.isConnected || !tower.isCalibrated) return;
    try {
      await tower.sendTowerCommandDirect(new Uint8Array(data));
      this.onLog(`Replayed command on tower${seq !== null ? ` (seq ${seq})` : ''}`);
    } catch (err) {
      // Swallow so the queue survives for the next command; surface via onLog.
      this.onLog('Tower write failed', err);
    }
  }
}
