/**
 * Integrity tests for the board layout anchors + image metadata.
 */
import { BOARD_LOCATIONS } from '../src/udtGameBoard';
import { BOARD_ANCHORS, BOARD_IMAGE_INFO } from '../src/udtBoardAnchors';

describe('BOARD_ANCHORS', () => {
  test('has an entry for every board location and no unknown names', () => {
    const locationNames = new Set(BOARD_LOCATIONS.map((l) => l.name));
    expect(Object.keys(BOARD_ANCHORS)).toHaveLength(BOARD_LOCATIONS.length);
    for (const name of locationNames) {
      expect(BOARD_ANCHORS[name]).toBeDefined();
    }
    for (const name of Object.keys(BOARD_ANCHORS)) {
      expect(locationNames.has(name)).toBe(true);
    }
  });

  test('every building space carries building + skull slots', () => {
    for (const loc of BOARD_LOCATIONS) {
      if (loc.building) {
        expect(BOARD_ANCHORS[loc.name].building).toBeDefined();
        expect(BOARD_ANCHORS[loc.name].skull).toBeDefined();
      }
    }
  });

  test('all anchor coordinates are normalized within [0, 1]', () => {
    for (const slots of Object.values(BOARD_ANCHORS)) {
      for (const anchor of Object.values(slots)) {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThanOrEqual(1);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('BOARD_IMAGE_INFO', () => {
  test('is a square image with a centered unit-radius circle', () => {
    expect(BOARD_IMAGE_INFO.width).toBe(BOARD_IMAGE_INFO.height);
    expect(BOARD_IMAGE_INFO.centerX).toBeGreaterThan(0);
    expect(BOARD_IMAGE_INFO.centerY).toBeGreaterThan(0);
    expect(BOARD_IMAGE_INFO.radius).toBeGreaterThan(0);
    expect(typeof BOARD_IMAGE_INFO.northHeadingDegrees).toBe('number');
  });
});
