/**
 * RelayServer — WebSocket server that relays tower commands to remote clients.
 *
 * Connection lifecycle:
 *   1. Client connects → assigned a UUID, receives sync:state catchup.
 *   2. Client sends CLIENT_HELLO → label stored in ConnectionManager; once the
 *      handshake is accepted, all *other* clients receive a client:connected
 *      notification carrying the client's label.
 *   3. The tower source fires a command → broadcast() relays to all clients.
 *   4. Periodic host:status broadcast every 5 seconds.
 *   5. Client disconnects → client:disconnected broadcast to remaining clients
 *      (only for clients whose CLIENT_HELLO had completed).
 */

import { EventEmitter } from 'events';
import { WebSocketServer, type WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import {
  MessageType,
  CLOSE_CODE_PROTOCOL_VERSION_MISMATCH,
  makeTowerCommandMessage,
  makeSyncStateMessage,
  makeHostResendMessage,
  makeHostStatusMessage,
  makeHostLogConfigMessage,
  makeRelayPausedMessage,
  makeRelayResumedMessage,
  makeRelayTowerAlertMessage,
  PROTOCOL_VERSION,
  type TowerCommandBytes,
  type TowerEmulatorState,
  type ConnectedClient,
  type ClientConnectedMessage,
  type ClientDisconnectedMessage,
  type LogEntry,
} from 'ultimatedarktowerrelay-shared';
import { ConnectionManager } from './connectionManager';

/** Configuration options for {@link RelayServer}. */
export interface RelayServerOptions {
  /** TCP port the WebSocket server listens on. Default: 8765. */
  port?: number;
  /** Host/interface to bind. Default: '0.0.0.0' (all interfaces). */
  host?: string;
  /** Called when a client submits a batch of log entries via `client:log`. */
  onClientLog?: (clientId: string, entries: LogEntry[]) => void;
  /** Called when a client completes the CLIENT_HELLO handshake. */
  onClientConnected?: (clientId: string, label?: string, observer?: boolean) => void;
  /** Called when a client's WebSocket connection closes. */
  onClientDisconnected?: (clientId: string, label?: string) => void;
  /** Called when a client sends CLIENT_READY (tower BLE connect/disconnect). */
  onClientReady?: (clientId: string, ready: boolean, label?: string) => void;
  /**
   * Called when a *participant* client reports a player action via CLIENT_ACTION
   * (e.g. `dropSkull`). Actions from observer clients are rejected and never
   * reach this callback (PRD §4.4).
   */
  onClientAction?: (clientId: string, action: 'dropSkull', label?: string) => void;
}

interface RelayServerEventMap {
  'client-change': [clients: ConnectedClient[]];
}

/**
 * RelayServer manages the WebSocket relay between the host machine and all
 * connected remote consumer clients.
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
  private towerEmulatorState: TowerEmulatorState = 'idle';
  private statusInterval: ReturnType<typeof setInterval> | null = null;
  private _seq = 0;

  private readonly port: number;
  private readonly host: string;
  private readonly onClientLog?: (clientId: string, entries: LogEntry[]) => void;
  private readonly onClientConnected?: (clientId: string, label?: string, observer?: boolean) => void;
  private readonly onClientDisconnected?: (clientId: string, label?: string) => void;
  private readonly onClientReady?: (clientId: string, ready: boolean, label?: string) => void;
  private readonly onClientAction?: (clientId: string, action: 'dropSkull', label?: string) => void;

  constructor(options: RelayServerOptions = {}) {
    super();
    this.port = options.port ?? 8765;
    this.host = options.host ?? '0.0.0.0';
    this.onClientLog = options.onClientLog;
    this.onClientConnected = options.onClientConnected;
    this.onClientDisconnected = options.onClientDisconnected;
    this.onClientReady = options.onClientReady;
    this.onClientAction = options.onClientAction;
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
        // Swap the startup reject listener for a persistent handler: a post-start
        // 'error' with no listener would crash the process with an uncaught
        // exception. (The first such error would otherwise hit the resolved
        // reject as a no-op and consume the once listener.)
        wss.removeListener('error', reject);
        wss.on('error', (err) => console.error('[relay] WebSocket server error:', err));
        this.statusInterval = setInterval(() => this.broadcastStatus(), 5000);
        resolve();
      });

      wss.once('error', reject);

      wss.on('connection', (socket: WebSocket) => {
        const clientId = randomUUID();

        // Send state catchup to the new client. The client:connected broadcast
        // is deferred until CLIENT_HELLO is accepted (so it can carry the label
        // and is only sent for clients that pass the version check).
        socket.send(JSON.stringify(makeSyncStateMessage(this.lastCommand)));

        // Register the client (with handshake timeout).
        const { onHandshakeTimeout } = this.manager.add(clientId, socket);
        onHandshakeTimeout(() => {
          // Clean up and notify on handshake timeout.
          this.manager.remove(clientId);
          this.emit('client-change', this.manager.getAll());
        });
        this.emit('client-change', this.manager.getAll());

        // Parse incoming messages.
        socket.on('message', (raw: Buffer) => {
          try {
            const msg = JSON.parse(raw.toString()) as { type?: string; payload?: Record<string, unknown> };
            if (msg.type === MessageType.CLIENT_HELLO && msg.payload) {
              // Always clear the handshake timer, even on a version mismatch.
              this.manager.markHandshakeComplete(clientId);
              // Ignore a duplicate hello so we don't re-broadcast the join.
              if (this.manager.isHelloComplete(clientId)) return;
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
                this.manager.markHelloComplete(clientId);
                // Announce the join to existing peers now that the handshake is
                // accepted — carries the label, and skips the joining client so
                // it is not told about its own arrival.
                const connectedMsg: ClientConnectedMessage = {
                  type: MessageType.CLIENT_CONNECTED,
                  payload: { clientId, label: client.label },
                  timestamp: new Date().toISOString(),
                };
                this.manager.broadcast(JSON.stringify(connectedMsg), clientId);
                // Re-broadcast updated client list.
                this.emit('client-change', this.manager.getAll());
                this.onClientConnected?.(clientId, client.label, client.observer);
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
                this.onClientReady?.(clientId, ready, client.label);
              }
            } else if (msg.type === MessageType.CLIENT_ACTION && msg.payload) {
              const client = this.manager.get(clientId);
              const action = (msg.payload as { action?: string }).action;
              if (client && !client.observer && action === 'dropSkull') {
                this.onClientAction?.(clientId, action, client.label);
              } else if (client?.observer) {
                console.warn(`[relay] Ignoring action '${action ?? 'unknown'}' from observer ${clientId}`);
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

        // Clean up on disconnect.
        let cleaned = false;
        const handleClose = (): void => {
          if (cleaned) return;
          cleaned = true;
          const label = this.manager.get(clientId)?.label;
          // Only announce a disconnect for a client whose join was announced
          // (i.e. it completed CLIENT_HELLO). A handshake timeout or version
          // mismatch never fired client:connected, so it must not fire
          // client:disconnected / onClientDisconnected either.
          const wasAnnounced = this.manager.isHelloComplete(clientId);
          this.manager.remove(clientId);
          if (wasAnnounced) {
            this.onClientDisconnected?.(clientId, label);
            const disconnectedMsg: ClientDisconnectedMessage = {
              type: MessageType.CLIENT_DISCONNECTED,
              payload: { clientId },
              timestamp: new Date().toISOString(),
            };
            this.manager.broadcast(JSON.stringify(disconnectedMsg));
          }
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
   * Re-broadcast the last tower command as a host:resend message (distinct from
   * a live tower:command) so clients can catch up on an operator-triggered
   * resend without it being mistaken for a new app command.
   *
   * @returns `true` if a message was sent, `false` if there is no stored command.
   */
  resendLastCommand(): boolean {
    if (!this.lastCommand) return false;
    const message = makeHostResendMessage(this.lastCommand);
    this.manager.broadcast(JSON.stringify(message));
    return true;
  }

  /**
   * Broadcast a log-config message telling clients to enable or disable auto-send.
   */
  broadcastLogConfig(enabled: boolean): void {
    const message = makeHostLogConfigMessage(enabled);
    this.manager.broadcast(JSON.stringify(message));
  }

  /**
   * Update the reported tower emulator state (used in host:status messages).
   */
  setTowerEmulatorState(state: TowerEmulatorState): void {
    this.towerEmulatorState = state;
  }

  /**
   * Broadcast an immediate relay:paused message to all clients.
   * Called when the companion app disconnects from TowerEmulator.
   */
  broadcastPaused(reason: string): void {
    const message = makeRelayPausedMessage(reason);
    this.manager.broadcast(JSON.stringify(message));
    // Also push an immediate status update so clients don't wait for the 5s tick.
    this.broadcastStatus();
  }

  /**
   * Broadcast an immediate relay:resumed message to all clients.
   * Called when the companion app reconnects to TowerEmulator.
   */
  broadcastResumed(): void {
    const message = makeRelayResumedMessage();
    this.manager.broadcast(JSON.stringify(message));
    this.broadcastStatus();
  }

  private broadcastStatus(): void {
    const message = makeHostStatusMessage({
      relaying: this.wss !== null,
      towerEmulatorState: this.towerEmulatorState,
      appConnected: this.towerEmulatorState === 'connected',
      clientCount: this.manager.count,
      towersConnected: this.manager.towersConnected,
      observerCount: this.manager.observersConnected,
      lastCommandAt: this.lastCommandAt,
    });
    this.manager.broadcast(JSON.stringify(message));
  }
}
