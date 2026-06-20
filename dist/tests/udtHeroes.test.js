"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integrity tests for the hero roster.
 */
const udtHeroes_1 = require("../src/data/udtHeroes");
describe('HEROES', () => {
    test('has the 14 heroes with the expected per-source counts', () => {
        expect(udtHeroes_1.HEROES).toHaveLength(14);
        const count = (s) => udtHeroes_1.HEROES.filter((h) => h.source === s).length;
        expect(count('base')).toBe(4);
        expect(count('alliances')).toBe(2);
        expect(count('covenant')).toBe(4);
        expect(count('expeditions')).toBe(4);
    });
    test('ids are unique, kebab-case, and every entry has a display name', () => {
        const ids = udtHeroes_1.HEROES.map((h) => h.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const hero of udtHeroes_1.HEROES) {
            expect(hero.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
            expect(hero.name.length).toBeGreaterThan(0);
        }
    });
    test('HERO_BY_ID round-trips every hero', () => {
        expect(Object.keys(udtHeroes_1.HERO_BY_ID)).toHaveLength(udtHeroes_1.HEROES.length);
        for (const hero of udtHeroes_1.HEROES) {
            expect(udtHeroes_1.HERO_BY_ID[hero.id]).toBe(hero);
        }
    });
});
//# sourceMappingURL=udtHeroes.test.js.map