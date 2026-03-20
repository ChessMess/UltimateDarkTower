import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { FakeTower, RelayServer } from '@dark-tower-sync/host';

// Squirrel.Windows install/uninstall handling
if (require('electron-squirrel-startup')) app.quit();

// Vite injects these at build time
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// ─── IPC channel names shared with preload ──────────────────────────────────
export const IPC = {
  GET_VERSION: 'get-version',
  TOWER_STATE: 'tower:state',
  RELAY_CLIENT_CHANGE: 'relay:client-change',
  TOWER_COMMAND: 'tower:command',
} as const;

// ─── Host services ───────────────────────────────────────────────────────────
const relay = new RelayServer({ port: Number(process.env['RELAY_PORT'] ?? 8765) });
const tower = new FakeTower();
let commandCount = 0;

let mainWindow: BrowserWindow | null = null;

// ─── Wire tower → relay and IPC ─────────────────────────────────────────────

tower.on('command', (data) => {
  relay.broadcast(data);
  commandCount += 1;
  mainWindow?.webContents.send(IPC.TOWER_COMMAND, {
    count: commandCount,
    lastAt: new Date().toISOString(),
  });
});

tower.on('state-change', (state) => {
  relay.setFakeTowerState(state);
  mainWindow?.webContents.send(IPC.TOWER_STATE, { state });
});

relay.on('client-change', (clients) => {
  mainWindow?.webContents.send(IPC.RELAY_CLIENT_CHANGE, { clients });
});

// ─── IPC handlers (renderer → main) ─────────────────────────────────────────

ipcMain.handle(IPC.GET_VERSION, () => app.getVersion());

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 520,
    title: 'DarkTowerSync Host',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

async function startServices(): Promise<void> {
  await relay.start();
  console.log(`[main] Relay server listening on ws://0.0.0.0:${process.env['RELAY_PORT'] ?? 8765}`);

  await tower.startAdvertising();
  console.log('[main] Advertising fake tower — open the companion app to connect.');
}

async function shutdown(): Promise<void> {
  console.log('[main] Shutting down…');
  await tower.stopAdvertising();
  await relay.stop();
}

app.whenReady().then(() => {
  createWindow();
  startServices().catch((err: unknown) => {
    console.error('[main] Failed to start services:', err);
    // App stays open — Bluetooth may be unavailable or permission denied.
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Async cleanup before the process exits.
app.on('will-quit', (event) => {
  event.preventDefault();
  void shutdown().then(() => app.exit(0));
});
