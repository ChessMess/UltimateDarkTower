"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integrity + behavior tests for the board adjacency graph and its BFS helpers.
 */
const udtGameBoard_1 = require("../src/data/board/udtGameBoard");
const udtBoardAdjacency_1 = require("../src/data/board/udtBoardAdjacency");
const locationNames = new Set(udtGameBoard_1.BOARD_LOCATIONS.map((l) => l.name));
describe('BOARD_ADJACENCY', () => {
    test('covers all 60 locations and references only valid names', () => {
        expect(Object.keys(udtBoardAdjacency_1.BOARD_ADJACENCY)).toHaveLength(udtGameBoard_1.BOARD_LOCATIONS.length);
        for (const [loc, neighbors] of Object.entries(udtBoardAdjacency_1.BOARD_ADJACENCY)) {
            expect(locationNames.has(loc)).toBe(true);
            for (const n of neighbors) {
                expect(locationNames.has(n)).toBe(true);
            }
        }
    });
    test('is undirected and symmetric', () => {
        for (const [a, neighbors] of Object.entries(udtBoardAdjacency_1.BOARD_ADJACENCY)) {
            for (const b of neighbors) {
                expect(udtBoardAdjacency_1.BOARD_ADJACENCY[b]).toContain(a);
            }
        }
    });
});
describe('neighborsOf', () => {
    test('returns the adjacency list, or empty for an unknown location', () => {
        const a = udtGameBoard_1.BOARD_LOCATIONS[0].name;
        expect((0, udtBoardAdjacency_1.neighborsOf)(a)).toEqual(udtBoardAdjacency_1.BOARD_ADJACENCY[a]);
        expect((0, udtBoardAdjacency_1.neighborsOf)('Nowhere Real')).toEqual([]);
    });
});
describe('stepDistance', () => {
    test('is 0 to itself and 1 between directly adjacent locations', () => {
        const a = udtGameBoard_1.BOARD_LOCATIONS[0].name;
        expect((0, udtBoardAdjacency_1.stepDistance)(a, a)).toBe(0);
        const b = udtBoardAdjacency_1.BOARD_ADJACENCY[a][0];
        expect((0, udtBoardAdjacency_1.stepDistance)(a, b)).toBe(1);
    });
    test('is Infinity to an unknown location', () => {
        expect((0, udtBoardAdjacency_1.stepDistance)(udtGameBoard_1.BOARD_LOCATIONS[0].name, 'Nowhere Real')).toBe(Infinity);
    });
    test('is Infinity between disconnected locations, if any exist', () => {
        const start = udtGameBoard_1.BOARD_LOCATIONS[0].name;
        const reachable = bfsReachable(start);
        const disconnected = udtGameBoard_1.BOARD_LOCATIONS.map((l) => l.name).find((n) => !reachable.has(n));
        if (disconnected) {
            expect((0, udtBoardAdjacency_1.stepDistance)(start, disconnected)).toBe(Infinity);
            expect((0, udtBoardAdjacency_1.shortestPath)(start, disconnected)).toEqual([]);
        }
    });
});
describe('shortestPath', () => {
    test('includes both endpoints; is [a] to itself and [] to an unknown location', () => {
        const a = udtGameBoard_1.BOARD_LOCATIONS[0].name;
        expect((0, udtBoardAdjacency_1.shortestPath)(a, a)).toEqual([a]);
        expect((0, udtBoardAdjacency_1.shortestPath)(a, 'Nowhere Real')).toEqual([]);
        const b = udtBoardAdjacency_1.BOARD_ADJACENCY[a][0];
        const path = (0, udtBoardAdjacency_1.shortestPath)(a, b);
        expect(path[0]).toBe(a);
        expect(path[path.length - 1]).toBe(b);
        expect(path).toHaveLength((0, udtBoardAdjacency_1.stepDistance)(a, b) + 1);
    });
});
/** Reachable set from `start`, computed directly from BOARD_ADJACENCY (cross-checks the helpers). */
function bfsReachable(start) {
    var _a;
    const seen = new Set([start]);
    let frontier = [start];
    while (frontier.length > 0) {
        const next = [];
        for (const node of frontier) {
            for (const n of (_a = udtBoardAdjacency_1.BOARD_ADJACENCY[node]) !== null && _a !== void 0 ? _a : []) {
                if (!seen.has(n)) {
                    seen.add(n);
                    next.push(n);
                }
            }
        }
        frontier = next;
    }
    return seen;
}
//# sourceMappingURL=udtBoardAdjacency.test.js.map