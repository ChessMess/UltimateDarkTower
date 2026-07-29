/**
 * Which seal is the official app revealing? (PRD-05 FR-05.4)
 *
 * The BLE protocol has no "seal broken" field. What it has is the firmware's
 * `sealReveal` LED sequence: the app rotates the drums so the seal faces the
 * player, lights that opening, and sets `led_sequence` to `sealReveal`. The lit
 * ring light identifies the opening — ring layers 0/1/2 are the top/middle/bottom
 * drums and light indices 0-3 are N/E/S/W (`TOWER_LAYERS` / `RING_LIGHT_POSITIONS`
 * in `ultimatedarktower`), which is exactly a `SealRef`.
 *
 * ponytail: the mapping is inferred from the library's layer constants, not
 * captured from the live companion app. If a capture shows the app lights the
 * ledge or several ring lights during a reveal, tighten this against the log
 * (`apps/relay-cli` writes JSONL to ./logs). Ambiguity is deliberately resolved
 * as "don't guess" — the player's manual seal tap still works and overrides.
 */
import type { TowerState } from 'ultimatedarktower';
import { TOWER_LIGHT_SEQUENCES } from '@/lib/udtData';
import type { SealRef } from './types';

/** Ring layer index → drum level (`TOWER_LAYERS.TOP_RING` = 0, MIDDLE = 1, BOTTOM = 2). */
const RING_LEVELS = ['top', 'middle', 'bottom'] as const;

/** Ring light index → cardinal side (`RING_LIGHT_POSITIONS.NORTH` = 0 … WEST = 3). */
const RING_SIDES = ['north', 'east', 'south', 'west'] as const;

/**
 * The seal the app is revealing in this state, or `null`.
 *
 * Returns a seal only when the state carries the `sealReveal` sequence **and**
 * exactly one ring light is lit. Zero lit lights (the sequence without a target)
 * or several (an effect that sweeps the tower) are ambiguous, and an ambiguous
 * reveal is reported as no reveal rather than a guess.
 */
export function detectSealReveal(state: TowerState): SealRef | null {
  if (state.led_sequence !== TOWER_LIGHT_SEQUENCES.sealReveal) return null;

  let found: SealRef | null = null;
  for (let level = 0; level < RING_LEVELS.length; level++) {
    for (let side = 0; side < RING_SIDES.length; side++) {
      if (state.layer[level].light[side].effect === 0) continue;
      if (found) return null; // more than one lit opening — can't attribute
      found = { level: RING_LEVELS[level], side: RING_SIDES[side] };
    }
  }
  return found;
}
