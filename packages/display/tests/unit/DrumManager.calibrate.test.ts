/** @jest-environment jsdom */
import * as THREE from 'three';
import * as gsapMock from '../__mocks__/gsap.js';
import { DrumManager } from '../../src/3d/DrumManager';

function makeDrumNode(name: string): THREE.Mesh {
  const node = new THREE.Mesh();
  // The Three.js mock doesn't initialize `name`; real three.js defaults to ''.
  (node as unknown as { name: string }).name = name;
  return node;
}

function makeRoot(names: readonly string[]): THREE.Mesh {
  const root = new THREE.Mesh();
  (root as unknown as { name: string }).name = 'root';
  for (const n of names) root.add(makeDrumNode(n));
  return root;
}

describe('DrumManager.calibrateDrum', () => {
  beforeEach(() => {
    gsapMock.__reset();
  });

  it('schedules a homing tween to position 0 plus one full turn (-2π)', () => {
    const mgr = new DrumManager();
    mgr.buildDrumNodes(makeRoot(['drum_top']));

    void mgr.calibrateDrum('top');

    const tweens = gsapMock.__getTweens();
    expect(tweens).toHaveLength(1);
    // finalY = currentY(0) + shortestArc(0→0)=0 + DRUM_RADIANS_PER_SIDE*4 (= -2π)
    expect(tweens[0].vars.currentY).toBeCloseTo(-Math.PI * 2, 5);
  });

  it('resolves immediately when the requested level is absent from the model', async () => {
    const mgr = new DrumManager();
    await expect(mgr.calibrateDrum('middle')).resolves.toBeUndefined();
  });
});
