import { z } from 'zod';
import gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import { setAll } from '../builders/ledSequenceOps';
import { PwmByte, TICK_S } from './_helpers';

/**
 * `breathe` — symmetric triangle wave applied to all 24 LEDs in lockstep.
 * Mirrors firmware `Sequence_WholeTowerBreathing` (case 0x14):
 *
 *   doubled = (2 * elapsed) & ((peakPwm * 2) | 1)   // mask to triangle period
 *   magnitude = doubled >= peakPwm + 1 ? (peakPwm * 2 + 1) - doubled : doubled
 *   level = magnitude / divisor / 255
 *
 * Period is 2 * (peakPwm + 1) ticks. With `peakPwm = 255` (the firmware
 * value), period = 256 and the peak normalized level is `peakPwm/divisor/255`.
 *
 * Idiomatic usage on a forever-loop: pair with `loop: true, totalTicks: 1`
 * and `endTick: 1` (one tick per outer-loop iteration). The handler also
 * supports `endTick: 'forever'` inside a non-loop sequence by wrapping in a
 * `repeat: -1` sub-timeline.
 */
export const BreatheTrack = z.object({
  kind: z.literal('breathe'),
  _comment: z.string().optional(),
  atTick: z.number().int().min(0),
  endTick: z.union([z.number().int().positive(), z.literal('forever')]),
  periodTicks: z.number().int().positive(),
  peakPwm: PwmByte,
  divisor: z.number().int().positive(),
});
export type BreatheTrack = z.infer<typeof BreatheTrack>;

export function breatheHandler(
  track: BreatheTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const { atTick, endTick, periodTicks, peakPwm, divisor } = track;
  // Triangle-period math, mirrored from wholeTowerBreathing.ts:31-37.
  const halfPeriodDoubled = peakPwm + 1;
  const fullPeriodDoubledMask = peakPwm * 2 + 1;
  // Closure-captured per-track counter — survives loop iterations (the
  // closure is set up once at build time, not re-created each loop).
  const elapsed = { ticks: 0 };

  const tickFn = (): void => {
    const doubled = (2 * elapsed.ticks) & fullPeriodDoubledMask;
    const magnitude =
      doubled >= halfPeriodDoubled ? fullPeriodDoubledMask - doubled : doubled;
    const level = magnitude / divisor / 255;
    setAll(deps.ledAnimator, level);
    elapsed.ticks = (elapsed.ticks + 1) % periodTicks;
  };

  if (endTick === 'forever') {
    const loop = gsap.timeline({ repeat: -1 });
    loop.call(tickFn, undefined, 0);
    loop.to({}, { duration: TICK_S });
    tl.add(loop, atTick * TICK_S);
    return;
  }
  for (let tick = atTick; tick < endTick; tick++) {
    tl.call(tickFn, undefined, tick * TICK_S);
  }
}
