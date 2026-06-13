"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integrity tests for the foe status type + foe/adversary identity metadata.
 */
const udtFoes_1 = require("../src/udtFoes");
const udtSeedParser_1 = require("../src/udtSeedParser");
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
describe('FOE_STATUSES', () => {
    test('is the ordered panicked → unsteady → ready → savage → lethal progression', () => {
        expect(udtFoes_1.FOE_STATUSES).toEqual(['panicked', 'unsteady', 'ready', 'savage', 'lethal']);
    });
});
describe('FOES', () => {
    test('has the 12 tiered foes, all kind=foe and source=base', () => {
        expect(udtFoes_1.FOES).toHaveLength(12);
        for (const foe of udtFoes_1.FOES) {
            expect(foe.kind).toBe('foe');
            expect(foe.source).toBe('base');
        }
    });
    test('tier → level mapping is 1→2, 2→3, 3→4 (and every foe carries a tier)', () => {
        for (const foe of udtFoes_1.FOES) {
            expect(foe.tier).toBeDefined();
            expect(foe.level).toBe(foe.tier + 1);
        }
        expect(udtFoes_1.FOES.filter((f) => f.tier === 1)).toHaveLength(4);
        expect(udtFoes_1.FOES.filter((f) => f.tier === 2)).toHaveLength(4);
        expect(udtFoes_1.FOES.filter((f) => f.tier === 3)).toHaveLength(4);
    });
});
describe('ADVERSARY_ROSTER', () => {
    test('has the 8 adversaries, all level 5, kind=adversary, no tier', () => {
        expect(udtFoes_1.ADVERSARY_ROSTER).toHaveLength(8);
        for (const adv of udtFoes_1.ADVERSARY_ROSTER) {
            expect(adv.kind).toBe('adversary');
            expect(adv.level).toBe(5);
            expect(adv.tier).toBeUndefined();
            expect(adv.source).toBe('base');
        }
    });
});
describe('ALL_FOES', () => {
    test('ids are unique + kebab-case and every entry has a display name', () => {
        expect(udtFoes_1.ALL_FOES).toHaveLength(20);
        const ids = udtFoes_1.ALL_FOES.map((f) => f.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const foe of udtFoes_1.ALL_FOES) {
            expect(foe.id).toMatch(KEBAB);
            expect(foe.name.length).toBeGreaterThan(0);
        }
    });
    test('FOE_BY_ID round-trips every entry', () => {
        expect(Object.keys(udtFoes_1.FOE_BY_ID)).toHaveLength(udtFoes_1.ALL_FOES.length);
        for (const foe of udtFoes_1.ALL_FOES) {
            expect(udtFoes_1.FOE_BY_ID[foe.id]).toBe(foe);
        }
    });
    test('FOE_BY_NAME round-trips every entry', () => {
        expect(Object.keys(udtFoes_1.FOE_BY_NAME)).toHaveLength(udtFoes_1.ALL_FOES.length);
        for (const foe of udtFoes_1.ALL_FOES) {
            expect(udtFoes_1.FOE_BY_NAME[foe.name]).toBe(foe);
        }
    });
});
describe('drift guard — names match the seed-parser enums exactly', () => {
    test('foe names equal TIER1/2/3_FOES (by tier) and adversaries equal ADVERSARIES', () => {
        const namesByTier = (tier) => udtFoes_1.FOES.filter((f) => f.tier === tier).map((f) => f.name);
        expect(new Set(namesByTier(1))).toEqual(new Set(udtSeedParser_1.TIER1_FOES));
        expect(new Set(namesByTier(2))).toEqual(new Set(udtSeedParser_1.TIER2_FOES));
        expect(new Set(namesByTier(3))).toEqual(new Set(udtSeedParser_1.TIER3_FOES));
        expect(new Set(udtFoes_1.ADVERSARY_ROSTER.map((a) => a.name))).toEqual(new Set(udtSeedParser_1.ADVERSARIES));
    });
});
//# sourceMappingURL=udtFoes.test.js.map