import { describe, it, expect } from 'vitest';
import { ITEM_OPTIONS } from './itemOptions';

describe('ITEM_OPTIONS', () => {
  it('has base-game cards for every list', () => {
    // Counts as shipped by ultimatedarktowerdata's box inventory (Base Game).
    expect(ITEM_OPTIONS.gear).toHaveLength(6);
    expect(ITEM_OPTIONS.treasures).toHaveLength(22);
    expect(ITEM_OPTIONS.questItems).toHaveLength(17);
    expect(ITEM_OPTIONS.companions).toHaveLength(10);
  });

  it('never yields a blank value (the empty option means "nothing picked")', () => {
    for (const options of Object.values(ITEM_OPTIONS)) {
      for (const o of options) {
        expect(o.value).not.toBe('');
        expect(o.label).not.toBe('');
      }
    }
  });

  it('labels companions with their title and everything else with the bare name', () => {
    expect(ITEM_OPTIONS.companions).toContainEqual({
      value: 'Gleb',
      label: 'Gleb — The Outlaw King',
    });
    expect(ITEM_OPTIONS.treasures).toContainEqual({
      value: 'Crown Of Azkol',
      label: 'Crown Of Azkol',
    });
  });

  it('uses the corrected spellings from the data package', () => {
    expect(ITEM_OPTIONS.gear.map((o) => o.value)).toContain('Leather Armor');
    expect(ITEM_OPTIONS.companions).toContainEqual({ value: 'Vasa', label: 'Vasa — The Divine' });
  });
});
