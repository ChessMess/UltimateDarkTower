/**
 * Shared logging types and command decoder for DarkTowerSync.
 *
 * Defines the JSONL log entry format used by both the host file logger and
 * the browser client rolling buffer. Also provides a lightweight command
 * decoder that maps the 20-byte tower packet into named fields.
 *
 * Note: this package has NO dependency on `ultimatedarktower`. Byte offsets
 * are hard-coded from the known packet format. The analysis tool (in the
 * host package) imports UDT constants for human-readable names.
 */

// ---------------------------------------------------------------------------
// Log entry types
// ---------------------------------------------------------------------------

/** Direction a command or event flows through the system. */
export type LogDirection =
  | 'companion→host'
  | 'host→clients'
  | 'client←host'
  | 'client→tower';

/** Severity / category tag for filtering log entries. */
export type LogLevel = 'cmd' | 'event' | 'warn' | 'error';

/**
 * A single structured log entry written as one JSONL line.
 *
 * Every intercepted command produces two entries on the host
 * (`companion→host` then `host→clients`) and two on each client
 * (`client←host` then `client→tower`).
 */
export interface LogEntry {
  /** ISO-8601 timestamp from the machine that created the entry. */
  ts: string;
  /** Monotonic sequence number assigned by the host relay, or null for non-command events. */
  seq: number | null;
  /** Which direction this command traveled. */
  dir: LogDirection | null;
  /** 20-byte command as a 40-char hex string, or null for non-command events. */
  hex: string | null;
  /** Source identifier: `'host'`, client UUID, or player label. */
  src: string;
  /** Entry category for filtering. */
  level: LogLevel;
  /** Optional human-readable note. */
  note?: string;
  /** Decoded command fields (present only when `hex` is non-null). */
  decoded?: DecodedCommand;
}

// ---------------------------------------------------------------------------
// Decoded command structure
// ---------------------------------------------------------------------------

/**
 * Decoded fields from a 20-byte tower command packet.
 *
 * Full-packet byte positions (byte 0 = header, state data starts at byte 1):
 *
 * | Bytes  | Field           | Description                                   |
 * |--------|-----------------|-----------------------------------------------|
 * | 0      | cmdType         | Command header / response type                |
 * | 1–2    | drumStates      | Raw drum state bytes                          |
 * | 3–14   | ledStates       | 12 bytes: 6 layers × 2 bytes (4 lights each) |
 * | 15     | audio           | Audio sample (bits 0–6) + loop flag (bit 7)   |
 * | 16–17  | beamBreak       | Beam count high/low (SKULL_DROP_COUNT_POS=17)  |
 * | 18     | volumeDrumBeam  | Volume (4–7), beam fault (0), drum rev (1–3)  |
 * | 19     | ledOverride     | led_sequence value (0x0e = sealReveal, etc.)  |
 */
export interface DecodedCommand {
  cmdType: number;
  drumStates: number[];
  ledStates: number[];
  audio: number;
  beamBreak: number[];
  volumeDrumBeam: number;
  ledOverride: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Expected byte length for tower command packets. */
const COMMAND_LENGTH = 20;

/**
 * Convert a byte array to a 40-character lowercase hex string.
 *
 * Accepts `Uint8Array`, `number[]`, or Node.js `Buffer` (which extends
 * `Uint8Array`). Returns an empty string for empty input.
 */
export function hexFromBytes(data: Uint8Array | number[]): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse a 40-char hex string back into a byte array.
 */
export function bytesFromHex(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Decode a 20-byte tower command into named fields.
 *
 * @param bytes - The raw 20-byte command as a number array.
 * @returns A {@link DecodedCommand} with all fields extracted.
 */
export function decodeCommand(bytes: number[]): DecodedCommand {
  if (bytes.length < COMMAND_LENGTH) {
    // Pad short packets with zeroes so slicing does not throw.
    bytes = [...bytes, ...new Array(COMMAND_LENGTH - bytes.length).fill(0)];
  }
  return {
    cmdType: bytes[0],
    drumStates: bytes.slice(1, 3),
    ledStates: bytes.slice(3, 15),
    audio: bytes[15],
    beamBreak: bytes.slice(16, 18),
    volumeDrumBeam: bytes[18],
    ledOverride: bytes[19],
  };
}

/**
 * Build a {@link LogEntry} for a command event.
 *
 * Convenience factory used by both the host logger and the client logger
 * so the entry format is consistent.
 */
export function makeCommandLogEntry(
  dir: LogDirection,
  data: Uint8Array | number[],
  seq: number | null,
  src: string,
  note?: string,
): LogEntry {
  const hex = hexFromBytes(data);
  const decoded = decodeCommand(Array.from(data));
  return {
    ts: new Date().toISOString(),
    seq,
    dir,
    hex,
    src,
    level: 'cmd',
    note,
    decoded,
  };
}

/**
 * Build a {@link LogEntry} for a non-command event.
 */
export function makeEventLogEntry(
  level: LogLevel,
  src: string,
  note: string,
): LogEntry {
  return {
    ts: new Date().toISOString(),
    seq: null,
    dir: null,
    hex: null,
    src,
    level,
    note,
  };
}

/**
 * Format a log entry as a single human-readable line.
 *
 * Example: `[12:34:56.789] #42 companion→host 00010203…0013 ledOvr=0x0e`
 */
export function formatLogEntry(entry: LogEntry): string {
  const ts = entry.ts.slice(11, 23); // HH:MM:SS.mmm
  const seq = entry.seq !== null ? `#${entry.seq}` : '—';
  const dir = entry.dir ?? '';
  const hexShort = entry.hex ? `${entry.hex.slice(0, 8)}…${entry.hex.slice(-4)}` : '';
  const ledOvr =
    entry.decoded && entry.decoded.ledOverride !== 0
      ? ` ledOvr=0x${entry.decoded.ledOverride.toString(16).padStart(2, '0')}`
      : '';
  const note = entry.note ? ` ${entry.note}` : '';

  if (entry.level === 'cmd') {
    return `[${ts}] ${seq} ${dir} ${hexShort}${ledOvr}${note}`;
  }
  return `[${ts}] [${entry.level}] ${entry.src}: ${entry.note ?? ''}`;
}
