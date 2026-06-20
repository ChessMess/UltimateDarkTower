"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integrity tests for the board layout anchors + image metadata.
 */
const udtGameBoard_1 = require("../src/data/board/udtGameBoard");
const udtBoardAnchors_1 = require("../src/data/board/udtBoardAnchors");
describe('BOARD_ANCHORS', () => {
    test('has an entry for every board location and no unknown names', () => {
        const locationNames = new Set(udtGameBoard_1.BOARD_LOCATIONS.map((l) => l.name));
        expect(Object.keys(udtBoardAnchors_1.BOARD_ANCHORS)).toHaveLength(udtGameBoard_1.BOARD_LOCATIONS.length);
        for (const name of locationNames) {
            expect(udtBoardAnchors_1.BOARD_ANCHORS[name]).toBeDefined();
        }
        for (const name of Object.keys(udtBoardAnchors_1.BOARD_ANCHORS)) {
            expect(locationNames.has(name)).toBe(true);
        }
    });
    test('every building space carries building + skull slots', () => {
        for (const loc of udtGameBoard_1.BOARD_LOCATIONS) {
            if (loc.building) {
                expect(udtBoardAnchors_1.BOARD_ANCHORS[loc.name].building).toBeDefined();
                expect(udtBoardAnchors_1.BOARD_ANCHORS[loc.name].skull).toBeDefined();
            }
        }
    });
    test('all anchor coordinates are normalized within [0, 1]', () => {
        for (const slots of Object.values(udtBoardAnchors_1.BOARD_ANCHORS)) {
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
        expect(udtBoardAnchors_1.BOARD_IMAGE_INFO.width).toBe(udtBoardAnchors_1.BOARD_IMAGE_INFO.height);
        expect(udtBoardAnchors_1.BOARD_IMAGE_INFO.centerX).toBeGreaterThan(0);
        expect(udtBoardAnchors_1.BOARD_IMAGE_INFO.centerY).toBeGreaterThan(0);
        expect(udtBoardAnchors_1.BOARD_IMAGE_INFO.radius).toBeGreaterThan(0);
        expect(typeof udtBoardAnchors_1.BOARD_IMAGE_INFO.northHeadingDegrees).toBe('number');
    });
});
//# sourceMappingURL=udtBoardAnchors.test.js.map