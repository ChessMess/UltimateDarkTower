import { BoardStateController, createSelectionStore, mountBoardUI } from '../src/index';
import type { BoardUIHandle, BoardUIOptions } from '../src/index';

type ExtraOptions = Partial<Omit<BoardUIOptions, 'controller' | 'selection'>>;

function setup(options: ExtraOptions = {}): {
  controller: BoardStateController;
  host: HTMLElement;
  handle: BoardUIHandle;
} {
  const controller = new BoardStateController();
  const selection = createSelectionStore();
  const host = document.createElement('div');
  const handle = mountBoardUI(host, { controller, selection, ...options });
  return { controller, host, handle };
}

const panelOf = (host: HTMLElement, innerSelector: string): HTMLElement => {
  const panel = host.querySelector(innerSelector)?.closest('.udt-panel');
  if (!panel) throw new Error(`no panel for ${innerSelector}`);
  return panel as HTMLElement;
};

describe('Summary panel', () => {
  it('counts per kingdom and updates on change', () => {
    const { controller, host } = setup();
    const metric = (kingdom: string, m: string): string =>
      host.querySelector(`[data-kingdom="${kingdom}"] [data-metric="${m}"]`)?.textContent ?? '';

    expect(metric('north', 'foes')).toBe('0');

    controller.placeHero('h1', 'Dayside');
    controller.spawnFoe('f1', 'Brigands', 'Dayside');
    controller.spawnFoe('f2', 'Oreks', 'Radiant Mountains');
    controller.addSkull('Dayside', 2);

    expect(metric('north', 'heroes')).toBe('1');
    expect(metric('north', 'foes')).toBe('2');
    expect(metric('north', 'skulls')).toBe('2');
  });
});

describe('Panel config + lifecycle', () => {
  it('hides a panel via config and reveals it via setPanelVisible', () => {
    const { host, handle } = setup({ panels: { summary: false } });
    const summary = panelOf(host, '.udt-summary');
    expect(summary.style.display).toBe('none');
    handle.setPanelVisible('summary', true);
    expect(summary.style.display).not.toBe('none');
  });

  it('drags a floating panel by its titlebar', () => {
    const { host } = setup({ panels: { palette: { x: 10, y: 20 } } });
    const palette = panelOf(host, '.udt-palette-add');
    const bar = palette.querySelector('.udt-panel-title') as HTMLElement;

    bar.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 40 }));
    document.dispatchEvent(new MouseEvent('mouseup', {}));

    expect(palette.style.left).toBe('40px');
    expect(palette.style.top).toBe('60px');
  });

  it('dispose tears everything down and stops responding to changes', () => {
    const { controller, host, handle } = setup();
    expect(host.querySelector('.udt-board-ui')).not.toBeNull();
    handle.dispose();
    expect(host.querySelector('.udt-board-ui')).toBeNull();
    // A post-dispose change must not throw (subscriptions were removed).
    expect(() => controller.spawnFoe('f1', 'Brigands', 'Dayside')).not.toThrow();
  });
});
