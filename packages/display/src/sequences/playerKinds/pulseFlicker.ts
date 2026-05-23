import { z } from 'zod';
import type gsap from 'gsap';
import type { SequenceAnimatorDeps } from '../builders/types';
import {
  LIGHTS_PER_LAYER,
  LayerList,
  NormalizedLevel,
  PwmByte,
  TICK_S,
  exactlyOne,
} from './_helpers';

/**
 * `pulseFlicker` — sealReveal-specific (firmware case 0x0e ph1+2).
 *
 * Allocates one slot per LED in `scope`, in canonical layer-major-light-minor
 * order: `{ layer, light, delay, level }`. For each tick `t` in
 * `[atTick, endTick)`:
 *
 *  - If `t - atTick` matches a `reseed[i].atTick`, iterate slots in canonical
 *    order and assign `slot.delay = magnitude * (floor(rng()*12) + 4)`. No
 *    LED writes on a reseed tick. Consumes 1 RNG draw per slot.
 *
 *  - Otherwise, iterate slots in canonical order: if
 *    `slot.delay > 0 && (t - atTick) % slot.delay === 0`, set
 *    `slot.level = pulseLevel`; else `slot.level *= decayPerTick`. Then
 *    `setLevel(slot.layer, slot.light, slot.level)`.
 *
 * The phase-3 "solid hold at pulseLevel" portion of sealReveal is encoded
 * separately as a `solid` track at `[60, 91)`.
 */
const ReseedEvent = z.object({
  atTick: z.number().int().min(0),
  magnitude: z.number().int().positive(),
});

export const PulseFlickerTrack = z
  .object({
    kind: z.literal('pulseFlicker'),
    _comment: z.string().optional(),
    layers: LayerList,
    atTick: z.number().int().min(0),
    endTick: z.number().int().positive(),
    pulseLevel: NormalizedLevel.optional(),
    pulseLevelPwm: PwmByte.optional(),
    decayPerTick: z.number().min(0).max(1),
    reseed: z.array(ReseedEvent),
  })
  .refine(exactlyOne('pulseLevel', 'pulseLevelPwm'), {
    message: "pulseFlicker: specify exactly one of 'pulseLevel' or 'pulseLevelPwm'",
  });
export type PulseFlickerTrack = z.infer<typeof PulseFlickerTrack>;

interface Slot {
  readonly layer: number;
  readonly light: number;
  delay: number;
  level: number;
}

export function pulseFlickerHandler(
  track: PulseFlickerTrack,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
): void {
  const { layers, atTick, endTick, decayPerTick, reseed } = track;
  const pulseLevel = track.pulseLevel ?? track.pulseLevelPwm! / 255;

  // Slots constructed layer-major-light-minor — matches sealReveal.ts:33-37.
  const slots: Slot[] = [];
  for (const layer of layers) {
    for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
      slots.push({ layer, light, delay: 0, level: 0 });
    }
  }

  // Reseed lookup keyed by relative tick (offset from atTick).
  const reseedByOffset = new Map<number, number>();
  for (const r of reseed) reseedByOffset.set(r.atTick, r.magnitude);

  for (let tick = atTick; tick < endTick; tick++) {
    const t = tick;
    tl.call(
      () => {
        const relative = t - atTick;
        const reseedMagnitude = reseedByOffset.get(relative);
        if (reseedMagnitude !== undefined) {
          const rng = deps.rng ?? Math.random;
          for (const slot of slots) {
            slot.delay = reseedMagnitude * (Math.floor(rng() * 12) + 4);
          }
          return;
        }
        for (const slot of slots) {
          if (slot.delay > 0 && relative % slot.delay === 0) {
            slot.level = pulseLevel;
          } else {
            slot.level *= decayPerTick;
          }
          deps.ledAnimator.setLevel(slot.layer, slot.light, slot.level, 0);
        }
      },
      undefined,
      tick * TICK_S,
    );
  }
}
