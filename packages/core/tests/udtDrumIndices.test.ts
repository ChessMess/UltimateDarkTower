/**
 * udtDrumIndices.test.ts — pins TOWER_SIDES / TOWER_LEVELS against the wire format.
 *
 * The drum APIs are split between names and indices: rotateWithState takes TowerSide
 * names, while rotateDrumStateful and TowerState.drum[n].position take raw numbers.
 * The name↔index correspondence was documented only in a JSDoc comment and never
 * exported, so apps/mcp-server hardcoded its own copy of both maps (tools/drums.ts)
 * and core itself re-declared the sides array inline in six places.
 *
 * Asserting TOWER_SIDES[0] === 'north' against a literal is tautological — it would
 * pass whichever order the library actually uses. The load-bearing test here is the
 * drumPositionCmds one: that table *is* the wire format, and udtTowerCommands'
 * getCurrentDrumPosition derives a position index by matching its keys against the
 * same side order. If TOWER_SIDES and that table ever disagree, every index the
 * library reports is wrong — so this test is what makes the exported constant
 * trustworthy to consumers.
 *
 * The rest of the behavioural proof is the refactor itself: core's six inline copies
 * of the sides array now read from TOWER_SIDES, so the existing glyph-rotation and
 * drum-position suites fail if the order is wrong.
 */

import {
  TOWER_SIDES,
  TOWER_LEVELS,
  drumPositionCmds,
  type TowerSide,
  type TowerLevels,
} from '../src/udtConstants';

describe('TOWER_SIDES / TOWER_LEVELS shape', () => {
  it('lists the four sides in clockwise rotation order', () => {
    expect([...TOWER_SIDES]).toEqual(['north', 'east', 'south', 'west']);
  });

  it('lists the three drums in wire order', () => {
    expect([...TOWER_LEVELS]).toEqual(['top', 'middle', 'bottom']);
  });

  it('has no duplicate entries, so indexOf is unambiguous', () => {
    expect(new Set(TOWER_SIDES).size).toBe(TOWER_SIDES.length);
    expect(new Set(TOWER_LEVELS).size).toBe(TOWER_LEVELS.length);
  });
});

describe('TOWER_SIDES agrees with the wire format', () => {
  // drumPositionCmds maps level -> side -> command bits, and getCurrentDrumPosition
  // turns a side back into an index with `[...sides].indexOf(side)` over this table's
  // entries. Key order here therefore defines what a position index means.
  it.each([...TOWER_LEVELS])('matches drumPositionCmds key order for the %s drum', (level) => {
    expect(Object.keys(drumPositionCmds[level as TowerLevels])).toEqual([...TOWER_SIDES]);
  });

  it('covers every side the type allows', () => {
    const allSides: TowerSide[] = ['north', 'south', 'east', 'west'];
    expect([...TOWER_SIDES].sort()).toEqual(allSides.sort());
  });
});

describe('TOWER_LEVELS agrees with the wire format', () => {
  it('matches the levels drumPositionCmds defines', () => {
    expect(Object.keys(drumPositionCmds)).toEqual([...TOWER_LEVELS]);
  });

  it('covers every level the type allows', () => {
    const allLevels: TowerLevels[] = ['top', 'middle', 'bottom'];
    expect([...TOWER_LEVELS].sort()).toEqual(allLevels.sort());
  });
});
