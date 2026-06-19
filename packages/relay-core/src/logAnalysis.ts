/**
 * logAnalysis — pure (fs/console-free) analysis helpers for the relay's JSONL
 * session logs.
 *
 * Originally ported from UltimateDarkTowerSync's `packages/host/scripts/analyzeLogs.ts`,
 * split out so the analysis logic is unit-testable without touching the
 * filesystem or `console`. It lives in `core` (not `cli`) because it now has two
 * consumers: the `analyzeLogs` CLI (file I/O + printing) and the Electron
 * operator GUI's read-only log viewer (analysis runs in the main process, results
 * are sent to the renderer over IPC).
 *
 * This module imports only `ultimatedarktowerrelay-shared` (the byte decoder /
 * `LogEntry` type) and `ultimatedarktower` (constants for human-readable names) —
 * it does NOT touch the BLE-bearing parts of `core` (TowerEmulator → bleno). Import it
 * via the `ultimatedarktowerrelay-core/dist/logAnalysis` subpath (NOT the `core`
 * barrel) when you need to keep a log reader Bluetooth-free, exactly as
 * `replayEvents` does for `eventLog`.
 */

import {
  type LogEntry,
  bytesFromHex,
  decodeCommand,
  formatLogEntry,
} from 'ultimatedarktowerrelay-shared';
import { TOWER_LIGHT_SEQUENCES, TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';

// ---------------------------------------------------------------------------
// Reverse lookup maps from UDT constants
// ---------------------------------------------------------------------------

const LED_SEQ_NAMES: Record<number, string> = {};
for (const [name, value] of Object.entries(TOWER_LIGHT_SEQUENCES)) {
  LED_SEQ_NAMES[value as number] = name;
}

const AUDIO_NAMES: Record<number, string> = {};
for (const info of Object.values(TOWER_AUDIO_LIBRARY)) {
  const a = info as { name: string; value: number; category: string };
  AUDIO_NAMES[a.value] = `${a.name} (${a.category})`;
}

/** Human-readable name for an LED `led_sequence` override value. */
export function ledSeqName(value: number): string {
  return LED_SEQ_NAMES[value] ?? `unknown(0x${value.toString(16).padStart(2, '0')})`;
}

/** Human-readable name for an audio byte (low 7 bits = sample, bit 7 = loop). */
export function audioName(value: number): string {
  const sample = value & 0x7f;
  const loop = (value & 0x80) !== 0;
  const name = AUDIO_NAMES[sample] ?? `0x${sample.toString(16).padStart(2, '0')}`;
  return loop ? `${name} [loop]` : name;
}

// ---------------------------------------------------------------------------
// Log-file selection (pure, over a filename list)
// ---------------------------------------------------------------------------

/**
 * Select which `.jsonl` log files to load from a directory listing.
 *
 * Considers only `session-*.jsonl` files (the `HostLogger`'s command/all log) —
 * the relay also writes `events-*.jsonl` (the semantic EventLog, read by
 * `replayEvents`) into the same directory, which this tool must not ingest.
 * Applies the optional `--session` prefix filter, then de-duplicates each
 * session segment: the relay writes both a `-host` file and an `-all` file (the
 * latter a superset), so when both exist for a segment the `-host` file is
 * dropped to avoid double-counting. Rotation segments (`-host-2` / `-all-2`)
 * are matched too. Returns a sorted list.
 */
export function selectLogFiles(files: string[], sessionFilter: string | null): string[] {
  let selected = files.filter((f) => /^session-.*\.jsonl$/.test(f)).sort();

  if (sessionFilter) {
    selected = selected.filter((f) => f.includes(sessionFilter));
  }

  const allFileSet = new Set(selected.filter((f) => /-all(-\d+)?\.jsonl$/.test(f)));
  return selected.filter((f) => {
    if (!/-host(-\d+)?\.jsonl$/.test(f)) return true;
    const allEquivalent = f.replace(
      /(.*)-host(-\d+)?\.jsonl$/,
      (_, base, seg) => `${base}-all${seg ?? ''}.jsonl`,
    );
    return !allFileSet.has(allEquivalent);
  });
}

/**
 * Parse JSONL file contents into a single timestamp-sorted `LogEntry[]`.
 * Malformed lines are skipped. `contents` is one string per file.
 */
export function parseLogLines(contents: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const content of contents) {
    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        // Skip malformed lines.
      }
    }
  }
  entries.sort((a, b) => a.ts.localeCompare(b.ts));
  return entries;
}

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------

export interface Anomaly {
  type: string;
  message: string;
  entry?: LogEntry;
}

/**
 * Scan command/event entries for desync and integrity problems.
 *
 * Relay-specific note: the relay's bundled consumers (mockConsumer) don't
 * report their logs back by default — the SDK supports it via
 * `RelayClient.sendRaw` (e.g. Sync's ClientLogger), but relay-only sessions are
 * typically host-only. The MISSING_SEQ check is therefore skipped unless at
 * least one `client←host` entry is present — otherwise every broadcast seq
 * would be a false positive.
 */
export function detectAnomalies(entries: LogEntry[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const commands = entries.filter((e) => e.level === 'cmd');

  // 1. Missing seq at clients (only meaningful when client logs are present).
  const hostSeqs = new Set(
    commands
      .filter((e) => e.dir === 'host→clients')
      .map((e) => e.seq)
      .filter((s): s is number => s !== null),
  );
  const clientSeqs = new Set(
    commands
      .filter((e) => e.dir === 'client←host')
      .map((e) => e.seq)
      .filter((s): s is number => s !== null),
  );
  if (clientSeqs.size > 0) {
    for (const seq of hostSeqs) {
      if (!clientSeqs.has(seq)) {
        anomalies.push({
          type: 'MISSING_SEQ',
          message: `Seq #${seq} broadcast by host but never received by any client`,
        });
      }
    }
  }

  // 2. Duplicate seq (same direction, same source).
  const seqDirSrc = new Map<string, LogEntry>();
  for (const entry of commands) {
    if (entry.seq === null) continue;
    const key = `${entry.seq}:${entry.dir}:${entry.src}`;
    if (seqDirSrc.has(key)) {
      anomalies.push({
        type: 'DUPLICATE_SEQ',
        message: `Duplicate seq #${entry.seq} for ${entry.dir} from ${entry.src}`,
        entry,
      });
    } else {
      seqDirSrc.set(key, entry);
    }
  }

  // 3. Time gaps > 5s between consecutive commands.
  for (let i = 1; i < commands.length; i++) {
    const prev = new Date(commands[i - 1].ts).getTime();
    const curr = new Date(commands[i].ts).getTime();
    const gap = curr - prev;
    if (gap > 5000) {
      anomalies.push({
        type: 'TIME_GAP',
        message: `${(gap / 1000).toFixed(1)}s gap between commands at ${commands[i].ts}`,
        entry: commands[i],
      });
    }
  }

  // 4. Hex mismatch between host and client for same seq.
  const hexBySeq = new Map<number, Set<string>>();
  for (const entry of commands) {
    if (entry.seq === null || !entry.hex) continue;
    if (!hexBySeq.has(entry.seq)) hexBySeq.set(entry.seq, new Set());
    hexBySeq.get(entry.seq)!.add(entry.hex);
  }
  for (const [seq, hexes] of hexBySeq) {
    if (hexes.size > 1) {
      anomalies.push({
        type: 'HEX_MISMATCH',
        message: `Seq #${seq} has mismatched hex across logs: ${Array.from(hexes).join(' vs ')}`,
      });
    }
  }

  // 5. Error-level events.
  const errors = entries.filter((e) => e.level === 'error');
  for (const entry of errors) {
    anomalies.push({
      type: 'ERROR',
      message: `[${entry.src}] ${entry.note ?? 'Unknown error'}`,
      entry,
    });
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Structured-report builders (the data the CLI's `print*` reporters render)
//
// These return plain serializable objects rather than writing to `console`, so
// the same analysis can drive the Electron operator GUI's log viewer over IPC.
// The CLI keeps its own `print*` reporters; these are the GUI's data path.
// ---------------------------------------------------------------------------

/** Aggregate counts/extent of a parsed session, mirroring the CLI summary. */
export interface SessionSummary {
  /** ISO timestamp of the first entry (null when there are no entries). */
  firstTs: string | null;
  /** ISO timestamp of the last entry (null when there are no entries). */
  lastTs: string | null;
  /** `lastTs - firstTs` in milliseconds (0 when empty). */
  durationMs: number;
  totalEntries: number;
  commandCount: number;
  eventCount: number;
  /** Highest command `seq` seen (0 when there are no seq'd commands). */
  maxSeq: number;
  /** Distinct `src` identifiers, in first-seen order. */
  sources: string[];
}

/**
 * Build a {@link SessionSummary} from timestamp-sorted entries (e.g. the output
 * of {@link parseLogLines}). Safe on empty input.
 */
export function buildSessionSummary(entries: LogEntry[]): SessionSummary {
  if (entries.length === 0) {
    return {
      firstTs: null,
      lastTs: null,
      durationMs: 0,
      totalEntries: 0,
      commandCount: 0,
      eventCount: 0,
      maxSeq: 0,
      sources: [],
    };
  }

  const first = entries[0];
  const last = entries[entries.length - 1];
  const commands = entries.filter((e) => e.level === 'cmd');
  const events = entries.filter((e) => e.level !== 'cmd');
  const sources = Array.from(new Set(entries.map((e) => e.src)));
  const maxSeq = Math.max(0, ...commands.map((e) => e.seq ?? 0));

  return {
    firstTs: first.ts,
    lastTs: last.ts,
    durationMs: new Date(last.ts).getTime() - new Date(first.ts).getTime(),
    totalEntries: entries.length,
    commandCount: commands.length,
    eventCount: events.length,
    maxSeq,
    sources,
  };
}

/** One rendered command-timeline row, mirroring the CLI timeline. */
export interface TimelineRow {
  /** Human-readable one-line summary (from {@link formatLogEntry}). */
  text: string;
  /** Milliseconds since the previous row in this slice (null for the first). */
  deltaMs: number | null;
  /** Decoded LED-override / audio annotations (empty when none). */
  extras: string[];
}

/**
 * Build the command timeline (decoded LED/audio annotations + inter-command
 * deltas), mirroring the CLI's `printTimeline`. Returns the (optionally capped)
 * rows plus the full command `total`.
 *
 * When `limit` is set and there are more commands than the limit, the
 * most-recent `limit` commands are returned; `deltaMs` is then relative to the
 * previous row **within the returned slice** (the first row's delta is null).
 */
export function buildCommandTimeline(
  entries: LogEntry[],
  options: { limit?: number } = {},
): { rows: TimelineRow[]; total: number } {
  const commands = entries.filter((e) => e.level === 'cmd');
  const total = commands.length;

  const { limit } = options;
  const selected =
    limit !== undefined && commands.length > limit
      ? commands.slice(commands.length - limit)
      : commands;

  let prevTs: number | null = null;
  const rows: TimelineRow[] = selected.map((entry) => {
    const ts = new Date(entry.ts).getTime();
    const deltaMs = prevTs !== null ? ts - prevTs : null;
    prevTs = ts;

    const decoded = entry.decoded ?? (entry.hex ? decodeCommand(bytesFromHex(entry.hex)) : null);
    const extras: string[] = [];
    if (decoded) {
      if (decoded.ledOverride !== 0) {
        extras.push(
          `ledOverride=0x${decoded.ledOverride.toString(16).padStart(2, '0')} (${ledSeqName(decoded.ledOverride)})`,
        );
      }
      if (decoded.audio !== 0) {
        extras.push(`audio=${audioName(decoded.audio)}`);
      }
    }

    return { text: formatLogEntry(entry), deltaMs, extras };
  });

  return { rows, total };
}
