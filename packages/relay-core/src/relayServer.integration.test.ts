/**
 * relayServer.integration.test.ts — the Phase-1 acceptance proof.
 *
 * Drives a real RelayServer with real `ws` clients (no BLE) and verifies the
 * mock-consumer contract from the PRD: a consumer connecting receives a
 * `sync:state` catch-up immediately, every relayed command arrives as a
 * `tower:command` with a monotonic `seq`, and a late joiner catches up to the
 * last command via `sync:state` (FR-2.2 / FR-2.3 / §4.1).
 */

import { createServer } from 'net';
import WebSocket from 'ws';
import { MessageType, PROTOCOL_VERSION } from 'ultimatedarktowerrelay-shared';
import { RelayServer } from './relayServer';

interface AnyMessage {
  type: string;
  payload: Record<string, unknown>;
}

/** Ask the OS for a free TCP port so parallel test runs don't collide. */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Open a client and queue incoming messages so `next()` can await them without
 * racing the server's immediate `sync:state` send.
 */
function makeClient(port: number): { ws: WebSocket; next: () => Promise<AnyMessage> } {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const queue: AnyMessage[] = [];
  const waiters: ((m: AnyMessage) => void)[] = [];
  ws.on('message', (raw: WebSocket.RawData) => {
    const msg = JSON.parse(raw.toString()) as AnyMessage;
    const waiter = waiters.shift();
    if (waiter) waiter(msg);
    else queue.push(msg);
  });
  const next = (): Promise<AnyMessage> =>
    new Promise((resolve) => {
      const queued = queue.shift();
      if (queued) resolve(queued);
      else waiters.push(resolve);
    });
  return { ws, next };
}

function open(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function sendHello(ws: WebSocket): void {
  ws.send(
    JSON.stringify({
      type: MessageType.CLIENT_HELLO,
      payload: { label: 'test-consumer', protocolVersion: PROTOCOL_VERSION, observer: true },
      timestamp: new Date().toISOString(),
    })
  );
}

const TWENTY_BYTE_CMD = Array.from({ length: 20 }, (_, i) => i);

describe('RelayServer ↔ mock WebSocket consumer', () => {
  let relay: RelayServer;
  let port: number;
  const sockets: WebSocket[] = [];

  beforeEach(async () => {
    port = await getFreePort();
    relay = new RelayServer({ port, host: '127.0.0.1' });
    await relay.start();
  });

  afterEach(async () => {
    for (const ws of sockets.splice(0)) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
    }
    await relay.stop();
  });

  it('sends sync:state with a null lastCommand on connect', async () => {
    const client = makeClient(port);
    sockets.push(client.ws);
    await open(client.ws);

    const msg = await client.next();
    expect(msg.type).toBe(MessageType.SYNC_STATE);
    expect(msg.payload['lastCommand']).toBeNull();
  });

  it('relays a broadcast command as tower:command with a monotonic seq', async () => {
    const client = makeClient(port);
    sockets.push(client.ws);
    await open(client.ws);
    expect((await client.next()).type).toBe(MessageType.SYNC_STATE); // consume catch-up
    sendHello(client.ws);

    const seq1 = relay.broadcast(TWENTY_BYTE_CMD);
    const first = await client.next();
    expect(first.type).toBe(MessageType.TOWER_COMMAND);
    expect(first.payload['data']).toEqual(TWENTY_BYTE_CMD);
    expect(first.payload['seq']).toBe(seq1);
    expect(seq1).toBe(1);

    const seq2 = relay.broadcast(TWENTY_BYTE_CMD);
    const second = await client.next();
    expect(second.type).toBe(MessageType.TOWER_COMMAND);
    expect(second.payload['seq']).toBe(seq2);
    expect(seq2).toBe(2);
  });

  it('catches a late joiner up to the last command via sync:state', async () => {
    const early = makeClient(port);
    sockets.push(early.ws);
    await open(early.ws);
    expect((await early.next()).type).toBe(MessageType.SYNC_STATE);

    relay.broadcast(TWENTY_BYTE_CMD);
    expect((await early.next()).type).toBe(MessageType.TOWER_COMMAND);

    // A consumer that joins after the command catches up immediately.
    const late = makeClient(port);
    sockets.push(late.ws);
    await open(late.ws);
    const catchup = await late.next();
    expect(catchup.type).toBe(MessageType.SYNC_STATE);
    expect(catchup.payload['lastCommand']).toEqual(TWENTY_BYTE_CMD);
  });
});
