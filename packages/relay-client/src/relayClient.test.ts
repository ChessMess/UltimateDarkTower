/**
 * relayClient.test.ts — unit + integration tests for the RelayClient SDK.
 *
 * Unit tests inject a mock WebSocket (deterministic across Node versions, which
 * is why the SDK takes `webSocketImpl`). One integration test drives the SDK
 * against a real in-process `ws` server — real transport, BLE-free, no `core`
 * import (so bleno is never loaded).
 */

import WS, { WebSocketServer } from 'ws';
import type { AddressInfo } from 'net';
import {
  MessageType,
  PROTOCOL_VERSION,
  CLOSE_CODE_PROTOCOL_VERSION_MISMATCH,
  makeTowerCommandMessage,
  makeSyncStateMessage,
} from 'ultimatedarktowerrelay-shared';
import { RelayClient, type RelayClientEvent, type WebSocketConstructor } from './relayClient';

// ─── Mock WebSocket ─────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static reset(): void {
    MockWebSocket.instances = [];
  }

  readyState = 0; // CONNECTING
  sent: string[] = [];
  private listeners: Record<string, ((ev: unknown) => void)[]> = {};

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000, reason = ''): void {
    this.readyState = 3;
    this.emit('close', { code, reason });
  }

  addEventListener(type: string, cb: (ev: unknown) => void): void {
    (this.listeners[type] ??= []).push(cb);
  }

  private emit(type: string, ev?: unknown): void {
    for (const cb of this.listeners[type] ?? []) cb(ev);
  }

  // test controls
  open(): void {
    this.readyState = 1; // OPEN
    this.emit('open');
  }
  message(obj: unknown): void {
    this.emit('message', { data: JSON.stringify(obj) });
  }
  serverClose(code: number, reason = ''): void {
    this.readyState = 3;
    this.emit('close', { code, reason });
  }

  get sentMessages(): { type: string; payload?: Record<string, unknown> }[] {
    return this.sent.map((s) => JSON.parse(s));
  }
}

const MockCtor = MockWebSocket as unknown as WebSocketConstructor;

/** Construct a client, connect it, and drive the mock socket to open. */
async function connectedClient(opts: { observer?: boolean } = {}): Promise<{
  client: RelayClient;
  socket: MockWebSocket;
  events: RelayClientEvent[];
}> {
  MockWebSocket.reset();
  const events: RelayClientEvent[] = [];
  const client = new RelayClient({
    webSocketImpl: MockCtor,
    label: 'test',
    observer: opts.observer,
    onEvent: (e) => events.push(e),
  });
  const p = client.connect('ws://test');
  const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  socket.open();
  await p;
  return { client, socket, events };
}

// ─── construction ───────────────────────────────────────────────────────────

describe('RelayClient construction', () => {
  it('throws a clear error when no WebSocket implementation is available', () => {
    const g = globalThis as { WebSocket?: unknown };
    const saved = g.WebSocket;
    delete g.WebSocket;
    try {
      expect(() => new RelayClient()).toThrow(/no WebSocket implementation/i);
    } finally {
      g.WebSocket = saved;
    }
  });
});

// ─── handshake ────────────────────────────────────────────────────────────────

describe('RelayClient handshake', () => {
  it('sends CLIENT_HELLO with the protocol version on open', async () => {
    const { socket, events } = await connectedClient();
    const hello = socket.sentMessages[0];
    expect(hello.type).toBe(MessageType.CLIENT_HELLO);
    expect(hello.payload).toMatchObject({ label: 'test', protocolVersion: PROTOCOL_VERSION });
    expect(events.some((e) => e.type === 'relay:connected')).toBe(true);
  });

  it('marks the client as an observer when requested', async () => {
    const { socket } = await connectedClient({ observer: true });
    expect(socket.sentMessages[0].payload).toMatchObject({ observer: true });
  });

  it('omits observer for a participant', async () => {
    const { socket } = await connectedClient({ observer: false });
    expect(socket.sentMessages[0].payload?.observer).toBeUndefined();
  });
});

// ─── state decode ──────────────────────────────────────────────────────────────

describe('RelayClient state decode', () => {
  it('decodes a tower:command into TowerState and emits a state event', async () => {
    const { client, socket, events } = await connectedClient();
    // packet[1] = 0x14 → drum[0]: calibrated + position 2; packet[17] = 3 → beam.count 3.
    const cmd = new Array(20).fill(0);
    cmd[1] = 0x14;
    cmd[17] = 3;
    socket.message(makeTowerCommandMessage(cmd, 1));

    expect(events.some((e) => e.type === 'tower:command')).toBe(true);
    const stateEvt = events.find((e) => e.type === 'state');
    expect(stateEvt).toBeDefined();

    const state = client.getState();
    expect(state.drum[0].calibrated).toBe(true);
    expect(state.drum[0].position).toBe(2);
    expect(state.beam.count).toBe(3);
    expect(client.getLastCommand()).toEqual(cmd);
  });

  it('catches up from a non-null sync:state and emits a state event', async () => {
    const { client, events } = await connectedClient();
    const cmd = new Array(20).fill(0);
    cmd[17] = 5;
    const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    socket.message(makeSyncStateMessage(cmd));

    expect(events.some((e) => e.type === 'sync:state')).toBe(true);
    expect(events.some((e) => e.type === 'state')).toBe(true);
    expect(client.getState().beam.count).toBe(5);
  });

  it('does not emit a state event for a null sync:state', async () => {
    const { events, socket } = await connectedClient();
    socket.message(makeSyncStateMessage(null));
    expect(events.some((e) => e.type === 'sync:state')).toBe(true);
    expect(events.some((e) => e.type === 'state')).toBe(false);
  });
});

// ─── participant actions ─────────────────────────────────────────────────────

describe('RelayClient.dropSkull()', () => {
  it('sends a client:action dropSkull when connected', async () => {
    const { client, socket } = await connectedClient();
    expect(client.dropSkull()).toBe(true);
    const action = socket.sentMessages.find((m) => m.type === MessageType.CLIENT_ACTION);
    expect(action?.payload).toEqual({ action: 'dropSkull' });
  });

  it('is a no-op when not connected', () => {
    MockWebSocket.reset();
    const client = new RelayClient({ webSocketImpl: MockCtor });
    expect(client.dropSkull()).toBe(false);
  });
});

// ─── sendRaw (pre-serialized escape hatch) ───────────────────────────────────

describe('RelayClient.sendRaw()', () => {
  it('sends a pre-serialized message verbatim when connected', async () => {
    const { client, socket } = await connectedClient();
    const raw = JSON.stringify({
      type: MessageType.CLIENT_LOG,
      payload: { entries: [{ note: 'hello' }] },
    });
    const before = socket.sent.length;
    client.sendRaw(raw);
    expect(socket.sent.length).toBe(before + 1);
    // Verbatim — not re-serialized.
    expect(socket.sent[socket.sent.length - 1]).toBe(raw);
  });

  it('is a no-op when not connected', () => {
    MockWebSocket.reset();
    const client = new RelayClient({ webSocketImpl: MockCtor });
    expect(() => client.sendRaw('{"type":"client:log"}')).not.toThrow();
    expect(MockWebSocket.instances.length).toBe(0);
  });
});

// ─── reconnect / version mismatch ────────────────────────────────────────────

describe('RelayClient reconnect behavior', () => {
  it('schedules an exponential-backoff reconnect on abnormal close', async () => {
    const { client, socket, events } = await connectedClient();
    socket.serverClose(1006, 'abnormal');

    const reconnecting = events.find((e) => e.type === 'relay:reconnecting');
    expect(reconnecting).toBeDefined();
    if (reconnecting && reconnecting.type === 'relay:reconnecting') {
      expect(reconnecting.attempt).toBe(1);
      expect(reconnecting.delayMs).toBe(1000); // 1000 * 2**0
    }
    // Cancel the pending reconnect timer so it doesn't leak past the test.
    client.disconnect();
  });

  it('does NOT reconnect on a protocol-version-mismatch close', async () => {
    jest.useFakeTimers();
    try {
      const { socket, events } = await connectedClient();
      const before = MockWebSocket.instances.length;
      socket.serverClose(CLOSE_CODE_PROTOCOL_VERSION_MISMATCH, 'bad version');

      expect(events.some((e) => e.type === 'relay:version-mismatch')).toBe(true);
      jest.advanceTimersByTime(60_000);
      expect(MockWebSocket.instances.length).toBe(before); // no new socket
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('does NOT reconnect after an explicit disconnect()', async () => {
    jest.useFakeTimers();
    try {
      const { client, events } = await connectedClient();
      const before = MockWebSocket.instances.length;
      client.disconnect();
      jest.advanceTimersByTime(60_000);
      expect(events.some((e) => e.type === 'relay:reconnecting')).toBe(false);
      expect(MockWebSocket.instances.length).toBe(before);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});

// ─── integration: real ws transport (no core/bleno) ─────────────────────────

describe('RelayClient ↔ real ws server', () => {
  it('completes the handshake, receives sync:state, and delivers dropSkull to the server', async () => {
    const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise<void>((resolve) => wss.once('listening', () => resolve()));
    const port = (wss.address() as AddressInfo).port;

    const serverMessages: { type: string; payload?: Record<string, unknown> }[] = [];
    wss.on('connection', (s) => {
      s.send(JSON.stringify(makeSyncStateMessage(null)));
      s.on('message', (raw: WS.RawData) => serverMessages.push(JSON.parse(raw.toString())));
    });

    const events: RelayClientEvent[] = [];
    const client = new RelayClient({
      webSocketImpl: WS as unknown as WebSocketConstructor,
      label: 'integration',
      onEvent: (e) => events.push(e),
    });

    try {
      await client.connect(`ws://127.0.0.1:${port}`);
      // Wait for the server-sent sync:state to arrive at the client.
      await waitFor(() => events.some((e) => e.type === 'sync:state'));

      client.dropSkull();
      await waitFor(() => serverMessages.some((m) => m.type === MessageType.CLIENT_ACTION));

      expect(serverMessages.some((m) => m.type === MessageType.CLIENT_HELLO)).toBe(true);
      const action = serverMessages.find((m) => m.type === MessageType.CLIENT_ACTION);
      expect(action?.payload).toEqual({ action: 'dropSkull' });
    } finally {
      client.disconnect();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    }
  });
});

/** Poll a predicate until true or time out (real timers). */
async function waitFor(pred: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}
