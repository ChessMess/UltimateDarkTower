import * as THREE from 'three';
import type { TowerState } from 'ultimatedarktower';
import * as gsapMock from '../__mocks__/gsap.js';
import { DrumManager } from '../../src/3d/DrumManager';
import {
  DRUM_RADIANS_PER_SIDE,
  DRUM_ROTATION_EASE,
  drumRotationDurationS,
} from '../../src/3d/constants';

const TWO_PI = Math.PI * 2;

/** Two angles are visually equivalent if (a - b) is a multiple of 2π. */
function expectAngleEquivalent(actual: number, expected: number, eps = 1e-9): void {
  const diff = ((actual - expected) % TWO_PI + TWO_PI) % TWO_PI;
  const min = Math.min(diff, TWO_PI - diff);
  if (min > eps) {
    throw new Error(`angles not equivalent: ${actual} vs ${expected} (min mod-2π distance ${min})`);
  }
}

interface AudioStub {
  starts: number;
  ends: number;
  stopAlls: number;
  startRotation(): void;
  endRotation(): void;
  stopAll(): void;
}

function makeAudioStub(): AudioStub {
  return {
    starts: 0,
    ends: 0,
    stopAlls: 0,
    startRotation() { this.starts++; },
    endRotation() { this.ends++; },
    stopAll() { this.stopAlls++; },
  };
}

function makeDrumNode(name: string): THREE.Mesh {
  const node = new THREE.Mesh();
  // The Three.js mock doesn't initialize `name`; real three.js defaults to ''.
  (node as unknown as { name: string }).name = name;
  return node;
}

function makeRoot(drumNames: readonly string[]): THREE.Mesh {
  const root = new THREE.Mesh();
  (root as unknown as { name: string }).name = 'root';
  for (const name of drumNames) {
    root.add(makeDrumNode(name));
  }
  return root;
}

function makeDrums(positions: readonly [number, number, number]): TowerState['drum'] {
  return positions.map((position) => ({
    jammed: false,
    calibrated: true,
    position,
    playSound: false,
    reverse: false,
  })) as TowerState['drum'];
}

describe('DrumManager', () => {
  beforeEach(() => {
    gsapMock.__reset();
  });

  describe('buildDrumNodes', () => {
    it('registers all three named drum nodes', () => {
      const root = makeRoot(['drum_top', 'drum_middle', 'drum_bottom']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      expect(mgr.drumRefs.size).toBe(3);
      expect(mgr.drumRefs.get('top')).toBeDefined();
      expect(mgr.drumRefs.get('middle')).toBeDefined();
      expect(mgr.drumRefs.get('bottom')).toBeDefined();
    });

    it('seeds currentY from the node\'s existing rotation.y', () => {
      const root = makeRoot([]);
      const drum = makeDrumNode('drum_top');
      drum.rotation.y = 1.23;
      root.add(drum);

      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      expect(mgr.drumRefs.get('top')?.currentY).toBe(1.23);
    });

    it('ignores nodes whose name does not match the drum prefix or level', () => {
      const root = makeRoot(['drum_top', 'drum_unknown', 'something_else', 'seal_north_top']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      expect(mgr.drumRefs.size).toBe(1);
      expect(mgr.drumRefs.get('top')).toBeDefined();
    });

    it('getDrumNode returns the registered Object3D for a level or null', () => {
      const root = makeRoot(['drum_top', 'drum_bottom']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      const top = mgr.getDrumNode('top');
      expect(top).not.toBeNull();
      expect(top).toBe(mgr.drumRefs.get('top')!.node);

      expect(mgr.getDrumNode('middle')).toBeNull();
      expect(mgr.getDrumNode('bottom')).toBe(mgr.drumRefs.get('bottom')!.node);
    });

    it('warnOnMissing logs once per missing drum and is silent when all present', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const partial = new DrumManager();
        partial.buildDrumNodes(makeRoot(['drum_top']));
        partial.warnOnMissing();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toContain('drum_middle');
        expect(spy.mock.calls[0][0]).toContain('drum_bottom');

        spy.mockClear();
        const full = new DrumManager();
        full.buildDrumNodes(makeRoot(['drum_top', 'drum_middle', 'drum_bottom']));
        full.warnOnMissing();
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('applyDrums (animate: false)', () => {
    it('snaps each drum to a rotation visually equivalent to position * DRUM_RADIANS_PER_SIDE', () => {
      const root = makeRoot(['drum_top', 'drum_middle', 'drum_bottom']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([0, 1, 2]), { animate: false });

      expectAngleEquivalent(mgr.drumRefs.get('top')!.node.rotation.y, 0);
      expectAngleEquivalent(mgr.drumRefs.get('middle')!.node.rotation.y, DRUM_RADIANS_PER_SIDE);
      expectAngleEquivalent(mgr.drumRefs.get('bottom')!.node.rotation.y, 2 * DRUM_RADIANS_PER_SIDE);
    });

    it('does not schedule a tween or call audio', () => {
      const root = makeRoot(['drum_top']);
      const audio = makeAudioStub();
      const mgr = new DrumManager(audio);
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([2, 0, 0]), { animate: false });

      expect(gsapMock.__getTweens()).toHaveLength(0);
      expect(audio.starts).toBe(0);
    });

    it('takes the shortest arc — rotating from rest to position 3 turns +π/2, not -3π/2', () => {
      const root = makeRoot(['drum_top']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([3, 0, 0]), { animate: false });
      const afterThree = mgr.drumRefs.get('top')!.currentY;
      expect(Math.abs(afterThree)).toBeLessThanOrEqual(Math.PI + 1e-9);
      expectAngleEquivalent(afterThree, 3 * DRUM_RADIANS_PER_SIDE);

      mgr.applyDrums(makeDrums([0, 0, 0]), { animate: false });
      const afterZero = mgr.drumRefs.get('top')!.currentY;
      expect(Math.abs(afterZero - afterThree)).toBeLessThanOrEqual(Math.PI + 1e-9);
      expectAngleEquivalent(afterZero, 0);
    });
  });

  describe('applyDrums (animate: true)', () => {
    it('calls audio.startRotation once per drum that actually moves', () => {
      const root = makeRoot(['drum_top', 'drum_middle', 'drum_bottom']);
      const audio = makeAudioStub();
      const mgr = new DrumManager(audio);
      mgr.buildDrumNodes(root);

      // Two drums change (top, middle); bottom stays at 0.
      mgr.applyDrums(makeDrums([1, 2, 0]));

      expect(audio.starts).toBe(2);
    });

    it('does not call audio when delta is zero (drum already at target)', () => {
      const root = makeRoot(['drum_top']);
      const audio = makeAudioStub();
      const mgr = new DrumManager(audio);
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([0, 0, 0]));
      expect(audio.starts).toBe(0);
    });

    it('snaps (no audio) when the delta is sub-epsilon floating-point residue', () => {
      // Mirrors the post-calibration final-state apply: the drum is home but
      // carries tiny FP drift, which must not spawn a phantom tween + buzz.
      const root = makeRoot(['drum_top']);
      const node = root.children[0] as THREE.Object3D;
      node.rotation.y = 1e-6;
      const audio = makeAudioStub();
      const mgr = new DrumManager(audio);
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([0, 0, 0]));

      expect(audio.starts).toBe(0);
      expect(gsapMock.__getTweens()).toHaveLength(0);
    });

    it('schedules a gsap tween with the correct target value, duration, and ease', () => {
      const root = makeRoot(['drum_top']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([1, 0, 0]));

      const tweens = gsapMock.__getTweens();
      expect(tweens).toHaveLength(1);
      expect(tweens[0].vars.currentY).toBeCloseTo(DRUM_RADIANS_PER_SIDE, 10);
      // Duration scales with the rotation angle; a single side equals the per-side rate.
      expect(tweens[0].vars.duration).toBeCloseTo(drumRotationDurationS(DRUM_RADIANS_PER_SIDE), 10);
      expect(tweens[0].vars.ease).toBe(DRUM_ROTATION_EASE);
    });

    it('balances the audio refcount when a tween completes', () => {
      const root = makeRoot(['drum_top']);
      const audio = makeAudioStub();
      const mgr = new DrumManager(audio);
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([1, 0, 0]));
      const tween = gsapMock.__getTweens()[0];

      tween.vars.onComplete();
      expect(audio.ends).toBe(1);
    });

    it('balances the audio refcount when a tween is interrupted', () => {
      const root = makeRoot(['drum_top']);
      const audio = makeAudioStub();
      const mgr = new DrumManager(audio);
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([1, 0, 0]));
      const tween = gsapMock.__getTweens()[0];

      tween.vars.onInterrupt();
      expect(audio.ends).toBe(1);

      // onComplete after interrupt must not double-count.
      tween.vars.onComplete();
      expect(audio.ends).toBe(1);
    });
  });

  describe('stopAll / dispose', () => {
    it('stopAll kills any in-flight tweens', () => {
      const root = makeRoot(['drum_top']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);

      mgr.applyDrums(makeDrums([1, 0, 0]));
      const tween = gsapMock.__getTweens()[0];
      expect(tween.killed).toBe(false);

      mgr.stopAll();
      expect(tween.killed).toBe(true);
    });

    it('dispose clears all refs', () => {
      const root = makeRoot(['drum_top', 'drum_middle', 'drum_bottom']);
      const mgr = new DrumManager();
      mgr.buildDrumNodes(root);
      expect(mgr.drumRefs.size).toBe(3);

      mgr.dispose();
      expect(mgr.drumRefs.size).toBe(0);
    });
  });
});
