import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock(
  '../../src/2d/TowerSide.svg?raw',
  () => `
  <svg viewBox="0 0 180 374" xmlns="http://www.w3.org/2000/svg">
    <g id="layer1">
      <circle id="base-right-back-led" />
      <circle id="base-right-front-led" />
      <circle id="ledge-right-led" />
      <circle id="ledge-left-led" />
      <circle id="base-left-back-led" />
      <circle id="base-left-front-led" />
      <circle id="bottom-doorway-led" />
      <ellipse id="middle-doorway-led" />
      <circle id="top-doorway-led" />
    </g>
  </svg>
`,
);

import { TowerSideView } from '../../src/2d/TowerSideView';
import { _resetStyleInjection } from '../../src/styles';
import { createDefaultTowerState, LIGHT_EFFECTS } from 'ultimatedarktower';

function findLedById(container: HTMLElement, id: string): Element | null {
  return container.querySelector(`#${id}`);
}

describe('TowerSideView', () => {
  let container: HTMLElement;
  let view: TowerSideView;

  beforeEach(() => {
    _resetStyleInjection();
    container = document.createElement('div');
    document.body.appendChild(container);
    view = new TowerSideView(container);
  });

  afterEach(() => {
    view.dispose();
    document.body.removeChild(container);
  });

  it('injects SVG into container on construction', () => {
    const wrapper = container.querySelector('.tsv-wrapper');
    expect(wrapper).not.toBeNull();
    const svg = wrapper!.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders N/E/S/W side selector buttons', () => {
    const buttons = container.querySelectorAll('.tower-side-btn');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].textContent).toBe('N');
    expect(buttons[1].textContent).toBe('E');
    expect(buttons[2].textContent).toBe('S');
    expect(buttons[3].textContent).toBe('W');
  });

  it('north is active by default', () => {
    const buttons = container.querySelectorAll('.tower-side-btn');
    expect(buttons[0].getAttribute('data-active')).toBe('true');
    expect(buttons[1].getAttribute('data-active')).toBe('false');
  });

  it('clicking a side button updates active state', () => {
    const buttons = container.querySelectorAll('.tower-side-btn');
    (buttons[2] as HTMLButtonElement).click();
    expect(buttons[0].getAttribute('data-active')).toBe('false');
    expect(buttons[2].getAttribute('data-active')).toBe('true');
  });

  it('showIdle() hides the wrapper', () => {
    view.showIdle();
    const wrapper = container.querySelector('.tsv-wrapper') as HTMLElement;
    expect(wrapper.style.display).toBe('none');
  });

  it('applyState() shows the wrapper after idle', () => {
    view.showIdle();
    view.applyState(createDefaultTowerState());
    const wrapper = container.querySelector('.tsv-wrapper') as HTMLElement;
    expect(wrapper.style.display).toBe('');
  });

  it('dispose() removes wrapper from DOM', () => {
    view.dispose();
    expect(container.querySelector('.tsv-wrapper')).toBeNull();
  });

  it('injects seal overlays onto each doorway', () => {
    const seals = container.querySelectorAll('.tsv-seal');
    expect(seals).toHaveLength(3);
    expect(container.querySelector('.tsv-seal-top')).not.toBeNull();
    expect(container.querySelector('.tsv-seal-middle')).not.toBeNull();
    expect(container.querySelector('.tsv-seal-bottom')).not.toBeNull();
  });

  it('inserts seals below LED nodes so doorway LEDs stay visible', () => {
    const topSeal = container.querySelector('.tsv-seal-top');
    const topDoorwayLed = findLedById(container, 'top-doorway-led');

    expect(topSeal).not.toBeNull();
    expect(topDoorwayLed).not.toBeNull();

    const position = topSeal!.compareDocumentPosition(topDoorwayLed!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('double dispose does not throw', () => {
    view.dispose();
    expect(() => view.dispose()).not.toThrow();
  });

  it('applyState() maps light effects onto SVG LED markers', () => {
    const state = createDefaultTowerState();
    state.layer[0].light[0].effect = LIGHT_EFFECTS.on; // NORTH ring → top doorway on N view
    state.layer[3].light[0].effect = LIGHT_EFFECTS.breatheFast; // NE corner → right ledge on N view
    state.layer[5].light[3].effect = LIGHT_EFFECTS.flicker; // NW corner → left base-back on N view

    view.applyState(state);

    const topDoorway = findLedById(container, 'top-doorway-led');
    const ledgeRight = findLedById(container, 'ledge-right-led');
    const baseLeftBack = findLedById(container, 'base-left-back-led');

    expect(topDoorway?.getAttribute('data-effect')).toBe('on');
    expect(ledgeRight?.getAttribute('data-effect')).toBe('breathe-fast');
    expect(baseLeftBack?.getAttribute('data-effect')).toBe('flicker');
  });

  it('unknown light effect falls back to off marker', () => {
    const state = createDefaultTowerState();
    state.layer[0].light[0].effect = 9999 as never;

    view.applyState(state);

    const topDoorway = findLedById(container, 'top-doorway-led');
    expect(topDoorway?.getAttribute('data-effect')).toBe('off');
  });

  it('clicking multiple side buttons leaves only one active', () => {
    const buttons = container.querySelectorAll('.tower-side-btn');
    (buttons[1] as HTMLButtonElement).click();
    (buttons[3] as HTMLButtonElement).click();
    const activeButtons = container.querySelectorAll('.tower-side-btn[data-active="true"]');
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0].textContent).toBe('W');
  });

  it('re-maps LEDs when selecting a different side without a new state update', () => {
    const state = createDefaultTowerState();
    state.layer[3].light[3].effect = LIGHT_EFFECTS.on;

    view.applyState(state);

    const ledgeLeft = findLedById(container, 'ledge-left-led');
    const ledgeRight = findLedById(container, 'ledge-right-led');
    expect(ledgeLeft?.getAttribute('data-effect')).toBe('on');
    expect(ledgeRight?.getAttribute('data-effect')).toBe('off');

    const buttons = container.querySelectorAll('.tower-side-btn');
    (buttons[1] as HTMLButtonElement).click(); // east

    // NW corner (light[3]) is not adjacent to the east face; neither side shows it
    expect(ledgeLeft?.getAttribute('data-effect')).toBe('off');
    expect(ledgeRight?.getAttribute('data-effect')).toBe('off');

    (buttons[2] as HTMLButtonElement).click(); // south
    expect(ledgeLeft?.getAttribute('data-effect')).toBe('off');
    expect(ledgeRight?.getAttribute('data-effect')).toBe('off');
  });

  it('re-maps all edge LEDs consistently across sides', () => {
    const state = createDefaultTowerState();
    state.layer[3].light[3].effect = LIGHT_EFFECTS.on;
    state.layer[4].light[3].effect = LIGHT_EFFECTS.on;
    state.layer[5].light[3].effect = LIGHT_EFFECTS.on;

    view.applyState(state);

    const ledgeLeft = findLedById(container, 'ledge-left-led');
    const ledgeRight = findLedById(container, 'ledge-right-led');
    const baseLeftFront = findLedById(container, 'base-left-front-led');
    const baseRightFront = findLedById(container, 'base-right-front-led');
    const baseLeftBack = findLedById(container, 'base-left-back-led');
    const baseRightBack = findLedById(container, 'base-right-back-led');

    expect(ledgeLeft?.getAttribute('data-effect')).toBe('on');
    expect(baseLeftFront?.getAttribute('data-effect')).toBe('on');
    expect(baseLeftBack?.getAttribute('data-effect')).toBe('on');

    const buttons = container.querySelectorAll('.tower-side-btn');
    (buttons[1] as HTMLButtonElement).click(); // east — NW corner not adjacent to east face

    expect(ledgeLeft?.getAttribute('data-effect')).toBe('off');
    expect(ledgeRight?.getAttribute('data-effect')).toBe('off');
    expect(baseLeftFront?.getAttribute('data-effect')).toBe('off');
    expect(baseRightFront?.getAttribute('data-effect')).toBe('off');
    expect(baseLeftBack?.getAttribute('data-effect')).toBe('off');
    expect(baseRightBack?.getAttribute('data-effect')).toBe('off');
  });

  describe('clickToToggleSeals', () => {
    it('clicking a seal hides it (toggles to broken)', () => {
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      expect(topSeal.getAttribute('data-broken')).toBe('false');
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');
    });

    it('clicking a hidden seal shows it again (toggles back)', () => {
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('false');
    });

    it('each seal toggles independently', () => {
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      const midSeal = container.querySelector('.tsv-seal-middle') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');
      expect(midSeal.getAttribute('data-broken')).toBe('false');
    });

    it('onSealClick still fires when clickToToggleSeals is enabled', () => {
      const handler = jest.fn();
      view.onSealClick = handler;
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ side: 'north', level: 'top' });
    });

    it('when clickToToggleSeals is false, clicking does not change visibility', () => {
      view.clickToToggleSeals = false;
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('false');
    });

    it('when clickToToggleSeals is false, onSealClick still fires', () => {
      view.clickToToggleSeals = false;
      const handler = jest.fn();
      view.onSealClick = handler;
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('user-toggled seal stays hidden even after applySeals([]) does not list it', () => {
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');
      view.applySeals([]);
      expect(topSeal.getAttribute('data-broken')).toBe('true');
    });

    it('seal hidden by both user toggle and applySeals remains hidden after un-toggling', () => {
      view.applySeals([{ side: 'north', level: 'top' }]);
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      // Also user-toggle it hidden (redundant but valid)
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');
      // User clicks again — removes user toggle, but game still has it broken
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');
    });

    it('user toggle is per-side — toggling north seal does not affect same level on other sides', () => {
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(topSeal.getAttribute('data-broken')).toBe('true');

      // Switch to east side
      const buttons = container.querySelectorAll('.tower-side-btn');
      (buttons[1] as HTMLButtonElement).click();
      const eastTopSeal = container.querySelector('.tsv-seal-top') as Element;
      expect(eastTopSeal.getAttribute('data-broken')).toBe('false');
    });

    it('dispose() clears user toggle state', () => {
      const topSeal = container.querySelector('.tsv-seal-top') as Element;
      topSeal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      view.dispose();
      // Rebuild in same container
      view = new TowerSideView(container);
      const freshTopSeal = container.querySelector('.tsv-seal-top') as Element;
      expect(freshTopSeal.getAttribute('data-broken')).toBe('false');
    });
  });

  describe('selectSide', () => {
    it('public selectSide moves the active side and fires onSideChange', () => {
      const spy = jest.fn();
      view.onSideChange = spy;
      view.selectSide('east');
      const buttons = container.querySelectorAll('.tower-side-btn');
      expect(buttons[1].getAttribute('data-active')).toBe('true');
      expect(spy).toHaveBeenCalledWith('east');
    });

    it('selectSide to current side is a no-op (loop prevention)', () => {
      const spy = jest.fn();
      view.onSideChange = spy;
      view.selectSide('north'); // already north by default
      expect(spy).not.toHaveBeenCalled();
    });

    it('user button click fires onSideChange', () => {
      const spy = jest.fn();
      view.onSideChange = spy;
      const buttons = container.querySelectorAll<HTMLButtonElement>('.tower-side-btn');
      buttons[2].click(); // south
      expect(spy).toHaveBeenCalledWith('south');
    });
  });
});
