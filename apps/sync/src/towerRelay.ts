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
} from '@dark-tower-sync/shared';
import type { RelayMessage, TowerCommandMessage, SyncStateMessage } from '@dark-tower-sync/shared';

/** Events emitted to the caller to drive UI updates. */
export type TowerRelayEvent =
  | { type: 'relay:connected' }
  | { type: 'relay:disconnected'; code: number; reason: string }
  | { type: 'relay:error'; error: Event }
  | { type: 'tower:command'; data: number[] }
  | { type: 'sync:state'; lastCommand: number[] | null };

export type TowerRelayEventHandler = (event: TowerRelayEvent) => void;

/** Options for {@link TowerRelay}. */
export interface TowerRelayOptions {
  /** Display name sent in the CLIENT_HELLO message. */
  label?: string;
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
  private readonly onEvent: TowerRelayEventHandler;

  constructor(options: TowerRelayOptions = {}) {
    this.label = options.label;
    this.onEvent = options.onEvent ?? (() => undefined);
  }

  /**
   * Open a WebSocket connection to the relay host and start handling messages.
   *
   * TODO: Implement full connection lifecycle:
   *   1. Instantiate `new WebSocket(url)`.
   *   2. On `open`: send CLIENT_HELLO with label and protocolVersion.
   *   3. On `message`: parse JSON, dispatch to handleMessage().
   *   4. On `close`: emit relay:disconnected event, schedule reconnect if desired.
   *   5. On `error`: emit relay:error event.
   *
   * @param url - WebSocket URL of the relay host (e.g., 'ws://192.168.1.5:8765').
   */
  async connect(url: string): Promise<void> {
    // TODO: Implement WebSocket connection.
    void url;
    throw new Error('TowerRelay.connect() is not yet implemented.');
  }

  /**
   * Close the WebSocket connection cleanly.
   *
   * TODO: Call `this.ws.close(1000, 'User disconnected')`.
   */
  disconnect(): void {
    // TODO: Implement disconnect.
    this.ws?.close();
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

  /**
   * Dispatch an incoming relay message to the appropriate handler.
   *
   * TODO: Add exhaustive handling for all {@link MessageType} values.
   */
  private handleMessage(message: RelayMessage): void {
    switch (message.type) {
      case MessageType.TOWER_COMMAND:
        this.handleTowerCommand(message);
        break;
      case MessageType.SYNC_STATE:
        this.handleSyncState(message);
        break;
      case MessageType.HOST_STATUS:
        // TODO: Surface host status in the UI.
        break;
      case MessageType.CLIENT_CONNECTED:
        // TODO: Log or display new client join events.
        break;
      case MessageType.CLIENT_DISCONNECTED:
        // TODO: Log or display client leave events.
        break;
      default:
        // Unknown message type — ignore safely.
        break;
    }
  }

  /**
   * Replay a tower command on the local physical tower.
   *
   * TODO: Implement using UltimateDarkTower:
   *   1. Ensure UltimateDarkTower is connected (Web Bluetooth).
   *   2. Write the raw command bytes directly to the tower characteristic.
   *      The UltimateDarkTower library exposes a low-level write method for this.
   *   3. Handle errors (tower disconnected, busy) gracefully.
   */
  private handleTowerCommand(message: TowerCommandMessage): void {
    this.onEvent({ type: 'tower:command', data: message.payload.data });
    // TODO: Replay on local tower via UltimateDarkTower Web Bluetooth write.
  }

  /**
   * Apply a full-state sync received on initial connection.
   *
   * TODO: If lastCommand is non-null, replay it immediately so the remote
   *       tower matches the host's current state before the next command arrives.
   */
  private handleSyncState(message: SyncStateMessage): void {
    this.onEvent({ type: 'sync:state', lastCommand: message.payload.lastCommand });
    // TODO: Replay lastCommand on local tower if non-null.
  }
}
