import {
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_ANCHORS,
  BOARD_ADJACENCY,
  BOARD_IMAGE_INFO,
  stepDistance,
  shortestPath,
} from '../src/index';

describe('UDT data re-exports', () => {
  it('re-exports BOARD_LOCATIONS from ultimatedarktowerdata', () => {
    expect(Array.isArray(BOARD_LOCATIONS)).toBe(true);
    expect(BOARD_LOCATIONS.length).toBeGreaterThan(0);
  });

  it('re-exports the by-name lookup', () => {
    const first = BOARD_LOCATIONS[0];
    expect(BOARD_LOCATION_BY_NAME[first.name]).toEqual(first);
  });

  it('re-exports board anchors + image info covering every location', () => {
    expect(Object.keys(BOARD_ANCHORS)).toHaveLength(BOARD_LOCATIONS.length);
    for (const loc of BOARD_LOCATIONS) {
      expect(BOARD_ANCHORS[loc.name]).toBeDefined();
    }
    expect(typeof BOARD_IMAGE_INFO.northHeadingDegrees).toBe('number');
  });

  it('re-exports the adjacency graph + working step/path helpers', () => {
    const a = BOARD_LOCATIONS[0].name;
    expect(stepDistance(a, a)).toBe(0);

    const b = BOARD_ADJACENCY[a][0];
    expect(stepDistance(a, b)).toBe(1);

    const path = shortestPath(a, b);
    expect(path[0]).toBe(a);
    expect(path[path.length - 1]).toBe(b);

    // Unknown location is disconnected.
    expect(stepDistance(a, 'Nowhere Real')).toBe(Infinity);
  });
});
