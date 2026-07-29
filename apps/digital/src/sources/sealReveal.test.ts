import { describe, expect, it } from 'vitest';
import { createDefaultTowerState, type TowerState } from 'ultimatedarktower';
import { TOWER_LIGHT_SEQUENCES } from '@/lib/udtData';
import { detectSealReveal } from './sealReveal';

/** A state carrying `sealReveal` with the given ring lights lit. */
function revealState(lit: [level: number, side: number][]): TowerState {
  const state = createDefaultTowerState();
  state.led_sequence = TOWER_LIGHT_SEQUENCES.sealReveal;
  for (const [level, side] of lit) state.layer[level].light[side].effect = 1;
  return state;
}

describe('detectSealReveal', () => {
  it('maps a single lit ring light to its seal', () => {
    // ring layer 1 = middle drum, light index 2 = south
    expect(detectSealReveal(revealState([[1, 2]]))).toEqual({ level: 'middle', side: 'south' });
  });

  it('covers every level and side', () => {
    const levels = ['top', 'middle', 'bottom'] as const;
    const sides = ['north', 'east', 'south', 'west'] as const;
    for (let level = 0; level < levels.length; level++) {
      for (let side = 0; side < sides.length; side++) {
        expect(detectSealReveal(revealState([[level, side]]))).toEqual({
          level: levels[level],
          side: sides[side],
        });
      }
    }
  });

  it('ignores a lit ring light without the sealReveal sequence', () => {
    const state = revealState([[0, 0]]);
    state.led_sequence = 0;
    expect(detectSealReveal(state)).toBeNull();
  });

  it('refuses to guess when several openings are lit', () => {
    expect(
      detectSealReveal(
        revealState([
          [0, 0],
          [2, 3],
        ]),
      ),
    ).toBeNull();
  });

  it('returns null when the sequence is set but no ring light is lit', () => {
    expect(detectSealReveal(revealState([]))).toBeNull();
  });

  it('ignores non-ring layers (ledge and base)', () => {
    const state = revealState([]);
    state.layer[3].light[0].effect = 1; // LEDGE
    state.layer[4].light[1].effect = 1; // BASE1
    expect(detectSealReveal(state)).toBeNull();
  });
});
