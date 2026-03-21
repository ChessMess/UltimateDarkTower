/**
 * Shared TypeScript interfaces and types for DarkTowerSync.
 *
 * These types are used by both the host (Node.js BLE relay server) and
 * client (browser Web Bluetooth player) packages.
 */

// ---------------------------------------------------------------------------
// Tower command
// ---------------------------------------------------------------------------

/**
 * A raw 20-byte tower command intercepted from the official companion app and
 * relayed to all connected clients.
 *
 * The UltimateDarkTower library defines the full packet format; this type
 * represents the wire-level byte array that flows through the relay.
 */
export type TowerCommandBytes = Uint8Array | number[];

// ---------------------------------------------------------------------------
// Connected client
// ---------------------------------------------------------------------------

/** Unique identifier assigned to each client WebSocket connection. */
export type ClientId = string;

/** Connection state of a relay client. */
export type ClientConnectionState = 'connecting' | 'connected' | 'ready' | 'disconnected';

/** Metadata tracked by the host for each connected client. */
export interface ConnectedClient {
  /** Unique ID assigned at connection time. */
  id: ClientId;
  /** Human-readable label (optional — client may send it during handshake). */
  label?: string;
  /** Timestamp (ms since epoch) when the client connected. */
  connectedAt: number;
  /** Current connection state. */
  state: ClientConnectionState;
  /** Whether the client's physical tower BLE connection is active. */
  towerConnected: boolean;
  /** Timestamp (ms since epoch) of the last tower status update, or null if never reported. */
  towerLastSeenAt: number | null;
  /** Whether this client is an observer (no physical tower, visualizer only). */
  observer: boolean;
}

// ---------------------------------------------------------------------------
// Host status
// ---------------------------------------------------------------------------

/** Status of the host's BLE peripheral (fake tower). */
export type FakeTowerState =
  | 'idle'
  | 'advertising'
  | 'connected'
  | 'error';

/** Overall status reported by the host to connected clients. */
export interface HostStatus {
  /** Whether the host is actively relaying commands. */
  relaying: boolean;
  /** State of the fake BLE tower peripheral. */
  fakeTowerState: FakeTowerState;
  /** Whether the companion app is currently connected to the fake tower. */
  appConnected: boolean;
  /** Number of clients currently connected to the relay server. */
  clientCount: number;
  /** How many connected clients have their physical tower BLE connection active. */
  towersConnected: number;
  /** How many connected clients are observers (no physical tower). */
  observerCount: number;
  /** ISO-8601 timestamp of the last relayed command, or null if none yet. */
  lastCommandAt: string | null;
}
