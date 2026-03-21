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
 */

import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
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
// HostLogger
// ---------------------------------------------------------------------------

export class HostLogger {
  /** Master switch — when `false`, all write methods are no-ops. */
  enabled: boolean;

  private readonly logDir: string;
  private readonly hostStream: WriteStream;
  private readonly allStream: WriteStream;

  /**
   * @param logDir  - Directory to write log files into (created if missing).
   * @param enabled - Whether logging starts enabled (default `true`).
   */
  constructor(logDir: string, enabled = true) {
    this.enabled = enabled;
    this.logDir = logDir;

    mkdirSync(logDir, { recursive: true });

    const ts = sessionTimestamp();
    this.hostStream = createWriteStream(join(logDir, `session-${ts}-host.jsonl`), { flags: 'a' });
    this.allStream = createWriteStream(join(logDir, `session-${ts}-all.jsonl`), { flags: 'a' });
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

  private writeToHost(entry: LogEntry): void {
    this.hostStream.write(JSON.stringify(entry) + '\n');
  }

  private writeToAll(entry: LogEntry): void {
    this.allStream.write(JSON.stringify(entry) + '\n');
  }
}
