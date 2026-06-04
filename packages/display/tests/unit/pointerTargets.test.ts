import * as THREE from 'three';
import { Tower3DView } from '../../src/3d/Tower3DView';
import { attachScenePlugin } from '../../src/3d/ScenePlugin';
import type { PointerTarget } from '../../src/3d/ScenePlugin';
import * as gltfLoaderMock from '../__mocks__/gltfLoader.js';
import * as gsapMock from '../__mocks__/gsap.js';

const TEST_MODEL_URL = 'mock://tower.glb';

/** An Object3D the mock raycaster will report as hit. */
function hitObject(distance = 1): THREE.Object3D {
  const o = new THREE.Object3D() as THREE.Object3D & { __hit: boolean; __hitDistance: number };
  o.__hit = true;
  o.__hitDistance = distance;
  return o;
}

function pointerDownAt(canvas: HTMLElement, x = 50, y = 50): MouseEvent {
  const ev = new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, cancelable: true });
  canvas.dispatchEvent(ev);
  return ev;
}

describe('pointer/raycast contract', () => {
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

  /** Build a view and return it with its canvas (rect stubbed to a real size). */
  function makeView(): { view: Tower3DView; canvas: HTMLCanvasElement } {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const canvas = (view as unknown as { renderer: { domElement: HTMLCanvasElement } }).renderer.domElement;
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    return { view, canvas };
  }

  it('pointerdown on a registered object fires onPointerDown with the intersection; returning true consumes it', () => {
    const { view, canvas } = makeView();
    const orbitSpy = jest.fn();
    canvas.addEventListener('pointerdown', orbitSpy); // OrbitControls stand-in (target phase)

    const obj = hitObject();
    const onPointerDown = jest.fn().mockReturnValue(true);
    view.registerPointerTarget({ objects: [obj], priority: 10, onPointerDown });

    pointerDownAt(canvas);

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown.mock.calls[0][0].object).toBe(obj);
    // Consumed → OrbitControls (canvas target listener) never sees the event.
    expect(orbitSpy).not.toHaveBeenCalled();

    view.dispose();
  });

  it('clicking empty space (no hit) leaves camera orbit intact', () => {
    const { view, canvas } = makeView();
    const orbitSpy = jest.fn();
    canvas.addEventListener('pointerdown', orbitSpy);

    const obj = new THREE.Object3D(); // not flagged __hit → no intersection
    const onPointerDown = jest.fn().mockReturnValue(true);
    view.registerPointerTarget({ objects: [obj], onPointerDown });

    pointerDownAt(canvas);

    expect(onPointerDown).not.toHaveBeenCalled();
    expect(orbitSpy).toHaveBeenCalledTimes(1);

    view.dispose();
  });

  it('tests higher-priority targets first; the first consumer wins', () => {
    const { view, canvas } = makeView();
    const order: string[] = [];

    const low: PointerTarget = {
      objects: [hitObject(2)],
      priority: 1,
      onPointerDown: () => { order.push('low'); return true; },
    };
    const high: PointerTarget = {
      objects: [hitObject(1)],
      priority: 10,
      onPointerDown: () => { order.push('high'); return true; },
    };
    // Register low first to prove ordering is by priority, not registration order.
    view.registerPointerTarget(low);
    view.registerPointerTarget(high);

    pointerDownAt(canvas);

    expect(order).toEqual(['high']); // high consumed; low never tested
    view.dispose();
  });

  it('falls through to a lower-priority target when the higher one does not consume', () => {
    const { view, canvas } = makeView();
    const order: string[] = [];
    const orbitSpy = jest.fn();
    canvas.addEventListener('pointerdown', orbitSpy);

    view.registerPointerTarget({
      objects: [hitObject(1)], priority: 10,
      onPointerDown: () => { order.push('high'); /* no consume */ },
    });
    view.registerPointerTarget({
      objects: [hitObject(2)], priority: 1,
      onPointerDown: () => { order.push('low'); return true; },
    });

    pointerDownAt(canvas);

    expect(order).toEqual(['high', 'low']);
    expect(orbitSpy).not.toHaveBeenCalled(); // low consumed
    view.dispose();
  });

  it('unsubscribing a target stops its callbacks (camera orbit restored)', () => {
    const { view, canvas } = makeView();
    const orbitSpy = jest.fn();
    canvas.addEventListener('pointerdown', orbitSpy);

    const onPointerDown = jest.fn().mockReturnValue(true);
    const unsub = view.registerPointerTarget({ objects: [hitObject()], onPointerDown });

    unsub();
    pointerDownAt(canvas);

    expect(onPointerDown).not.toHaveBeenCalled();
    expect(orbitSpy).toHaveBeenCalledTimes(1);
    view.dispose();
  });

  it('dispatches move + up to the gesture owner after a consumed pointerdown', () => {
    const { view, canvas } = makeView();
    const obj = hitObject();
    const onPointerDown = jest.fn().mockReturnValue(true);
    const onPointerMove = jest.fn();
    const onPointerUp = jest.fn();
    view.registerPointerTarget({ objects: [obj], onPointerDown, onPointerMove, onPointerUp });

    pointerDownAt(canvas);
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 55, clientY: 55, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 60, clientY: 60, bubbles: true }));

    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(onPointerMove.mock.calls[0][0].object).toBe(obj);
    expect(onPointerUp).toHaveBeenCalledTimes(1);

    // After up, a fresh move is no longer delivered (gesture ended).
    onPointerMove.mockClear();
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 70, clientY: 70, bubbles: true }));
    expect(onPointerMove).not.toHaveBeenCalled();

    view.dispose();
  });

  it('a pointer target registered through a scene plugin is removed when the plugin detaches', () => {
    const { view, canvas } = makeView();
    const orbitSpy = jest.fn();
    canvas.addEventListener('pointerdown', orbitSpy);
    const onPointerDown = jest.fn().mockReturnValue(true);

    const handle = attachScenePlugin(view, {
      id: 'p',
      attach: (ctx) => { ctx.registerPointerTarget({ objects: [hitObject()], onPointerDown }); },
      dispose: () => {},
    });
    expect(view.pointerTargetCount).toBe(1);

    pointerDownAt(canvas);
    expect(onPointerDown).toHaveBeenCalledTimes(1);

    handle.detach();
    expect(view.pointerTargetCount).toBe(0);

    onPointerDown.mockClear();
    pointerDownAt(canvas);
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(orbitSpy).toHaveBeenCalledTimes(1); // orbit restored after detach

    view.dispose();
  });
});
