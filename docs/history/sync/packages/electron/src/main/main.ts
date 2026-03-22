import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// ─── Early file logging (captures output when launched from Finder) ─────────
// Set up BEFORE any native module imports so load failures are captured.
// Uses os.tmpdir() as fallback — app.getPath('userData') can fail before ready
// in some packaged Electron builds.
let _startupLogDir: string;
try {
  _startupLogDir = app.getPath('userData');
} catch {
  _startupLogDir = path.join(os.tmpdir(), 'DarkTowerSync');
}
const startupLogPath = path.join(_startupLogDir, 'startup.log');
fs.mkdirSync(_startupLogDir, { recursive: true });
const _logStream = fs.createWriteStream(startupLogPath, { flags: 'w' });

function _fileLog(level: string, ...args: unknown[]): void {
  const ts = new Date().toISOString();
  const msg = args
    .map((a) =>
      typeof a === 'string'
        ? a
        : a instanceof Error
          ? a.stack ?? a.message
          : JSON.stringify(a, null, 2),
    )
    .join(' ');
  _logStream.write(`[${ts}] [${level}] ${msg}\n`);
}

const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

console.log = (...args: unknown[]) => { _fileLog('LOG', ...args); _origLog(...args); };
console.warn = (...args: unknown[]) => { _fileLog('WARN', ...args); _origWarn(...args); };
console.error = (...args: unknown[]) => { _fileLog('ERROR', ...args); _origError(...args); };

console.log('=== DarkTowerSync startup ===');
console.log(`platform: ${process.platform}, arch: ${process.arch}`);
console.log(`electron: ${process.versions.electron}, node: ${process.versions.node}`);
console.log(`startupLog: ${startupLogPath}`);
console.log(`execPath: ${process.execPath}`);
console.log(`argv: ${JSON.stringify(process.argv)}`);
console.log(`resourcesPath: ${process.resourcesPath ?? 'N/A'}`);
console.log(`cwd: ${process.cwd()}`);

process.on('uncaughtException', (err) => {
  _fileLog('FATAL', `Uncaught exception: ${err.stack ?? err.message}`);
  _logStream.end();
});
process.on('unhandledRejection', (reason) => {
  _fileLog('FATAL', 'Unhandled rejection:', reason instanceof Error ? reason : String(reason));
});

// ─── Squirrel (Windows installer) check ─────────────────────────────────────
import started from 'electron-squirrel-startup';

console.log(`electron-squirrel-startup: ${started}`);
if (started) {
  console.log('Squirrel startup detected — quitting');
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

// ─── Lazy-loaded host modules ───────────────────────────────────────────────
// These are loaded inside initApp() so the file logging above captures any
// native module load failures (e.g. @stoprocent/bleno ABI mismatch).

type HostModule = typeof import('@dark-tower-sync/host');
let FakeTower: HostModule['FakeTower'];
let RelayServer: HostModule['RelayServer'];
let HostLogger: HostModule['HostLogger'];
let CommandParser: HostModule['CommandParser'];
let pruneOldLogs: HostModule['pruneOldLogs'];

// Module-scoped state (initialized in initApp)
let relay: InstanceType<HostModule['RelayServer']>;
let tower: InstanceType<HostModule['FakeTower']>;
let parser: InstanceType<HostModule['CommandParser']>;
let logger: InstanceType<HostModule['HostLogger']>;

let commandCount = 0;
let towerState: string = 'idle';
let relayStatus: { running: boolean; port: number; message: string; urls: string[] } = {
  running: false,
  port: Number(process.env['RELAY_PORT'] ?? 8765),
  message: 'Starting…',
  urls: [],
};
let bleAdapterState = 'unknown';

/** Return non-internal IPv4 addresses suitable for LAN clients. */
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const nets of Object.values(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}
let mainWindow: BrowserWindow | null = null;

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
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App initialization (loads native modules, wires events) ────────────────

async function initApp(): Promise<void> {
  console.log('[main] Loading host modules…');

  try {
    const host = await import('@dark-tower-sync/host');
    FakeTower = host.FakeTower;
    RelayServer = host.RelayServer;
    HostLogger = host.HostLogger;
    CommandParser = host.CommandParser;
    pruneOldLogs = host.pruneOldLogs;
  } catch (err) {
    console.error('[main] FATAL: Failed to load host modules:', err);
    dialog.showErrorBox(
      'DarkTowerSync — Startup Error',
      `Failed to load native modules.\n\n${err instanceof Error ? err.message : String(err)}\n\nCheck ~/Library/Application Support/DarkTowerSync/startup.log for details.`,
    );
    app.exit(1);
    return;
  }

  console.log('[main] Host modules loaded successfully');

  // ── Instantiate services ────────────────────────────────────────────────
  const logDir = path.join(app.getPath('userData'), 'logs');
  logger = new HostLogger(logDir, {
    enabled: process.env['LOGGING'] !== '0',
    maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  });

  // Best-effort cleanup of old log files at startup.
  pruneOldLogs(logDir, 30)
    .then((n) => { if (n > 0) console.log(`[main] Pruned ${n} old log file(s)`); })
    .catch(() => { /* best-effort */ });

  relay = new RelayServer({
    port: Number(process.env['RELAY_PORT'] ?? 8765),
    onClientLog: (clientId, entries) => {
      logger.logEvent('event', 'host', `Received ${entries.length} log entries from ${clientId.slice(0, 8)}`);
      logger.writeClientEntries(clientId, entries);
    },
    onClientConnected: (clientId, label, observer) =>
      logger.logEvent('event', 'host', `Client connected: ${label ?? clientId.slice(0, 8)}${observer ? ' (observer)' : ''}`),
    onClientDisconnected: (clientId, label) =>
      logger.logEvent('event', 'host', `Client disconnected: ${label ?? clientId.slice(0, 8)}`),
    onClientReady: (clientId, ready, label) =>
      logger.logEvent('event', 'host', `Client ${label ?? clientId.slice(0, 8)} tower: ${ready ? 'connected' : 'disconnected'}`),
  });
  tower = new FakeTower();
  parser = new CommandParser();

  console.log('[main] Services instantiated');

  // ── Wire tower → relay and IPC ──────────────────────────────────────────
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
    logger.logEvent('event', 'host', `FakeTower state: ${state}`);
    mainWindow?.webContents.send(IPC.TOWER_STATE, { state });
  });

  tower.on('companion-disconnected', () => {
    logger.logEvent('event', 'host', 'Companion app disconnected');
    relay.broadcastPaused('Companion app disconnected from FakeTower');
  });

  tower.on('companion-connected', () => {
    logger.logEvent('event', 'host', 'Companion app connected');
    relay.broadcastResumed();
  });

  tower.on('ble-adapter-state', (state) => {
    bleAdapterState = state;
    mainWindow?.webContents.send(IPC.BLE_ADAPTER_STATE, { state });
  });

  relay.on('client-change', (clients) => {
    mainWindow?.webContents.send(IPC.RELAY_CLIENT_CHANGE, { clients });
  });

  // ── Register IPC handlers ──────────────────────────────────────────────
  ipcMain.handle(IPC.TRIGGER_SKULL_DROP, (): { ok: boolean; reason?: string } => {
    const sent = tower.injectSkullDrop();
    if (sent) return { ok: true };
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

  console.log('[main] IPC handlers registered');

  // ── Start services ─────────────────────────────────────────────────────
  await startServices();
}

// ─── IPC handlers that don't depend on host modules ─────────────────────────

ipcMain.handle(IPC.GET_VERSION, () => app.getVersion());
ipcMain.handle(IPC.GET_RELAY_STATUS, () => relayStatus);
ipcMain.handle(IPC.GET_BLE_STATE, () => ({ state: bleAdapterState }));
ipcMain.handle(IPC.GET_TOWER_STATE, () => ({ state: towerState }));

// ─── Service startup ────────────────────────────────────────────────────────

async function startServices(): Promise<void> {
  const relayPort = process.env['RELAY_PORT'] ?? 8765;

  try {
    await relay.start();
    const urls = getLocalIPs().map((ip) => `ws://${ip}:${relayPort}`);
    relayStatus = {
      running: true,
      port: Number(relayPort),
      message: `Relay listening on ${relayPort}`,
      urls,
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
        urls: [],
      };
      mainWindow?.webContents.send(IPC.RELAY_STATUS, relayStatus);
      console.error(
        `[main] Relay port ${relayPort} is already in use. Continuing without relay; stop the other process or set RELAY_PORT to a free port.`,
      );
    } else {
      relayStatus = {
        running: false,
        port: Number(relayPort),
        message: `Relay failed to start: ${e.message ?? 'unknown error'}`,
        urls: [],
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

// ─── Shutdown ────────────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('[main] Shutting down…');
  try { if (tower) await tower.stopAdvertising(); } catch { /* best-effort */ }
  try { if (relay) await relay.stop(); } catch { /* best-effort */ }
  try { if (logger) await logger.close(); } catch { /* best-effort */ }
  try { if (tower) tower.destroy(); } catch { /* best-effort */ }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

app.on('ready', () => {
  console.log('[main] app ready');
  createWindow();
  initApp().catch((err: unknown) => {
    console.error('[main] Failed to initialize app:', err);
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
