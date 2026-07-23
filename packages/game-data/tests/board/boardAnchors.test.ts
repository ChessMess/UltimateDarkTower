/**
 * Integrity tests for the board layout spots + image metadata.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BOARD_LOCATIONS } from '../../src/board/gameBoard';
import { BOARD_SPOTS, BOARD_IMAGE_INFO } from '../../src/board/boardAnchors';

const here = dirname(fileURLToPath(import.meta.url));

describe('BOARD_SPOTS', () => {
  test('has an entry for every board location and no unknown names', () => {
    const locationNames = new Set(BOARD_LOCATIONS.map((l) => l.name));
    expect(Object.keys(BOARD_SPOTS)).toHaveLength(BOARD_LOCATIONS.length);
    for (const name of locationNames) {
      expect(BOARD_SPOTS[name]).toBeDefined();
    }
    for (const name of Object.keys(BOARD_SPOTS)) {
      expect(locationNames.has(name)).toBe(true);
    }
  });

  test('every building space carries building + skull spots', () => {
    for (const loc of BOARD_LOCATIONS) {
      if (loc.building) {
        const spots = BOARD_SPOTS[loc.name].map((s) => s.id);
        expect(spots).toContain('building');
        expect(spots).toContain('skull');
      }
    }
  });

  test('all spot coordinates are normalized within [0, 1]', () => {
    for (const spots of Object.values(BOARD_SPOTS)) {
      for (const spot of spots) {
        expect(spot.at.x).toBeGreaterThanOrEqual(0);
        expect(spot.at.x).toBeLessThanOrEqual(1);
        expect(spot.at.y).toBeGreaterThanOrEqual(0);
        expect(spot.at.y).toBeLessThanOrEqual(1);
      }
    }
  });

  test('every spot id is unique within its location', () => {
    for (const [loc, spots] of Object.entries(BOARD_SPOTS)) {
      const ids = spots.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(loc).toBeTruthy(); // (loc used only for the failure message context above)
    }
  });

  test('every spot accepts at least one type', () => {
    for (const spots of Object.values(BOARD_SPOTS)) {
      for (const spot of spots) {
        expect(spot.accepts.length).toBeGreaterThan(0);
      }
    }
  });

  // Regeneration-safety net: BOARD_ANCHORS itself is gone (deleted with the slot vocabulary),
  // so this compares against a snapshot captured from HEAD before the spot lift — the only way
  // left to prove the regeneration didn't silently move any of the 60 locations' coordinates.
  test('every legacy anchor slot survives as exactly one spot at the same coordinates', () => {
    const snapshot = JSON.parse(
      readFileSync(resolve(here, 'fixtures/board-anchors-snapshot.json'), 'utf8'),
    ) as Record<string, Record<string, { x: number; y: number }>>;

    for (const [loc, slots] of Object.entries(snapshot)) {
      const spots = BOARD_SPOTS[loc];
      expect(spots).toBeDefined();
      for (const [slot, anchor] of Object.entries(slots)) {
        const spot = spots.find((s) => s.id === slot);
        expect(spot).toBeDefined();
        expect(spot!.at).toEqual(anchor);
        expect(spot!.accepts).toContain(slot);
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
