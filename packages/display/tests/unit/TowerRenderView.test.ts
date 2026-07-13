// Mock the TowerDisplay module before importing TowerRenderView so the test
// loads in isolation from the 3D / audio import chain (which currently can't
// be parsed by ts-jest's CommonJS transform). The facade's job is to compose
// chrome around a TowerDisplay and forward calls — both can be verified
// against a stub.

const applyStateMock = jest.fn();
const applySealsMock = jest.fn();
const selectSideMock = jest.fn();
const setLedOverrideMock = jest.fn();
const clearLedOverridesMock = jest.fn();
const showIdleMock = jest.fn();
const applyLightingConfigMock = jest.fn();
const applyCameraConfigMock = jest.fn();
const applyAudioConfigMock = jest.fn();
const setSceneLightsMock = jest.fn();
const playEntranceMock = jest.fn();
const disposeMock = jest.fn();

class FakeTowerDisplay {
  view3D: unknown = null;
  loadState: 'pending' | 'ready' | 'error' | undefined = undefined;
  applyState = applyStateMock;
  applySeals = applySealsMock;
  selectSide = selectSideMock;
  setLedOverride = setLedOverrideMock;
  clearLedOverrides = clearLedOverridesMock;
  showIdle = showIdleMock;
  applyLightingConfig = applyLightingConfigMock;
  applyCameraConfig = applyCameraConfigMock;
  applyAudioConfig = applyAudioConfigMock;
  setSceneLights = setSceneLightsMock;
  playEntrance = playEntranceMock;
  constructor(public readonly options: { container: HTMLElement }) {
    // Mount a placeholder inside the container so the body has a child the
    // facade can observe — matches the real TowerDisplay's behaviour of
    // appending a `.td-layout` div under its container.
    const layout = document.createElement('div');
    layout.className = 'td-layout';
    options.container.appendChild(layout);
  }
  dispose = (): void => {
    disposeMock();
    const layout = this.options.container.querySelector('.td-layout');
    if (layout) layout.remove();
  };
}

jest.mock('../../src/TowerDisplay', () => ({
  TowerDisplay: FakeTowerDisplay,
}));

import { TowerRenderView } from '../../src/TowerRenderView';

describe('TowerRenderView', () => {
  let container: HTMLElement;
  let view: TowerRenderView;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    applyStateMock.mockClear();
    applySealsMock.mockClear();
    selectSideMock.mockClear();
    setLedOverrideMock.mockClear();
    clearLedOverridesMock.mockClear();
    showIdleMock.mockClear();
    applyLightingConfigMock.mockClear();
    applyCameraConfigMock.mockClear();
    applyAudioConfigMock.mockClear();
    setSceneLightsMock.mockClear();
    playEntranceMock.mockClear();
    disposeMock.mockClear();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  function makeView(
    overrides: Partial<ConstructorParameters<typeof TowerRenderView>[0]> = {},
  ): TowerRenderView {
    return new TowerRenderView({ container, ...overrides });
  }

  it('mounts .trv-root inside the container with .trv-body containing the inner display', () => {
    view = makeView();
    const root = container.querySelector('.trv-root');
    expect(root).not.toBeNull();
    const body = root!.querySelector('.trv-body');
    expect(body).not.toBeNull();
    expect(body!.querySelector('.td-layout')).not.toBeNull();
    expect(container.querySelector('.trv-header')).toBeNull();
    view.dispose();
  });

  it('applies className to .trv-root', () => {
    view = makeView({ className: 'my-theme' });
    expect(container.querySelector('.trv-root.my-theme')).not.toBeNull();
    view.dispose();
  });

  it('renders header when title is provided at construction', () => {
    view = makeView({ title: 'Render' });
    const title = container.querySelector('.trv-header .trv-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Render');
    view.dispose();
  });

  it('lazily creates header on setTitle after chrome-less construction', () => {
    view = makeView();
    expect(container.querySelector('.trv-header')).toBeNull();
    view.setTitle('Late Title');
    const header = container.querySelector('.trv-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('.trv-title')!.textContent).toBe('Late Title');
    view.dispose();
  });

  it('setTitle(null) removes the title and collapses an otherwise-empty header', () => {
    view = makeView({ title: 'X' });
    expect(container.querySelector('.trv-header')).not.toBeNull();
    view.setTitle(null);
    expect(container.querySelector('.trv-title')).toBeNull();
    expect(container.querySelector('.trv-header')).toBeNull();
    view.dispose();
  });

  it('renders badges and supports updateBadge by id', () => {
    view = makeView({
      title: 'X',
      badges: [
        { id: 'conn', label: 'BLE', value: 'connected', tone: 'good' },
        { label: 'FPS', value: '60' },
      ],
    });
    const badges = container.querySelectorAll('.trv-badge');
    expect(badges).toHaveLength(2);
    expect((badges[0] as HTMLElement).dataset.tone).toBe('good');

    view.updateBadge('conn', { value: 'disconnected', tone: 'warn' });
    const updated = container.querySelectorAll('.trv-badge')[0] as HTMLElement;
    expect(updated.dataset.tone).toBe('warn');
    expect(updated.querySelector('.trv-badge-value')!.textContent).toBe('disconnected');
    view.dispose();
  });

  it('setBadges([]) removes the badge row', () => {
    view = makeView({ badges: [{ label: 'A' }] });
    expect(container.querySelector('.trv-badges')).not.toBeNull();
    view.setBadges([]);
    expect(container.querySelector('.trv-badges')).toBeNull();
    view.dispose();
  });

  it('setActions replaces prior children rather than appending', () => {
    view = makeView({ title: 'X' });
    const btnA = document.createElement('button');
    btnA.textContent = 'A';
    const btnB = document.createElement('button');
    btnB.textContent = 'B';
    view.setActions([btnA]);
    expect(container.querySelectorAll('.trv-actions button')).toHaveLength(1);
    view.setActions([btnB]);
    const actionButtons = container.querySelectorAll('.trv-actions button');
    expect(actionButtons).toHaveLength(1);
    expect(actionButtons[0].textContent).toBe('B');
    view.dispose();
  });

  it('dispose() removes .trv-root from the container and disposes inner display', () => {
    view = makeView({ title: 'X' });
    expect(container.querySelector('.trv-root')).not.toBeNull();
    view.dispose();
    expect(container.querySelector('.trv-root')).toBeNull();
    expect(container.innerHTML).toBe('');
    expect(disposeMock).toHaveBeenCalledTimes(1);
  });

  it('repeated dispose + recreate does not stack wrappers', () => {
    view = makeView();
    view.dispose();
    view = makeView();
    view.dispose();
    view = makeView();
    expect(container.querySelectorAll('.trv-root')).toHaveLength(1);
    view.dispose();
  });

  it('forwards applyState/applySeals/selectSide/setLedOverride to the inner display', () => {
    view = makeView();
    const state = { drum: {}, light: {}, audio: {}, beam: {} } as never;
    view.applyState(state);
    view.applySeals([{ side: 'north', level: 'top' } as never]);
    view.selectSide('east');
    view.setLedOverride(1, 2, 3);
    view.clearLedOverrides();
    view.showIdle();
    expect(applyStateMock).toHaveBeenCalledWith(state, false);
    expect(applySealsMock).toHaveBeenCalled();
    expect(selectSideMock).toHaveBeenCalledWith('east');
    expect(setLedOverrideMock).toHaveBeenCalledWith(1, 2, 3);
    expect(clearLedOverridesMock).toHaveBeenCalled();
    expect(showIdleMock).toHaveBeenCalled();
    view.dispose();
  });

  it('forwards 3D config methods (lighting/camera/audio/sceneLights/entrance)', () => {
    view = makeView();
    view.applyLightingConfig({} as never);
    view.applyCameraConfig({} as never);
    view.applyAudioConfig({ enabled: true } as never);
    view.setSceneLights({ key: 0.5 });
    view.playEntrance();
    expect(applyLightingConfigMock).toHaveBeenCalled();
    expect(applyCameraConfigMock).toHaveBeenCalled();
    expect(applyAudioConfigMock).toHaveBeenCalledWith({ enabled: true });
    expect(setSceneLightsMock).toHaveBeenCalledWith({ key: 0.5 });
    expect(playEntranceMock).toHaveBeenCalled();
    view.dispose();
  });

  it('exposes the inner TowerDisplay via view.display and view3D sugar', () => {
    view = makeView();
    expect(view.display).toBeDefined();
    expect(view.view3D).toBeNull();
    view.dispose();
  });

  it('root and body getters return the mounted elements', () => {
    view = makeView({ title: 'X' });
    expect(view.root.classList.contains('trv-root')).toBe(true);
    expect(view.body.classList.contains('trv-body')).toBe(true);
    expect(view.root.contains(view.body)).toBe(true);
    view.dispose();
  });

  describe('UI docking', () => {
    it('getOverlayContainer returns an element overlapping the body, with pointer-events:none on the layer', () => {
      view = makeView();
      const overlay = view.getOverlayContainer();
      expect(overlay.classList.contains('trv-overlay')).toBe(true);
      // Mounted over the body (the canvas area).
      expect(view.body.contains(overlay)).toBe(true);
      // Calling again returns the same element (created on demand, once).
      expect(view.getOverlayContainer()).toBe(overlay);
      view.dispose();
    });

    it('the overlay option creates the overlay eagerly', () => {
      view = makeView({ overlay: true });
      expect(view.body.querySelector('.trv-overlay')).not.toBeNull();
      view.dispose();
    });

    it('getPanelSlot wraps the body in a dock and places the slot beside it without overlap', () => {
      view = makeView();
      const right = view.getPanelSlot('right');
      expect(right.classList.contains('trv-panel')).toBe(true);
      expect(right.classList.contains('trv-panel-right')).toBe(true);

      // A dock now wraps the body; the slot and body are siblings in it (reflow,
      // not overlap), and the body still holds the inner display.
      const dock = view.root.querySelector('.trv-dock');
      expect(dock).not.toBeNull();
      expect(dock!.contains(view.body)).toBe(true);
      expect(dock!.contains(right)).toBe(true);
      expect(view.body.querySelector('.td-layout')).not.toBeNull();

      // Repeated calls for the same position return the same slot.
      expect(view.getPanelSlot('right')).toBe(right);
      // A different position creates a distinct slot in the same dock.
      const left = view.getPanelSlot('left');
      expect(left).not.toBe(right);
      expect(dock!.contains(left)).toBe(true);
      view.dispose();
    });

    it('overlay survives being moved into the dock and stays inside the body', () => {
      view = makeView({ overlay: true });
      const overlay = view.getOverlayContainer();
      view.getPanelSlot('bottom');
      // The body (with its overlay child) was reparented into the dock.
      expect(view.body.contains(overlay)).toBe(true);
      expect(view.root.querySelector('.trv-dock')!.contains(view.body)).toBe(true);
      view.dispose();
    });

    it('dispose removes overlay + dock + panel slots', () => {
      view = makeView({ overlay: true });
      view.getPanelSlot('right');
      expect(container.querySelector('.trv-overlay')).not.toBeNull();
      expect(container.querySelector('.trv-dock')).not.toBeNull();

      view.dispose();

      expect(container.querySelector('.trv-overlay')).toBeNull();
      expect(container.querySelector('.trv-dock')).toBeNull();
      expect(container.querySelector('.trv-panel')).toBeNull();
    });
  });
});

describe('TOWER_DISPLAY_CSS docking rules', () => {
  it('includes the overlay + panel-slot rules so injectStyles:false consumers get them', () => {
    const { TOWER_DISPLAY_CSS } = jest.requireActual('../../src/styles') as {
      TOWER_DISPLAY_CSS: string;
    };
    expect(TOWER_DISPLAY_CSS).toContain('.trv-overlay');
    expect(TOWER_DISPLAY_CSS).toContain('pointer-events: none');
    expect(TOWER_DISPLAY_CSS).toContain('.trv-dock');
    expect(TOWER_DISPLAY_CSS).toContain('.trv-panel-right');
    expect(TOWER_DISPLAY_CSS).toContain('.trv-panel-left');
    expect(TOWER_DISPLAY_CSS).toContain('.trv-panel-top');
    expect(TOWER_DISPLAY_CSS).toContain('.trv-panel-bottom');
  });
});
