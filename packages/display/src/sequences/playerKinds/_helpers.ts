/**
 * Shared helpers for kind handlers.
 *
 * The canonical iteration order across all handlers is **layer-major,
 * light-minor**. This matters for RNG-consuming kinds (flickerStep,
 * pulseFlicker, twinkle's respawn): the draw order is load-bearing for the
 * deterministic parity snapshots, which replay each sequence under a seeded RNG.
 */
import { z } from 'zod';
import type { LedEffectAnimator } from '../../3d/LedEffectAnimator';
import { FIRMWARE_TICK_HZ } from '../sequenceMetadata';

export const LIGHTS_PER_LAYER = 4;
export const TOWER_LAYER_COUNT = 6;
export const TOTAL_LEDS = LIGHTS_PER_LAYER * TOWER_LAYER_COUNT;
export const TICK_S = 1 / FIRMWARE_TICK_HZ;

/** Layer index 0 (top ring) through 5 (base2). */
export const LayerIndex = z.number().int().min(0).max(5);
/** Light index 0..3 within a layer. */
export const LightIndex = z.number().int().min(0).max(3);

/** Light scope: 'all' = every light in the listed layers, or an explicit subset. */
export const LightScope = z.union([z.literal('all'), z.array(LightIndex).min(1)]);
export const LayerList = z.array(LayerIndex).min(1);
export type LightScope = z.infer<typeof LightScope>;
export type LayerList = z.infer<typeof LayerList>;

/** Resolve `lights: 'all' | number[]` to a concrete array of light indices. */
export function resolveLights(lights: LightScope): readonly number[] {
  return lights === 'all' ? ALL_LIGHTS : lights;
}
const ALL_LIGHTS: readonly number[] = [0, 1, 2, 3];

/** Iterate (layer, light) in canonical layer-major-light-minor order over a scope. */
export function forEachLed(
  layers: readonly number[],
  lights: LightScope,
  fn: (layer: number, light: number) => void,
): void {
  const lightList = resolveLights(lights);
  for (const layer of layers) {
    for (const light of lightList) {
      fn(layer, light);
    }
  }
}

/** Write a constant level to every (layer, light) in a scope. */
export function writeScope(
  animator: LedEffectAnimator,
  layers: readonly number[],
  lights: LightScope,
  level: number,
): void {
  forEachLed(layers, lights, (layer, light) => {
    animator.setLevel(layer, light, level, 0);
  });
}

/**
 * Accept either a normalized `<key>` (0..1) or a sibling `<key>Pwm` (integer
 * 0..255). Returns a Zod refinement+transform fragment to spread into a track
 * schema via `.refine` + `.transform` after `.extend`. To use:
 *
 *   const SolidTrack = z.object({...}).extend(levelOrPwm('level')).refine(...)
 */
export const NormalizedLevel = z.number().min(0).max(1);
export const PwmByte = z.number().int().min(0).max(255);

/**
 * Tiny helper: validate that exactly one of `level` / `levelPwm` is set on a
 * parsed object, and produce the normalized value. Used by handlers that read
 * the level directly.
 */
export function readLevel(obj: { level?: number; levelPwm?: number }): number {
  if (obj.level !== undefined) return obj.level;
  if (obj.levelPwm !== undefined) return obj.levelPwm / 255;
  throw new Error('readLevel: neither level nor levelPwm set');
}

/** Same shape as readLevel but for a (delta, deltaPwm) pair. */
export function readDelta(obj: { delta?: number; deltaPwm?: number }): number {
  if (obj.delta !== undefined) return obj.delta;
  if (obj.deltaPwm !== undefined) return obj.deltaPwm / 255;
  throw new Error('readDelta: neither delta nor deltaPwm set');
}

/** Refinement: exactly one of (a, b) is set on a parsed object. */
export function exactlyOne<A extends string, B extends string>(a: A, b: B) {
  return (obj: Record<string, unknown>): boolean =>
    (obj[a] === undefined) !== (obj[b] === undefined);
}
