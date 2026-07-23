// A board's data, as data — so a host can render a board this package doesn't ship.
//
// The built-in Return to Dark Tower board stays the default everywhere: every `board`
// option is optional and `resolveBoard(undefined)` returns the RtDT board, so existing
// consumers are unaffected. Pure data + pure functions — no `three`, no Display, so this
// stays importable from the light root entry.

import type { BoardKingdom, BoardSpot, BoardSpotMap } from './udtReexports';
import { BOARD_ADJACENCY, BOARD_IMAGE_INFO, BOARD_LOCATIONS, BOARD_SPOTS } from './udtReexports';

export type { BoardSpot, BoardSpotMap } from './udtReexports';

/**
 * A location on a custom board. Deliberately looser than UDT's `BoardLocation`:
 * `terrain` and `building` are open strings so a custom board can invent its own
 * vocabulary. Renderers only ever test `building` for truthiness; hosts that care
 * about a specific building type should compare case-insensitively (core spells it
 * `'Citadel'`, the Creator schema spells it `'citadel'`).
 */
export interface BoardDefLocation {
  name: string;
  kingdom: BoardKingdom;
  terrain?: string;
  building?: string;
}

/**
 * Board-image metadata. Only `width`/`height` are required — a board with no circle
 * calibration still renders in 2D. The other four together make it 3D-capable; see
 * {@link isBoardCalibrated}.
 */
export interface BoardDefImageInfo {
  width: number;
  height: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  northHeadingDegrees?: number;
}

/** Movement adjacency, location name → neighbouring location names. */
export type BoardDefAdjacency = Readonly<Record<string, readonly string[]>>;

/**
 * Everything this package needs to render and track a board. `spots` are normalized
 * [0, 1] against the board image, exactly like UDT's `BOARD_SPOTS`.
 */
export interface BoardDefinition {
  id: string;
  name?: string;
  imageInfo: BoardDefImageInfo;
  locations: readonly BoardDefLocation[];
  spots: BoardSpotMap;
  adjacency?: BoardDefAdjacency;
}

/**
 * A board definition plus the lookups renderers want, computed once. `calibrated`
 * gates the 3D disc view (see {@link isBoardCalibrated}). `spotsAccepting` is a
 * per-location index of spots by every type id they `accept`, so resolving "which
 * spot(s) at this location take this token type" is O(1) rather than a per-render scan.
 */
export interface ResolvedBoard {
  def: BoardDefinition;
  locationByName: Readonly<Record<string, BoardDefLocation>>;
  buildingLocations: readonly string[];
  calibrated: boolean;
  spotsAccepting: ReadonlyMap<string, ReadonlyMap<string, readonly BoardSpot[]>>;
}

/** The built-in Return to Dark Tower board, assembled from UDT's generated data. */
export const RTDT_BOARD_DEFINITION: BoardDefinition = {
  id: 'rtdt',
  name: 'Return to Dark Tower',
  imageInfo: BOARD_IMAGE_INFO,
  locations: BOARD_LOCATIONS,
  spots: BOARD_SPOTS,
  adjacency: BOARD_ADJACENCY,
};

/**
 * True when the board carries a full circle calibration (center, radius, and north
 * heading), which is what the 3D disc projection needs. Uncalibrated boards are 2D-only.
 */
export function isBoardCalibrated(info: BoardDefImageInfo | undefined): boolean {
  if (!info) return false;
  return (
    typeof info.centerX === 'number' &&
    typeof info.centerY === 'number' &&
    typeof info.radius === 'number' &&
    info.radius > 0 &&
    typeof info.northHeadingDegrees === 'number'
  );
}

const RTDT_RESOLVED: ResolvedBoard = buildResolved(RTDT_BOARD_DEFINITION);

/**
 * Resolves a board definition into its lookups. `undefined` → the built-in RtDT board,
 * which is what every existing caller gets by omitting the option.
 */
export function resolveBoard(def?: BoardDefinition): ResolvedBoard {
  if (!def || def === RTDT_BOARD_DEFINITION) return RTDT_RESOLVED;
  return buildResolved(def);
}

function buildResolved(def: BoardDefinition): ResolvedBoard {
  const locationByName: Record<string, BoardDefLocation> = {};
  const buildingLocations: string[] = [];
  for (const location of def.locations) {
    locationByName[location.name] = location;
    if (location.building) buildingLocations.push(location.name);
  }
  const spotsAccepting = new Map<string, Map<string, BoardSpot[]>>();
  for (const [loc, spots] of Object.entries(def.spots)) {
    const byType = new Map<string, BoardSpot[]>();
    for (const spot of spots) {
      for (const typeId of spot.accepts) {
        const list = byType.get(typeId);
        if (list) list.push(spot);
        else byType.set(typeId, [spot]);
      }
    }
    spotsAccepting.set(loc, byType);
  }
  return {
    def,
    locationByName,
    buildingLocations,
    calibrated: isBoardCalibrated(def.imageInfo),
    spotsAccepting,
  };
}

interface Point {
  x: number;
  y: number;
}

/** A spot's normalized point, in image-space px. */
function pxOfSpot(board: ResolvedBoard, spot: BoardSpot): Point {
  const { width, height } = board.def.imageInfo;
  return { x: spot.at.x * width, y: spot.at.y * height };
}

/**
 * Resolves the spot a token should render at, per the chain: an explicit `spotId` on the
 * spot list → the first spot at `loc` whose `accepts` includes `typeId` → a spot whose `id`
 * literally equals `typeId` (a defensive fallback for a hand-authored board that named a
 * spot after a reserved type without listing it in `accepts`) → `undefined` (nothing to
 * draw at — the caller falls back to a representative point or skips the token).
 */
export function resolveSpot(
  board: ResolvedBoard,
  loc: string,
  typeId: string,
  spotId?: string,
): BoardSpot | undefined {
  const spots = board.def.spots[loc];
  if (!spots || spots.length === 0) return undefined;
  if (spotId !== undefined) {
    const explicit = spots.find((s) => s.id === spotId);
    if (explicit) return explicit;
  }
  const accepting = board.spotsAccepting.get(loc)?.get(typeId);
  if (accepting && accepting.length > 0) return accepting[0];
  // A spot with an empty `accepts` opts out entirely — the id-equality fallback below must not
  // resurrect it (an author who explicitly emptied `accepts` is saying "nothing goes here").
  return spots.find((s) => s.id === typeId && s.accepts.length > 0);
}

/**
 * The image-space px for the spot a token at `loc` resolves to (see {@link resolveSpot}), or
 * `null` when nothing resolves.
 */
export function spotPxFor(
  board: ResolvedBoard,
  loc: string,
  typeId: string,
  spotId?: string,
): Point | null {
  const spot = resolveSpot(board, loc, typeId, spotId);
  return spot ? pxOfSpot(board, spot) : null;
}

/**
 * Token geometry in this package is tuned in image-space px against the 4096² RtDT
 * board. A custom board of another size needs those constants scaled, or tokens come
 * out wildly over/undersized.
 *
 * Uses `min(width, height)`, not `width`: a portrait board scaled on width alone puts
 * tokens out of proportion with the visible board.
 */
export const REFERENCE_BOARD_EXTENT = 4096;

export function boardScaleFactor(info: BoardDefImageInfo): number {
  const extent = Math.min(info.width, info.height);
  if (!extent || extent <= 0) return 1;
  return extent / REFERENCE_BOARD_EXTENT;
}
