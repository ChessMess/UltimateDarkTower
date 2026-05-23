import { z } from 'zod';
import type gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import { decayAll } from '../builders/ledSequenceOps';
import { TICK_S } from './_helpers';

/**
 * `scaleAll` — multiply every LED's level by `multiplierNum / multiplierDen`
 * once per tick across `[atTick, endTick)`. Despite the legacy name
 * `decayAll`, the multiplier may be > 1 (victory's flurry uses 200/198 to
 * ramp UP).
 *
 * Used by flare-family ph2, gloat (per-tick), angryStrobe ph2, victory
 * flurry+hold, and twinkle's global decay.
 */
export const ScaleAllTrack = z.object({
  kind: z.literal('scaleAll'),
  _comment: z.string().optional(),
  atTick: z.number().int().min(0),
  endTick: z.number().int().positive(),
  multiplierNum: z.number().int().positive(),
  multiplierDen: z.number().int().positive(),
});
export type ScaleAllTrack = z.infer<typeof ScaleAllTrack>;

export function scaleAllHandler(
  track: ScaleAllTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const { atTick, endTick, multiplierNum, multiplierDen } = track;
  for (let tick = atTick; tick < endTick; tick++) {
    tl.call(
      () => decayAll(deps.ledAnimator, multiplierNum, multiplierDen),
      undefined,
      tick * TICK_S,
    );
  }
}
