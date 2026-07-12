/**
 * Integrity tests for the gameplay content data (heroes, virtues, foes, adversaries,
 * companions, kingdom virtues). These intentionally use the spreadsheet's wording and
 * are NOT reconciled with TOWER_AUDIO_LIBRARY keys.
 */
import {
  HEROES,
  heroes,
  FOES,
  foes,
  ADVERSARIES,
  adversaries,
  COMPANIONS,
  companions,
  KINGDOM_VIRTUES,
  kingdomVirtues,
} from '../src/data/udtGameContent';

describe('HEROES (gameplay content)', () => {
  test('has 10 heroes and the keyed/list views agree', () => {
    expect(Object.keys(HEROES)).toHaveLength(10);
    expect(heroes).toHaveLength(10);
  });

  test('each hero has 2 default + 3 unlockable virtues and a banner action', () => {
    for (const hero of heroes) {
      expect(hero.name.length).toBeGreaterThan(0);
      expect(['Base Game', 'Alliances', 'Covenant']).toContain(hero.expansion);
      expect(hero.bannerAction.length).toBeGreaterThan(0);
      expect(hero.defaultVirtues).toHaveLength(2);
      expect(hero.unlockableVirtues).toHaveLength(3);
      for (const v of [...hero.defaultVirtues, ...hero.unlockableVirtues]) {
        expect(v.name.length).toBeGreaterThan(0);
        expect(v.ability.length).toBeGreaterThan(0);
      }
    }
  });

  test('key matches the hero name', () => {
    for (const [key, hero] of Object.entries(HEROES)) {
      expect(hero.name).toBe(key);
    }
  });
});

describe('FOES / ADVERSARIES (gameplay content)', () => {
  test('12 foes at levels 2–4', () => {
    expect(foes).toHaveLength(12);
    expect(Object.keys(FOES)).toHaveLength(12);
    for (const foe of foes) {
      expect([2, 3, 4]).toContain(foe.level);
    }
  });

  test('8 adversaries, all level 5', () => {
    expect(adversaries).toHaveLength(8);
    expect(Object.keys(ADVERSARIES)).toHaveLength(8);
    for (const adv of adversaries) {
      expect(adv.level).toBe(5);
    }
  });
});

describe('COMPANIONS', () => {
  test('10 companions, each with a title', () => {
    expect(companions).toHaveLength(10);
    expect(Object.keys(COMPANIONS)).toHaveLength(10);
    for (const c of companions) {
      expect(c.title.length).toBeGreaterThan(0);
    }
  });
});

describe('KINGDOM_VIRTUES', () => {
  test('keyed by the four directions', () => {
    expect(Object.keys(KINGDOM_VIRTUES).sort()).toEqual(['East', 'North', 'South', 'West']);
    expect(kingdomVirtues).toHaveLength(4);
  });
});
