import { z } from 'zod';
import gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import { decayLevel } from '../builders/ledMath';
import {
  LIGHTS_PER_LAYER,
  LayerIndex,
  LayerList,
  NormalizedLevel,
  PwmByte,
  TICK_S,
} from './_helpers';

/**
 * `rotationChase` — chase pattern + steady-fill layer + per-tick decay tail.
 * Mirrors firmware cases 0x0f–0x12 (rotationAllDrums + 3 single-drum
 * variants).
 *
 * Per tick (closure-captured `elapsed.ticks` increments each call):
 *  - If `steadyLayer` is set, every light on that layer is held at
 *    `steadyLevel`.
 *  - For each `chaseLayer`:
 *      phase = (elapsed + phaseOffsetTicks * chaseLayer) % periodTicks
 *      for light 0..3:
 *          if phase == lightStepTicks * light → setLevel(layer, light, 1.0)
 *          else → multiply current by decayMultiplierNum/decayMultiplierDen
 *
 * Pair with `loop: true, totalTicks: 1`, one `rotationChase` track at
 * `atTick: 0, endTick: 1`. The handler also supports `endTick: 'forever'`
 * inside a non-loop sequence by wrapping in a `repeat: -1` sub-timeline.
 */
export const RotationChaseTrack = z.object({
  kind: z.literal('rotationChase'),
  _comment: z.string().optional(),
  chaseLayers: LayerList,
  steadyLayer: LayerIndex.optional(),
  steadyLevel: NormalizedLevel.optional(),
  steadyLevelPwm: PwmByte.optional(),
  phaseOffsetTicks: z.number().int().min(0),
  lightStepTicks: z.number().int().positive(),
  decayMultiplierNum: z.number().int().positive(),
  decayMultiplierDen: z.number().int().positive(),
  periodTicks: z.number().int().positive(),
  atTick: z.number().int().min(0),
  endTick: z.union([z.number().int().positive(), z.literal('forever')]),
});
export type RotationChaseTrack = z.infer<typeof RotationChaseTrack>;

export function rotationChaseHandler(
  track: RotationChaseTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const {
    chaseLayers,
    steadyLayer,
    phaseOffsetTicks,
    lightStepTicks,
    decayMultiplierNum,
    decayMultiplierDen,
    periodTicks,
    atTick,
    endTick,
  } = track;
  const steady =
    track.steadyLevel ??
    (track.steadyLevelPwm !== undefined ? track.steadyLevelPwm / 255 : undefined);
  const elapsed = { ticks: 0 };

  const tickFn = (): void => {
    if (steadyLayer !== undefined && steady !== undefined) {
      for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
        deps.ledAnimator.setLevel(steadyLayer, light, steady, 0);
      }
    }
    for (const chaseLayer of chaseLayers) {
      const phase = (elapsed.ticks + phaseOffsetTicks * chaseLayer) % periodTicks;
      for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
        if (phase === lightStepTicks * light) {
          deps.ledAnimator.setLevel(chaseLayer, light, 1, 0);
        } else {
          const current = deps.ledAnimator.getLevel(chaseLayer, light);
          const next = decayLevel(current, decayMultiplierNum, decayMultiplierDen);
          deps.ledAnimator.setLevel(chaseLayer, light, next, 0);
        }
      }
    }
    elapsed.ticks++;
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
