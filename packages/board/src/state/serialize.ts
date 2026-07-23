import { z } from 'zod';
import type { BoardState } from './boardState';

// zod v4 (matches Display's runtime dependency; v3 -> v4 is breaking).
const placedTokenSchema = z.object({
  id: z.string(),
  typeId: z.string(),
  location: z.string(),
  spotId: z.string().optional(),
  art: z.string().optional(),
  n: z.number().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const boardStateSchema = z.object({
  tokens: z.record(z.string(), placedTokenSchema),
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

/**
 * Schema version written into the save envelope. **0.5.0 bumped this 1 -> 2** for the
 * `tokens`-collection `BoardState` — a non-backward-compatible change (see the schema
 * changelog). `loadState` rejects any other version rather than migrate; see
 * `BoardStateLoadError` and the package docs' "Old data: refuse, don't migrate" note.
 */
export const BOARD_STATE_SCHEMA_VERSION = 2 as const;

/** Thrown by `loadState` on malformed or unsupported-version input. */
export class BoardStateLoadError extends Error {
  readonly cause?: unknown;
  /** The version found in the envelope, when one could be read at all. */
  readonly foundVersion?: number;
  constructor(message: string, options?: { cause?: unknown; foundVersion?: number }) {
    super(message);
    this.name = 'BoardStateLoadError';
    this.cause = options?.cause;
    this.foundVersion = options?.foundVersion;
  }
}

/** Serialize to a JSON string: `{ version, state }`. */
export function saveState(state: BoardState): string {
  return JSON.stringify({ version: BOARD_STATE_SCHEMA_VERSION, state });
}

/**
 * Parse + validate a JSON envelope back into a `BoardState`. Throws `BoardStateLoadError`
 * on malformed input OR a version other than {@link BOARD_STATE_SCHEMA_VERSION} — there is
 * no migration path (see the package docs). The error's `foundVersion` lets a host's
 * stale-data dialog say which version it found.
 */
export function loadState(serialized: string): BoardState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (cause) {
    throw new BoardStateLoadError('Board state is not valid JSON.', { cause });
  }

  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    throw new BoardStateLoadError(
      'Board state envelope is malformed (expected { version, state }).',
      { cause: envelope.error },
    );
  }

  if (envelope.data.version !== BOARD_STATE_SCHEMA_VERSION) {
    throw new BoardStateLoadError(
      `Unsupported board state schema version: ${envelope.data.version} (this build reads ${BOARD_STATE_SCHEMA_VERSION}).`,
      { foundVersion: envelope.data.version },
    );
  }

  const result = boardStateSchema.safeParse(envelope.data.state);
  if (!result.success) {
    throw new BoardStateLoadError('Board state failed schema validation.', { cause: result.error });
  }
  return result.data;
}
