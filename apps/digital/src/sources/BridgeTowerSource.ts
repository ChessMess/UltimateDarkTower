/**
 * The official-app bridge (PRD-05 FR-05.4 / FR-05.5).
 *
 * A `TowerStateSource` that lets the official companion app drive UTDD's tower.
 * The app connects over BLE to a relay host (`apps/relay-cli` or
 * `apps/relay-electron`, both running `relay-core`'s `TowerEmulator`), which
 * broadcasts every decoded command over WebSocket; this source consumes that
 * stream and reports the player's skull drops back so the host synthesizes the
 * tower→app notification a real tower would have sent.
 *
 * It **wraps** a `ManualTowerSource` rather than replacing it. The 3D stage
 * captures the store's tower source once at mount (`TowerBoardStage`), so a
 * runtime swap would leave the scene painting a dead object. Wrapping keeps one
 * instance for the app's lifetime: disconnected, every call falls through to the
 * inner manual source and UTDD behaves exactly as it did before the bridge
 * existed; connected, remote state takes over and the player's actions go out
 * over the wire.
 */
import type { TowerState } from 'ultimatedarktower';
import {
  RelayClient,
  type RelayClientEvent,
  type WebSocketConstructor,
} from 'ultimatedarktowerrelay-client';
import { ManualTowerSource } from './ManualTowerSource';
import { detectSealReveal } from './sealReveal';
import type { SealRef, TowerStateSource, Unsubscribe } from './types';

/** Where the relay connection currently stands, for the bridge UI. */
export interface RelayStatus {
  state:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    /** The companion app dropped its BLE link to the host; the game is on hold. */
    | 'paused'
    | 'reconnecting'
    | 'error'
    /** Terminal: host and client speak different protocol versions. Reload required. */
    | 'version-mismatch';
  /** Human-readable detail for the non-happy states. */
  detail?: string;
}

export interface BridgeTowerSourceOptions {
  /** WebSocket implementation. Defaults to the browser global; tests inject a mock. */
  webSocketImpl?: WebSocketConstructor;
  /** Display name sent to the relay host in the handshake. */
  label?: string;
  /** Overrides the Local Network Access wait (see {@link awaitLocalNetworkGrant}). Tests inject this. */
  awaitLocalNetworkGrant?: () => Promise<boolean>;
}

const sameSeal = (a: SealRef, b: SealRef): boolean => a.level === b.level && a.side === b.side;

const describeError = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Wait for the player's answer to Chrome's Local Network Access prompt.
 *
 * Chrome gates a public-origin page reaching loopback behind a permission
 * ("<site> wants to: Access other apps and services on this device") — shipped
 * in Chrome 142, extended to WebSockets in 147. The catch is that **the request
 * which triggers the prompt is itself aborted**, instantly, with a bare
 * `CLOSE 1006`. So on the deployed build a first-time player's Connect always
 * fails while the dialog is still on screen, and the panel goes red at the exact
 * moment they did the right thing.
 *
 * Resolves `true` once the permission is granted, so the caller can retry.
 * Deliberately **not** a fixed delay: the abort is instantaneous but the click
 * takes however long the player needs to read, so any timeout is a coin flip.
 * A browser without this permission (Firefox, Safari, older Chrome) throws on
 * `query()` — there is no gate there, so nothing to wait for.
 */
async function awaitLocalNetworkGrant(timeoutMs = 30_000): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({
      name: 'local-network-access' as PermissionName,
    });
    if (status.state !== 'prompt') return status.state === 'granted';

    return await new Promise<boolean>((resolve) => {
      const settle = (granted: boolean): void => {
        clearTimeout(timer);
        status.onchange = null;
        resolve(granted);
      };
      const timer = setTimeout(() => settle(false), timeoutMs);
      status.onchange = () => {
        if (status.state !== 'prompt') settle(status.state === 'granted');
      };
    });
  } catch {
    return false;
  }
}

export class BridgeTowerSource implements TowerStateSource {
  private readonly inner: ManualTowerSource;
  private readonly options: BridgeTowerSourceOptions;
  private client: RelayClient | null = null;
  private readonly statusListeners = new Set<(status: RelayStatus) => void>();
  private _status: RelayStatus = { state: 'disconnected' };
  /** Guards the async permission wait against a newer connect/disconnect. */
  private connectGeneration = 0;

  /**
   * Skull drops this source has reported. Deliberately *not* read from
   * `TowerState.beam.count`: every command the app writes carries its own beam
   * count (bytes 15-16), so remote state would clobber the player's count on the
   * next command. Only used while connected — disconnected, the inner manual
   * source's count is authoritative.
   */
  private skullDrops: number;

  constructor(
    inner: ManualTowerSource = new ManualTowerSource(),
    options: BridgeTowerSourceOptions = {},
  ) {
    this.inner = inner;
    this.options = options;
    this.skullDrops = inner.getSkullDropCount();
  }

  // ── relay connection ──────────────────────────────────────────────────────

  get status(): RelayStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this.client?.isConnected ?? false;
  }

  /** Subscribe to connection-status changes. Fires immediately with the current status. */
  onStatus(listener: (status: RelayStatus) => void): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this._status);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Connect to a relay host (e.g. `ws://localhost:8765`). Never rejects — a
   * failed connect lands in `status` as `error`, which is what the UI renders.
   *
   * A first failure is retried **once**, but only after the Local Network Access
   * permission is actually granted — see {@link awaitLocalNetworkGrant} for why
   * the first attempt from the hosted build is expected to fail.
   */
  async connect(url: string): Promise<void> {
    this.disconnect();
    const generation = ++this.connectGeneration;
    this.setStatus({ state: 'connecting' });

    const attempt = async (): Promise<void> => {
      const client = new RelayClient({
        label: this.options.label ?? 'UTDD',
        webSocketImpl: this.options.webSocketImpl,
        onEvent: (event) => this.onRelayEvent(event),
      });
      this.client = client;
      await client.connect(url);
    };

    try {
      await attempt();
      return;
    } catch (err) {
      const waitForGrant = this.options.awaitLocalNetworkGrant ?? awaitLocalNetworkGrant;
      const granted = await waitForGrant();
      // The player may have hit Disconnect, or started a new connect, while we
      // were waiting on the prompt — that supersedes this attempt entirely.
      if (generation !== this.connectGeneration) return;

      if (granted) {
        try {
          await attempt();
          return;
        } catch (retryErr) {
          if (generation !== this.connectGeneration) return;
          this.setStatus({ state: 'error', detail: describeError(retryErr) });
          return;
        }
      }
      this.setStatus({ state: 'error', detail: describeError(err) });
    }
  }

  /** Close the relay connection and fall back to local, player-driven behaviour. */
  disconnect(): void {
    // Bump unconditionally: an in-flight connect may be parked on the permission
    // prompt with no client assigned yet, and it must not resurrect afterwards.
    this.connectGeneration++;
    if (!this.client) return;
    this.client.disconnect();
    this.client = null;
    this.setStatus({ state: 'disconnected' });
  }

  private onRelayEvent(event: RelayClientEvent): void {
    switch (event.type) {
      case 'relay:connected':
        this.setStatus({ state: 'connected' });
        break;
      case 'relay:disconnected':
        // A version mismatch also closes the socket, but its own event follows
        // and must win — don't overwrite a terminal status with a plain one.
        if (this._status.state !== 'version-mismatch') this.setStatus({ state: 'disconnected' });
        break;
      case 'relay:reconnecting':
        this.setStatus({ state: 'reconnecting', detail: `attempt ${event.attempt}` });
        break;
      case 'relay:reconnect-failed':
        this.setStatus({ state: 'error', detail: `gave up after ${event.attempts} attempts` });
        break;
      case 'relay:version-mismatch':
        // RelayClient will not auto-reconnect from close code 4000.
        this.setStatus({ state: 'version-mismatch', detail: event.reason });
        break;
      case 'relay:paused':
        this.setStatus({ state: 'paused', detail: event.reason });
        break;
      case 'relay:resumed':
        this.setStatus({ state: 'connected' });
        break;
      case 'state':
        this.applyRemoteState(event.state);
        break;
      default:
        // Roster/log/status chatter the tower source doesn't act on.
        break;
    }
  }

  private setStatus(status: RelayStatus): void {
    // Several paths land on the same status (closing the socket fires
    // `relay:disconnected` *and* returns to `disconnect()`); don't re-render for
    // a status that didn't change.
    if (this._status.state === status.state && this._status.detail === status.detail) return;
    this._status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  /**
   * Adopt an app-driven tower state, carrying the local broken-seal set across
   * (the protocol has no seal field) and auto-breaking the seal the app is
   * revealing, if it named one unambiguously.
   */
  private applyRemoteState(state: TowerState): void {
    const seals = this.inner.getBrokenSeals();
    const revealed = detectSealReveal(state);
    if (revealed && !seals.some((s) => sameSeal(s, revealed))) seals.push(revealed);
    this.inner.load(state, seals);
  }

  /** Re-emit the current state so subscribers re-read a derived value that changed. */
  private reemit(): void {
    this.inner.load(this.inner.getState(), this.inner.getBrokenSeals());
  }

  // ── TowerStateSource ──────────────────────────────────────────────────────

  getState(): TowerState {
    return this.inner.getState();
  }

  subscribe(listener: (state: TowerState) => void): Unsubscribe {
    return this.inner.subscribe(listener);
  }

  getSkullDropCount(): number {
    return this.isConnected ? this.skullDrops : this.inner.getSkullDropCount();
  }

  dropSkull(): void {
    if (!this.isConnected) {
      this.inner.dropSkull();
      return;
    }
    this.skullDrops += 1;
    this.client!.dropSkull();
    this.reemit();
  }

  getBrokenSeals(): SealRef[] {
    return this.inner.getBrokenSeals();
  }

  breakSeal(seal: SealRef): void {
    // Stays local in both modes: a real tower cannot detect a snapped seal, so
    // there is no notification to synthesize and nothing to send upstream.
    this.inner.breakSeal(seal);
  }

  restoreSeal(seal: SealRef): void {
    this.inner.restoreSeal(seal);
  }

  rotateDrum(drumIndex: 0 | 1 | 2, position: 0 | 1 | 2 | 3): void {
    // While connected the app owns the drums; a local rotation would be undone
    // by its next command anyway.
    if (this.isConnected) return;
    this.inner.rotateDrum(drumIndex, position);
  }

  /**
   * Hydrate from a loaded `GameSession`. Connected, the tower state is transient
   * — the app's next command replaces it — but the seals and the skull count are
   * UTDD-owned and do carry over.
   */
  load(state: TowerState, brokenSeals: SealRef[]): void {
    this.skullDrops = state.beam.count;
    this.inner.load(state, brokenSeals);
  }

  dispose(): void {
    this.disconnect();
    this.statusListeners.clear();
    this.inner.dispose();
  }
}
