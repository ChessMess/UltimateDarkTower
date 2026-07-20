import type { Mock } from 'vitest';
import { buildHullColliderDesc, cloneSkullMesh } from '../../../src/physics/SkullSpawner';

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
