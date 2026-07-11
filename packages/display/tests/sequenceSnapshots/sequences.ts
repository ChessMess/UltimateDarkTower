import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktower';

/**
 * Per-sequence drive metadata shared between the baseline test
 * (`snapshots.test.ts`) and the parity test (`parity.test.ts`).
 *
 * `driveTicks` for non-loop sequences = the natural end (`totalTicks` from the
 * source). For loop sequences (`repeat: -1`), it's a window long enough to
 * capture observable behavior — a full period for `breathe`/`rotation`, a
 * generous slice for stochastic `twinkle` / `dungeonIdle`.
 */
export interface SequenceSpec {
  readonly name: string;
  readonly id: number;
  readonly driveTicks: number;
  readonly loop: boolean;
}

export const SEQUENCES: readonly SequenceSpec[] = [
  // --- non-loop, deterministic ---
  { name: 'defeat', id: TOWER_LIGHT_SEQUENCES.defeat, driveTicks: 651, loop: false },
  { name: 'monthStarted', id: TOWER_LIGHT_SEQUENCES.monthStarted, driveTicks: 426, loop: false },
  { name: 'victory', id: TOWER_LIGHT_SEQUENCES.victory, driveTicks: 1026, loop: false },
  { name: 'slowFlareThenFade', id: TOWER_LIGHT_SEQUENCES.slowFlareThenFade, driveTicks: 350, loop: false },
  // --- non-loop, deterministic exponential ---
  { name: 'flareThenFade', id: TOWER_LIGHT_SEQUENCES.flareThenFade, driveTicks: 225, loop: false },
  { name: 'flareThenFadeBase', id: TOWER_LIGHT_SEQUENCES.flareThenFadeBase, driveTicks: 225, loop: false },
  // --- non-loop, gloat (chortle + per-tick decay; tick range 0..400 inclusive = 401) ---
  { name: 'gloat01', id: TOWER_LIGHT_SEQUENCES.gloat01, driveTicks: 401, loop: false },
  { name: 'gloat02', id: TOWER_LIGHT_SEQUENCES.gloat02, driveTicks: 401, loop: false },
  { name: 'gloat03', id: TOWER_LIGHT_SEQUENCES.gloat03, driveTicks: 401, loop: false },
  // --- non-loop, RNG (angryStrobe = phase1Ticks + 1 + TAIL_DECAY_BUDGET_TICKS=600) ---
  { name: 'angryStrobe01', id: TOWER_LIGHT_SEQUENCES.angryStrobe01, driveTicks: 721, loop: false },
  { name: 'angryStrobe02', id: TOWER_LIGHT_SEQUENCES.angryStrobe02, driveTicks: 696, loop: false },
  { name: 'angryStrobe03', id: TOWER_LIGHT_SEQUENCES.angryStrobe03, driveTicks: 741, loop: false },
  // --- non-loop, RNG (sealReveal pulseFlicker) ---
  { name: 'sealReveal', id: TOWER_LIGHT_SEQUENCES.sealReveal, driveTicks: 91, loop: false },
  // --- loop (repeat: -1) → drive a fixed window ---
  { name: 'twinkle', id: TOWER_LIGHT_SEQUENCES.twinkle, driveTicks: 256, loop: true },
  { name: 'dungeonIdle', id: TOWER_LIGHT_SEQUENCES.dungeonIdle, driveTicks: 256, loop: true },
  { name: 'flareThenFlicker', id: TOWER_LIGHT_SEQUENCES.flareThenFlicker, driveTicks: 256, loop: true },
  { name: 'wholeTowerBreathing', id: TOWER_LIGHT_SEQUENCES.wholeTowerBreathing, driveTicks: 256, loop: true },
  { name: 'rotationAllDrums', id: TOWER_LIGHT_SEQUENCES.rotationAllDrums, driveTicks: 96, loop: true },
  { name: 'rotationDrumTop', id: TOWER_LIGHT_SEQUENCES.rotationDrumTop, driveTicks: 96, loop: true },
  { name: 'rotationDrumMiddle', id: TOWER_LIGHT_SEQUENCES.rotationDrumMiddle, driveTicks: 96, loop: true },
  { name: 'rotationDrumBottom', id: TOWER_LIGHT_SEQUENCES.rotationDrumBottom, driveTicks: 96, loop: true },
];

export const SEED = 0;
export const TOLERANCE = 1 / 255 + 1e-12;
