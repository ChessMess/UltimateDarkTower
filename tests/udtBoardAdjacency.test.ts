/**
 * Integrity + behavior tests for the board adjacency graph and its BFS helpers.
 */
import { BOARD_LOCATIONS } from '../src/udtGameBoard';
import {
  BOARD_ADJACENCY,
  neighborsOf,
  stepDistance,
  shortestPath,
} from '../src/udtBoardAdjacency';

const locationNames = new Set(BOARD_LOCATIONS.map((l) => l.name));

describe('BOARD_ADJACENCY', () => {
  test('covers all 60 locations and references only valid names', () => {
    expect(Object.keys(BOARD_ADJACENCY)).toHaveLength(BOARD_LOCATIONS.length);
    for (const [loc, neighbors] of Object.entries(BOARD_ADJACENCY)) {
      expect(locationNames.has(loc)).toBe(true);
      for (const n of neighbors) {
        expect(locationNames.has(n)).toBe(true);
      }
    }
  });

  test('is undirected and symmetric', () => {
    for (const [a, neighbors] of Object.entries(BOARD_ADJACENCY)) {
      for (const b of neighbors) {
        expect(BOARD_ADJACENCY[b]).toContain(a);
      }
    }
  });
});

describe('neighborsOf', () => {
  test('returns the adjacency list, or empty for an unknown location', () => {
    const a = BOARD_LOCATIONS[0].name;
    expect(neighborsOf(a)).toEqual(BOARD_ADJACENCY[a]);
    expect(neighborsOf('Nowhere Real')).toEqual([]);
  });
});

describe('stepDistance', () => {
  test('is 0 to itself and 1 between directly adjacent locations', () => {
    const a = BOARD_LOCATIONS[0].name;
    expect(stepDistance(a, a)).toBe(0);
    const b = BOARD_ADJACENCY[a][0];
    expect(stepDistance(a, b)).toBe(1);
  });

  test('is Infinity to an unknown location', () => {
    expect(stepDistance(BOARD_LOCATIONS[0].name, 'Nowhere Real')).toBe(Infinity);
  });

  test('is Infinity between disconnected locations, if any exist', () => {
    const start = BOARD_LOCATIONS[0].name;
    const reachable = bfsReachable(start);
    const disconnected = BOARD_LOCATIONS.map((l) => l.name).find((n) => !reachable.has(n));
    if (disconnected) {
      expect(stepDistance(start, disconnected)).toBe(Infinity);
      expect(shortestPath(start, disconnected)).toEqual([]);
    }
  });
});

describe('shortestPath', () => {
  test('includes both endpoints; is [a] to itself and [] to an unknown location', () => {
    const a = BOARD_LOCATIONS[0].name;
    expect(shortestPath(a, a)).toEqual([a]);
    expect(shortestPath(a, 'Nowhere Real')).toEqual([]);

    const b = BOARD_ADJACENCY[a][0];
    const path = shortestPath(a, b);
    expect(path[0]).toBe(a);
    expect(path[path.length - 1]).toBe(b);
    expect(path).toHaveLength(stepDistance(a, b) + 1);
  });
});

/** Reachable set from `start`, computed directly from BOARD_ADJACENCY (cross-checks the helpers). */
function bfsReachable(start: string): Set<string> {
  const seen = new Set<string>([start]);
  let frontier = [start];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const n of BOARD_ADJACENCY[node] ?? []) {
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
