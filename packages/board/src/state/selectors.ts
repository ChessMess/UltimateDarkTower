// Read helpers over the unified `tokens` collection — the replacement for the pre-0.5.0
// bucket properties (`state.heroes`, `state.buildings`, …), which no longer exist. Every
// consumer that used to read a bucket directly now goes through one of these.
import type { BoardState, LocationName, PlacedToken } from './boardState';
import { ADVERSARY_TOKEN_ID, buildingTokenId, monumentTokenId, skullTokenId } from './boardState';

/** Every token at `location`, in insertion order. */
export function tokensAt(state: BoardState, location: LocationName): PlacedToken[] {
  const out: PlacedToken[] = [];
  for (const token of Object.values(state.tokens)) {
    if (token.location === location) out.push(token);
  }
  return out;
}

/** Every token of `typeId`, in insertion order. */
export function tokensOfType(state: BoardState, typeId: string): PlacedToken[] {
  const out: PlacedToken[] = [];
  for (const token of Object.values(state.tokens)) {
    if (token.typeId === typeId) out.push(token);
  }
  return out;
}

/** Every placed hero. */
export function heroesOf(state: BoardState): PlacedToken[] {
  return tokensOfType(state, 'hero');
}

/** Every placed foe. */
export function foesOf(state: BoardState): PlacedToken[] {
  return tokensOfType(state, 'foe');
}

/**
 * The selected/placed adversary, or `undefined` if none has been selected. Mirrors the
 * pre-0.5.0 `state.adversary?: {id, location?}` shape read-only; `location` is omitted while
 * the adversary is selected but not yet placed (the internal `''` sentinel).
 */
export function adversaryOf(
  state: BoardState,
): { id: string; location?: LocationName } | undefined {
  const token = state.tokens[ADVERSARY_TOKEN_ID];
  if (!token) return undefined;
  const id = token.art ?? '';
  return token.location ? { id, location: token.location } : { id };
}

/** The building at `location` — `{destroyed: false}` if no building token was ever placed there. */
export function buildingAt(state: BoardState, location: LocationName): { destroyed: boolean } {
  const token = state.tokens[buildingTokenId(location)];
  return { destroyed: Boolean(token?.data?.destroyed) };
}

/** Skull count at `location` (0 if none placed). */
export function skullsAt(state: BoardState, location: LocationName): number {
  return state.tokens[skullTokenId(location)]?.n ?? 0;
}

/** The monument id at `location`, or `undefined` if none is placed. */
export function monumentAt(state: BoardState, location: LocationName): string | undefined {
  return state.tokens[monumentTokenId(location)]?.art;
}

/** Space-marker names present at `location` (empty if none). */
export function markersAt(state: BoardState, location: LocationName): string[] {
  return tokensAt(state, location)
    .filter((t) => t.typeId === 'marker')
    .map((t) => t.art ?? t.id);
}

/** Quest-marker names present at `location` (empty if none). */
export function questsAt(state: BoardState, location: LocationName): string[] {
  return tokensAt(state, location)
    .filter((t) => t.typeId === 'quest')
    .map((t) => t.art ?? t.id);
}
