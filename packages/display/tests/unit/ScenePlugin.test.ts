import { LIGHT_EFFECTS } from 'ultimatedarktower';
import type { TowerState } from 'ultimatedarktower';
import { Tower3DView } from '../../src/3d/Tower3DView';
import { attachScenePlugin } from '../../src/3d/ScenePlugin';
import type {
  ScenePlugin,
  ScenePluginContext,
  ScenePluginModelInfo,
} from '../../src/3d/ScenePlugin';
import { attachSkullPhysics } from '../../src/physics';
import * as gltfLoaderMock from '../__mocks__/gltfLoader.js';
import * as gsapMock from '../__mocks__/gsap.js';

const TEST_MODEL_URL = 'mock://tower.glb';

function makeLayer(): TowerState['layer'][number] {
  return {
    light: [
      { effect: LIGHT_EFFECTS.off, loop: false },
      { effect: LIGHT_EFFECTS.off, loop: false },
      { effect: LIGHT_EFFECTS.off, loop: false },
      { effect: LIGHT_EFFECTS.off, loop: false },
    ],
  };
}

function makeState(): TowerState {
  return {
    drum: [
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
    ],
    layer: [makeLayer(), makeLayer(), makeLayer(), makeLayer(), makeLayer(), makeLayer()],
    audio: { sample: 0, loop: false, volume: 0 },
    beam: { count: 0, fault: false },
    led_sequence: 0,
  };
}

/** A stub plugin whose lifecycle methods are jest spies. */
function makeStubPlugin(id = 'test-plugin'): ScenePlugin & {
  attach: jest.Mock<void, [ScenePluginContext]>;
  dispose: jest.Mock<void, []>;
} {
  return {
    id,
    attach: jest.fn(),
    dispose: jest.fn(),
  };
}

describe('attachScenePlugin', () => {
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

  const internals = (view: Tower3DView) =>
    view as unknown as {
      scene: unknown;
      camera: unknown;
      renderer: unknown;
      tickPhysicsListeners(): void;
    };

  it('calls attach once with a context whose scene/camera/renderer are the live instances', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const plugin = makeStubPlugin();

    const handle = attachScenePlugin(view, plugin);

    expect(plugin.attach).toHaveBeenCalledTimes(1);
    const ctx = plugin.attach.mock.calls[0][0];
    const priv = internals(view);
    expect(ctx.scene).toBe(priv.scene);
    expect(ctx.camera).toBe(priv.camera);
    expect(ctx.renderer).toBe(priv.renderer);
    expect(handle.plugin).toBe(plugin);
    expect(view.scenePluginCount).toBe(1);

    view.dispose();
  });

  it('fires plugin.onStateApplied on every applyState with the same state object', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const onStateApplied = jest.fn();
    attachScenePlugin(view, { id: 'p', attach: () => {}, onStateApplied, dispose: () => {} });

    const state = makeState();
    view.applyState(state);

    expect(onStateApplied).toHaveBeenCalledTimes(1);
    expect(onStateApplied).toHaveBeenCalledWith(state);
    view.dispose();
  });

  it('fires plugin.onSealsApplied on applySeals with the broken-seal list', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const onSealsApplied = jest.fn();
    attachScenePlugin(view, { id: 'p', attach: () => {}, onSealsApplied, dispose: () => {} });

    const broken = [{ side: 'north' as const, level: 'top' as const }];
    view.applySeals(broken);

    expect(onSealsApplied).toHaveBeenCalledWith(broken);
    view.dispose();
  });

  it('registerFrameCallback registers a per-frame callback with a numeric dt; unsubscribe stops it', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const baseline = view.physicsFrameListenerCount;
    const frameCb = jest.fn();
    let unsub: (() => void) | undefined;

    attachScenePlugin(view, {
      id: 'p',
      attach: (ctx) => {
        unsub = ctx.registerFrameCallback(frameCb);
      },
      dispose: () => {},
    });

    expect(view.physicsFrameListenerCount).toBe(baseline + 1);

    internals(view).tickPhysicsListeners();
    expect(frameCb).toHaveBeenCalled();
    expect(typeof frameCb.mock.calls[0][0]).toBe('number');
    expect(frameCb.mock.calls[0][0]).toBeGreaterThanOrEqual(0);

    unsub!();
    expect(view.physicsFrameListenerCount).toBe(baseline);
    frameCb.mockClear();
    internals(view).tickPhysicsListeners();
    expect(frameCb).not.toHaveBeenCalled();

    view.dispose();
  });

  it('handle.detach() disposes the plugin, removes frame callbacks + pointer targets, and is idempotent', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const baselineFrames = view.physicsFrameListenerCount;
    const dispose = jest.fn();

    const handle = attachScenePlugin(view, {
      id: 'p',
      attach: (ctx) => {
        ctx.registerFrameCallback(() => {});
        ctx.registerPointerTarget({ objects: [] });
      },
      dispose,
    });

    expect(view.scenePluginCount).toBe(1);
    expect(view.pointerTargetCount).toBe(1);
    expect(view.physicsFrameListenerCount).toBe(baselineFrames + 1);

    handle.detach();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(view.scenePluginCount).toBe(0);
    expect(view.pointerTargetCount).toBe(0);
    expect(view.physicsFrameListenerCount).toBe(baselineFrames);

    handle.detach();
    expect(dispose).toHaveBeenCalledTimes(1);

    view.dispose();
  });

  it('disposing the Tower3DView detaches all plugins', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const a = makeStubPlugin('a');
    const b = makeStubPlugin('b');
    attachScenePlugin(view, a);
    attachScenePlugin(view, b);
    expect(view.scenePluginCount).toBe(2);

    view.dispose();

    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(b.dispose).toHaveBeenCalledTimes(1);
    expect(view.scenePluginCount).toBe(0);
  });

  it('onSideChange fires for plugin subscribers on programmatic selectSide', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const sideCb = jest.fn();
    attachScenePlugin(view, {
      id: 'p',
      attach: (ctx) => {
        ctx.onSideChange(sideCb);
      },
      dispose: () => {},
    });

    view.selectSide('east');

    expect(sideCb).toHaveBeenCalledWith('east');
    view.dispose();
  });

  it('onModelLoaded fires with finalized bounds once the GLB loads; isModelLoaded tracks it', async () => {
    gltfLoaderMock.__setAutoLoad(false);
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });

    const onModelLoaded = jest.fn<void, [ScenePluginModelInfo]>();
    let loadedAtAttach = true;
    attachScenePlugin(view, {
      id: 'p',
      attach: (ctx) => {
        loadedAtAttach = ctx.isModelLoaded();
      },
      onModelLoaded,
      dispose: () => {},
    });

    expect(loadedAtAttach).toBe(false);
    expect(onModelLoaded).not.toHaveBeenCalled();

    gltfLoaderMock.__getLastInstance().fireLoad();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onModelLoaded).toHaveBeenCalledTimes(1);
    const info = onModelLoaded.mock.calls[0][0];
    expect(info.root).toBeDefined();
    expect(typeof info.modelRadius).toBe('number');
    expect(typeof info.modelBottomY).toBe('number');
    expect(typeof info.modelTopY).toBe('number');
    expect(view.loadState).toBe('ready');

    view.dispose();
  });

  it('getPhysicsHooks still returns its documented shape (backward-compat)', () => {
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    const hooks = view.getPhysicsHooks();
    expect(typeof hooks.onFrame).toBe('function');
    expect(typeof hooks.onStateApplied).toBe('function');
    expect(typeof hooks.onSealsApplied).toBe('function');
    expect(typeof hooks.onModelLoaded).toBe('function');
    expect(typeof hooks.drumNode).toBe('function');
    expect(typeof hooks.modelRadius).toBe('number');
    expect(typeof hooks.modelBottomY).toBe('number');
    expect(typeof hooks.modelTopY).toBe('number');
    expect(hooks.scene).toBeDefined();
    view.dispose();
  });

  it('attachSkullPhysics registers exactly one scene plugin and detaches it on dispose (dogfood)', () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Defer the GLB load so the physics model-ready path (which needs Rapier) does
    // not fire; we only assert the dogfood registers/cleans up a scene plugin.
    gltfLoaderMock.__setAutoLoad(false);
    const view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });

    expect(view.scenePluginCount).toBe(0);
    const handle = attachSkullPhysics(view);
    expect(view.scenePluginCount).toBe(1);

    handle.dispose();
    expect(view.scenePluginCount).toBe(0);

    view.dispose();
    errSpy.mockRestore();
  });
});
