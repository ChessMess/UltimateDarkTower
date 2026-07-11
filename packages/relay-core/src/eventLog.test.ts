/**
 * eventLog.test.ts — unit tests for the append-only semantic event log (FR-6).
 *
 * BLE-free: imports only ./eventLog (which depends only on the RelayEvent type
 * from shared + node:fs), so no Bluetooth, bleno, or noble are involved. File
 * I/O runs against a fresh temp directory per test, cleaned up afterwards.
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EventLog,
  loadEventLog,
  replayEventLog,
  exportEventLog,
} from './eventLog';
import {
  type RelayEvent,
  makeCommandReceivedEvent,
  makeSkullDroppedEvent,
  makeAppConnectedEvent,
  makeConsumerJoinedEvent,
} from 'ultimatedarktowerrelay-shared';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'eventlog-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('EventLog.append', () => {
  it('assigns a monotonic seq starting at 1 and returns the stamped clone', async () => {
    const log = new EventLog(dir);
    const a = log.append(makeAppConnectedEvent());
    const b = log.append(makeCommandReceivedEvent([0x00, 0x11]));
    const c = log.append(makeSkullDroppedEvent(1, [0x00]));
    expect([a.seq, b.seq, c.seq]).toEqual([1, 2, 3]);
    await log.close();
  });

  it('does not mutate the caller-supplied event', async () => {
    const log = new EventLog(dir);
    const input = makeAppConnectedEvent();
    const returned = log.append(input);
    expect(input.seq).toBeUndefined();
    expect(returned.seq).toBe(1);
    expect(returned).not.toBe(input);
    await log.close();
  });

  it('persists each event as one JSONL line that round-trips via loadEventLog', async () => {
    const log = new EventLog(dir);
    log.append(makeAppConnectedEvent());
    log.append(makeCommandReceivedEvent([0x00, 0x11, 0x22]));
    log.append(makeConsumerJoinedEvent('client-abcdef', 'UTDD', true));
    await log.close();

    const loaded = loadEventLog(log.getPath());
    expect(loaded).toEqual(log.snapshot());
    expect(loaded.map((e) => e.type)).toEqual([
      'app-connected',
      'command-received',
      'consumer-joined',
    ]);
    expect(loaded.map((e) => e.seq)).toEqual([1, 2, 3]);

    // Exactly three non-empty lines on disk.
    const lines = readFileSync(log.getPath(), 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(3);
  });
});

describe('EventLog enabled toggle', () => {
  it('assigns seq + mirrors in memory but writes no file when disabled', async () => {
    const log = new EventLog(dir, { enabled: false });
    const a = log.append(makeAppConnectedEvent());
    const b = log.append(makeSkullDroppedEvent(1, [0x00]));
    expect([a.seq, b.seq]).toEqual([1, 2]);
    expect(log.snapshot()).toHaveLength(2);
    await log.close();

    // File exists (stream opened) but is empty — nothing was written.
    expect(readFileSync(log.getPath(), 'utf-8')).toBe('');
    expect(loadEventLog(log.getPath())).toEqual([]);
  });
});

describe('EventLog.snapshot', () => {
  it('returns an independent copy', async () => {
    const log = new EventLog(dir);
    log.append(makeAppConnectedEvent());
    const snap = log.snapshot();
    snap.push(makeSkullDroppedEvent(9, [0x00]));
    expect(log.snapshot()).toHaveLength(1);
    await log.close();
  });
});

describe('EventLog rotation', () => {
  it('rolls to a new segment file past maxFileSizeBytes', async () => {
    const log = new EventLog(dir, { maxFileSizeBytes: 40 });
    for (let i = 0; i < 5; i++) log.append(makeCommandReceivedEvent([i]));
    await log.close();

    const files = readdirSync(dir).filter((f) => /^events-.*\.jsonl$/.test(f));
    expect(files.length).toBeGreaterThan(1);
  });
});

describe('replayEventLog', () => {
  function withTimestamps(events: RelayEvent[], stampsMs: number[]): RelayEvent[] {
    return events.map((e, i) => ({ ...e, timestamp: new Date(stampsMs[i]).toISOString() }));
  }

  it('invokes the handler for every event in seq order (synchronous)', async () => {
    const events = [
      { ...makeAppConnectedEvent(), seq: 1 },
      { ...makeCommandReceivedEvent([0x00]), seq: 2 },
      { ...makeSkullDroppedEvent(1, [0x00]), seq: 3 },
    ] as RelayEvent[];
    const seen: Array<number | undefined> = [];
    await replayEventLog(events, (e) => seen.push(e.seq));
    expect(seen).toEqual([1, 2, 3]);
  });

  describe('realtime pacing', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('waits the inter-event timestamp deltas', async () => {
      const events = withTimestamps(
        [makeAppConnectedEvent(), makeCommandReceivedEvent([0x00]), makeSkullDroppedEvent(1, [0x00])],
        [0, 100, 250], // deltas: 100ms, 150ms
      );
      const handler = jest.fn();
      const done = replayEventLog(events, handler, { realtime: true });

      // First event fires immediately (no preceding delay).
      expect(handler).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(100);
      expect(handler).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(150);
      expect(handler).toHaveBeenCalledTimes(3);
      await done;
    });

    it('clamps a huge gap and treats out-of-order timestamps as no wait', async () => {
      const events = withTimestamps(
        [makeAppConnectedEvent(), makeCommandReceivedEvent([0x00]), makeSkullDroppedEvent(1, [0x00])],
        [0, 3_600_000, 3_600_000 - 5_000], // 1h gap (clamped to 10s), then negative delta
      );
      const handler = jest.fn();
      const done = replayEventLog(events, handler, { realtime: true });

      expect(handler).toHaveBeenCalledTimes(1);
      // 1-hour delta is clamped to the 10s ceiling — not fired before 10s…
      await jest.advanceTimersByTimeAsync(9_999);
      expect(handler).toHaveBeenCalledTimes(1);
      // …fires at the 10s ceiling (proving the clamp, not a 1-hour wait); the
      // third event's negative delta means no wait, so it rides the same tick.
      await jest.advanceTimersByTimeAsync(1);
      expect(handler).toHaveBeenCalledTimes(3);
      await done;
    });
  });
});

describe('exportEventLog', () => {
  const events = [
    { ...makeAppConnectedEvent(), seq: 1 },
    { ...makeCommandReceivedEvent([0x00, 0x11]), seq: 2 },
  ] as RelayEvent[];

  it('json format re-parses to the same events', () => {
    expect(JSON.parse(exportEventLog(events, 'json'))).toEqual(events);
  });

  it('jsonl format is one event per line and re-parses', () => {
    const lines = exportEventLog(events, 'jsonl').split('\n');
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => JSON.parse(l))).toEqual(events);
  });
});
