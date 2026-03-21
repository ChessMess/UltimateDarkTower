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
  CLOSE_CODE_PROTOCOL_VERSION_MISMATCH,
  makeTowerCommandMessage,
  makeSyncStateMessage,
  makeHostStatusMessage,
  makeHostLogConfigMessage,
  makeRelayPausedMessage,
  makeRelayResumedMessage,
  makeRelayTowerAlertMessage,
  PROTOCOL_VERSION,
  type TowerCommandBytes,
  type FakeTowerState,
  type ConnectedClient,
  type ClientConnectedMessage,
  type ClientDisconnectedMessage,
  type LogEntry,
} from '@dark-tower-sync/shared';
import { ConnectionManager } from './connectionManager';

/** Configuration options for {@link RelayServer}. */
export interface RelayServerOptions {
  /** TCP port the WebSocket server listens on. Default: 8765. */
  port?: number;
  /** Host/interface to bind. Default: '0.0.0.0' (all interfaces). */
  host?: string;
  /** Called when a client submits a batch of log entries via `client:log`. */
  onClientLog?: (clientId: string, entries: LogEntry[]) => void;
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
  private _seq = 0;

  private readonly port: number;
  private readonly host: string;
  private readonly onClientLog?: (clientId: string, entries: LogEntry[]) => void;

  constructor(options: RelayServerOptions = {}) {
    super();
    this.port = options.port ?? 8765;
    this.host = options.host ?? '0.0.0.0';
    this.onClientLog = options.onClientLog;
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

        // 3. Register the client (with handshake timeout).
        const { onHandshakeTimeout } = this.manager.add(clientId, socket);
        onHandshakeTimeout(() => {
          // Clean up and notify on handshake timeout.
          this.manager.remove(clientId);
          this.emit('client-change', this.manager.getAll());
        });
        this.emit('client-change', this.manager.getAll());

        // 4. Parse incoming messages.
        socket.on('message', (raw: Buffer) => {
          try {
            const msg = JSON.parse(raw.toString()) as { type?: string; payload?: Record<string, unknown> };
            if (msg.type === MessageType.CLIENT_HELLO && msg.payload) {
              this.manager.markHandshakeComplete(clientId);
              const clientVersion = (msg.payload as { protocolVersion?: string }).protocolVersion;
              if (clientVersion !== PROTOCOL_VERSION) {
                console.warn(`[relay] Client ${clientId} protocol mismatch: ${clientVersion} vs ${PROTOCOL_VERSION}`);
                const reason = `Protocol version mismatch: client=${clientVersion ?? 'unknown'} server=${PROTOCOL_VERSION}`;
                socket.close(CLOSE_CODE_PROTOCOL_VERSION_MISMATCH, reason);
                return;
              }
              const client = this.manager.get(clientId);
              if (client) {
                if ((msg.payload as { label?: string }).label) {
                  client.label = (msg.payload as { label?: string }).label;
                }
                if ((msg.payload as { observer?: boolean }).observer) {
                  client.observer = true;
                }
                // Re-broadcast updated client list.
                this.emit('client-change', this.manager.getAll());
              }
            } else if (msg.type === MessageType.CLIENT_READY && msg.payload) {
              const client = this.manager.get(clientId);
              if (client) {
                const ready = (msg.payload as { ready?: boolean }).ready ?? false;
                client.state = ready ? 'ready' : 'connected';
                client.towerConnected = ready;
                client.towerLastSeenAt = Date.now();

                // Broadcast tower alert so all clients know about this player's tower status.
                const alertMsg = makeRelayTowerAlertMessage(clientId, ready, client.label);
                this.manager.broadcast(JSON.stringify(alertMsg));

                this.emit('client-change', this.manager.getAll());
              }
            } else if (msg.type === MessageType.CLIENT_LOG && msg.payload) {
              const entries = (msg.payload as { entries?: LogEntry[] }).entries;
              if (entries && this.onClientLog) {
                this.onClientLog(clientId, entries);
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

    this.manager.destroy();

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
   * @returns The monotonic sequence number assigned to this command.
   */
  broadcast(data: TowerCommandBytes): number {
    const seq = ++this._seq;
    const message = makeTowerCommandMessage(data, seq);
    this.lastCommand = message.payload.data;
    this.lastCommandAt = message.timestamp;
    this.manager.broadcast(JSON.stringify(message));
    return seq;
  }

  /**
   * Broadcast a log-config message telling clients to enable or disable auto-send.
   */
  broadcastLogConfig(enabled: boolean): void {
    const message = makeHostLogConfigMessage(enabled);
    this.manager.broadcast(JSON.stringify(message));
  }

  /**
   * Update the reported fake tower state (used in host:status messages).
   */
  setFakeTowerState(state: FakeTowerState): void {
    this.fakeTowerState = state;
  }

  /**
   * Broadcast an immediate relay:paused message to all clients.
   * Called when the companion app disconnects from FakeTower.
   */
  broadcastPaused(reason: string): void {
    const message = makeRelayPausedMessage(reason);
    this.manager.broadcast(JSON.stringify(message));
    // Also push an immediate status update so clients don't wait for the 5s tick.
    this.broadcastStatus();
  }

  /**
   * Broadcast an immediate relay:resumed message to all clients.
   * Called when the companion app reconnects to FakeTower.
   */
  broadcastResumed(): void {
    const message = makeRelayResumedMessage();
    this.manager.broadcast(JSON.stringify(message));
    this.broadcastStatus();
  }

  private broadcastStatus(): void {
    const message = makeHostStatusMessage({
      relaying: this.wss !== null,
      fakeTowerState: this.fakeTowerState,
      appConnected: this.fakeTowerState === 'connected',
      clientCount: this.manager.count,
      towersConnected: this.manager.towersConnected,
      observerCount: this.manager.observersConnected,
      lastCommandAt: this.lastCommandAt,
    });
    this.manager.broadcast(JSON.stringify(message));
  }
}
