/**
 * physicalTowerReplay.test.ts — unit tests for the PhysicalTowerReplay consumer.
 *
 * BLE/browser-free: imports only ./physicalTowerReplay (which has no runtime
 * imports) and injects a mock TowerWriter. RelayClient events are constructed as
 * plain typed literals, so no WebSocket/`ws`, no `ultimatedarktower`, and no
 * hardware are involved.
 */

import { PhysicalTowerReplay, type TowerWriter } from './physicalTowerReplay';
import type { RelayClientEvent } from './relayClient';

/** A 20-byte command/state packet (1 command byte + 19 state bytes). */
function packet(fill = 0): number[] {
  const p = new Array(20).fill(fill);
  p[0] = 0x00;
  p[17] = 1; // skull-drop count low byte, just to make packets distinguishable
  return p;
}

/** Mock TowerWriter recording writes, with controllable readiness + deferred writes. */
class MockTower implements TowerWriter {
  isConnected = true;
  isCalibrated = true;
  shouldFail = false;
  writes: number[][] = [];

  /** When set, sendTowerCommandDirect returns this promise (to control ordering/timing). */
  private pending: { promise: Promise<void>; resolve: () => void; reject: (e: unknown) => void } | null = null;

  async sendTowerCommandDirect(command: Uint8Array): Promise<void> {
    this.writes.push(Array.from(command));
    if (this.shouldFail) throw new Error('write failed');
    if (this.pending) return this.pending.promise;
  }

  /** Switch the next writes to "deferred" — they won't resolve until release() is called. */
  defer(): void {
    let resolve!: () => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.pending = { promise, resolve, reject };
  }

  release(): void {
    this.pending?.resolve();
    this.pending = null;
  }
}

/** Flush the microtask queue so chained promise writes settle. */
const flush = (): Promise<void> => new Promise((r) => setImmediate(r));

describe('PhysicalTowerReplay.handleEvent()', () => {
  it('writes a tower:command\'s 20 bytes to the local tower', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    const data = packet();
    replay.handleEvent({ type: 'tower:command', data, seq: 7 });
    await flush();

    expect(tower.writes).toEqual([data]);
    expect(replay.getLastCommand()).toEqual(data);
  });

  it('writes sync:state only when lastCommand is non-null', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    replay.handleEvent({ type: 'sync:state', lastCommand: null });
    await flush();
    expect(tower.writes).toHaveLength(0);
    expect(replay.getLastCommand()).toBeNull();

    const data = packet(2);
    replay.handleEvent({ type: 'sync:state', lastCommand: data });
    await flush();
    expect(tower.writes).toEqual([data]);
  });

  it('writes host:resend commands', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    const data = packet(3);
    replay.handleEvent({ type: 'host:resend', data });
    await flush();

    expect(tower.writes).toEqual([data]);
  });

  it('ignores unrelated events without writing (and they are decoded `state` aware)', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    const unrelated: RelayClientEvent[] = [
      { type: 'relay:connected' },
      { type: 'relay:paused', reason: 'x' },
      { type: 'relay:resumed' },
      // `state` carries the bytes too, but we don't write off it (would double-write).
      { type: 'state', state: {} as never, lastCommand: packet() },
    ];
    for (const e of unrelated) replay.handleEvent(e);
    await flush();

    expect(tower.writes).toHaveLength(0);
  });

  it('does not write or cache packets that are not exactly 20 bytes', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    replay.handleEvent({ type: 'tower:command', data: [0x07, 0x00, 0x00], seq: 1 });
    await flush();

    expect(tower.writes).toHaveLength(0);
    expect(replay.getLastCommand()).toBeNull(); // a stray short packet is not a self-heal baseline
  });
});

describe('PhysicalTowerReplay tower-ready gate', () => {
  it('does not write when the tower is not connected, but still caches the command', async () => {
    const tower = new MockTower();
    tower.isConnected = false;
    const replay = new PhysicalTowerReplay({ tower });

    const data = packet();
    replay.handleEvent({ type: 'tower:command', data, seq: 1 });
    await flush();

    expect(tower.writes).toHaveLength(0);
    expect(replay.getLastCommand()).toEqual(data); // cached for later replayLast()
  });

  it('does not write when the tower is connected but not calibrated', async () => {
    const tower = new MockTower();
    tower.isCalibrated = false;
    const replay = new PhysicalTowerReplay({ tower });

    replay.handleEvent({ type: 'tower:command', data: packet(), seq: 1 });
    await flush();

    expect(tower.writes).toHaveLength(0);
  });

  it('does not write when no tower is set', async () => {
    const replay = new PhysicalTowerReplay();
    replay.handleEvent({ type: 'tower:command', data: packet(), seq: 1 });
    await flush();
    expect(replay.getLastCommand()).not.toBeNull(); // still cached
  });
});

describe('PhysicalTowerReplay.replayLast()', () => {
  it('re-writes the cached command (self-heal on tower reconnect)', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    const data = packet();
    replay.handleEvent({ type: 'tower:command', data, seq: 1 });
    await flush();
    expect(tower.writes).toHaveLength(1);

    await replay.replayLast();
    expect(tower.writes).toEqual([data, data]);
  });

  it('is a no-op when nothing has been relayed yet', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    await replay.replayLast();
    expect(tower.writes).toHaveLength(0);
  });

  it('replays the cached command after a tower is (re)attached via setTower', async () => {
    // Command arrives before any tower is connected.
    const replay = new PhysicalTowerReplay();
    const data = packet(5);
    replay.handleEvent({ type: 'tower:command', data, seq: 1 });
    await flush();

    // Tower connects + calibrates later; the app attaches it and self-heals.
    const tower = new MockTower();
    replay.setTower(tower);
    await replay.replayLast();

    expect(tower.writes).toEqual([data]);
  });

  it('stops writing after setTower(null)', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    replay.setTower(null);
    replay.handleEvent({ type: 'tower:command', data: packet(), seq: 1 });
    await flush();

    expect(tower.writes).toHaveLength(0);
  });
});

describe('PhysicalTowerReplay write serialization + error handling', () => {
  it('serializes concurrent commands in arrival order (no interleaving)', async () => {
    const tower = new MockTower();
    const replay = new PhysicalTowerReplay({ tower });

    const first = packet(1);
    const second = packet(2);

    tower.defer(); // first write hangs until released
    replay.handleEvent({ type: 'tower:command', data: first, seq: 1 });
    replay.handleEvent({ type: 'tower:command', data: second, seq: 2 });
    await flush();

    // Only the first write has been dispatched while it is in-flight.
    expect(tower.writes).toEqual([first]);

    tower.release();
    await flush();
    await flush();

    expect(tower.writes).toEqual([first, second]); // second runs only after first settles
  });

  it('catches a write rejection, reports it via onLog, and keeps the queue alive', async () => {
    const tower = new MockTower();
    const logs: { message: string; error?: unknown }[] = [];
    const replay = new PhysicalTowerReplay({ tower, onLog: (message, error) => logs.push({ message, error }) });

    tower.shouldFail = true;
    replay.handleEvent({ type: 'tower:command', data: packet(1), seq: 1 });
    await flush();

    expect(logs.some((l) => l.error !== undefined)).toBe(true);

    // The next command still writes — a single failure didn't poison the queue.
    tower.shouldFail = false;
    const next = packet(2);
    replay.handleEvent({ type: 'tower:command', data: next, seq: 2 });
    await flush();

    expect(tower.writes).toContainEqual(next);
  });

  it('reports a successful write via onLog with the seq', async () => {
    const tower = new MockTower();
    const logs: string[] = [];
    const replay = new PhysicalTowerReplay({ tower, onLog: (m) => logs.push(m) });

    replay.handleEvent({ type: 'tower:command', data: packet(), seq: 42 });
    await flush();

    expect(logs).toContain('Replayed command on tower (seq 42)');
  });
});
