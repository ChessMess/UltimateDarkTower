#!/usr/bin/env node
/**
 * Generate the library's board-layout data modules from the location-marker
 * tool's combined export (`udtBoardData.json`):
 *
 *   src/board/boardAnchors.ts    <- imageInfo + spots  (BOARD_IMAGE_INFO, BOARD_SPOTS)
 *   src/board/boardAdjacency.ts  <- adjacency          (BOARD_ADJACENCY + graph helpers)
 *
 * The data is inlined as typed `const`s (the `gameBoard.ts` convention) rather
 * than imported as JSON, because `tsc` does not copy `.json` into `dist/` and the
 * package's `files` whitelist ships only `dist/**`. Coordinates are rounded to 5
 * decimals (sub-pixel at 4096px). Run prettier afterwards to normalize style:
 *
 *   node tools/location-marker/gen-board-data.mjs && npm run format
 *
 * Pure file generation — no build step, no dependencies.
 *
 * The authoring tool (and `udtBoardData.json`) still speak the old five-slot vocabulary
 * (`building`/`skull`/`hero`/`foe`/`marker`) — this is the ONE place the slot->spot lift
 * happens. Each slot becomes a `BoardSpot` whose `id` is the slot name and whose `accepts`
 * is that slot name PLUS whatever reserved type used to hand-wire itself onto that slot in
 * the renderers: `foe` also accepts `adversary` (the adversary rendered at the `foe` anchor,
 * falling back to `building`), and `marker` also accepts `quest` (quest markers had "no
 * dedicated board anchor" and shared the marker slot). `skull`/`hero`/`building` accept only
 * themselves.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(here, 'udtBoardData.json'), 'utf8'));
const srcDir = resolve(here, '../../src/board');

const round5 = (n) => Number(n.toFixed(5));

/** Extra reserved type ids a legacy slot's spot must also `accepts`, beyond its own slot name. */
const EXTRA_ACCEPTS = {
  foe: ['adversary'],
  marker: ['quest'],
};

// --- spots: one BoardSpot per legacy slot, preserving location/slot order ---
const spots = {};
for (const [loc, slots] of Object.entries(data.anchors)) {
  spots[loc] = Object.entries(slots).map(([slot, { x, y }]) => ({
    id: slot,
    at: { x: round5(x), y: round5(y) },
    accepts: [slot, ...(EXTRA_ACCEPTS[slot] ?? [])],
  }));
}

const anchorsFile = `/**
 * Marked spots for the Return to Dark Tower board, plus board-image metadata. Each
 * location carries one spot per occupant slot type that can appear there (a building
 * space adds 'building' + 'skull'); renderers fan multiple tokens around a single spot.
 * Coordinates are normalized [0, 1] against the board image, so they are
 * resolution-independent.
 *
 * GENERATED from tools/location-marker/udtBoardData.json by gen-board-data.mjs.
 * Do not hand-edit — re-author in the location-marker tool and regenerate.
 */

export type SpotPoint = { x: number; y: number };

/** A marked spot on a location: a point plus the token type ids it accepts. */
export type BoardSpot = {
  id: string;
  at: SpotPoint;
  accepts: readonly string[];
};

export type BoardSpotMap = Readonly<Record<string /* LocationName */, readonly BoardSpot[]>>;

/**
 * Token type ids usable in a spot's \`accepts\` with no \`library.tokenTypes\` registry entry —
 * the RtDT board vocabulary every consumer understands natively.
 */
export const RESERVED_TOKEN_TYPES = [
  'hero',
  'foe',
  'adversary',
  'building',
  'skull',
  'monument',
  'marker',
  'quest',
] as const;

export type ReservedTokenType = (typeof RESERVED_TOKEN_TYPES)[number];

/**
 * Board-image metadata so consumers can map normalized image coordinates onto a
 * 2D canvas or the 3D disc. \`northHeadingDegrees\` is the image rotation that
 * aligns image-north with the scene's north. A singleton for the four-kingdoms
 * board (v1); the type leaves room for a future per-region map.
 */
export type BoardImageInfo = {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    radius: number;
    northHeadingDegrees: number;
};

export const BOARD_IMAGE_INFO: BoardImageInfo = ${JSON.stringify(data.imageInfo)};

/** Marked spots for all 60 board locations, keyed by location name. */
export const BOARD_SPOTS: BoardSpotMap = ${JSON.stringify(spots)};
`;

const adjacencyFile = `/**
 * Undirected movement-adjacency graph for the 60 board locations, with derived
 * BFS helpers. The graph reflects physical movement adjacency only — kingdoms
 * separated by rivers may be disconnected (\`stepDistance\` = Infinity); bridges,
 * flight, and teleport are *rules* a host layers on, not graph edges. These are
 * utilities: the board itself enforces no movement rules.
 *
 * GENERATED from tools/location-marker/udtBoardData.json by gen-board-data.mjs.
 * Do not hand-edit — re-author in the location-marker tool and regenerate.
 */

export type BoardAdjacency = Readonly<Record<string /* LocationName */, readonly string[]>>;

/** Undirected, symmetric adjacency for all 60 board locations. */
export const BOARD_ADJACENCY: BoardAdjacency = ${JSON.stringify(data.adjacency)};

/** The locations directly adjacent to \`loc\` (empty if \`loc\` is unknown). */
export function neighborsOf(loc: string): readonly string[] {
    return BOARD_ADJACENCY[loc] ?? [];
}

/**
 * Breadth-first step distance between two locations. 0 to itself; \`Infinity\` if
 * they are disconnected or either name is unknown.
 */
export function stepDistance(a: string, b: string): number {
    if (a === b) return 0;
    const visited = new Set<string>([a]);
    let frontier: string[] = [a];
    let dist = 0;
    while (frontier.length > 0) {
        dist++;
        const next: string[] = [];
        for (const node of frontier) {
            for (const n of neighborsOf(node)) {
                if (n === b) return dist;
                if (!visited.has(n)) {
                    visited.add(n);
                    next.push(n);
                }
            }
        }
        frontier = next;
    }
    return Infinity;
}

/**
 * Breadth-first shortest path between two locations, inclusive of both endpoints.
 * \`[a]\` to itself; \`[]\` if they are disconnected or either name is unknown.
 */
export function shortestPath(a: string, b: string): readonly string[] {
    if (a === b) return [a];
    const prev = new Map<string, string>();
    const visited = new Set<string>([a]);
    let frontier: string[] = [a];
    while (frontier.length > 0) {
        const next: string[] = [];
        for (const node of frontier) {
            for (const n of neighborsOf(node)) {
                if (visited.has(n)) continue;
                visited.add(n);
                prev.set(n, node);
                if (n === b) {
                    const path: string[] = [b];
                    let cur: string | undefined = b;
                    while (cur !== undefined && cur !== a) {
                        cur = prev.get(cur);
                        if (cur !== undefined) path.push(cur);
                    }
                    return path.reverse();
                }
                next.push(n);
            }
        }
        frontier = next;
    }
    return [];
}
`;

writeFileSync(resolve(srcDir, 'boardAnchors.ts'), anchorsFile);
writeFileSync(resolve(srcDir, 'boardAdjacency.ts'), adjacencyFile);
console.log('Wrote src/board/boardAnchors.ts and src/board/boardAdjacency.ts');
