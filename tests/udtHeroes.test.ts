/**
 * Integrity tests for the hero roster.
 */
import { HEROES, HERO_BY_ID, type ContentSource } from '../src/udtHeroes';

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
});
