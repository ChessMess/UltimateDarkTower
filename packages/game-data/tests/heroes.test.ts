/**
 * Integrity tests for the hero roster.
 */
import { HEROES, HERO_BY_ID, HERO_BY_NAME, type ContentSource } from '../src/heroes';

describe('HEROES', () => {
  test('has the 14 heroes with the expected per-source counts', () => {
    expect(HEROES).toHaveLength(14);
    const count = (s: ContentSource): number => HEROES.filter((h) => h.source === s).length;
    expect(count('base')).toBe(4);
    expect(count('alliances')).toBe(2);
    expect(count('covenant')).toBe(4);
    expect(count('expeditions')).toBe(4);
  });

  test('ids are unique, kebab-case, and every entry has a display name', () => {
    const ids = HEROES.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const hero of HEROES) {
      expect(hero.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(hero.name.length).toBeGreaterThan(0);
    }
  });

  test('HERO_BY_ID round-trips every hero', () => {
    expect(Object.keys(HERO_BY_ID)).toHaveLength(HEROES.length);
    for (const hero of HEROES) {
      expect(HERO_BY_ID[hero.id]).toBe(hero);
    }
  });

  test('HERO_BY_NAME round-trips every hero', () => {
    // The join the old gameContent.HEROES was keyed on. Names must stay unique for it to work.
    expect(Object.keys(HERO_BY_NAME)).toHaveLength(HEROES.length);
    for (const hero of HEROES) {
      expect(HERO_BY_NAME[hero.name]).toBe(hero);
    }
  });
});

/**
 * The gameplay sheet, merged in from gameContent.HEROES in v3. Every hero carries 2 + 3
 * virtues; the Expeditions four have no banner action recorded yet.
 */
describe('hero gameplay sheets', () => {
  test('every hero has 2 default + 3 unlockable named virtues', () => {
    for (const hero of HEROES) {
      expect(hero.defaultVirtues).toHaveLength(2);
      expect(hero.unlockableVirtues).toHaveLength(3);
      for (const v of [...(hero.defaultVirtues ?? []), ...(hero.unlockableVirtues ?? [])]) {
        expect(v.name.length).toBeGreaterThan(0);
        expect(v.ability.length).toBeGreaterThan(0);
      }
    }
  });

  test('banner actions: all 10 pre-Expeditions heroes have one, Expeditions ones are not guessed', () => {
    for (const hero of HEROES) {
      if (hero.source === 'expeditions') expect(hero.bannerAction).toBeUndefined();
      else expect(hero.bannerAction?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test('virtue names are unique within a hero', () => {
    for (const hero of HEROES) {
      const names = [...(hero.defaultVirtues ?? []), ...(hero.unlockableVirtues ?? [])].map(
        (v) => v.name,
      );
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
