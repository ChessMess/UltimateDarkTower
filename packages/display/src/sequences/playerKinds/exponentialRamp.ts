import { z } from 'zod';
import type gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import {
  LayerList,
  LightScope,
  NormalizedLevel,
  PwmByte,
  TICK_S,
  exactlyOne,
  resolveLights,
} from './_helpers';

/**
 * `exponentialRamp` — every tick in `[atTick, atTick + durationTicks)` reads
 * each LED in scope, multiplies by `multiplierNum / multiplierDen`, and writes
 * back, clamped to `[floorLevel, 1]`. If the LED has already reached
 * `saturationLevel`, it snaps to 1.
 *
 * Mirrors flareThenFade / flareThenFadeBase / flareThenFlicker phase 1
 * (firmware case 0x02 / 0x03 / 0x04). Initial state of 0 + a `floorLevel`
 * floor means the first tick lifts every LED to `floorLevel`, then growth
 * compounds from there.
 *
 * Both `floorLevel` and `saturationLevel` accept either a normalized 0..1
 * value or a sibling `*Pwm` integer 0..255.
 */
export const ExponentialRampTrack = z
  .object({
    kind: z.literal('exponentialRamp'),
    _comment: z.string().optional(),
    layers: LayerList,
    lights: LightScope,
    atTick: z.number().int().min(0),
    durationTicks: z.number().int().positive(),
    multiplierNum: z.number().int().positive(),
    multiplierDen: z.number().int().positive(),
    floorLevel: NormalizedLevel.optional(),
    floorLevelPwm: PwmByte.optional(),
    saturationLevel: NormalizedLevel.optional(),
    saturationLevelPwm: PwmByte.optional(),
  })
  .refine(exactlyOne('floorLevel', 'floorLevelPwm'), {
    message: "exponentialRamp: specify exactly one of 'floorLevel' or 'floorLevelPwm'",
  })
  .refine(exactlyOne('saturationLevel', 'saturationLevelPwm'), {
    message: "exponentialRamp: specify exactly one of 'saturationLevel' or 'saturationLevelPwm'",
  });
export type ExponentialRampTrack = z.infer<typeof ExponentialRampTrack>;

export function exponentialRampHandler(
  track: ExponentialRampTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const {
    layers, lights, atTick, durationTicks, multiplierNum, multiplierDen,
  } = track;
  const floor = track.floorLevel ?? track.floorLevelPwm! / 255;
  const saturation = track.saturationLevel ?? track.saturationLevelPwm! / 255;
  const lightList = resolveLights(lights);

  for (let tick = atTick; tick < atTick + durationTicks; tick++) {
    tl.call(
      () => {
        for (const layer of layers) {
          for (const light of lightList) {
            const current = deps.ledAnimator.getLevel(layer, light);
            const grown = (current * multiplierNum) / multiplierDen;
            const next = current >= saturation ? 1 : Math.max(floor, Math.min(1, grown));
            deps.ledAnimator.setLevel(layer, light, next, 0);
          }
        }
      },
      undefined,
      tick * TICK_S,
    );
  }
}
