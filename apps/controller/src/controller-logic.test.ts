import { describe, it, expect } from 'vitest';
import {
  TOWER_LAYERS,
  getTowerLayerForLevel,
  getLightIndexForSide,
  getLedgeLightIndexForSide,
  getBaseLightIndexForSide,
} from 'ultimatedarktower';
import {
  SIDES,
  computeGlyphMove,
  stepVolume,
  MUTE_VOLUME,
  resolveLightAddress,
} from './controller-logic';

// Unit tests for the pure logic lifted out of TowerController.ts. Before this extraction none of it
// was reachable from a test — the whole file is window-assigned onclick handlers.

describe('computeGlyphMove', () => {
  it('reports already-at-target when the glyph is already on the target side', () => {
    const r = computeGlyphMove('north', 'north', 'east');
    expect(r).toEqual({ ok: false, reason: 'already-at-target' });
  });

  it('rejects an unrecognized side', () => {
    expect(computeGlyphMove('nowhere', 'north', 'north')).toEqual({
      ok: false,
      reason: 'invalid-side',
    });
    expect(computeGlyphMove('north', 'nowhere', 'north')).toEqual({
      ok: false,
      reason: 'invalid-side',
    });
    expect(computeGlyphMove('north', 'east', 'nowhere')).toEqual({
      ok: false,
      reason: 'invalid-side',
    });
  });

  it('advances the drum by the same clockwise steps as the glyph', () => {
    // glyph north → east is one step clockwise; a drum at north lands on east.
    expect(computeGlyphMove('north', 'east', 'north')).toEqual({
      ok: true,
      rotationSteps: 1,
      targetDrumPosition: 'east',
    });
    // Same one-step glyph move, but the drum starts at west → wraps to north.
    expect(computeGlyphMove('north', 'east', 'west')).toEqual({
      ok: true,
      rotationSteps: 1,
      targetDrumPosition: 'north',
    });
    // glyph south → north is two steps; drum east advances two → west.
    expect(computeGlyphMove('south', 'north', 'east')).toEqual({
      ok: true,
      rotationSteps: 2,
      targetDrumPosition: 'west',
    });
  });

  it('holds the invariant that the drum moves by rotationSteps for every side triple', () => {
    for (const glyph of SIDES) {
      for (const target of SIDES) {
        for (const drum of SIDES) {
          const r = computeGlyphMove(glyph, target, drum);
          if (!r.ok) {
            // The only non-ok case for valid sides is "already at target".
            expect(glyph).toBe(target);
            continue;
          }
          const drumStart = SIDES.indexOf(drum);
          const drumEnd = SIDES.indexOf(r.targetDrumPosition);
          expect((drumEnd - drumStart + 4) % 4).toBe(r.rotationSteps);
        }
      }
    }
  });
});

describe('stepVolume', () => {
  it('steps up, clamping at Mute', () => {
    expect(stepVolume(0, 'up')).toEqual({ volume: 1, changed: true, playFeedback: true });
    expect(stepVolume(MUTE_VOLUME, 'up')).toEqual({
      volume: MUTE_VOLUME,
      changed: false,
      playFeedback: false,
    });
  });

  it('suppresses feedback exactly at Mute (the guard that used to hide in volumeDown)', () => {
    // 2 → 3 is a real change, but Mute is inaudible so no feedback sound plays.
    expect(stepVolume(MUTE_VOLUME - 1, 'up')).toEqual({
      volume: MUTE_VOLUME,
      changed: true,
      playFeedback: false,
    });
  });

  it('steps down, clamping at 0, always with feedback (never reaches Mute)', () => {
    expect(stepVolume(MUTE_VOLUME, 'down')).toEqual({
      volume: MUTE_VOLUME - 1,
      changed: true,
      playFeedback: true,
    });
    expect(stepVolume(1, 'down')).toEqual({ volume: 0, changed: true, playFeedback: true });
    expect(stepVolume(0, 'down')).toEqual({ volume: 0, changed: false, playFeedback: false });
  });
});

describe('resolveLightAddress', () => {
  it('maps a doorway light by level → layer and side → light index', () => {
    expect(
      resolveLightAddress({
        lightType: 'doorway',
        lightLocation: 'north',
        lightLevel: 'top',
        lightBaseLocation: null,
      }),
    ).toEqual({
      layerIndex: getTowerLayerForLevel('top'),
      lightIndex: getLightIndexForSide('north'),
    });
  });

  it('addresses a ledge light by CORNER, not side (the TowerSide/TowerCorner drift guard)', () => {
    expect(
      resolveLightAddress({
        lightType: 'ledge',
        lightLocation: 'northeast',
        lightLevel: null,
        lightBaseLocation: null,
      }),
    ).toEqual({
      layerIndex: TOWER_LAYERS.LEDGE,
      lightIndex: getLedgeLightIndexForSide('northeast'),
    });
  });

  it('maps base lights, selecting BASE2 for base-location "b" and BASE1 otherwise', () => {
    expect(
      resolveLightAddress({
        lightType: 'base',
        lightLocation: 'south',
        lightLevel: null,
        lightBaseLocation: 'b',
      }),
    ).toEqual({
      layerIndex: TOWER_LAYERS.BASE2,
      lightIndex: getBaseLightIndexForSide('south'),
    });
    expect(
      resolveLightAddress({
        lightType: 'base',
        lightLocation: 'south',
        lightLevel: null,
        lightBaseLocation: 'a',
      }),
    ).toEqual({
      layerIndex: TOWER_LAYERS.BASE1,
      lightIndex: getBaseLightIndexForSide('south'),
    });
  });

  it('returns null for an unknown or absent light type', () => {
    expect(
      resolveLightAddress({
        lightType: null,
        lightLocation: 'north',
        lightLevel: 'top',
        lightBaseLocation: null,
      }),
    ).toBeNull();
    expect(
      resolveLightAddress({
        lightType: 'sparkle',
        lightLocation: 'north',
        lightLevel: 'top',
        lightBaseLocation: null,
      }),
    ).toBeNull();
  });
});
