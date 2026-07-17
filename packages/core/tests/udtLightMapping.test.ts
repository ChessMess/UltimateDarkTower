/**
 * udtLightMapping.test.ts — pins the level/side/corner → light-index tables.
 *
 * These were private methods on UdtTowerCommands. apps/controller copied all four
 * verbatim because they were unreachable, and the copy drifted: it widened the
 * ledge helper's parameter to `string` to accept corner names the library types as
 * TowerCorner. They are exported now so the copy can be deleted; these tests hold
 * the mapping still across that move.
 *
 * The `default:` arms are covered deliberately — they are the reason a typo in a
 * caller maps every light to one position instead of failing.
 */

import {
  getTowerLayerForLevel,
  getLightIndexForSide,
  mapSideToCorner,
  getLedgeLightIndexForSide,
  getBaseLightIndexForSide,
} from '../src/udtLightMapping';
import {
  TOWER_LAYERS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  type TowerSide,
  type TowerLevels,
  type TowerCorner,
} from '../src/udtConstants';

describe('getTowerLayerForLevel', () => {
  it('maps every level to its ring layer', () => {
    expect(getTowerLayerForLevel('top')).toBe(TOWER_LAYERS.TOP_RING);
    expect(getTowerLayerForLevel('middle')).toBe(TOWER_LAYERS.MIDDLE_RING);
    expect(getTowerLayerForLevel('bottom')).toBe(TOWER_LAYERS.BOTTOM_RING);
  });

  it('falls back to the top ring for an unknown level', () => {
    expect(getTowerLayerForLevel('nonsense' as TowerLevels)).toBe(TOWER_LAYERS.TOP_RING);
  });
});

describe('getLightIndexForSide', () => {
  it('maps every cardinal side to its ring light index', () => {
    expect(getLightIndexForSide('north')).toBe(RING_LIGHT_POSITIONS.NORTH);
    expect(getLightIndexForSide('east')).toBe(RING_LIGHT_POSITIONS.EAST);
    expect(getLightIndexForSide('south')).toBe(RING_LIGHT_POSITIONS.SOUTH);
    expect(getLightIndexForSide('west')).toBe(RING_LIGHT_POSITIONS.WEST);
  });

  it('assigns each side a distinct index', () => {
    const sides: TowerSide[] = ['north', 'east', 'south', 'west'];
    const indices = sides.map(getLightIndexForSide);
    expect(new Set(indices).size).toBe(sides.length);
  });

  it('falls back to north for an unknown side', () => {
    expect(getLightIndexForSide('nonsense' as TowerSide)).toBe(RING_LIGHT_POSITIONS.NORTH);
  });
});

describe('mapSideToCorner', () => {
  it('maps every cardinal side to its clockwise-adjacent corner', () => {
    expect(mapSideToCorner('north')).toBe('northeast');
    expect(mapSideToCorner('east')).toBe('southeast');
    expect(mapSideToCorner('south')).toBe('southwest');
    expect(mapSideToCorner('west')).toBe('northwest');
  });

  it('assigns each side a distinct corner', () => {
    const sides: TowerSide[] = ['north', 'east', 'south', 'west'];
    const corners = sides.map(mapSideToCorner);
    expect(new Set(corners).size).toBe(sides.length);
  });

  it('falls back to northeast for an unknown side', () => {
    expect(mapSideToCorner('nonsense' as TowerSide)).toBe('northeast');
  });
});

describe('getLedgeLightIndexForSide', () => {
  it('maps every corner to its ledge light index', () => {
    expect(getLedgeLightIndexForSide('northeast')).toBe(LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST);
    expect(getLedgeLightIndexForSide('southeast')).toBe(LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST);
    expect(getLedgeLightIndexForSide('southwest')).toBe(LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST);
    expect(getLedgeLightIndexForSide('northwest')).toBe(LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST);
  });

  it('assigns each corner a distinct index', () => {
    const corners: TowerCorner[] = ['northeast', 'southeast', 'southwest', 'northwest'];
    const indices = corners.map(getLedgeLightIndexForSide);
    expect(new Set(indices).size).toBe(corners.length);
  });

  it('falls back to north-east for an unknown corner', () => {
    expect(getLedgeLightIndexForSide('nonsense' as TowerCorner)).toBe(
      LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST,
    );
  });
});

describe('getBaseLightIndexForSide', () => {
  it('composes mapSideToCorner with getLedgeLightIndexForSide', () => {
    const sides: TowerSide[] = ['north', 'east', 'south', 'west'];
    for (const side of sides) {
      expect(getBaseLightIndexForSide(side)).toBe(getLedgeLightIndexForSide(mapSideToCorner(side)));
    }
  });

  it('maps every cardinal side to its base light index', () => {
    expect(getBaseLightIndexForSide('north')).toBe(LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST);
    expect(getBaseLightIndexForSide('east')).toBe(LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST);
    expect(getBaseLightIndexForSide('south')).toBe(LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST);
    expect(getBaseLightIndexForSide('west')).toBe(LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST);
  });
});
