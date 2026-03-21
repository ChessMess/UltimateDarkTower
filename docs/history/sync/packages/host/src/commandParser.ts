/**
 * CommandParser — parse and validate intercepted 20-byte tower commands.
 *
 * The official companion app writes 20-byte packets to the tower's BLE
 * characteristic. This module validates and optionally annotates those raw
 * bytes before they are relayed to clients.
 *
 * Reference: UltimateDarkTower packet format documentation.
 */

import { SKULL_DROP_COUNT_POS } from 'ultimatedarktower';

/** Expected byte length for all tower command packets. */
export const TOWER_COMMAND_LENGTH = 20;

/**
 * Response type byte the companion app expects at byte[0] of a tower state
 * notification. Value 0 = TOWER_MESSAGES.TOWER_STATE.value in the UDT library
 * (same as TOWER_COMMAND_TYPE_TOWER_STATE = 0x00). Confirmed from real tower
 * packet captures: [0, 0, 0, ..., skullCount, 0, 0].
 */
export const TOWER_STATE_NOTIFICATION_TYPE = 0x00;

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
 * Build a 20-byte tower-state notification packet suitable for sending to the
 * companion app via the fake tower's BLE notify characteristic.
 *
 * The packet is derived from `lastCommand` (the most recent command received
 * from the companion app) so all state bytes — drum positions, LEDs, audio —
 * are preserved. Only the header and skull-drop counter are changed:
 *
 *   - Byte 0 is set to {@link TOWER_STATE_NOTIFICATION_TYPE} (0x00) so the
 *     companion app classifies it as a tower-state response.
 *   - Byte {@link SKULL_DROP_COUNT_POS} (17) is set to `skullCount`.
 *
 * If `lastCommand` is null or has the wrong length a zero-filled baseline is
 * used instead.
 *
 * @param lastCommand - Last 20-byte command received from the companion app, or null.
 * @param skullCount  - Skull drop count to encode (1–255; 0 means "reset" and is avoided).
 */
export function buildSkullDropPacket(lastCommand: number[] | null, skullCount: number): Buffer {
  const packet = Buffer.alloc(TOWER_COMMAND_LENGTH, 0);

  if (lastCommand && lastCommand.length === TOWER_COMMAND_LENGTH) {
    Buffer.from(lastCommand).copy(packet);
  }

  packet[0] = TOWER_STATE_NOTIFICATION_TYPE;
  packet[SKULL_DROP_COUNT_POS] = skullCount & 0xff;

  return packet;
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
