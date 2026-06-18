/**
 * ultimatedarktowerrelay-cli — headless relay daemon entry point.
 *
 * Starts the WebSocket relay server and a tower source, then wires the source's
 * commands into the relay so any connected consumer receives them.
 *
 * Usage:
 *   node dist/index.js                     # fake BLE tower (companion app connects)
 *   TOWER_SOURCE=mock node dist/index.js   # BLE-free canned-command source
 *   TOWER_SOURCE=real node dist/index.js   # connect to a physical tower, relay its state
 *   TOWER_SOURCE=bridge node dist/index.js # app drives FakeTower; forward to a real master tower
 *
 * Environment:
 *   RELAY_PORT    TCP port for the WebSocket relay (default 8765).
 *   TOWER_SOURCE  'fake' (default) → BLE FakeTower; 'mock' → MockTower; 'real' → RealTower;
 *                 'bridge' → FakeTower (app connects) + RealTower (commands forwarded to it).
 *   TOWER_DIS_*   Device Information Service overrides for the fake tower (see readDeviceInfoFromEnv).
 *   LOGGING       '0' disables JSONL file logging (default enabled).
 *
 * Steps:
 *   1. Construct the logger, the semantic-event log, parser, observer.
 *   2. Select the tower source (fake / mock / real); build the synthesizer for sink-capable sources.
 *   3. Wire source 'command' → broadcast; lifecycle events → paused/resumed.
 *   4. Start the relay, then start the source.
 *   5. Gracefully shut down on SIGINT/SIGTERM.
 */

import {
  FakeTower,
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
} from 'ultimatedarktowerrelay-shared';

const DEFAULT_PORT = 8765;

/**
 * Read Device Information Service overrides from `TOWER_DIS_*` env vars (only the
 * ones set). The firmware revision gates the official app's "checking firmware"
 * screen; override it if the app reports the fake tower as out of date. Effective
 * only on non-macOS hosts (see docs/MACOS_BLE_PERIPHERAL_LIMITATION.md).
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

async function main(): Promise<void> {
  const sourceMode =
    process.env['TOWER_SOURCE'] === 'real'
      ? 'real'
      : process.env['TOWER_SOURCE'] === 'mock'
        ? 'mock'
        : process.env['TOWER_SOURCE'] === 'bridge'
          ? 'bridge'
          : 'fake';
  console.log(`UltimateDarkTowerRelay v${PROTOCOL_VERSION} (source: ${sourceMode})`);

  const port = Number(process.env['RELAY_PORT'] ?? DEFAULT_PORT);
  const loggingEnabled = process.env['LOGGING'] !== '0';
  const logger = new HostLogger('./logs', loggingEnabled);
  // Append-only JSONL log of semantic RelayEvents (PRD §7 / FR-6), separate from
  // the HostLogger's byte/command + human-readable debug log. EventLog assigns its
  // own monotonic seq across all semantic events.
  const eventLog = new EventLog('./logs', { enabled: loggingEnabled });

  // Select the tower source:
  //   fake → real BLE peripheral the companion app connects to (default)
  //   mock → BLE-free canned commands (headless verification)
  //   real → connect to a physical tower as a central and relay its state (FR-5.1)
  // fake/mock are NotificationSink-capable (the synthesizer sends return traffic
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
    // Bridge: the app drives a FakeTower (broadcast source + notification sink),
    // and every app→tower command is forwarded onto a real master tower the relay
    // drives as central (write-back). Resolves PRD §11 Q5 (simultaneous fake+real).
    const fake = new FakeTower({ deviceInfo: readDeviceInfoFromEnv() });
    source = fake;
    sink = fake;
    bridgeTarget = new RealTower({ reconnect: true });
  } else {
    const fake = new FakeTower({ deviceInfo: readDeviceInfoFromEnv() });
    source = fake;
    sink = fake;
  }
  const parser = new CommandParser();
  const observer = new ObserverDisplay();

  // NotificationSynthesizer closes the tower→app return loop for the fake/mock
  // sources (participant skull drops + calibration reply). Not used for a real
  // tower, which generates its own notifications. Constructed before the relay
  // so onClientAction can drive it; its semantic events (command-received,
  // skull-dropped, calibration-complete, heartbeat) are persisted to the EventLog.
  const synth = sink ? new NotificationSynthesizer(sink) : null;
  synth?.on('event', (event) => eventLog.append(event));

  const relay = new RelayServer({
    port,
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
      if (!synth) {
        logger.logEvent('warn', 'host', 'dropSkull ignored — real tower source generates its own notifications');
        return;
      }
      const sent = synth.dropSkull();
      if (!sent) logger.logEvent('warn', 'host', 'dropSkull: no companion app subscriber — notification not sent');
    },
  });

  // Wire tower commands → relay broadcast.
  source.on('command', (data) => {
    if (!parser.isValid(data)) {
      console.warn('Dropping invalid command: wrong byte length', Array.from(data).length);
      return;
    }
    observer.onCommandReceived(data);
    logger.logCommand('companion→host', data, null, 'companion');
    const seq = relay.broadcast(data);
    logger.logCommand('host→clients', data, seq, 'host');
  });
  // Separate raw listener so the synthesizer (fake/mock only) sees every command
  // (incl. a short calibration packet the 20-byte broadcast path above would drop).
  // The synthesizer emits the command-received RelayEvent itself; in real mode there
  // is no synthesizer, so append command-received here so the event log still records
  // the tower's commands (no double-emit — the branches are mutually exclusive).
  if (synth) source.on('command', (data) => synth.onCommand(data));
  else source.on('command', (data) => eventLog.append(makeCommandReceivedEvent(Array.from(data))));

  // Bridge mode: forward every app→tower command verbatim onto the real master
  // tower (incl. short packets like calibration), and log the real tower's own
  // lifecycle. It is a write-only target — its notifications are not broadcast,
  // and the app/FakeTower owns pause/resume.
  if (bridgeTarget) {
    const real = bridgeTarget;
    source.on('command', (data) => {
      void real.sendToTower(data).catch((err) =>
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
    relay.setFakeTowerState(state);
    logger.logEvent('event', 'host', `Tower source state: ${state}`);
  });
  source.on('companion-connected', () => {
    logger.logEvent('event', 'host', 'Companion app connected');
    eventLog.append(makeAppConnectedEvent());
    relay.broadcastResumed();
  });
  source.on('companion-disconnected', () => {
    logger.logEvent('event', 'host', 'Companion app disconnected');
    eventLog.append(makeAppDisconnectedEvent());
    synth?.reset();
    relay.broadcastPaused('Companion app disconnected from tower source');
  });
  if (source instanceof FakeTower) {
    source.on('ghost-connection', (fromState) => {
      logger.logEvent('event', 'host', `Ghost BLE connection detected (was ${fromState}) — recovering`);
    });
  }

  await relay.start();
  console.log(`Relay server listening on ws://0.0.0.0:${port}`);
  if (loggingEnabled) console.log(`Event log: ${eventLog.getPath()}`);

  await source.startAdvertising();
  if (bridgeTarget) {
    await bridgeTarget.startAdvertising(); // connects to the real master tower (retries in background)
  }
  console.log(
    sourceMode === 'real'
      ? 'Connecting to real tower — relaying its state to consumers.'
      : sourceMode === 'mock'
        ? 'Mock tower source running — emitting canned commands.'
        : sourceMode === 'bridge'
          ? 'Bridge mode — app drives the fake tower; commands forwarded to the real master tower.'
          : 'Advertising fake tower — open the companion app to connect.'
  );

  // Graceful shutdown.
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down…');
    synth?.destroy();
    await source.stopAdvertising();
    if (bridgeTarget) await bridgeTarget.stopAdvertising();
    await relay.stop();
    await logger.close();
    await eventLog.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  console.log(`Relay port: ${port}`);
}

// Only run as a standalone process — not when imported.
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
