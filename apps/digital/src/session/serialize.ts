/**
 * Serialize / deserialize the single `GameSession` object (FR-04.5, FR-04.6).
 *
 * Serialization is plain JSON. Deserialization validates the envelope and the
 * `schemaVersion` and shape before trusting it, throwing `GameSessionLoadError`
 * on anything malformed or incompatible — never returning a half-valid game.
 *
 * MVP policy is reject-only on version mismatch (no migrators yet; see PRD-04).
 */
import { GAME_SESSION_SCHEMA_VERSION, type GameSession } from './types';

export class GameSessionLoadError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'GameSessionLoadError';
    this.cause = cause;
  }
}

/** Deep-clone so a snapshot is decoupled from any live, mutable source state. */
export function cloneSession(session: GameSession): GameSession {
  return structuredClone(session);
}

/** `GameSession` → pretty JSON string. Pure: does not mutate the input. */
export function serializeSession(session: GameSession): string {
  return JSON.stringify(session, null, 2);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse + validate a JSON string back into a `GameSession`.
 * Throws `GameSessionLoadError` on malformed JSON, wrong schema version, or missing shape.
 */
export function deserializeSession(json: string): GameSession {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new GameSessionLoadError('Not valid JSON.', err);
  }

  if (!isObject(parsed)) {
    throw new GameSessionLoadError('Session must be a JSON object.');
  }

  const version = parsed.schemaVersion;
  if (typeof version !== 'number') {
    throw new GameSessionLoadError('Missing or invalid "schemaVersion".');
  }
  if (version !== GAME_SESSION_SCHEMA_VERSION) {
    throw new GameSessionLoadError(
      `Incompatible save version ${version}; this app reads version ${GAME_SESSION_SCHEMA_VERSION}.`,
    );
  }

  // Structural checks — enough to fail fast on the wrong kind of file, not a full schema.
  for (const key of ['meta', 'config', 'progress', 'tower', 'board'] as const) {
    if (!isObject(parsed[key])) {
      throw new GameSessionLoadError(`Missing or invalid "${key}" section.`);
    }
  }
  const tower = parsed.tower as Record<string, unknown>;
  if (!isObject(tower.state)) {
    throw new GameSessionLoadError('Missing tower state.');
  }
  if (!Array.isArray(tower.brokenSeals)) {
    throw new GameSessionLoadError('Missing tower brokenSeals.');
  }
  if (!Array.isArray(parsed.playerBoards)) {
    throw new GameSessionLoadError('Missing or invalid "playerBoards".');
  }

  return parsed as unknown as GameSession;
}
