// Single source of truth for the Electron IPC contract: the channel names and the payload shapes
// crossing the main ↔ preload ↔ renderer boundary. These were previously copied verbatim into
// main.ts, preload.ts and renderer.ts and "kept in sync by comment" — a drift hazard on every
// channel or payload change.
//
// `IPC` is a runtime value (bundled into the main and preload bundles, which reference channels by
// name). The payload types are type-only: the renderer imports them with `import type`, so nothing
// here couples the renderer's browser bundle to main-process runtime code (the renderer already
// type-imports from relay-core / relay-shared the same way).

import type {
  TowerEmulatorState,
  ConnectedClient,
  RelayEvent,
} from 'ultimatedarktowerrelay-shared';
import type { SessionSummary, TimelineRow } from 'ultimatedarktowerrelay-core';

// ─── IPC channel names ──────────────────────────────────────────────────────
export const IPC = {
  GET_VERSION: 'get-version',
  GET_RELAY_STATUS: 'get-relay-status',
  GET_BLE_STATE: 'get-ble-state',
  GET_TOWER_STATE: 'get-tower-state',
  GET_SOURCE: 'get-source',
  SET_SOURCE: 'set-source',
  SOURCE_CHANGED: 'source:changed',
  TOWER_STATE: 'tower:state',
  RELAY_CLIENT_CHANGE: 'relay:client-change',
  RELAY_STATUS: 'relay:status',
  TOWER_COMMAND: 'tower:command',
  BLE_ADAPTER_STATE: 'ble:adapter-state',
  TRIGGER_SKULL_DROP: 'trigger:skull-drop',
  TOWER_START_ADVERTISING: 'tower:start-advertising',
  TOWER_STOP_ADVERTISING: 'tower:stop-advertising',
  TOGGLE_LOGGING: 'toggle-logging',
  GET_LOGGING_STATE: 'get-logging-state',
  OPEN_LOG_DIR: 'open-log-dir',
  RESEND_LAST_STATE: 'resend-last-state',
  LOGS_LIST: 'logs:list',
  LOGS_ANALYZE: 'logs:analyze',
  LOGS_LOAD_EVENTS: 'logs:load-events',
  RESIZE_CONTENT_HEIGHT: 'window:resize-content-height',
} as const;

// ─── Payload types ──────────────────────────────────────────────────────────

export type SourceMode = 'emulator' | 'mock' | 'real';

export interface TowerStatePayload {
  state: TowerEmulatorState;
  detail?: string;
}

export interface RelayClientChangePayload {
  clients: ConnectedClient[];
}

export interface TowerCommandPayload {
  count: number;
  lastAt: string;
}

export interface RelayStatusPayload {
  running: boolean;
  port: number;
  message: string;
  urls: string[];
}

export interface BleAdapterStatePayload {
  state: string;
}

export interface SourceChangedPayload {
  source: SourceMode;
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

// ─── Log-viewer (FR-7.3) payload types ──────────────────────────────────────

/** A log file the viewer can list. */
export interface LogFileInfo {
  name: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface LogListResult {
  sessions: LogFileInfo[];
  events: LogFileInfo[];
}

export type LogAnalysisResult =
  | {
      ok: true;
      fileCount: number;
      summary: SessionSummary;
      timeline: { rows: TimelineRow[]; total: number };
      anomalies: Array<{ type: string; message: string }>;
    }
  | { ok: false; reason: string };

export type EventLogResult =
  | { ok: true; events: RelayEvent[]; total: number; truncated: boolean }
  | { ok: false; reason: string };
