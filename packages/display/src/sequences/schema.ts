import { z } from 'zod';
import { Track } from './playerKinds';

/**
 * Top-level schema for data-driven sequence files (`src/sequences/data/*.json`).
 *
 * The discriminated `Track` union lives in `playerKinds/index.ts` so each
 * kind can be co-located with its handler without forcing this file to import
 * the player (which would create a schema ↔ player cycle).
 */

export { Track } from './playerKinds';
export type { Track as TrackType } from './playerKinds';

/** End-of-sequence behavior. `cutToBlack` is only valid when `loop: false`. */
export const EndBehavior = z.enum(['cutToBlack', 'hold']);
export type EndBehavior = z.infer<typeof EndBehavior>;

/**
 * Top-level sequence file. Refinement: `cutToBlack` is incoherent on a loop
 * (would zero LEDs every iteration), so reject the combo at parse time.
 */
export const Sequence = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    totalTicks: z.number().int().positive(),
    loop: z.boolean(),
    endBehavior: EndBehavior,
    tracks: z.array(Track),
  })
  .refine((s) => !(s.loop && s.endBehavior === 'cutToBlack'), {
    message:
      "endBehavior: 'cutToBlack' is incompatible with loop: true (would cut on every iteration)",
  });
export type Sequence = z.infer<typeof Sequence>;
