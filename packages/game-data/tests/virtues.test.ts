/**
 * Integrity tests for the virtue tiles, and a guard against the `gameContent` namespace
 * coming back.
 *
 * Through v2, `gameContent` held a second, poorer copy of four datasets the flat rosters
 * already covered (heroes, foes, adversaries, companions), keyed by display name with no
 * `id`. The namespace existed only to dodge the resulting name collisions. v3 deleted the
 * duplicates, which left nothing to collide — so the kingdom virtues moved here and the
 * namespace went away.
 */
import * as data from '../src/index';
import {
  ALTERNATE_CHAMPIONS,
  ALTERNATE_VIRTUES,
  KINGDOM_VIRTUES,
  kingdomVirtues,
  type KingdomDirection,
} from '../src/virtues';

describe('KINGDOM_VIRTUES', () => {
  test('one per kingdom, keyed by direction', () => {
    expect(Object.keys(KINGDOM_VIRTUES).sort()).toEqual(['East', 'North', 'South', 'West']);
    expect(kingdomVirtues).toHaveLength(4);
  });

  test('each names a champion and its ability', () => {
    for (const dir of Object.keys(KINGDOM_VIRTUES) as KingdomDirection[]) {
      const v = KINGDOM_VIRTUES[dir];
      expect(v.name).toBe(`Champion of the ${dir}`);
      expect(v.ability.length).toBeGreaterThan(0);
    }
  });
});

describe('Expeditions alternate virtues and champions', () => {
  test.each([
    ['ALTERNATE_VIRTUES', ALTERNATE_VIRTUES, 16],
    ['ALTERNATE_CHAMPIONS', ALTERNATE_CHAMPIONS, 8],
  ] as const)('%s has the expected unique, filled-in entries', (_label, list, n) => {
    expect(list).toHaveLength(n);
    expect(new Set(list.map((v) => v.name)).size).toBe(n);
    for (const v of list) expect(v.ability.length).toBeGreaterThan(0);
  });
});

describe('the gameContent namespace stays gone', () => {
  test('the package exports no gameContent', () => {
    expect(data).not.toHaveProperty('gameContent');
  });

  test('each dataset it duplicated has exactly one home', () => {
    // The point of the v3 removal: one record per entity. If a second copy of any of these
    // reappears, whatever reintroduces it should fail here first.
    expect(data.HEROES).toHaveLength(14);
    expect(data.FOES).toHaveLength(12);
    expect(data.ADVERSARY_ROSTER).toHaveLength(8);
    expect(data.ALL_FOES).toHaveLength(20);
    expect(data.COMPANION_CARDS).toHaveLength(22);
    // Heroes carry their gameplay sheet inline rather than in a parallel roster.
    expect(data.HERO_BY_NAME['Spymaster'].bannerAction).toBeTruthy();
  });
});
