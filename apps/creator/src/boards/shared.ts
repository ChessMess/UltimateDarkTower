// Board Designer — shared types + pure helpers. Mirrors `../dungeons/shared.ts`.
//
// The `Board` types here mirror `$defs/boardDef` in the scenario schema (0.4.6); keep them in
// step with it. Styling/limit helpers are reused from the dungeon module rather than re-declared.

import type { ScenarioDoc } from '../types';

export { imagesOf, resolveImage, byteLen, IMAGE_BUDGET_BYTES } from '../dungeons/shared';
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

/** The schema's closed lowercase enum ($defs/buildingType). */
export const BUILDING_TYPES = ['citadel', 'sanctuary', 'village', 'bazaar'] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

/** RtDT's own six terrains — suggestions only; `terrain` is an open string in the schema. */
export const TERRAIN_SUGGESTIONS = [
  'Hills',
  'Lake',
  'Desert',
  'Mountains',
  'Grasslands',
  'Forest',
] as const;

export const ANCHOR_SLOTS = ['building', 'skull', 'hero', 'foe', 'marker'] as const;
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
 *  the one image a player stares at — but `library.boards` is a MAP sharing one 5 MB budget, so
 *  ~3 boards with art will overrun it. {@link boardArtBytes} feeds the Asset usage meter. */
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

/** A location's representative point (its `hero` anchor, else any slot it has). */
export function locationPoint(board: Board, name: string): AnchorPoint | undefined {
  const slots = board.anchors?.[name];
  if (!slots) return undefined;
  return slots.hero ?? slots.building ?? slots.foe ?? slots.marker ?? slots.skull;
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
 */
export function validateBoard(board: Board): BoardProblem[] {
  const problems: BoardProblem[] = [];
  if (!ID_RE.test(board.id)) {
    problems.push({ level: 'error', message: `id "${board.id}" must be kebab/snake case` });
  }
  if (!board.name.trim()) problems.push({ level: 'error', message: 'name is required' });
  if (board.locations.length === 0) {
    problems.push({ level: 'error', message: 'a board needs at least one location' });
  }

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
    if (!inK.some((l) => l.building === 'citadel')) {
      problems.push({
        level: 'warn',
        message: `${kingdom} has no citadel — its hero has no start location`,
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
