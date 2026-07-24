import * as THREE from 'three';
import {
  classifySkull,
  aggregateSkullCounts,
  ON_BOARD_HEIGHT_FACTOR,
  type SkullClassifyParams,
} from '../../../src/physics/skullCounts';
import { PhysicsManager } from '../../../src/physics/PhysicsManager';
import type { TowerPhysicsHooks } from '../../../src/types';

// Rough proportions of the real tower.glb, normalized to R=1: a shell (seal)
// radius narrower than the base's outline at board level, a symmetric
// bounding sphere top/bottom.
const P: SkullClassifyParams = {
  shellRadius: 0.33,
  baseRadiusAtBoard: 0.4,
  boardTopY: -1,
  modelTopY: 1,
  skullRadius: 0.025,
};
const r = P.skullRadius;

describe('classifySkull', () => {
  it('classifies a fresh spawn (just below the rim, radially inside the shell) as inTower', () => {
    expect(classifySkull({ x: 0.05, y: 1.01, z: 0 }, P)).toBe('inTower');
  });

  it('classifies a position above the rim threshold as inTransit (falling in)', () => {
    expect(classifySkull({ x: 0, y: P.modelTopY + 2 * r, z: 0 }, P)).toBe('inTransit');
  });

  it('does not treat y === modelTopY + skullRadius as above the rim', () => {
    // Exactly at the threshold: rule 1 is strict `>`, so this falls through
    // to the mid-height radial check.
    expect(classifySkull({ x: 0.1, y: P.modelTopY + r, z: 0 }, P)).toBe('inTower');
  });

  it('classifies mid-height, radially-inside-shell as inTower (drum interior, incl. boundary)', () => {
    expect(classifySkull({ x: P.shellRadius, y: 0, z: 0 }, P)).toBe('inTower');
  });

  it('classifies mid-height, just outside the shell as inTransit (mid-doorway / skirt slide)', () => {
    expect(classifySkull({ x: P.shellRadius + 0.001, y: 0, z: 0 }, P)).toBe('inTransit');
  });

  it('classifies board-height, outside the base outline as onBoard', () => {
    expect(classifySkull({ x: 0.5, y: P.boardTopY + r, z: 0 }, P)).toBe('onBoard');
  });

  it('classifies board-height, inside the base outline as inTower (under-base / archway)', () => {
    expect(classifySkull({ x: 0.2, y: P.boardTopY + r, z: 0 }, P)).toBe('inTower');
  });

  it('stays in the board-height band at the boundary (boardTopY + 1.5r)', () => {
    const y = P.boardTopY + r * ON_BOARD_HEIGHT_FACTOR;
    expect(classifySkull({ x: 0.5, y, z: 0 }, P)).toBe('onBoard');
  });

  it('falls through to mid-height rules just past the board-height boundary (bounce)', () => {
    const y = P.boardTopY + r * (ON_BOARD_HEIGHT_FACTOR + 0.01);
    // Outside the boundary and outside shellRadius: mid-height inTransit,
    // not onBoard — this is the "bounce" case the boundary excludes.
    expect(classifySkull({ x: 0.5, y, z: 0 }, P)).toBe('inTransit');
  });

  it('classifies below-board as inTransit regardless of radial position (rule ordering)', () => {
    const y = P.boardTopY - 2 * r;
    expect(classifySkull({ x: 0, y, z: 0 }, P)).toBe('inTransit'); // radial 0, inside base
    expect(classifySkull({ x: 0.5, y, z: 0 }, P)).toBe('inTransit'); // radial outside base
  });
});

describe('aggregateSkullCounts', () => {
  it('returns all zeros for an empty world, passing pending through unchanged', () => {
    expect(aggregateSkullCounts([], P, 3)).toEqual({
      total: 0,
      inTower: 0,
      onBoard: 0,
      inTransit: 0,
      pending: 3,
    });
  });

  it('buckets a one-of-each mix correctly', () => {
    const positions = [
      { x: 0.1, y: 0, z: 0 }, // inTower (mid-height, inside shell)
      { x: 0.5, y: P.boardTopY + r, z: 0 }, // onBoard
      { x: 0.5, y: 0, z: 0 }, // inTransit (mid-height, outside shell)
    ];
    expect(aggregateSkullCounts(positions, P, 0)).toEqual({
      total: 3,
      inTower: 1,
      onBoard: 1,
      inTransit: 1,
      pending: 0,
    });
  });

  it('handles a maxCount-shaped load of settled on-board skulls', () => {
    const positions = Array.from({ length: 30 }, (_, i) => ({
      x: 0.5 + i * 0.001,
      y: P.boardTopY + r,
      z: 0,
    }));
    const counts = aggregateSkullCounts(positions, P, 0);
    expect(counts.total).toBe(30);
    expect(counts.onBoard).toBe(30);
    expect(counts.inTower).toBe(0);
    expect(counts.inTransit).toBe(0);
  });

  it('always partitions total into inTower + onBoard + inTransit across a varied batch', () => {
    const positions: Array<{ x: number; y: number; z: number }> = [];
    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j++) {
        positions.push({ x: i * 0.15, y: j * 0.3, z: -i * 0.1 });
      }
    }
    const counts = aggregateSkullCounts(positions, P, 0);
    expect(counts.total).toBe(positions.length);
    expect(counts.inTower + counts.onBoard + counts.inTransit).toBe(counts.total);
  });

  it('never folds pending into total', () => {
    const counts = aggregateSkullCounts(
      [
        { x: 0.1, y: 0, z: 0 },
        { x: 0.1, y: 0, z: 0 },
      ],
      P,
      5,
    );
    expect(counts.total).toBe(2);
    expect(counts.pending).toBe(5);
  });
});

describe('PhysicsManager.getSkullCounts (pre-init)', () => {
  it('returns all zeros before init() has resolved', () => {
    const hooks: TowerPhysicsHooks = {
      scene: new THREE.Scene(),
      drumNode: () => null,
      onFrame: () => () => {},
      onSealsApplied: () => () => {},
      onStateApplied: () => () => {},
      onModelLoaded: () => () => {},
      modelRadius: 1,
      modelBottomY: -1,
      modelTopY: 1,
    };
    const manager = new PhysicsManager(hooks);
    expect(manager.getSkullCounts()).toEqual({
      total: 0,
      inTower: 0,
      onBoard: 0,
      inTransit: 0,
      pending: 0,
    });
  });
});
