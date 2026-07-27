/**
 * Zone classification for a single live skull, and aggregation into a
 * {@link SkullCounts} snapshot. Pure — no `three`/Rapier imports — so it can
 * be unit-tested with plain position objects.
 */

import type { SealIdentifier } from '../types';
import type { SealAutoShakeConfig } from './types';

/** Which region of the sim a skull's center currently falls in. */
export type SkullZone = 'inTower' | 'onBoard' | 'inTransit';

/** Snapshot of where every live skull currently is (see `getSkullCounts` JSDoc). */
export interface SkullCounts {
  /** Every live skull body in the world (spawned − despawned − cleared). */
  total: number;
  /** Skulls inside the tower's shell, or enclosed under its base at board level. */
  inTower: number;
  /** Skulls resting at board height, outside the tower's base outline. */
  onBoard: number;
  /** Falling above the rim, sliding down the base exterior, or below the board pending despawn. 0 when settled. */
  inTransit: number;
  /** Drops queued before init resolved — not yet spawned, not included in `total`. */
  pending: number;
}

/** Resting tolerance above the board: center within this many skull radii counts as the board-height band. */
export const ON_BOARD_HEIGHT_FACTOR = 1.5;

export interface SkullClassifyParams {
  /** Max radial extent of the 12 seal meshes (world frame) — the shell at drum levels. */
  shellRadius: number;
  /** Min-over-azimuth radial extent of static geometry near board level — the base's narrowest outline. */
  baseRadiusAtBoard: number;
  /** Board floor top surface Y (= `bounds.modelBottomY`). */
  boardTopY: number;
  /** Model top Y (= `bounds.modelTopY`). */
  modelTopY: number;
  /** Current skull body radius (`modelRadius * config.skull.radiusFactor`) — used only for tolerances. */
  skullRadius: number;
}

/**
 * Classify one skull's center position into a zone. Rule order matters:
 * height bands (above rim / below board) are checked before the radial
 * tests, so a skull below the board at any radius is `inTransit`, not
 * miscounted as `onBoard` by falling through the board-height check.
 */
export function classifySkull(
  pos: { x: number; y: number; z: number },
  p: SkullClassifyParams,
): SkullZone {
  const r = p.skullRadius;

  if (pos.y > p.modelTopY + r) return 'inTransit'; // falling in above the rim
  if (pos.y < p.boardTopY - r) return 'inTransit'; // below the board, OOB pending despawn

  const radial = Math.hypot(pos.x, pos.z);

  if (pos.y <= p.boardTopY + r * ON_BOARD_HEIGHT_FACTOR) {
    // Board-height band: inside the base's narrowest outline reads as still
    // under the tower (archway / hollow base interior); outside it, on the board.
    return radial < p.baseRadiusAtBoard ? 'inTower' : 'onBoard';
  }

  // Mid-height: inside the shell is in-tower; outside it is on the base's
  // exterior skirt, in transit toward the board.
  return radial <= p.shellRadius ? 'inTower' : 'inTransit';
}

/** Classify every live skull position and aggregate into a `SkullCounts` snapshot. */
export function aggregateSkullCounts(
  positions: Iterable<{ x: number; y: number; z: number }>,
  p: SkullClassifyParams,
  pending: number,
): SkullCounts {
  let total = 0;
  let inTower = 0;
  let onBoard = 0;
  let inTransit = 0;

  for (const pos of positions) {
    total++;
    switch (classifySkull(pos, p)) {
      case 'inTower':
        inTower++;
        break;
      case 'onBoard':
        onBoard++;
        break;
      case 'inTransit':
        inTransit++;
        break;
    }
  }

  return { total, inTower, onBoard, inTransit, pending };
}

/** Live world-frame center of one seal node, for the nearest-anchor fallback. */
export interface SealAnchor extends SealIdentifier {
  /** True when this seal is currently broken — an open doorway. */
  broken: boolean;
  x: number;
  y: number;
  z: number;
}

/**
 * One authored `pocket_<side>_<level>` volume, flattened to plain numbers so
 * this module stays `three`-free. `inverseWorld` is the pocket node's inverse
 * world matrix in column-major `Matrix4.toArray()` order (length 16);
 * `min`/`max` are the pocket geometry's local-space bounding box.
 */
export interface SealPocket extends SealIdentifier {
  /** True when this seal is currently broken — an open doorway. */
  broken: boolean;
  inverseWorld: readonly number[];
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

/** Skulls attributed to one seal opening. */
export interface SealSkullBucket extends SealIdentifier {
  /** True when this opening's seal is currently broken — an open doorway. */
  broken: boolean;
  /**
   * Ids of the skulls behind this opening, ascending (oldest first). Pass
   * straight to `shakeSelectedSkull(bucket.ids)`. Count is `ids.length` —
   * deliberately not duplicated as a separate field.
   */
  ids: number[];
}

/** Result of {@link bucketSkullsByPocket} / {@link bucketSkullsByNearestSeal}. */
export interface SkullSealBuckets {
  /**
   * One entry per seal — 12 on the stock model, `[]` before the GLB loads.
   * Ordered canonically (level × side, matching the input `pockets` /
   * `anchors` array order), not GLB traversal order.
   */
  bySeal: SealSkullBucket[];
  /**
   * Ids of in-tower skulls not behind any opening — wedged in the funnel or
   * on the central axis rather than a doorway. Also batch-shakeable.
   */
  unattributed: number[];
  /** Skulls considered — equals `getSkullCounts().inTower`. */
  total: number;
  /** Which attribution rule produced this result. */
  mode: 'pocket' | 'nearest';
}

/**
 * Transform a world-space point by a column-major 4x4 matrix (the layout
 * `THREE.Matrix4.toArray()` produces), including the perspective divide —
 * a no-op for the affine (translate/rotate/scale) matrices this is used
 * with, since their bottom row is always `[0, 0, 0, 1]`.
 */
function transformPoint(
  m: readonly number[],
  x: number,
  y: number,
  z: number,
): { x: number; y: number; z: number } {
  const w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);
  return {
    x: (m[0] * x + m[4] * y + m[8] * z + m[12]) * w,
    y: (m[1] * x + m[5] * y + m[9] * z + m[13]) * w,
    z: (m[2] * x + m[6] * y + m[10] * z + m[14]) * w,
  };
}

/** Index of the first pocket whose local-space AABB contains `pos`, or -1. */
function pocketIndexContaining(
  pos: { x: number; y: number; z: number },
  pockets: readonly SealPocket[],
): number {
  for (let i = 0; i < pockets.length; i++) {
    const p = pockets[i];
    const local = transformPoint(p.inverseWorld, pos.x, pos.y, pos.z);
    if (
      local.x >= p.min.x &&
      local.x <= p.max.x &&
      local.y >= p.min.y &&
      local.y <= p.max.y &&
      local.z >= p.min.z &&
      local.z <= p.max.z
    ) {
      return i;
    }
  }
  return -1;
}

/** Index of the nearest anchor within `maxDistanceSq`, or -1. */
function nearestSealIndex(
  pos: { x: number; y: number; z: number },
  anchors: readonly SealAnchor[],
  maxDistanceSq: number,
): number {
  let best = -1;
  let bestDistSq = Infinity;
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const dx = pos.x - a.x;
    const dy = pos.y - a.y;
    const dz = pos.z - a.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = i;
    }
  }
  return best >= 0 && bestDistSq <= maxDistanceSq ? best : -1;
}

/**
 * Classify every in-tower skull (via `classifySkull`) and sort its id into
 * the seal index `assign` returns, or `unattributed` for -1. Shared by both
 * `bucketSkullsByPocket` and `bucketSkullsByNearestSeal` — they differ only
 * in how `assign` maps a position to a seal index.
 */
function collectBySeal(
  skulls: Iterable<{ id: number; x: number; y: number; z: number }>,
  p: SkullClassifyParams,
  sealCount: number,
  assign: (pos: { x: number; y: number; z: number }) => number,
): { idsBySeal: number[][]; unattributed: number[]; total: number } {
  const idsBySeal: number[][] = Array.from({ length: sealCount }, () => []);
  const unattributed: number[] = [];
  let total = 0;

  for (const s of skulls) {
    if (classifySkull(s, p) !== 'inTower') continue;
    total++;
    const idx = assign(s);
    if (idx >= 0 && idx < sealCount) {
      idsBySeal[idx].push(s.id);
    } else {
      unattributed.push(s.id);
    }
  }

  return { idsBySeal, unattributed, total };
}

/**
 * Attribute every in-tower skull to a seal by an exact point-in-box test
 * against each pocket's authored volume, in the pocket's own local frame —
 * so it's correct regardless of whether the pocket is parented to a
 * rotating drum or fixed at the scene root. First matching pocket wins.
 */
export function bucketSkullsByPocket(
  skulls: Iterable<{ id: number; x: number; y: number; z: number }>,
  pockets: readonly SealPocket[],
  p: SkullClassifyParams,
): SkullSealBuckets {
  const { idsBySeal, unattributed, total } = collectBySeal(skulls, p, pockets.length, (pos) =>
    pocketIndexContaining(pos, pockets),
  );

  return {
    bySeal: pockets.map((pocket, i) => ({
      side: pocket.side,
      level: pocket.level,
      broken: pocket.broken,
      ids: idsBySeal[i],
    })),
    unattributed,
    total,
    mode: 'pocket',
  };
}

/**
 * Attribute every in-tower skull to its nearest seal anchor, within
 * `maxDistance`; skulls beyond every anchor's radius land in `unattributed`.
 * Fallback used when the model doesn't supply all 12 `pocket_*` volumes.
 */
export function bucketSkullsByNearestSeal(
  skulls: Iterable<{ id: number; x: number; y: number; z: number }>,
  anchors: readonly SealAnchor[],
  p: SkullClassifyParams,
  maxDistance: number,
): SkullSealBuckets {
  const maxDistanceSq = maxDistance * maxDistance;
  const { idsBySeal, unattributed, total } = collectBySeal(skulls, p, anchors.length, (pos) =>
    nearestSealIndex(pos, anchors, maxDistanceSq),
  );

  return {
    bySeal: anchors.map((anchor, i) => ({
      side: anchor.side,
      level: anchor.level,
      broken: anchor.broken,
      ids: idsBySeal[i],
    })),
    unattributed,
    total,
    mode: 'nearest',
  };
}

/** Decision produced by {@link resolveSealRemovalShake}. */
export interface SealRemovalShakeDecision {
  mode: 'nearest' | 'all';
  /** Populated for `mode: 'nearest'` only — `'all'` shakes every inTower skull directly, no ids needed. */
  ids: number[];
  strength: number;
}

/**
 * Pure decision logic for `seal.shakeSkullsOnSealRemoval`: given the
 * resolved config leaf, a predicate for "this seal just transitioned from
 * intact to broken", a lazy accessor for the current `getSkullsBySeal()`
 * breakdown, and the ambient `skull.shakeStrength`, decide what (if
 * anything) to shake. `getBySeal` is only invoked for `mode: 'nearest'`, so
 * callers don't pay for a bucket computation when it's disabled or
 * `mode: 'all'`.
 *
 * Returns `null` — "shake nothing" — when `setting` is `false`, or when
 * `mode: 'nearest'` finds no ids behind the seals that just broke.
 */
export function resolveSealRemovalShake(
  setting: boolean | SealAutoShakeConfig,
  isNewlyBroken: (seal: SealIdentifier) => boolean,
  getBySeal: () => readonly SealSkullBucket[],
  ambientStrength: number,
): SealRemovalShakeDecision | null {
  if (setting === false) return null;
  const opts = setting === true ? {} : setting;
  const mode = opts.mode ?? 'nearest';
  const strength = opts.shake?.strength ?? ambientStrength;

  if (mode === 'all') return { mode, ids: [], strength };

  const ids = getBySeal()
    .filter(isNewlyBroken)
    .flatMap((b) => b.ids);
  return ids.length > 0 ? { mode, ids, strength } : null;
}
