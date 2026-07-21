import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
// Channel names (as CH) + payload shapes come from the shared IPC contract — no local copy to keep
// in sync with main.ts by hand.
import { IPC as CH } from '../shared/ipc-channels';
import type {
  SourceMode,
  TowerStatePayload,
  RelayClientChangePayload,
  TowerCommandPayload,
  RelayStatusPayload,
  BleAdapterStatePayload,
  SourceChangedPayload,
  ActionResult,
  LogListResult,
  LogAnalysisResult,
  EventLogResult,
} from '../shared/ipc-channels';

// ─── contextBridge API ───────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('darkTowerRelay', {
  /** Resolves to the app version string (e.g. "0.1.0"). */
  getVersion: (): Promise<string> => ipcRenderer.invoke(CH.GET_VERSION),

  /** Resolves to the current relay server status. */
  getRelayStatus: (): Promise<RelayStatusPayload> => ipcRenderer.invoke(CH.GET_RELAY_STATUS),

  /** Resolves to the current tower state. */
  getTowerState: (): Promise<TowerStatePayload> => ipcRenderer.invoke(CH.GET_TOWER_STATE),

  /** Resolves to the current raw BLE adapter state (or "n/a" for non-emulator sources). */
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
   * Trigger a one-shot skull drop notification (emulator/mock sources only).
   * Resolves with { ok: false, reason } if the source generates its own
   * notifications (real) or no companion app is connected.
   */
  triggerSkullDrop: (): Promise<ActionResult> => ipcRenderer.invoke(CH.TRIGGER_SKULL_DROP),

  /** Start the current source (BLE advertising for the emulator; connect for real). */
  startTowerAdvertising: (): Promise<ActionResult> =>
    ipcRenderer.invoke(CH.TOWER_START_ADVERTISING),

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

  /** List the session + event log files in the app's log directory. */
  listLogs: (): Promise<LogListResult> => ipcRenderer.invoke(CH.LOGS_LIST),

  /** Analyze the session logs (optionally filtered to a session prefix). */
  analyzeLogs: (session: string | null): Promise<LogAnalysisResult> =>
    ipcRenderer.invoke(CH.LOGS_ANALYZE, { session }),

  /** Load a semantic event-log file (`events-*.jsonl`) for read-only display. */
  loadEventLogFile: (file: string): Promise<EventLogResult> =>
    ipcRenderer.invoke(CH.LOGS_LOAD_EVENTS, { file }),

  /**
   * Ask the main process to fit the window's content area to `height` px
   * (clamped to the display). Fire-and-forget; called on load and whenever a
   * collapsible section toggles.
   */
  resizeContentHeight: (height: number): void => ipcRenderer.send(CH.RESIZE_CONTENT_HEIGHT, height),
});
