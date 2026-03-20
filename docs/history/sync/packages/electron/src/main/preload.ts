import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { FakeTowerState, ConnectedClient } from '@dark-tower-sync/shared';

// ─── IPC channel names (must match main.ts IPC constants) ───────────────────
const CH = {
  GET_VERSION: 'get-version',
  TOWER_STATE: 'tower:state',
  RELAY_CLIENT_CHANGE: 'relay:client-change',
  TOWER_COMMAND: 'tower:command',
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

// ─── contextBridge API ───────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('darkTowerSync', {
  /** Resolves to the app version string (e.g. "0.1.0"). */
  getVersion: (): Promise<string> => ipcRenderer.invoke(CH.GET_VERSION),

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
});
