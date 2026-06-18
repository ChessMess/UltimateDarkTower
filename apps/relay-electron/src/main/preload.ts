import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { FakeTowerState, ConnectedClient } from 'ultimatedarktowerrelay-shared';

// ─── IPC channel names (must match main.ts IPC constants) ───────────────────
const CH = {
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
} as const;

// ─── Payload types ───────────────────────────────────────────────────────────

export type SourceMode = 'fake' | 'mock' | 'real';

export interface TowerStatePayload {
  state: FakeTowerState;
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

// ─── contextBridge API ───────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('darkTowerRelay', {
  /** Resolves to the app version string (e.g. "0.1.0"). */
  getVersion: (): Promise<string> => ipcRenderer.invoke(CH.GET_VERSION),

  /** Resolves to the current relay server status. */
  getRelayStatus: (): Promise<RelayStatusPayload> => ipcRenderer.invoke(CH.GET_RELAY_STATUS),

  /** Resolves to the current tower state. */
  getTowerState: (): Promise<TowerStatePayload> => ipcRenderer.invoke(CH.GET_TOWER_STATE),

  /** Resolves to the current raw BLE adapter state (or "n/a" for non-fake sources). */
  getBleAdapterState: (): Promise<BleAdapterStatePayload> => ipcRenderer.invoke(CH.GET_BLE_STATE),

  /** Resolves to the active tower source mode. */
  getSource: (): Promise<SourceChangedPayload> => ipcRenderer.invoke(CH.GET_SOURCE),

  /** Switch the live tower source. Resolves with { ok, reason } from the switch. */
  setSource: (mode: SourceMode): Promise<ActionResult> => ipcRenderer.invoke(CH.SET_SOURCE, mode),

  /** Subscribe to tower BLE state changes. Returns an unsubscribe function. */
  onTowerState: (cb: (payload: TowerStatePayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: TowerStatePayload): void => cb(payload);
    ipcRenderer.on(CH.TOWER_STATE, listener);
    return () => ipcRenderer.removeListener(CH.TOWER_STATE, listener);
  },

  /** Subscribe to relay client list changes. Returns an unsubscribe function. */
  onRelayClientChange: (cb: (payload: RelayClientChangePayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: RelayClientChangePayload): void => cb(payload);
    ipcRenderer.on(CH.RELAY_CLIENT_CHANGE, listener);
    return () => ipcRenderer.removeListener(CH.RELAY_CLIENT_CHANGE, listener);
  },

  /** Subscribe to tower command relay events. Returns an unsubscribe function. */
  onTowerCommand: (cb: (payload: TowerCommandPayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: TowerCommandPayload): void => cb(payload);
    ipcRenderer.on(CH.TOWER_COMMAND, listener);
    return () => ipcRenderer.removeListener(CH.TOWER_COMMAND, listener);
  },

  /** Subscribe to relay status changes. Returns an unsubscribe function. */
  onRelayStatus: (cb: (payload: RelayStatusPayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: RelayStatusPayload): void => cb(payload);
    ipcRenderer.on(CH.RELAY_STATUS, listener);
    return () => ipcRenderer.removeListener(CH.RELAY_STATUS, listener);
  },

  /** Subscribe to raw BLE adapter state changes. Returns an unsubscribe function. */
  onBleAdapterState: (cb: (payload: BleAdapterStatePayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: BleAdapterStatePayload): void => cb(payload);
    ipcRenderer.on(CH.BLE_ADAPTER_STATE, listener);
    return () => ipcRenderer.removeListener(CH.BLE_ADAPTER_STATE, listener);
  },

  /** Subscribe to tower-source changes (from a SET_SOURCE switch). Returns an unsubscribe function. */
  onSourceChanged: (cb: (payload: SourceChangedPayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: SourceChangedPayload): void => cb(payload);
    ipcRenderer.on(CH.SOURCE_CHANGED, listener);
    return () => ipcRenderer.removeListener(CH.SOURCE_CHANGED, listener);
  },

  /**
   * Trigger a one-shot skull drop notification (fake/mock sources only).
   * Resolves with { ok: false, reason } if the source generates its own
   * notifications (real) or no companion app is connected.
   */
  triggerSkullDrop: (): Promise<ActionResult> => ipcRenderer.invoke(CH.TRIGGER_SKULL_DROP),

  /** Start the current source (BLE advertising for fake; connect for real). */
  startTowerAdvertising: (): Promise<ActionResult> => ipcRenderer.invoke(CH.TOWER_START_ADVERTISING),

  /** Stop the current source. */
  stopTowerAdvertising: (): Promise<ActionResult> => ipcRenderer.invoke(CH.TOWER_STOP_ADVERTISING),

  /** Toggle the master logging switch (HostLogger + EventLog). Returns the new state. */
  toggleLogging: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke(CH.TOGGLE_LOGGING),

  /** Query whether logging is currently enabled. */
  getLoggingState: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke(CH.GET_LOGGING_STATE),

  /** Open the log directory in the system file manager. */
  openLogDir: (): Promise<void> => ipcRenderer.invoke(CH.OPEN_LOG_DIR),

  /** Re-broadcast the last relayed tower command so all clients can catch up. */
  resendLastState: (): Promise<ActionResult> => ipcRenderer.invoke(CH.RESEND_LAST_STATE),
});
