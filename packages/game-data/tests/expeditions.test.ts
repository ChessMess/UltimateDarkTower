/**
 * Integrity tests for the Expeditions expansion data.
 */
import { EXPEDITIONS, EXPEDITION_BY_ID, TORMENT_SETUP } from '../src/expeditions';
import { NATIONS } from '../src/nations';

describe('EXPEDITIONS', () => {
  test('one expedition per kingdom, each with a site token and effect', () => {
    expect(EXPEDITIONS.map((e) => e.kingdom).sort()).toEqual(['east', 'north', 'south', 'west']);
    for (const e of EXPEDITIONS) {
      expect(EXPEDITION_BY_ID[e.id]).toBe(e);
      expect(e.siteToken.length).toBeGreaterThan(0);
      expect(e.siteEffect.length).toBeGreaterThan(0);
    }
  });

  test("each bordering nation's neighbor text names its expedition", () => {
    for (const e of EXPEDITIONS) {
      const nation = NATIONS.find((n) => n.kingdom === e.kingdom);
      expect(nation?.neighbor).toContain(e.name);
    }
  });
});

describe('TORMENT_SETUP', () => {
  test('narrative has no torments; difficulty never gets easier left to right', () => {
    const order = ['None', 'Lesser', 'Greater', 'Nightmare'];
    const rank = (v: string | number): number => (typeof v === 'number' ? v : order.indexOf(v));
    for (const row of TORMENT_SETUP) {
      const cells = [row.narrative, row.easy, row.medium, row.hard, row.nightmare].map(rank);
      expect(cells[0]).toBe(0);
      for (let i = 1; i < cells.length; i++) expect(cells[i]).toBeGreaterThanOrEqual(cells[i - 1]);
    }
  });
});
