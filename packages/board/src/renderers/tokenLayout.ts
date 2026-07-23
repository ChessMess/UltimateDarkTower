// Shared, `three`-free token-layout conventions for the 2D map (`renderers/map2d.ts`) and the
// 3D plugin (`plugin/index.ts`). ONE source of the grouping/fan conventions so the two renderers
// cannot drift — they consume these, then each draws with its own primitive (SVG vs `THREE.Sprite`).
//
// Part of the `.` entry — MUST stay `three`-free and Display-free (the CI grep enforces it).
import type { BoardState, LocationName } from '../state/boardState';
import { RESERVED_TOKEN_TYPES } from '../state/boardState';

/** Max skulls drawn in a fan before the stack is capped (extra skulls are implied, not drawn). */
export const MAX_FANNED_SKULLS = 3;

/** A located, optionally-arted entry to place at a resolved spot. */
export interface LocatedEntry {
  id: string;
  location: LocationName;
  art?: string;
  /** Explicit target spot, if the token carried one — see `data/boardDefinition.ts#resolveSpot`. */
  spotId?: string;
  /** Count, for a stackable type (skulls). */
  n?: number;
}

/** A radial fan offset. The 2D map uses `{dx,dy}` directly; the plugin maps it to `Vector3(dx,0,dy)`. */
export interface FanOffset {
  dx: number;
  dy: number;
}

/** Group entries by location, preserving insertion order within each location. */
export function groupByLocation(entries: LocatedEntry[]): Map<LocationName, LocatedEntry[]> {
  const map = new Map<LocationName, LocatedEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.location);
    if (list) list.push(entry);
    else map.set(entry.location, [entry]);
  }
  return map;
}

/** Radial fan offset for entry `index` of `count` at `radius`. A lone entry is centered. */
export function fanOffset(index: number, count: number, radius: number): FanOffset {
  if (count <= 1) return { dx: 0, dy: 0 };
  const angle = (2 * Math.PI * index) / count;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}

/** Stable per-token key (kind/id/location) for selection matching within a renderer. */
export function selectionKey(selection: {
  kind: string;
  id: string;
  location: LocationName;
}): string {
  return `${selection.kind} ${selection.id} ${selection.location}`;
}

/** Every placed token of `typeId`, as located entries ready for `groupByLocation`. */
export function tokensOfKind(state: BoardState, typeId: string): LocatedEntry[] {
  const entries: LocatedEntry[] = [];
  for (const token of Object.values(state.tokens)) {
    if (token.typeId !== typeId) continue;
    entries.push({
      id: token.id,
      location: token.location,
      art: token.art,
      spotId: token.spotId,
      n: token.n,
    });
  }
  return entries;
}

/**
 * Every type id actually present on the board that ISN'T one of the reserved kinds a
 * renderer already draws its own dedicated layer for — the custom/author-defined types a
 * renderer's generic fallback layer needs to cover.
 */
export function customTokenKindsPresent(state: BoardState): string[] {
  const reserved = new Set<string>(RESERVED_TOKEN_TYPES);
  const seen = new Set<string>();
  for (const token of Object.values(state.tokens)) {
    if (!reserved.has(token.typeId)) seen.add(token.typeId);
  }
  return [...seen];
}
