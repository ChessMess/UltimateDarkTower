/**
 * Zone classification for a single live skull, and aggregation into a
 * {@link SkullCounts} snapshot. Pure — no `three`/Rapier imports — so it can
 * be unit-tested with plain position objects.
 */

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
