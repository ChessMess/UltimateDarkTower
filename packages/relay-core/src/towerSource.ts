/**
 * TowerSource — the seam between a source of 20-byte tower commands and the
 * relay daemon.
 *
 * The real BLE {@link FakeTower} (companion app drives it) and the BLE-free
 * {@link MockTower} (canned commands, for headless/CI verification) both
 * expose this surface, so the CLI can select between them via the
 * `TOWER_SOURCE` env var. This also seeds the selectable real-vs-fake tower
 * source that Sync needs (PRD FR-5.1).
 */

import type { FakeTowerState } from 'ultimatedarktowerrelay-shared';

/** Events a tower source emits to the relay daemon. */
export interface TowerSourceEventMap {
  /** A 20-byte command was produced (companion app write, or a canned mock command). */
  'command': [data: Buffer];
  /** The source's peripheral state changed. */
  'state-change': [state: FakeTowerState];
  /** The companion app (or its mock stand-in) connected. */
  'companion-connected': [address: string];
  /** The companion app (or its mock stand-in) disconnected. */
  'companion-disconnected': [address: string];
}

/**
 * Minimal contract the relay daemon consumes. Satisfied by both `FakeTower`
 * and `MockTower`.
 */
export interface TowerSource {
  /** Begin producing commands (BLE advertising for FakeTower; canned emission for MockTower). */
  startAdvertising(): Promise<void>;
  /** Stop producing commands and release resources. */
  stopAdvertising(): Promise<void>;
  on(event: 'command', listener: (data: Buffer) => void): this;
  on(event: 'state-change', listener: (state: FakeTowerState) => void): this;
  on(event: 'companion-connected', listener: (address: string) => void): this;
  on(event: 'companion-disconnected', listener: (address: string) => void): this;
}
