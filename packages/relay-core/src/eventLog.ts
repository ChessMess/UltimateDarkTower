/**
 * EventLog — append-only JSONL log of semantic {@link RelayEvent}s (PRD §7, FR-6).
 *
 * The relay's hybrid state model pairs an authoritative last-command `TowerState`
 * snapshot (live state / `sync:state` catch-up) with this append-only log of
 * *semantic* events for replay, audit, and debugging desync. `EventLog` assigns
 * each appended event a monotonic `seq` (its own counter, independent of the
 * relay's command-broadcast `seq`) and persists it as one JSON object per line to
 *   `events-{date}.jsonl`
 * in the given directory. It parallels {@link HostLogger} (session-timestamp
 * naming, master `enabled` switch, optional size-based rotation) but is a distinct
 * stream: `HostLogger` carries the byte/command + human-readable debug log, while
 * `EventLog` carries the structured semantic-event log.
 *
 * Replay/export (FR-6.3) is provided by the standalone {@link loadEventLog},
 * {@link replayEventLog}, and {@link exportEventLog} helpers, which operate on a
 * persisted session file.
 *
 * Note: like the event union itself, this module has NO dependency on
 * `ultimatedarktower` — it imports only the `RelayEvent` type from shared plus
 * `node:fs`, so it loads without bleno/noble and can be imported BLE-free.
 */

import { createWriteStream, mkdirSync, readFileSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';
import type { RelayEvent } from 'ultimatedarktowerrelay-shared';

// ---------------------------------------------------------------------------
// Session filename helper
// ---------------------------------------------------------------------------

/** ISO date with colons/dots replaced so it is filesystem-safe. */
function sessionTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface EventLogOptions {
  /** Whether file persistence starts enabled (default `true`). */
  enabled?: boolean;
  /** Max bytes per log file before rotating to a new segment. 0 = no rotation. */
  maxFileSizeBytes?: number;
}

/** Options for {@link replayEventLog}. */
export interface ReplayOptions {
  /**
   * When `true`, pace re-emission to match the original wall-clock gaps between
   * events' `timestamp`s. When `false` (default), emit synchronously back-to-back.
   */
  realtime?: boolean;
  /**
   * Speed multiplier for `realtime` pacing (default `1`). `2` replays twice as
   * fast (half the delays); `0.5` half as fast. Ignored unless `realtime`.
   */
  speed?: number;
}

/** Upper bound (ms) on any single inter-event delay during realtime replay. */
const MAX_REPLAY_DELAY_MS = 10_000;

// ---------------------------------------------------------------------------
// EventLog
// ---------------------------------------------------------------------------

export class EventLog {
  /** Master switch — when `false`, append assigns `seq` + mirrors but writes no file. */
  enabled: boolean;

  private readonly logDir: string;
  private readonly ts: string;
  private readonly maxFileSizeBytes: number;

  /** Monotonic sequence counter assigned to appended events (starts at 1). */
  private seq = 0;
  private readonly events: RelayEvent[] = [];

  private stream: WriteStream;
  private bytes = 0;
  private segment = 1;

  /**
   * @param logDir   - Directory to write the event log into (created if missing).
   * @param options  - Persistence options.
   */
  constructor(logDir: string, options: EventLogOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 0;

    this.logDir = logDir;
    mkdirSync(logDir, { recursive: true });

    this.ts = sessionTimestamp();
    this.stream = this.openStream(this.segment);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Append a semantic event: assign the next monotonic `seq`, mirror it
   * in-memory, and — when enabled — persist it as one JSONL line. The caller's
   * object is NOT mutated; a stamped clone is stored and returned.
   *
   * @returns The appended event, with its assigned `seq`.
   */
  append(event: RelayEvent): RelayEvent {
    // Spread keeps the discriminated-union member's shape at runtime; the cast
    // settles the union-spread typing.
    const stamped = { ...event, seq: ++this.seq } as RelayEvent;
    this.events.push(stamped);

    if (this.enabled) {
      this.write(stamped);
    }
    return stamped;
  }

  /** Returns a shallow copy of every event appended this session (in order). */
  snapshot(): RelayEvent[] {
    return [...this.events];
  }

  /** Toggle file persistence. @returns The new enabled state. */
  setEnabled(value: boolean): boolean {
    this.enabled = value;
    return this.enabled;
  }

  /** Absolute path of the current event-log segment file. */
  getPath(): string {
    return this.filePath(this.segment);
  }

  /** Directory the event log is written into. */
  getLogDir(): string {
    return this.logDir;
  }

  /** Flush and close the write stream. Call once before process exit. */
  close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.stream.end(resolve);
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private filePath(segment: number): string {
    const suffix = segment > 1 ? `-${segment}` : '';
    return join(this.logDir, `events-${this.ts}${suffix}.jsonl`);
  }

  private openStream(segment: number): WriteStream {
    return createWriteStream(this.filePath(segment), { flags: 'a' });
  }

  private write(event: RelayEvent): void {
    const line = JSON.stringify(event) + '\n';
    const lineBytes = Buffer.byteLength(line, 'utf8');
    if (this.maxFileSizeBytes > 0 && this.bytes + lineBytes > this.maxFileSizeBytes) {
      this.stream.end();
      this.segment += 1;
      this.stream = this.openStream(this.segment);
      this.bytes = 0;
    }
    this.stream.write(line);
    this.bytes += lineBytes;
  }
}

// ---------------------------------------------------------------------------
// Replay / export (FR-6.3) — operate on a persisted session file
// ---------------------------------------------------------------------------

/**
 * Load a persisted event log (one JSON object per line) back into memory.
 * Malformed lines are skipped. Events are sorted by `seq` ascending (those
 * without a `seq` keep their file order, after the seq'd ones).
 *
 * @param filePath - Path to an `events-*.jsonl` file.
 */
export function loadEventLog(filePath: string): RelayEvent[] {
  const content = readFileSync(filePath, 'utf-8');
  const events: RelayEvent[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as RelayEvent);
    } catch {
      // Skip malformed lines.
    }
  }
  events.sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER));
  return events;
}

/** Sleep helper for realtime replay (honors Jest fake timers). */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Replay a session's events to a handler in `seq` order (FR-6.3). With
 * `{ realtime: true }`, the original wall-clock gaps between `timestamp`s are
 * reproduced (scaled by `speed`, clamped to a sane range); otherwise events are
 * delivered synchronously back-to-back.
 *
 * @param events  - Events to replay (e.g. from {@link loadEventLog}).
 * @param onEvent - Called once per event, in order.
 * @param options - Replay pacing options.
 */
export async function replayEventLog(
  events: RelayEvent[],
  onEvent: (event: RelayEvent) => void,
  options: ReplayOptions = {},
): Promise<void> {
  const realtime = options.realtime ?? false;
  const speed = options.speed && options.speed > 0 ? options.speed : 1;

  let prevTs: number | null = null;
  for (const event of events) {
    if (realtime) {
      const ts = Date.parse(event.timestamp);
      if (prevTs !== null && Number.isFinite(ts)) {
        const raw = (ts - prevTs) / speed;
        const wait = Math.min(MAX_REPLAY_DELAY_MS, Math.max(0, raw));
        if (wait > 0) await delay(wait);
      }
      if (Number.isFinite(ts)) prevTs = ts;
    }
    onEvent(event);
  }
}

/**
 * Serialize a session's events for export (FR-6.3).
 *
 * @param events - Events to export.
 * @param format - `'json'` → a pretty-printed JSON array; `'jsonl'` → one compact
 *                 JSON object per line (the on-disk format).
 */
export function exportEventLog(events: RelayEvent[], format: 'json' | 'jsonl'): string {
  if (format === 'jsonl') {
    return events.map((e) => JSON.stringify(e)).join('\n');
  }
  return JSON.stringify(events, null, 2);
}
