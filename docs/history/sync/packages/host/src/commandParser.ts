/**
 * CommandParser — parse and validate intercepted 20-byte tower commands.
 *
 * The official companion app writes 20-byte packets to the tower's BLE
 * characteristic. This module validates and optionally annotates those raw
 * bytes before they are relayed to clients.
 *
 * Reference: UltimateDarkTower packet format documentation.
 */

/** Expected byte length for all tower command packets. */
export const TOWER_COMMAND_LENGTH = 20;

/** Result of parsing a raw command packet. */
export interface ParsedCommand {
  /** The raw bytes as received. */
  raw: number[];
  /** Whether the packet length is valid (must be exactly 20 bytes). */
  valid: boolean;
  /** Optional human-readable description for debugging. */
  description?: string;
}

/**
 * CommandParser validates and annotates raw 20-byte tower command packets
 * intercepted from the official companion app via the fake BLE peripheral.
 *
 * @example
 * ```ts
 * const parser = new CommandParser();
 * const result = parser.parse(Buffer.from([0x00, ...]));
 * if (result.valid) relayServer.broadcast(result.raw);
 * ```
 */
export class CommandParser {
  /**
   * Parse a raw BLE characteristic write value into a {@link ParsedCommand}.
   *
   * TODO: Implement full packet structure inspection using UltimateDarkTower
   *       protocol constants (drum position, light state, skull/glyph flags, audio).
   *       See Reference.md in the UltimateDarkTower repo for byte-level details.
   *
   * @param data - Raw bytes from the BLE characteristic write callback.
   * @returns A {@link ParsedCommand} with validity and optional debug info.
   */
  parse(data: Buffer | Uint8Array | number[]): ParsedCommand {
    const raw = Array.from(data instanceof Buffer ? data : data);
    const valid = raw.length === TOWER_COMMAND_LENGTH;

    return {
      raw,
      valid,
      description: valid
        ? `Valid ${TOWER_COMMAND_LENGTH}-byte tower command`
        : `Invalid packet: expected ${TOWER_COMMAND_LENGTH} bytes, got ${raw.length}`,
    };
  }

  /**
   * Returns true if the given byte array is a valid 20-byte tower command.
   *
   * TODO: Add deeper validation (e.g., checksum, known opcode ranges).
   */
  isValid(data: Buffer | Uint8Array | number[]): boolean {
    return this.parse(data).valid;
  }
}
