/**
 * RelayServer — WebSocket server that relays tower commands to remote clients.
 *
 * Connection lifecycle:
 *   1. Client connects → assigned a UUID, receives sync:state catchup.
 *   2. Client sends CLIENT_HELLO → label stored in ConnectionManager.
 *   3. All other clients receive client:connected notification.
 *   4. FakeTower fires onCommandReceived → broadcast() relays to all clients.
 *   5. Periodic host:status broadcast every 5 seconds.
 *   6. Client disconnects → client:disconnected broadcast to remaining clients.
 *
 * See docs/PROTOCOL.md for the full message protocol documentation.
 */

import { EventEmitter } from 'events';
import { WebSocketServer, type WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import {
  MessageType,
  makeTowerCommandMessage,
  makeSyncStateMessage,
  makeHostStatusMessage,
  PROTOCOL_VERSION,
  type TowerCommandBytes,
  type FakeTowerState,
  type ConnectedClient,
  type ClientConnectedMessage,
  type ClientDisconnectedMessage,
} from '@dark-tower-sync/shared';
import { ConnectionManager } from './connectionManager';

/** Configuration options for {@link RelayServer}. */
export interface RelayServerOptions {
  /** TCP port the WebSocket server listens on. Default: 8765. */
  port?: number;
  /** Host/interface to bind. Default: '0.0.0.0' (all interfaces). */
  host?: string;
}

interface RelayServerEventMap {
  'client-change': [clients: ConnectedClient[]];
}

/**
 * RelayServer manages the WebSocket relay between the host machine and all
 * connected remote player clients.
 *
 * Events:
 *   'client-change' — emitted whenever a client joins or leaves
 *
 * @example
 * ```ts
 * const server = new RelayServer({ port: 8765 });
 * await server.start();
 * server.broadcast(commandBytes);
 * ```
 */
export class RelayServer extends EventEmitter<RelayServerEventMap> {
  private wss: WebSocketServer | null = null;
  private manager: ConnectionManager = new ConnectionManager();
  private lastCommand: number[] | null = null;
  private lastCommandAt: string | null = null;
  private fakeTowerState: FakeTowerState = 'idle';
  private statusInterval: ReturnType<typeof setInterval> | null = null;

  private readonly port: number;
  private readonly host: string;

  constructor(options: RelayServerOptions = {}) {
    super();
    this.port = options.port ?? 8765;
    this.host = options.host ?? '0.0.0.0';
  }

  /**
   * Start the WebSocket server and begin accepting client connections.
   *
   * Resolves once the server is listening. Rejects on bind error.
   */
  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const wss = new WebSocketServer({ port: this.port, host: this.host });

      wss.once('listening', () => {
        this.wss = wss;
        this.statusInterval = setInterval(() => this.broadcastStatus(), 5000);
        resolve();
      });

      wss.once('error', reject);

      wss.on('connection', (socket: WebSocket) => {
        const clientId = randomUUID();

        // 1. Send state catchup to the new client before broadcasting its arrival.
        socket.send(JSON.stringify(makeSyncStateMessage(this.lastCommand)));

        // 2. Notify existing clients that a new peer joined.
        const connectedMsg: ClientConnectedMessage = {
          type: MessageType.CLIENT_CONNECTED,
          payload: { clientId },
          timestamp: new Date().toISOString(),
        };
        this.manager.broadcast(JSON.stringify(connectedMsg));

        // 3. Register the client.
        this.manager.add(clientId, socket);
        this.emit('client-change', this.manager.getAll());

        // 4. Parse CLIENT_HELLO to capture the player's chosen label.
        socket.on('message', (raw: Buffer) => {
          try {
            const msg = JSON.parse(raw.toString()) as { type?: string; payload?: { label?: string; protocolVersion?: string } };
            if (msg.type === MessageType.CLIENT_HELLO && msg.payload) {
              if (msg.payload.protocolVersion !== PROTOCOL_VERSION) {
                console.warn(`[relay] Client ${clientId} protocol mismatch: ${msg.payload.protocolVersion} vs ${PROTOCOL_VERSION}`);
              }
              const client = this.manager.get(clientId);
              if (client && msg.payload.label) {
                client.label = msg.payload.label;
                // Re-broadcast updated client list.
                this.emit('client-change', this.manager.getAll());
              }
            }
          } catch {
            // Ignore malformed messages.
          }
        });

        // 5. Clean up on disconnect.
        const handleClose = (): void => {
          this.manager.remove(clientId);
          const disconnectedMsg: ClientDisconnectedMessage = {
            type: MessageType.CLIENT_DISCONNECTED,
            payload: { clientId },
            timestamp: new Date().toISOString(),
          };
          this.manager.broadcast(JSON.stringify(disconnectedMsg));
          this.emit('client-change', this.manager.getAll());
        };

        socket.once('close', handleClose);
        socket.once('error', handleClose);
      });
    });
  }

  /**
   * Stop the WebSocket server and close all client connections.
   */
  async stop(): Promise<void> {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    return new Promise<void>((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }

  /**
   * Broadcast a raw tower command to all connected clients.
   *
   * Updates the lastCommand record for sync:state catchup of late joiners.
   */
  broadcast(data: TowerCommandBytes): void {
    const message = makeTowerCommandMessage(data);
    this.lastCommand = message.payload.data;
    this.lastCommandAt = message.timestamp;
    this.manager.broadcast(JSON.stringify(message));
  }

  /**
   * Update the reported fake tower state (used in host:status messages).
   */
  setFakeTowerState(state: FakeTowerState): void {
    this.fakeTowerState = state;
  }

  private broadcastStatus(): void {
    const message = makeHostStatusMessage({
      relaying: this.wss !== null,
      fakeTowerState: this.fakeTowerState,
      clientCount: this.manager.count,
      lastCommandAt: this.lastCommandAt,
    });
    this.manager.broadcast(JSON.stringify(message));
  }
}
