// Shared, `three`-free token-layout conventions for the 2D map (`renderers/map2d.ts`) and the
// 3D plugin (`plugin/index.ts`). ONE source of the slot/fan grouping so the two renderers cannot
// drift — they consume these, then each draws with its own primitive (SVG vs `THREE.Sprite`).
//
// Part of the `.` entry — MUST stay `three`-free and Display-free (the CI grep enforces it).
import type { BoardState, LocationName } from '../state/boardState';
import type { TokenSelection } from './assetPaths';

/** Max skulls drawn in a fan before the stack is capped (extra skulls are implied, not drawn). */
export const MAX_FANNED_SKULLS = 3;

/** A located, optionally-arted entry to place at an anchor slot. */
export interface LocatedEntry {
  id: string;
  location: LocationName;
  art?: string;
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
export function selectionKey(selection: TokenSelection): string {
  return `${selection.kind} ${selection.id} ${selection.location}`;
}

/** Heroes grouped by location. No hero art exists → callers always use the programmatic fallback. */
export function heroEntries(state: BoardState): Map<LocationName, LocatedEntry[]> {
  return groupByLocation(
    Object.entries(state.heroes).map(([id, h]) => ({ id, location: h.location }))
  );
}

/** Foes grouped by location. Art id = foe *type*; selection id = the instance id. */
export function foeEntries(state: BoardState): Map<LocationName, LocatedEntry[]> {
  return groupByLocation(
    Object.entries(state.foes).map(([id, f]) => ({ id, location: f.location, art: f.foe }))
  );
}

/** Space markers grouped by location (one entry per marker; art id = the marker name). */
export function markerEntries(state: BoardState): Map<LocationName, LocatedEntry[]> {
  const entries: LocatedEntry[] = [];
  for (const [loc, markers] of Object.entries(state.spaceMarkers)) {
    for (const m of markers) entries.push({ id: m, location: loc, art: m });
  }
  return groupByLocation(entries);
}
