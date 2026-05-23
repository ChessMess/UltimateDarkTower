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
  readLevel,
  writeScope,
} from './_helpers';

/**
 * `solid` — write a constant level to a scope of LEDs at `atTick`. Optional
 * `endTick` is informational; the player does not write at endTick (the LEDs
 * hold whatever was written until another track touches them).
 *
 * Used by victory ph0–5, sealReveal ph3, dungeonIdle steady, rotation steady,
 * various final cuts.
 */
export const SolidTrack = z
  .object({
    kind: z.literal('solid'),
    _comment: z.string().optional(),
    layers: LayerList,
    lights: LightScope,
    atTick: z.number().int().min(0),
    endTick: z.number().int().positive().optional(),
    level: NormalizedLevel.optional(),
    levelPwm: PwmByte.optional(),
  })
  .refine(exactlyOne('level', 'levelPwm'), {
    message: "solid: specify exactly one of 'level' or 'levelPwm'",
  });
export type SolidTrack = z.infer<typeof SolidTrack>;

export function solidHandler(
  track: SolidTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const level = readLevel(track);
  tl.call(
    () => writeScope(deps.ledAnimator, track.layers, track.lights, level),
    undefined,
    track.atTick * TICK_S,
  );
}
