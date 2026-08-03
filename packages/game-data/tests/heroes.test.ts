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
 * The gameplay sheet, merged in from gameContent.HEROES in v3. Published heroes carry the
 * full sheet; the unreleased Expeditions four carry none of it. Anything in between means a
 * transcription got half-applied, which is exactly what the old two-record split allowed.
 */
describe('hero gameplay sheets', () => {
  const published = HEROES.filter((h) => h.source !== 'expeditions');
  const unreleased = HEROES.filter((h) => h.source === 'expeditions');

  test('all 10 published heroes have a banner action and 2 + 3 virtues', () => {
    expect(published).toHaveLength(10);
    for (const hero of published) {
      expect(hero.bannerAction?.length ?? 0).toBeGreaterThan(0);
      expect(hero.defaultVirtues).toHaveLength(2);
      expect(hero.unlockableVirtues).toHaveLength(3);
      for (const v of [...(hero.defaultVirtues ?? []), ...(hero.unlockableVirtues ?? [])]) {
        expect(v.name.length).toBeGreaterThan(0);
        expect(v.ability.length).toBeGreaterThan(0);
      }
    }
  });

  test('the 4 unreleased Expeditions heroes carry no sheet rather than a guessed one', () => {
    expect(unreleased).toHaveLength(4);
    for (const hero of unreleased) {
      expect(hero.bannerAction).toBeUndefined();
      expect(hero.defaultVirtues).toBeUndefined();
      expect(hero.unlockableVirtues).toBeUndefined();
    }
  });

  test('a hero has either the whole sheet or none of it', () => {
    for (const hero of HEROES) {
      const parts = [hero.bannerAction, hero.defaultVirtues, hero.unlockableVirtues];
      const present = parts.filter((p) => p !== undefined).length;
      expect([0, parts.length]).toContain(present);
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
