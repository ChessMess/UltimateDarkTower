// Board Designer — shared types + pure helpers. Mirrors `../dungeons/shared.ts`.
//
// The `Board` types here mirror `$defs/boardDef` in the scenario schema (0.4.6); keep them in
// step with it. Styling/limit helpers are reused from the dungeon module rather than re-declared.

import { isBuiltinBoardImageRef } from '@udtc/adapters';
import type { ScenarioDoc } from '../types';
import { resolveImage } from '../dungeons/shared';

export { imagesOf, resolveImage } from '../dungeons/shared';
export { byteLen, IMAGE_BUDGET_BYTES } from '../utils/budget';
export {
  inputStyle,
  smallBtn,
  primaryBtn,
  dangerBtn,
  dangerIconBtn,
  labelStyle,
} from '../dungeons/shared';

export const ID_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export const KINGDOMS = ['north', 'south', 'east', 'west'] as const;
export type Kingdom = (typeof KINGDOMS)[number];

/** Kingdom → colour. The map fills anchors with it and the locations list dots each row. */
export const KINGDOM_COLOR: Record<string, string> = {
  north: '#60a5fa',
  east: '#facc15',
  south: '#4ade80',
  west: '#f87171',
};

/**
 * RtDT's own four buildings — suggestions only since schema 0.4.7, exactly like
 * {@link TERRAIN_SUGGESTIONS}. `building` is an open `$defs/id` and `library.buildingTypes` is an
 * open registry, so these carry no special status beyond being what a cloned RtDT board uses (and
 * 'citadel' being setup's hero-start fallback when no type claims `heroStart`).
 */
export const BUILDING_TYPES = ['bazaar', 'citadel', 'sanctuary', 'village'] as const;

/** A building type id — the `library.buildingTypes` key. Open; see {@link BUILDING_TYPES}. */
export type BuildingType = string;

/** RtDT's own six terrains — suggestions only; `terrain` is an open string in the schema. */
export const TERRAIN_SUGGESTIONS = [
  'Hills',
  'Lake',
  'Desert',
  'Mountains',
  'Grasslands',
  'Forest',
] as const;

/** The five anchor slots, in UI order — `hero` leads because it is the default `activeSlot` and
 *  the point `locationPoint` treats as a location's position. The order is presentation only:
 *  JSON keys are unordered, so the schema mirror ($defs/boardDef.anchors) is unaffected. */
/**
 * Every terrain the picker offers: RtDT's six, then any OTHER value this board already uses.
 *
 * `terrain` is an open string in the schema, so a custom board's own vocabulary has to survive
 * — and once one location uses it, the rest can pick it from the list rather than retyping it.
 * (This replaced a `<datalist>`, which browsers filter against whatever is already in the input:
 * a location sitting on "Grasslands" was offered exactly one suggestion, "Grasslands".)
 */
export function terrainChoices(board: Board): string[] {
  const all = new Set<string>(TERRAIN_SUGGESTIONS);
  for (const loc of board.locations) {
    const t = loc.terrain.trim();
    if (t) all.add(t);
  }
  return [...all].sort((a, b) => a.localeCompare(b));
}

/** A `library.buildingTypes` entry — the rules a building carries. Mirrors `$defs/buildingTypeDef`. */
export type BuildingTypeDef = {
  name?: string;
  heroStart?: boolean;
  skullCapacity?: number;
  destroyOnSkull?: number;
  free?: unknown[];
  enhanced?: { cost?: { resource?: string; amount?: number }; effects?: unknown[] };
};

/** The scenario's building-type registry (schema 0.4.7 `library.buildingTypes`). */
export function buildingTypesOf(doc: ScenarioDoc | null): Record<string, BuildingTypeDef> {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  return (lib.buildingTypes as Record<string, BuildingTypeDef> | undefined) ?? {};
}

/**
 * Every building type the picker offers: the ones this scenario DEFINES, plus any other value
 * this board already uses. RtDT's four are added only as a fallback, when no registry is
 * authored — otherwise the registry IS the vocabulary.
 *
 * The terrain twin ({@link terrainChoices}) — but sourced from the library, because unlike terrain
 * a building is a rules object: the defined types are the ones that actually do something at play,
 * and L2 rejects a `building` naming anything else once the registry exists. Offering
 * {@link BUILDING_TYPES} unconditionally therefore hands the author a choice that fails export —
 * an author who deleted `bazaar` would still be offered it. Values already on the board stay
 * listed either way, so the picker can always show what a location currently holds.
 */
export function buildingChoices(doc: ScenarioDoc | null, board: Board): string[] {
  const defined = Object.keys(buildingTypesOf(doc));
  const all = new Set<string>(defined.length > 0 ? defined : BUILDING_TYPES);
  for (const loc of board.locations) {
    const b = loc.building?.trim();
    if (b) all.add(b);
  }
  return [...all].sort((a, b) => a.localeCompare(b));
}

/** A type's display label: its authored `name`, else the id itself. */
export function buildingLabel(types: Record<string, BuildingTypeDef>, id: string): string {
  return types[id]?.name?.trim() || id;
}

/**
 * The building types a hero may start on — the editor's mirror of the engine's `heroStartTypes`
 * (`packages/creator-engine/src/engine/setup.ts`). `null` means "no type claims the flag", which
 * is the engine's signal to fall back to the literal type 'citadel'.
 */
export function heroStartTypes(types: Record<string, BuildingTypeDef>): Set<string> | null {
  const flagged = new Set<string>();
  for (const [id, def] of Object.entries(types)) {
    if (def?.heroStart) flagged.add(id.toLowerCase());
  }
  return flagged.size > 0 ? flagged : null;
}

/** True when a location's building would place a hero — the flag, or 'citadel' as the fallback. */
export function isHeroStartBuilding(
  types: Record<string, BuildingTypeDef>,
  building: string | undefined,
): boolean {
  if (!building) return false;
  const flagged = heroStartTypes(types);
  const b = building.toLowerCase();
  return flagged ? flagged.has(b) : b === 'citadel';
}

export const ANCHOR_SLOTS = ['hero', 'building', 'foe', 'skull', 'marker'] as const;
export type AnchorSlot = (typeof ANCHOR_SLOTS)[number];

export type AnchorPoint = { x: number; y: number };
export type LocationAnchors = Partial<Record<AnchorSlot, AnchorPoint>>;

export type BoardLocation = {
  name: string;
  kingdom: Kingdom;
  terrain: string;
  building?: BuildingType;
};

export type BoardImageInfo = {
  width: number;
  height: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  northHeadingDegrees?: number;
};

export type Board = {
  id: string;
  name: string;
  imageRef?: string;
  imageInfo: BoardImageInfo;
  locations: BoardLocation[];
  anchors?: Record<string, LocationAnchors>;
  adjacency?: Record<string, string[]>;
};

/** Board art caps. Larger than decks (750×1050/250KB) and dungeons (1024×1024/400KB) — a board is
 *  the one image a player stares at — but `library.boards` is a MAP, and every board's art shares
 *  one {@link IMAGE_BUDGET_BYTES} export-size budget. {@link boardArtBytes} feeds the Asset meter. */
export const BOARD_IMAGE_OPTS = { maxW: 2048, maxH: 2048, capBytes: 1_500_000 } as const;

export function boardsOf(doc: ScenarioDoc | null): Record<string, Board> {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  return (lib.boards as Record<string, Board> | undefined) ?? {};
}

/**
 * The active custom board's id, or `null` for the implicit built-in RtDT board.
 * `doc.setup` is `Record<string, unknown>`, so this narrows rather than dot-accessing.
 */
export function activeBoardId(doc: ScenarioDoc | null): string | null {
  const setup = doc?.setup as Record<string, unknown> | undefined;
  const board = setup?.board;
  if (board === null || typeof board !== 'object' || Array.isArray(board)) return null;
  const ref = (board as Record<string, unknown>).boardRef;
  return typeof ref === 'string' ? ref : null;
}

/** Total bytes of board art in the doc — the Board Designer's slice of the shared image budget. */
export function boardArtBytes(doc: ScenarioDoc | null): number {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  const resources = lib.resources as Record<string, unknown> | undefined;
  const images = (resources?.images as Record<string, string> | undefined) ?? {};
  let total = 0;
  for (const [key, uri] of Object.entries(images)) {
    if (key.startsWith('board-') && typeof uri === 'string') total += uri.length;
  }
  return total;
}

/** The resource key a board's art is stored under. */
export const boardImageKey = (boardId: string): string => `board-${boardId}`;

/**
 * The Creator's own copy of the RtDT board art — a downscaled 1400² backdrop for the designer
 * canvas, NOT the shipped 4096² art (which the Player serves for play). Anchors are normalized
 * `[0,1]` and the canvas stretches the image to `imageInfo.width/height`, so a smaller backdrop
 * annotates identically to the full-resolution board.
 */
export const BUILTIN_BOARD_ART_URL = `${import.meta.env.BASE_URL}assets/board.jpg`;

/**
 * A board's art URL: the image stored in the document, else this app's copy of the built-in RtDT
 * art when the board references it ({@link isBuiltinBoardImageRef}), else undefined → blank.
 */
export function resolveBoardArt(doc: ScenarioDoc | null, board: Board): string | undefined {
  return (
    resolveImage(doc, board.imageRef) ??
    (isBuiltinBoardImageRef(board.imageRef) ? BUILTIN_BOARD_ART_URL : undefined)
  );
}

/** True when the board's art is bytes stored in the document (⇒ it counts against the budget). */
export function hasStoredArt(doc: ScenarioDoc | null, board: Board): boolean {
  return resolveImage(doc, board.imageRef) !== undefined;
}

/** True when the board carries a full circle calibration (⇒ the 3D disc view is available). */
export function isCalibrated(info: BoardImageInfo | undefined): boolean {
  if (!info) return false;
  return (
    typeof info.centerX === 'number' &&
    typeof info.centerY === 'number' &&
    typeof info.radius === 'number' &&
    info.radius > 0 &&
    typeof info.northHeadingDegrees === 'number'
  );
}

/** Adjacency written symmetrically — the schema documents the relation as symmetric and L2 enforces it. */
export function toggleAdjacency(board: Board, a: string, b: string): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(board.adjacency ?? {})) adj[k] = [...v];
  const linked = (adj[a] ?? []).includes(b);
  const drop = (from: string, to: string): void => {
    adj[from] = (adj[from] ?? []).filter((n) => n !== to);
    if (adj[from].length === 0) delete adj[from];
  };
  const add = (from: string, to: string): void => {
    if (!adj[from]) adj[from] = [];
    if (!adj[from].includes(to)) adj[from].push(to);
  };
  if (linked) {
    drop(a, b);
    drop(b, a);
  } else {
    add(a, b);
    add(b, a);
  }
  return adj;
}

/** The `building` scope value meaning "locations with no building at all". */
export const NO_BUILDING = '(none)';

/** What a bulk location removal targets: everything, or one value of one facet. */
export type LocationScope =
  | { kind: 'all' }
  | { kind: 'kingdom'; value: Kingdom }
  | { kind: 'terrain'; value: string }
  | { kind: 'building'; value: BuildingType | typeof NO_BUILDING };

/** The scoping facets — every `LocationScope` kind except the unscoped `all`. */
export type ScopeFacet = Exclude<LocationScope['kind'], 'all'>;

export function matchesScope(loc: BoardLocation, scope: LocationScope): boolean {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'kingdom':
      return loc.kingdom === scope.value;
    case 'terrain':
      return loc.terrain === scope.value;
    case 'building':
      return scope.value === NO_BUILDING
        ? loc.building === undefined
        : loc.building === scope.value;
  }
}

/** The locations a scope selects — what a bulk remove would delete. */
export function locationsInScope(board: Board, scope: LocationScope): BoardLocation[] {
  return board.locations.filter((l) => matchesScope(l, scope));
}

/**
 * The values a facet actually has on this board, with counts — the bulk-remove picker offers
 * only these, so every choice it shows deletes at least one location. Kingdoms keep their
 * canonical enum order; terrains and buildings are open strings, sorted A-Z.
 *
 * Buildings sort like terrain rather than following {@link BUILDING_TYPES} because that list
 * stopped being exhaustive at schema 0.4.7: ordering by it and filtering (the pre-0.4.7 shape)
 * silently DROPPED every custom type, leaving it unremovable in bulk. `NO_BUILDING` is appended
 * after the sort — '(none)' would otherwise sort ahead of every real id.
 */
export function scopeChoices(board: Board, facet: ScopeFacet): Array<{ value: string; n: number }> {
  const tally = new Map<string, number>();
  for (const loc of board.locations) {
    const key =
      facet === 'kingdom' ? loc.kingdom : facet === 'terrain' ? loc.terrain : (loc.building ?? '');
    if (facet === 'building' && key === '')
      tally.set(NO_BUILDING, (tally.get(NO_BUILDING) ?? 0) + 1);
    else if (key !== '') tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const sorted = (skip?: string): string[] =>
    [...tally.keys()].filter((k) => k !== skip).sort((a, b) => a.localeCompare(b));
  const order =
    facet === 'kingdom'
      ? [...KINGDOMS]
      : facet === 'building'
        ? [...sorted(NO_BUILDING), NO_BUILDING]
        : sorted();
  return order.filter((v) => tally.has(v)).map((value) => ({ value, n: tally.get(value)! }));
}

/**
 * Anchors and adjacency confined to `locations` — the invariant `validateBoard` enforces
 * (anchors/adjacency keys and adjacency targets must all be real locations). Every path that
 * drops locations goes through here so a removal can never leave a dangling edge behind.
 */
export function pruneToLocations(board: Board, locations: BoardLocation[]): Board {
  const names = new Set(locations.map((l) => l.name));
  const anchors: Record<string, LocationAnchors> = {};
  for (const [name, slots] of Object.entries(board.anchors ?? {})) {
    if (names.has(name)) anchors[name] = slots;
  }
  const adjacency: Record<string, string[]> = {};
  for (const [from, tos] of Object.entries(board.adjacency ?? {})) {
    if (!names.has(from)) continue;
    const kept = tos.filter((to) => names.has(to));
    if (kept.length > 0) adjacency[from] = kept;
  }
  return { ...board, locations, anchors, adjacency };
}

/** The board with every location the scope selects removed, anchors/adjacency pruned to match. */
export function removeLocationsInScope(board: Board, scope: LocationScope): Board {
  return pruneToLocations(
    board,
    board.locations.filter((l) => !matchesScope(l, scope)),
  );
}

/**
 * The geometry `preserveAspectRatio="xMidYMid meet"` applies: ONE uniform scale (the smaller
 * axis wins, so the whole viewBox fits) plus centring pads on the two spare sides.
 *
 * The pads are what a naive `(clientX - rect.left) / rect.width` mapping misses — for a square
 * board in a landscape pane they are ~115px each, and ignoring them throws a click off by up to
 * that much (zero error at the centre, worst at the edges).
 *
 * `viewBoxPointToClient` in `packages/board/src/renderers/rotate.ts` is the forward twin of this
 * (image space → client px); it is not exported from that package's root, hence the local copy.
 * A zero-size rect or viewBox (jsdom, hidden element) returns the identity rather than `NaN`.
 *
 * Note the drawn area `viewW * scale` is INVARIANT under zoom — shrinking the viewBox raises the
 * scale by the same factor — so the pads do not move as you zoom.
 */
export function viewportFit(
  rect: { width: number; height: number },
  viewW: number,
  viewH: number,
): { scale: number; padX: number; padY: number } {
  if (rect.width <= 0 || rect.height <= 0 || viewW <= 0 || viewH <= 0) {
    return { scale: 1, padX: 0, padY: 0 };
  }
  const scale = Math.min(rect.width / viewW, rect.height / viewH);
  return {
    scale,
    padX: (rect.width - viewW * scale) / 2,
    padY: (rect.height - viewH * scale) / 2,
  };
}

/**
 * A client pixel → normalized `[0,1]` image coords, honouring the {@link viewportFit} letterbox.
 * `view` is the SVG's current viewBox (pan is its origin, zoom shrinks its size); `image` is the
 * board's `imageInfo`. Clamped, so a click in a letterbox band lands on the nearest edge.
 */
export function clientToNormalized(
  client: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  view: { x: number; y: number; w: number; h: number },
  image: { width: number; height: number },
): AnchorPoint {
  const { scale, padX, padY } = viewportFit(rect, view.w, view.h);
  const ux = (client.x - rect.left - padX) / scale + view.x;
  const uy = (client.y - rect.top - padY) / scale + view.y;
  return { x: clamp01(ux / image.width), y: clamp01(uy / image.height) };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** A location's representative point (its `hero` anchor, else any slot it has). */
export function locationPoint(board: Board, name: string): AnchorPoint | undefined {
  const slots = board.anchors?.[name];
  if (!slots) return undefined;
  return slots.hero ?? slots.building ?? slots.foe ?? slots.marker ?? slots.skull;
}

/**
 * True once a location has an anchor in ANY slot — i.e. it has a spot on the board.
 * A location is just a row of data until then: the map canvas draws nothing for it, adjacency
 * can't reach it, and no token can rest on it. Stricter than `anchors[name] !== undefined`,
 * which an emptied `{}` would satisfy.
 */
export function isPlaced(board: Board, name: string): boolean {
  return locationPoint(board, name) !== undefined;
}

/** The locations that exist in data but sit nowhere on the board — what the editor nudges about. */
export function unplacedLocations(board: Board): BoardLocation[] {
  return board.locations.filter((l) => !isPlaced(board, l.name));
}

/** True when this exact slot carries a point — what fills/hollows the Anchor-slot buttons. */
export function hasAnchorSlot(board: Board, name: string, slot: AnchorSlot): boolean {
  return board.anchors?.[name]?.[slot] !== undefined;
}

/**
 * Proximity-suggested adjacency: links each pair of locations whose anchors are within
 * `radius` (normalized units). An authoring aid — the author edits the result.
 */
export function suggestAdjacency(board: Board, radius = 0.12): Record<string, string[]> {
  const pts = board.locations
    .map((l) => ({ name: l.name, p: locationPoint(board, l.name) }))
    .filter((e): e is { name: string; p: AnchorPoint } => e.p !== undefined);
  const adj: Record<string, string[]> = {};
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].p.x - pts[j].p.x;
      const dy = pts[i].p.y - pts[j].p.y;
      if (Math.hypot(dx, dy) > radius) continue;
      (adj[pts[i].name] ??= []).push(pts[j].name);
      (adj[pts[j].name] ??= []).push(pts[i].name);
    }
  }
  return adj;
}

/** Step distance over the adjacency graph, or `null` when unreachable. BFS — the editor preview. */
export function bfsDistance(board: Board, from: string, to: string): number | null {
  if (from === to) return 0;
  const adj = board.adjacency ?? {};
  const seen = new Set<string>([from]);
  let frontier = [from];
  let dist = 0;
  while (frontier.length > 0) {
    dist++;
    const next: string[] = [];
    for (const node of frontier) {
      for (const n of adj[node] ?? []) {
        if (seen.has(n)) continue;
        if (n === to) return dist;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

export type BoardProblem = { level: 'error' | 'warn'; message: string };

/**
 * Editor-side board validation. Mirrors the L2 checks in `@udtc/adapters`' `validate-refs`
 * (duplicate names, anchors/adjacency confined to real locations, adjacency symmetry) so the
 * author sees them while editing rather than at export.
 *
 * `buildingTypes` is the scenario's registry ({@link buildingTypesOf}). It drives two checks the
 * board alone can't answer: which buildings start a hero, and whether a `building` names a type
 * that exists. Pass `{}` (the default) and both degrade to the pre-0.4.7 behaviour — 'citadel'
 * is the hero start, and no type is ever reported as unknown.
 */
export function validateBoard(
  board: Board,
  buildingTypes: Record<string, BuildingTypeDef> = {},
): BoardProblem[] {
  const problems: BoardProblem[] = [];
  if (!ID_RE.test(board.id)) {
    problems.push({ level: 'error', message: `id "${board.id}" must be kebab/snake case` });
  }
  if (!board.name.trim()) problems.push({ level: 'error', message: 'name is required' });
  if (board.locations.length === 0) {
    problems.push({ level: 'error', message: 'a board needs at least one location' });
  }

  // Registry keys lowercased once — building values are compared case-insensitively everywhere
  // (the engine, L2, and here), because a cloned RtDT board carries core's 'Citadel'.
  const lowerTypes: Record<string, true> = {};
  for (const id of Object.keys(buildingTypes)) lowerTypes[id.toLowerCase()] = true;
  const hasRegistry = Object.keys(buildingTypes).length > 0;

  const names = new Set<string>();
  for (const loc of board.locations) {
    if (!loc.name.trim()) {
      problems.push({ level: 'error', message: 'a location has an empty name' });
      continue;
    }
    if (names.has(loc.name)) {
      problems.push({ level: 'error', message: `duplicate location name "${loc.name}"` });
    }
    names.add(loc.name);
    if (!loc.terrain.trim()) {
      problems.push({ level: 'error', message: `location "${loc.name}" has no terrain` });
    }
    const building = loc.building?.trim();
    if (building && !ID_RE.test(building)) {
      // L1 would reject this at export ($defs/buildingType is $defs/id) — say so while editing.
      problems.push({
        level: 'error',
        message: `location "${loc.name}" building "${building}" must be kebab/snake case`,
      });
    } else if (building && hasRegistry && !(building.toLowerCase() in lowerTypes)) {
      // The editor-side twin of the L2 check, gated the same way: with no registry authored there
      // is nothing to resolve against, and warning on every building would be noise. A warning
      // rather than an error because it's a normal mid-edit state.
      problems.push({
        level: 'warn',
        message: `location "${loc.name}" building "${building}" has no entry in Building types — Reinforce there will fail`,
      });
    }
  }

  for (const key of Object.keys(board.anchors ?? {})) {
    if (!names.has(key)) {
      problems.push({ level: 'error', message: `anchors key "${key}" is not a location` });
    }
  }

  const adj = board.adjacency ?? {};
  for (const [from, tos] of Object.entries(adj)) {
    if (!names.has(from)) {
      problems.push({ level: 'error', message: `adjacency key "${from}" is not a location` });
      continue;
    }
    for (const to of tos) {
      if (!names.has(to)) {
        problems.push({
          level: 'error',
          message: `adjacency "${from}" → "${to}" is not a location`,
        });
        continue;
      }
      if (!(adj[to] ?? []).includes(from)) {
        problems.push({
          level: 'error',
          message: `adjacency is not symmetric: "${from}" lists "${to}" but not the reverse`,
        });
      }
    }
  }

  // Warnings — authorable but probably a mistake.
  for (const kingdom of KINGDOMS) {
    const inK = board.locations.filter((l) => l.kingdom === kingdom);
    if (inK.length === 0) {
      problems.push({ level: 'warn', message: `no locations in the ${kingdom} kingdom` });
      continue;
    }
    if (!inK.some((l) => isHeroStartBuilding(buildingTypes, l.building))) {
      // Which buildings start a hero is `heroStart` in the registry, falling back to 'citadel'
      // when no type claims it — exactly the engine's rule (setup.ts `heroStartTypes`).
      const what = heroStartTypes(buildingTypes) ? 'hero-start building' : 'citadel';
      problems.push({
        level: 'warn',
        message: `${kingdom} has no ${what} — its hero has no start location`,
      });
    }
  }
  for (const loc of board.locations) {
    if (!board.anchors?.[loc.name]) {
      problems.push({ level: 'warn', message: `"${loc.name}" has no anchors — it won't render` });
    }
  }
  if (!isCalibrated(board.imageInfo)) {
    problems.push({
      level: 'warn',
      message: 'not calibrated — the board is 2D-only (set center, radius and north for 3D)',
    });
  }
  return problems;
}
