import { z } from 'zod';
import type gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import { setAll } from '../builders/ledSequenceOps';
import {
  LIGHTS_PER_LAYER,
  NormalizedLevel,
  PwmByte,
  TICK_S,
  TOTAL_LEDS,
  TOWER_LAYER_COUNT,
} from './_helpers';

/**
 * `discreteSet` — at each tick in `atTicks`, perform one of three operations:
 *
 *  - `setAll`:      every LED is written to `level` (gloat chortles).
 *  - `subtractAll`: every LED's level decrements by `delta`, clamped to ≥0.
 *                   Uses an internal shadow array initialized to `from`.
 *                   Mirrors monthStarted ph2's read-modify-write.
 *  - `randomLed`:   one random (layer, light) is written to `level`.
 *                   Mirrors victory's flurry random-drop. Consumes 2 RNG
 *                   draws per tick, in (layer, light) order.
 *
 * Strict mode-vs-payload validation: the schema accepts every payload field
 * as optional and uses a `superRefine` to enforce mode-specific requirements
 * at parse time.
 */
export const DiscreteSetTrack = z
  .object({
    kind: z.literal('discreteSet'),
    _comment: z.string().optional(),
    atTicks: z.array(z.number().int().min(0)).min(1),
    mode: z.enum(['setAll', 'subtractAll', 'randomLed']),
    level: NormalizedLevel.optional(),
    levelPwm: PwmByte.optional(),
    delta: NormalizedLevel.optional(),
    deltaPwm: PwmByte.optional(),
    from: NormalizedLevel.optional(),
  })
  .superRefine((val, ctx) => {
    const eitherLevel = (val.level === undefined) !== (val.levelPwm === undefined);
    const eitherDelta = (val.delta === undefined) !== (val.deltaPwm === undefined);
    if (val.mode === 'setAll' || val.mode === 'randomLed') {
      if (!eitherLevel) {
        ctx.addIssue({
          code: 'custom',
          message: `discreteSet mode '${val.mode}': specify exactly one of 'level' or 'levelPwm'`,
        });
      }
    } else if (val.mode === 'subtractAll') {
      if (!eitherDelta) {
        ctx.addIssue({
          code: 'custom',
          message: "discreteSet mode 'subtractAll': specify exactly one of 'delta' or 'deltaPwm'",
        });
      }
      if (val.from === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: "discreteSet mode 'subtractAll': 'from' is required (initial shadow level)",
        });
      }
    }
  });
export type DiscreteSetTrack = z.infer<typeof DiscreteSetTrack>;

export function discreteSetHandler(
  track: DiscreteSetTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const { atTicks, mode } = track;

  if (mode === 'setAll') {
    const level = track.level ?? track.levelPwm! / 255;
    for (const tick of atTicks) {
      tl.call(() => setAll(deps.ledAnimator, level), undefined, tick * TICK_S);
    }
    return;
  }

  if (mode === 'subtractAll') {
    const delta = track.delta ?? track.deltaPwm! / 255;
    const from = track.from!;
    // Shadow array allocated per timeline build — matches the read-modify-write
    // semantics in [monthStarted.ts:62-81] which uses a private `levels` array
    // initialized to the post-phase-1 starting state.
    const levels = new Array<number>(TOTAL_LEDS).fill(from);
    for (const tick of atTicks) {
      tl.call(
        () => {
          for (let layer = 0; layer < TOWER_LAYER_COUNT; layer++) {
            for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
              const idx = layer * LIGHTS_PER_LAYER + light;
              const next = Math.max(0, levels[idx] - delta);
              levels[idx] = next;
              deps.ledAnimator.setLevel(layer, light, next, 0);
            }
          }
        },
        undefined,
        tick * TICK_S,
      );
    }
    return;
  }

  // mode === 'randomLed'
  const level = track.level ?? track.levelPwm! / 255;
  for (const tick of atTicks) {
    tl.call(
      () => {
        const rng = deps.rng ?? Math.random;
        const layer = Math.floor(rng() * TOWER_LAYER_COUNT);
        const light = Math.floor(rng() * LIGHTS_PER_LAYER);
        deps.ledAnimator.setLevel(layer, light, level, 0);
      },
      undefined,
      tick * TICK_S,
    );
  }
}
