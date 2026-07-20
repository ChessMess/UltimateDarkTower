import { TowerDisplay } from '../../src/TowerDisplay';
import { _resetStyleInjection } from '../../src/styles';
import { createDefaultTowerState } from 'ultimatedarktower';

const TEST_MODEL_URL = 'mock://tower.glb';

describe('TowerDisplay', () => {
  let container: HTMLElement;
  let display: TowerDisplay;

  beforeAll(() => {
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  beforeEach(() => {
    _resetStyleInjection();
    container = document.createElement('div');
    document.body.appendChild(container);
    display = new TowerDisplay({ container });
  });

  afterEach(() => {
    display.dispose();
    document.body.removeChild(container);
  });

  it('constructor creates readout in container', () => {
    // Should show idle state after construction
    const idle = container.querySelector('.tdr-idle');
    expect(idle).not.toBeNull();
    expect(idle!.textContent).toContain('Waiting for tower state');
  });

  it('applyState() delegates to readout', () => {
    const state = createDefaultTowerState();
    display.applyState(state);

    // Should render LED layers
    const layers = container.querySelectorAll('.tdr-layer');
    expect(layers).toHaveLength(6);
  });

  it('showIdle() delegates to readout', () => {
    display.applyState(createDefaultTowerState());
    expect(container.querySelector('.tdr-idle')).toBeNull();

    display.showIdle();
    expect(container.querySelector('.tdr-idle')).not.toBeNull();
  });

  it('dispose() delegates to readout', () => {
    display.applyState(createDefaultTowerState());
    expect(container.innerHTML).not.toBe('');

    display.dispose();
    expect(container.innerHTML).toBe('');
  });

  it('default renderers include both readout and side-view', () => {
    expect(container.querySelector('.tdr-idle')).not.toBeNull();
    expect(container.querySelector('.tsv-wrapper')).not.toBeNull();
    expect(container.querySelector('.td-multi')).not.toBeNull();
  });

  it('renderers option: readout only', () => {
    display.dispose();
    display = new TowerDisplay({ container, renderers: 'readout' });
    expect(container.querySelector('.tdr-idle')).not.toBeNull();
    expect(container.querySelector('.tsv-wrapper')).toBeNull();
  });

  it('renderers option: side-view only', () => {
    display.dispose();
    display = new TowerDisplay({ container, renderers: 'side-view' });
    expect(container.querySelector('.tsv-wrapper')).not.toBeNull();
    expect(container.querySelector('.tdr-idle')).toBeNull();
  });

  it('lighting config helpers no-op when 3D renderer is not active', () => {
    expect(display.getLightingConfig()).toBeUndefined();
    expect(() => display.applyLightingConfig({ scene: { key: { intensity: 2.2 } } })).not.toThrow();
  });

  it('lighting config helpers delegate when 3D renderer is active', () => {
    display.dispose();
    display = new TowerDisplay({ container, renderers: '3d-view', modelUrl: TEST_MODEL_URL });

    const before = display.getLightingConfig();
    expect(before).toBeDefined();
    expect(before!.scene.key.intensity).toBe(1.6);

    display.applyLightingConfig({
      scene: {
        key: { intensity: 2.2, position: [1, 2, 3] },
        exposure: 1.1,
      },
    });

    const after = display.getLightingConfig();
    expect(after!.scene.key.intensity).toBe(2.2);
    expect(after!.scene.key.position).toEqual([1, 2, 3]);
    expect(after!.scene.exposure).toBe(1.1);
  });

  it('applyState() renders readout layers for all renderers', () => {
    display.applyState(createDefaultTowerState());
    expect(container.querySelectorAll('.tdr-layer')).toHaveLength(6);
  });

  describe('seal click propagation across renderers', () => {
    it('clicking a seal in the 2D view hides it on both 2D and 3D renderers', () => {
      display.dispose();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
      });

      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      expect(topSeal.getAttribute('data-broken')).toBe('false');
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // 2D reflects the click
      expect(topSeal.getAttribute('data-broken')).toBe('true');

      // 3D seal node has visible=false
      const view3d = (
        display as unknown as {
          view3d: { getSealNode?: (s: string, l: string) => { visible: boolean } };
        }
      ).view3d;
      const sealNodes = (
        view3d as unknown as { sealManager: { sealNodes: Map<string, { visible: boolean }> } }
      ).sealManager.sealNodes;
      expect(sealNodes.get('north:top')!.visible).toBe(false);
      expect(sealNodes.get('north:middle')!.visible).toBe(true);
    });

    it('clicking the same seal twice restores it on both renderers', () => {
      display.dispose();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
      });

      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(topSeal.getAttribute('data-broken')).toBe('false');
      const sealNodes = (
        display as unknown as {
          view3d: { sealManager: { sealNodes: Map<string, { visible: boolean }> } };
        }
      ).view3d.sealManager.sealNodes;
      expect(sealNodes.get('north:top')!.visible).toBe(true);
    });

    it('external applySeals merges with user toggles when calling fanOut', () => {
      display.dispose();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
      });

      // External breaks north-top
      display.applySeals([{ side: 'north', level: 'top' }]);

      const sealNodes = (
        display as unknown as {
          view3d: { sealManager: { sealNodes: Map<string, { visible: boolean }> } };
        }
      ).view3d.sealManager.sealNodes;
      expect(sealNodes.get('north:top')!.visible).toBe(false);

      // User clicks middle to additionally toggle it hidden
      const midSeal = container.querySelector('.tsv-seal-middle') as Element;
      midSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Both are hidden on 3D
      expect(sealNodes.get('north:top')!.visible).toBe(false);
      expect(sealNodes.get('north:middle')!.visible).toBe(false);

      // User clicks middle again — clears user toggle; external list still breaks top
      midSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(sealNodes.get('north:top')!.visible).toBe(false);
      expect(sealNodes.get('north:middle')!.visible).toBe(true);
    });

    it('user-provided onSealClick callback still fires for each click', () => {
      display.dispose();
      const handler = vi.fn();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
        onSealClick: handler,
      });

      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ side: 'north', level: 'top' });
    });

    it('clickToToggleSeals=false disables toggling but still fires onSealClick', () => {
      display.dispose();
      const handler = vi.fn();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
        clickToToggleSeals: false,
        onSealClick: handler,
      });

      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(topSeal.getAttribute('data-broken')).toBe('false');
      const sealNodes = (
        display as unknown as {
          view3d: { sealManager: { sealNodes: Map<string, { visible: boolean }> } };
        }
      ).view3d.sealManager.sealNodes;
      expect(sealNodes.get('north:top')!.visible).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('readout seal click routes through the parent onSealClick callback', () => {
      display.dispose();
      const handler = vi.fn();
      display = new TowerDisplay({
        container,
        renderers: 'readout',
        onSealClick: handler,
      });

      const btn = container.querySelector<HTMLButtonElement>(
        '[data-tdr-seal][data-side="east"][data-level="middle"]',
      );
      expect(btn).not.toBeNull();
      expect(btn!.disabled).toBe(false);
      btn!.click();
      expect(handler).toHaveBeenCalledWith({ side: 'east', level: 'middle' });
    });
  });

  describe('side change propagation', () => {
    it('selectSide fans out to every side-aware renderer', () => {
      display.dispose();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
      });

      display.selectSide('east');

      // 2D side button reflects the change.
      const activeBtn = container.querySelector(
        '.tsv-side-selector .tower-side-btn[data-active="true"]',
      );
      expect(activeBtn?.textContent).toBe('E');
    });

    it('clicking a side button in 2D fires parent onSideChange and mirrors to 3D', () => {
      display.dispose();
      const handler = vi.fn();
      display = new TowerDisplay({
        container,
        renderers: ['side-view', '3d-view'],
        modelUrl: TEST_MODEL_URL,
        onSideChange: handler,
      });

      const btnE = container.querySelector<HTMLButtonElement>(
        '.td-slot-side-view .tower-side-btn[data-side="east"]',
      );
      btnE!.click();

      expect(handler).toHaveBeenCalledWith('east');
    });
  });
});
