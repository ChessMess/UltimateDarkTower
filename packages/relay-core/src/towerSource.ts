/**
 * TowerSource — the seam between a source of 20-byte tower commands and the
 * relay daemon.
 *
 * The real BLE {@link TowerEmulator} (companion app drives it) and the BLE-free
 * {@link MockTower} (canned commands, for headless/CI verification) both
 * expose this surface, so the CLI can select between them via the
 * `TOWER_SOURCE` env var. This also seeds the selectable real-vs-tower emulator
 * source that Sync needs (PRD FR-5.1).
 */

import type { TowerEmulatorState } from 'ultimatedarktowerrelay-shared';

/** Events a tower source emits to the relay daemon. */
export interface TowerSourceEventMap {
  /** A 20-byte command was produced (companion app write, or a canned mock command). */
  'command': [data: Buffer];
  /** The source's peripheral state changed. */
  'state-change': [state: TowerEmulatorState];
  /** The companion app (or its mock stand-in) connected. */
  'companion-connected': [address: string];
  /** The companion app (or its mock stand-in) disconnected. */
  'companion-disconnected': [address: string];
}

/**
 * Minimal contract the relay daemon consumes. Satisfied by both `TowerEmulator`
 * and `MockTower`.
 */
export interface TowerSource {
  /** Begin producing commands (BLE advertising for TowerEmulator; canned emission for MockTower). */
  startAdvertising(): Promise<void>;
  /** Stop producing commands and release resources. */
  stopAdvertising(): Promise<void>;
  on(event: 'command', listener: (data: Buffer) => void): this;
  on(event: 'state-change', listener: (state: TowerEmulatorState) => void): this;
  on(event: 'companion-connected', listener: (address: string) => void): this;
  on(event: 'companion-disconnected', listener: (address: string) => void): this;
}
