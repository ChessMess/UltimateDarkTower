import { BoardRenderView } from '../src/index';
import type { BoardFocus } from '../src/index';

function makeView(onFocusChange?: (f: BoardFocus) => void): {
  view: BoardRenderView;
  mapContainer: HTMLElement;
  controlsContainer: HTMLElement;
} {
  const mapContainer = document.createElement('div');
  const controlsContainer = document.createElement('div');
  const view = new BoardRenderView({ mapContainer, controlsContainer, onFocusChange });
  return { view, mapContainer, controlsContainer };
}

describe('BoardRenderView', () => {
  it('renders the readout + map at the default focus on construction', () => {
    const { view, mapContainer } = makeView();
    expect(view.readout.getText()).toContain('focus: all/overhead');
    expect(mapContainer.querySelector('svg')).not.toBeNull();
  });

  it('setFocus fans out and fires onFocusChange; a repeat focus early-returns', () => {
    const onFocusChange = jest.fn();
    const { view } = makeView(onFocusChange);

    view.setFocus({ kingdom: 'north', angle: 'overhead' });
    expect(view.focus).toEqual({ kingdom: 'north', angle: 'overhead' });
    expect(view.readout.getText()).toContain('focus: north/overhead');
    expect(onFocusChange).toHaveBeenCalledTimes(1);

    view.setFocus({ kingdom: 'north', angle: 'overhead' }); // identical → no-op
    expect(onFocusChange).toHaveBeenCalledTimes(1);
  });

  it('re-renders on a controller state change', () => {
    const { view } = makeView();
    expect(view.readout.getText()).toContain('Heroes (0):');
    view.controller.placeHero('hero-1', 'Broken Lands');
    expect(view.readout.getText()).toContain('hero-1 @ Broken Lands');
  });

  it('dispose tears down the map + controls and unsubscribes', () => {
    const { view, mapContainer, controlsContainer } = makeView();
    expect(mapContainer.childNodes.length).toBeGreaterThan(0);
    view.dispose();
    expect(mapContainer.childNodes.length).toBe(0);
    expect(controlsContainer.querySelector('.udt-focus-controls')).toBeNull();
    // A post-dispose change must not throw or re-render.
    const before = view.readout.getText();
    view.controller.placeHero('hero-2', 'Dayside');
    expect(view.readout.getText()).toBe(before);
  });

  it('a map token click flows into view.selection', () => {
    const mapContainer = document.createElement('div');
    const view = new BoardRenderView({ mapContainer, boardImageUrl: '/b.png' });
    view.controller.spawnFoe('foe-1', 'Brigands', 'Dayside');
    const foe = mapContainer.querySelector('.udt-token[data-id="foe-1"]') as SVGGElement;
    foe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(view.selection.get()).toEqual({ kind: 'foe', id: 'foe-1', location: 'Dayside' });
  });

  it('a uiContainer mounts the editing UI and dispose tears it down', () => {
    const uiContainer = document.createElement('div');
    const view = new BoardRenderView({ uiContainer });
    expect(uiContainer.querySelector('.udt-board-ui')).not.toBeNull();
    view.dispose();
    expect(uiContainer.querySelector('.udt-board-ui')).toBeNull();
  });

  it('an armed map space pick reaches view.locationPick', () => {
    const mapContainer = document.createElement('div');
    const view = new BoardRenderView({ mapContainer, boardImageUrl: '/b.png' });
    const picked: string[] = [];
    view.locationPick.subscribe((e) => e.type === 'picked' && picked.push(e.location));
    view.locationPick.arm({ kind: 'foe', label: 'Brigands (foe)', targets: 'all' });
    const space = mapContainer.querySelector('.udt-space[data-location="Dayside"]') as SVGElement;
    space.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual(['Dayside']);
  });
});
