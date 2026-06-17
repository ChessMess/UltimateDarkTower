/**
 * NotificationSynthesizer — completes the tower→app return-traffic loop.
 *
 * The official companion app expects a real tower to send notifications back
 * over BLE: a skull-drop count when a skull falls, a calibration-complete reply
 * after a calibration command, and a periodic battery heartbeat. `FakeTower`
 * already sends an initial heartbeat (on subscribe) and a per-write echo after
 * every command. This class supplies the *rest* of the return traffic so a
 * digital consumer with no physical tower can play a full game against the app:
 *
 *   - **Skull drop** — driven by a *participant*-reported player action
 *     (`dropSkull()`), not a manual operator click. Increments the skull-drop
 *     count and sends a notification built from the last command (FR-3.1).
 *   - **Calibration complete** — when the app sends the calibration opcode
 *     (`TOWER_COMMANDS.calibration`), reply with a tower-state notification
 *     carrying the fully-calibrated state (all drums calibrated, position 0),
 *     built via `rtdt_pack_state` over the last-command baseline (FR-3.2/3.4).
 *   - **Heartbeat** — a periodic battery beat is *likely not required* (the
 *     initial heartbeat + per-write echoes suffice, PRD §11 Q1). Provided here
 *     as an opt-in fallback, disabled by default.
 *
 * It is headless and BLE-free: it targets a {@link NotificationSink} (satisfied
 * by both `FakeTower` and `MockTower`) and emits semantic {@link RelayEvent}s for
 * the future event log, so it can be unit-tested without Bluetooth.
 *
 * > **Capture-pending (PRD §11 Q3 / §13):** the exact bytes/timing the official
 * > app needs for a calibration reply cannot be confirmed without the app and a
 * > real-tower capture. The default below (tower-state response with calibrated
 * > drums) follows the UDT central library's completion detection and the
 * > Display's `buildCalibratedState`; the reply type byte and timing are
 * > configurable so they can be tuned against a capture without code surgery.
 */

import { EventEmitter } from 'events';
import {
  TOWER_COMMANDS,
  STATE_DATA_LENGTH,
  rtdt_unpack_state,
  rtdt_pack_state,
  createDefaultTowerState,
  type TowerState,
} from 'ultimatedarktower';
import {
  type RelayEvent,
  makeCommandReceivedEvent,
  makeSkullDroppedEvent,
  makeCalibrationCompleteEvent,
  makeHeartbeatEvent,
} from 'ultimatedarktowerrelay-shared';
import { buildSkullDropPacket, TOWER_COMMAND_LENGTH, TOWER_STATE_NOTIFICATION_TYPE } from './commandParser';

/** 1-byte command header that precedes the 19-byte state data in a 20-byte packet. */
const COMMAND_HEADER_SIZE = 1;

/**
 * The first notification a real tower sends on subscribe (`07 00 00 0c 10`).
 * `FakeTower` sends this once; the optional periodic heartbeat fallback reuses
 * the same bytes.
 */
const DEFAULT_HEARTBEAT_PACKET = [0x07, 0x00, 0x00, 0x0c, 0x10];

/**
 * The notification target the synthesizer sends to. Satisfied by `FakeTower`
 * (real BLE) and `MockTower` (BLE-free). Kept minimal so the synthesizer never
 * imports the bleno-backed `FakeTower` directly (tests stay BLE-free).
 */
export interface NotificationSink {
  /** Send a raw notification buffer to the companion app. Returns false if no subscriber is active. */
  sendTxNotification(data: Buffer): boolean;
  /** The last 20-byte command received from the companion app, or null. */
  getLastCommand(): number[] | null;
}

/** Tuning knobs for {@link NotificationSynthesizer}. */
export interface NotificationSynthesizerOptions {
  /**
   * Message-type byte (byte 0) for the calibration-complete reply. Default
   * `TOWER_STATE_NOTIFICATION_TYPE` (0x00) — a tower-state response, which the
   * UDT central library treats as calibration-complete while it is calibrating.
   * Set to `TOWER_MESSAGES.CALIBRATION_FINISHED.value` (0x08) if a capture shows
   * the app needs the distinct message type.
   */
  calibrationReplyType?: number;
  /**
   * Delay (ms) before the calibration reply is sent. A real tower calibrates
   * physically before replying; the delay also lets the per-write echo land
   * first. Default 0 (next tick).
   */
  calibrationReplyDelayMs?: number;
  /**
   * Periodic heartbeat interval (ms). When unset/0 the periodic fallback is
   * disabled (the default — initial heartbeat + per-write echoes suffice,
   * PRD §11 Q1). Set only if a capture shows the app timing out without it.
   */
  heartbeatIntervalMs?: number;
  /** Bytes for the periodic heartbeat. Default `07 00 00 0c 10`. */
  heartbeatPacket?: number[];
}

interface SynthesizerEventMap {
  /** A semantic relay event was produced (for logging / the future event log). */
  'event': [event: RelayEvent];
}

/**
 * NotificationSynthesizer produces the tower→app notifications a real tower
 * would send, driven by participant actions and app commands.
 *
 * @example
 * ```ts
 * const synth = new NotificationSynthesizer(fakeTower);
 * fakeTower.on('command', (d) => synth.onCommand(d)); // calibration detection
 * synth.on('event', (e) => logger.logEvent('event', 'host', e.type));
 * relay = new RelayServer({ onClientAction: () => synth.dropSkull() });
 * ```
 */
export class NotificationSynthesizer extends EventEmitter<SynthesizerEventMap> {
  private readonly sink: NotificationSink;
  private readonly calibrationReplyType: number;
  private readonly calibrationReplyDelayMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly heartbeatPacket: number[];

  /** Skull-drop count sent to the companion app this session. */
  private _skullDropCount = 0;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _calibrationTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(sink: NotificationSink, options: NotificationSynthesizerOptions = {}) {
    super();
    this.sink = sink;
    this.calibrationReplyType = options.calibrationReplyType ?? TOWER_STATE_NOTIFICATION_TYPE;
    this.calibrationReplyDelayMs = options.calibrationReplyDelayMs ?? 0;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 0;
    this.heartbeatPacket = options.heartbeatPacket ?? DEFAULT_HEARTBEAT_PACKET;
  }

  /**
   * Synthesize a skull-drop notification (FR-3.1). Called when a participant
   * reports they dropped a skull. Increments the count (wrapping 255→1, never 0,
   * because the UDT library treats 0 as "reset" and only fires `onSkullDrop` on a
   * nonzero change), builds a packet from the last command so unrelated state is
   * preserved, and sends it.
   *
   * @returns `true` if the notification was sent, `false` if no subscriber is active.
   */
  dropSkull(): boolean {
    const nextCount = this._skullDropCount >= 255 ? 1 : this._skullDropCount + 1;
    const packet = buildSkullDropPacket(this.sink.getLastCommand(), nextCount);

    const sent = this.sink.sendTxNotification(packet);
    if (!sent) {
      // No companion subscriber — leave the count untouched so the first real
      // drop still starts cleanly from 1.
      return false;
    }

    this._skullDropCount = nextCount;
    this.emit('event', makeSkullDroppedEvent(nextCount, Array.from(packet)));
    return true;
  }

  /**
   * Observe a command from the companion app. Emits a `command-received` event,
   * and — if the command is the calibration opcode — schedules a synthesized
   * calibration-complete reply (FR-3.2). Keyed on byte 0 so it works regardless
   * of the command's length (the app may send calibration as a short packet).
   */
  onCommand(data: Buffer | Uint8Array | number[]): void {
    const bytes = Array.from(data);
    this.emit('event', makeCommandReceivedEvent(bytes));

    if (bytes[0] === TOWER_COMMANDS.calibration) {
      this.scheduleCalibrationReply();
    }
  }

  /**
   * Build and send the calibration-complete reply. The reply represents the
   * fully-calibrated tower state — all drums calibrated at position 0 — built via
   * `rtdt_pack_state` over the last-command baseline so unrelated state bytes are
   * preserved (FR-3.4). Audio and the LED-sequence override are cleared, matching
   * the per-write echo and the clean post-calibration state.
   */
  private scheduleCalibrationReply(): void {
    const send = (): void => {
      const packet = this.buildCalibrationPacket();
      if (this.sink.sendTxNotification(packet)) {
        this.emit('event', makeCalibrationCompleteEvent(this.calibrationReplyType, Array.from(packet)));
      }
    };

    if (this.calibrationReplyDelayMs > 0) {
      const timer = setTimeout(() => {
        this._calibrationTimers.delete(timer);
        send();
      }, this.calibrationReplyDelayMs);
      this._calibrationTimers.add(timer);
    } else {
      send();
    }
  }

  /** Construct the 20-byte calibrated-state notification packet. */
  private buildCalibrationPacket(): Buffer {
    const state = this.calibratedStateFromBaseline();

    const stateData = new Uint8Array(STATE_DATA_LENGTH);
    rtdt_pack_state(stateData, STATE_DATA_LENGTH, state);

    const packet = Buffer.alloc(TOWER_COMMAND_LENGTH, 0);
    packet[0] = this.calibrationReplyType & 0xff;
    Buffer.from(stateData).copy(packet, COMMAND_HEADER_SIZE);
    return packet;
  }

  /**
   * Derive the calibrated `TowerState`: start from the last command's state (or a
   * default state if none yet), mark every drum calibrated at position 0, and
   * clear the audio sample/loop and LED-sequence override.
   */
  private calibratedStateFromBaseline(): TowerState {
    const last = this.sink.getLastCommand();
    const state: TowerState =
      last && last.length === TOWER_COMMAND_LENGTH
        ? rtdt_unpack_state(new Uint8Array(last).subarray(COMMAND_HEADER_SIZE))
        : createDefaultTowerState();

    for (const drum of state.drum) {
      drum.calibrated = true;
      drum.position = 0;
    }
    state.audio.sample = 0;
    state.audio.loop = false;
    state.led_sequence = 0;

    return state;
  }

  /**
   * Start the optional periodic heartbeat fallback. No-op unless
   * `heartbeatIntervalMs` was configured. Idempotent.
   */
  startHeartbeat(): void {
    if (this.heartbeatIntervalMs <= 0 || this._heartbeatTimer) return;
    this._heartbeatTimer = setInterval(() => {
      const packet = Buffer.from(this.heartbeatPacket);
      if (this.sink.sendTxNotification(packet)) {
        this.emit('event', makeHeartbeatEvent(Array.from(packet)));
      }
    }, this.heartbeatIntervalMs);
  }

  /** Stop the periodic heartbeat fallback if running. */
  stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /** The skull-drop count sent so far this session. */
  get skullDropCount(): number {
    return this._skullDropCount;
  }

  /**
   * Reset session state. Call when the companion app disconnects so the first
   * drop after reconnect starts cleanly from 1.
   */
  reset(): void {
    this._skullDropCount = 0;
  }

  /** Tear down timers. Call on shutdown. */
  destroy(): void {
    this.stopHeartbeat();
    for (const timer of this._calibrationTimers) clearTimeout(timer);
    this._calibrationTimers.clear();
    this.removeAllListeners();
  }
}
