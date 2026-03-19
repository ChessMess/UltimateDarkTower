/**
 * WebSocket message protocol for DarkTowerSync.
 *
 * All messages are JSON-encoded objects with a `type` discriminant and a
 * `payload` object. The host sends commands and status; clients acknowledge
 * connection and can send metadata during the handshake.
 *
 * See docs/PROTOCOL.md for the full connection lifecycle documentation.
 */

import type { TowerCommandBytes, HostStatus, ClientId } from './types';

// ---------------------------------------------------------------------------
// Message type literals
// ---------------------------------------------------------------------------

/** Discriminant values for all relay message types. */
export const MessageType = {
  /** Host → clients: relay a raw 20-byte tower command. */
  TOWER_COMMAND: 'tower:command',
  /** Host → new client: full tower state catchup for late joiners. */
  SYNC_STATE: 'sync:state',
  /** Host → all clients: a new client has joined the relay. */
  CLIENT_CONNECTED: 'client:connected',
  /** Host → all clients: a client has left the relay. */
  CLIENT_DISCONNECTED: 'client:disconnected',
  /** Host → clients: periodic or on-demand host status update. */
  HOST_STATUS: 'host:status',
  /** Client → host: sent immediately after WebSocket connection is established. */
  CLIENT_HELLO: 'client:hello',
} as const;

export type MessageTypeLiteral = (typeof MessageType)[keyof typeof MessageType];

// ---------------------------------------------------------------------------
// Message shapes
// ---------------------------------------------------------------------------

/** Base envelope shared by all relay messages. */
export interface BaseMessage<T extends MessageTypeLiteral, P> {
  type: T;
  payload: P;
  /** ISO-8601 timestamp set by the sender. */
  timestamp: string;
}

// --- Host → clients ---

/**
 * Relays a single intercepted tower command to all connected clients.
 * The `data` field is the raw 20-byte command as a JSON number array.
 */
export type TowerCommandMessage = BaseMessage<
  typeof MessageType.TOWER_COMMAND,
  { data: number[] }
>;

/**
 * Sent to a newly connected client containing the last known full tower state,
 * so the client's tower can catch up without waiting for the next full-state command.
 */
export type SyncStateMessage = BaseMessage<
  typeof MessageType.SYNC_STATE,
  {
    /** The most recent full-state tower command as a number array, or null if none recorded yet. */
    lastCommand: number[] | null;
  }
>;

/** Broadcast when a client joins. */
export type ClientConnectedMessage = BaseMessage<
  typeof MessageType.CLIENT_CONNECTED,
  { clientId: ClientId; label?: string }
>;

/** Broadcast when a client disconnects. */
export type ClientDisconnectedMessage = BaseMessage<
  typeof MessageType.CLIENT_DISCONNECTED,
  { clientId: ClientId }
>;

/** Periodic status update from the host. */
export type HostStatusMessage = BaseMessage<typeof MessageType.HOST_STATUS, HostStatus>;

// --- Client → host ---

/** Sent by the client immediately after WebSocket connection is established. */
export type ClientHelloMessage = BaseMessage<
  typeof MessageType.CLIENT_HELLO,
  {
    /** Client-chosen display name (e.g., player name). */
    label?: string;
    /** Protocol version the client speaks. Should match PROTOCOL_VERSION. */
    protocolVersion: string;
  }
>;

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

/** Union of all relay message types for exhaustive type narrowing. */
export type RelayMessage =
  | TowerCommandMessage
  | SyncStateMessage
  | ClientConnectedMessage
  | ClientDisconnectedMessage
  | HostStatusMessage
  | ClientHelloMessage;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Returns the current ISO-8601 timestamp string. */
function now(): string {
  return new Date().toISOString();
}

/** Build a {@link TowerCommandMessage} from raw command bytes. */
export function makeTowerCommandMessage(data: TowerCommandBytes): TowerCommandMessage {
  return {
    type: MessageType.TOWER_COMMAND,
    payload: { data: Array.from(data) },
    timestamp: now(),
  };
}

/** Build a {@link SyncStateMessage}. */
export function makeSyncStateMessage(lastCommand: number[] | null): SyncStateMessage {
  return {
    type: MessageType.SYNC_STATE,
    payload: { lastCommand },
    timestamp: now(),
  };
}

/** Build a {@link HostStatusMessage}. */
export function makeHostStatusMessage(status: HostStatus): HostStatusMessage {
  return {
    type: MessageType.HOST_STATUS,
    payload: status,
    timestamp: now(),
  };
}
