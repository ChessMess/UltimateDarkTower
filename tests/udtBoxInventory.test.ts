/**
 * Integrity tests for the box-inventory data (physical component counts).
 */
import {
    expansions,
    EXPANSIONS,
    coffers,
    coffers2,
    skullsPack,
    sleeves,
} from '../src/data/udtBoxInventory';

describe('expansions / EXPANSIONS', () => {
    test('has the 4 expected expansions', () => {
        expect(expansions.map((e) => e.name)).toEqual([
            'Base Game',
            'Alliances',
            'Covenant',
            'Dark Horde',
        ]);
    });

    test('EXPANSIONS is keyed by name and points at the same objects', () => {
        expect(Object.keys(EXPANSIONS)).toHaveLength(expansions.length);
        for (const e of expansions) {
            expect(EXPANSIONS[e.name]).toBe(e);
        }
    });

    test('every component carries a positive integer count', () => {
        for (const exp of expansions) {
            expect(exp.categories.length).toBeGreaterThan(0);
            for (const cat of exp.categories) {
                expect(['Misc', 'Tokens', 'Cards', 'Minis']).toContain(cat.section);
                for (const c of cat.components) {
                    expect(Number.isInteger(c.count)).toBe(true);
                    expect(c.count).toBeGreaterThan(0);
                }
            }
        }
    });
});

describe('token packs + sleeves', () => {
    test('coffer denominations sum to their stated total', () => {
        for (const set of coffers) {
            const sum = set.denominations.reduce((n, d) => n + d.count, 0);
            expect(sum).toBe(set.total);
        }
    });

    test('token packs and sleeves are non-empty', () => {
        expect(coffers2.tokens.length).toBeGreaterThan(0);
        expect(skullsPack.tokens.length).toBeGreaterThan(0);
        expect(sleeves.length).toBeGreaterThan(0);
        for (const s of sleeves) {
            expect(s.purposes.length).toBeGreaterThan(0);
        }
    });
});
