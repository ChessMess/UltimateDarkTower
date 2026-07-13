import * as THREE from 'three';
import { anchorToWorld, type DiscMetrics } from '../../src/3d/boardMapping';
import { getBoardTextureRotation } from '../../src/3d/boardTextureRotation';
import type { Tower3DView } from '../../src/3d/Tower3DView';

const disc: DiscMetrics = {
  center: new THREE.Vector3(0, 0, 0),
  radius: 10,
  topY: 1,
};

const KINGDOMS = [0, 1, 2, 3] as const;

describe('anchorToWorld', () => {
  it('maps the image center to the disc center, at topY, for every northKingdom', () => {
    for (const nk of KINGDOMS) {
      const p = anchorToWorld({ x: 0.5, y: 0.5 }, disc, nk);
      expect(p.x).toBeCloseTo(disc.center.x, 10);
      expect(p.z).toBeCloseTo(disc.center.z, 10);
      expect(p.y).toBeCloseTo(disc.topY, 10);
    }
  });

  it('inverts the exact render transform (round-trip lock)', () => {
    // Run the render path forward for points inside the disc — using THREE's
    // documented conventions encoded as plain arithmetic (verified against the
    // installed three source: CylinderGeometry cap UVs and Matrix3.setUvTransform)
    // — then assert anchorToWorld recovers the original world (x, z). The forward
    // code is written independently of anchorToWorld's inverse, so a sign/axis/
    // scale error in the function is caught. (`three` is mocked in this suite, so
    // we can't instantiate the real geometry.)
    const samples = [
      [0, 0],
      [3, 0],
      [0, 4],
      [-2.5, 1.5],
      [6, -7],
      [-8, -2],
    ];
    for (const nk of KINGDOMS) {
      const R = getBoardTextureRotation(nk);
      const c = Math.cos(R);
      const s = Math.sin(R);
      for (const [px, pz] of samples) {
        // THREE CylinderGeometry top-cap layout: uv.x = 0.5 + 0.5·z/r,
        // uv.y = 0.5 + 0.5·x/r (vertex.x = r·sinθ, vertex.z = r·cosθ).
        const gu = 0.5 + 0.5 * (pz / disc.radius);
        const gv = 0.5 + 0.5 * (px / disc.radius);
        // Matrix3.setUvTransform(0,0,1,1,R,0.5,0.5) applied to (gu, gv):
        const texU = c * gu + s * gv + (0.5 - 0.5 * c - 0.5 * s);
        const texV = -s * gu + c * gv + (0.5 + 0.5 * s - 0.5 * c);
        // texture.flipY = true  =>  imageY = 1 - textureV.
        const p = anchorToWorld({ x: texU, y: 1 - texV }, disc, nk);
        expect(p.x).toBeCloseTo(disc.center.x + px, 9);
        expect(p.z).toBeCloseTo(disc.center.z + pz, 9);
        expect(p.y).toBeCloseTo(disc.topY, 10);
      }
    }
  });

  it('is resolution-independent: offsets scale linearly with disc radius', () => {
    const anchor = { x: 0.72, y: 0.18 };
    const big: DiscMetrics = { center: new THREE.Vector3(0, 0, 0), radius: 20, topY: 1 };
    const p10 = anchorToWorld(anchor, disc, 0);
    const p20 = anchorToWorld(anchor, big, 0);
    expect(p20.x - big.center.x).toBeCloseTo(2 * (p10.x - disc.center.x), 9);
    expect(p20.z - big.center.z).toBeCloseTo(2 * (p10.z - disc.center.z), 9);
  });

  it('honors the disc center offset (translation only, no scale change)', () => {
    const anchor = { x: 0.3, y: 0.85 };
    const shifted: DiscMetrics = { center: new THREE.Vector3(5, 2, -3), radius: 10, topY: 2 };
    const base = anchorToWorld(anchor, disc, 0);
    const off = anchorToWorld(anchor, shifted, 0);
    expect(off.x - shifted.center.x).toBeCloseTo(base.x - disc.center.x, 9);
    expect(off.z - shifted.center.z).toBeCloseTo(base.z - disc.center.z, 9);
    expect(off.y).toBeCloseTo(shifted.topY, 10);
  });

  it('the view overload agrees with the core overload (reads northKingdom from the view)', () => {
    const anchor = { x: 0.31, y: 0.67 };
    for (const nk of KINGDOMS) {
      const stub = {
        getDiscMetrics: () => disc,
        getLightingConfig: () => ({ boardDisc: { northKingdom: nk } }),
      } as unknown as Tower3DView;
      const viaView = anchorToWorld(anchor, stub);
      const viaCore = anchorToWorld(anchor, disc, nk);
      expect(viaView.x).toBeCloseTo(viaCore.x, 12);
      expect(viaView.y).toBeCloseTo(viaCore.y, 12);
      expect(viaView.z).toBeCloseTo(viaCore.z, 12);
    }
  });

  it('defaults northKingdom to 0 when omitted', () => {
    const anchor = { x: 0.4, y: 0.6 };
    const omitted = anchorToWorld(anchor, disc);
    const explicit = anchorToWorld(anchor, disc, 0);
    expect(omitted.x).toBeCloseTo(explicit.x, 12);
    expect(omitted.z).toBeCloseTo(explicit.z, 12);
  });
});
