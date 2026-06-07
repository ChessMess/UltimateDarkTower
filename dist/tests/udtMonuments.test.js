"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integrity tests for the Covenant monument roster.
 */
const udtMonuments_1 = require("../src/udtMonuments");
describe('MONUMENTS', () => {
    test('has the 8 Covenant monuments, all sourced from covenant', () => {
        expect(udtMonuments_1.MONUMENTS).toHaveLength(8);
        for (const monument of udtMonuments_1.MONUMENTS) {
            expect(monument.source).toBe('covenant');
        }
    });
    test('ids are unique, kebab-case, and every entry has a display name', () => {
        const ids = udtMonuments_1.MONUMENTS.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const monument of udtMonuments_1.MONUMENTS) {
            expect(monument.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
            expect(monument.name.length).toBeGreaterThan(0);
        }
    });
    test('MONUMENT_BY_ID round-trips every monument', () => {
        expect(Object.keys(udtMonuments_1.MONUMENT_BY_ID)).toHaveLength(udtMonuments_1.MONUMENTS.length);
        for (const monument of udtMonuments_1.MONUMENTS) {
            expect(udtMonuments_1.MONUMENT_BY_ID[monument.id]).toBe(monument);
        }
    });
});
//# sourceMappingURL=udtMonuments.test.js.map