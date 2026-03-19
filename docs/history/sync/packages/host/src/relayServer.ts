/**
 * RelayServer — WebSocket server that relays tower commands to remote clients.
 *
 * The relay server:
 *   1. Accepts WebSocket connections from remote player clients.
 *   2. Sends a CLIENT_HELLO handshake and sync:state catchup on connect.
 *   3. Broadcasts tower:command messages to all clients as commands arrive.
 *   4. Broadcasts client:connected / client:disconnected membership events.
 *   5. Sends periodic host:status updates.
 *
 * See docs/PROTOCOL.md for the full message protocol documentation.
 */

import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import { randomUUID } from 'crypto';
import {
  MessageType,
  makeTowerCommandMessage,
  makeSyncStateMessage,
  makeHostStatusMessage,
  PROTOCOL_VERSION,
} from '@dark-tower-sync/shared';
import type { TowerCommandBytes, HostStatus, FakeTowerState } from '@dark-tower-sync/shared';
import { ConnectionManager } from './connectionManager';

/** Configuration options for {@link RelayServer}. */
export interface RelayServerOptions {
  /** TCP port the WebSocket server listens on. Default: 8765. */
  port?: number;
  /** Host/interface to bind. Default: '0.0.0.0' (all interfaces). */
  host?: string;
}

/**
 * RelayServer manages the WebSocket relay between the host machine and all
 * connected remote player clients.
 *
 * @example
 * ```ts
 * const server = new RelayServer({ port: 8765 });
 * await server.start();
 *
 * // Called by FakeTower when a command is intercepted:
 * server.broadcast(commandBytes);
 * ```
 */
export class RelayServer {
  private wss: WebSocketServer | null = null;
  private manager: ConnectionManager = new ConnectionManager();
  private lastCommand: number[] | null = null;
  private fakeTowerState: FakeTowerState = 'idle';

  private readonly port: number;
  private readonly host: string;

  constructor(options: RelayServerOptions = {}) {
    this.port = options.port ?? 8765;
    this.host = options.host ?? '0.0.0.0';
  }

  /**
   * Start the WebSocket server and begin accepting client connections.
   *
   * TODO: Implement full connection lifecycle:
   *   1. Instantiate `new WebSocketServer({ port, host })`.
   *   2. On `connection` event: assign clientId (randomUUID), call manager.add().
   *   3. Send sync:state message to the new client with `this.lastCommand`.
   *   4. Broadcast client:connected to all other clients.
   *   5. On `message` event: parse CLIENT_HELLO, update client label in manager.
   *   6. On `close`/`error`: manager.remove(), broadcast client:disconnected.
   *   7. Start a periodic host:status broadcast interval.
   */
  async start(): Promise<void> {
    // TODO: Implement WebSocket server startup.
    throw new Error('RelayServer.start() is not yet implemented.');
  }

  /**
   * Stop the WebSocket server and close all client connections.
   *
   * TODO: Call `this.wss.close()` and clear the status broadcast interval.
   */
  async stop(): Promise<void> {
    // TODO: Implement graceful shutdown.
    throw new Error('RelayServer.stop() is not yet implemented.');
  }

  /**
   * Broadcast a raw tower command to all connected clients.
   *
   * Called by FakeTower's `onCommandReceived` callback each time the companion
   * app writes a new 20-byte command to the tower characteristic.
   *
   * TODO: Validate command bytes before relay (use CommandParser).
   *       Update `this.lastCommand` for sync:state catchup of late joiners.
   *
   * @param data - Raw 20-byte tower command bytes.
   */
  broadcast(data: TowerCommandBytes): void {
    // TODO: Implement broadcast.
    const message = makeTowerCommandMessage(data);
    this.lastCommand = message.payload.data;
    this.manager.broadcast(JSON.stringify(message));
  }

  /**
   * Update the reported fake tower state (used in host:status messages).
   *
   * @param state - New {@link FakeTowerState}.
   */
  setFakeTowerState(state: FakeTowerState): void {
    this.fakeTowerState = state;
  }

  /**
   * Build the current {@link HostStatus} snapshot.
   *
   * TODO: Track lastCommandAt timestamp alongside lastCommand bytes.
   */
  private getStatus(): HostStatus {
    return {
      relaying: this.wss !== null,
      fakeTowerState: this.fakeTowerState,
      clientCount: this.manager.count,
      lastCommandAt: null, // TODO: Track and return actual timestamp.
    };
  }

  /**
   * Send a host:status message to all connected clients.
   *
   * TODO: Call this on a periodic interval (e.g., every 5 seconds) and on
   *       significant state changes (client joins/leaves, tower state changes).
   */
  private broadcastStatus(): void {
    const message = makeHostStatusMessage(this.getStatus());
    this.manager.broadcast(JSON.stringify(message));
  }
}
