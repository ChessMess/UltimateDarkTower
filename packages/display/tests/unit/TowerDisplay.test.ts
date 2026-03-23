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
});
