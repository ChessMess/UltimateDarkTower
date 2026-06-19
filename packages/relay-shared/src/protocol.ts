/**
 * WebSocket message protocol for UltimateDarkTowerRelay.
 *
 * All messages are JSON-encoded objects with a `type` discriminant and a
 * `payload` object. The host sends commands and status; clients acknowledge
 * connection and can send metadata during the handshake.
 */

import type { TowerCommandBytes, HostStatus, ClientId } from './types';
import type { LogEntry } from './logging';

// ---------------------------------------------------------------------------
// WebSocket close codes
// ---------------------------------------------------------------------------

/**
 * Custom WebSocket close code sent by the host when a client's
 * `protocolVersion` in `client:hello` does not match the server's version.
 * Clients should NOT auto-reconnect on this code — a hard reload is required.
 */
export const CLOSE_CODE_PROTOCOL_VERSION_MISMATCH = 4000;

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
  /** Client → host: tower is calibrated and ready (or no longer ready). */
  CLIENT_READY: 'client:ready',
  /** Client → host: a participant reports a player action (e.g. dropped a skull). */
  CLIENT_ACTION: 'client:action',
  /** Client → host: batch of structured log entries for centralized storage. */
  CLIENT_LOG: 'client:log',
  /** Host → clients: enable or disable automatic client log submission. */
  HOST_LOG_CONFIG: 'host:log-config',
  /** Host → all clients: game paused because the companion app disconnected from TowerEmulator. */
  RELAY_PAUSED: 'relay:paused',
  /** Host → all clients: game can resume, companion app reconnected to TowerEmulator. */
  RELAY_RESUMED: 'relay:resumed',
  /** Host → all clients: a remote player's physical tower BLE connection changed. */
  RELAY_TOWER_ALERT: 'relay:tower:alert',
  /** Host → all clients: operator manually re-sent the last tower state. */
  HOST_RESEND: 'host:resend',
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
 * The optional `seq` field is a monotonic counter assigned by the relay
 * for cross-log correlation between host and client log files.
 */
export type TowerCommandMessage = BaseMessage<
  typeof MessageType.TOWER_COMMAND,
  { data: number[]; seq?: number }
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
    /** Whether this client is an observer (no physical tower, visualizer only). */
    observer?: boolean;
  }
>;

/** Sent by the client when its tower is calibrated and ready (or no longer ready). */
export type ClientReadyMessage = BaseMessage<
  typeof MessageType.CLIENT_READY,
  {
    /** Whether the client's tower is calibrated and ready to receive commands. */
    ready: boolean;
  }
>;

/**
 * Sent by a *participant* client to report a player action the physical tower
 * would normally detect (e.g. a dropped skull), so the relay can synthesize the
 * matching tower→app notification. Observers MUST NOT send this; the relay
 * rejects actions from observer clients (PRD §4.4). The `action` field is a
 * string literal kept extensible for future actions.
 */
export type ClientActionMessage = BaseMessage<
  typeof MessageType.CLIENT_ACTION,
  { action: 'dropSkull' }
>;

/** Batch of structured log entries sent from a client to the host for centralized storage. */
export type ClientLogMessage = BaseMessage<
  typeof MessageType.CLIENT_LOG,
  { entries: LogEntry[] }
>;

/** Host tells clients whether automatic log submission is enabled or disabled. */
export type HostLogConfigMessage = BaseMessage<
  typeof MessageType.HOST_LOG_CONFIG,
  { enabled: boolean }
>;

/** Broadcast when the companion app disconnects from TowerEmulator — game should pause. */
export type RelayPausedMessage = BaseMessage<
  typeof MessageType.RELAY_PAUSED,
  { reason: string }
>;

/** Broadcast when the companion app reconnects to TowerEmulator — game can resume. */
export type RelayResumedMessage = BaseMessage<
  typeof MessageType.RELAY_RESUMED,
  Record<string, never>
>;

/** Broadcast when a remote player's physical tower BLE connection changes. */
export type RelayTowerAlertMessage = BaseMessage<
  typeof MessageType.RELAY_TOWER_ALERT,
  {
    clientId: ClientId;
    label?: string;
    towerConnected: boolean;
  }
>;

/**
 * Broadcast when the host operator manually re-sends the last tower state.
 * Carries the same data as a tower:command but uses a distinct type so logs
 * and clients can distinguish an operator-triggered resend from a live command.
 */
export type HostResendMessage = BaseMessage<
  typeof MessageType.HOST_RESEND,
  { data: number[] }
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
  | ClientHelloMessage
  | ClientReadyMessage
  | ClientActionMessage
  | ClientLogMessage
  | HostLogConfigMessage
  | RelayPausedMessage
  | RelayResumedMessage
  | RelayTowerAlertMessage
  | HostResendMessage;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Returns the current ISO-8601 timestamp string. */
function now(): string {
  return new Date().toISOString();
}

/**
 * Build a {@link TowerCommandMessage} from raw command bytes.
 *
 * @param data - Raw 20-byte tower command.
 * @param seq  - Optional monotonic sequence number assigned by the relay.
 */
export function makeTowerCommandMessage(data: TowerCommandBytes, seq?: number): TowerCommandMessage {
  return {
    type: MessageType.TOWER_COMMAND,
    payload: { data: Array.from(data), seq },
    timestamp: now(),
  };
}

/** Build a {@link HostLogConfigMessage}. */
export function makeHostLogConfigMessage(enabled: boolean): HostLogConfigMessage {
  return {
    type: MessageType.HOST_LOG_CONFIG,
    payload: { enabled },
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

/** Build a {@link ClientReadyMessage}. */
export function makeClientReadyMessage(ready: boolean): ClientReadyMessage {
  return {
    type: MessageType.CLIENT_READY,
    payload: { ready },
    timestamp: now(),
  };
}

/** Build a {@link ClientActionMessage}. */
export function makeClientActionMessage(action: 'dropSkull'): ClientActionMessage {
  return {
    type: MessageType.CLIENT_ACTION,
    payload: { action },
    timestamp: now(),
  };
}

/** Build a {@link RelayPausedMessage}. */
export function makeRelayPausedMessage(reason: string): RelayPausedMessage {
  return {
    type: MessageType.RELAY_PAUSED,
    payload: { reason },
    timestamp: now(),
  };
}

/** Build a {@link RelayResumedMessage}. */
export function makeRelayResumedMessage(): RelayResumedMessage {
  return {
    type: MessageType.RELAY_RESUMED,
    payload: {},
    timestamp: now(),
  };
}

/** Build a {@link HostResendMessage}. */
export function makeHostResendMessage(data: number[]): HostResendMessage {
  return {
    type: MessageType.HOST_RESEND,
    payload: { data },
    timestamp: now(),
  };
}

/** Build a {@link RelayTowerAlertMessage}. */
export function makeRelayTowerAlertMessage(
  clientId: ClientId,
  towerConnected: boolean,
  label?: string,
): RelayTowerAlertMessage {
  return {
    type: MessageType.RELAY_TOWER_ALERT,
    payload: { clientId, label, towerConnected },
    timestamp: now(),
  };
}
