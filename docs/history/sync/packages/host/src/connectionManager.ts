/**
 * ConnectionManager — track and manage connected relay clients.
 *
 * Maintains the set of active WebSocket connections so the relay server can
 * broadcast commands to all clients, handle disconnections gracefully, and
 * report client counts in host status messages.
 */

import WebSocket from 'ws';
import type { ConnectedClient, ClientId } from '@dark-tower-sync/shared';

/** How long (ms) a client has to send CLIENT_HELLO before being kicked. */
const HANDSHAKE_TIMEOUT_MS = 10_000;

/** Interval (ms) between WebSocket-level ping frames. */
const PING_INTERVAL_MS = 20_000;

/**
 * ConnectionManager tracks all active WebSocket client connections to the relay
 * server, keyed by their assigned {@link ClientId}.
 *
 * @example
 * ```ts
 * const manager = new ConnectionManager();
 * manager.add(clientId, ws, { label: 'Player 2' });
 * manager.broadcast(JSON.stringify(message));
 * manager.remove(clientId);
 * ```
 */
export class ConnectionManager {
  private clients: Map<ClientId, { meta: ConnectedClient; socket: WebSocket; alive: boolean }> = new Map();
  private handshakeTimers: Map<ClientId, ReturnType<typeof setTimeout>> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Register a new client connection.
   *
   * Starts a handshake timeout that will remove the client if
   * {@link markHandshakeComplete} is not called within the grace period.
   *
   * @param id     - Unique ID for this client (e.g., UUID generated on connect).
   * @param socket - The raw WebSocket instance for this client.
   * @param meta   - Optional metadata (label, etc.) to associate with the client.
   * @returns A callback invoked if the handshake times out (so the caller can clean up).
   */
  add(
    id: ClientId,
    socket: WebSocket,
    meta?: Partial<Pick<ConnectedClient, 'label'>>,
  ): { onHandshakeTimeout: (cb: () => void) => void } {
    const client: ConnectedClient = {
      id,
      label: meta?.label,
      connectedAt: Date.now(),
      state: 'connected',
      towerConnected: false,
      towerLastSeenAt: null,
      observer: false,
    };
    this.clients.set(id, { meta: client, socket, alive: true });

    // Set up pong listener for keepalive.
    socket.on('pong', () => {
      const entry = this.clients.get(id);
      if (entry) entry.alive = true;
    });

    // Start ping interval on first client.
    if (this.pingInterval === null) {
      this.startPingInterval();
    }

    // Handshake timeout.
    let timeoutCb: (() => void) | null = null;
    const timer = setTimeout(() => {
      this.handshakeTimers.delete(id);
      const entry = this.clients.get(id);
      if (entry && entry.meta.state === 'connected' && !entry.meta.label) {
        console.warn(`[ConnectionManager] Client ${id} did not complete handshake within ${HANDSHAKE_TIMEOUT_MS}ms — removing`);
        socket.close(1008, 'Handshake timeout');
        timeoutCb?.();
      }
    }, HANDSHAKE_TIMEOUT_MS);
    this.handshakeTimers.set(id, timer);

    return {
      onHandshakeTimeout: (cb: () => void) => { timeoutCb = cb; },
    };
  }

  /**
   * Mark a client's handshake as complete (CLIENT_HELLO received).
   * Clears the handshake timeout.
   */
  markHandshakeComplete(id: ClientId): void {
    const timer = this.handshakeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.handshakeTimers.delete(id);
    }
  }

  /**
   * Remove a client by ID.
   * Called when the WebSocket `close` or `error` event fires.
   */
  remove(id: ClientId): void {
    const timer = this.handshakeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.handshakeTimers.delete(id);
    }
    this.clients.delete(id);

    // Stop ping interval when no clients remain.
    if (this.clients.size === 0 && this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Returns the {@link ConnectedClient} metadata for the given ID, or undefined.
   */
  get(id: ClientId): ConnectedClient | undefined {
    return this.clients.get(id)?.meta;
  }

  /**
   * Returns all currently connected client metadata records.
   */
  getAll(): ConnectedClient[] {
    return Array.from(this.clients.values()).map((c) => c.meta);
  }

  /**
   * The number of currently connected clients.
   */
  get count(): number {
    return this.clients.size;
  }

  /**
   * Count of clients whose physical tower BLE connection is active.
   */
  get towersConnected(): number {
    let n = 0;
    for (const { meta } of this.clients.values()) {
      if (meta.towerConnected) n++;
    }
    return n;
  }

  /**
   * Count of clients that are observers (no physical tower).
   */
  get observersConnected(): number {
    let n = 0;
    for (const { meta } of this.clients.values()) {
      if (meta.observer) n++;
    }
    return n;
  }

  /**
   * Broadcast a serialized message to all connected clients.
   *
   * Skips clients whose socket is not in the OPEN state and removes
   * stale sockets that fail to send.
   *
   * @param message - JSON string to send.
   */
  broadcast(message: string): void {
    for (const [id, { socket }] of this.clients.entries()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      try {
        socket.send(message);
      } catch (err) {
        console.warn(`[ConnectionManager] Send failed for ${id}, removing:`, err);
        this.remove(id);
      }
    }
  }

  /**
   * Send a message to a single client by ID.
   *
   * @param id      - Target client ID.
   * @param message - JSON string to send.
   * @returns true if the client was found and the message was sent.
   */
  sendTo(id: ClientId, message: string): boolean {
    const entry = this.clients.get(id);
    if (!entry || entry.socket.readyState !== WebSocket.OPEN) return false;
    try {
      entry.socket.send(message);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up all timers. Call on server shutdown.
   */
  destroy(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const timer of this.handshakeTimers.values()) {
      clearTimeout(timer);
    }
    this.handshakeTimers.clear();

    // Forcefully terminate all client sockets so wss.close() resolves promptly
    // during shutdown instead of waiting for graceful close handshakes.
    for (const { socket } of this.clients.values()) {
      socket.terminate();
    }
    this.clients.clear();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const [id, entry] of this.clients.entries()) {
        if (!entry.alive) {
          console.warn(`[ConnectionManager] Client ${id} did not respond to ping — terminating`);
          entry.socket.terminate();
          continue;
        }
        entry.alive = false;
        if (entry.socket.readyState === WebSocket.OPEN) {
          entry.socket.ping();
        }
      }
    }, PING_INTERVAL_MS);
  }
}
