import type { BoardState, LocationName, PlacedToken } from './boardState';

/**
 * The command vocabulary the reducer understands — the *only* mutations. A
 * discriminated union on `type`. Commands are faithful instructions: the reducer
 * applies them as-is and enforces no game rules (the board is a dumb container).
 *
 * Five generic, id-keyed ops replace the pre-0.5.0 per-kind command set (`placeHero`,
 * `spawnFoe`, `setSpaceMarker`, …) now that `BoardState` is one `tokens` collection.
 * Those higher-level names survive as `BoardStateController` convenience methods
 * (`state/controller.ts`), reimplemented over these five — see the class doc there for
 * the per-kind id/art conventions (deterministic ids for skull/monument/marker/quest
 * tokens, the `adversary` singleton, …).
 */
export type BoardCommand =
  | {
      type: 'placeToken';
      id: string;
      typeId: string;
      location: LocationName;
      spotId?: string;
      art?: string;
      n?: number;
      data?: Record<string, unknown>;
    }
  | { type: 'moveToken'; id: string; location: LocationName }
  | { type: 'removeToken'; id: string }
  | {
      type: 'updateToken';
      id: string;
      patch: Partial<Pick<PlacedToken, 'location' | 'spotId' | 'art' | 'n' | 'data'>>;
    }
  | { type: 'setSelections'; selections: BoardState['selections'] } // shallow-merge
  | { type: 'replaceState'; state: BoardState }
  | { type: 'reset' };

export type BoardCommandType = BoardCommand['type'];
