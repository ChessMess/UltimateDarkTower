import { z } from 'zod';
import type { BoardState, FoeStatus } from './boardState';
import { FOE_STATUSES } from '../data/udtReexports';

// zod v4 (matches Display's runtime dependency; v3 -> v4 is breaking).
const heroTokenSchema = z.object({
  location: z.string(),
  owner: z.enum(['north', 'south', 'east', 'west']).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// Sourced from UDT's `FOE_STATUSES` (not hand-listed) so this stays in sync as the
// ready→savage→lethal progression gains members (e.g. panicked/unsteady in UDT v5).
const foeTokenSchema = z.object({
  foe: z.string(),
  location: z.string(),
  status: z.enum(FOE_STATUSES as [FoeStatus, ...FoeStatus[]]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const buildingStateSchema = z.object({
  skulls: z.number(),
  destroyed: z.boolean(),
  monument: z.string().nullable().optional(),
});

const boardStateSchema = z.object({
  heroes: z.record(z.string(), heroTokenSchema),
  foes: z.record(z.string(), foeTokenSchema),
  adversary: z.object({ id: z.string(), location: z.string().optional() }).optional(),
  buildings: z.record(z.string(), buildingStateSchema),
  spaceMarkers: z.record(z.string(), z.array(z.string())),
  // Additive since v1: older saves omit it, so default to `{}` rather than requiring it (no version bump).
  questMarkers: z.record(z.string(), z.array(z.string())).default({}),
  selections: z
    .object({
      difficulty: z.string().optional(),
      adversary: z.string().optional(),
      allies: z.array(z.string()).optional(),
      foes: z.array(z.string()).optional(),
      expansions: z.array(z.string()).optional(),
    })
    .optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const envelopeSchema = z.object({ version: z.number(), state: z.unknown() });

/** Schema version written into the save envelope. Keep this name stable. */
export const BOARD_STATE_SCHEMA_VERSION = 1 as const;

/** Thrown by `loadState` on malformed input — the one place an exception is appropriate. */
export class BoardStateLoadError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'BoardStateLoadError';
    this.cause = cause;
  }
}

/** Serialize to a JSON string: `{ version, state }`. */
export function saveState(state: BoardState): string {
  return JSON.stringify({ version: BOARD_STATE_SCHEMA_VERSION, state });
}

/**
 * Parse + validate a JSON envelope back into a `BoardState`, running version
 * migrations on the way. Throws `BoardStateLoadError` on any malformed input.
 */
export function loadState(serialized: string): BoardState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (cause) {
    throw new BoardStateLoadError('Board state is not valid JSON.', cause);
  }

  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    throw new BoardStateLoadError(
      'Board state envelope is malformed (expected { version, state }).',
      envelope.error,
    );
  }

  const migrated = migrate(envelope.data.version, envelope.data.state);

  const result = boardStateSchema.safeParse(migrated);
  if (!result.success) {
    throw new BoardStateLoadError('Board state failed schema validation.', result.error);
  }
  return result.data;
}

/**
 * Migration hook. At v1 there is nothing to migrate; older versions would be
 * upgraded here as the schema evolves. Unknown versions are rejected.
 */
function migrate(version: number, state: unknown): unknown {
  switch (version) {
    case BOARD_STATE_SCHEMA_VERSION:
      return state;
    default:
      throw new BoardStateLoadError(`Unsupported board state schema version: ${version}`);
  }
}
