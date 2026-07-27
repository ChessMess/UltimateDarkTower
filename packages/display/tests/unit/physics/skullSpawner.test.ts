import type { Mock } from 'vitest';
import {
  buildHullColliderDesc,
  cloneSkullMesh,
  computeShakeImpulse,
  findSkullIdForObject,
} from '../../../src/physics/SkullSpawner';

/**
 * Minimal Rapier stand-in. Only the surface the spawner touches:
 * `ColliderDesc.convexHull` and the chainable `setFriction` /
 * `setRestitution` / `setDensity` setters.
 */
function makeMockRapier(): {
  RAPIER: Parameters<typeof buildHullColliderDesc>[0];
  hullSpy: Mock;
  setFrictionSpy: Mock;
  setRestitutionSpy: Mock;
  setDensitySpy: Mock;
  shouldReturnNull: { value: boolean };
} {
  const setDensitySpy = vi.fn().mockReturnThis();
  const setRestitutionSpy = vi.fn(function (this: unknown) {
    return this;
  });
  const setFrictionSpy = vi.fn(function (this: unknown) {
    return this;
  });

  const chainable = {
    setFriction: setFrictionSpy,
    setRestitution: setRestitutionSpy,
    setDensity: setDensitySpy,
  };
  // Bind `this` so chained returns surface the spies.
  setFrictionSpy.mockImplementation(() => chainable);
  setRestitutionSpy.mockImplementation(() => chainable);
  setDensitySpy.mockImplementation(() => chainable);

  const shouldReturnNull = { value: false };
  const hullSpy = vi.fn().mockImplementation(() => (shouldReturnNull.value ? null : chainable));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RAPIER = { ColliderDesc: { convexHull: hullSpy } } as any;
  return { RAPIER, hullSpy, setFrictionSpy, setRestitutionSpy, setDensitySpy, shouldReturnNull };
}

describe('buildHullColliderDesc', () => {
  it('scales every point by radius before handing to Rapier', () => {
    const { RAPIER, hullSpy } = makeMockRapier();
    const pts = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    buildHullColliderDesc(RAPIER, pts, 2, 0.5, 0.1, 1);

    expect(hullSpy).toHaveBeenCalledTimes(1);
    const passed = hullSpy.mock.calls[0][0] as Float32Array;
    expect(Array.from(passed)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
  });

  it('returns null when Rapier rejects the hull (degenerate input)', () => {
    const { RAPIER, shouldReturnNull } = makeMockRapier();
    shouldReturnNull.value = true;
    const pts = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(buildHullColliderDesc(RAPIER, pts, 1, 0.5, 0.1, 1)).toBeNull();
  });

  it('returns null when fewer than 4 points are supplied', () => {
    const { RAPIER, hullSpy } = makeMockRapier();
    const pts = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]); // 3 points
    expect(buildHullColliderDesc(RAPIER, pts, 1, 0.5, 0.1, 1)).toBeNull();
    expect(hullSpy).not.toHaveBeenCalled();
  });

  it('sets friction, restitution, and density on the returned desc', () => {
    const m = makeMockRapier();
    const pts = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, -1, -1, -1]);
    buildHullColliderDesc(m.RAPIER, pts, 1, 0.75, 0.25, 2.5);

    expect(m.setFrictionSpy).toHaveBeenCalledWith(0.75);
    expect(m.setRestitutionSpy).toHaveBeenCalledWith(0.25);
    expect(m.setDensitySpy).toHaveBeenCalledWith(2.5);
  });
});

describe('cloneSkullMesh', () => {
  // Test against the Object3D contract — the jest three-mock doesn't ship a
  // real BufferGeometry/clone implementation, but the function only relies
  // on .clone(recursive) returning something with a .scale.setScalar() method.

  interface CloneStub {
    geometry?: unknown;
    material?: unknown;
    children: CloneStub[];
    scale: { setScalar: (v: number) => void; x: number; y: number; z: number };
    cloneArg?: boolean;
    clone(recursive?: boolean): CloneStub;
  }

  function makeStub(geometry?: unknown, material?: unknown): CloneStub {
    const scaleVal = { x: 1, y: 1, z: 1 };
    const stub: CloneStub = {
      geometry,
      material,
      children: [],
      scale: {
        ...scaleVal,
        setScalar(v: number) {
          this.x = v;
          this.y = v;
          this.z = v;
        },
      },
      clone(recursive?: boolean): CloneStub {
        const c = makeStub(geometry, material);
        c.cloneArg = recursive;
        if (recursive) {
          c.children = this.children.map((child) => child.clone(true));
        }
        return c;
      },
    };
    return stub;
  }

  it('calls clone(true) on the template, then scales the clone uniformly', () => {
    const geom = { id: 'geom' };
    const mat = { id: 'mat' };
    const template = makeStub(geom, mat);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone = cloneSkullMesh(template as any, 0.05) as any;

    expect(clone).not.toBe(template);
    expect(clone.cloneArg).toBe(true);
    expect(clone.scale.x).toBeCloseTo(0.05);
    expect(clone.scale.y).toBeCloseTo(0.05);
    expect(clone.scale.z).toBeCloseTo(0.05);
    expect(clone.geometry).toBe(geom);
    expect(clone.material).toBe(mat);
  });

  it('preserves a child hierarchy through the recursive clone', () => {
    const parent = makeStub();
    const childGeom = { id: 'child-geom' };
    const childMat = { id: 'child-mat' };
    parent.children.push(makeStub(childGeom, childMat));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone = cloneSkullMesh(parent as any, 2) as any;

    expect(clone.children).toHaveLength(1);
    expect(clone.children[0].geometry).toBe(childGeom);
    expect(clone.children[0].material).toBe(childMat);
    expect(clone.scale.x).toBe(2);
  });
});

describe('computeShakeImpulse', () => {
  const fixedRng = (): number => 0.5; // all torque randoms mid-range
  // Matches DEFAULT_PHYSICS.skull.{shakeHorizontalFactor,shakeUpwardFactor}.
  const H = 0.5;
  const U = 0.45;

  it('scales linear impulse magnitude with mass, modelRadius, and strength', () => {
    const pos = { x: 1, z: 0 };
    const a = computeShakeImpulse(1, 1, 1, pos, H, U, fixedRng);
    const b = computeShakeImpulse(2, 1, 1, pos, H, U, fixedRng);
    const c = computeShakeImpulse(1, 2, 1, pos, H, U, fixedRng);
    const d = computeShakeImpulse(1, 1, 2, pos, H, U, fixedRng);

    const mag = (v: { x: number; y: number; z: number }): number => Math.hypot(v.x, v.y, v.z);

    expect(mag(b.linear)).toBeCloseTo(mag(a.linear) * 2, 10);
    expect(mag(c.linear)).toBeCloseTo(mag(a.linear) * 2, 10);
    expect(mag(d.linear)).toBeCloseTo(mag(a.linear) * 2, 10);
  });

  it('points the horizontal impulse away from the tower center, through the given position', () => {
    const east = computeShakeImpulse(1, 1, 1, { x: 5, z: 0 }, H, U, fixedRng);
    expect(east.linear.x).toBeGreaterThan(0);
    expect(east.linear.z).toBeCloseTo(0, 10);

    const north = computeShakeImpulse(1, 1, 1, { x: 0, z: 5 }, H, U, fixedRng);
    expect(north.linear.x).toBeCloseTo(0, 10);
    expect(north.linear.z).toBeGreaterThan(0);

    // On the opposite side of the axis, the push is in the opposite
    // direction too — always outward, never toward a fixed compass point.
    const west = computeShakeImpulse(1, 1, 1, { x: -5, z: 0 }, H, U, fixedRng);
    expect(west.linear.x).toBeLessThan(0);
  });

  it('gives the horizontal (outward) push more magnitude than the vertical lift at the default factors', () => {
    const { linear } = computeShakeImpulse(1, 1, 1, { x: 1, z: 0 }, H, U, fixedRng);
    expect(linear.y).toBeGreaterThan(0); // still some upward lift...
    expect(Math.hypot(linear.x, linear.z)).toBeGreaterThan(linear.y); // ...but outward dominates
  });

  it('shapes the impulse from horizontalFactor/upwardFactor, not fixed constants', () => {
    const impulseMag = 1; // mass=1 * modelRadius=1 * strength=1

    // Pure vertical: horizontalFactor 0 zeroes out the outward push entirely.
    const verticalOnly = computeShakeImpulse(1, 1, 1, { x: 1, z: 0 }, 0, 1, fixedRng);
    expect(verticalOnly.linear.x).toBeCloseTo(0, 10);
    expect(verticalOnly.linear.z).toBeCloseTo(0, 10);
    expect(verticalOnly.linear.y).toBeCloseTo(impulseMag, 10);

    // Pure horizontal: upwardFactor 0 zeroes out the lift entirely.
    const horizontalOnly = computeShakeImpulse(1, 1, 1, { x: 1, z: 0 }, 1, 0, fixedRng);
    expect(horizontalOnly.linear.y).toBeCloseTo(0, 10);
    expect(horizontalOnly.linear.x).toBeCloseTo(impulseMag, 10);
  });

  it('handles a skull on the central axis (x === z === 0) without NaN/Infinity', () => {
    const { linear } = computeShakeImpulse(1, 1, 1, { x: 0, z: 0 }, H, U, fixedRng);
    for (const v of [linear.x, linear.y, linear.z]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('is deterministic for a fixed rng; only the torque varies with a different rng', () => {
    const pos = { x: 1, z: 0 };
    const a = computeShakeImpulse(1, 1, 3, pos, H, U, () => 0.1);
    const b = computeShakeImpulse(1, 1, 3, pos, H, U, () => 0.1);
    const c = computeShakeImpulse(1, 1, 3, pos, H, U, () => 0.9);

    expect(a).toEqual(b);
    expect(a.linear).toEqual(c.linear); // direction is a function of position, not rng
    expect(a.torque).not.toEqual(c.torque);
  });

  it('produces a zero impulse for a massless body', () => {
    const { linear, torque } = computeShakeImpulse(0, 1, 5, { x: 1, z: 0 }, H, U, fixedRng);
    expect(linear).toEqual({ x: 0, y: 0, z: 0 });
    // toBeCloseTo (not toEqual) since (rng()*2-1)*0 can yield -0.
    for (const v of [torque.x, torque.y, torque.z]) {
      expect(v).toBeCloseTo(0, 10);
    }
  });

  it('defaults to Math.random when rng is omitted (does not throw, produces finite values)', () => {
    const { linear, torque } = computeShakeImpulse(1, 1, 3, { x: 1, z: 0 }, H, U);
    for (const v of [linear.x, linear.y, linear.z, torque.x, torque.y, torque.z]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('findSkullIdForObject', () => {
  interface StubObject3D {
    userData: Record<string, unknown>;
    parent: StubObject3D | null;
  }

  function makeStub(
    userData: Record<string, unknown> = {},
    parent: StubObject3D | null = null,
  ): StubObject3D {
    return { userData, parent };
  }

  it('returns the id directly tagged on the object', () => {
    const obj = makeStub({ skullId: 42 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(findSkullIdForObject(obj as any)).toBe(42);
  });

  it('walks up through untagged ancestors to find a tagged one', () => {
    const root = makeStub({ skullId: 7 });
    const mid = makeStub({}, root);
    const leaf = makeStub({}, mid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(findSkullIdForObject(leaf as any)).toBe(7);
  });

  it('returns null when no ancestor is tagged', () => {
    const root = makeStub({});
    const leaf = makeStub({}, root);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(findSkullIdForObject(leaf as any)).toBeNull();
  });

  it('returns null for an object with no userData at all', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(findSkullIdForObject({ parent: null } as any)).toBeNull();
  });

  it('ignores a non-numeric skullId value', () => {
    const obj = makeStub({ skullId: 'not-a-number' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(findSkullIdForObject(obj as any)).toBeNull();
  });
});
