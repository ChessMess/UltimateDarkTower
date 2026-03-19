/**
 * ConnectionManager — track and manage connected relay clients.
 *
 * Maintains the set of active WebSocket connections so the relay server can
 * broadcast commands to all clients, handle disconnections gracefully, and
 * report client counts in host status messages.
 */

import type WebSocket from 'ws';
import type { ConnectedClient, ClientId } from '@dark-tower-sync/shared';

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
  private clients: Map<ClientId, { meta: ConnectedClient; socket: WebSocket }> = new Map();

  /**
   * Register a new client connection.
   *
   * TODO: Implement handshake timeout — remove client if CLIENT_HELLO is not
   *       received within a configurable grace period.
   *
   * @param id     - Unique ID for this client (e.g., UUID generated on connect).
   * @param socket - The raw WebSocket instance for this client.
   * @param meta   - Optional metadata (label, etc.) to associate with the client.
   */
  add(id: ClientId, socket: WebSocket, meta?: Partial<Pick<ConnectedClient, 'label'>>): void {
    const client: ConnectedClient = {
      id,
      label: meta?.label,
      connectedAt: Date.now(),
      state: 'connected',
    };
    this.clients.set(id, { meta: client, socket });
  }

  /**
   * Remove a client by ID.
   * Called when the WebSocket `close` or `error` event fires.
   */
  remove(id: ClientId): void {
    this.clients.delete(id);
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
   * Broadcast a serialized message to all connected clients.
   *
   * TODO: Handle per-client send errors gracefully (log + remove stale socket).
   *
   * @param message - JSON string to send.
   */
  broadcast(message: string): void {
    for (const { socket } of this.clients.values()) {
      // TODO: Check socket.readyState === WebSocket.OPEN before sending.
      socket.send(message);
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
    if (!entry) return false;
    // TODO: Check readyState before sending.
    entry.socket.send(message);
    return true;
  }
}
