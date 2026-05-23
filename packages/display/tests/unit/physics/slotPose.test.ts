import { slotPose, SLOT_HOME_AZIMUTHS } from '../../../src/physics/slotPose';

const EPS = 1e-9;

function expectClose(actual: number, expected: number, eps = EPS): void {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`expected ${actual} ≈ ${expected} (diff ${Math.abs(actual - expected)})`);
  }
}

describe('slotPose', () => {
  describe('at drumAngle = 0 (home rotation)', () => {
    it('places slot 0 (north) on +Z', () => {
      const pose = slotPose(0, 0, 0.3, 0.83);
      expectClose(pose.x, 0);
      expectClose(pose.z, 0.3);
      expectClose(pose.y, 0.83);
    });

    it('places slot 1 (east) on +X', () => {
      const pose = slotPose(0, 1, 0.3, 0.5);
      expectClose(pose.x, 0.3);
      expectClose(pose.z, 0, 1e-15);
    });

    it('places slot 2 (south) on -Z', () => {
      const pose = slotPose(0, 2, 0.3, 0.5);
      expectClose(pose.x, 0, 1e-15);
      expectClose(pose.z, -0.3);
    });

    it('places slot 3 (west) on -X', () => {
      const pose = slotPose(0, 3, 0.3, 0.5);
      expectClose(pose.x, -0.3);
      expectClose(pose.z, 0, 1e-15);
    });
  });

  describe('quaternion encodes a Y-axis rotation by the slot azimuth', () => {
    it('returns the identity quaternion for slot 0 at drumAngle 0', () => {
      const pose = slotPose(0, 0, 0.3, 0);
      expectClose(pose.qx, 0);
      expectClose(pose.qy, 0);
      expectClose(pose.qz, 0);
      expectClose(pose.qw, 1);
    });

    it('returns sin/cos of half-azimuth on (qy, qw) and zero on (qx, qz)', () => {
      for (let slot = 0 as 0 | 1 | 2 | 3; slot <= 3; slot = (slot + 1) as 0 | 1 | 2 | 3) {
        const drumAngle = 0.7;
        const expectedAzimuth = SLOT_HOME_AZIMUTHS[slot] + drumAngle;
        const pose = slotPose(drumAngle, slot, 0.3, 0);
        expectClose(pose.qx, 0);
        expectClose(pose.qz, 0);
        expectClose(pose.qy, Math.sin(expectedAzimuth / 2));
        expectClose(pose.qw, Math.cos(expectedAzimuth / 2));
        if (slot === 3) break;
      }
    });

    it('returned quaternions are unit length', () => {
      const drumAngles = [0, 0.3, 1.0, Math.PI, -Math.PI / 2];
      for (const a of drumAngles) {
        for (let slot = 0; slot < 4; slot++) {
          const p = slotPose(a, slot as 0 | 1 | 2 | 3, 0.3, 0);
          const len2 = p.qx * p.qx + p.qy * p.qy + p.qz * p.qz + p.qw * p.qw;
          expectClose(len2, 1);
        }
      }
    });
  });

  describe('drum rotation moves slot positions consistently', () => {
    it('rotating drum by π/2 moves slot 0 from +Z to +X', () => {
      const pose = slotPose(Math.PI / 2, 0, 0.3, 0);
      expectClose(pose.x, 0.3);
      expectClose(pose.z, 0, 1e-15);
    });

    it('all four slots remain on a circle of the inner radius at any drumAngle', () => {
      const drumAngles = [0.0, 0.3, 1.0, Math.PI, -Math.PI / 2];
      for (const a of drumAngles) {
        for (let slot = 0; slot < 4; slot++) {
          const p = slotPose(a, slot as 0 | 1 | 2 | 3, 0.3, 0);
          const r2 = p.x * p.x + p.z * p.z;
          expectClose(r2, 0.09); // 0.3^2
        }
      }
    });

    it('positions are 2π-periodic in drumAngle', () => {
      for (let slot = 0; slot < 4; slot++) {
        const a = 0.42;
        const p1 = slotPose(a, slot as 0 | 1 | 2 | 3, 0.3, 0);
        const p2 = slotPose(a + Math.PI * 2, slot as 0 | 1 | 2 | 3, 0.3, 0);
        expectClose(p1.x, p2.x);
        expectClose(p1.z, p2.z);
      }
    });
  });
});
