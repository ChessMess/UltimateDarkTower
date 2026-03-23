import { TowerSideView } from '../../src/TowerSideView';
import { _resetStyleInjection } from '../../src/styles';
import { createDefaultTowerState } from 'ultimatedarktower';

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
    const buttons = container.querySelectorAll('.tsv-side-btn');
    expect(buttons).toHaveLength(4);
    expect(buttons[0].textContent).toBe('N');
    expect(buttons[1].textContent).toBe('E');
    expect(buttons[2].textContent).toBe('S');
    expect(buttons[3].textContent).toBe('W');
  });

  it('north is active by default', () => {
    const buttons = container.querySelectorAll('.tsv-side-btn');
    expect(buttons[0].getAttribute('data-active')).toBe('true');
    expect(buttons[1].getAttribute('data-active')).toBe('false');
  });

  it('clicking a side button updates active state', () => {
    const buttons = container.querySelectorAll('.tsv-side-btn');
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
});
