/**
 * relayLifecycle.test.ts — integration tests for RelayServer connection lifecycle.
 *
 * Starts a real RelayServer bound to a fixed test port. Connects real WebSocket
 * clients using the `ws` package (available in Node.js). No fake timers — these
 * tests exercise observable protocol behavior only, not internal timeout logic
 * (which is covered by connectionManager.test.ts).
 */

import WebSocket from 'ws';
import { RelayServer } from '../../packages/host/src/relayServer';
import { MessageType, PROTOCOL_VERSION } from '@dark-tower-sync/shared';

const TEST_PORT = 19_876;
const BASE_URL = `ws://127.0.0.1:${TEST_PORT}`;

jest.setTimeout(10_000);

type ParsedMessage = { type: string; payload: Record<string, unknown>; timestamp: string };

/** Connect to the relay and resolve once the first message arrives. */
function connectAndReceiveFirst(): Promise<{ client: WebSocket; first: ParsedMessage }> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(BASE_URL);
    client.once('error', reject);
    client.once('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ParsedMessage;
      resolve({ client, first: msg });
    });
  });
}

/** Send CLIENT_HELLO and wait for it to be acknowledged (client stays open). */
async function connectAndHandshake(label: string): Promise<WebSocket> {
  const { client } = await connectAndReceiveFirst();
  client.send(
    JSON.stringify({
      type: MessageType.CLIENT_HELLO,
      payload: { label, protocolVersion: PROTOCOL_VERSION },
      timestamp: new Date().toISOString(),
    }),
  );
  // Small pause to let the server process the hello
  await new Promise((r) => setTimeout(r, 80));
  return client;
}

/** Wait until a message matching `predicate` arrives on `client`, or reject on timeout. */
function waitForMessage(
  client: WebSocket,
  predicate: (msg: ParsedMessage) => boolean,
  timeoutMs = 3_000,
): Promise<ParsedMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('waitForMessage timed out')), timeoutMs);

    const handler = (raw: WebSocket.RawData): void => {
      const msg = JSON.parse(raw.toString()) as ParsedMessage;
      if (predicate(msg)) {
        clearTimeout(timer);
        client.off('message', handler);
        resolve(msg);
      }
    };
    client.on('message', handler);
  });
}

describe('RelayServer — lifecycle', () => {
  let relay: RelayServer;

  beforeAll(async () => {
    relay = new RelayServer({ port: TEST_PORT });
    await relay.start();
  });

  afterAll(async () => {
    await relay.stop();
  });

  afterEach(async () => {
    // Brief pause between tests to let sockets fully close
    await new Promise((r) => setTimeout(r, 100));
  });

  // ── sync:state on connect ──────────────────────────────────────────────

  it('sends sync:state as the first message to a new client', async () => {
    const { client, first } = await connectAndReceiveFirst();
    expect(first.type).toBe(MessageType.SYNC_STATE);
    client.close();
  });

  it('sync:state carries null lastCommand before any broadcast', async () => {
    const { client, first } = await connectAndReceiveFirst();
    expect(first.payload.lastCommand).toBeNull();
    client.close();
  });

  // ── broadcast catchup ─────────────────────────────────────────────────

  it('sync:state carries lastCommand after a broadcast', async () => {
    const bytes = new Array(20).fill(0).map((_, i) => i);
    relay.broadcast(bytes);

    const { client, first } = await connectAndReceiveFirst();
    expect(first.type).toBe(MessageType.SYNC_STATE);
    expect(first.payload.lastCommand).toEqual(bytes);
    client.close();
  });

  // ── CLIENT_HELLO ──────────────────────────────────────────────────────

  it('client remains connected after sending CLIENT_HELLO', async () => {
    const client = await connectAndHandshake('Player-1');
    expect(client.readyState).toBe(WebSocket.OPEN);
    client.close();
  });

  // ── broadcast reaches clients ─────────────────────────────────────────

  it('broadcast delivers tower:command to all connected clients', async () => {
    const [clientA, clientB] = await Promise.all([
      connectAndHandshake('A'),
      connectAndHandshake('B'),
    ]);

    const receiveA = waitForMessage(clientA, (m) => m.type === MessageType.TOWER_COMMAND);
    const receiveB = waitForMessage(clientB, (m) => m.type === MessageType.TOWER_COMMAND);

    const bytes = new Array(20).fill(0xab);
    relay.broadcast(bytes);

    const [msgA, msgB] = await Promise.all([receiveA, receiveB]);
    expect(msgA.payload.data).toEqual(bytes);
    expect(msgB.payload.data).toEqual(bytes);

    clientA.close();
    clientB.close();
  });

  it('broadcast() returns incrementing sequence numbers', () => {
    const bytes = new Array(20).fill(0);
    const seq1 = relay.broadcast(bytes);
    const seq2 = relay.broadcast(bytes);
    expect(seq2).toBe(seq1 + 1);
  });

  // ── disconnect propagation ────────────────────────────────────────────

  it('disconnecting one client sends client:disconnected to others', async () => {
    const clientA = await connectAndHandshake('Leaver');
    const clientB = await connectAndHandshake('Watcher');

    const disconnectPromise = waitForMessage(
      clientB,
      (m) => m.type === MessageType.CLIENT_DISCONNECTED,
    );

    clientA.close();
    const msg = await disconnectPromise;

    expect(msg.type).toBe(MessageType.CLIENT_DISCONNECTED);
    expect(typeof msg.payload.clientId).toBe('string');

    clientB.close();
  });
});
