/**
 * notificationSynthesizer.test.ts — unit tests for NotificationSynthesizer.
 *
 * BLE-free: imports the specific source module + a stub NotificationSink, never
 * the `core` barrel (which re-exports FakeTower → bleno). Asserts the synthesized
 * notification bytes against the expected packet shapes (PRD §13).
 */

import { TOWER_COMMANDS, TOWER_MESSAGES, rtdt_unpack_state } from 'ultimatedarktower';
import { NotificationSynthesizer, type NotificationSink } from './notificationSynthesizer';
import type { RelayEvent } from 'ultimatedarktowerrelay-shared';

const TOWER_COMMAND_LENGTH = 20;
const SKULL_POS = 17;
const CALIBRATION_CMD = TOWER_COMMANDS.calibration; // 4
const CALIBRATION_FINISHED = TOWER_MESSAGES.CALIBRATION_FINISHED.value; // 8

/** Stub sink that records every notification and lets a test control the baseline + subscriber state. */
class StubSink implements NotificationSink {
  sent: Buffer[] = [];
  lastCommand: number[] | null = null;
  subscribed = true;

  sendTxNotification(data: Buffer): boolean {
    if (!this.subscribed) return false;
    this.sent.push(Buffer.from(data));
    return true;
  }

  getLastCommand(): number[] | null {
    return this.lastCommand;
  }

  /** The most recently sent packet, or undefined. */
  last(): Buffer | undefined {
    return this.sent[this.sent.length - 1];
  }
}

/** Unpack the 19-byte state from a 20-byte packet (strip the 1-byte header). */
function unpack(packet: Buffer) {
  return rtdt_unpack_state(new Uint8Array(packet).subarray(1));
}

// ─── dropSkull ────────────────────────────────────────────────────────────────

describe('NotificationSynthesizer.dropSkull()', () => {
  it('sends a tower-state packet with byte 0 = 0x00 and byte 17 = count 1 on first drop', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    expect(synth.dropSkull()).toBe(true);
    const packet = sink.last()!;
    expect(packet.length).toBe(TOWER_COMMAND_LENGTH);
    expect(packet[0]).toBe(0x00);
    expect(packet[SKULL_POS]).toBe(1);
  });

  it('increments the count on each successive drop', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    synth.dropSkull();
    synth.dropSkull();
    synth.dropSkull();

    expect(sink.sent.map((p) => p[SKULL_POS])).toEqual([1, 2, 3]);
    expect(synth.skullDropCount).toBe(3);
  });

  it('wraps from 255 back to 1 (never 0, which the UDT lib treats as reset)', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    for (let i = 0; i < 255; i++) synth.dropSkull();
    expect(sink.last()![SKULL_POS]).toBe(255);

    synth.dropSkull(); // 256th
    expect(sink.last()![SKULL_POS]).toBe(1);
  });

  it('preserves unrelated state bytes from the last-command baseline', () => {
    const sink = new StubSink();
    const baseline = new Array(TOWER_COMMAND_LENGTH).fill(0xaa);
    baseline[0] = 0x00;
    baseline[SKULL_POS] = 0x00;
    sink.lastCommand = baseline;
    const synth = new NotificationSynthesizer(sink);

    synth.dropSkull();
    const packet = sink.last()!;
    expect(packet[0]).toBe(0x00); // header overwritten
    expect(packet[SKULL_POS]).toBe(1); // skull byte overwritten
    for (let i = 1; i < TOWER_COMMAND_LENGTH; i++) {
      if (i === SKULL_POS) continue;
      expect(packet[i]).toBe(0xaa); // everything else preserved
    }
  });

  it('is a no-op (and does not advance the count) when no subscriber is active', () => {
    const sink = new StubSink();
    sink.subscribed = false;
    const synth = new NotificationSynthesizer(sink);

    expect(synth.dropSkull()).toBe(false);
    expect(sink.sent).toHaveLength(0);
    expect(synth.skullDropCount).toBe(0);
  });

  it('emits a skull-dropped event with the count and packet', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);
    const events: RelayEvent[] = [];
    synth.on('event', (e) => events.push(e));

    synth.dropSkull();

    const evt = events.find((e) => e.type === 'skull-dropped');
    expect(evt).toBeDefined();
    if (evt && evt.type === 'skull-dropped') {
      expect(evt.payload.skullCount).toBe(1);
      expect(evt.payload.packet[SKULL_POS]).toBe(1);
    }
  });
});

// ─── onCommand / calibration ────────────────────────────────────────────────────

describe('NotificationSynthesizer.onCommand() — calibration', () => {
  it('replies to a calibration command with a fully-calibrated tower state', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    const cmd = Buffer.alloc(TOWER_COMMAND_LENGTH, 0);
    cmd[0] = CALIBRATION_CMD;
    synth.onCommand(cmd);

    expect(sink.sent).toHaveLength(1);
    const reply = sink.last()!;
    expect(reply.length).toBe(TOWER_COMMAND_LENGTH);
    expect(reply[0]).toBe(0x00); // default reply type = tower-state response

    const state = unpack(reply);
    expect(state.drum.every((d) => d.calibrated)).toBe(true);
    expect(state.drum.every((d) => d.position === 0)).toBe(true);
  });

  it('clears audio sample and LED-sequence override in the calibrated reply', () => {
    const sink = new StubSink();
    // Baseline carries an audio sample (byte 15) and an LED override (byte 19).
    const baseline = new Array(TOWER_COMMAND_LENGTH).fill(0);
    baseline[15] = 0x05;
    baseline[19] = 0x0e;
    sink.lastCommand = baseline;
    const synth = new NotificationSynthesizer(sink);

    const cmd = Buffer.alloc(TOWER_COMMAND_LENGTH, 0);
    cmd[0] = CALIBRATION_CMD;
    synth.onCommand(cmd);

    const state = unpack(sink.last()!);
    expect(state.audio.sample).toBe(0);
    expect(state.led_sequence).toBe(0);
  });

  it('honors a configurable CALIBRATION_FINISHED (0x08) reply type', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink, { calibrationReplyType: CALIBRATION_FINISHED });

    const cmd = Buffer.alloc(TOWER_COMMAND_LENGTH, 0);
    cmd[0] = CALIBRATION_CMD;
    synth.onCommand(cmd);

    expect(sink.last()![0]).toBe(CALIBRATION_FINISHED);
    expect(sink.last()![0]).toBe(0x08);
  });

  it('detects calibration on byte 0 regardless of command length', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    synth.onCommand(Buffer.from([CALIBRATION_CMD])); // 1-byte calibration write
    expect(sink.sent).toHaveLength(1);
    expect(unpack(sink.last()!).drum.every((d) => d.calibrated)).toBe(true);
  });

  it('does NOT reply to a non-calibration command', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    const cmd = Buffer.alloc(TOWER_COMMAND_LENGTH, 0); // byte 0 = 0x00 (tower state)
    synth.onCommand(cmd);

    expect(sink.sent).toHaveLength(0);
  });

  it('emits command-received for every command and calibration-complete on calibration', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);
    const events: RelayEvent[] = [];
    synth.on('event', (e) => events.push(e));

    synth.onCommand(Buffer.alloc(TOWER_COMMAND_LENGTH, 0)); // non-calibration
    synth.onCommand(Buffer.from([CALIBRATION_CMD])); // calibration

    expect(events.filter((e) => e.type === 'command-received')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'calibration-complete')).toHaveLength(1);
  });

  it('defers the calibration reply when a delay is configured', () => {
    jest.useFakeTimers();
    try {
      const sink = new StubSink();
      const synth = new NotificationSynthesizer(sink, { calibrationReplyDelayMs: 500 });

      synth.onCommand(Buffer.from([CALIBRATION_CMD]));
      expect(sink.sent).toHaveLength(0); // not yet

      jest.advanceTimersByTime(500);
      expect(sink.sent).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

// ─── heartbeat (optional fallback) ──────────────────────────────────────────────

describe('NotificationSynthesizer heartbeat fallback', () => {
  it('is disabled by default — startHeartbeat sends nothing', () => {
    jest.useFakeTimers();
    try {
      const sink = new StubSink();
      const synth = new NotificationSynthesizer(sink);
      synth.startHeartbeat();
      jest.advanceTimersByTime(10_000);
      expect(sink.sent).toHaveLength(0);
      synth.destroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('emits the heartbeat packet on the configured interval when enabled', () => {
    jest.useFakeTimers();
    try {
      const sink = new StubSink();
      const synth = new NotificationSynthesizer(sink, { heartbeatIntervalMs: 1000 });
      const events: RelayEvent[] = [];
      synth.on('event', (e) => events.push(e));

      synth.startHeartbeat();
      jest.advanceTimersByTime(3000);

      expect(sink.sent).toHaveLength(3);
      expect(Array.from(sink.last()!)).toEqual([0x07, 0x00, 0x00, 0x0c, 0x10]);
      expect(events.filter((e) => e.type === 'heartbeat')).toHaveLength(3);

      synth.stopHeartbeat();
      jest.advanceTimersByTime(3000);
      expect(sink.sent).toHaveLength(3); // no more after stop
    } finally {
      jest.useRealTimers();
    }
  });
});

// ─── session reset ──────────────────────────────────────────────────────────────

describe('NotificationSynthesizer.reset()', () => {
  it('resets the skull-drop count so the next drop starts at 1', () => {
    const sink = new StubSink();
    const synth = new NotificationSynthesizer(sink);

    synth.dropSkull();
    synth.dropSkull();
    expect(synth.skullDropCount).toBe(2);

    synth.reset();
    expect(synth.skullDropCount).toBe(0);

    synth.dropSkull();
    expect(sink.last()![SKULL_POS]).toBe(1);
  });
});
