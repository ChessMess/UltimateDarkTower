/**
 * mockConsumer — a tiny WebSocket consumer for verifying the relay end-to-end,
 * built on the published `RelayClient` SDK (dogfooding).
 *
 * Connects to the relay via `RelayClient`, completes the handshake, and logs
 * `sync:state`, `tower:command`, decoded `state`, and `host:status`. Pair it with
 * `npm run start:mock` (relay + MockTower) to confirm the
 * source → relay → consumer seam without any BLE hardware.
 *
 * Environment:
 *   RELAY_PORT  port to connect to (default 8765).
 *   RELAY_HOST  host to connect to (default 127.0.0.1).
 *   MOCK_ROLE   'participant' connects non-observer and fires one `dropSkull`
 *               action ~2s after connecting, to demo the synthesis loop.
 *               Anything else (default) connects as a read-only observer.
 */

import WS from 'ws';
import { RelayClient, type WebSocketConstructor } from 'ultimatedarktowerrelay-client';

const port = Number(process.env['RELAY_PORT'] ?? 8765);
const host = process.env['RELAY_HOST'] ?? '127.0.0.1';
const url = `ws://${host}:${port}`;
const isParticipant = process.env['MOCK_ROLE'] === 'participant';

console.log(`[mock-consumer] connecting to ${url} … (role: ${isParticipant ? 'participant' : 'observer'})`);

const client = new RelayClient({
  label: 'mock-consumer',
  observer: !isParticipant,
  // Node has no stable global WebSocket on the CI targets — inject `ws`.
  webSocketImpl: WS as unknown as WebSocketConstructor,
  onEvent: (event) => {
    switch (event.type) {
      case 'sync:state':
        console.log('[mock-consumer] sync:state  lastCommand =', event.lastCommand);
        break;
      case 'tower:command':
        console.log(`[mock-consumer] tower:command #${event.seq} data =`, event.data);
        break;
      case 'state':
        console.log(
          '[mock-consumer] decoded state  skulls =',
          event.state.beam.count,
          ' drums =',
          event.state.drum.map((d) => d.position),
        );
        break;
      case 'host:status':
        console.log('[mock-consumer] host:status ', event.status);
        break;
      case 'relay:paused':
        console.log('[mock-consumer] relay:paused —', event.reason);
        break;
      case 'relay:resumed':
        console.log('[mock-consumer] relay:resumed');
        break;
      case 'relay:version-mismatch':
        console.error('[mock-consumer] version mismatch —', event.reason);
        break;
      default:
        console.log('[mock-consumer]', event.type);
    }
  },
});

client
  .connect(url)
  .then(() => {
    console.log('[mock-consumer] connected');
    // As a participant, report a player action so the relay's synthesizer sends
    // the matching tower→app skull-drop notification (visible in the relay logs).
    if (isParticipant) {
      setTimeout(() => {
        console.log('[mock-consumer] reporting dropSkull action');
        client.dropSkull();
      }, 2000);
    }
  })
  .catch((err: unknown) => {
    console.error('[mock-consumer] connection failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
