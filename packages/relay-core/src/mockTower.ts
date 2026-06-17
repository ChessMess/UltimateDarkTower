/**
 * MockTower — a BLE-free {@link TowerSource} for headless/CI verification.
 *
 * Instead of advertising a real BLE peripheral, MockTower simulates a companion
 * app connecting and emits canned 20-byte tower commands. This lets the relay
 * be exercised end-to-end (`npm run start:mock` + a mock WebSocket consumer)
 * with no Bluetooth hardware. The same selectable-source seam will later carry
 * a real-tower driver (PRD FR-5.1).
 */

import { EventEmitter } from 'events';
import type { TowerSource, TowerSourceEventMap } from './towerSource';

/**
 * A plausible 20-byte tower-state command (byte 0 = tower-state header). It is
 * a valid packet that `CommandParser` accepts and `ObserverDisplay` can decode.
 */
const DEFAULT_MOCK_COMMAND: number[] = [
  0x00, 0x11, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

/** Options for {@link MockTower}. */
export interface MockTowerOptions {
  /** The canned 20-byte command to emit. Defaults to a plausible tower-state packet. */
  command?: number[];
  /** If > 0, re-emit the canned command on this interval (ms). Default: 0 (emit once on start). */
  intervalMs?: number;
}

/**
 * MockTower emits canned commands so the relay path can be tested without BLE.
 *
 * @example
 * ```ts
 * const tower = new MockTower();
 * tower.on('command', (data) => relay.broadcast(data));
 * await tower.startAdvertising(); // emits one canned command immediately
 * ```
 */
export class MockTower extends EventEmitter<TowerSourceEventMap> implements TowerSource {
  private _advertising = false;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private readonly _command: Buffer;
  private readonly _intervalMs: number;

  constructor(options: MockTowerOptions = {}) {
    super();
    this._command = Buffer.from(options.command ?? DEFAULT_MOCK_COMMAND);
    this._intervalMs = options.intervalMs ?? 0;
  }

  /**
   * Simulate the companion app connecting, then emit one canned command. If
   * `intervalMs` was provided, keep emitting on that interval.
   */
  async startAdvertising(): Promise<void> {
    if (this._advertising) return;
    this._advertising = true;

    this.emit('state-change', 'advertising');
    // Simulate the companion app connecting and the tower coming online.
    this.emit('companion-connected', 'mock');
    this.emit('state-change', 'connected');

    // Emit a canned command on the next tick so a just-connected consumer sees
    // a relayed tower:command without racing the relay's own startup.
    setImmediate(() => this.inject());

    if (this._intervalMs > 0) {
      this._timer = setInterval(() => this.inject(), this._intervalMs);
    }
  }

  /** Stop emitting and simulate the companion app disconnecting. */
  async stopAdvertising(): Promise<void> {
    if (!this._advertising) return;
    this._advertising = false;

    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    this.emit('companion-disconnected', 'mock');
    this.emit('state-change', 'idle');
  }

  /** Emit one canned 20-byte command, as if the companion app had written it. */
  inject(): void {
    this.emit('command', Buffer.from(this._command));
  }

  /** Returns true while the mock source is "advertising". */
  isAdvertising(): boolean {
    return this._advertising;
  }
}
