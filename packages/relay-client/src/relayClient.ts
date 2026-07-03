/**
 * RelayClient — framework-agnostic consumer SDK for UltimateDarkTowerRelay.
 *
 * A consumer (a tower-mirror client, a screen-only visualizer, or any other
 * digital consumer) uses RelayClient to:
 *   1. Open a WebSocket to the host relay and complete the CLIENT_HELLO handshake.
 *   2. Receive `sync:state` on connect to catch up to the current tower state.
 *   3. Receive `tower:command` messages, decoded into a `TowerState`.
 *   4. As a *participant*, report player actions (`dropSkull()`) that drive the
 *      relay's synthesized tower→app notifications.
 *   5. Auto-reconnect with exponential backoff, refusing to reconnect on a
 *      protocol-version mismatch (a hard reload is required).
 *
 * Lineage: evolved from UltimateDarkTowerSync's `towerRelay.ts`. The `onEvent`
 * union is kept a superset of Sync's so Sync can later adopt this SDK with low
 * churn. It is framework-agnostic (no React/DOM-framework dependency) and
 * isomorphic: it uses the global `WebSocket` in the browser, or an injected
 * implementation (e.g. the `ws` package) in Node.
 */

import {
  MessageType,
  PROTOCOL_VERSION,
  CLOSE_CODE_PROTOCOL_VERSION_MISMATCH,
  makeClientReadyMessage,
  makeClientActionMessage,
  type RelayMessage,
  type TowerCommandMessage,
  type SyncStateMessage,
  type ClientHelloMessage,
  type HostStatus,
} from 'ultimatedarktowerrelay-shared';
import {
  rtdt_unpack_state,
  createDefaultTowerState,
  TOWER_STATE_DATA_OFFSET,
  type TowerState,
} from 'ultimatedarktower';

// ---------------------------------------------------------------------------
// Isomorphic WebSocket
// ---------------------------------------------------------------------------

/** The standard `WebSocket.OPEN` ready-state value (1). */
const WS_OPEN = 1;

/**
 * Minimal browser-`WebSocket`-shaped surface RelayClient uses. Both the browser
 * global `WebSocket` and the `ws` package's `WebSocket` satisfy it.
 */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, listener: (event: any) => void): void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Constructor for a {@link WebSocketLike} (the browser global, or injected `ws`). */
export type WebSocketConstructor = new (url: string) => WebSocketLike;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Events emitted to the consumer to drive UI / source updates. */
export type RelayClientEvent =
  | { type: 'relay:connected' }
  | { type: 'relay:disconnected'; code: number; reason: string }
  | { type: 'relay:reconnecting'; attempt: number; delayMs: number }
  | { type: 'relay:reconnect-failed'; attempts: number }
  | { type: 'relay:error'; error: unknown }
  | { type: 'relay:paused'; reason: string }
  | { type: 'relay:resumed' }
  | { type: 'relay:version-mismatch'; reason: string }
  | { type: 'tower:command'; data: number[]; seq: number | null }
  | { type: 'sync:state'; lastCommand: number[] | null }
  /** Decoded tower state, emitted after each `tower:command` and non-null `sync:state`. */
  | { type: 'state'; state: TowerState; lastCommand: number[] }
  | { type: 'client:connected'; clientId: string; label?: string }
  | { type: 'client:disconnected'; clientId: string }
  | { type: 'host:status'; status: HostStatus }
  | { type: 'host:log-config'; enabled: boolean }
  | { type: 'relay:tower:alert'; clientId: string; label?: string; towerConnected: boolean }
  | { type: 'host:resend'; data: number[] };

export type RelayClientEventHandler = (event: RelayClientEvent) => void;

/** Options for {@link RelayClient}. */
export interface RelayClientOptions {
  /** Display name sent in CLIENT_HELLO. */
  label?: string;
  /**
   * Whether this client is an observer (read-only). Observers cannot drive
   * synthesized notifications — the relay rejects `dropSkull()` from them.
   * Defaults to `false` (participant).
   */
  observer?: boolean;
  /** Called for each relay event. */
  onEvent?: RelayClientEventHandler;
  /**
   * WebSocket implementation. Defaults to the global `WebSocket` (browsers). In
   * Node (no stable global `WebSocket` until v22), pass the `ws` package's
   * `WebSocket`.
   */
  webSocketImpl?: WebSocketConstructor;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const CONNECTION_TIMEOUT_MS = 15_000;

/**
 * RelayClient manages the WebSocket connection to the relay host, decodes tower
 * state, and forwards participant actions.
 *
 * @example
 * ```ts
 * const client = new RelayClient({ label: 'Player 2', onEvent: handle });
 * await client.connect('ws://192.168.1.5:8765');
 * client.dropSkull(); // participant action
 * ```
 */
export class RelayClient {
  private ws: WebSocketLike | null = null;
  private readonly label: string | undefined;
  private readonly observer: boolean;
  private readonly onEvent: RelayClientEventHandler;
  private readonly wsCtor: WebSocketConstructor;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private lastUrl: string | null = null;
  private autoReconnect = true;

  private currentState: TowerState = createDefaultTowerState();
  private lastCommand: number[] | null = null;

  constructor(options: RelayClientOptions = {}) {
    this.label = options.label;
    this.observer = options.observer ?? false;
    this.onEvent = options.onEvent ?? (() => undefined);

    const ctor =
      options.webSocketImpl ??
      (globalThis as { WebSocket?: WebSocketConstructor }).WebSocket;
    if (!ctor) {
      throw new Error(
        'RelayClient: no WebSocket implementation available. In Node, pass ' +
          "`webSocketImpl` (e.g. the 'ws' package's WebSocket).",
      );
    }
    this.wsCtor = ctor;
  }

  /**
   * Open a WebSocket connection to the relay host and start handling messages.
   * Resolves once the socket is open and the handshake is sent. Rejects on a 15s
   * connection timeout or a socket error before the connection opens; an initial
   * connect that fails this way does **not** start a background reconnect loop
   * (auto-reconnect only kicks in after a connection has been established).
   *
   * @param url - WebSocket URL of the relay host (e.g. `ws://192.168.1.5:8765`).
   */
  async connect(url: string): Promise<void> {
    return this.connectInternal(url, false);
  }

  /**
   * Shared connect implementation. `fromRetry` distinguishes a user-initiated
   * connect (the awaited `connect()`) from a background reconnect attempt driven
   * by {@link scheduleReconnect}, so a pre-open failure can decide correctly
   * whether to give up (initial) or continue the backoff loop (retry).
   */
  private connectInternal(url: string, fromRetry: boolean): Promise<void> {
    this.clearReconnectTimer();
    this.lastUrl = url;
    // A fresh user-initiated connect (re)enables auto-reconnect. A retry keeps
    // whatever the loop already set, so a mid-loop connect can't reset it.
    if (!fromRetry) this.autoReconnect = true;

    return new Promise<void>((resolve, reject) => {
      const ws = new this.wsCtor(url);
      let settled = false;
      let opened = false;

      // Pre-open failure (timeout or socket error before 'open'). Owns the retry
      // decision so we don't depend on the close event's status code, which
      // varies by environment for a never-opened socket.
      const failPreOpen = (error: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          ws.close();
        } catch {
          // ignore — the socket may already be closing
        }
        if (fromRetry) {
          // A retry attempt failed before opening — keep the backoff loop going.
          this.scheduleReconnect();
        } else {
          // An initial (awaited) connect failed — do not start a background loop.
          this.autoReconnect = false;
        }
        reject(error);
      };

      const timeout = setTimeout(() => {
        failPreOpen(new Error('Connection timed out — host did not respond within 15 seconds'));
      }, CONNECTION_TIMEOUT_MS);

      ws.addEventListener('open', () => {
        if (settled) return;
        settled = true;
        opened = true;
        clearTimeout(timeout);

        this.ws = ws;
        this.reconnectAttempts = 0;

        const hello: ClientHelloMessage = {
          type: MessageType.CLIENT_HELLO,
          payload: {
            label: this.label,
            protocolVersion: PROTOCOL_VERSION,
            observer: this.observer || undefined,
          },
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(hello));

        this.onEvent({ type: 'relay:connected' });
        resolve();
      });

      ws.addEventListener('message', (event: { data: unknown }) => {
        const raw =
          typeof event.data === 'string'
            ? event.data
            : ((event.data as { toString?: () => string })?.toString?.() ?? '');
        try {
          this.handleMessage(JSON.parse(raw) as RelayMessage);
        } catch {
          // Ignore malformed messages.
        }
      });

      ws.addEventListener('close', (event: { code: number; reason: string }) => {
        clearTimeout(timeout);
        // A socket that never opened is handled by failPreOpen; ignore its close
        // so the two paths don't both drive the outcome.
        if (!opened) return;

        this.ws = null;
        this.onEvent({ type: 'relay:disconnected', code: event.code, reason: event.reason });

        // Version mismatch — do NOT auto-reconnect; a hard reload is required.
        if (event.code === CLOSE_CODE_PROTOCOL_VERSION_MISMATCH) {
          this.autoReconnect = false;
          this.onEvent({ type: 'relay:version-mismatch', reason: event.reason });
          return;
        }

        // Auto-reconnect on non-clean close of an established connection.
        if (this.autoReconnect && event.code !== 1000) {
          this.scheduleReconnect();
        }
      });

      ws.addEventListener('error', (event: unknown) => {
        this.onEvent({ type: 'relay:error', error: event });
        failPreOpen(new Error('WebSocket connection failed'));
      });
    });
  }

  /**
   * Report a participant player action: a dropped skull. The relay synthesizes
   * the matching tower→app notification. No-op (returns false) if not connected.
   * Observers are rejected by the relay.
   */
  dropSkull(): boolean {
    if (!this.isConnected) return false;
    this.ws!.send(JSON.stringify(makeClientActionMessage('dropSkull')));
    return true;
  }

  /** Signal to the host that this client's (physical) tower is calibrated and ready. */
  sendReady(ready: boolean): void {
    if (!this.isConnected) return;
    this.ws!.send(JSON.stringify(makeClientReadyMessage(ready)));
  }

  /**
   * Send a pre-serialized client→host message verbatim. An escape hatch for
   * consumers that build their own messages — e.g. a client-side logger pushing
   * `client:log` batches the host persists (the relay accepts `client:log`).
   * No-op when not connected. Prefer the typed methods (`dropSkull`, `sendReady`)
   * for the actions they cover.
   */
  sendRaw(json: string): void {
    if (!this.isConnected) return;
    this.ws!.send(json);
  }

  /** Close the WebSocket connection cleanly (no auto-reconnect). */
  disconnect(): void {
    this.autoReconnect = false;
    this.clearReconnectTimer();
    this.ws?.close(1000, 'User disconnected');
    this.ws = null;
  }

  /** The most recently decoded tower state (default state before any command). */
  getState(): TowerState {
    return this.currentState;
  }

  /** The last raw 20-byte command received, or null. */
  getLastCommand(): number[] | null {
    return this.lastCommand;
  }

  /** True if the WebSocket connection is currently open. */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WS_OPEN;
  }

  // ---------------------------------------------------------------------------
  // Message handling
  // ---------------------------------------------------------------------------

  private handleMessage(message: RelayMessage): void {
    switch (message.type) {
      case MessageType.TOWER_COMMAND:
        this.handleTowerCommand(message);
        break;
      case MessageType.SYNC_STATE:
        this.handleSyncState(message);
        break;
      case MessageType.HOST_STATUS:
        this.onEvent({ type: 'host:status', status: message.payload });
        break;
      case MessageType.CLIENT_CONNECTED:
        this.onEvent({ type: 'client:connected', clientId: message.payload.clientId, label: message.payload.label });
        break;
      case MessageType.CLIENT_DISCONNECTED:
        this.onEvent({ type: 'client:disconnected', clientId: message.payload.clientId });
        break;
      case MessageType.HOST_LOG_CONFIG:
        this.onEvent({ type: 'host:log-config', enabled: message.payload.enabled });
        break;
      case MessageType.RELAY_PAUSED:
        this.onEvent({ type: 'relay:paused', reason: message.payload.reason });
        break;
      case MessageType.RELAY_RESUMED:
        this.onEvent({ type: 'relay:resumed' });
        break;
      case MessageType.RELAY_TOWER_ALERT:
        this.onEvent({
          type: 'relay:tower:alert',
          clientId: message.payload.clientId,
          label: message.payload.label,
          towerConnected: message.payload.towerConnected,
        });
        break;
      case MessageType.HOST_RESEND:
        this.onEvent({ type: 'host:resend', data: message.payload.data });
        break;
      default:
        // Client→host types (hello/ready/action/log) and unknowns: ignore.
        break;
    }
  }

  private handleTowerCommand(message: TowerCommandMessage): void {
    const data = message.payload.data;
    this.onEvent({ type: 'tower:command', data, seq: message.payload.seq ?? null });
    this.applyCommand(data);
  }

  private handleSyncState(message: SyncStateMessage): void {
    const lastCommand = message.payload.lastCommand;
    this.onEvent({ type: 'sync:state', lastCommand });
    if (lastCommand) this.applyCommand(lastCommand);
  }

  /** Decode a 20-byte command into the current TowerState and emit a `state` event. */
  private applyCommand(data: number[]): void {
    if (data.length < 20) return;
    this.lastCommand = data;
    // Strip the 1-byte command header; rtdt_unpack_state expects 19 state bytes.
    this.currentState = rtdt_unpack_state(new Uint8Array(data).subarray(TOWER_STATE_DATA_OFFSET));
    this.onEvent({ type: 'state', state: this.currentState, lastCommand: data });
  }

  // ---------------------------------------------------------------------------
  // Auto-reconnect
  // ---------------------------------------------------------------------------

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.autoReconnect = false;
      this.onEvent({ type: 'relay:reconnect-failed', attempts: this.reconnectAttempts });
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;
    this.onEvent({ type: 'relay:reconnecting', attempt: this.reconnectAttempts, delayMs: delay });
    this.reconnectTimer = setTimeout(() => {
      if (this.lastUrl && this.autoReconnect) {
        void this.connectInternal(this.lastUrl, true).catch(() => {
          // A retry rejection is expected on failure — connectInternal(fromRetry)
          // has already scheduled the next attempt (or the loop hit its cap).
        });
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
