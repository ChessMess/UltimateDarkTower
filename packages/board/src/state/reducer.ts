import type { BoardState, PlacedToken, LocationName } from './boardState';
import { createDefaultBoardState } from './boardState';
import { BOARD_LOCATION_BY_NAME } from '../data/udtReexports';
import type { BoardCommand } from './commands';

/**
 * In dev, warn (never throw) when a command targets a location that isn't on the
 * board. This is an aid, not a rule — the command still applies faithfully.
 */
function warnUnknownLocation(location: LocationName): void {
  if (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production' &&
    !(location in BOARD_LOCATION_BY_NAME)
  ) {
    console.warn(`[ultimatedarktowerboard] command targets unknown location: "${location}"`);
  }
}

/**
 * Pure reducer: `(state, command) -> nextState`. Never mutates `state`, has no
 * side effects, and performs **no validation or clamping** (the board is a dumb
 * container) — not even against a spot's `accepts`, which is advisory (Creator-time
 * warning / L2 error) and never enforced here. `placeToken` upserts unconditionally;
 * `moveToken`/`removeToken`/`updateToken` no-op on an unknown id rather than throw.
 */
export function applyBoardCommand(state: BoardState, command: BoardCommand): BoardState {
  switch (command.type) {
    case 'placeToken': {
      warnUnknownLocation(command.location);
      const { id, typeId, location, spotId, art, n, data } = command;
      const token: PlacedToken = { id, typeId, location };
      if (spotId !== undefined) token.spotId = spotId;
      if (art !== undefined) token.art = art;
      if (n !== undefined) token.n = n;
      if (data !== undefined) token.data = data;
      return { ...state, tokens: { ...state.tokens, [id]: token } };
    }

    case 'moveToken': {
      const token = state.tokens[command.id];
      if (!token) return state;
      warnUnknownLocation(command.location);
      // A spot pin is location-scoped ("unique within the location") — moving drops it so a
      // stale spotId from the old location doesn't silently mis-resolve at the new one.
      const { spotId: _dropped, ...rest } = token;
      return {
        ...state,
        tokens: { ...state.tokens, [command.id]: { ...rest, location: command.location } },
      };
    }

    case 'removeToken': {
      if (!(command.id in state.tokens)) return state;
      const tokens = { ...state.tokens };
      delete tokens[command.id];
      return { ...state, tokens };
    }

    case 'updateToken': {
      const token = state.tokens[command.id];
      if (!token) return state;
      const { patch } = command;
      const next: PlacedToken = { ...token };
      if (patch.location !== undefined && patch.location !== token.location) {
        next.location = patch.location;
        // Same invariant as `moveToken`: a spot pin is location-scoped, so relocating drops
        // a stale one unless this same patch also supplies an explicit replacement (below).
        delete next.spotId;
      }
      if (patch.spotId !== undefined) next.spotId = patch.spotId;
      if (patch.art !== undefined) next.art = patch.art;
      if (patch.n !== undefined) next.n = patch.n;
      if (patch.data !== undefined) next.data = { ...token.data, ...patch.data };
      return { ...state, tokens: { ...state.tokens, [command.id]: next } };
    }

    case 'setSelections':
      return { ...state, selections: { ...state.selections, ...command.selections } };

    case 'replaceState':
      return command.state;

    case 'reset':
      // Bug-compatible with pre-0.5.0: always reseeds the built-in RtDT board's building set,
      // even if this controller was constructed against a custom `board` — not something this
      // refactor changes.
      return createDefaultBoardState();

    default:
      return state;
  }
}
