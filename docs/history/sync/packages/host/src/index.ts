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

  // TODO: Start relay server and fake tower advertising.
  //   await relay.start();
  //   await tower.startAdvertising();
  //   console.log(`Relay server listening on ws://0.0.0.0:${port}`);
  //   console.log('Advertising fake tower — open the companion app to connect.');

  // Graceful shutdown.
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down…');
    // TODO: await tower.stopAdvertising();
    // TODO: await relay.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Placeholder until implementation is complete.
  console.log('Host scaffolding ready. Implement FakeTower and RelayServer to proceed.');
  console.log(`Relay port: ${port}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
