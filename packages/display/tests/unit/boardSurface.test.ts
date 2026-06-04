import * as THREE from 'three';
import { Tower3DView } from '../../src/3d/Tower3DView';
import { GroundDiscManager } from '../../src/3d/GroundDiscManager';
import { resolveLighting } from '../../src/3d/LightingResolver';
import * as gltfLoaderMock from '../__mocks__/gltfLoader.js';
import * as gsapMock from '../__mocks__/gsap.js';

const TEST_MODEL_URL = 'mock://tower.glb';

describe('GroundDiscManager.getMetrics', () => {
  it('computes radius/topY/center from model bounds + config without building the mesh', () => {
    const mgr = new GroundDiscManager(new THREE.Scene() as unknown as THREE.Scene, 1);
    const lighting = resolveLighting();

    const modelRadius = 2;
    const modelBottomY = -1.5;
    const m = mgr.getMetrics(modelRadius, modelBottomY, lighting);

    const expectedRadius = modelRadius * lighting.groundDisc.radiusFactor;
    const h = Math.max(modelRadius * lighting.boardDisc.thicknessFactor, 1e-4);
    const expectedCenterY = modelBottomY - modelRadius * 0.002 - h / 2;

    expect(m.radius).toBeCloseTo(expectedRadius, 10);
    expect(m.center.x).toBe(0);
    expect(m.center.z).toBe(0);
    expect(m.center.y).toBeCloseTo(expectedCenterY, 10);
    expect(m.topY).toBeCloseTo(expectedCenterY + h / 2, 10);
    // The top surface sits just below the model bottom (the 0.002·radius epsilon).
    expect(m.topY).toBeCloseTo(modelBottomY - modelRadius * 0.002, 10);
  });
});

describe('Tower3DView board-surface hand-off', () => {
  let container: HTMLElement;

  beforeAll(() => {
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  beforeEach(() => {
    gltfLoaderMock.__reset();
    gsapMock.__reset();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('getDiscMetrics reports geometry consistent with the model bounds + config', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const lighting = view.getLightingConfig();
    const priv = view as unknown as { modelRadius: number; modelBottomY: number };

    const m = view.getDiscMetrics();
    expect(m.radius).toBeCloseTo(priv.modelRadius * lighting.groundDisc.radiusFactor, 10);
    expect(m.topY).toBeCloseTo(priv.modelBottomY - priv.modelRadius * 0.002, 10);
    expect(m.center.x).toBe(0);
    expect(m.center.z).toBe(0);

    view.dispose();
  });

  it('setBoardDiscEnabled(false) stands the placeholder board down; (true) restores it (default on)', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    // Placeholder board image is on by default.
    expect(view.getLightingConfig().boardDisc.enabled).toBe(true);

    view.setBoardDiscEnabled(false);
    expect(view.getLightingConfig().boardDisc.enabled).toBe(false);

    view.setBoardDiscEnabled(true);
    expect(view.getLightingConfig().boardDisc.enabled).toBe(true);

    view.dispose();
  });

  it('getDiscMetrics still returns a usable shape after the board image is stood down', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    view.setBoardDiscEnabled(false);

    const m = view.getDiscMetrics();
    expect(typeof m.radius).toBe('number');
    expect(typeof m.topY).toBe('number');
    expect(m.center).toBeDefined();

    view.dispose();
  });
});
