/**
 * RelayEvent — the semantic-event union for UltimateDarkTowerRelay.
 *
 * The relay keeps a hybrid state model (PRD §7): an authoritative last-command
 * `TowerState` snapshot for live/catch-up, PLUS an append-only log of *semantic*
 * `RelayEvent`s for replay, audit, and debugging. This file defines that event
 * union and small factory helpers.
 *
 * Phase 2 introduces the type and the emission points only — the persistent
 * `EventLog` (JSONL append/replay) and the monotonic `seq` it assigns are
 * Phase 4. Until then `seq` is left undefined.
 *
 * Note: like `logging.ts`, this module has NO dependency on `ultimatedarktower`.
 * Payloads use primitives (numbers / number arrays) so the wire/event format is
 * decoupled from the UDT `TowerState` structure.
 */

// ---------------------------------------------------------------------------
// Event type literals
// ---------------------------------------------------------------------------

/** Discriminant values for every semantic relay event. */
export const RelayEventType = {
  /** The official companion app connected to the fake tower. */
  APP_CONNECTED: 'app-connected',
  /** The official companion app disconnected from the fake tower. */
  APP_DISCONNECTED: 'app-disconnected',
  /** A 20-byte command was received from the companion app. */
  COMMAND_RECEIVED: 'command-received',
  /** A skull-drop notification was synthesized (participant-reported action). */
  SKULL_DROPPED: 'skull-dropped',
  /** A calibration-complete notification was synthesized. */
  CALIBRATION_COMPLETE: 'calibration-complete',
  /** A periodic-fallback heartbeat notification was synthesized. */
  HEARTBEAT: 'heartbeat',
  /** A consumer joined the relay (completed the handshake). */
  CONSUMER_JOINED: 'consumer-joined',
  /** A consumer left the relay. */
  CONSUMER_LEFT: 'consumer-left',
} as const;

export type RelayEventTypeLiteral = (typeof RelayEventType)[keyof typeof RelayEventType];

// ---------------------------------------------------------------------------
// Event shapes
// ---------------------------------------------------------------------------

/** Fields shared by every relay event. */
export interface BaseRelayEvent<T extends RelayEventTypeLiteral, P> {
  type: T;
  payload: P;
  /** ISO-8601 timestamp set when the event was created. */
  timestamp: string;
  /**
   * Monotonic sequence number assigned by the Phase-4 `EventLog`. Undefined
   * until then — events are emitted in order regardless.
   */
  seq?: number;
}

/** The companion app connected. */
export type AppConnectedEvent = BaseRelayEvent<
  typeof RelayEventType.APP_CONNECTED,
  { address?: string }
>;

/** The companion app disconnected. */
export type AppDisconnectedEvent = BaseRelayEvent<
  typeof RelayEventType.APP_DISCONNECTED,
  { address?: string }
>;

/** A 20-byte command arrived from the companion app. */
export type CommandReceivedEvent = BaseRelayEvent<
  typeof RelayEventType.COMMAND_RECEIVED,
  { command: number[] }
>;

/** A skull-drop notification was synthesized with the given (running) count. */
export type SkullDroppedEvent = BaseRelayEvent<
  typeof RelayEventType.SKULL_DROPPED,
  {
    /** The skull-drop count encoded into the notification (1–255). */
    skullCount: number;
    /** The 20-byte notification packet that was sent. */
    packet: number[];
  }
>;

/** A calibration-complete notification was synthesized. */
export type CalibrationCompleteEvent = BaseRelayEvent<
  typeof RelayEventType.CALIBRATION_COMPLETE,
  {
    /** Message-type byte (byte 0) used for the reply (0x00 or 0x08). */
    replyType: number;
    /** The 20-byte notification packet that was sent. */
    packet: number[];
  }
>;

/** A periodic-fallback heartbeat notification was synthesized. */
export type HeartbeatEvent = BaseRelayEvent<
  typeof RelayEventType.HEARTBEAT,
  { packet: number[] }
>;

/** A consumer joined the relay. */
export type ConsumerJoinedEvent = BaseRelayEvent<
  typeof RelayEventType.CONSUMER_JOINED,
  { clientId: string; label?: string; observer?: boolean }
>;

/** A consumer left the relay. */
export type ConsumerLeftEvent = BaseRelayEvent<
  typeof RelayEventType.CONSUMER_LEFT,
  { clientId: string; label?: string }
>;

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

/** Union of every semantic relay event for exhaustive narrowing. */
export type RelayEvent =
  | AppConnectedEvent
  | AppDisconnectedEvent
  | CommandReceivedEvent
  | SkullDroppedEvent
  | CalibrationCompleteEvent
  | HeartbeatEvent
  | ConsumerJoinedEvent
  | ConsumerLeftEvent;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Returns the current ISO-8601 timestamp string. */
function now(): string {
  return new Date().toISOString();
}

/** Build a {@link CommandReceivedEvent}. */
export function makeCommandReceivedEvent(command: number[]): CommandReceivedEvent {
  return { type: RelayEventType.COMMAND_RECEIVED, payload: { command }, timestamp: now() };
}

/** Build a {@link SkullDroppedEvent}. */
export function makeSkullDroppedEvent(skullCount: number, packet: number[]): SkullDroppedEvent {
  return { type: RelayEventType.SKULL_DROPPED, payload: { skullCount, packet }, timestamp: now() };
}

/** Build a {@link CalibrationCompleteEvent}. */
export function makeCalibrationCompleteEvent(replyType: number, packet: number[]): CalibrationCompleteEvent {
  return { type: RelayEventType.CALIBRATION_COMPLETE, payload: { replyType, packet }, timestamp: now() };
}

/** Build a {@link HeartbeatEvent}. */
export function makeHeartbeatEvent(packet: number[]): HeartbeatEvent {
  return { type: RelayEventType.HEARTBEAT, payload: { packet }, timestamp: now() };
}

/** Build an {@link AppConnectedEvent}. */
export function makeAppConnectedEvent(address?: string): AppConnectedEvent {
  return { type: RelayEventType.APP_CONNECTED, payload: { address }, timestamp: now() };
}

/** Build an {@link AppDisconnectedEvent}. */
export function makeAppDisconnectedEvent(address?: string): AppDisconnectedEvent {
  return { type: RelayEventType.APP_DISCONNECTED, payload: { address }, timestamp: now() };
}

/** Build a {@link ConsumerJoinedEvent}. */
export function makeConsumerJoinedEvent(clientId: string, label?: string, observer?: boolean): ConsumerJoinedEvent {
  return { type: RelayEventType.CONSUMER_JOINED, payload: { clientId, label, observer }, timestamp: now() };
}

/** Build a {@link ConsumerLeftEvent}. */
export function makeConsumerLeftEvent(clientId: string, label?: string): ConsumerLeftEvent {
  return { type: RelayEventType.CONSUMER_LEFT, payload: { clientId, label }, timestamp: now() };
}
