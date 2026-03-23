import { TowerDisplay } from '../../src/TowerDisplay';
import { _resetStyleInjection } from '../../src/styles';
import { createDefaultTowerState } from 'ultimatedarktower';

describe('TowerDisplay', () => {
  let container: HTMLElement;
  let display: TowerDisplay;

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

  it('applyState delegates to all renderers', () => {
    display.applyState(createDefaultTowerState());
    // Readout rendered layers
    expect(container.querySelectorAll('.tdr-layer')).toHaveLength(6);
    // SVG still visible
    const wrapper = container.querySelector('.tsv-wrapper') as HTMLElement;
    expect(wrapper.style.display).toBe('');
  });
});
