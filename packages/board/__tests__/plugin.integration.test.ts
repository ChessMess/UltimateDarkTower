import * as THREE from 'three';
import { Tower3DView } from 'ultimatedarktowerdisplay';
import type { PointerTarget } from 'ultimatedarktowerdisplay';
import { attachBoard3D } from '../src/plugin/index';
import type { Board3DHandle, TokenSelection } from '../src/plugin/index';
import { createDefaultBoardState, createLocationPickStore } from '../src/index';
import type { BoardState, BoardFocus } from '../src/index';

// M3 integration smoke: the plugin attaches to a REAL Tower3DView (Display's dist,
// running WebGL-free against the ported three/addons/gsap mocks) and exercises the
// ScenePlugin seam end-to-end. No pixel assertions.

const TEST_MODEL_URL = 'mock://tower.glb';

/** A state with one token per kind at known anchored locations (6 sprites total). */
function makeState(): BoardState {
  const state = createDefaultBoardState();
  state.heroes['h1'] = { location: 'Broken Lands' }; // hero slot → 1
  state.foes['f1'] = { foe: 'Brigands', location: 'Broken Lands', status: 'ready' }; // foe slot → 1
  state.spaceMarkers['Broken Lands'] = ['wasteland']; // marker slot → 1
  state.buildings['Dayside'] = { skulls: 2, destroyed: false }; // skull slot → 2
  state.buildings["Egan's End"] = { skulls: 0, destroyed: false, monument: 'argent-oak' }; // building slot → 1
  return state;
}
const EXPECTED_TOKENS = 6;

function tokensOf(target: PointerTarget): THREE.Object3D[] {
  return typeof target.objects === 'function' ? target.objects() : target.objects;
}

/** The model loads asynchronously (awaits bloom prewarm); yield to drain microtasks. */
async function flushModelLoad(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('Board3DPlugin ↔ Tower3DView integration', () => {
  let container: HTMLElement;
  let view: Tower3DView;
  let handle: Board3DHandle | undefined;
  let pointerSpy: jest.SpyInstance;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    pointerSpy = jest.spyOn(Tower3DView.prototype, 'registerPointerTarget');
  });

  afterEach(() => {
    handle?.dispose();
    handle = undefined;
    view?.dispose();
    pointerSpy.mockRestore();
    container.remove();
  });

  function registeredTarget(): PointerTarget {
    expect(pointerSpy).toHaveBeenCalledTimes(1);
    return pointerSpy.mock.calls[0][0] as PointerTarget;
  }

  it('places one billboard per token on the disc after the model loads', async () => {
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState(), assetBaseUrl: './tokens/' });
    await flushModelLoad();

    const tokens = tokensOf(registeredTarget());
    expect(tokens.length).toBe(EXPECTED_TOKENS);
    const kinds = new Set(tokens.map((t) => (t.userData.selection as TokenSelection).kind));
    expect(kinds).toEqual(new Set(['hero', 'foe', 'marker', 'building']));
  });

  it('renders its own board + hides Display’s placeholder only when boardImageUrl is set', async () => {
    const discSpy = jest.spyOn(Tower3DView.prototype, 'setBoardDiscEnabled');

    // No boardImageUrl → Display's board stays visible, no own-board mesh.
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState() });
    await flushModelLoad();
    expect(discSpy).not.toHaveBeenCalled();
    discSpy.mockRestore();
  });

  it('with boardImageUrl, hides Display’s board and adds its own board mesh', async () => {
    const discSpy = jest.spyOn(Tower3DView.prototype, 'setBoardDiscEnabled');
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState(), boardImageUrl: './board.png' });
    await flushModelLoad();
    expect(discSpy).toHaveBeenCalledWith(false);
    // The board mesh is a non-token child of the plugin group (tokens are the pointer set).
    const tokens = tokensOf(registeredTarget());
    const boardMesh = tokens[0]?.parent?.children.find(
      (c) => c instanceof THREE.Mesh && !tokens.includes(c)
    );
    expect(boardMesh).toBeInstanceOf(THREE.Mesh);
    discSpy.mockRestore();
  });

  it('re-places tokens on setBoardState', async () => {
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState() });
    await flushModelLoad();
    const target = registeredTarget();
    expect(tokensOf(target).length).toBe(EXPECTED_TOKENS);

    handle.setBoardState(createDefaultBoardState()); // empty board
    expect(tokensOf(target).length).toBe(0);
  });

  it('emits the M2 TokenSelection on pointer-down and consumes the gesture', async () => {
    const selections: TokenSelection[] = [];
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, {
      boardState: makeState(),
      onTokenSelect: (sel) => selections.push(sel),
    });
    await flushModelLoad();

    const target = registeredTarget();
    const hero = tokensOf(target).find((t) => (t.userData.selection as TokenSelection).kind === 'hero');
    expect(hero).toBeDefined();

    const consumed = target.onPointerDown?.(
      { object: hero } as unknown as THREE.Intersection,
      {} as PointerEvent
    );
    expect(consumed).toBe(true); // suppress orbit / side-select
    expect(selections).toEqual([{ kind: 'hero', id: 'h1', location: 'Broken Lands' }]);
  });

  it('applies the initial camera config on model load without any setFocus call', async () => {
    const applyCamera = jest.spyOn(Tower3DView.prototype, 'applyCameraConfig');
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState() });
    await flushModelLoad();

    // The isometric preset must be applied at startup so the camera matches the UI selection.
    expect(applyCamera).toHaveBeenCalledWith(
      expect.objectContaining({ elevationFactor: 3, targetHeightFactor: -0.3, distanceFactor: 1.7 })
    );
    applyCamera.mockRestore();
  });

  it('drives the camera from setFocus (kingdom → side, angle → CameraConfig)', async () => {
    const selectSide = jest.spyOn(Tower3DView.prototype, 'selectSide');
    const applyCamera = jest.spyOn(Tower3DView.prototype, 'applyCameraConfig');
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState() });
    await flushModelLoad();

    handle.setFocus({ kingdom: 'east', angle: 'overhead' });
    expect(selectSide).toHaveBeenCalledWith('east');
    // Verify setFocus applied the overhead camera config (startup also calls applyCameraConfig,
    // so we check the specific overhead call rather than an exact invocation count).
    expect(applyCamera).toHaveBeenCalledWith(
      expect.objectContaining({ elevationFactor: 9 }) // overhead preset
    );
    selectSide.mockRestore();
    applyCamera.mockRestore();
  });

  it('reflects camera side changes back out as a focus change', async () => {
    const focuses: BoardFocus[] = [];
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, {
      boardState: makeState(),
      onFocusChange: (f) => focuses.push(f),
    });
    await flushModelLoad();

    view.selectSide('south'); // camera is the focus source of truth
    expect(focuses.some((f) => f.kingdom === 'south')).toBe(true);
  });

  it('armed space-pick: a space click reports a location and consumes the gesture', async () => {
    const locationPick = createLocationPickStore();
    const picked: string[] = [];
    locationPick.subscribe((e) => e.type === 'picked' && picked.push(e.location));
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState(), locationPick });
    await flushModelLoad();

    // A second pointer target (the space target) is registered only when space-pick is configured.
    expect(pointerSpy).toHaveBeenCalledTimes(2);
    const spaceTarget = pointerSpy.mock.calls[1][0] as PointerTarget;
    expect(tokensOf(spaceTarget).length).toBe(0); // disarmed → nothing to hit

    locationPick.arm({ kind: 'foe', label: 'Brigands (foe)', targets: 'all' });
    const disc = tokensOf(spaceTarget).find((d) => d.userData.location === 'Dayside');
    expect(disc).toBeDefined();
    const consumed = spaceTarget.onPointerDown?.(
      { object: disc } as unknown as THREE.Intersection,
      {} as PointerEvent
    );
    expect(consumed).toBe(true);
    expect(picked).toEqual(['Dayside']);
  });

  it('armed skull pick exposes only building space targets', async () => {
    const locationPick = createLocationPickStore();
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState(), locationPick });
    await flushModelLoad();
    const spaceTarget = pointerSpy.mock.calls[1][0] as PointerTarget;

    locationPick.arm({ kind: 'building', label: 'skull', targets: 'buildings' });
    const locs = new Set(tokensOf(spaceTarget).map((d) => d.userData.location as string));
    expect(locs.has('Dayside')).toBe(true); // a Bazaar
    expect(locs.has('Broken Lands')).toBe(false); // not a building
  });

  it('tears down cleanly on dispose', async () => {
    view = new Tower3DView(container, { modelUrl: TEST_MODEL_URL });
    handle = attachBoard3D(view, { boardState: makeState() });
    await flushModelLoad();
    const target = registeredTarget();
    expect(tokensOf(target).length).toBe(EXPECTED_TOKENS);

    handle.dispose();
    expect(tokensOf(target).length).toBe(0);
    handle = undefined; // already disposed
  });
});
