import type { LedEffectAnimator } from '../../src/3d/LedEffectAnimator';

/**
 * Minimal stand-in for `LedEffectAnimator` that records the latest level
 * per LED. Sequence builders only ever call `setLevel` and `getLevel`, so this
 * is the entire surface they observe.
 *
 * Snapshot recording / parity tests pass an instance of this (cast through
 * `unknown` to satisfy the `LedEffectAnimator` parameter type) into
 * `SequenceAnimatorDeps.ledAnimator`, then sample `getLevel` for every LED at
 * each firmware tick after seeking the timeline.
 */
const TOWER_LAYER_COUNT = 6;
const LIGHTS_PER_LAYER = 4;
const TOTAL_LEDS = TOWER_LAYER_COUNT * LIGHTS_PER_LAYER;

export class RecordingAnimator {
  private readonly levels: Float64Array = new Float64Array(TOTAL_LEDS);

  setLevel(layer: number, light: number, level: number, _durationS = 0): void {
    this.levels[layer * LIGHTS_PER_LAYER + light] = level;
  }

  getLevel(layer: number, light: number): number {
    return this.levels[layer * LIGHTS_PER_LAYER + light];
  }

  /** Returns a fresh copy of all 24 LED levels, ordered layer-major-light-minor. */
  snapshot(): number[] {
    return Array.from(this.levels);
  }

  /** Reset every LED to 0. Used between baseline runs so each starts clean. */
  reset(): void {
    this.levels.fill(0);
  }

  /** Cast helper — sequence builders type their dep as `LedEffectAnimator`. */
  asLedAnimator(): LedEffectAnimator {
    return this as unknown as LedEffectAnimator;
  }
}
