/**
 * logAnalysis — pure (fs/console-free) analysis helpers for the relay's JSONL
 * session logs, used by the `analyzeLogs` CLI.
 *
 * Ported from UltimateDarkTowerSync's `packages/host/scripts/analyzeLogs.ts`,
 * split out so the analysis logic is unit-testable without touching the
 * filesystem or `console`. The CLI (`analyzeLogs.ts`) owns file I/O + printing.
 *
 * Imports only `ultimatedarktowerrelay-shared` (the byte decoder) and
 * `ultimatedarktower` (constants for human-readable names) — never the relay
 * `core` package, so a log reader never initializes Bluetooth.
 */

import type { LogEntry } from 'ultimatedarktowerrelay-shared';
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
 * Relay-specific note: the bundled SDK does not (currently) report its logs
 * back via `client:log`, so relay sessions are typically host-only. The
 * MISSING_SEQ check is therefore skipped unless at least one `client←host`
 * entry is present — otherwise every broadcast seq would be a false positive.
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
