// The 3D rendering path (Tower3DView + attachBoard3D) is covered by
// plugin.integration.test.ts. Here we mock the lazily-imported 3D adapter so the
// stage's own logic — DOM, mode switching, drag/focus wiring, editing UI, lazy 3D
// toggle, dispose — is tested deterministically and WebGL-free. The stage's static
// graph is three-free, so nothing here loads `three`/Display.
// vi.mock is hoisted above every import, so its factory cannot close over plain
// top-level consts — they would still be in the temporal dead zone. vi.hoisted runs
// in that same hoisted phase, so these bindings exist by the time the factory runs.
const { towerHandle, createBoardTower3D } = vi.hoisted(() => {
  const handle = {
    tower: { __sentinel: 'tower' },
    view3D: {},
    setBoardState: vi.fn(),
    setFocus: vi.fn(),
    dispose: vi.fn(),
  };
  return { towerHandle: handle, createBoardTower3D: vi.fn(() => handle) };
});

vi.mock('../src/plugin/stageTower', () => ({
  createBoardTower3D,
  STAGE_TOWER_CSS: '/* tower css */',
}));

import { BoardStageView } from '../src/stage/index';

function mount(options: Partial<ConstructorParameters<typeof BoardStageView>[0]> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const stage = new BoardStageView({ container, persist: false, tower3D: false, ...options });
  return { container, stage };
}

function focusButton(stage: BoardStageView, label: string): HTMLButtonElement {
  const btns = Array.from(stage.root.querySelectorAll<HTMLButtonElement>('.udt-focus-button'));
  const btn = btns.find((b) => b.textContent === label);
  if (!btn) throw new Error(`focus button "${label}" not found`);
  return btn;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('BoardStageView — DOM + 2D wiring (no 3D)', () => {
  it('builds the stage skeleton and a live 2D map', () => {
    const { container } = mount();
    expect(container.querySelector('.bsv-root')).not.toBeNull();
    expect(container.querySelector('.bsv-panel')).not.toBeNull();
    expect(container.querySelector('.bsv-pane-2d')).not.toBeNull();
    expect(container.querySelector('.bsv-pane-3d')).not.toBeNull();
    expect(container.querySelector('.bsv-map-host svg')).not.toBeNull(); // BoardMap2D mounted
    expect(container.querySelector('.bsv-pills')).not.toBeNull();
    // On-map control groups: Spin/Pan, N/E/S/W, and All in its own trailing group.
    expect(container.querySelector('.bsv-dragmode')).not.toBeNull();
    expect(container.querySelector('.bsv-kingdom')).not.toBeNull();
    expect(container.querySelector('.bsv-all')).not.toBeNull();
  });

  it('injects stage styles once (idempotent)', () => {
    mount();
    mount();
    expect(document.querySelectorAll('#bsv-stage-styles').length).toBe(1);
  });

  it('setDisplayMode toggles the panel mode classes', () => {
    const { container, stage } = mount();
    const panel = container.querySelector('.bsv-panel') as HTMLElement;

    stage.setDisplayMode('2d3d');
    expect(panel.classList.contains('bsv-mode-2d3d')).toBe(true);

    stage.setDisplayMode('2d');
    expect(panel.classList.contains('bsv-mode-2d')).toBe(true);
    expect(panel.classList.contains('bsv-mode-2d3d')).toBe(false);

    stage.setDisplayMode('pip-3dbig');
    expect(panel.classList.contains('bsv-mode-pip')).toBe(true);
    expect(
      (container.querySelector('.bsv-pane-3d') as HTMLElement).classList.contains('is-big'),
    ).toBe(true);
    expect(
      (container.querySelector('.bsv-pane-2d') as HTMLElement).classList.contains('is-mini'),
    ).toBe(true);
    expect(stage.mode).toBe('pip-3dbig');
  });

  it('setDragMode forwards to the 2D map and reflects in the Spin/Pan toggle', () => {
    const { stage } = mount();
    const spy = vi.spyOn(stage.map2d!, 'setDragMode');
    stage.setDragMode('pan');
    expect(spy).toHaveBeenCalledWith('pan');
    const panBtn = Array.from(
      stage.root.querySelectorAll<HTMLButtonElement>('.bsv-dragmode .udt-focus-button'),
    ).find((b) => b.textContent === 'Pan')!;
    expect(panBtn.classList.contains('is-active')).toBe(true);
  });

  it('the kingdom bar drives the shared focus (and clears manual zoom)', () => {
    const { stage } = mount();
    const resetSpy = vi.spyOn(stage.map2d!, 'resetView');
    focusButton(stage, 'N').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(stage.focus.kingdom).toBe('north');
    expect(resetSpy).toHaveBeenCalled();
    expect(focusButton(stage, 'N').classList.contains('is-active')).toBe(true);
    expect(stage.readout.getText()).toContain('north');
  });

  it('mounts the editing UI sharing the controller/selection stores', () => {
    const { container, stage } = mount();
    expect(container.querySelector('.udt-board-ui')).not.toBeNull();
    expect(stage.editingUI).toBeDefined();
    // A 2D map token click flows into the shared selection store.
    stage.controller.spawnFoe('foe-1', 'Brigands', 'Dayside');
    const foe = container.querySelector('.udt-token[data-id="foe-1"]') as SVGGElement;
    foe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(stage.selection.get()).toEqual({ kind: 'foe', id: 'foe-1', location: 'Dayside' });
  });

  it('editingUI:false skips the editing UI', () => {
    const { container, stage } = mount({ editingUI: false });
    expect(container.querySelector('.udt-board-ui')).toBeNull();
    expect(stage.editingUI).toBeUndefined();
  });

  it('the All button sits in its own trailing group and reflects the focus', () => {
    const { stage } = mount();
    const allBtn = focusButton(stage, 'All');
    expect(allBtn.closest('.bsv-all')).not.toBeNull(); // its own group, separate from N/E/S/W
    expect(allBtn.classList.contains('is-active')).toBe(true); // default focus is "all"
    focusButton(stage, 'E').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(allBtn.classList.contains('is-active')).toBe(false);
    expect(focusButton(stage, 'E').classList.contains('is-active')).toBe(true);
  });

  it('dispose tears down the DOM and stops reacting to state changes', () => {
    const { container, stage } = mount();
    stage.dispose();
    expect(container.querySelector('.bsv-root')).toBeNull();
    const before = stage.readout.getText();
    stage.controller.placeHero('h9', 'Dayside'); // must not throw / re-render
    expect(stage.readout.getText()).toBe(before);
  });
});

describe('BoardStageView — lazy 3D tower', () => {
  it('does not load the 3D adapter for a 2D-only stage', () => {
    mount({ tower3D: false });
    expect(createBoardTower3D).not.toHaveBeenCalled();
  });

  it('setTowerEnabled(true) lazily builds the tower; (false) disposes it and drops to 2D', async () => {
    const { stage } = mount({ tower3D: false, modelUrl: 'mock://tower.glb' });

    await stage.setTowerEnabled(true);
    expect(createBoardTower3D).toHaveBeenCalledTimes(1);
    expect(createBoardTower3D.mock.calls[0][0]).toMatchObject({ modelUrl: 'mock://tower.glb' });
    expect(stage.tower3D).toBe(towerHandle.tower);

    // Controller changes now push state into the tower handle.
    stage.controller.placeHero('h1', 'Dayside');
    expect(towerHandle.setBoardState).toHaveBeenCalled();

    stage.setDisplayMode('3d');
    await stage.setTowerEnabled(false);
    expect(towerHandle.dispose).toHaveBeenCalled();
    expect(stage.tower3D).toBeNull();
    expect(stage.mode).toBe('2d'); // a 3D mode falls back to 2D when the tower is off
  });

  it('a 3D camera side change (Display’s own side buttons) drives the shared focus back', async () => {
    const { stage } = mount({ tower3D: false, modelUrl: 'mock://tower.glb' });
    await stage.setTowerEnabled(true);

    const options = createBoardTower3D.mock.calls[0][0] as {
      onFocusChange?: (f: { kingdom: string; angle: string }) => void;
    };
    expect(typeof options.onFocusChange).toBe('function');

    options.onFocusChange!({ kingdom: 'south', angle: stage.focus.angle });
    expect(stage.focus.kingdom).toBe('south'); // the 2D map + kingdom bar follow the 3D camera
    const southBtn = focusButton(stage, 'S');
    expect(southBtn.classList.contains('is-active')).toBe(true);
  });

  it('keeps the 3D pane PiP move/resize handles across a tower build + dispose', async () => {
    const { container, stage } = mount({ tower3D: false, modelUrl: 'mock://tower.glb' });
    const pane3d = container.querySelector('.bsv-pane-3d') as HTMLElement;
    const handles = () => pane3d.querySelectorAll(':scope > .bsv-pip-handle').length;
    const corners = () => pane3d.querySelectorAll(':scope > .bsv-pip-corner').length;
    expect(handles()).toBe(1);
    expect(corners()).toBe(4);

    // Building the tower clears only its inner host — the pane's own handles must remain,
    // so the 3D view stays draggable/resizable when it is the PiP inset (regression).
    await stage.setTowerEnabled(true);
    expect(handles()).toBe(1);
    expect(corners()).toBe(4);

    await stage.setTowerEnabled(false);
    expect(handles()).toBe(1);
    expect(corners()).toBe(4);
  });

  it('tower3D:true without a modelUrl warns and stays 2D-only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { stage } = mount({ tower3D: true }); // no modelUrl
    await Promise.resolve();
    expect(createBoardTower3D).not.toHaveBeenCalled();
    expect(stage.tower3D).toBeNull();
    warn.mockRestore();
  });

  it('popping out after turning the tower off does not resurrect it (regression)', async () => {
    // A minimal fake Window sufficient for popOut's buildPopupDocument + listener wiring.
    const doc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      title: '',
      head: document.createElement('head'),
      body: document.createElement('body'),
      documentElement: document.createElement('html'),
      createElement: (tag: string) => document.createElement(tag),
    } as unknown as Document;
    const fakeWin = {
      document: doc,
      closed: false,
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin);

    const { stage } = mount({ tower3D: false, modelUrl: 'mock://tower.glb' });
    await stage.setTowerEnabled(true);
    expect(createBoardTower3D).toHaveBeenCalledTimes(1);

    await stage.setTowerEnabled(false);
    createBoardTower3D.mockClear();

    stage.popOut();
    expect(createBoardTower3D).not.toHaveBeenCalled(); // tower is off — must stay off

    openSpy.mockRestore();
  });
});
