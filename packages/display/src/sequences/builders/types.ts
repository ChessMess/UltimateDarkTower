import type gsap from 'gsap';
import type { LedEffectAnimator } from '../../3d/LedEffectAnimator';

export interface SequenceAnimatorDeps {
  readonly ledAnimator: LedEffectAnimator;
  /**
   * Optional injectable RNG. Defaults to `Math.random` when undefined.
   * Used by tests and by the example app's TS/JSON A/B harness so that two
   * runs of a flicker/sparkle sequence can be compared deterministically.
   */
  readonly rng?: () => number;
}

export type SequenceTimelineBuilder = (
  deps: SequenceAnimatorDeps,
  onComplete: () => void,
) => gsap.core.Timeline | null;
