import * as THREE from 'three';
import { CameraController } from '../../src/3d/CameraController';
import * as gsapMock from '../__mocks__/gsap.js';

interface MockControls {
  target: THREE.Vector3;
  enableZoom: boolean;
  update: jest.Mock<void, []>;
}

interface TweenCall {
  target: { t?: number };
  vars: { onUpdate?: () => void; onComplete?: () => void; t?: number };
}

function makeController(config = {}) {
  const camera = new THREE.PerspectiveCamera();
  const controls: MockControls = {
    target: new THREE.Vector3(),
    enableZoom: true,
    update: jest.fn(),
  };
  const sideButtons = { setActive: jest.fn() };
  const controller = new CameraController(camera, controls as never, sideButtons as never, config);

  controller.fitToModel(10);
  gsapMock.__reset();

  return { camera, controls, sideButtons, controller };
}

function getLatestTween(): TweenCall {
  const tweens = gsapMock.__getTweens() as TweenCall[];
  return tweens[tweens.length - 1];
}

function cameraDistanceToTarget(camera: THREE.PerspectiveCamera, controls: MockControls): number {
  const dx = camera.position.x - controls.target.x;
  const dy = camera.position.y - controls.target.y;
  const dz = camera.position.z - controls.target.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

describe('CameraController', () => {
  beforeEach(() => {
    gsapMock.__reset();
  });

  it('resets to the fitted framing by default when selecting a side', () => {
    const { camera, controls, controller } = makeController();
    const defaultZ = camera.position.z;

    camera.position.set(5, 6, 7);
    controls.target.set(2, 3, 4);

    controller.snapToSide('east');

    const tween = getLatestTween();
    expect(tween).toBeDefined();

    tween.target.t = 1;
    tween.vars.onUpdate?.();

    expect(camera.position.x).toBeCloseTo(defaultZ, 10);
    expect(camera.position.y).toBeCloseTo(-5, 10);
    expect(camera.position.z).toBeCloseTo(0, 10);
    expect(controls.target.x).toBeCloseTo(0, 10);
    expect(controls.target.y).toBeCloseTo(-1.5, 10);
    expect(controls.target.z).toBeCloseTo(0, 10);
  });

  it('preserves the current target, tilt, and zoom distance when configured', () => {
    const { camera, controls, controller } = makeController({ preserveViewOnSideSelect: true });

    camera.position.set(8, 9, 14);
    controls.target.set(3, 4, 5);

    controller.snapToSide('west');

    const tween = getLatestTween();
    const horizontalDistance = Math.sqrt((8 - 3) ** 2 + (14 - 5) ** 2);

    expect(tween).toBeDefined();

    tween.target.t = 1;
    tween.vars.onUpdate?.();

    expect(camera.position.x).toBeCloseTo(-horizontalDistance + 3, 10);
    expect(camera.position.y).toBeCloseTo(9, 10);
    expect(camera.position.z).toBeCloseTo(5, 10);
    expect(controls.target.x).toBeCloseTo(3, 10);
    expect(controls.target.y).toBeCloseTo(4, 10);
    expect(controls.target.z).toBeCloseTo(5, 10);
  });

  it('keeps midpoint zoom dip stable across different start azimuths', () => {
    const first = makeController();
    const second = makeController();

    const defaultY = first.camera.position.y;
    const defaultZ = first.camera.position.z;

    first.camera.position.set(0, defaultY, defaultZ);
    first.controls.target.set(0, -1.5, 0);
    first.controller.snapToSide('east');
    const tweenA = getLatestTween();
    tweenA.target.t = 0.5;
    tweenA.vars.onUpdate?.();
    const midRadiusA = cameraDistanceToTarget(first.camera, first.controls);

    second.camera.position.set(0, defaultY, -defaultZ);
    second.controls.target.set(0, -1.5, 0);
    second.controller.snapToSide('east');
    const tweenB = getLatestTween();
    tweenB.target.t = 0.5;
    tweenB.vars.onUpdate?.();
    const midRadiusB = cameraDistanceToTarget(second.camera, second.controls);

    expect(midRadiusA).toBeCloseTo(midRadiusB, 10);
  });

  it('centerView recenters the target on the tower axis while preserving the camera-to-target offset', () => {
    const { camera, controls, controller } = makeController();
    // Hand-orbit + pan to a custom, off-center view.
    camera.position.set(12, 8, 4);
    controls.target.set(3, 2, -1);
    const off = { x: 12 - 3, y: 8 - 2, z: 4 - -1 }; // preserved offset

    controller.centerView();

    const tl = (
      gsapMock.__getTimelines() as {
        children: { target: unknown; vars: Record<string, number> }[];
      }[]
    ).at(-1)!;
    const posTween = tl.children.find((c) => c.target === camera.position)!;
    const tgtTween = tl.children.find((c) => c.target === controls.target)!;

    // Target returns to the tower axis at the default framing height (10 * -0.15).
    expect(tgtTween.vars.x).toBeCloseTo(0, 10);
    expect(tgtTween.vars.y).toBeCloseTo(-1.5, 10);
    expect(tgtTween.vars.z).toBeCloseTo(0, 10);
    // Camera keeps the same offset from the (recentered) target → same angle + zoom.
    expect(posTween.vars.x).toBeCloseTo(0 + off.x, 10);
    expect(posTween.vars.y).toBeCloseTo(-1.5 + off.y, 10);
    expect(posTween.vars.z).toBeCloseTo(0 + off.z, 10);
  });

  it('applyCameraConfig with preserveView keeps the current azimuth/elevation and changes only the given factor', () => {
    const { camera, controls, controller } = makeController();
    // Orbit due east at a custom eye height; pan the target off-axis.
    camera.position.set(20, 3, 0);
    controls.target.set(0, -1.5, 0);

    controller.applyCameraConfig({ distanceFactor: 2 }, { preserveView: true });

    const dx = camera.position.x - controls.target.x;
    const dz = camera.position.z - controls.target.z;
    // Still looking from the east (no snap back to north).
    expect(Math.atan2(dx, dz)).toBeCloseTo(Math.PI / 2, 9);
    // Elevation untouched (elevationFactor not in the config).
    expect(camera.position.y).toBeCloseTo(3, 10);
    // Horizontal distance now reflects the new distanceFactor.
    const fov = (camera.fov * Math.PI) / 180;
    const base = (10 / Math.sin(fov / 2)) * 1.15;
    expect(Math.sqrt(dx * dx + dz * dz)).toBeCloseTo(base * 2, 6);
  });

  it('applyCameraConfig without preserveView snaps to the north fit (snapshot-button behavior)', () => {
    const { camera, controls, controller } = makeController();
    camera.position.set(20, 3, 0); // east
    controls.target.set(5, 0, 5); // panned off-axis

    controller.applyCameraConfig({ distanceFactor: 1.5 });

    expect(camera.position.x).toBeCloseTo(0, 10);
    expect(camera.position.z).toBeGreaterThan(0); // due north (+Z)
    expect(controls.target.x).toBeCloseTo(0, 10);
    expect(controls.target.z).toBeCloseTo(0, 10);
    expect(controls.target.y).toBeCloseTo(-1.5, 10);
  });
});

describe('CameraController – tickDerivedSide', () => {
  beforeEach(() => {
    gsapMock.__reset();
  });

  it('is a no-op before the model loads (defaultCamera is null)', () => {
    const camera = new THREE.PerspectiveCamera();
    const controls = { target: new THREE.Vector3(), enableZoom: true, update: jest.fn() };
    const sideButtons = { setActive: jest.fn() };
    const controller = new CameraController(camera, controls as never, sideButtons as never);
    // fitToModel NOT called — defaultCamera is null

    const cb = jest.fn();
    controller.onSideChange = cb;
    sideButtons.setActive.mockClear();

    camera.position.set(0, -5, -20); // south-ish, but should be ignored
    controller.tickDerivedSide();

    expect(cb).not.toHaveBeenCalled();
    expect(sideButtons.setActive).not.toHaveBeenCalled();
    expect(controller.getCurrentSide()).toBeNull();
  });

  it('is a no-op while a snap tween is active', () => {
    const { camera, controls, sideButtons, controller } = makeController();
    const cb = jest.fn();
    controller.onSideChange = cb;

    // snapToSide creates an activeTween
    controller.snapToSide('east');
    sideButtons.setActive.mockClear();
    cb.mockClear();

    // Orbit camera to south quadrant
    camera.position.set(0, -5, -20);
    controls.target.set(0, 0, 0);

    controller.tickDerivedSide();

    expect(cb).not.toHaveBeenCalled();
    expect(sideButtons.setActive).not.toHaveBeenCalled();
    expect(controller.getCurrentSide()).toBe('east');
  });

  it('updates the active side and fires onSideChange when the camera crosses to a new cardinal', () => {
    const { camera, controls, sideButtons, controller } = makeController();
    // After makeController, activeTween is null and currentSide is 'north'
    const cb = jest.fn();
    controller.onSideChange = cb;
    sideButtons.setActive.mockClear();

    // Orbit camera to south quadrant (negative z offset)
    camera.position.set(0, -5, -20);
    controls.target.set(0, 0, 0);

    controller.tickDerivedSide();

    expect(cb).toHaveBeenCalledWith('south');
    expect(controller.getCurrentSide()).toBe('south');
    expect(sideButtons.setActive).toHaveBeenCalledWith('south');
  });

  it('does not fire when the camera stays within the same cardinal quadrant', () => {
    const { camera, controls, sideButtons, controller } = makeController();
    const cb = jest.fn();
    controller.onSideChange = cb;
    sideButtons.setActive.mockClear();

    // Slightly off-axis but still in north quadrant
    camera.position.set(2, -5, 18);
    controls.target.set(0, 0, 0);

    controller.tickDerivedSide();

    expect(cb).not.toHaveBeenCalled();
    expect(sideButtons.setActive).not.toHaveBeenCalled();
    expect(controller.getCurrentSide()).toBe('north');
  });

  it('resumes detecting after the snap tween completes (onComplete clears activeTween)', () => {
    const { camera, controls, sideButtons, controller } = makeController();
    const cb = jest.fn();
    controller.onSideChange = cb;

    // Snap to east — creates activeTween
    controller.snapToSide('east');
    sideButtons.setActive.mockClear();
    cb.mockClear();

    // Simulate GSAP onComplete firing
    const tween = getLatestTween();
    tween.vars.onComplete?.();

    // Now orbit to south
    camera.position.set(0, -5, -20);
    controls.target.set(0, 0, 0);

    controller.tickDerivedSide();

    expect(cb).toHaveBeenCalledWith('south');
    expect(controller.getCurrentSide()).toBe('south');
  });
});
