#!/usr/bin/env node
/**
 * ultimatedarktowerrelay-cli — headless relay daemon entry point.
 *
 * Starts the WebSocket relay server and a tower source, then wires the source's
 * commands into the relay so any connected consumer receives them.
 *
 * Usage:
 *   npx ultimatedarktowerrelay-cli         # tower emulator (companion app connects)
 *   node dist/index.js                     # same, from a source checkout
 *   TOWER_SOURCE=mock node dist/index.js   # BLE-free canned-command source
 *   TOWER_SOURCE=real node dist/index.js   # connect to a physical tower, relay its state
 *   TOWER_SOURCE=bridge node dist/index.js # app drives TowerEmulator; forward to a real master tower
 *
 * Environment:
 *   RELAY_PORT       TCP port for the WebSocket relay (default 8765).
 *   TOWER_SOURCE     'emulator' (default; legacy 'fake' accepted) → BLE TowerEmulator; 'mock' → MockTower;
 *                    'real' → RealTower; 'bridge' → TowerEmulator (app connects) + RealTower (forwarded to it).
 *   TOWER_DIS_*      Device Information Service overrides for the tower emulator (see readDeviceInfoFromEnv).
 *   LOGGING          '0' disables JSONL file logging (default enabled).
 *   RELAY_LOG_DIR    Directory for the JSONL logs (default './logs', relative to the
 *                    current working directory — which under `npx` is wherever the
 *                    player happened to run the command).
 *   RELAY_DASHBOARD  '0' disables the live Ink status board even on a TTY, falling back
 *                    to plain console lines (default: board on when stdout+stdin are TTYs).
 *
 * Steps:
 *   1. Construct the logger, the semantic-event log, parser, observer.
 *   2. Select the tower source (emulator / mock / real); build the synthesizer for sink-capable sources.
 *   3. Wire source 'command' → broadcast; lifecycle events → paused/resumed; mutate the live
 *      dashboard status object alongside the existing JSONL logging.
 *   4. Start the relay, then start the source.
 *   5. Gracefully shut down on SIGINT/SIGTERM (or 'q'/Ctrl-C in the dashboard).
 */

import {
  TowerEmulator,
  MockTower,
  RealTower,
  RelayServer,
  HostLogger,
  EventLog,
  CommandParser,
  ObserverDisplay,
  NotificationSynthesizer,
  type TowerSource,
  type NotificationSink,
  type DeviceInformation,
} from 'ultimatedarktowerrelay-core';
import {
  PROTOCOL_VERSION,
  makeCommandReceivedEvent,
  makeAppConnectedEvent,
  makeAppDisconnectedEvent,
  makeConsumerJoinedEvent,
  makeConsumerLeftEvent,
  type LogLevel,
} from 'ultimatedarktowerrelay-shared';
import { createDefaultTowerState } from 'ultimatedarktower';
import { startDashboard, type RelayStatus } from './dashboard.js';

const DEFAULT_PORT = 8765;
const MAX_ACTIVITY_ENTRIES = 200;

/** Hosted UTDD build — the UI this relay drives. Printed on startup. */
const UTDD_URL = 'https://chessmess.github.io/UltimateDarkTower/digital/';

/**
 * Read Device Information Service overrides from `TOWER_DIS_*` env vars (only the
 * ones set). The firmware revision gates the official app's "checking firmware"
 * screen; override it if the app reports the tower emulator as out of date. Effective
 * only on non-macOS hosts (see docs/MACOS_BLE_PERIPHERAL_LIMITATION.md).
 */
function readDeviceInfoFromEnv(): Partial<DeviceInformation> {
  const env = process.env;
  const info: Partial<DeviceInformation> = {};
  if (env['TOWER_DIS_MANUFACTURER']) info.manufacturerName = env['TOWER_DIS_MANUFACTURER'];
  if (env['TOWER_DIS_MODEL']) info.modelNumber = env['TOWER_DIS_MODEL'];
  if (env['TOWER_DIS_HARDWARE_REVISION'])
    info.hardwareRevision = env['TOWER_DIS_HARDWARE_REVISION'];
  if (env['TOWER_DIS_FIRMWARE_REVISION'])
    info.firmwareRevision = env['TOWER_DIS_FIRMWARE_REVISION'];
  if (env['TOWER_DIS_SOFTWARE_REVISION'])
    info.softwareRevision = env['TOWER_DIS_SOFTWARE_REVISION'];
  return info;
}

/** Mounted only when useDashboard is true; unmounted before shutdown/fatal-error output. */
let stopDashboard: (() => void) | null = null;

async function main(): Promise<void> {
  // TOWER_SOURCE: 'emulator' (default) | 'mock' | 'real' | 'bridge'. The legacy
  // value 'fake' is accepted as a back-compat alias for 'emulator' (anything not
  // real/mock/bridge falls through to the emulator).
  const sourceMode =
    process.env['TOWER_SOURCE'] === 'real'
      ? 'real'
      : process.env['TOWER_SOURCE'] === 'mock'
        ? 'mock'
        : process.env['TOWER_SOURCE'] === 'bridge'
          ? 'bridge'
          : 'emulator';

  const port = Number(process.env['RELAY_PORT'] ?? DEFAULT_PORT);
  const loggingEnabled = process.env['LOGGING'] !== '0';
  // cwd-relative by default. Under `npx` that is wherever the player ran the
  // command, not the package directory — RELAY_LOG_DIR is the escape hatch for
  // anyone who'd rather not have a logs/ folder appear next to them.
  const logDir = process.env['RELAY_LOG_DIR'] ?? './logs';

  // useInput()/setRawMode() throw outright when stdin isn't a TTY (piped, Docker
  // -d, systemd), so both streams must be checked, not just stdout.
  const useDashboard =
    process.stdout.isTTY === true &&
    process.stdin.isTTY === true &&
    process.env['RELAY_DASHBOARD'] !== '0';

  const status: RelayStatus = {
    version: PROTOCOL_VERSION,
    sourceMode,
    port,
    startedAt: Date.now(),
    utddUrl: UTDD_URL,
    loggingEnabled,
    towerEmulatorState: 'idle',
    companionConnected: false,
    bleAdapterState: null,
    towerState: createDefaultTowerState(),
    commandCount: 0,
    lastCommandAt: null,
    skullDropCount: null,
    clients: [],
    activity: [],
  };

  // Records a status-line for the dashboard's activity feed. In non-dashboard
  // mode this is the only thing standing in for the plain console.log/warn
  // lines the CLI used to print directly — same text, same stream (warn/error
  // go to stderr), just routed through one place.
  function note(kind: LogLevel, text: string): void {
    status.activity.push({ ts: Date.now(), kind, text: text.trim() });
    if (status.activity.length > MAX_ACTIVITY_ENTRIES) status.activity.shift();
    if (useDashboard) return;
    if (kind === 'warn' || kind === 'error') console.warn(text);
    else console.log(text);
  }

  note('event', `UltimateDarkTowerRelay v${PROTOCOL_VERSION} (source: ${sourceMode})`);

  const logger = new HostLogger(logDir, loggingEnabled);
  // Append-only JSONL log of semantic RelayEvents (PRD §7 / FR-6), separate from
  // the HostLogger's byte/command + human-readable debug log. EventLog assigns its
  // own monotonic seq across all semantic events.
  const eventLog = new EventLog(logDir, { enabled: loggingEnabled });

  // Select the tower source:
  //   emulator → real BLE peripheral the companion app connects to (default)
  //   mock     → BLE-free canned commands (headless verification)
  //   real     → connect to a physical tower as a central and relay its state (FR-5.1)
  // emulator/mock are NotificationSink-capable (the synthesizer sends return traffic
  // through them); a real tower generates its own notifications, so no synthesizer.
  let source: TowerSource;
  let sink: NotificationSink | null = null;
  let bridgeTarget: RealTower | null = null;
  if (sourceMode === 'real') {
    // RealTower drives the tower via UDT's high-level UltimateDarkTower class,
    // which monitors the connection (GATT health + verified battery heartbeat)
    // and fires onTowerDisconnect; RealTower reconnects with backoff.
    source = new RealTower();
  } else if (sourceMode === 'mock') {
    const mock = new MockTower({ intervalMs: 3000 });
    source = mock;
    sink = mock;
  } else if (sourceMode === 'bridge') {
    // Bridge: the app drives a TowerEmulator (broadcast source + notification sink),
    // and every app→tower command is forwarded onto a real master tower the relay
    // drives as central (write-back). Resolves PRD §11 Q5 (simultaneous emulator+real).
    const emulator = new TowerEmulator({ deviceInfo: readDeviceInfoFromEnv() });
    source = emulator;
    sink = emulator;
    bridgeTarget = new RealTower({ reconnect: true });
  } else {
    const emulator = new TowerEmulator({ deviceInfo: readDeviceInfoFromEnv() });
    source = emulator;
    sink = emulator;
  }
  const parser = new CommandParser();
  const observer = new ObserverDisplay();

  // NotificationSynthesizer closes the tower→app return loop for the emulator/mock
  // sources (participant skull drops + calibration reply). Not used for a real
  // tower, which generates its own notifications. Constructed before the relay
  // so onClientAction can drive it; its semantic events (command-received,
  // skull-dropped, calibration-complete, heartbeat) are persisted to the EventLog.
  const synth = sink ? new NotificationSynthesizer(sink) : null;
  if (synth) status.skullDropCount = synth.skullDropCount;
  synth?.on('event', (event) => eventLog.append(event));

  const relay = new RelayServer({
    port,
    onClientLog: (clientId, entries) => {
      logger.logEvent(
        'event',
        'host',
        `Received ${entries.length} log entries from ${clientId.slice(0, 8)}`,
      );
      logger.writeClientEntries(clientId, entries);
    },
    onClientConnected: (clientId, label, observerClient) => {
      logger.logEvent(
        'event',
        'host',
        `Client connected: ${label ?? clientId.slice(0, 8)}${observerClient ? ' (observer)' : ''}`,
      );
      eventLog.append(makeConsumerJoinedEvent(clientId, label, observerClient));
    },
    onClientDisconnected: (clientId, label) => {
      logger.logEvent('event', 'host', `Client disconnected: ${label ?? clientId.slice(0, 8)}`);
      eventLog.append(makeConsumerLeftEvent(clientId, label));
    },
    onClientReady: (clientId, ready, label) =>
      logger.logEvent(
        'event',
        'host',
        `Client ${label ?? clientId.slice(0, 8)} tower: ${ready ? 'connected' : 'disconnected'}`,
      ),
    onClientAction: (clientId, action, label) => {
      logger.logEvent('event', 'host', `Action '${action}' from ${label ?? clientId.slice(0, 8)}`);
      if (action !== 'dropSkull') return;
      if (!synth) {
        logger.logEvent(
          'warn',
          'host',
          'dropSkull ignored — real tower source generates its own notifications',
        );
        return;
      }
      const sent = synth.dropSkull();
      status.skullDropCount = synth.skullDropCount;
      if (!sent)
        logger.logEvent(
          'warn',
          'host',
          'dropSkull: no companion app subscriber — notification not sent',
        );
    },
  });
  relay.on('client-change', (clients) => {
    status.clients = clients;
  });

  // Wire tower commands → relay broadcast.
  source.on('command', (data) => {
    const parsed = parser.parse(data);
    if (!parsed.valid) {
      note('warn', `Dropping invalid command: wrong byte length ${Array.from(data).length}`);
      return;
    }
    observer.onCommandReceived(data);
    status.towerState = observer.getCurrentState();
    status.commandCount = observer.getCommandCount();
    status.lastCommandAt = observer.getLastReceivedAt();
    if (parsed.description) note('cmd', parsed.description);
    // parsed.description carries decoded snd/ovr annotations (undefined when none).
    logger.logCommand('companion→host', data, null, 'companion', parsed.description);
    const seq = relay.broadcast(data);
    logger.logCommand('host→clients', data, seq, 'host');
  });
  // Separate raw listener so the synthesizer (emulator/mock only) sees every command
  // (incl. a short calibration packet the 20-byte broadcast path above would drop).
  // The synthesizer emits the command-received RelayEvent itself; in real mode there
  // is no synthesizer, so append command-received here so the event log still records
  // the tower's commands (no double-emit — the branches are mutually exclusive).
  if (synth) source.on('command', (data) => synth.onCommand(data));
  else source.on('command', (data) => eventLog.append(makeCommandReceivedEvent(Array.from(data))));

  // Bridge mode: forward every app→tower command verbatim onto the real master
  // tower (incl. short packets like calibration), and log the real tower's own
  // lifecycle. It is a write-only target — its notifications are not broadcast,
  // and the app/TowerEmulator owns pause/resume.
  if (bridgeTarget) {
    const real = bridgeTarget;
    source.on('command', (data) => {
      void real
        .sendToTower(data)
        .catch((err) =>
          logger.logEvent('warn', 'host', `Bridge write to real tower failed: ${String(err)}`),
        );
    });
    real.on('state-change', (state) =>
      logger.logEvent('event', 'host', `Bridge real-tower state: ${state}`),
    );
    real.on('companion-connected', () =>
      logger.logEvent('event', 'host', 'Bridge: real master tower connected'),
    );
    real.on('companion-disconnected', () =>
      logger.logEvent('event', 'host', 'Bridge: real master tower disconnected — reconnecting'),
    );
  }
  source.on('state-change', (state) => {
    relay.setTowerEmulatorState(state);
    status.towerEmulatorState = state;
    logger.logEvent('event', 'host', `Tower source state: ${state}`);
  });
  source.on('companion-connected', () => {
    status.companionConnected = true;
    logger.logEvent('event', 'host', 'Companion app connected');
    eventLog.append(makeAppConnectedEvent());
    relay.broadcastResumed();
  });
  source.on('companion-disconnected', () => {
    status.companionConnected = false;
    logger.logEvent('event', 'host', 'Companion app disconnected');
    eventLog.append(makeAppDisconnectedEvent());
    synth?.reset();
    if (synth) status.skullDropCount = synth.skullDropCount;
    relay.broadcastPaused('Companion app disconnected from tower source');
  });
  if (source instanceof TowerEmulator) {
    source.on('ghost-connection', (fromState) => {
      logger.logEvent(
        'event',
        'host',
        `Ghost BLE connection detected (was ${fromState}) — recovering`,
      );
    });
    // Only TowerEmulator exposes BLE adapter state; mock/real sources have no
    // adapter to report (status.bleAdapterState stays null for them).
    status.bleAdapterState = source.getBleAdapterState();
    source.on('ble-adapter-state', (state) => {
      status.bleAdapterState = state;
    });
  }

  // relay-core writes unstructured console.log/warn/error from ~30 call sites
  // (TowerEmulator, RealTower, RelayServer, ConnectionManager, ObserverDisplay).
  // With the dashboard mounted those would print above the live frame and make
  // a full-screen board crawl down the terminal, so redirect them into the same
  // activity feed (still forwarded to the JSONL log so they survive there too).
  // Left untouched in non-dashboard mode — piped/Docker/systemd users still get
  // today's exact raw console output.
  let restoreConsole: (() => void) | null = null;
  if (useDashboard) {
    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);
    const toLine = (args: unknown[]): string =>
      args
        .map((a) =>
          typeof a === 'string'
            ? a
            : a instanceof Error
              ? (a.stack ?? a.message)
              : JSON.stringify(a),
        )
        .join(' ');
    console.log = (...args: unknown[]) => {
      const line = toLine(args);
      status.activity.push({ ts: Date.now(), kind: 'event', text: line });
      if (status.activity.length > MAX_ACTIVITY_ENTRIES) status.activity.shift();
      logger.logEvent('event', 'console', line);
    };
    console.warn = (...args: unknown[]) => {
      const line = toLine(args);
      status.activity.push({ ts: Date.now(), kind: 'warn', text: line });
      if (status.activity.length > MAX_ACTIVITY_ENTRIES) status.activity.shift();
      logger.logEvent('warn', 'console', line);
    };
    console.error = (...args: unknown[]) => {
      const line = toLine(args);
      status.activity.push({ ts: Date.now(), kind: 'error', text: line });
      if (status.activity.length > MAX_ACTIVITY_ENTRIES) status.activity.shift();
      logger.logEvent('error', 'console', line);
    };
    restoreConsole = () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    };
  }

  await relay.start();
  note('event', `Relay server listening on ws://0.0.0.0:${port}`);
  if (loggingEnabled) note('event', `Event log: ${eventLog.getPath()}`);

  await source.startAdvertising();
  if (bridgeTarget) {
    await bridgeTarget.startAdvertising(); // connects to the real master tower (retries in background)
  }
  note(
    'event',
    sourceMode === 'real'
      ? 'Connecting to real tower — relaying its state to consumers.'
      : sourceMode === 'mock'
        ? 'Mock tower source running — emitting canned commands.'
        : sourceMode === 'bridge'
          ? 'Bridge mode — app drives the tower emulator; commands forwarded to the real master tower.'
          : 'Advertising tower emulator — open the companion app to connect.',
  );

  // The player's next action shouldn't require finding a doc. UTDD is served over
  // https, but localhost is a "potentially trustworthy" origin and so is exempt
  // from mixed-content blocking — the hosted page can reach this ws:// relay.
  note('event', `Now open  ${UTDD_URL}  and click Connect.`);
  note('event', `Relay address for the "Official app" panel: ws://localhost:${port}`);

  // Graceful shutdown. Guarded against double-invocation — the dashboard's 'q'/
  // Ctrl-C path and an external SIGTERM (e.g. a supervisor escalating after
  // SIGINT) could both reach here.
  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    restoreConsole?.();
    console.log('\nShutting down…');
    synth?.destroy();
    await source.stopAdvertising();
    if (bridgeTarget) await bridgeTarget.stopAdvertising();
    await relay.stop();
    await logger.close();
    await eventLog.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    stopDashboard?.();
    void shutdown();
  });
  process.on('SIGTERM', () => {
    stopDashboard?.();
    void shutdown();
  });

  if (useDashboard) {
    stopDashboard = startDashboard(status, {
      quit: () => void shutdown(),
      resend: () => relay.resendLastCommand(),
      toggleLogging: () => {
        const enabled = logger.setEnabled(!logger.enabled);
        eventLog.setEnabled(enabled);
        relay.broadcastLogConfig(enabled);
        status.loggingEnabled = enabled;
      },
      toggleAdvertising: () => {
        const isOn =
          status.towerEmulatorState === 'advertising' || status.towerEmulatorState === 'connected';
        const action = isOn ? source.stopAdvertising() : source.startAdvertising();
        void action.catch((err) =>
          logger.logEvent('error', 'host', `Toggle advertising failed: ${String(err)}`),
        );
      },
      disconnectCompanion: () => {
        if (!status.companionConnected) return;
        const cycle = source.stopAdvertising().then(() => source.startAdvertising());
        void cycle.catch((err) =>
          logger.logEvent('error', 'host', `Disconnect failed: ${String(err)}`),
        );
      },
    });
  } else {
    console.log(`Relay port: ${port}`);
  }
}

main().catch((err) => {
  stopDashboard?.();
  console.error('Fatal error:', err);
  process.exit(1);
});
