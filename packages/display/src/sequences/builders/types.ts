import type { LedEffectAnimator } from '../../3d/LedEffectAnimator';

export interface SequenceAnimatorDeps {
  readonly ledAnimator: LedEffectAnimator;
  /**
   * Optional injectable RNG. Defaults to `Math.random` when undefined. Lets the
   * parity snapshots replay a flicker/sparkle sequence under a seeded RNG so two
   * runs can be compared deterministically.
   */
  readonly rng?: () => number;
}
