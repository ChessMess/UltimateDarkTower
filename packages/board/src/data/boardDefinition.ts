// A board's data, as data — so a host can render a board this package doesn't ship.
//
// The built-in Return to Dark Tower board stays the default everywhere: every `board`
// option is optional and `resolveBoard(undefined)` returns the RtDT board, so existing
// consumers are unaffected. Pure data + pure functions — no `three`, no Display, so this
// stays importable from the light root entry.

import type { Anchor, AnchorSlot, BoardAnchorMap, BoardKingdom } from './udtReexports';
import { BOARD_ADJACENCY, BOARD_ANCHORS, BOARD_IMAGE_INFO, BOARD_LOCATIONS } from './udtReexports';

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
 * Everything this package needs to render and track a board. `anchors` are normalized
 * [0, 1] against the board image, exactly like UDT's `BOARD_ANCHORS`.
 */
export interface BoardDefinition {
  id: string;
  name?: string;
  imageInfo: BoardDefImageInfo;
  locations: readonly BoardDefLocation[];
  anchors: BoardAnchorMap;
  adjacency?: BoardDefAdjacency;
}

/**
 * A board definition plus the lookups renderers want, computed once. `calibrated`
 * gates the 3D disc view (see {@link isBoardCalibrated}).
 */
export interface ResolvedBoard {
  def: BoardDefinition;
  locationByName: Readonly<Record<string, BoardDefLocation>>;
  buildingLocations: readonly string[];
  calibrated: boolean;
}

/** The built-in Return to Dark Tower board, assembled from UDT's generated data. */
export const RTDT_BOARD_DEFINITION: BoardDefinition = {
  id: 'rtdt',
  name: 'Return to Dark Tower',
  imageInfo: BOARD_IMAGE_INFO,
  locations: BOARD_LOCATIONS,
  anchors: BOARD_ANCHORS,
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
  return {
    def,
    locationByName,
    buildingLocations,
    calibrated: isBoardCalibrated(def.imageInfo),
  };
}

/**
 * The anchor for `slot` at `loc`, in image-space px. Returns `null` when the location
 * has no such slot.
 */
export function anchorPxOf(board: ResolvedBoard, loc: string, slot: AnchorSlot): Anchor | null {
  const anchor = board.def.anchors[loc]?.[slot];
  if (!anchor) return null;
  const { width, height } = board.def.imageInfo;
  return { x: anchor.x * width, y: anchor.y * height };
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
