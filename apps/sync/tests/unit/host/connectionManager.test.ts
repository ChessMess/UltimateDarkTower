/**
 * connectionManager.test.ts — unit tests for ConnectionManager.
 *
 * Uses Jest fake timers to verify handshake timeouts and ping/pong keepalive
 * without waiting for real clock time.
 */

import { ConnectionManager } from '../../../packages/host/src/connectionManager';
import WebSocket from 'ws';

jest.useFakeTimers();

// Mirrors the constants in connectionManager.ts
const HANDSHAKE_TIMEOUT_MS = 10_000;
const PING_INTERVAL_MS = 20_000;

/** Minimal WebSocket mock. The `on` mock captures event handlers for later invocation. */
function makeSocket() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    ping: jest.fn(),
    terminate: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
    readyState: WebSocket.OPEN as number,
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(cb);
    }),
    emit: (event: string, ...args: unknown[]) => {
      for (const cb of handlers[event] ?? []) cb(...args);
    },
  };
}

type MockSocket = ReturnType<typeof makeSocket>;

describe('ConnectionManager — handshake timeout', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  afterEach(() => {
    manager.destroy();
    jest.clearAllTimers();
  });

  it('closes the socket with code 1008 when handshake times out', () => {
    const socket = makeSocket();
    manager.add('client-1', socket as unknown as WebSocket);

    jest.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS + 1);

    expect(socket.close).toHaveBeenCalledWith(1008, expect.any(String));
  });

  it('does NOT close the socket when markHandshakeComplete() is called in time', () => {
    const socket = makeSocket();
    manager.add('client-1', socket as unknown as WebSocket);
    manager.markHandshakeComplete('client-1');

    jest.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS + 1);

    expect(socket.close).not.toHaveBeenCalled();
  });

  it('invokes the onHandshakeTimeout callback when the timeout fires', () => {
    const socket = makeSocket();
    const { onHandshakeTimeout } = manager.add('client-1', socket as unknown as WebSocket);
    const cb = jest.fn();
    onHandshakeTimeout(cb);

    jest.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS + 1);

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does NOT invoke onHandshakeTimeout when handshake completes', () => {
    const socket = makeSocket();
    const { onHandshakeTimeout } = manager.add('client-1', socket as unknown as WebSocket);
    const cb = jest.fn();
    onHandshakeTimeout(cb);
    manager.markHandshakeComplete('client-1');

    jest.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS + 1);

    expect(cb).not.toHaveBeenCalled();
  });
});

describe('ConnectionManager — ping/pong keepalive', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  afterEach(() => {
    manager.destroy();
    jest.clearAllTimers();
  });

  it('sends a ping after the first interval', () => {
    const socket = makeSocket();
    manager.add('client-1', socket as unknown as WebSocket);
    manager.markHandshakeComplete('client-1');

    jest.advanceTimersByTime(PING_INTERVAL_MS + 1);

    expect(socket.ping).toHaveBeenCalledTimes(1);
  });

  it('terminates an unresponsive client on the second ping cycle', () => {
    const socket = makeSocket();
    manager.add('client-1', socket as unknown as WebSocket);
    manager.markHandshakeComplete('client-1');

    // First cycle: ping sent, alive set to false
    jest.advanceTimersByTime(PING_INTERVAL_MS + 1);
    expect(socket.ping).toHaveBeenCalledTimes(1);
    expect(socket.terminate).not.toHaveBeenCalled();

    // Second cycle: alive still false → terminate
    jest.advanceTimersByTime(PING_INTERVAL_MS);
    expect(socket.terminate).toHaveBeenCalledTimes(1);
  });

  it('does NOT terminate a client that responds with pong', () => {
    const socket = makeSocket() as MockSocket;
    manager.add('client-1', socket as unknown as WebSocket);
    manager.markHandshakeComplete('client-1');

    // First cycle: ping sent
    jest.advanceTimersByTime(PING_INTERVAL_MS + 1);
    expect(socket.ping).toHaveBeenCalledTimes(1);

    // Simulate pong arriving before next cycle
    socket.emit('pong');

    // Second cycle: alive was reset to true by pong → no terminate
    jest.advanceTimersByTime(PING_INTERVAL_MS);
    expect(socket.terminate).not.toHaveBeenCalled();
    // Ping should have fired again (alive was true, set to false, ping sent)
    expect(socket.ping).toHaveBeenCalledTimes(2);
  });

  it('stops pinging after the last client is removed', () => {
    const socket = makeSocket();
    manager.add('client-1', socket as unknown as WebSocket);
    manager.markHandshakeComplete('client-1');
    manager.remove('client-1');

    // Advance past multiple intervals — no ping should occur
    jest.advanceTimersByTime(PING_INTERVAL_MS * 3);

    expect(socket.ping).not.toHaveBeenCalled();
  });
});

describe('ConnectionManager — client tracking', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  afterEach(() => {
    manager.destroy();
    jest.clearAllTimers();
  });

  it('count reflects adds and removes', () => {
    const s1 = makeSocket();
    const s2 = makeSocket();
    manager.add('a', s1 as unknown as WebSocket);
    manager.add('b', s2 as unknown as WebSocket);
    expect(manager.count).toBe(2);
    manager.remove('a');
    expect(manager.count).toBe(1);
  });

  it('get() returns client metadata', () => {
    const socket = makeSocket();
    manager.add('client-x', socket as unknown as WebSocket);
    const meta = manager.get('client-x');
    expect(meta).toBeDefined();
    expect(meta!.id).toBe('client-x');
  });

  it('get() returns undefined for unknown id', () => {
    expect(manager.get('nobody')).toBeUndefined();
  });
});

describe('ConnectionManager — broadcast', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  afterEach(() => {
    manager.destroy();
    jest.clearAllTimers();
  });

  it('sends a message to all OPEN sockets', () => {
    const s1 = makeSocket();
    const s2 = makeSocket();
    manager.add('a', s1 as unknown as WebSocket);
    manager.add('b', s2 as unknown as WebSocket);

    manager.broadcast('{"type":"test"}');

    expect(s1.send).toHaveBeenCalledWith('{"type":"test"}');
    expect(s2.send).toHaveBeenCalledWith('{"type":"test"}');
  });

  it('skips sockets that are not OPEN', () => {
    const s1 = makeSocket();
    const s2 = makeSocket();
    s2.readyState = WebSocket.CLOSED;
    manager.add('a', s1 as unknown as WebSocket);
    manager.add('b', s2 as unknown as WebSocket);

    manager.broadcast('{"type":"test"}');

    expect(s1.send).toHaveBeenCalledTimes(1);
    expect(s2.send).not.toHaveBeenCalled();
  });
});
