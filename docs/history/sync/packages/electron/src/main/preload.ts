import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('darkTowerSync', {
  // Phase 1: placeholder — will expose relay/tower status APIs later
  getVersion: () => ipcRenderer.invoke('get-version'),
});
