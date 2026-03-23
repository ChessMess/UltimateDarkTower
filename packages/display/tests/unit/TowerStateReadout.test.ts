import { TowerStateReadout } from '../../src/TowerStateReadout';
import { _resetStyleInjection } from '../../src/styles';
import {
  createDefaultTowerState,
  LIGHT_EFFECTS,
  TOWER_AUDIO_LIBRARY,
  TOWER_LIGHT_SEQUENCES,
} from 'ultimatedarktower';
import type { TowerState } from 'ultimatedarktower';

function makeState(overrides?: Partial<TowerState>): TowerState {
  const base = createDefaultTowerState();
  return { ...base, ...overrides };
}

describe('TowerStateReadout', () => {
  let container: HTMLElement;
  let readout: TowerStateReadout;

  beforeEach(() => {
    _resetStyleInjection();
    container = document.createElement('div');
    document.body.appendChild(container);
    readout = new TowerStateReadout(container);
  });

  afterEach(() => {
    readout.dispose();
    document.body.removeChild(container);
  });

  it('renders idle state on construction', () => {
    const idle = container.querySelector('.tdr-idle');
    expect(idle).not.toBeNull();
    expect(idle!.textContent).toContain('Waiting for tower state');
  });

  it('applyState() renders LED grid with 6 layers × 4 LEDs', () => {
    readout.applyState(makeState());
    const layers = container.querySelectorAll('.tdr-layer');
    expect(layers).toHaveLength(6);
    layers.forEach((layer) => {
      const leds = layer.querySelectorAll('.tdr-led');
      expect(leds).toHaveLength(4);
    });
  });

  it('LED data-effect attribute matches LIGHT_EFFECTS value', () => {
    const state = makeState();
    state.layer[0].light[0].effect = LIGHT_EFFECTS.on;
    state.layer[0].light[1].effect = LIGHT_EFFECTS.breathe;
    state.layer[0].light[2].effect = LIGHT_EFFECTS.breatheFast;
    state.layer[0].light[3].effect = LIGHT_EFFECTS.flicker;
    state.layer[1].light[0].effect = LIGHT_EFFECTS.breathe50percent;

    readout.applyState(state);
    const leds = container.querySelectorAll('.tdr-layer')[0].querySelectorAll('.tdr-led');
    expect(leds[0].getAttribute('data-effect')).toBe('on');
    expect(leds[1].getAttribute('data-effect')).toBe('breathe');
    expect(leds[2].getAttribute('data-effect')).toBe('breathe-fast');
    expect(leds[3].getAttribute('data-effect')).toBe('flicker');

    const layer1Leds = container.querySelectorAll('.tdr-layer')[1].querySelectorAll('.tdr-led');
    expect(layer1Leds[0].getAttribute('data-effect')).toBe('breathe-50');
  });

  it('layer labels use LAYER_TO_POSITION names', () => {
    readout.applyState(makeState());
    const labels = container.querySelectorAll('.tdr-layer-label');
    const expected = ['TOP_RING', 'MIDDLE_RING', 'BOTTOM_RING', 'LEDGE', 'BASE1', 'BASE2'];
    labels.forEach((label, i) => {
      expect(label.textContent).toBe(expected[i]);
    });
  });

  it('drum rows show compass direction from position', () => {
    const state = makeState();
    state.drum[0].position = 0; // N
    state.drum[1].position = 1; // E
    state.drum[2].position = 2; // S

    readout.applyState(state);
    const positions = container.querySelectorAll('.tdr-drum-pos');
    expect(positions[0].textContent).toBe('N');
    expect(positions[1].textContent).toBe('E');
    expect(positions[2].textContent).toBe('S');
  });

  it('calibrated drum shows ✓, uncalibrated shows —', () => {
    const state = makeState();
    state.drum[0].calibrated = true;
    state.drum[1].calibrated = false;

    readout.applyState(state);
    const cals = container.querySelectorAll('.tdr-drum-cal');
    expect(cals[0].textContent).toBe('\u2713');
    expect(cals[1].textContent).toBe('\u2014');
  });

  it('glyph label appears for calibrated drum at matching position', () => {
    const state = makeState();
    // Top drum, position 0 = north → should show "Cleanse" glyph
    state.drum[0].calibrated = true;
    state.drum[0].position = 0;

    readout.applyState(state);
    const glyphs = container.querySelectorAll('.tdr-glyph');
    expect(glyphs.length).toBeGreaterThanOrEqual(1);
    expect(glyphs[0].textContent).toBe('Cleanse');
  });

  it('no glyph label when drum is not calibrated', () => {
    const state = makeState();
    state.drum[0].calibrated = false;
    state.drum[0].position = 0;

    readout.applyState(state);
    const drums = container.querySelectorAll('.tdr-drum');
    const glyph = drums[0].querySelector('.tdr-glyph');
    expect(glyph).toBeNull();
  });

  it('audio shows name from TOWER_AUDIO_LIBRARY reverse lookup', () => {
    const state = makeState();
    state.audio.sample = TOWER_AUDIO_LIBRARY.Ashstrider.value;

    readout.applyState(state);
    const audioName = container.querySelector('.tdr-audio-name');
    expect(audioName!.textContent).toBe('Ashstrider');
  });

  it('audio shows "Silence" when sample=0 and loop=false', () => {
    const state = makeState();
    state.audio.sample = 0;
    state.audio.loop = false;

    readout.applyState(state);
    const audioName = container.querySelector('.tdr-audio-name');
    expect(audioName!.textContent).toBe('Silence');
  });

  it('volume shows description from VOLUME_DESCRIPTIONS', () => {
    const state = makeState();
    state.audio.volume = 0;
    readout.applyState(state);
    expect(container.querySelector('.tdr-audio-vol')!.textContent).toBe('Loud');

    state.audio.volume = 1;
    readout.applyState(state);
    expect(container.querySelector('.tdr-audio-vol')!.textContent).toBe('Medium');

    state.audio.volume = 2;
    readout.applyState(state);
    expect(container.querySelector('.tdr-audio-vol')!.textContent).toBe('Quiet');

    state.audio.volume = 3;
    readout.applyState(state);
    expect(container.querySelector('.tdr-audio-vol')!.textContent).toBe('Mute');
  });

  it('loop badge appears when audio.loop is true', () => {
    const state = makeState();
    state.audio.sample = 1;
    state.audio.loop = true;

    readout.applyState(state);
    const loopBadge = container.querySelector('.tdr-audio-loop');
    expect(loopBadge).not.toBeNull();
    expect(loopBadge!.textContent).toBe('loop');
  });

  it('no loop badge when audio.loop is false', () => {
    const state = makeState();
    state.audio.loop = false;

    readout.applyState(state);
    const loopBadge = container.querySelector('.tdr-audio-loop');
    expect(loopBadge).toBeNull();
  });

  it('led_sequence nonzero renders sequence name from TOWER_LIGHT_SEQUENCES', () => {
    const state = makeState();
    state.led_sequence = TOWER_LIGHT_SEQUENCES.defeat;

    readout.applyState(state);
    const seq = container.querySelector('.tdr-led-seq');
    expect(seq).not.toBeNull();
    expect(seq!.textContent).toContain('defeat');
  });

  it('led_sequence zero does not render sequence label', () => {
    const state = makeState();
    state.led_sequence = 0;

    readout.applyState(state);
    const seq = container.querySelector('.tdr-led-seq');
    expect(seq).toBeNull();
  });

  it('skull drop: beam.count increase from prev state adds highlight', () => {
    const state1 = makeState();
    state1.beam.count = 1;
    readout.applyState(state1);

    const state2 = makeState();
    state2.beam.count = 2;
    readout.applyState(state2);

    const skullDrop = container.querySelector('.tdr-skull-drop');
    expect(skullDrop).not.toBeNull();
    expect(skullDrop!.textContent).toContain('Skull Drop');
    expect(skullDrop!.textContent).toContain('2');
  });

  it('no skull drop on first applyState', () => {
    const state = makeState();
    state.beam.count = 3;
    readout.applyState(state);

    const skullDrop = container.querySelector('.tdr-skull-drop');
    expect(skullDrop).toBeNull();
  });

  it('beam.fault shows warning indicator', () => {
    const state = makeState();
    state.beam.fault = true;

    readout.applyState(state);
    const beamCount = container.querySelector('.tdr-beam-count');
    expect(beamCount!.textContent).toContain('\u26A0');
    expect(beamCount!.textContent).toContain('fault');
  });

  it('showIdle() resets to waiting message', () => {
    readout.applyState(makeState());
    expect(container.querySelector('.tdr-idle')).toBeNull();

    readout.showIdle();
    const idle = container.querySelector('.tdr-idle');
    expect(idle).not.toBeNull();
    expect(idle!.textContent).toContain('Waiting for tower state');
  });

  it('dispose() clears container and resets prevState', () => {
    const state1 = makeState();
    state1.beam.count = 5;
    readout.applyState(state1);

    readout.dispose();
    expect(container.innerHTML).toBe('');
  });

  it('prevState does not leak between dispose/reconstruct cycles', () => {
    const state1 = makeState();
    state1.beam.count = 5;
    readout.applyState(state1);

    readout.dispose();

    // Reconstruct
    readout = new TowerStateReadout(container);

    // Apply state with count=6 — should NOT trigger skull drop since prevState was reset
    const state2 = makeState();
    state2.beam.count = 6;
    readout.applyState(state2);

    const skullDrop = container.querySelector('.tdr-skull-drop');
    expect(skullDrop).toBeNull();
  });
});
