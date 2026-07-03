import { app, BrowserWindow, ipcMain, shell, dialog, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  makeCommandReceivedEvent,
  makeAppConnectedEvent,
  makeAppDisconnectedEvent,
  makeConsumerJoinedEvent,
  makeConsumerLeftEvent,
  type RelayEvent,
} from 'ultimatedarktowerrelay-shared';
import type {
  NotificationSink,
  DeviceInformation,
  TowerSource,
  SessionSummary,
  TimelineRow,
} from 'ultimatedarktowerrelay-core';

// ─── Early file logging (captures output when launched from Finder) ─────────
// Set up BEFORE any native module imports so load failures are captured.
// Uses os.tmpdir() as fallback — app.getPath('userData') can fail before ready
// in some packaged Electron builds.
let _startupLogDir: string;
try {
  _startupLogDir = app.getPath('userData');
} catch {
  _startupLogDir = path.join(os.tmpdir(), 'DarkTowerRelay');
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

console.log('=== DarkTowerRelay startup ===');
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

/** Tower source the GUI can drive. (`bridge` stays CLI-only.) */
export type SourceMode = 'emulator' | 'mock' | 'real';

// ─── Log-viewer (FR-7.3) payload shapes ─────────────────────────────────────
// Analysis runs here in main (it has `fs`); the renderer renders the results
// read-only. Caps bound the IPC payload + DOM; the CLIs remain the unbounded path.
const TIMELINE_LIMIT = 500;
const EVENT_LIMIT = 2000;

/** A log file the viewer can list (a `session-*` or `events-*` JSONL). */
interface LogFileInfo {
  name: string;
  sizeBytes: number;
  mtimeMs: number;
}

interface LogListResult {
  sessions: LogFileInfo[];
  events: LogFileInfo[];
}

type LogAnalysisResult =
  | {
      ok: true;
      fileCount: number;
      summary: SessionSummary;
      timeline: { rows: TimelineRow[]; total: number };
      anomalies: Array<{ type: string; message: string }>;
    }
  | { ok: false; reason: string };

type EventLogResult =
  | { ok: true; events: RelayEvent[]; total: number; truncated: boolean }
  | { ok: false; reason: string };

// ─── Lazy-loaded core modules ───────────────────────────────────────────────
// Loaded inside initApp() so the file logging above captures any native module
// load failures (e.g. @stoprocent/bleno ABI mismatch). Importing the core barrel
// initializes bleno (CoreBluetooth); noble stays lazy until a real tower connects.
type CoreModule = typeof import('ultimatedarktowerrelay-core');
let TowerEmulator: CoreModule['TowerEmulator'];
let MockTower: CoreModule['MockTower'];
let RealTower: CoreModule['RealTower'];
let RelayServer: CoreModule['RelayServer'];
let HostLogger: CoreModule['HostLogger'];
let EventLog: CoreModule['EventLog'];
let CommandParser: CoreModule['CommandParser'];
let ObserverDisplay: CoreModule['ObserverDisplay'];
let NotificationSynthesizer: CoreModule['NotificationSynthesizer'];
let pruneOldLogs: CoreModule['pruneOldLogs'];
// Log-viewer (FR-7.3) — pure, BLE-free analysis helpers (the GUI runs them in main).
let loadEventLog: CoreModule['loadEventLog'];
let selectLogFiles: CoreModule['selectLogFiles'];
let parseLogLines: CoreModule['parseLogLines'];
let detectAnomalies: CoreModule['detectAnomalies'];
let buildSessionSummary: CoreModule['buildSessionSummary'];
let buildCommandTimeline: CoreModule['buildCommandTimeline'];

type Synth = InstanceType<CoreModule['NotificationSynthesizer']>;

// Stable services (instantiated once in initApp)
let relay: InstanceType<CoreModule['RelayServer']>;
let logger: InstanceType<CoreModule['HostLogger']>;
let eventLog: InstanceType<CoreModule['EventLog']>;
let parser: InstanceType<CoreModule['CommandParser']>;
let observer: InstanceType<CoreModule['ObserverDisplay']>;

// Swappable source + its synthesizer (rebuilt by switchSource). Typed as the
// TowerSource seam (its `on` overloads cover the 4 common events); TowerEmulator's
// extra events (ble-adapter-state / ghost-connection) are reached via instanceof.
let currentMode: SourceMode = readSourceMode();
let currentSource: TowerSource | null = null;
let currentSynth: Synth | null = null;

let commandCount = 0;
let towerState: string = 'idle';
let relayStatus: { running: boolean; port: number; message: string; urls: string[] } = {
  running: false,
  port: Number(process.env['RELAY_PORT'] ?? 8765),
  message: 'Starting…',
  urls: [],
};
let bleAdapterState = 'unknown';
let mainWindow: BrowserWindow | null = null;

/**
 * Initial source from `TOWER_SOURCE` env; `bridge` falls back to the emulator
 * (GUI-unsupported). The legacy value `fake` is accepted as an alias for `emulator`.
 */
function readSourceMode(): SourceMode {
  const v = process.env['TOWER_SOURCE'];
  return v === 'real' ? 'real' : v === 'mock' ? 'mock' : 'emulator';
}

/**
 * Read Device Information Service overrides from `TOWER_DIS_*` env vars (only the
 * ones set). The firmware revision gates the official app's "checking firmware"
 * screen; effective only on non-macOS hosts.
 */
function readDeviceInfoFromEnv(): Partial<DeviceInformation> {
  const env = process.env;
  const info: Partial<DeviceInformation> = {};
  if (env['TOWER_DIS_MANUFACTURER']) info.manufacturerName = env['TOWER_DIS_MANUFACTURER'];
  if (env['TOWER_DIS_MODEL']) info.modelNumber = env['TOWER_DIS_MODEL'];
  if (env['TOWER_DIS_HARDWARE_REVISION']) info.hardwareRevision = env['TOWER_DIS_HARDWARE_REVISION'];
  if (env['TOWER_DIS_FIRMWARE_REVISION']) info.firmwareRevision = env['TOWER_DIS_FIRMWARE_REVISION'];
  if (env['TOWER_DIS_SOFTWARE_REVISION']) info.softwareRevision = env['TOWER_DIS_SOFTWARE_REVISION'];
  return info;
}

/** Return non-internal IPv4 addresses suitable for LAN clients. */
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const nets of Object.values(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

// ─── Window sizing + persisted state ────────────────────────────────────────

// Default window size on first run (no persisted state). Width is the operator's
// to adjust (persisted); height is auto-fit to the rendered content (the renderer
// measures and asks main to resize on load + whenever the Logging section
// collapses/expands), so the launch height naturally matches the layout.
const DEFAULT_WIDTH = 860;
const DEFAULT_HEIGHT = 900;
/** Lower bound for the auto-fit content height (px). */
const MIN_CONTENT_HEIGHT = 240;
/** Slack kept below the display work area so the window never fills the screen. */
const SCREEN_MARGIN = 48;

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

function windowStateFile(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

/** Read the persisted window bounds, or null if absent/invalid. */
function loadWindowState(): WindowState | null {
  try {
    const s = JSON.parse(fs.readFileSync(windowStateFile(), 'utf-8')) as WindowState;
    if (typeof s.width === 'number' && typeof s.height === 'number') return s;
  } catch {
    /* no/invalid state */
  }
  return null;
}

/** True if the saved position lands on a currently-connected display. */
function isOnScreen(s: WindowState): boolean {
  if (typeof s.x !== 'number' || typeof s.y !== 'number') return false;
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return (
      s.x! >= a.x - 50 &&
      s.y! >= a.y - 50 &&
      s.x! <= a.x + a.width - 100 &&
      s.y! <= a.y + a.height - 100
    );
  });
}

function saveWindowStateNow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const b = mainWindow.getBounds();
    fs.writeFileSync(windowStateFile(), JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height }));
  } catch {
    /* best-effort */
  }
}

let _saveStateTimer: ReturnType<typeof setTimeout> | null = null;
function saveWindowStateDebounced(): void {
  if (_saveStateTimer) clearTimeout(_saveStateTimer);
  _saveStateTimer = setTimeout(saveWindowStateNow, 400);
}

/**
 * Resize the window's content area to `desired` px tall (the renderer's measured
 * content height), clamped so the window never exceeds the display work area.
 * Width and position are preserved. Also reveals the window the first time, so
 * the user never sees a pre-fit size jump.
 */
function resizeToContentHeight(desired: number): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (Number.isFinite(desired)) {
    const [w, contentH] = mainWindow.getContentSize();
    const [, fullH] = mainWindow.getSize();
    const chrome = fullH - contentH; // title bar / frame
    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const maxContent = display.workArea.height - chrome - SCREEN_MARGIN;
    const clamped = Math.max(MIN_CONTENT_HEIGHT, Math.min(Math.ceil(desired), maxContent));
    if (Math.abs(clamped - contentH) > 1) {
      mainWindow.setContentSize(w, clamped, false);
    }
  }
  if (!mainWindow.isVisible()) mainWindow.show();
}

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow(): void {
  const saved = loadWindowState();
  const restorePos = saved !== null && isOnScreen(saved);

  mainWindow = new BrowserWindow({
    // Width + position are restored from the last run; height is auto-fit to the
    // rendered content (see resizeToContentHeight). Start hidden and reveal after
    // the renderer's first measurement so the launch size matches the layout.
    width: saved?.width ?? DEFAULT_WIDTH,
    height: saved?.height ?? DEFAULT_HEIGHT,
    ...(restorePos ? { x: saved!.x, y: saved!.y } : {}),
    minWidth: 520,
    minHeight: 360,
    show: false,
    title: 'Dark Tower Relay — Operator Console',
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

  // Persist size/position the operator sets (debounced); flush on close.
  mainWindow.on('resize', saveWindowStateDebounced);
  mainWindow.on('move', saveWindowStateDebounced);
  mainWindow.on('close', saveWindowStateNow);

  // Safety net: reveal the window even if the renderer never reports a height.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  }, 1800);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Source construction + wiring (the relay composition root) ──────────────

/** Build a tower source for the given mode, plus its NotificationSink (null for real). */
function buildSource(mode: SourceMode): { source: TowerSource; sink: NotificationSink | null } {
  if (mode === 'real') {
    // RealTower drives the tower via UDT's high-level class (monitored reconnect).
    return { source: new RealTower({ reconnect: true }), sink: null };
  }
  if (mode === 'mock') {
    const mock = new MockTower({ intervalMs: 3000 });
    return { source: mock, sink: mock };
  }
  const emulator = new TowerEmulator({ deviceInfo: readDeviceInfoFromEnv() });
  return { source: emulator, sink: emulator };
}

/**
 * Attach every source listener (mirrors the CLI composition root) and build the
 * synthesizer for sink-capable sources. The synthesizer's semantic events are
 * persisted to the EventLog. `command-received` is emitted by the synthesizer
 * (emulator/mock) or appended directly here (real) — never both.
 */
function wireSource(source: TowerSource, sink: NotificationSink | null): void {
  currentSynth = sink ? new NotificationSynthesizer(sink) : null;
  currentSynth?.on('event', (event) => eventLog.append(event));

  source.on('command', (data) => {
    const parsed = parser.parse(data);
    if (!parsed.valid) {
      console.warn('[main] Dropping invalid command: wrong byte length', Array.from(data).length);
      return;
    }
    observer.onCommandReceived(data);
    // parsed.description carries decoded snd/ovr annotations (undefined when none).
    logger.logCommand('companion→host', data, null, 'companion', parsed.description);
    const seq = relay.broadcast(data);
    logger.logCommand('host→clients', data, seq, 'host');
    commandCount += 1;
    mainWindow?.webContents.send(IPC.TOWER_COMMAND, {
      count: commandCount,
      lastAt: new Date().toISOString(),
    });
  });

  // Synthesizer (emulator/mock) sees every command incl. short calibration packets and
  // emits the command-received event itself; in real mode there is no synthesizer,
  // so append command-received here (branches are mutually exclusive — no double-emit).
  if (currentSynth) {
    const synth = currentSynth;
    source.on('command', (data) => synth.onCommand(data));
  } else {
    source.on('command', (data) => eventLog.append(makeCommandReceivedEvent(Array.from(data))));
  }

  source.on('state-change', (state) => {
    towerState = state;
    relay.setTowerEmulatorState(state);
    logger.logEvent('event', 'host', `Tower source state: ${state}`);
    mainWindow?.webContents.send(IPC.TOWER_STATE, { state });
  });

  source.on('companion-connected', () => {
    logger.logEvent('event', 'host', 'Companion app connected');
    eventLog.append(makeAppConnectedEvent());
    relay.broadcastResumed();
  });

  source.on('companion-disconnected', () => {
    logger.logEvent('event', 'host', 'Companion app disconnected');
    eventLog.append(makeAppDisconnectedEvent());
    currentSynth?.reset();
    relay.broadcastPaused('Companion app disconnected from tower source');
  });

  // BLE-adapter-state + ghost-connection are TowerEmulator-only (not on TowerSource).
  if (source instanceof TowerEmulator) {
    source.on('ble-adapter-state', (state) => {
      bleAdapterState = state;
      mainWindow?.webContents.send(IPC.BLE_ADAPTER_STATE, { state });
    });
    source.on('ghost-connection', (fromState) => {
      logger.logEvent('event', 'host', `Ghost BLE connection detected (was ${fromState}) — recovering`);
    });
  }
}

/** Tear down the current source/synth (called on switch + shutdown). */
async function teardownSource(): Promise<void> {
  const old = currentSource;
  if (!old) return;
  try { await old.stopAdvertising(); } catch { /* best-effort */ }
  try { currentSynth?.destroy(); } catch { /* best-effort */ }
  // TowerSource doesn't declare EventEmitter members, but every concrete source
  // extends EventEmitter — drop the listeners we attached in wireSource().
  (old as unknown as { removeAllListeners(): void }).removeAllListeners();
  // Only TowerEmulator owns bleno listeners that must be torn down before re-creation.
  if (old instanceof TowerEmulator) {
    try { old.destroy(); } catch { /* best-effort */ }
  }
  currentSynth = null;
  currentSource = null;
}

/** Swap the live tower source at runtime. The relay/logger/eventLog stay up. */
async function switchSource(mode: SourceMode): Promise<{ ok: boolean; reason?: string }> {
  if (mode === currentMode && currentSource) return { ok: true };
  console.log(`[main] Switching tower source: ${currentMode} → ${mode}`);
  relay.broadcastPaused(`Switching tower source to ${mode}…`);
  await teardownSource();

  currentMode = mode;
  const { source, sink } = buildSource(mode);
  currentSource = source;
  wireSource(source, sink);
  mainWindow?.webContents.send(IPC.SOURCE_CHANGED, { source: mode });

  // Non-emulator sources have no BLE-adapter state; reflect that in the UI.
  if (mode !== 'emulator') {
    bleAdapterState = 'n/a';
    mainWindow?.webContents.send(IPC.BLE_ADAPTER_STATE, { state: 'n/a' });
  }

  try {
    await source.startAdvertising();
    logger.logEvent('event', 'host', `Tower source switched to '${mode}'`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[main] startAdvertising after switch failed:', err);
    towerState = 'error';
    mainWindow?.webContents.send(IPC.TOWER_STATE, { state: 'error', detail: msg });
    return { ok: false, reason: msg };
  }
}

// ─── App initialization (loads native modules, wires events) ────────────────

async function initApp(): Promise<void> {
  console.log('[main] Loading core modules…');

  try {
    const core = await import('ultimatedarktowerrelay-core');
    TowerEmulator = core.TowerEmulator;
    MockTower = core.MockTower;
    RealTower = core.RealTower;
    RelayServer = core.RelayServer;
    HostLogger = core.HostLogger;
    EventLog = core.EventLog;
    CommandParser = core.CommandParser;
    ObserverDisplay = core.ObserverDisplay;
    NotificationSynthesizer = core.NotificationSynthesizer;
    pruneOldLogs = core.pruneOldLogs;
    loadEventLog = core.loadEventLog;
    selectLogFiles = core.selectLogFiles;
    parseLogLines = core.parseLogLines;
    detectAnomalies = core.detectAnomalies;
    buildSessionSummary = core.buildSessionSummary;
    buildCommandTimeline = core.buildCommandTimeline;
  } catch (err) {
    console.error('[main] FATAL: Failed to load core modules:', err);
    dialog.showErrorBox(
      'Dark Tower Relay — Startup Error',
      `Failed to load native modules.\n\n${err instanceof Error ? err.message : String(err)}\n\nCheck the startup.log in the app's userData folder for details.`,
    );
    app.exit(1);
    return;
  }

  console.log('[main] Core modules loaded successfully');

  // ── Instantiate stable services ─────────────────────────────────────────
  const logDir = path.join(app.getPath('userData'), 'logs');
  const loggingEnabled = process.env['LOGGING'] !== '0';
  logger = new HostLogger(logDir, {
    enabled: loggingEnabled,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  });
  // Append-only JSONL semantic-event log (PRD §7 / FR-6), separate stream.
  eventLog = new EventLog(logDir, { enabled: loggingEnabled });

  // Best-effort cleanup of old log files at startup.
  pruneOldLogs(logDir, 30)
    .then((n) => { if (n > 0) console.log(`[main] Pruned ${n} old log file(s)`); })
    .catch(() => { /* best-effort */ });

  parser = new CommandParser();
  observer = new ObserverDisplay();

  relay = new RelayServer({
    port: Number(process.env['RELAY_PORT'] ?? 8765),
    onClientLog: (clientId, entries) => {
      logger.logEvent('event', 'host', `Received ${entries.length} log entries from ${clientId.slice(0, 8)}`);
      logger.writeClientEntries(clientId, entries);
    },
    onClientConnected: (clientId, label, observer) => {
      logger.logEvent('event', 'host', `Client connected: ${label ?? clientId.slice(0, 8)}${observer ? ' (observer)' : ''}`);
      eventLog.append(makeConsumerJoinedEvent(clientId, label, observer));
    },
    onClientDisconnected: (clientId, label) => {
      logger.logEvent('event', 'host', `Client disconnected: ${label ?? clientId.slice(0, 8)}`);
      eventLog.append(makeConsumerLeftEvent(clientId, label));
    },
    onClientReady: (clientId, ready, label) =>
      logger.logEvent('event', 'host', `Client ${label ?? clientId.slice(0, 8)} tower: ${ready ? 'connected' : 'disconnected'}`),
    onClientAction: (clientId, action, label) => {
      logger.logEvent('event', 'host', `Action '${action}' from ${label ?? clientId.slice(0, 8)}`);
      if (action !== 'dropSkull') return;
      if (!currentSynth) {
        logger.logEvent('warn', 'host', `dropSkull ignored — source '${currentMode}' generates its own notifications`);
        return;
      }
      const sent = currentSynth.dropSkull();
      if (!sent) logger.logEvent('warn', 'host', 'dropSkull: no companion app subscriber — notification not sent');
    },
  });

  relay.on('client-change', (clients) => {
    mainWindow?.webContents.send(IPC.RELAY_CLIENT_CHANGE, { clients });
  });

  console.log('[main] Services instantiated');

  // ── Build the initial tower source ──────────────────────────────────────
  const { source, sink } = buildSource(currentMode);
  currentSource = source;
  wireSource(source, sink);

  // ── Register IPC handlers (depend on core modules) ──────────────────────
  ipcMain.handle(IPC.TRIGGER_SKULL_DROP, (): { ok: boolean; reason?: string } => {
    if (!currentSynth) {
      return { ok: false, reason: `Source '${currentMode}' generates its own notifications` };
    }
    const sent = currentSynth.dropSkull();
    if (sent) return { ok: true };
    const reason = towerState !== 'connected'
      ? `Tower is ${towerState} — companion app not connected`
      : 'No active BLE subscriber';
    return { ok: false, reason };
  });

  ipcMain.handle(IPC.TOWER_START_ADVERTISING, async (): Promise<{ ok: boolean; reason?: string }> => {
    try {
      await currentSource?.startAdvertising();
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(IPC.TOWER_STOP_ADVERTISING, async (): Promise<{ ok: boolean; reason?: string }> => {
    try {
      await currentSource?.stopAdvertising();
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(IPC.SET_SOURCE, (_e, mode: SourceMode): Promise<{ ok: boolean; reason?: string }> => {
    if (mode !== 'emulator' && mode !== 'mock' && mode !== 'real') {
      return Promise.resolve({ ok: false, reason: `Unknown source '${String(mode)}'` });
    }
    return switchSource(mode);
  });

  ipcMain.handle(IPC.TOGGLE_LOGGING, (): { enabled: boolean } => {
    const enabled = logger.setEnabled(!logger.enabled);
    eventLog.setEnabled(enabled);
    relay.broadcastLogConfig(enabled);
    return { enabled };
  });

  ipcMain.handle(IPC.GET_LOGGING_STATE, (): { enabled: boolean } => ({ enabled: logger.enabled }));

  ipcMain.handle(IPC.OPEN_LOG_DIR, async (): Promise<void> => {
    await shell.openPath(logger.getLogDir());
  });

  // ── Log viewer (FR-7.3) — analysis runs HERE in main (it has fs); the
  //    renderer only renders the structured results. The renderer never reads
  //    files: main owns `logDir` and validates every requested filename.
  const fileInfo = (name: string): LogFileInfo => {
    try {
      const st = fs.statSync(path.join(logDir, name));
      return { name, sizeBytes: st.size, mtimeMs: st.mtimeMs };
    } catch {
      return { name, sizeBytes: 0, mtimeMs: 0 };
    }
  };

  ipcMain.handle(IPC.LOGS_LIST, (): LogListResult => {
    let files: string[];
    try {
      files = fs.readdirSync(logDir);
    } catch {
      return { sessions: [], events: [] };
    }
    const sessions = selectLogFiles(files, null).map(fileInfo);
    const events = files
      .filter((f) => /^events-.*\.jsonl$/.test(f))
      .sort()
      .map(fileInfo);
    return { sessions, events };
  });

  ipcMain.handle(IPC.LOGS_ANALYZE, (_e, arg: { session: string | null }): LogAnalysisResult => {
    let files: string[];
    try {
      files = fs.readdirSync(logDir);
    } catch {
      return { ok: false, reason: 'No log directory yet' };
    }
    const session = arg?.session ?? null;
    const selected = selectLogFiles(files, session);
    if (selected.length === 0) {
      return {
        ok: false,
        reason: session ? `No session logs match "${session}"` : 'No session logs found',
      };
    }
    try {
      const contents = selected.map((f) => fs.readFileSync(path.join(logDir, f), 'utf-8'));
      const entries = parseLogLines(contents);
      if (entries.length === 0) {
        return { ok: false, reason: 'No log entries found' };
      }
      return {
        ok: true,
        fileCount: selected.length,
        summary: buildSessionSummary(entries),
        timeline: buildCommandTimeline(entries, { limit: TIMELINE_LIMIT }),
        anomalies: detectAnomalies(entries).map(({ type, message }) => ({ type, message })),
      };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(IPC.LOGS_LOAD_EVENTS, (_e, arg: { file: string }): EventLogResult => {
    const name = path.basename(String(arg?.file ?? ''));
    if (!/^events-.*\.jsonl$/.test(name)) {
      return { ok: false, reason: 'Invalid event-log file' };
    }
    const full = path.join(logDir, name);
    if (!fs.existsSync(full)) {
      return { ok: false, reason: 'Event-log file not found' };
    }
    let all: RelayEvent[];
    try {
      all = loadEventLog(full);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
    const truncated = all.length > EVENT_LIMIT;
    return {
      ok: true,
      events: truncated ? all.slice(-EVENT_LIMIT) : all,
      total: all.length,
      truncated,
    };
  });

  console.log('[main] IPC handlers registered');

  // ── Start services ─────────────────────────────────────────────────────
  await startServices();
}

// ─── IPC handlers that don't depend on core modules ─────────────────────────

ipcMain.handle(IPC.GET_VERSION, () => app.getVersion());
ipcMain.handle(IPC.GET_RELAY_STATUS, () => relayStatus);
ipcMain.handle(IPC.GET_BLE_STATE, () => ({ state: bleAdapterState }));
ipcMain.handle(IPC.GET_TOWER_STATE, () => ({ state: towerState }));
ipcMain.handle(IPC.GET_SOURCE, () => ({ source: currentMode }));
ipcMain.handle(IPC.RESEND_LAST_STATE, (): { ok: boolean; reason?: string } => {
  if (!relay) return { ok: false, reason: 'Relay not started yet' };
  const sent = relay.resendLastCommand();
  if (sent) {
    logger?.logEvent('event', 'host', 'Operator triggered resend of last tower state');
    return { ok: true };
  }
  return { ok: false, reason: 'No command has been relayed yet' };
});

// Fit the window to the renderer's measured content height (on load + whenever
// the Logging section collapses/expands). One-way; clamped to the display.
ipcMain.on(IPC.RESIZE_CONTENT_HEIGHT, (_e, desired: number) => {
  resizeToContentHeight(desired);
});

// ─── Service startup ────────────────────────────────────────────────────────

async function startServices(): Promise<void> {
  const relayPort = process.env['RELAY_PORT'] ?? 8765;

  try {
    await relay.start();
    const urls = getLocalIPs().map((ip) => `ws://${ip}:${relayPort}`);
    relayStatus = { running: true, port: Number(relayPort), message: `Relay listening on ${relayPort}`, urls };
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
      console.error(`[main] Relay port ${relayPort} is already in use. Stop the other process or set RELAY_PORT.`);
    } else {
      relayStatus = {
        running: false,
        port: Number(relayPort),
        message: `Relay failed to start: ${e.message ?? 'unknown error'}`,
        urls: [],
      };
      console.error('[main] Failed to start relay server:', err);
    }
    mainWindow?.webContents.send(IPC.RELAY_STATUS, relayStatus);
  }

  try {
    await currentSource?.startAdvertising();
    console.log(`[main] Tower source '${currentMode}' started.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[main] Failed to start tower source:', err);
    mainWindow?.webContents.send(IPC.TOWER_STATE, { state: 'error', detail: msg });
  }
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('[main] Shutting down…');
  try { currentSynth?.destroy(); } catch { /* best-effort */ }
  try { if (currentSource) await currentSource.stopAdvertising(); } catch { /* best-effort */ }
  try { if (relay) await relay.stop(); } catch { /* best-effort */ }
  try { if (logger) await logger.close(); } catch { /* best-effort */ }
  try { if (eventLog) await eventLog.close(); } catch { /* best-effort */ }
  try { if (currentSource instanceof TowerEmulator) currentSource.destroy(); } catch { /* best-effort */ }
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

  shutdown().finally(() => {
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
