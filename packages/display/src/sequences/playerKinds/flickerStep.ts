import { z } from 'zod';
import gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import { applyFlickerStep, makeFlickerTargetBuffer } from '../builders/ledSequenceOps';
import {
  LIGHTS_PER_LAYER,
  LayerList,
  LightScope,
  NormalizedLevel,
  PwmByte,
  TICK_S,
  TOWER_LAYER_COUNT,
  resolveLights,
} from './_helpers';

/**
 * `flickerStep` — every tick over `[atTick, endTick)` (or `'forever'`),
 * either:
 *
 *  - **Standard mode** (no `respawn`): iterate every (layer, light) in the
 *    scope **layer-major, light-minor** and call `applyFlickerStep`. Mirrors
 *    flareThenFlicker ph2, angryStrobe ph1, dungeonIdle layer 0.
 *
 *  - **Respawn mode** (with `respawn`): one RNG draw to test
 *    `respawn.probability`; on pass, two more draws to pick (layer, light);
 *    if that LED's level is below `respawn.threshold`, one final draw chooses
 *    a level uniformly in `[levelMin, levelMax]` and writes it. Mirrors
 *    twinkle's spawn behavior. The standard alpha iteration is skipped.
 *
 * `endTick: 'forever'` wraps the per-tick callback in a `repeat: -1`
 * sub-timeline padded to one tick — same shape as
 * `gsap.timeline({ repeat: -1 }).call(fn, 0).to({}, { duration: tickS })`
 * used by twinkle / dungeonIdle / flareThenFlicker ph2.
 */
const Respawn = z
  .object({
    probability: z.number().min(0).max(1),
    threshold: NormalizedLevel.optional(),
    thresholdPwm: PwmByte.optional(),
    levelMin: NormalizedLevel,
    levelMax: NormalizedLevel,
  })
  .refine(
    (o) => (o.threshold === undefined) !== (o.thresholdPwm === undefined),
    { message: "respawn: specify exactly one of 'threshold' or 'thresholdPwm'" },
  );
export type Respawn = z.infer<typeof Respawn>;

export const FlickerStepTrack = z.object({
  kind: z.literal('flickerStep'),
  _comment: z.string().optional(),
  layers: LayerList,
  lights: LightScope,
  atTick: z.number().int().min(0),
  endTick: z.union([z.number().int().positive(), z.literal('forever')]),
  alpha: z.number().min(0).max(1),
  respawn: Respawn.optional(),
});
export type FlickerStepTrack = z.infer<typeof FlickerStepTrack>;

export function flickerStepHandler(
  track: FlickerStepTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const { layers, lights, atTick, endTick, alpha, respawn } = track;
  const lightList = resolveLights(lights);
  // Per-track flicker buffer — caller-supplied so it persists across ticks.
  const flickerTargets = makeFlickerTargetBuffer();

  const respawnThreshold =
    respawn === undefined
      ? undefined
      : respawn.threshold ?? respawn.thresholdPwm! / 255;

  const tickFn = respawn
    ? () => {
        const rng = deps.rng ?? Math.random;
        if (rng() < respawn.probability) {
          const layer = Math.floor(rng() * TOWER_LAYER_COUNT);
          const light = Math.floor(rng() * LIGHTS_PER_LAYER);
          if (deps.ledAnimator.getLevel(layer, light) < respawnThreshold!) {
            const level =
              respawn.levelMin + (respawn.levelMax - respawn.levelMin) * rng();
            deps.ledAnimator.setLevel(layer, light, level, 0);
          }
        }
      }
    : () => {
        for (const layer of layers) {
          for (const light of lightList) {
            applyFlickerStep(
              deps.ledAnimator,
              layer,
              light,
              flickerTargets,
              alpha,
              deps.rng,
            );
          }
        }
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
