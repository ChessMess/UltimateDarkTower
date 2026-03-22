/**
 * @dark-tower-sync/host — entry point
 *
 * Starts the fake BLE tower peripheral and the WebSocket relay server.
 *
 * Usage:
 *   node dist/index.js
 *   (or via npm run start in packages/host)
 *
 * The host process:
 *   1. Instantiates FakeTower and RelayServer.
 *   2. Starts the WebSocket relay server.
 *   3. Wires FakeTower.onCommandReceived → RelayServer.broadcast.
 *   4. Starts BLE advertising so the companion app can connect.
 *   5. Gracefully shuts down on SIGINT/SIGTERM.
 */

// Public API — re-export classes for use as a library (e.g., from Electron main).
export { FakeTower } from './fakeTower';
export { RelayServer } from './relayServer';
export { HostLogger, pruneOldLogs } from './logger';
export { CommandParser } from './commandParser';
export type { HostLoggerOptions } from './logger';
export type { RelayServerOptions } from './relayServer';
export type { CommandReceivedCallback } from './fakeTower';

import { FakeTower } from './fakeTower';
import { RelayServer } from './relayServer';
import { HostLogger } from './logger';
import { CommandParser } from './commandParser';
import { PROTOCOL_VERSION } from '@dark-tower-sync/shared';

const DEFAULT_PORT = 8765;

async function main(): Promise<void> {
  console.log(`DarkTowerSync host v${PROTOCOL_VERSION}`);

  const port = Number(process.env['RELAY_PORT'] ?? DEFAULT_PORT);
  const logger = new HostLogger('./logs', process.env['LOGGING'] !== '0');
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
  });
  const tower = new FakeTower();
  const parser = new CommandParser();

  // Wire tower commands → relay broadcast.
  tower.onCommandReceived = (data) => {
    if (!parser.isValid(data)) {
      console.warn('Dropping invalid command: wrong byte length', Array.from(data).length);
      return;
    }
    logger.logCommand('companion→host', data, null, 'companion');
    const seq = relay.broadcast(data);
    logger.logCommand('host→clients', data, seq, 'host');
  };
  tower.on('state-change', (state) => {
    relay.setFakeTowerState(state);
    logger.logEvent('event', 'host', `FakeTower state: ${state}`);
  });
  tower.on('companion-connected', () => {
    logger.logEvent('event', 'host', 'Companion app connected');
    relay.broadcastResumed();
  });
  tower.on('companion-disconnected', () => {
    logger.logEvent('event', 'host', 'Companion app disconnected');
    relay.broadcastPaused('Companion app disconnected from FakeTower');
  });

  await relay.start();
  console.log(`Relay server listening on ws://0.0.0.0:${port}`);

  await tower.startAdvertising();
  console.log('Advertising fake tower — open the companion app to connect.');

  // Graceful shutdown.
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down…');
    await tower.stopAdvertising();
    await relay.stop();
    await logger.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Placeholder until implementation is complete.
  console.log('Host scaffolding ready. Implement FakeTower and RelayServer to proceed.');
  console.log(`Relay port: ${port}`);
}

// Only run as a standalone process — not when imported as a library.
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
