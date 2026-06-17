/**
 * ultimatedarktowerrelay-cli — headless relay daemon entry point.
 *
 * Starts the WebSocket relay server and a tower source, then wires the source's
 * commands into the relay so any connected consumer receives them.
 *
 * Usage:
 *   node dist/index.js                 # fake BLE tower (companion app connects)
 *   TOWER_SOURCE=mock node dist/index.js   # BLE-free canned-command source
 *
 * Environment:
 *   RELAY_PORT   TCP port for the WebSocket relay (default 8765).
 *   TOWER_SOURCE 'fake' (default) → real BLE FakeTower; 'mock' → MockTower.
 *   LOGGING      '0' disables JSONL file logging (default enabled).
 *
 * Steps:
 *   1. Construct the RelayServer, logger, parser, observer.
 *   2. Select the tower source (FakeTower or MockTower).
 *   3. Wire source 'command' → broadcast; lifecycle events → paused/resumed.
 *   4. Start the relay, then start the source.
 *   5. Gracefully shut down on SIGINT/SIGTERM.
 */

import {
  FakeTower,
  MockTower,
  RelayServer,
  HostLogger,
  CommandParser,
  ObserverDisplay,
  NotificationSynthesizer,
  type TowerSource,
  type NotificationSink,
  type DeviceInformation,
} from 'ultimatedarktowerrelay-core';
import { PROTOCOL_VERSION } from 'ultimatedarktowerrelay-shared';

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
  const useMock = process.env['TOWER_SOURCE'] === 'mock';
  console.log(`UltimateDarkTowerRelay v${PROTOCOL_VERSION} (source: ${useMock ? 'mock' : 'fake'})`);

  const port = Number(process.env['RELAY_PORT'] ?? DEFAULT_PORT);
  const logger = new HostLogger('./logs', process.env['LOGGING'] !== '0');

  // Select the tower source. The MockTower re-emits a canned command every few
  // seconds so the relay path can be observed without a real companion app.
  // Both sources also satisfy NotificationSink so the synthesizer can send the
  // return traffic through them.
  const source: TowerSource & NotificationSink = useMock
    ? new MockTower({ intervalMs: 3000 })
    : new FakeTower({ deviceInfo: readDeviceInfoFromEnv() });
  const parser = new CommandParser();
  const observer = new ObserverDisplay();

  // NotificationSynthesizer closes the tower→app return loop: participant-driven
  // skull drops + a calibration-complete reply. Constructed before the relay so
  // the relay's onClientAction can drive it. Semantic events are logged here
  // (the persistent EventLog is Phase 4).
  const synth = new NotificationSynthesizer(source);
  synth.on('event', (event) => logger.logEvent('event', 'host', `RelayEvent: ${event.type}`));

  const relay = new RelayServer({
    port,
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
    onClientAction: (clientId, action, label) => {
      logger.logEvent('event', 'host', `Action '${action}' from ${label ?? clientId.slice(0, 8)}`);
      if (action === 'dropSkull') {
        const sent = synth.dropSkull();
        if (!sent) logger.logEvent('warn', 'host', 'dropSkull: no companion app subscriber — notification not sent');
      }
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
  // Separate raw listener so the synthesizer sees every command (incl. a short
  // calibration packet that the 20-byte broadcast path above would drop).
  source.on('command', (data) => synth.onCommand(data));
  source.on('state-change', (state) => {
    relay.setFakeTowerState(state);
    logger.logEvent('event', 'host', `Tower source state: ${state}`);
  });
  source.on('companion-connected', () => {
    logger.logEvent('event', 'host', 'Companion app connected');
    relay.broadcastResumed();
  });
  source.on('companion-disconnected', () => {
    logger.logEvent('event', 'host', 'Companion app disconnected');
    synth.reset();
    relay.broadcastPaused('Companion app disconnected from tower source');
  });
  if (source instanceof FakeTower) {
    source.on('ghost-connection', (fromState) => {
      logger.logEvent('event', 'host', `Ghost BLE connection detected (was ${fromState}) — recovering`);
    });
  }

  await relay.start();
  console.log(`Relay server listening on ws://0.0.0.0:${port}`);

  await source.startAdvertising();
  console.log(
    useMock
      ? 'Mock tower source running — emitting canned commands.'
      : 'Advertising fake tower — open the companion app to connect.'
  );

  // Graceful shutdown.
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down…');
    synth.destroy();
    await source.stopAdvertising();
    await relay.stop();
    await logger.close();
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
