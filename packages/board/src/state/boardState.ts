import type { BoardDefinition } from '../data/boardDefinition';
import { resolveBoard } from '../data/boardDefinition';

/** A `BOARD_LOCATIONS[n].name`. Kept as a string — the board never validates it. */
export type LocationName = string;

/**
 * In-play foe power progression (panicked → unsteady → ready → savage → lethal). Re-exported
 * from UDT (`ultimatedarktower`) so this stays the single source of truth; importers keep
 * getting it from `'../state/boardState'`.
 */
export type { FoeStatus } from '../data/udtReexports';

/**
 * Built-in type ids usable in a spot's `accepts`, or as a token's `typeId`, with no
 * `library.tokenTypes` registry entry. Re-exported from game-data so schema/L2/Creator/board
 * all check the same list.
 */
export type { ReservedTokenType } from '../data/udtReexports';
export { RESERVED_TOKEN_TYPES } from '../data/udtReexports';

/**
 * One placed thing. The whole of {@link BoardState} is a map of these, keyed by instance id
 * (not by location) so move/remove stay O(1).
 *
 * `typeId` is either a {@link ReservedTokenType} (`hero`/`foe`/`adversary`/`building`/`skull`/
 * `monument`/`marker`/`quest` — the built-in RtDT vocabulary every consumer understands
 * natively) or a `library.tokenTypes` key an author defined. `art` is the id a renderer
 * resolves for its image (a foe *type*, a hero's own id, a marker/quest name, a monument's
 * id, …); it defaults to `typeId` when absent, which is correct for a custom author-defined
 * type (exactly one art per type) but NOT for the built-in kinds that cover many distinct
 * game entities under one shared `typeId` — those callers set `art` explicitly.
 */
export interface PlacedToken {
  /** Instance id, unique on the whole board (not just within a location). */
  id: string;
  typeId: string;
  location: LocationName;
  /** Explicit target spot; when absent, resolved via the board's spot `accepts` lists. */
  spotId?: string;
  /** Art id for image resolution. Defaults to `typeId` when absent — see the class doc. */
  art?: string;
  /** Count for stackable types (skulls). Absent means 1; not consulted for non-stackable types. */
  n?: number;
  /** Per-type extras: status, owner, destroyed, … */
  data?: Record<string, unknown>;
}

/**
 * The full board state — a dumb container. It stores what it is told and enforces
 * no game rules; renderers read it and hosts own the rules.
 *
 * All values are plain, JSON-serializable data (no class instances, no `Map`/`Set`,
 * no functions), so state round-trips through JSON cleanly. The schema version is
 * not stored here — it lives in the save envelope (see `serialize.ts`).
 */
export interface BoardState {
  /** Every placed token on the board, keyed by instance id. */
  tokens: Record<string, PlacedToken>;
  /** Game-setup selections (free-form; the board does not interpret them). */
  selections?: {
    difficulty?: string;
    adversary?: string;
    allies?: string[];
    foes?: string[];
    expansions?: string[];
  };
  /** Escape hatch for host-specific data. */
  meta?: Record<string, unknown>;
}

/** Deterministic id for the always-one-per-location building/skull tokens a spot seeds. */
export function buildingTokenId(location: LocationName): string {
  return location;
}
export function skullTokenId(location: LocationName): string {
  return `skull:${location}`;
}
export function monumentTokenId(location: LocationName): string {
  return `monument:${location}`;
}
export function markerTokenId(location: LocationName, marker: string): string {
  return `marker:${location}:${marker}`;
}
export function questTokenId(location: LocationName, marker: string): string {
  return `quest:${location}:${marker}`;
}
/** Singleton instance id for the (at most one) adversary token. */
export const ADVERSARY_TOKEN_ID = 'adversary';

/**
 * An empty board: no tokens, save for a `building` + `skull` token pair seeded at
 * `{destroyed: false}` / `{n: 0}` for every building space — mirroring the pre-refactor
 * `buildings` bucket, which was always dense (every building location present) while
 * markers/quests were sparse (created only once set). Seeding the skull token too (rather
 * than creating it lazily) means renderers/selectors need no exists-vs-absent branch: a
 * count of 0 renders nothing either way.
 *
 * `board` selects which board's locations to seed from; omit it for the built-in
 * Return to Dark Tower board (its 16 building spaces).
 */
export function createDefaultBoardState(board?: BoardDefinition): BoardState {
  const tokens: Record<string, PlacedToken> = {};
  for (const location of resolveBoard(board).buildingLocations) {
    tokens[buildingTokenId(location)] = {
      id: buildingTokenId(location),
      typeId: 'building',
      location,
      data: { destroyed: false },
    };
    tokens[skullTokenId(location)] = {
      id: skullTokenId(location),
      typeId: 'skull',
      location,
      n: 0,
    };
  }
  return { tokens };
}
