import { TowerStateReadout } from '../../src/TowerStateReadout';
import { _resetStyleInjection } from '../../src/styles';
import { createDefaultTowerState, LIGHT_EFFECTS } from 'ultimatedarktower';
import type { TowerState } from 'ultimatedarktower';
import { TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES } from 'ultimatedarktowerdata';
import { EFFECT_CYCLE } from '../../src/effectLabels';

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

  describe('seal grid', () => {
    it('renders 12 seal buttons in idle state', () => {
      const seals = container.querySelectorAll('[data-tdr-seal]');
      expect(seals).toHaveLength(12);
    });

    it('applySeals([]) renders all 12 seals with data-broken="false"', () => {
      readout.applyState(makeState());
      readout.applySeals([]);
      const seals = container.querySelectorAll<HTMLButtonElement>('[data-tdr-seal]');
      expect(seals).toHaveLength(12);
      for (const s of Array.from(seals)) {
        expect(s.getAttribute('data-broken')).toBe('false');
        expect(s.getAttribute('aria-pressed')).toBe('false');
      }
    });

    it('applySeals with one broken flips only that seal', () => {
      readout.applyState(makeState());
      readout.applySeals([{ side: 'north', level: 'top' }]);
      const broken = container.querySelectorAll('[data-tdr-seal][data-broken="true"]');
      expect(broken).toHaveLength(1);
      expect(broken[0].getAttribute('data-side')).toBe('north');
      expect(broken[0].getAttribute('data-level')).toBe('top');
    });

    it('clickToToggleSeals=true fires onSealClick with correct seal identity', () => {
      readout.clickToToggleSeals = true;
      const spy = vi.fn();
      readout.onSealClick = spy;
      readout.applyState(makeState());

      const btn = container.querySelector<HTMLButtonElement>(
        '[data-tdr-seal][data-side="east"][data-level="middle"]',
      );
      expect(btn).not.toBeNull();
      expect(btn!.disabled).toBe(false);
      btn!.click();
      expect(spy).toHaveBeenCalledWith({ side: 'east', level: 'middle' });
    });

    it('clickToToggleSeals=false (default) disables buttons and never fires onSealClick', () => {
      const spy = vi.fn();
      readout.onSealClick = spy;
      readout.applyState(makeState());

      const btn = container.querySelector<HTMLButtonElement>(
        '[data-tdr-seal][data-side="south"][data-level="bottom"]',
      );
      expect(btn!.disabled).toBe(true);
      btn!.click();
      expect(spy).not.toHaveBeenCalled();
    });

    it('showIdle() keeps the seal grid and preserves broken state', () => {
      readout.applyState(makeState());
      readout.applySeals([{ side: 'west', level: 'middle' }]);

      readout.showIdle();

      expect(container.querySelector('.tdr-idle')).not.toBeNull();
      const broken = container.querySelectorAll('[data-tdr-seal][data-broken="true"]');
      expect(broken).toHaveLength(1);
      expect(broken[0].getAttribute('data-side')).toBe('west');
    });

    it('dispose() clears the container and detaches the click listener', () => {
      readout.clickToToggleSeals = true;
      const spy = vi.fn();
      readout.onSealClick = spy;
      readout.applyState(makeState());

      readout.dispose();

      expect(container.innerHTML).toBe('');
      // No buttons to click; re-attaching DOM should not refire anything on this instance.
      const ghost = document.createElement('button');
      ghost.setAttribute('data-tdr-seal', '');
      ghost.setAttribute('data-side', 'north');
      ghost.setAttribute('data-level', 'top');
      container.appendChild(ghost);
      ghost.click();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('LED click', () => {
    it('LED circles render as <button> elements', () => {
      readout.applyState(makeState());
      const led = container.querySelector('.tdr-led');
      expect(led?.tagName.toLowerCase()).toBe('button');
    });

    it('LEDs are disabled when clickToToggleLeds is false (default)', () => {
      readout.applyState(makeState());
      const leds = container.querySelectorAll<HTMLButtonElement>('.tdr-led');
      for (const led of Array.from(leds)) {
        expect(led.disabled).toBe(true);
      }
    });

    it('LEDs are enabled when clickToToggleLeds is true', () => {
      readout.clickToToggleLeds = true;
      readout.applyState(makeState());
      const leds = container.querySelectorAll<HTMLButtonElement>('.tdr-led');
      for (const led of Array.from(leds)) {
        expect(led.disabled).toBe(false);
      }
    });

    it('clicking an LED cycles the effect and fires onLedClick', () => {
      readout.clickToToggleLeds = true;
      const spy = vi.fn();
      readout.onLedClick = spy;

      const state = makeState();
      state.layer[0].light[0].effect = LIGHT_EFFECTS.off; // start at off
      readout.applyState(state);

      const firstLed = container.querySelector<HTMLButtonElement>(
        '[data-tdr-led][data-layer="0"][data-light="0"]',
      );
      expect(firstLed).not.toBeNull();
      firstLed!.click();

      // Should have advanced to the next effect in the cycle (LIGHT_EFFECTS.on)
      const expectedNext =
        EFFECT_CYCLE[(EFFECT_CYCLE.indexOf(LIGHT_EFFECTS.off) + 1) % EFFECT_CYCLE.length];
      expect(spy).toHaveBeenCalledWith(0, 0, expectedNext);
    });

    it('cycles through all 6 effects and wraps back to off', () => {
      readout.clickToToggleLeds = true;
      readout.applyState(makeState()); // all off by default

      const getFirstLed = () =>
        container.querySelector<HTMLButtonElement>(
          '[data-tdr-led][data-layer="0"][data-light="0"]',
        )!;

      const visited: number[] = [];
      for (let i = 0; i < EFFECT_CYCLE.length; i++) {
        const led = getFirstLed();
        const effectValue = EFFECT_CYCLE.indexOf(
          EFFECT_CYCLE.find((v) => {
            const mapped: Record<number, string> = {
              0: 'off',
              1: 'on',
              2: 'breathe',
              3: 'breathe-fast',
              4: 'breathe-50',
              5: 'flicker',
            };
            return mapped[v] === led.getAttribute('data-effect');
          })!,
        );
        visited.push(effectValue);
        led.click();
      }
      // After 6 clicks we should be back to the original off state
      const finalLed = getFirstLed();
      expect(finalLed.getAttribute('data-effect')).toBe('off');
      expect(visited).toHaveLength(EFFECT_CYCLE.length);
    });

    it('clicking when clickToToggleLeds=false does not change the effect or fire callback', () => {
      const spy = vi.fn();
      readout.onLedClick = spy;
      const state = makeState();
      state.layer[0].light[0].effect = LIGHT_EFFECTS.off;
      readout.applyState(state);

      const led = container.querySelector<HTMLButtonElement>(
        '[data-tdr-led][data-layer="0"][data-light="0"]',
      )!;
      led.click(); // button is disabled, click should not reach handler
      expect(spy).not.toHaveBeenCalled();
      expect(led.getAttribute('data-effect')).toBe('off');
    });

    it('override persists across subsequent applyState calls', () => {
      readout.clickToToggleLeds = true;
      readout.applyState(makeState()); // layer 0 light 0 = off

      const led = () =>
        container.querySelector<HTMLButtonElement>(
          '[data-tdr-led][data-layer="0"][data-light="0"]',
        )!;

      led().click(); // off → on

      // Apply a new state that also has light 0,0 = off
      readout.applyState(makeState());

      // Override should still show 'on', not the state's 'off'
      expect(led().getAttribute('data-effect')).toBe('on');
    });

    it('overridden LED has data-overridden="true"', () => {
      readout.clickToToggleLeds = true;
      readout.applyState(makeState());

      const led = container.querySelector<HTMLButtonElement>(
        '[data-tdr-led][data-layer="0"][data-light="0"]',
      )!;
      expect(led.getAttribute('data-overridden')).toBe('false');
      led.click();
      const updatedLed = container.querySelector<HTMLButtonElement>(
        '[data-tdr-led][data-layer="0"][data-light="0"]',
      )!;
      expect(updatedLed.getAttribute('data-overridden')).toBe('true');
    });

    it('clickToToggleLeds setter re-renders (buttons become enabled/disabled)', () => {
      readout.applyState(makeState());
      const disabledBefore = container.querySelector<HTMLButtonElement>('.tdr-led')!.disabled;
      expect(disabledBefore).toBe(true);

      readout.clickToToggleLeds = true;
      const enabledAfter = container.querySelector<HTMLButtonElement>('.tdr-led')!.disabled;
      expect(enabledAfter).toBe(false);
    });

    it('dispose() clears LED overrides (new instance starts clean)', () => {
      readout.clickToToggleLeds = true;
      readout.applyState(makeState());
      container
        .querySelector<HTMLButtonElement>('[data-tdr-led][data-layer="0"][data-light="0"]')!
        .click();

      readout.dispose();

      // Reconstruct and verify no leftover override
      readout = new TowerStateReadout(container);
      readout.clickToToggleLeds = true;
      readout.applyState(makeState());
      const led = container.querySelector<HTMLButtonElement>(
        '[data-tdr-led][data-layer="0"][data-light="0"]',
      )!;
      expect(led.getAttribute('data-overridden')).toBe('false');
      expect(led.getAttribute('data-effect')).toBe('off');
    });
  });
});
