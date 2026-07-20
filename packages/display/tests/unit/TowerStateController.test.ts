// @vitest-environment node
import { LIGHT_EFFECTS } from 'ultimatedarktower';
import type { TowerState, SealIdentifier } from 'ultimatedarktower';
import { TowerStateController } from '../../src/state/TowerStateController';

function makeState(): TowerState {
  return {
    drum: [
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
    ],
    layer: [0, 1, 2, 3, 4, 5].map(() => ({
      light: [
        { effect: LIGHT_EFFECTS.off, loop: false },
        { effect: LIGHT_EFFECTS.off, loop: false },
        { effect: LIGHT_EFFECTS.off, loop: false },
        { effect: LIGHT_EFFECTS.off, loop: false },
      ],
    })),
    audio: { sample: 0, loop: false, volume: 0 },
    beam: { count: 0, fault: false },
    led_sequence: 0,
  } as TowerState;
}

const seal = (side: string, level: number): SealIdentifier =>
  ({ side, level }) as unknown as SealIdentifier;

describe('TowerStateController', () => {
  describe('applyState', () => {
    it('returns the input unchanged when no LED overrides are active', () => {
      const ctrl = new TowerStateController();
      const state = makeState();
      expect(ctrl.applyState(state)).toBe(state);
    });

    it('applies a single LED override to the correct cell', () => {
      const ctrl = new TowerStateController();
      ctrl.setLedOverride(1, 2, LIGHT_EFFECTS.on);
      const state = makeState();
      const resolved = ctrl.applyState(state);
      expect(resolved.layer[1].light[2].effect).toBe(LIGHT_EFFECTS.on);
      // Other cells are untouched
      expect(resolved.layer[0].light[0].effect).toBe(LIGHT_EFFECTS.off);
      expect(resolved.layer[1].light[0].effect).toBe(LIGHT_EFFECTS.off);
    });

    it('does not mutate the original state object', () => {
      const ctrl = new TowerStateController();
      ctrl.setLedOverride(0, 0, LIGHT_EFFECTS.on);
      const state = makeState();
      const original = state.layer[0].light[0].effect;
      ctrl.applyState(state);
      expect(state.layer[0].light[0].effect).toBe(original);
    });

    it('returns the same reference when overrides list is empty (fast path)', () => {
      const ctrl = new TowerStateController();
      const state = makeState();
      ctrl.applyState(state); // no overrides
      expect(ctrl.getResolvedState()).toBe(state);
    });
  });

  describe('setLedOverride', () => {
    it('returns null before any state has been applied', () => {
      const ctrl = new TowerStateController();
      expect(ctrl.setLedOverride(0, 0, LIGHT_EFFECTS.on)).toBeNull();
    });

    it('returns resolved state after state has been applied', () => {
      const ctrl = new TowerStateController();
      const state = makeState();
      ctrl.applyState(state);
      const resolved = ctrl.setLedOverride(0, 0, LIGHT_EFFECTS.on);
      expect(resolved).not.toBeNull();
      expect(resolved!.layer[0].light[0].effect).toBe(LIGHT_EFFECTS.on);
    });

    it('stores the override for use in subsequent applyState calls', () => {
      const ctrl = new TowerStateController();
      ctrl.setLedOverride(2, 3, LIGHT_EFFECTS.breathe);
      const resolved = ctrl.applyState(makeState());
      expect(resolved.layer[2].light[3].effect).toBe(LIGHT_EFFECTS.breathe);
    });
  });

  describe('applySeals / toggleSeal', () => {
    it('applySeals returns the supplied list when no toggles are active', () => {
      const ctrl = new TowerStateController();
      const broken = [seal('N', 1), seal('E', 2)];
      expect(ctrl.applySeals(broken)).toEqual(broken);
    });

    it('toggleSeal adds a seal not in the external list', () => {
      const ctrl = new TowerStateController();
      ctrl.applySeals([]);
      const list = ctrl.toggleSeal(seal('N', 1));
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ side: 'N', level: 1 });
    });

    it('toggleSeal removes a seal that was previously toggled', () => {
      const ctrl = new TowerStateController();
      ctrl.applySeals([]);
      ctrl.toggleSeal(seal('N', 1));
      const list = ctrl.toggleSeal(seal('N', 1));
      expect(list).toHaveLength(0);
    });

    it('toggleSeal does not duplicate a seal already in externalBrokenSeals', () => {
      const ctrl = new TowerStateController();
      ctrl.applySeals([seal('N', 1)]);
      const list = ctrl.toggleSeal(seal('N', 1));
      // Toggling a seal that's already external keeps it deduplicated
      const keyed = list.filter(
        (s) =>
          (s as unknown as { side: string; level: number }).side === 'N' &&
          (s as unknown as { side: string; level: number }).level === 1,
      );
      expect(keyed).toHaveLength(1);
    });

    it('toggleSeal is a no-op when togglesEnabled is false', () => {
      const ctrl = new TowerStateController({ togglesEnabled: false });
      ctrl.applySeals([]);
      const list = ctrl.toggleSeal(seal('N', 1));
      expect(list).toHaveLength(0);
    });
  });

  describe('clearLedOverrides', () => {
    it('removes overrides so applyState restores the fast path', () => {
      const ctrl = new TowerStateController();
      ctrl.setLedOverride(0, 0, LIGHT_EFFECTS.on);
      ctrl.clearLedOverrides();
      const state = makeState();
      expect(ctrl.applyState(state)).toBe(state);
    });

    it('leaves seal toggles untouched', () => {
      const ctrl = new TowerStateController();
      ctrl.applySeals([]);
      ctrl.toggleSeal(seal('N', 1));
      ctrl.setLedOverride(0, 0, LIGHT_EFFECTS.on);
      ctrl.clearLedOverrides();
      expect(ctrl.getResolvedSeals()).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('clears state, overrides, toggles, and external seals', () => {
      const ctrl = new TowerStateController();
      ctrl.applyState(makeState());
      ctrl.setLedOverride(0, 0, LIGHT_EFFECTS.on);
      ctrl.applySeals([seal('N', 1)]);
      ctrl.toggleSeal(seal('E', 2));
      ctrl.reset();
      expect(ctrl.getResolvedState()).toBeNull();
      expect(ctrl.getResolvedSeals()).toHaveLength(0);
    });
  });
});
