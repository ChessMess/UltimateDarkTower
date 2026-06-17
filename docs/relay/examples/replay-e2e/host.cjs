/**
 * host.cjs — throwaway E2E host for validating the FR-5.2 PhysicalTowerReplay
 * consumer against a *physical* tower. NOT shipped code; a manual validation aid.
 *
 * Stands up a RelayServer and broadcasts a cycle of genuine, distinct 20-byte
 * tower-state commands (all drums rotated N→E→S→W) every 2.5s. Each command is
 * built with the library's own `rtdt_pack_state` over `createDefaultTowerState`
 * (no hand-rolled bytes), so a mirror tower physically rotates its drums as the
 * browser's PhysicalTowerReplay writes each relayed command back to it.
 *
 * Run from the repo root:  node examples/replay-e2e/host.cjs
 */

const { RelayServer } = require('ultimatedarktowerrelay-core');
const { createDefaultTowerState, rtdt_pack_state } = require('ultimatedarktower');

const PORT = Number(process.env.RELAY_PORT || 8765);
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 2500);

/** Build a genuine 20-byte tower-state command with all drums at `position` (0..3). */
function rotationCommand(position) {
  const state = createDefaultTowerState();
  for (const drum of state.drum) drum.position = position;
  const stateBytes = new Uint8Array(19);
  rtdt_pack_state(stateBytes, 19, state); // (data, len, state)
  const packet = new Uint8Array(20); // byte 0 = 0x00 tower-state command type
  packet.set(stateBytes, 1);
  return Array.from(packet);
}

async function main() {
  const relay = new RelayServer({
    port: PORT,
    onClientConnected: (id, label, observer) =>
      console.log(`[host] client connected: ${label || id.slice(0, 8)}${observer ? ' (observer)' : ''}`),
    onClientReady: (id, ready, label) =>
      console.log(`[host] client ${label || id.slice(0, 8)} tower: ${ready ? 'READY ✓' : 'not ready'}`),
    onClientDisconnected: (id, label) => console.log(`[host] client left: ${label || id.slice(0, 8)}`),
  });

  await relay.start();
  console.log(`[host] E2E relay listening on ws://0.0.0.0:${PORT}`);
  console.log(`[host] broadcasting a rotation command every ${INTERVAL_MS}ms — Ctrl-C to stop`);

  const SIDES = ['north (0)', 'east (1)', 'south (2)', 'west (3)'];
  let i = 0;
  const timer = setInterval(() => {
    const pos = i % 4;
    const seq = relay.broadcast(rotationCommand(pos));
    console.log(`[host] → broadcast: rotate all drums to ${SIDES[pos]}  (seq ${seq})`);
    i++;
  }, INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(timer);
    console.log('\n[host] shutting down…');
    await relay.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  console.error('[host] fatal:', err);
  process.exit(1);
});
