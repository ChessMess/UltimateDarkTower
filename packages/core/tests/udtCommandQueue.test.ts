import type { Mock } from 'vitest';
import { CommandQueue } from '../src/udtCommandQueue';
import { Logger } from '../src/udtLogger';

function makeLogger(): Logger {
  const logger = new Logger();
  logger.clearOutputs(); // suppress console noise in tests
  return logger;
}

describe('CommandQueue', () => {
  let sendFn: Mock<(b: Uint8Array) => Promise<void>>;
  let queue: CommandQueue;

  beforeEach(() => {
    sendFn = vi.fn().mockResolvedValue(undefined);
    // minCommandIntervalMs = 0 keeps these tests' existing fast/synchronous-tick
    // assertions unchanged; the nonzero-interval behavior has its own test below.
    queue = new CommandQueue(makeLogger(), sendFn, undefined, 0);
  });

  test('serialization: second command does not start until first receives a response', async () => {
    const p1 = queue.enqueue(new Uint8Array([1]), 'cmd1');
    const p2 = queue.enqueue(new Uint8Array([2]), 'cmd2');

    // Let cmd1 be sent
    await new Promise((r) => setImmediate(r));
    expect(sendFn).toHaveBeenCalledTimes(1);
    expect(sendFn.mock.calls[0][0]).toEqual(new Uint8Array([1]));

    // cmd2 should not have started yet
    expect(sendFn).toHaveBeenCalledTimes(1);

    // Signal cmd1 response → cmd2 should start
    queue.onResponse();
    await new Promise((r) => setImmediate(r));
    expect(sendFn).toHaveBeenCalledTimes(2);
    expect(sendFn.mock.calls[1][0]).toEqual(new Uint8Array([2]));

    queue.onResponse();
    await Promise.all([p1, p2]); // both should resolve without error
  });

  test('response gating: command does not resolve until onResponse() is called', async () => {
    let resolved = false;
    const p = queue.enqueue(new Uint8Array([1]), 'cmd').then(() => {
      resolved = true;
    });

    // Let the send complete
    await new Promise((r) => setImmediate(r));
    // sendFn resolved, but queue is still waiting for tower response
    expect(resolved).toBe(false);

    queue.onResponse();
    await p;
    expect(resolved).toBe(true);
  });

  test('timeout: command rejects after 30s, queue continues processing', async () => {
    vi.useFakeTimers();
    try {
      const p1 = queue.enqueue(new Uint8Array([1]), 'cmd1');
      const p2 = queue.enqueue(new Uint8Array([2]), 'cmd2');

      // Let cmd1 start (sendFn called)
      await Promise.resolve();
      expect(sendFn).toHaveBeenCalledTimes(1);

      // Advance past 30s timeout without calling onResponse()
      vi.advanceTimersByTime(30001);
      await Promise.resolve();

      await expect(p1).rejects.toThrow(/timeout/i);

      // Queue should have moved on to cmd2
      await Promise.resolve();
      expect(sendFn).toHaveBeenCalledTimes(2);

      queue.onResponse();
      await p2; // cmd2 resolves normally
    } finally {
      vi.useRealTimers();
    }
  });

  test('clear: all pending and current commands are rejected', async () => {
    const p1 = queue.enqueue(new Uint8Array([1]), 'cmd1');
    const p2 = queue.enqueue(new Uint8Array([2]), 'cmd2');
    const p3 = queue.enqueue(new Uint8Array([3]), 'cmd3');

    await new Promise((r) => setImmediate(r)); // cmd1 starts processing

    queue.clear();

    await expect(p1).rejects.toThrow(/cleared/i);
    await expect(p2).rejects.toThrow(/cleared/i);
    await expect(p3).rejects.toThrow(/cleared/i);
  });

  test('error propagation: send failure rejects command and queue continues', async () => {
    sendFn.mockRejectedValueOnce(new Error('BLE write failed')).mockResolvedValueOnce(undefined);

    const p1 = queue.enqueue(new Uint8Array([1]), 'cmd1');
    const p2 = queue.enqueue(new Uint8Array([2]), 'cmd2');

    await expect(p1).rejects.toThrow('BLE write failed');

    // cmd2 should now be running
    await new Promise((r) => setImmediate(r));
    expect(sendFn).toHaveBeenCalledTimes(2);
    queue.onResponse();
    await p2; // resolves without error
  });

  test('enforces a minimum interval between a response and the next command dispatch', async () => {
    vi.useFakeTimers();
    try {
      const intervalQueue = new CommandQueue(makeLogger(), sendFn, undefined, 250);

      const p1 = intervalQueue.enqueue(new Uint8Array([1]), 'cmd1');
      const p2 = intervalQueue.enqueue(new Uint8Array([2]), 'cmd2');

      await Promise.resolve();
      expect(sendFn).toHaveBeenCalledTimes(1);

      // Resolving cmd1 must not dispatch cmd2 synchronously/immediately —
      // this is what prevents a real adapter from issuing a new GATT write
      // from within the previous command's response handler.
      intervalQueue.onResponse();
      await Promise.resolve();
      expect(sendFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(249);
      expect(sendFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(sendFn).toHaveBeenCalledTimes(2);

      intervalQueue.onResponse();
      await Promise.all([p1, p2]);
    } finally {
      vi.useRealTimers();
    }
  });
});
