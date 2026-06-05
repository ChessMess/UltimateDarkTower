import type { BoardLocation } from '../data/udtReexports';

/** Cardinal board sides (kingdoms). */
export type BoardSide = 'north' | 'east' | 'south' | 'west';

/** A token placed at a board location. */
export type BoardTokenKind =
  | 'hero'
  | 'foe'
  | 'adversary'
  | 'skull'
  | 'monument'
  | 'spaceMarker';

export interface BoardToken {
  /** Stable id (host-assigned). */
  id: string;
  kind: BoardTokenKind;
  /** A `BOARD_LOCATIONS[n].name`. */
  location: BoardLocation['name'];
}

/**
 * The full board state. Owns no game rules — it stores, and the renderers read.
 *
 * `spaceMarkers` is the generalized form chosen over a `blighted`-only field
 * (spec §12-Q6), keyed by location name -> marker ids, so all-expansions space
 * effects fit without a schema change.
 */
export interface BoardState {
  version: 1;
  tokens: BoardToken[];
  spaceMarkers: Record<string, string[]>;
}

export function createDefaultBoardState(): BoardState {
  return { version: 1, tokens: [], spaceMarkers: {} };
}
