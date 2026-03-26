import { ObserverDisplay } from '../../../packages/host/src/observerDisplay';
import { createDefaultTowerState, LIGHT_EFFECTS } from 'ultimatedarktower';
import {
  buildAllLightsCommand,
  buildSingleLightCommand,
  buildRotateCommand,
  buildSoundCommand,
  buildCustomCommand,
} from '../../helpers/commandBuilders';

describe('ObserverDisplay', () => {
  let observer: ObserverDisplay;

  beforeEach(() => {
    observer = new ObserverDisplay();
  });

  describe('initial state', () => {
    it('starts with default tower state', () => {
      const state = observer.getCurrentState();
      const expected = createDefaultTowerState();
      expect(state).toEqual(expected);
    });

    it('starts with zero command count', () => {
      expect(observer.getCommandCount()).toBe(0);
    });

    it('starts with null lastReceivedAt', () => {
      expect(observer.getLastReceivedAt()).toBeNull();
    });
  });

  describe('onCommandReceived', () => {
    it('decodes light effects from a valid 20-byte packet', () => {
      const cmd = buildAllLightsCommand(LIGHT_EFFECTS.on);
      observer.onCommandReceived(cmd);
      const state = observer.getCurrentState();
      for (const layer of state.layer) {
        for (const light of layer.light) {
          expect(light.effect).toBe(LIGHT_EFFECTS.on);
        }
      }
    });

    it('decodes single light in specific layer/position', () => {
      const cmd = buildSingleLightCommand(2, 1, LIGHT_EFFECTS.flicker);
      observer.onCommandReceived(cmd);
      const state = observer.getCurrentState();
      expect(state.layer[2].light[1].effect).toBe(LIGHT_EFFECTS.flicker);
      // Other lights remain off
      expect(state.layer[0].light[0].effect).toBe(LIGHT_EFFECTS.off);
    });

    it('decodes drum positions', () => {
      const cmd = buildRotateCommand(0, 1, 2);
      observer.onCommandReceived(cmd);
      const state = observer.getCurrentState();
      expect(state.drum[0].position).toBe(0);
      expect(state.drum[1].position).toBe(1);
      expect(state.drum[2].position).toBe(2);
    });

    it('decodes audio sample', () => {
      const cmd = buildSoundCommand(0x25);
      observer.onCommandReceived(cmd);
      const state = observer.getCurrentState();
      expect(state.audio.sample).toBe(0x25);
    });

    it('increments command count', () => {
      const cmd = buildAllLightsCommand(LIGHT_EFFECTS.off);
      observer.onCommandReceived(cmd);
      observer.onCommandReceived(cmd);
      observer.onCommandReceived(cmd);
      expect(observer.getCommandCount()).toBe(3);
    });

    it('updates lastReceivedAt timestamp', () => {
      const before = new Date();
      const cmd = buildAllLightsCommand(LIGHT_EFFECTS.off);
      observer.onCommandReceived(cmd);
      const after = new Date();
      const ts = observer.getLastReceivedAt();
      expect(ts).toBeInstanceOf(Date);
      expect(ts!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(ts!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('ignores packets with wrong length', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      observer.onCommandReceived(Buffer.alloc(10));
      observer.onCommandReceived(Buffer.alloc(25));
      expect(observer.getCommandCount()).toBe(0);
      expect(observer.getCurrentState()).toEqual(createDefaultTowerState());
      expect(warnSpy).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });

    it('accepts Buffer input', () => {
      const cmd = buildAllLightsCommand(LIGHT_EFFECTS.on);
      observer.onCommandReceived(Buffer.from(cmd));
      expect(observer.getCommandCount()).toBe(1);
    });

    it('accepts Uint8Array input', () => {
      const cmd = buildAllLightsCommand(LIGHT_EFFECTS.on);
      observer.onCommandReceived(new Uint8Array(cmd));
      expect(observer.getCommandCount()).toBe(1);
    });

    it('accepts number[] input', () => {
      const cmd = buildAllLightsCommand(LIGHT_EFFECTS.on);
      observer.onCommandReceived(Array.from(cmd));
      expect(observer.getCommandCount()).toBe(1);
    });
  });

  describe('reset', () => {
    it('restores default state after receiving commands', () => {
      observer.onCommandReceived(buildAllLightsCommand(LIGHT_EFFECTS.on));
      observer.reset();
      expect(observer.getCurrentState()).toEqual(createDefaultTowerState());
    });

    it('resets command count to zero', () => {
      observer.onCommandReceived(buildAllLightsCommand(LIGHT_EFFECTS.off));
      observer.reset();
      expect(observer.getCommandCount()).toBe(0);
    });

    it('resets lastReceivedAt to null', () => {
      observer.onCommandReceived(buildAllLightsCommand(LIGHT_EFFECTS.off));
      observer.reset();
      expect(observer.getLastReceivedAt()).toBeNull();
    });
  });

  describe('custom state mutations', () => {
    it('decodes beam/skull count', () => {
      const cmd = buildCustomCommand((s) => { s.beam.count = 3; });
      observer.onCommandReceived(cmd);
      expect(observer.getCurrentState().beam.count).toBe(3);
    });

    it('decodes audio loop flag', () => {
      const cmd = buildCustomCommand((s) => { s.audio.loop = true; });
      observer.onCommandReceived(cmd);
      expect(observer.getCurrentState().audio.loop).toBe(true);
    });

    it('decodes drum calibration', () => {
      const cmd = buildCustomCommand((s) => { s.drum[0].calibrated = true; });
      observer.onCommandReceived(cmd);
      expect(observer.getCurrentState().drum[0].calibrated).toBe(true);
    });

    it('decodes led_sequence', () => {
      const cmd = buildCustomCommand((s) => { s.led_sequence = 0x0c; });
      observer.onCommandReceived(cmd);
      expect(observer.getCurrentState().led_sequence).toBe(0x0c);
    });
  });
});
