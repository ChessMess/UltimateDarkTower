/**
 * logAnalysis.test.ts — unit tests for the relay log-analysis helpers (FR-8.2).
 *
 * BLE-free: imports only ./logAnalysis (which depends on the shared LogEntry
 * type + UDT constants), so no Bluetooth, bleno, or noble are involved. All
 * fixtures are in-memory — no filesystem.
 */

import type { LogEntry, LogDirection } from 'ultimatedarktowerrelay-shared';
import {
  ledSeqName,
  audioName,
  selectLogFiles,
  parseLogLines,
  detectAnomalies,
  buildSessionSummary,
  buildCommandTimeline,
} from './logAnalysis';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let clock = 0;

/** Build a command LogEntry with an explicit (or auto-incrementing) timestamp. */
function cmd(
  dir: LogDirection,
  seq: number | null,
  src: string,
  hex: string,
  opts: { tsMs?: number } = {},
): LogEntry {
  const ms = opts.tsMs ?? clock++;
  return {
    ts: new Date(ms).toISOString(),
    seq,
    dir,
    hex,
    src,
    level: 'cmd',
  };
}

const HEX = '00'.repeat(20); // 40-char all-zero command

beforeEach(() => {
  clock = 0;
});

// ---------------------------------------------------------------------------
// ledSeqName / audioName
// ---------------------------------------------------------------------------

describe('ledSeqName', () => {
  it('maps a known LED sequence value to its name', () => {
    expect(ledSeqName(14)).toBe('sealReveal'); // TOWER_LIGHT_SEQUENCES.sealReveal
    expect(ledSeqName(1)).toBe('twinkle');
  });

  it('formats an unknown value as unknown(0x..)', () => {
    expect(ledSeqName(0xfe)).toBe('unknown(0xfe)');
  });
});

describe('audioName', () => {
  it('maps a known audio sample to "name (category)"', () => {
    expect(audioName(1)).toBe('Ashstrider (Adversary)'); // TOWER_AUDIO_LIBRARY.Ashstrider
  });

  it('appends [loop] when the high bit (0x80) is set', () => {
    expect(audioName(1 | 0x80)).toBe('Ashstrider (Adversary) [loop]');
  });

  it('formats an unmapped sample as hex', () => {
    expect(audioName(0)).toBe('0x00');
  });
});

// ---------------------------------------------------------------------------
// selectLogFiles
// ---------------------------------------------------------------------------

describe('selectLogFiles', () => {
  it('prefers the -all file and drops the matching -host (incl. rotation segments)', () => {
    const files = [
      'session-A-host.jsonl',
      'session-A-all.jsonl',
      'session-A-host-2.jsonl',
      'session-A-all-2.jsonl',
    ];
    expect(selectLogFiles(files, null)).toEqual([
      'session-A-all-2.jsonl',
      'session-A-all.jsonl',
    ]);
  });

  it('keeps a lone -host file when no matching -all exists', () => {
    expect(selectLogFiles(['session-B-host.jsonl'], null)).toEqual(['session-B-host.jsonl']);
  });

  it('ignores non-session files (e.g. the semantic events log)', () => {
    const files = ['session-A-all.jsonl', 'events-A.jsonl', 'notes.txt'];
    expect(selectLogFiles(files, null)).toEqual(['session-A-all.jsonl']);
  });

  it('applies the session-date prefix filter', () => {
    const files = ['session-2026-06-18-all.jsonl', 'session-2026-06-19-all.jsonl'];
    expect(selectLogFiles(files, '2026-06-18')).toEqual(['session-2026-06-18-all.jsonl']);
  });
});

// ---------------------------------------------------------------------------
// parseLogLines
// ---------------------------------------------------------------------------

describe('parseLogLines', () => {
  it('parses JSONL, skips malformed lines, and sorts by timestamp', () => {
    const a = cmd('host→clients', 1, 'host', HEX, { tsMs: 2000 });
    const b = cmd('host→clients', 2, 'host', HEX, { tsMs: 1000 });
    const content = [JSON.stringify(a), 'not json{', JSON.stringify(b)].join('\n');

    const entries = parseLogLines([content]);

    expect(entries).toHaveLength(2);
    expect(entries[0].seq).toBe(2); // earlier ts sorts first
    expect(entries[1].seq).toBe(1);
  });

  it('concatenates entries across multiple file contents', () => {
    const a = JSON.stringify(cmd('host→clients', 1, 'host', HEX));
    const b = JSON.stringify(cmd('companion→host', null, 'companion', HEX));
    expect(parseLogLines([a, b])).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// detectAnomalies
// ---------------------------------------------------------------------------

describe('detectAnomalies', () => {
  it('returns no anomalies for a clean host-only session (no false MISSING_SEQ)', () => {
    const entries = [
      cmd('companion→host', null, 'companion', HEX),
      cmd('host→clients', 1, 'host', HEX),
      cmd('companion→host', null, 'companion', HEX),
      cmd('host→clients', 2, 'host', HEX),
    ];
    expect(detectAnomalies(entries)).toEqual([]);
  });

  it('flags MISSING_SEQ only when client entries exist and a seq is absent', () => {
    const entries = [
      cmd('host→clients', 1, 'host', HEX),
      cmd('host→clients', 2, 'host', HEX),
      cmd('client←host', 1, 'client-a', HEX), // seq 2 never received
    ];
    const types = detectAnomalies(entries).map((a) => a.type);
    expect(types).toContain('MISSING_SEQ');
    expect(detectAnomalies(entries).filter((a) => a.type === 'MISSING_SEQ')).toHaveLength(1);
  });

  it('flags DUPLICATE_SEQ for the same seq/dir/src', () => {
    const entries = [
      cmd('host→clients', 5, 'host', HEX),
      cmd('host→clients', 5, 'host', HEX),
    ];
    expect(detectAnomalies(entries).map((a) => a.type)).toContain('DUPLICATE_SEQ');
  });

  it('flags TIME_GAP for >5s between consecutive commands', () => {
    const entries = [
      cmd('host→clients', 1, 'host', HEX, { tsMs: 0 }),
      cmd('host→clients', 2, 'host', HEX, { tsMs: 7000 }),
    ];
    expect(detectAnomalies(entries).map((a) => a.type)).toContain('TIME_GAP');
  });

  it('flags HEX_MISMATCH when the same seq has differing hex', () => {
    const entries = [
      cmd('host→clients', 1, 'host', '00'.repeat(20)),
      cmd('client←host', 1, 'client-a', 'ff'.repeat(20)),
    ];
    expect(detectAnomalies(entries).map((a) => a.type)).toContain('HEX_MISMATCH');
  });

  it('flags ERROR-level events', () => {
    const entries: LogEntry[] = [
      { ts: new Date(0).toISOString(), seq: null, dir: null, hex: null, src: 'host', level: 'error', note: 'boom' },
    ];
    const anomalies = detectAnomalies(entries);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].type).toBe('ERROR');
    expect(anomalies[0].message).toContain('boom');
  });
});

// ---------------------------------------------------------------------------
// buildSessionSummary
// ---------------------------------------------------------------------------

/** A non-command event LogEntry at the given ms. */
function evt(level: LogEntry['level'], src: string, note: string, tsMs: number): LogEntry {
  return { ts: new Date(tsMs).toISOString(), seq: null, dir: null, hex: null, src, level, note };
}

describe('buildSessionSummary', () => {
  it('returns an empty/zeroed summary for no entries', () => {
    expect(buildSessionSummary([])).toEqual({
      firstTs: null,
      lastTs: null,
      durationMs: 0,
      totalEntries: 0,
      commandCount: 0,
      eventCount: 0,
      maxSeq: 0,
      sources: [],
    });
  });

  it('computes counts, duration, maxSeq, and distinct sources', () => {
    const entries: LogEntry[] = [
      cmd('companion→host', null, 'companion', HEX, { tsMs: 1000 }),
      cmd('host→clients', 1, 'host', HEX, { tsMs: 1500 }),
      cmd('host→clients', 5, 'host', HEX, { tsMs: 2000 }),
      evt('event', 'host', 'Client connected', 3000),
    ];
    const summary = buildSessionSummary(entries);

    expect(summary.firstTs).toBe(entries[0].ts);
    expect(summary.lastTs).toBe(entries[3].ts);
    expect(summary.durationMs).toBe(2000); // 3000 - 1000
    expect(summary.totalEntries).toBe(4);
    expect(summary.commandCount).toBe(3);
    expect(summary.eventCount).toBe(1);
    expect(summary.maxSeq).toBe(5);
    expect(summary.sources).toEqual(['companion', 'host']);
  });
});

// ---------------------------------------------------------------------------
// buildCommandTimeline
// ---------------------------------------------------------------------------

describe('buildCommandTimeline', () => {
  // 20-byte packet: byte 15 (audio) = 0x01, byte 19 (ledOverride) = 0x0e.
  const HEX_LED_AUDIO = '00'.repeat(15) + '01' + '00'.repeat(3) + '0e';

  it('includes only command entries and decodes LED/audio extras', () => {
    const entries: LogEntry[] = [
      evt('event', 'host', 'ignored', 0),
      cmd('host→clients', 1, 'host', HEX_LED_AUDIO, { tsMs: 1000 }),
    ];
    const { rows, total } = buildCommandTimeline(entries);

    expect(total).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].deltaMs).toBeNull(); // first row
    expect(rows[0].extras).toEqual([
      'ledOverride=0x0e (sealReveal)',
      'audio=Ashstrider (Adversary)',
    ]);
    expect(rows[0].text).toContain('host→clients');
  });

  it('computes inter-command deltas and emits no extras for a zero packet', () => {
    const entries: LogEntry[] = [
      cmd('host→clients', 1, 'host', HEX, { tsMs: 1000 }),
      cmd('host→clients', 2, 'host', HEX, { tsMs: 1250 }),
    ];
    const { rows } = buildCommandTimeline(entries);

    expect(rows[0].deltaMs).toBeNull();
    expect(rows[1].deltaMs).toBe(250);
    expect(rows[0].extras).toEqual([]);
  });

  it('caps to the most-recent `limit` rows while reporting the full total', () => {
    const entries: LogEntry[] = [
      cmd('host→clients', 1, 'host', HEX, { tsMs: 1000 }),
      cmd('host→clients', 2, 'host', HEX, { tsMs: 2000 }),
      cmd('host→clients', 3, 'host', HEX, { tsMs: 3000 }),
    ];
    const { rows, total } = buildCommandTimeline(entries, { limit: 2 });

    expect(total).toBe(3);
    expect(rows).toHaveLength(2);
    expect(rows[0].text).toContain('#2'); // most-recent two: seq 2 then 3
    expect(rows[1].text).toContain('#3');
    expect(rows[0].deltaMs).toBeNull(); // delta is relative to the slice
  });
});
