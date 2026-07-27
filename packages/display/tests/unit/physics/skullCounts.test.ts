import * as THREE from 'three';
import {
  classifySkull,
  aggregateSkullCounts,
  bucketSkullsByPocket,
  bucketSkullsByNearestSeal,
  resolveSealRemovalShake,
  ON_BOARD_HEIGHT_FACTOR,
  type SkullClassifyParams,
  type SealPocket,
  type SealAnchor,
  type SealSkullBucket,
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

  it('used as a filter (shakeSkulls scope), keeps only inTower positions out of a mixed batch', () => {
    // Mirrors PhysicsManager.shakeSkulls(): classify, then keep inTower only.
    // onBoard and inTransit skulls must be untouched by a shake.
    const positions = [
      { x: 0.1, y: 0, z: 0 }, // inTower (mid-height, inside shell)
      { x: 0.5, y: P.boardTopY + r, z: 0 }, // onBoard
      { x: 0.5, y: 0, z: 0 }, // inTransit (mid-height, outside shell)
      { x: 0.2, y: P.boardTopY + r, z: 0 }, // inTower (under-base / archway)
    ];
    const inTowerOnly = positions.filter((p) => classifySkull(p, P) === 'inTower');
    expect(inTowerOnly).toEqual([positions[0], positions[3]]);
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

// Large-radius params so mid-height (y=0) test skulls at world radii up to
// ~10 classify as inTower regardless of the pocket/anchor logic under test —
// decoupling classifySkull's own radial rule from seal attribution.
const SEAL_TEST_P: SkullClassifyParams = {
  shellRadius: 10,
  baseRadiusAtBoard: 10,
  boardTopY: -10,
  modelTopY: 10,
  skullRadius: 0.1,
};

/** Column-major (`Matrix4.toArray()` order) inverse-world for a pure translation. */
function translationInverse(tx: number, ty: number, tz: number): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -tx, -ty, -tz, 1];
}

/**
 * Column-major inverse-world for a node rotated 90° about Y (no translation):
 * forward maps local(x,y,z) -> world(z,y,-x), so this inverse maps
 * world(X,Y,Z) -> local(-Z,Y,X). Hand-derived and cross-checked against
 * `THREE.Matrix4.makeRotationY(Math.PI / 2)`.
 */
const ROTATE_Y_90_INVERSE = [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1];

describe('bucketSkullsByPocket', () => {
  it('attributes a skull inside a translated pocket box; just outside is unattributed', () => {
    const pocket: SealPocket = {
      side: 'north',
      level: 'top',
      broken: false,
      inverseWorld: translationInverse(5, 0, 0),
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    };
    const inside = { id: 1, x: 5.2, y: 0, z: 0 }; // local (0.2, 0, 0) — inside
    const outside = { id: 2, x: 6.5, y: 0, z: 0 }; // local (1.5, 0, 0) — outside

    const result = bucketSkullsByPocket([inside, outside], [pocket], SEAL_TEST_P);
    expect(result.mode).toBe('pocket');
    expect(result.bySeal).toEqual([{ side: 'north', level: 'top', broken: false, ids: [1] }]);
    expect(result.unattributed).toEqual([2]);
    expect(result.total).toBe(2);
  });

  it('a rotated inverseWorld correctly maps a world skull into the pocket local frame', () => {
    // Pocket sits along local +X (3..5); rotated 90° about Y, that volume's
    // world location is along -Z (world (0,0,-4) is the box center). A
    // skull there must be attributed using the rotation, not just identity.
    const pocket: SealPocket = {
      side: 'south',
      level: 'middle',
      broken: false,
      inverseWorld: ROTATE_Y_90_INVERSE,
      min: { x: 3, y: -1, z: -1 },
      max: { x: 5, y: 1, z: 1 },
    };
    const skullAtPocket = { id: 1, x: 0, y: 0, z: -4 };
    const result = bucketSkullsByPocket([skullAtPocket], [pocket], SEAL_TEST_P);
    expect(result.bySeal[0].ids).toEqual([1]);
    expect(result.unattributed).toEqual([]);
  });

  it('regression: static pockets, a skull carried around by a rotating drum moves buckets', () => {
    const pocketA: SealPocket = {
      side: 'north',
      level: 'top',
      broken: false,
      inverseWorld: translationInverse(5, 0, 0),
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    };
    const pocketB: SealPocket = {
      side: 'east',
      level: 'top',
      broken: false,
      inverseWorld: translationInverse(0, 0, 5),
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    };

    // Before rotation: skull sits at pocketA's world position.
    const before = bucketSkullsByPocket(
      [{ id: 1, x: 5, y: 0, z: 0 }],
      [pocketA, pocketB],
      SEAL_TEST_P,
    );
    expect(before.bySeal[0].ids).toEqual([1]);
    expect(before.bySeal[1].ids).toEqual([]);

    // After the drum carries it 90°: same pockets (static), skull now at
    // pocketB's world position. Attribution follows the skull, not a fixed
    // cardinal mapping.
    const after = bucketSkullsByPocket(
      [{ id: 1, x: 0, y: 0, z: 5 }],
      [pocketA, pocketB],
      SEAL_TEST_P,
    );
    expect(after.bySeal[0].ids).toEqual([]);
    expect(after.bySeal[1].ids).toEqual([1]);
  });

  it('passes broken through to the bucket, excludes onBoard/inTransit skulls, and keeps ids ascending', () => {
    const pocket: SealPocket = {
      side: 'west',
      level: 'bottom',
      broken: true,
      inverseWorld: translationInverse(0, 0, 0),
      min: { x: -2, y: -2, z: -2 },
      max: { x: 2, y: 2, z: 2 },
    };
    const skulls = [
      { id: 1, x: 0.1, y: 0, z: 0 }, // inTower, in box (append order == ascending id)
      { id: 3, x: 0.2, y: 0, z: 0 }, // inTower, in box, appended after id 1
      { id: 99, x: 0.5, y: SEAL_TEST_P.boardTopY + SEAL_TEST_P.skullRadius, z: 20 }, // onBoard
    ];
    const result = bucketSkullsByPocket(skulls, [pocket], SEAL_TEST_P);
    // Neither function sorts — it preserves input order. Real callers
    // (PhysicsManager.skulls) always append in ascending-id order, so
    // feeding ascending input here demonstrates the ids stay ascending out.
    expect(result.bySeal).toEqual([{ side: 'west', level: 'bottom', broken: true, ids: [1, 3] }]);
    expect(result.total).toBe(2); // the onBoard skull is excluded
    expect(result.bySeal.reduce((n, b) => n + b.ids.length, 0) + result.unattributed.length).toBe(
      result.total,
    );
  });
});

describe('bucketSkullsByNearestSeal', () => {
  const anchors: SealAnchor[] = [
    { side: 'north', level: 'top', broken: false, x: 5, y: 0, z: 0 },
    { side: 'east', level: 'top', broken: false, x: 0, y: 0, z: 5 },
    { side: 'south', level: 'top', broken: false, x: -5, y: 0, z: 0 },
    { side: 'west', level: 'top', broken: false, x: 0, y: 0, z: -5 },
  ];

  it('attributes each skull to its nearest anchor', () => {
    const skulls = [
      { id: 1, x: 5.1, y: 0, z: 0 },
      { id: 2, x: 0, y: 0, z: 5.1 },
      { id: 3, x: -5.1, y: 0, z: 0 },
      { id: 4, x: 0, y: 0, z: -5.1 },
    ];
    const result = bucketSkullsByNearestSeal(skulls, anchors, SEAL_TEST_P, 1);
    expect(result.mode).toBe('nearest');
    expect(result.bySeal.map((b) => b.ids)).toEqual([[1], [2], [3], [4]]);
    expect(result.unattributed).toEqual([]);
  });

  it('a skull on the central axis, beyond maxDistance of every anchor, is unattributed', () => {
    const result = bucketSkullsByNearestSeal(
      [{ id: 1, x: 0, y: 0, z: 0 }],
      anchors,
      SEAL_TEST_P,
      1,
    );
    expect(result.bySeal.every((b) => b.ids.length === 0)).toBe(true);
    expect(result.unattributed).toEqual([1]);
  });

  it('regression: static anchors, a skull carried around by a rotating drum moves buckets', () => {
    const before = bucketSkullsByNearestSeal(
      [{ id: 1, x: 5, y: 0, z: 0 }],
      anchors,
      SEAL_TEST_P,
      1,
    );
    expect(before.bySeal[0].ids).toEqual([1]);

    const after = bucketSkullsByNearestSeal([{ id: 1, x: 0, y: 0, z: 5 }], anchors, SEAL_TEST_P, 1);
    expect(after.bySeal[0].ids).toEqual([]);
    expect(after.bySeal[1].ids).toEqual([1]);
  });

  it('passes broken through to the bucket and keeps ids ascending across a mixed batch', () => {
    const brokenAnchors: SealAnchor[] = [{ ...anchors[0], broken: true }, ...anchors.slice(1)];
    // Ascending append order, matching how PhysicsManager.skulls is always ordered.
    const skulls = [
      { id: 2, x: 5.1, y: 0, z: 0 },
      { id: 5, x: 5.2, y: 0, z: 0 },
    ];
    const result = bucketSkullsByNearestSeal(skulls, brokenAnchors, SEAL_TEST_P, 1);
    expect(result.bySeal[0]).toEqual({ side: 'north', level: 'top', broken: true, ids: [2, 5] });
    expect(result.bySeal.reduce((n, b) => n + b.ids.length, 0) + result.unattributed.length).toBe(
      result.total,
    );
  });
});

describe('resolveSealRemovalShake', () => {
  const bySeal: SealSkullBucket[] = [
    { side: 'north', level: 'top', broken: true, ids: [1, 2] },
    { side: 'east', level: 'top', broken: false, ids: [3] },
  ];
  const northTop = (seal: { side: string; level: string }) =>
    seal.side === 'north' && seal.level === 'top';

  it('returns null when disabled', () => {
    expect(resolveSealRemovalShake(false, northTop, () => bySeal, 3)).toBeNull();
  });

  it('defaults to mode "nearest", ambient strength, and only the newly-broken seal\'s ids', () => {
    const result = resolveSealRemovalShake(true, northTop, () => bySeal, 3);
    expect(result).toEqual({ mode: 'nearest', ids: [1, 2], strength: 3 });
  });

  it('returns null for "nearest" when no seal matches the predicate', () => {
    const result = resolveSealRemovalShake(
      true,
      () => false,
      () => bySeal,
      3,
    );
    expect(result).toBeNull();
  });

  it('mode "all" never calls getBySeal and carries no ids', () => {
    const getBySeal = vi.fn(() => bySeal);
    const result = resolveSealRemovalShake({ mode: 'all' }, northTop, getBySeal, 3);
    expect(result).toEqual({ mode: 'all', ids: [], strength: 3 });
    expect(getBySeal).not.toHaveBeenCalled();
  });

  it('an explicit shake.strength overrides the ambient skull.shakeStrength', () => {
    const result = resolveSealRemovalShake({ shake: { strength: 9 } }, northTop, () => bySeal, 3);
    expect(result).toEqual({ mode: 'nearest', ids: [1, 2], strength: 9 });
  });

  it('flattens ids across multiple seals matching the predicate', () => {
    const bothBroken = [{ ...bySeal[0] }, { ...bySeal[1], broken: true }];
    const result = resolveSealRemovalShake(
      true,
      () => true,
      () => bothBroken,
      3,
    );
    expect(result).toEqual({ mode: 'nearest', ids: [1, 2, 3], strength: 3 });
  });
});

describe('PhysicsManager (pre-init)', () => {
  function makeHooks(): TowerPhysicsHooks {
    return {
      scene: new THREE.Scene(),
      drumNode: () => null,
      onFrame: () => () => {},
      onSealsApplied: () => () => {},
      onStateApplied: () => () => {},
      onModelLoaded: () => () => {},
      modelRadius: 1,
      modelBottomY: -1,
      modelTopY: 1,
      registerPointerTarget: () => () => {},
    };
  }

  it('getSkullCounts returns all zeros before init() has resolved', () => {
    const manager = new PhysicsManager(makeHooks());
    expect(manager.getSkullCounts()).toEqual({
      total: 0,
      inTower: 0,
      onBoard: 0,
      inTransit: 0,
      pending: 0,
    });
  });

  it('dropSkull queues the drop and returns null before init() has resolved', () => {
    const manager = new PhysicsManager(makeHooks());
    expect(manager.dropSkull()).toBeNull();
    expect(manager.getSkullCounts().pending).toBe(1);
  });

  it('shakeSkulls and shakeSelectedSkull (single id or array) are no-ops before init() has resolved', () => {
    const manager = new PhysicsManager(makeHooks());
    // Neither should throw despite there being no Rapier world yet.
    expect(() => manager.shakeSkulls()).not.toThrow();
    expect(() => manager.shakeSelectedSkull(1)).not.toThrow();
    expect(() => manager.shakeSelectedSkull([1, 2])).not.toThrow();
    expect(() => manager.shakeSelectedSkull([])).not.toThrow();
  });

  it('getSkullsBySeal returns empty pocket-less, nearest-mode buckets before init() has resolved', () => {
    const manager = new PhysicsManager(makeHooks());
    expect(manager.getSkullsBySeal()).toEqual({
      bySeal: [],
      unattributed: [],
      total: 0,
      mode: 'nearest',
    });
  });

  it('getSkullIdForObject delegates to the pure walk-up helper', () => {
    const manager = new PhysicsManager(makeHooks());
    const tagged = { userData: { skullId: 9 }, parent: null } as unknown as THREE.Object3D;
    const untagged = { userData: {}, parent: null } as unknown as THREE.Object3D;
    expect(manager.getSkullIdForObject(tagged)).toBe(9);
    expect(manager.getSkullIdForObject(untagged)).toBeNull();
  });

  it('dispose is safe to call before init() has resolved and again after', () => {
    const manager = new PhysicsManager(makeHooks());
    expect(() => manager.dispose()).not.toThrow();
    expect(() => manager.dispose()).not.toThrow();
  });
});
