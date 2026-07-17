/**
 * Integrity tests for the Covenant monument roster.
 */
import { MONUMENTS, MONUMENT_BY_ID } from '../src/monuments';

describe('MONUMENTS', () => {
  test('has the 8 Covenant monuments, all sourced from covenant', () => {
    expect(MONUMENTS).toHaveLength(8);
    for (const monument of MONUMENTS) {
      expect(monument.source).toBe('covenant');
    }
  });

  test('ids are unique, kebab-case, and every entry has a display name', () => {
    const ids = MONUMENTS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const monument of MONUMENTS) {
      expect(monument.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(monument.name.length).toBeGreaterThan(0);
    }
  });

  test('MONUMENT_BY_ID round-trips every monument', () => {
    expect(Object.keys(MONUMENT_BY_ID)).toHaveLength(MONUMENTS.length);
    for (const monument of MONUMENTS) {
      expect(MONUMENT_BY_ID[monument.id]).toBe(monument);
    }
  });
});
