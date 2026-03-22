import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { FakeTowerState, ConnectedClient } from '@dark-tower-sync/shared';

// ─── IPC channel names (must match main.ts IPC constants) ───────────────────
const CH = {
  GET_VERSION: 'get-version',
  GET_RELAY_STATUS: 'get-relay-status',
  GET_BLE_STATE: 'get-ble-state',
  GET_TOWER_STATE: 'get-tower-state',
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
} as const;

// ─── Payload types ───────────────────────────────────────────────────────────

export interface TowerStatePayload {
  state: FakeTowerState;
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

export interface SkullDropResult {
  ok: boolean;
  reason?: string;
}

// ─── contextBridge API ───────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('darkTowerSync', {
  /** Resolves to the app version string (e.g. "0.1.0"). */
  getVersion: (): Promise<string> => ipcRenderer.invoke(CH.GET_VERSION),

  /** Resolves to the current relay server status. */
  getRelayStatus: (): Promise<RelayStatusPayload> => ipcRenderer.invoke(CH.GET_RELAY_STATUS),

  /**
   * Subscribe to fake tower BLE state changes.
   * Returns an unsubscribe function.
   */
  onTowerState: (cb: (payload: TowerStatePayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: TowerStatePayload): void => cb(payload);
    ipcRenderer.on(CH.TOWER_STATE, listener);
    return () => ipcRenderer.removeListener(CH.TOWER_STATE, listener);
  },

  /**
   * Subscribe to relay client list changes.
   * Returns an unsubscribe function.
   */
  onRelayClientChange: (cb: (payload: RelayClientChangePayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: RelayClientChangePayload): void => cb(payload);
    ipcRenderer.on(CH.RELAY_CLIENT_CHANGE, listener);
    return () => ipcRenderer.removeListener(CH.RELAY_CLIENT_CHANGE, listener);
  },

  /**
   * Subscribe to tower command relay events (fires each time a command is
   * intercepted from the companion app and forwarded).
   * Returns an unsubscribe function.
   */
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

  /** Resolves to the current tower state. */
  getTowerState: (): Promise<TowerStatePayload> => ipcRenderer.invoke(CH.GET_TOWER_STATE),

  /** Resolves to the current raw CoreBluetooth adapter state. */
  getBleAdapterState: (): Promise<BleAdapterStatePayload> => ipcRenderer.invoke(CH.GET_BLE_STATE),

  /** Subscribe to raw CoreBluetooth adapter state changes. Returns an unsubscribe function. */
  onBleAdapterState: (cb: (payload: BleAdapterStatePayload) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: BleAdapterStatePayload): void => cb(payload);
    ipcRenderer.on(CH.BLE_ADAPTER_STATE, listener);
    return () => ipcRenderer.removeListener(CH.BLE_ADAPTER_STATE, listener);
  },

  /**
   * Trigger a one-shot skull drop notification to the connected companion app.
   * Resolves with { ok: true } on success, or { ok: false, reason } if no companion
   * app is connected or notification could not be sent.
   */
  triggerSkullDrop: (): Promise<SkullDropResult> => ipcRenderer.invoke(CH.TRIGGER_SKULL_DROP),

  /**
   * Start BLE advertising — makes the fake tower visible to Bluetooth scanners.
   * No-ops if already advertising or connected. Resolves with { ok: false, reason }
   * if Bluetooth is unavailable or times out.
   */
  startTowerAdvertising: (): Promise<SkullDropResult> => ipcRenderer.invoke(CH.TOWER_START_ADVERTISING),

  /**
   * Stop BLE advertising and disconnect any connected companion app.
   * Transitions the tower to idle so it is invisible to Bluetooth scanners.
   * No-ops if already idle.
   */
  stopTowerAdvertising: (): Promise<SkullDropResult> => ipcRenderer.invoke(CH.TOWER_STOP_ADVERTISING),

  /** Toggle the master logging switch on/off. Returns the new state. */
  toggleLogging: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke(CH.TOGGLE_LOGGING),

  /** Query whether logging is currently enabled. */
  getLoggingState: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke(CH.GET_LOGGING_STATE),

  /** Open the log directory in the system file manager. */
  openLogDir: (): Promise<void> => ipcRenderer.invoke(CH.OPEN_LOG_DIR),
});
