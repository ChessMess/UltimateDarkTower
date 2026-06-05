import { z } from 'zod';
import type { BoardState } from './boardState';

// zod v4 (matches Display's runtime dependency; v3 -> v4 is breaking).
const boardTokenSchema = z.object({
  id: z.string(),
  kind: z.enum(['hero', 'foe', 'adversary', 'skull', 'monument', 'spaceMarker']),
  location: z.string(),
});

const boardStateSchema = z.object({
  version: z.literal(1),
  tokens: z.array(boardTokenSchema),
  spaceMarkers: z.record(z.string(), z.array(z.string())),
});

/** Schema version written into the envelope; bump alongside `BoardState.version`. */
export const BOARD_STATE_SCHEMA_VERSION = 1 as const;

/** Validate + serialize to a JSON string. Throws (ZodError) on invalid state. */
export function saveState(state: BoardState): string {
  return JSON.stringify(boardStateSchema.parse(state));
}

/** Parse + validate a JSON string back into a `BoardState`. Throws on invalid input. */
export function loadState(serialized: string): BoardState {
  return boardStateSchema.parse(JSON.parse(serialized));
}
