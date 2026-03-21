/**
 * HostLogger — file-based JSONL logger for the DarkTowerSync host.
 *
 * Writes structured {@link LogEntry} objects as one-JSON-per-line to two files:
 *   - `session-{date}-host.jsonl`  — host-originated entries only
 *   - `session-{date}-all.jsonl`   — host + client entries interleaved
 *
 * The logger has a master `enabled` switch. When disabled, all write methods
 * are no-ops (no file I/O), but the log directory and streams stay open so
 * logging can be resumed without restarting the session.
 *
 * When `maxFileSizeBytes` is set (> 0), each stream rotates to a new numbered
 * segment file once the current file would exceed the limit.
 */

import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type LogDirection,
  type LogLevel,
  type LogEntry,
  makeCommandLogEntry,
  makeEventLogEntry,
} from '@dark-tower-sync/shared';

// ---------------------------------------------------------------------------
// Session filename helper
// ---------------------------------------------------------------------------

/** ISO date with colons replaced so it is filesystem-safe. */
function sessionTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface HostLoggerOptions {
  /** Whether logging starts enabled (default `true`). */
  enabled?: boolean;
  /** Max bytes per log file before rotating to a new segment. 0 = no rotation. */
  maxFileSizeBytes?: number;
}

// ---------------------------------------------------------------------------
// HostLogger
// ---------------------------------------------------------------------------

export class HostLogger {
  /** Master switch — when `false`, all write methods are no-ops. */
  enabled: boolean;

  private readonly logDir: string;
  private readonly ts: string;
  private readonly maxFileSizeBytes: number;

  private hostStream: WriteStream;
  private allStream: WriteStream;
  private hostBytes = 0;
  private allBytes = 0;
  private hostSegment = 1;
  private allSegment = 1;

  /**
   * @param logDir            - Directory to write log files into (created if missing).
   * @param enabledOrOptions  - Boolean (legacy) or options object.
   */
  constructor(logDir: string, enabledOrOptions?: boolean | HostLoggerOptions) {
    if (typeof enabledOrOptions === 'boolean') {
      this.enabled = enabledOrOptions;
      this.maxFileSizeBytes = 0;
    } else {
      const opts = enabledOrOptions ?? {};
      this.enabled = opts.enabled ?? true;
      this.maxFileSizeBytes = opts.maxFileSizeBytes ?? 0;
    }

    this.logDir = logDir;
    mkdirSync(logDir, { recursive: true });

    this.ts = sessionTimestamp();
    this.hostStream = this.openStream('host', this.hostSegment);
    this.allStream = this.openStream('all', this.allSegment);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Toggle the master logging switch.
   * @returns The new enabled state.
   */
  setEnabled(value: boolean): boolean {
    this.enabled = value;
    return this.enabled;
  }

  /** Returns the absolute path of the log directory. */
  getLogDir(): string {
    return this.logDir;
  }

  /**
   * Log a tower command event.
   *
   * @param dir  - Direction the command traveled.
   * @param data - Raw 20-byte command bytes.
   * @param seq  - Monotonic sequence number (null for pre-relay events).
   * @param src  - Source identifier (`'companion'`, `'host'`, client label, etc.).
   * @param note - Optional human-readable annotation.
   */
  logCommand(
    dir: LogDirection,
    data: Uint8Array | number[],
    seq: number | null,
    src: string,
    note?: string,
  ): void {
    if (!this.enabled) return;
    const entry = makeCommandLogEntry(dir, data, seq, src, note);
    this.writeToHost(entry);
    this.writeToAll(entry);
  }

  /**
   * Log a non-command event (connection changes, errors, etc.).
   */
  logEvent(level: LogLevel, src: string, note: string): void {
    if (!this.enabled) return;
    const entry = makeEventLogEntry(level, src, note);
    this.writeToHost(entry);
    this.writeToAll(entry);
  }

  /**
   * Write client-submitted log entries into the combined `all` log file.
   *
   * Called by the relay server when it receives a `client:log` message.
   */
  writeClientEntries(clientId: string, entries: LogEntry[]): void {
    if (!this.enabled) return;
    for (const entry of entries) {
      // Tag the source so analysis tool knows which client produced the entry.
      const tagged: LogEntry = { ...entry, src: entry.src || clientId };
      this.writeToAll(tagged);
    }
  }

  /**
   * Flush and close all write streams. Call once before process exit.
   */
  close(): Promise<void> {
    return new Promise<void>((resolve) => {
      let pending = 2;
      const done = (): void => {
        pending -= 1;
        if (pending === 0) resolve();
      };
      this.hostStream.end(done);
      this.allStream.end(done);
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private openStream(tag: 'host' | 'all', segment: number): WriteStream {
    const suffix = segment > 1 ? `-${segment}` : '';
    return createWriteStream(
      join(this.logDir, `session-${this.ts}-${tag}${suffix}.jsonl`),
      { flags: 'a' },
    );
  }

  private writeToHost(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    const bytes = Buffer.byteLength(line, 'utf8');
    if (this.maxFileSizeBytes > 0 && this.hostBytes + bytes > this.maxFileSizeBytes) {
      this.hostStream.end();
      this.hostSegment += 1;
      this.hostStream = this.openStream('host', this.hostSegment);
      this.hostBytes = 0;
    }
    this.hostStream.write(line);
    this.hostBytes += bytes;
  }

  private writeToAll(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    const bytes = Buffer.byteLength(line, 'utf8');
    if (this.maxFileSizeBytes > 0 && this.allBytes + bytes > this.maxFileSizeBytes) {
      this.allStream.end();
      this.allSegment += 1;
      this.allStream = this.openStream('all', this.allSegment);
      this.allBytes = 0;
    }
    this.allStream.write(line);
    this.allBytes += bytes;
  }
}

// ---------------------------------------------------------------------------
// pruneOldLogs
// ---------------------------------------------------------------------------

/**
 * Delete `.jsonl` log files older than `maxAgeDays` from the given directory.
 * Returns the number of files deleted. Returns 0 if the directory does not exist.
 */
export async function pruneOldLogs(dir: string, maxAgeDays = 30): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }

  for (const name of entries) {
    if (!name.endsWith('.jsonl')) continue;
    const fullPath = join(dir, name);
    try {
      const info = await stat(fullPath);
      if (info.mtimeMs < cutoff) {
        await unlink(fullPath);
        deleted++;
      }
    } catch {
      // file vanished or permission error — skip
    }
  }
  return deleted;
}
