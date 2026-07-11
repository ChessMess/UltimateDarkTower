import { z } from 'zod';
import type gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import {
  LayerList,
  LightScope,
  TICK_S,
  writeScope,
} from './_helpers';

/**
 * `linearRamp` — interpolate every LED in `scope` linearly from `from` to `to`
 * over `durationTicks`, starting at `atTick`.
 *
 * Two interpolation modes:
 *
 *  - `'gsapTween'` mirrors defeat / monthStarted ph1, which use
 *    `tl.to(state, { ease: 'none', onUpdate: () => writeScope(state.v) })`.
 *    This produces ~60 fps writes via GSAP's tween. Intermediate frames are
 *    smooth in the browser.
 *
 *  - `'perTick'` mirrors slowFlareThenFade, which schedules one `tl.call` per
 *    firmware tick with the level computed at registration time. Step writes
 *    at 50 Hz only.
 *
 * Both produce identical samples at firmware-tick boundaries (verified via
 * the snapshot driver), so parity tests don't differentiate.
 */
export const LinearRampTrack = z.object({
  kind: z.literal('linearRamp'),
  _comment: z.string().optional(),
  layers: LayerList,
  lights: LightScope,
  atTick: z.number().int().min(0),
  durationTicks: z.number().int().positive(),
  from: z.number().min(0).max(1),
  to: z.number().min(0).max(1),
  interpolation: z.enum(['gsapTween', 'perTick']),
});
export type LinearRampTrack = z.infer<typeof LinearRampTrack>;

export function linearRampHandler(
  track: LinearRampTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const { layers, lights, atTick, durationTicks, from, to, interpolation } = track;
  const startS = atTick * TICK_S;

  if (interpolation === 'gsapTween') {
    // Per-track state object — each ramp gets its own so concurrent ramps
    // don't share `v`. Mirrors `const layerLevel = { v: 0 }` in defeat.ts.
    const state = { v: from };
    tl.to(
      state,
      {
        v: to,
        duration: durationTicks * TICK_S,
        ease: 'none',
        onUpdate: () => writeScope(deps.ledAnimator, layers, lights, state.v),
      },
      startS,
    );
    return;
  }

  // perTick: one tl.call per firmware tick, level computed at registration.
  for (let tick = atTick; tick < atTick + durationTicks; tick++) {
    const progress = (tick - atTick) / durationTicks;
    const level = from + (to - from) * progress;
    tl.call(
      () => writeScope(deps.ledAnimator, layers, lights, level),
      undefined,
      tick * TICK_S,
    );
  }
}
