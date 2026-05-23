/**
 * Pure math for placing one of the four kinematic "door" colliders around a
 * drum at a given level. The drum has four slots (N, E, S, W); each slot's
 * world pose depends on the drum's current Y-axis rotation.
 *
 * Coordinate convention matches the core library's `polarToXZ`:
 *   x = sin(azimuth) * radius
 *   z = cos(azimuth) * radius
 * with azimuth 0 = north (+Z), π/2 = east (+X), π = south (-Z), -π/2 = west (-X).
 *
 * Slot home azimuths align with the seal layout:
 *   slot 0 = N, slot 1 = E, slot 2 = S, slot 3 = W.
 */

const SLOT_HOME_AZIMUTHS: readonly number[] = [
  0,
  Math.PI / 2,
  Math.PI,
  -Math.PI / 2,
];

export interface DoorSlotPose {
  x: number;
  y: number;
  z: number;
  /** Quaternion components (x, y, z, w) for a rotation about the +Y axis. */
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

/**
 * Compute the world pose of door slot `slotIndex` on a drum at world-Y `y`,
 * given the drum's current `rotation.y` and the inner drum radius.
 *
 * The returned position sits on the drum's inner cylinder; the rotation
 * orients the door so its "outward" face is radial.
 */
export function slotPose(
  drumAngle: number,
  slotIndex: 0 | 1 | 2 | 3,
  innerRadius: number,
  y: number,
): DoorSlotPose {
  const azimuth = SLOT_HOME_AZIMUTHS[slotIndex] + drumAngle;
  const x = Math.sin(azimuth) * innerRadius;
  const z = Math.cos(azimuth) * innerRadius;

  // Quaternion for a Y-axis rotation by `azimuth`:
  //   q = (0, sin(θ/2), 0, cos(θ/2))
  const half = azimuth / 2;
  return {
    x,
    y,
    z,
    qx: 0,
    qy: Math.sin(half),
    qz: 0,
    qw: Math.cos(half),
  };
}

export { SLOT_HOME_AZIMUTHS };
