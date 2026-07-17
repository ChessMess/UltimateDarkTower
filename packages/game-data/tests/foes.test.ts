/**
 * Integrity tests for the foe status type + foe/adversary identity metadata.
 */
import {
  FOE_STATUSES,
  FOES,
  ADVERSARY_ROSTER,
  ALL_FOES,
  FOE_BY_ID,
  FOE_BY_NAME,
} from '../src/foes';
import { TIER1_FOES, TIER2_FOES, TIER3_FOES, ADVERSARIES } from '../src/seed/seedParser';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('FOE_STATUSES', () => {
  test('is the ordered panicked → unsteady → ready → savage → lethal progression', () => {
    expect(FOE_STATUSES).toEqual(['panicked', 'unsteady', 'ready', 'savage', 'lethal']);
  });
});

describe('FOES', () => {
  test('has the 12 tiered foes, all kind=foe and source=base', () => {
    expect(FOES).toHaveLength(12);
    for (const foe of FOES) {
      expect(foe.kind).toBe('foe');
      expect(foe.source).toBe('base');
    }
  });

  test('tier → level mapping is 1→2, 2→3, 3→4 (and every foe carries a tier)', () => {
    for (const foe of FOES) {
      expect(foe.tier).toBeDefined();
      expect(foe.level).toBe((foe.tier as number) + 1);
    }
    expect(FOES.filter((f) => f.tier === 1)).toHaveLength(4);
    expect(FOES.filter((f) => f.tier === 2)).toHaveLength(4);
    expect(FOES.filter((f) => f.tier === 3)).toHaveLength(4);
  });
});

describe('ADVERSARY_ROSTER', () => {
  test('has the 8 adversaries, all level 5, kind=adversary, no tier', () => {
    expect(ADVERSARY_ROSTER).toHaveLength(8);
    for (const adv of ADVERSARY_ROSTER) {
      expect(adv.kind).toBe('adversary');
      expect(adv.level).toBe(5);
      expect(adv.tier).toBeUndefined();
      expect(adv.source).toBe('base');
    }
  });
});

describe('ALL_FOES', () => {
  test('ids are unique + kebab-case and every entry has a display name', () => {
    expect(ALL_FOES).toHaveLength(20);
    const ids = ALL_FOES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const foe of ALL_FOES) {
      expect(foe.id).toMatch(KEBAB);
      expect(foe.name.length).toBeGreaterThan(0);
    }
  });

  test('FOE_BY_ID round-trips every entry', () => {
    expect(Object.keys(FOE_BY_ID)).toHaveLength(ALL_FOES.length);
    for (const foe of ALL_FOES) {
      expect(FOE_BY_ID[foe.id]).toBe(foe);
    }
  });

  test('FOE_BY_NAME round-trips every entry', () => {
    expect(Object.keys(FOE_BY_NAME)).toHaveLength(ALL_FOES.length);
    for (const foe of ALL_FOES) {
      expect(FOE_BY_NAME[foe.name]).toBe(foe);
    }
  });
});

describe('drift guard — names match the seed-parser enums exactly', () => {
  test('foe names equal TIER1/2/3_FOES (by tier) and adversaries equal ADVERSARIES', () => {
    const namesByTier = (tier: 1 | 2 | 3) => FOES.filter((f) => f.tier === tier).map((f) => f.name);
    expect(new Set(namesByTier(1))).toEqual(new Set(TIER1_FOES));
    expect(new Set(namesByTier(2))).toEqual(new Set(TIER2_FOES));
    expect(new Set(namesByTier(3))).toEqual(new Set(TIER3_FOES));
    expect(new Set(ADVERSARY_ROSTER.map((a) => a.name))).toEqual(new Set(ADVERSARIES));
  });
});
