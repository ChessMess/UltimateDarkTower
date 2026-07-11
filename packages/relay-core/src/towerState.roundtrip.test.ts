/**
 * towerState.roundtrip.test.ts — round-trip tests for the UDT 19-byte tower
 * state codec (`rtdt_pack_state` / `rtdt_unpack_state`).
 *
 * Every command the official app writes is a full 20-byte state snapshot
 * (1 header byte + 19 state bytes). The relay relies on this codec to decode
 * commands and to synthesize notifications. These tests verify the codec is a
 * faithful, idempotent round-trip across every field, and pin the big-endian
 * beam-count layout the relay depends on (PRD §4.1).
 */

import {
  rtdt_pack_state,
  rtdt_unpack_state,
  createDefaultTowerState,
  STATE_DATA_LENGTH,
  type TowerState,
} from 'ultimatedarktower';

/** Pack a TowerState into a 19-byte buffer, then unpack it back. */
function roundTrip(state: TowerState): TowerState {
  const buf = new Uint8Array(STATE_DATA_LENGTH);
  const ok = rtdt_pack_state(buf, buf.length, state);
  expect(ok).toBe(true);
  return rtdt_unpack_state(buf);
}

/** A richly-populated state exercising every field within its bit width. */
function makeRichState(): TowerState {
  const state = createDefaultTowerState();

  state.drum[0] = { jammed: true, calibrated: true, position: 2, playSound: true, reverse: false };
  state.drum[1] = { jammed: false, calibrated: true, position: 1, playSound: false, reverse: true };
  state.drum[2] = { jammed: true, calibrated: false, position: 3, playSound: true, reverse: true };

  // Vary every light's effect (0–7) and loop flag across all 6 layers × 4 lights.
  state.layer.forEach((layer, li) => {
    layer.light.forEach((light, ki) => {
      light.effect = (li * 4 + ki) % 8;
      light.loop = (li + ki) % 2 === 0;
    });
  });

  state.audio = { sample: 0x55, loop: true, volume: 15 };
  state.beam = { count: 0x1234, fault: true };
  state.led_sequence = 0xab;

  return state;
}

describe('STATE_DATA_LENGTH', () => {
  it('is 19 bytes (1 header byte is stripped before state)', () => {
    expect(STATE_DATA_LENGTH).toBe(19);
  });
});

describe('rtdt_pack_state / rtdt_unpack_state round-trip', () => {
  it('round-trips the default state', () => {
    const decoded = roundTrip(createDefaultTowerState());
    expect(decoded).toEqual(createDefaultTowerState());
  });

  it('preserves every field of a richly-populated state', () => {
    const decoded = roundTrip(makeRichState());

    // Drums
    expect(decoded.drum[0]).toEqual({ jammed: true, calibrated: true, position: 2, playSound: true, reverse: false });
    expect(decoded.drum[1]).toEqual({ jammed: false, calibrated: true, position: 1, playSound: false, reverse: true });
    expect(decoded.drum[2]).toEqual({ jammed: true, calibrated: false, position: 3, playSound: true, reverse: true });

    // Lights
    decoded.layer.forEach((layer, li) => {
      layer.light.forEach((light, ki) => {
        expect(light.effect).toBe((li * 4 + ki) % 8);
        expect(light.loop).toBe((li + ki) % 2 === 0);
      });
    });

    // Audio / beam / sequence
    expect(decoded.audio).toEqual({ sample: 0x55, loop: true, volume: 15 });
    expect(decoded.beam).toEqual({ count: 0x1234, fault: true });
    expect(decoded.led_sequence).toBe(0xab);
  });

  it('is idempotent (packing the decoded state yields the same state)', () => {
    const once = roundTrip(makeRichState());
    const twice = roundTrip(once);
    expect(twice).toEqual(once);
  });
});

describe('beam.count big-endian layout (state bytes 15–16)', () => {
  it('packs the high byte at index 15 and low byte at index 16', () => {
    const state = createDefaultTowerState();
    state.beam.count = 0x1234;
    const buf = new Uint8Array(STATE_DATA_LENGTH);
    rtdt_pack_state(buf, buf.length, state);
    expect(buf[15]).toBe(0x12);
    expect(buf[16]).toBe(0x34);
    expect(rtdt_unpack_state(buf).beam.count).toBe(0x1234);
  });

  it('round-trips the full 16-bit range boundaries (0 and 0xFFFF)', () => {
    for (const count of [0, 0xffff]) {
      const state = createDefaultTowerState();
      state.beam.count = count;
      expect(roundTrip(state).beam.count).toBe(count);
    }
  });
});

describe('rtdt_pack_state validation', () => {
  it('returns false when the output buffer is smaller than STATE_DATA_LENGTH', () => {
    const tooSmall = new Uint8Array(STATE_DATA_LENGTH - 1);
    expect(rtdt_pack_state(tooSmall, tooSmall.length, createDefaultTowerState())).toBe(false);
  });
});
