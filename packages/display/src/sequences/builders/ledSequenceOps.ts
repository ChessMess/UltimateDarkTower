/**
 * Cross-cutting per-tick operations on `LedEffectAnimator`. These mirror
 * firmware primitives (`lights_decay_all`, the per-LED flicker step) and let
 * sequence builders avoid duplicating the read-modify-write loop.
 */

import type { LedEffectAnimator } from '../../3d/LedEffectAnimator';
import { LIGHTS_PER_LAYER, TOWER_LAYER_COUNT } from '../../3d/constants';
import { decayLevel, randomFlickerTarget } from './ledMath';

const FLICKER_TARGET_UPDATE_PROBABILITY = 0.25; // firmware: (rand & 0xff) > 0xc0
const RANDOM_LED_INDEX_TOTAL = TOWER_LAYER_COUNT * LIGHTS_PER_LAYER;

/**
 * Total number of physical LEDs (24 = 6 layers * 4 lights). Helpful for sizing
 * shadow arrays.
 */
export const TOTAL_LED_COUNT = RANDOM_LED_INDEX_TOTAL;

/**
 * Multiplies every LED's level by `multiplier / divisor`. Mirrors firmware's
 * `lights_decay_all`. Returns true iff all LEDs are at 0 after the step —
 * sequences such as FlareThenFade and Gloat use this signal to know when the
 * tail has finished.
 */
export function decayAll(
  animator: LedEffectAnimator,
  multiplier: number,
  divisor: number,
): boolean {
  let allZero = true;
  for (let layer = 0; layer < TOWER_LAYER_COUNT; layer++) {
    for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
      const current = animator.getLevel(layer, light);
      if (current <= 0) continue;
      const next = decayLevel(current, multiplier, divisor);
      animator.setLevel(layer, light, next, 0);
      if (next > 0) allZero = false;
    }
  }
  return allZero;
}

/**
 * Sets every light on the given layers to `level`.
 */
export function setLayers(
  animator: LedEffectAnimator,
  layers: readonly number[],
  level: number,
): void {
  for (const layer of layers) {
    for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
      animator.setLevel(layer, light, level, 0);
    }
  }
}

/**
 * Sets every LED across all six layers to `level`.
 */
export function setAll(animator: LedEffectAnimator, level: number): void {
  for (let layer = 0; layer < TOWER_LAYER_COUNT; layer++) {
    for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
      animator.setLevel(layer, light, level, 0);
    }
  }
}

/**
 * One firmware "Effect_Flicker" / "Sequence_AngryStrobe_*" step on a single
 * LED:
 *   - 25% chance to refresh `cachedTargets[ledIndex]` via `randomFlickerTarget`
 *   - level <- current * (1 - alpha) + cachedTargets[ledIndex] * alpha
 *
 * `cachedTargets` is the caller's per-LED target slot (a flat array of length
 * `TOTAL_LED_COUNT`); the target persists across ticks so most ticks just lerp
 * toward the same value, producing a slowly-evolving flicker.
 */
export function applyFlickerStep(
  animator: LedEffectAnimator,
  layer: number,
  light: number,
  cachedTargets: number[],
  alpha: number,
  rng: () => number = Math.random,
): void {
  const ledIndex = layer * LIGHTS_PER_LAYER + light;
  if (rng() < FLICKER_TARGET_UPDATE_PROBABILITY) {
    cachedTargets[ledIndex] = randomFlickerTarget(rng);
  }
  const current = animator.getLevel(layer, light);
  const next = current * (1 - alpha) + cachedTargets[ledIndex] * alpha;
  animator.setLevel(layer, light, next, 0);
}

/**
 * Convenience: returns a fresh per-LED target buffer for use with
 * `applyFlickerStep`. Builders that flicker should allocate one of these
 * inside their factory closure.
 */
export function makeFlickerTargetBuffer(): number[] {
  return new Array<number>(TOTAL_LED_COUNT).fill(0);
}
