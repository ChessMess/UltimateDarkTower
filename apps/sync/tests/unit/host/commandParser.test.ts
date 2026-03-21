/**
 * commandParser.test.ts — unit tests for CommandParser and buildSkullDropPacket.
 */

import {
  CommandParser,
  buildSkullDropPacket,
  TOWER_COMMAND_LENGTH,
  TOWER_STATE_NOTIFICATION_TYPE,
} from '../../../packages/host/src/commandParser';

// SKULL_DROP_COUNT_POS = 17 from ultimatedarktower constants.
const SKULL_POS = 17;

// ─── buildSkullDropPacket ─────────────────────────────────────────────────────

describe('buildSkullDropPacket()', () => {
  it('sets byte 0 to the tower-state notification type (0x00)', () => {
    const packet = buildSkullDropPacket(null, 1);
    expect(packet[0]).toBe(TOWER_STATE_NOTIFICATION_TYPE);
    expect(packet[0]).toBe(0x00);
  });

  it('sets byte 17 to the provided skull count', () => {
    const packet = buildSkullDropPacket(null, 5);
    expect(packet[SKULL_POS]).toBe(5);
  });

  it('returns a 20-byte Buffer', () => {
    const packet = buildSkullDropPacket(null, 1);
    expect(packet).toBeInstanceOf(Buffer);
    expect(packet.length).toBe(TOWER_COMMAND_LENGTH);
  });

  it('uses a zero-filled baseline when lastCommand is null', () => {
    const packet = buildSkullDropPacket(null, 3);
    for (let i = 1; i < TOWER_COMMAND_LENGTH; i++) {
      if (i === SKULL_POS) continue;
      expect(packet[i]).toBe(0);
    }
  });

  it('preserves non-mutated state bytes from lastCommand baseline', () => {
    const base = new Array(20).fill(0xaa);
    base[0] = 0x00; // original command type byte — should be overwritten
    base[SKULL_POS] = 0x00; // skull byte — should be overwritten
    const packet = buildSkullDropPacket(base, 7);

    // Byte 0 overwritten to 0x00
    expect(packet[0]).toBe(0x00);
    // Byte 17 overwritten to skull count
    expect(packet[SKULL_POS]).toBe(7);
    // All other bytes preserved from baseline
    for (let i = 1; i < TOWER_COMMAND_LENGTH; i++) {
      if (i === SKULL_POS) continue;
      expect(packet[i]).toBe(0xaa);
    }
  });

  it('falls back to zero-filled baseline if lastCommand has wrong length', () => {
    const badBase = [0x01, 0x02]; // too short
    const packet = buildSkullDropPacket(badBase, 1);
    for (let i = 1; i < TOWER_COMMAND_LENGTH; i++) {
      if (i === SKULL_POS) continue;
      expect(packet[i]).toBe(0);
    }
  });

  it('accepts skull count 255 without overflow', () => {
    const packet = buildSkullDropPacket(null, 255);
    expect(packet[SKULL_POS]).toBe(255);
  });

  it('accepts skull count 1 (minimum active count)', () => {
    const packet = buildSkullDropPacket(null, 1);
    expect(packet[SKULL_POS]).toBe(1);
  });

  it('truncates counts > 255 to the low byte', () => {
    // The public API wraps in FakeTower, but the builder should not throw.
    const packet = buildSkullDropPacket(null, 256);
    expect(packet[SKULL_POS]).toBe(0); // 256 & 0xff = 0
  });
});

// ─── CommandParser ────────────────────────────────────────────────────────────

describe('CommandParser', () => {
  const parser = new CommandParser();

  it('marks a 20-byte packet as valid', () => {
    const data = Buffer.alloc(20, 0);
    const result = parser.parse(data);
    expect(result.valid).toBe(true);
    expect(result.raw.length).toBe(20);
  });

  it('marks a packet shorter than 20 bytes as invalid', () => {
    const result = parser.parse(Buffer.alloc(10));
    expect(result.valid).toBe(false);
  });

  it('marks a packet longer than 20 bytes as invalid', () => {
    const result = parser.parse(Buffer.alloc(21));
    expect(result.valid).toBe(false);
  });

  it('isValid() returns true for exactly 20 bytes', () => {
    expect(parser.isValid(Buffer.alloc(20))).toBe(true);
  });

  it('isValid() returns false for wrong-length input', () => {
    expect(parser.isValid(Buffer.alloc(5))).toBe(false);
  });

  it('accepts Uint8Array input', () => {
    const result = parser.parse(new Uint8Array(20));
    expect(result.valid).toBe(true);
  });

  it('accepts number array input', () => {
    const result = parser.parse(new Array(20).fill(0));
    expect(result.valid).toBe(true);
  });
});
