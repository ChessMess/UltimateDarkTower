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
export type { RelayServerOptions } from './relayServer';
export type { CommandReceivedCallback } from './fakeTower';

import { FakeTower } from './fakeTower';
import { RelayServer } from './relayServer';
import { PROTOCOL_VERSION } from '@dark-tower-sync/shared';

const DEFAULT_PORT = 8765;

async function main(): Promise<void> {
  console.log(`DarkTowerSync host v${PROTOCOL_VERSION}`);

  const port = Number(process.env['RELAY_PORT'] ?? DEFAULT_PORT);
  const relay = new RelayServer({ port });
  const tower = new FakeTower();

  // Wire tower commands → relay broadcast.
  tower.onCommandReceived = (data) => {
    relay.broadcast(data);
  };
  tower.on('state-change', (state) => {
    relay.setFakeTowerState(state);
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
