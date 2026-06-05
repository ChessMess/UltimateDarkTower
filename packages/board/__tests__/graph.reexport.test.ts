import { BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME } from '../src/index';

describe('UDT data re-exports', () => {
  it('re-exports BOARD_LOCATIONS from ultimatedarktower', () => {
    expect(Array.isArray(BOARD_LOCATIONS)).toBe(true);
    expect(BOARD_LOCATIONS.length).toBeGreaterThan(0);
  });

  it('re-exports the by-name lookup', () => {
    const first = BOARD_LOCATIONS[0];
    expect(BOARD_LOCATION_BY_NAME[first.name]).toEqual(first);
  });

  // Pending until ultimatedarktower ships adjacency + graph helpers
  // (spec §6 / §12-Q2): assert BOARD_ANCHORS, BOARD_ADJACENCY, and
  // stepDistance(x, x) === 0.
  it.todo('stepDistance(x, x) === 0 once graph helpers ship');
});
