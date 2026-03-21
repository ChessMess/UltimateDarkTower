import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { FakeTower, RelayServer, HostLogger, CommandParser } from '@dark-tower-sync/host';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Vite injects these at build time
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// ─── IPC channel names shared with preload ──────────────────────────────────
export const IPC = {
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

// ─── Host services ───────────────────────────────────────────────────────────
const logDir = path.join(app.getPath('userData'), 'logs');
const logger = new HostLogger(logDir, process.env['LOGGING'] !== '0');
const relay = new RelayServer({
  port: Number(process.env['RELAY_PORT'] ?? 8765),
  onClientLog: (clientId, entries) => logger.writeClientEntries(clientId, entries),
});
const tower = new FakeTower();
const parser = new CommandParser();
let commandCount = 0;
let towerState: string = 'idle';
let relayStatus: { running: boolean; port: number; message: string } = {
  running: false,
  port: Number(process.env['RELAY_PORT'] ?? 8765),
  message: 'Starting…',
};
let bleAdapterState = 'unknown';

let mainWindow: BrowserWindow | null = null;

// ─── Wire tower → relay and IPC ─────────────────────────────────────────────

tower.on('command', (data) => {
  if (!parser.isValid(data)) {
    console.warn('[main] Dropping invalid command: wrong byte length', Array.from(data).length);
    return;
  }
  logger.logCommand('companion→host', data, null, 'companion');
  const seq = relay.broadcast(data);
  logger.logCommand('host→clients', data, seq, 'host');
  commandCount += 1;
  mainWindow?.webContents.send(IPC.TOWER_COMMAND, {
    count: commandCount,
    lastAt: new Date().toISOString(),
  });
});

tower.on('state-change', (state) => {
  towerState = state;
  relay.setFakeTowerState(state);
  mainWindow?.webContents.send(IPC.TOWER_STATE, { state });
});

tower.on('companion-disconnected', () => {
  relay.broadcastPaused('Companion app disconnected from FakeTower');
});

tower.on('companion-connected', () => {
  relay.broadcastResumed();
});

tower.on('ble-adapter-state', (state) => {
  bleAdapterState = state;
  mainWindow?.webContents.send(IPC.BLE_ADAPTER_STATE, { state });
});

relay.on('client-change', (clients) => {
  mainWindow?.webContents.send(IPC.RELAY_CLIENT_CHANGE, { clients });
});

// ─── IPC handlers (renderer → main) ─────────────────────────────────────────

ipcMain.handle(IPC.GET_VERSION, () => app.getVersion());
ipcMain.handle(IPC.GET_RELAY_STATUS, () => relayStatus);
ipcMain.handle(IPC.GET_BLE_STATE, () => ({ state: bleAdapterState }));
ipcMain.handle(IPC.GET_TOWER_STATE, () => ({ state: towerState }));
ipcMain.handle(IPC.TRIGGER_SKULL_DROP, (): { ok: boolean; reason?: string } => {
  const sent = tower.injectSkullDrop();
  if (sent) {
    return { ok: true };
  }
  const reason = towerState !== 'connected'
    ? `Tower is ${towerState} — companion app not connected`
    : 'No active BLE subscriber';
  return { ok: false, reason };
});

ipcMain.handle(IPC.TOWER_STOP_ADVERTISING, async (): Promise<{ ok: boolean; reason?: string }> => {
  try {
    await tower.stopAdvertising();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  }
});

ipcMain.handle(IPC.TOGGLE_LOGGING, (): { enabled: boolean } => {
  const enabled = logger.setEnabled(!logger.enabled);
  relay.broadcastLogConfig(enabled);
  return { enabled };
});

ipcMain.handle(IPC.GET_LOGGING_STATE, (): { enabled: boolean } => {
  return { enabled: logger.enabled };
});

ipcMain.handle(IPC.OPEN_LOG_DIR, async (): Promise<void> => {
  await shell.openPath(logger.getLogDir());
});

ipcMain.handle(IPC.TOWER_START_ADVERTISING, async (): Promise<{ ok: boolean; reason?: string }> => {
  try {
    await tower.startAdvertising();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  }
});

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 680,
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
  const relayPort = process.env['RELAY_PORT'] ?? 8765;

  try {
    await relay.start();
    relayStatus = {
      running: true,
      port: Number(relayPort),
      message: `Relay listening on ${relayPort}`,
    };
    mainWindow?.webContents.send(IPC.RELAY_STATUS, relayStatus);
    console.log(`[main] Relay server listening on ws://0.0.0.0:${relayPort}`);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'EADDRINUSE') {
      relayStatus = {
        running: false,
        port: Number(relayPort),
        message: `Relay unavailable: port ${relayPort} is already in use`,
      };
      mainWindow?.webContents.send(IPC.RELAY_STATUS, relayStatus);
      console.error(
        `[main] Relay port ${relayPort} is already in use. Continuing without relay; stop the other process or set RELAY_PORT to a free port.`
      );
    } else {
      relayStatus = {
        running: false,
        port: Number(relayPort),
        message: `Relay failed to start: ${e.message ?? 'unknown error'}`,
      };
      mainWindow?.webContents.send(IPC.RELAY_STATUS, relayStatus);
      console.error('[main] Failed to start relay server:', err);
    }
  }

  try {
    await tower.startAdvertising();
    console.log('[main] Advertising fake tower — open the companion app to connect.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[main] Failed to start BLE advertising:', err);
    mainWindow?.webContents.send(IPC.TOWER_STATE, { state: 'error', detail: msg });
  }
}

async function shutdown(): Promise<void> {
  console.log('[main] Shutting down…');
  try { await tower.stopAdvertising(); } catch { /* best-effort */ }
  try { await relay.stop(); } catch { /* best-effort */ }
  try { await logger.close(); } catch { /* best-effort */ }
  try { tower.destroy(); } catch { /* best-effort */ }
}

app.on('ready', () => {
  createWindow();
  startServices().catch((err: unknown) => {
    console.error('[main] Failed to start services:', err);
    // App stays open — Bluetooth may be unavailable or permission denied.
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── Guarded async shutdown on quit ──────────────────────────────────────────
let isShuttingDown = false;

const SHUTDOWN_TIMEOUT_MS = 5_000;

/**
 * Hard-kill the process, bypassing ALL Node.js / Electron teardown.
 *
 * app.exit(0) calls C exit() which still runs atexit handlers →
 * node::FreeEnvironment() → napi_release_threadsafe_function → SIGABRT
 * inside @stoprocent/bleno's native addon (destroyed UV mutex).
 *
 * SIGKILL is uncatchable, skips every finalizer, and macOS does NOT
 * generate a crash report for it (it's intentional termination).
 */
function hardKill(): void {
  process.kill(process.pid, 'SIGKILL');
}

function gracefulShutdown(): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const forceExit = setTimeout(() => {
    console.warn('[main] Shutdown timed out — forcing exit');
    hardKill();
  }, SHUTDOWN_TIMEOUT_MS);

  shutdown()
    .finally(() => {
      clearTimeout(forceExit);
      hardKill();
    });
}

app.on('before-quit', (event) => {
  if (isShuttingDown) return;
  event.preventDefault();
  gracefulShutdown();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[main] Received ${signal}`);
    gracefulShutdown();
  });
}
