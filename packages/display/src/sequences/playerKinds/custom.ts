import { z } from 'zod';

/**
 * `custom` — escape hatch for sequences that don't fit any data-driven kind.
 * `handlerId` resolves at build time against a TS-side registry the player
 * consults via `registerCustomHandler`. If missing, the player logs a
 * warning and skips the track.
 *
 * No customs are registered initially — the nine data-driven kinds cover
 * every current sequence. Kept for forward compatibility.
 */
export const CustomTrack = z.object({
  kind: z.literal('custom'),
  _comment: z.string().optional(),
  handlerId: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type CustomTrack = z.infer<typeof CustomTrack>;
