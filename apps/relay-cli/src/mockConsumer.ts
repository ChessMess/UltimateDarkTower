/**
 * mockConsumer — a tiny WebSocket consumer for verifying the relay end-to-end.
 *
 * Connects to the relay, completes the `client:hello` handshake as an observer,
 * and logs every `sync:state` and `tower:command` it receives. Pair it with
 * `npm run start:mock` (relay + MockTower) to confirm the
 * source → relay → consumer seam without any BLE hardware.
 *
 * Environment:
 *   RELAY_PORT  port to connect to (default 8765).
 *   RELAY_HOST  host to connect to (default 127.0.0.1).
 */

import WebSocket from 'ws';
import { MessageType, PROTOCOL_VERSION, type RelayMessage } from 'ultimatedarktowerrelay-shared';

const port = Number(process.env['RELAY_PORT'] ?? 8765);
const host = process.env['RELAY_HOST'] ?? '127.0.0.1';
const url = `ws://${host}:${port}`;

console.log(`[mock-consumer] connecting to ${url} …`);
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('[mock-consumer] connected — sending client:hello');
  ws.send(
    JSON.stringify({
      type: MessageType.CLIENT_HELLO,
      payload: { label: 'mock-consumer', protocolVersion: PROTOCOL_VERSION, observer: true },
      timestamp: new Date().toISOString(),
    })
  );
});

ws.on('message', (raw: WebSocket.RawData) => {
  let msg: RelayMessage;
  try {
    msg = JSON.parse(raw.toString()) as RelayMessage;
  } catch {
    console.warn('[mock-consumer] ignoring non-JSON message');
    return;
  }
  switch (msg.type) {
    case MessageType.SYNC_STATE:
      console.log('[mock-consumer] sync:state  lastCommand =', msg.payload.lastCommand);
      break;
    case MessageType.TOWER_COMMAND:
      console.log(`[mock-consumer] tower:command #${msg.payload.seq} data =`, msg.payload.data);
      break;
    case MessageType.HOST_STATUS:
      console.log('[mock-consumer] host:status ', msg.payload);
      break;
    default:
      console.log('[mock-consumer]', msg.type);
  }
});

ws.on('close', (code: number, reason: Buffer) => {
  console.log(`[mock-consumer] closed (${code}) ${reason.toString()}`);
  process.exit(0);
});

ws.on('error', (err: Error) => {
  console.error('[mock-consumer] error:', err.message);
  process.exit(1);
});
