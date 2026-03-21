/**
 * ClientLogger — browser-side rolling log buffer for DarkTowerSync.
 *
 * Maintains a ring buffer of up to 500 {@link LogEntry} objects. Entries
 * can be sent to the host automatically (every 30 seconds) or manually,
 * and can be downloaded as a local `.jsonl` file as a fallback.
 */

import {
  MessageType,
  type LogDirection,
  type LogLevel,
  type LogEntry,
  makeCommandLogEntry,
  makeEventLogEntry,
} from '@dark-tower-sync/shared';

const MAX_ENTRIES = 500;
const AUTO_SEND_INTERVAL_MS = 30_000;

/**
 * ClientLogger buffers structured log entries in memory and provides
 * mechanisms to submit them to the host or download them locally.
 */
export class ClientLogger {
  private buffer: LogEntry[] = [];
  private writeIndex = 0;
  private totalWritten = 0;
  private lastSentTotal = 0;
  private sendFn: ((json: string) => void) | null = null;
  private autoSendTimer: ReturnType<typeof setInterval> | null = null;
  private readonly src: string;

  /**
   * @param src - Source identifier included in all log entries (e.g., player label).
   */
  constructor(src = 'client') {
    this.src = src;
  }

  // ── Configuration ────────────────────────────────────────────────────────

  /**
   * Set the function used to send JSON strings to the host via WebSocket.
   * Called after the relay connection is established.
   */
  setSendFn(fn: (json: string) => void): void {
    this.sendFn = fn;
  }

  /**
   * Enable or disable the 30-second auto-send timer.
   * Called when the host sends a `host:log-config` message.
   *
   * When disabled, the client still buffers entries locally.
   */
  setAutoSend(enabled: boolean): void {
    if (enabled && !this.autoSendTimer) {
      this.autoSendTimer = setInterval(() => this.sendLogs(), AUTO_SEND_INTERVAL_MS);
    } else if (!enabled && this.autoSendTimer) {
      clearInterval(this.autoSendTimer);
      this.autoSendTimer = null;
    }
  }

  // ── Logging ──────────────────────────────────────────────────────────────

  /**
   * Log a tower command event into the ring buffer.
   */
  logCommand(dir: LogDirection, data: number[] | Uint8Array, seq: number | null, note?: string): void {
    const entry = makeCommandLogEntry(dir, data, seq, this.src, note);
    this.push(entry);
  }

  /**
   * Log a non-command event into the ring buffer.
   */
  logEvent(level: LogLevel, note: string): void {
    const entry = makeEventLogEntry(level, this.src, note);
    this.push(entry);
  }

  // ── Sending ──────────────────────────────────────────────────────────────

  /**
   * Send all unsent entries to the host via the WebSocket send function.
   * Works even when auto-send is disabled (manual override).
   */
  sendLogs(): void {
    if (!this.sendFn) return;
    const entries = this.getUnsentEntries();
    if (entries.length === 0) return;

    const message = JSON.stringify({
      type: MessageType.CLIENT_LOG,
      payload: { entries },
      timestamp: new Date().toISOString(),
    });

    this.sendFn(message);
    this.lastSentTotal = this.totalWritten;
  }

  /**
   * Flush remaining unsent entries. Call before WebSocket close.
   */
  flush(): void {
    this.sendLogs();
  }

  // ── Download ─────────────────────────────────────────────────────────────

  /**
   * Download all entries in the buffer as a `.jsonl` file.
   * Always works regardless of the master logging switch.
   */
  downloadAsFile(): void {
    const entries = this.getAllEntries();
    if (entries.length === 0) return;

    const jsonl = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `darktowersync-client-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private push(entry: LogEntry): void {
    if (this.buffer.length < MAX_ENTRIES) {
      this.buffer.push(entry);
    } else {
      this.buffer[this.writeIndex] = entry;
    }
    this.writeIndex = (this.writeIndex + 1) % MAX_ENTRIES;
    this.totalWritten++;
  }

  /**
   * Get all entries currently in the buffer, ordered oldest to newest.
   */
  private getAllEntries(): LogEntry[] {
    if (this.buffer.length < MAX_ENTRIES) {
      return this.buffer.slice();
    }
    // Ring buffer is full — read from writeIndex (oldest) wrapping around.
    return [
      ...this.buffer.slice(this.writeIndex),
      ...this.buffer.slice(0, this.writeIndex),
    ];
  }

  /**
   * Get entries that have not yet been sent to the host.
   */
  private getUnsentEntries(): LogEntry[] {
    const unsentCount = this.totalWritten - this.lastSentTotal;
    if (unsentCount <= 0) return [];

    // If we've written more unsent entries than the buffer can hold,
    // we can only send what's still in the buffer.
    const available = Math.min(unsentCount, this.buffer.length);
    const all = this.getAllEntries();
    return all.slice(all.length - available);
  }
}
