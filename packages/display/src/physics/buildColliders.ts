/**
 * Pure spec-building for the physics world's static colliders. Builds plain
 * data only — no Rapier instantiation — so this module can be unit-tested
 * without booting WASM. `PhysicsManager` materializes specs into actual
 * Rapier rigid bodies and colliders.
 */

import type { ResolvedPhysicsConfig } from './types';

/** Y positions of the three drum-row centers, as a fraction of `modelRadius`. */
export const DRUM_ROW_Y_FACTORS = {
  top: 0.83,
  middle: 0.53,
  bottom: 0.23,
} as const;

/**
 * Hollow vertical cylinder representing the drum interior wall at a given
 * level. Materialized as a ring of box-segment colliders or a trimesh by the
 * PhysicsManager; this spec is purely data.
 */
export interface DrumWallSpec {
  kind: 'drum-wall';
  level: 'top' | 'middle' | 'bottom';
  /** World-space Y of the cylinder's center. */
  y: number;
  /** Inner radius of the drum (where the wall sits). */
  radius: number;
  /** Half-height of the wall section. */
  halfHeight: number;
}

/**
 * Horizontal floor plate that catches skulls exiting the bottom of the tower.
 * Sized generously beyond the visual board disc so skulls don't roll off.
 */
export interface BoardFloorSpec {
  kind: 'board-floor';
  /** World-space Y of the floor's top surface. */
  y: number;
  /** Radius of the floor disc. */
  radius: number;
  /** Thickness (height) of the floor box. */
  thickness: number;
}

/**
 * Sensor volume well below the board. If a skull body enters it (escape via
 * physics glitch), the PhysicsManager despawns the skull as a safety net.
 */
export interface OobSensorSpec {
  kind: 'oob-sensor';
  /** World-space Y of the sensor's center. */
  y: number;
  /** Size (radius/half-extent) of the sensor volume. */
  size: number;
}

/** Aggregate of every static collider spec produced for one tower model. */
export interface StaticColliderSet {
  drumWalls: DrumWallSpec[];
  boardFloor: BoardFloorSpec;
  oobSensor: OobSensorSpec;
}

export interface BuildStaticColliderOptions {
  modelRadius: number;
  modelBottomY: number;
  modelTopY: number;
  /** Resolved physics config — provides every tunable factor with a value. */
  config: ResolvedPhysicsConfig;
}

/**
 * Produce specs for every static collider in the physics world — three drum
 * walls (one per level), a board floor, and an out-of-bounds sensor well
 * below the board. All tunable factors come from `opts.config`.
 */
export function buildStaticColliderSpecs(opts: BuildStaticColliderOptions): StaticColliderSet {
  const { modelRadius, modelBottomY, config } = opts;
  const drumInnerRadius = modelRadius * config.drum.innerRadiusFactor;
  const drumHalfHeight = modelRadius * config.drum.halfHeightFactor;

  const drumWalls: DrumWallSpec[] = (
    ['top', 'middle', 'bottom'] as const
  ).map(level => ({
    kind: 'drum-wall',
    level,
    y: modelRadius * DRUM_ROW_Y_FACTORS[level],
    radius: drumInnerRadius,
    halfHeight: drumHalfHeight,
  }));

  const boardFloor: BoardFloorSpec = {
    kind: 'board-floor',
    y: modelBottomY,
    radius: modelRadius * config.board.radiusFactor,
    thickness: modelRadius * config.board.thicknessFactor,
  };

  const oobSensor: OobSensorSpec = {
    kind: 'oob-sensor',
    y: modelBottomY - modelRadius * config.oob.depthFactor,
    size: modelRadius * 4,
  };

  return { drumWalls, boardFloor, oobSensor };
}
