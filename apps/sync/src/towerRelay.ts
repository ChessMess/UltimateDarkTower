/**
 * TowerRelay — WebSocket client + tower command replay via Web Bluetooth.
 *
 * TowerRelay:
 *   1. Opens a WebSocket connection to the host relay server.
 *   2. Performs the CLIENT_HELLO handshake.
 *   3. Receives sync:state on connect to catch up to the current tower state.
 *   4. Receives tower:command messages and replays them on the local physical
 *      tower using the UltimateDarkTower library (Web Bluetooth).
 *
 * See docs/PROTOCOL.md for the full message lifecycle.
 */

import {
  MessageType,
  PROTOCOL_VERSION,
  makeClientReadyMessage,
  type RelayMessage,
  type TowerCommandMessage,
  type SyncStateMessage,
  type ClientHelloMessage,
  type HostStatus,
} from '@dark-tower-sync/shared';

/** Events emitted to the caller to drive UI updates. */
export type TowerRelayEvent =
  | { type: 'relay:connected' }
  | { type: 'relay:disconnected'; code: number; reason: string }
  | { type: 'relay:reconnecting'; attempt: number; delayMs: number }
  | { type: 'relay:error'; error: Event }
  | { type: 'relay:paused'; reason: string }
  | { type: 'relay:resumed' }
  | { type: 'tower:command'; data: number[]; seq: number | null }
  | { type: 'sync:state'; lastCommand: number[] | null }
  | { type: 'client:connected'; clientId: string; label?: string }
  | { type: 'client:disconnected'; clientId: string }
  | { type: 'host:status'; status: HostStatus }
  | { type: 'host:log-config'; enabled: boolean }
  | { type: 'relay:tower:alert'; clientId: string; label?: string; towerConnected: boolean };

export type TowerRelayEventHandler = (event: TowerRelayEvent) => void;

/** Options for {@link TowerRelay}. */
export interface TowerRelayOptions {
  /** Display name sent in the CLIENT_HELLO message. */
  label?: string;
  /** Whether this client is an observer (no physical tower, visualizer only). */
  observer?: boolean;
  /** Called for each relay event (connection changes, received commands). */
  onEvent?: TowerRelayEventHandler;
}

/**
 * TowerRelay manages the WebSocket connection to the host and the Web Bluetooth
 * connection to the player's local physical tower.
 *
 * @example
 * ```ts
 * const relay = new TowerRelay({ label: 'Player 2', onEvent: handleEvent });
 * await relay.connect('ws://192.168.1.5:8765');
 * ```
 */
export class TowerRelay {
  private ws: WebSocket | null = null;
  private readonly label: string | undefined;
  private readonly observer: boolean;
  private readonly onEvent: TowerRelayEventHandler;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private lastUrl: string | null = null;
  private autoReconnect = true;

  constructor(options: TowerRelayOptions = {}) {
    this.label = options.label;
    this.observer = options.observer ?? false;
    this.onEvent = options.onEvent ?? (() => undefined);
  }

  /**
   * Open a WebSocket connection to the relay host and start handling messages.
   *
   * @param url - WebSocket URL of the relay host (e.g., 'ws://192.168.1.5:8765').
   */
  async connect(url: string): Promise<void> {
    // Guard against reconnect timer race — cancel any pending reconnect.
    this.clearReconnectTimer();

    this.lastUrl = url;
    this.autoReconnect = true;

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.addEventListener('open', () => {
        this.ws = ws;
        this.reconnectAttempts = 0;

        // Send CLIENT_HELLO handshake.
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

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data as string) as RelayMessage;
          this.handleMessage(message);
        } catch {
          // Ignore malformed messages.
        }
      });

      ws.addEventListener('close', (event) => {
        this.ws = null;
        this.onEvent({
          type: 'relay:disconnected',
          code: event.code,
          reason: event.reason,
        });

        // Auto-reconnect on non-clean close.
        if (this.autoReconnect && event.code !== 1000) {
          this.scheduleReconnect();
        }
      });

      ws.addEventListener('error', (event) => {
        this.onEvent({ type: 'relay:error', error: event });
        // If the connection never opened, reject the promise.
        if (this.ws === null) {
          reject(new Error('WebSocket connection failed'));
        }
      });
    });
  }

  /** Signal to the host that this client's tower is calibrated and ready (or not). */
  sendReady(ready: boolean): void {
    if (!this.isConnected) return;
    this.ws!.send(JSON.stringify(makeClientReadyMessage(ready)));
  }

  /** Send a pre-serialized JSON string over the WebSocket (used by ClientLogger). */
  sendRaw(json: string): void {
    if (!this.isConnected) return;
    this.ws!.send(json);
  }

  /** Close the WebSocket connection cleanly. */
  disconnect(): void {
    this.autoReconnect = false;
    this.clearReconnectTimer();
    this.ws?.close(1000, 'User disconnected');
    this.ws = null;
  }

  /**
   * Returns true if the WebSocket connection is currently open.
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ---------------------------------------------------------------------------
  // Private message handling
  // ---------------------------------------------------------------------------

  /** Dispatch an incoming relay message to the appropriate handler. */
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
        this.onEvent({
          type: 'client:connected',
          clientId: message.payload.clientId,
          label: message.payload.label,
        });
        break;
      case MessageType.CLIENT_DISCONNECTED:
        this.onEvent({
          type: 'client:disconnected',
          clientId: message.payload.clientId,
        });
        break;
      case MessageType.HOST_LOG_CONFIG:
        this.onEvent({
          type: 'host:log-config',
          enabled: message.payload.enabled,
        });
        break;
      case MessageType.RELAY_PAUSED:
        this.onEvent({
          type: 'relay:paused',
          reason: message.payload.reason,
        });
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
      default:
        // Unknown message type — ignore safely.
        break;
    }
  }

  /** Emit a tower command event to the caller for UI display and tower replay. */
  private handleTowerCommand(message: TowerCommandMessage): void {
    this.onEvent({ type: 'tower:command', data: message.payload.data, seq: message.payload.seq ?? null });
  }

  /** Emit a sync state event so the caller can replay the last command on connect. */
  private handleSyncState(message: SyncStateMessage): void {
    this.onEvent({ type: 'sync:state', lastCommand: message.payload.lastCommand });
  }

  // ---------------------------------------------------------------------------
  // Auto-reconnect
  // ---------------------------------------------------------------------------

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;
    this.onEvent({ type: 'relay:reconnecting', attempt: this.reconnectAttempts, delayMs: delay });
    this.reconnectTimer = setTimeout(() => {
      if (this.lastUrl && this.autoReconnect) {
        void this.connect(this.lastUrl).catch(() => {
          // connect() rejects on error — reconnect will be scheduled by the
          // close handler if autoReconnect is still true.
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
