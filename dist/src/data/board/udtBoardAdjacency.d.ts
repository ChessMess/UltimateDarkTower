/**
 * Undirected movement-adjacency graph for the 60 board locations, with derived
 * BFS helpers. The graph reflects physical movement adjacency only — kingdoms
 * separated by rivers may be disconnected (`stepDistance` = Infinity); bridges,
 * flight, and teleport are *rules* a host layers on, not graph edges. These are
 * utilities: the board itself enforces no movement rules.
 *
 * GENERATED from tools/location-marker/udtBoardData.json by gen-board-data.mjs.
 * Do not hand-edit — re-author in the location-marker tool and regenerate.
 */
export type BoardAdjacency = Readonly<Record<string, readonly string[]>>;
/** Undirected, symmetric adjacency for all 60 board locations. */
export declare const BOARD_ADJACENCY: BoardAdjacency;
/** The locations directly adjacent to `loc` (empty if `loc` is unknown). */
export declare function neighborsOf(loc: string): readonly string[];
/**
 * Breadth-first step distance between two locations. 0 to itself; `Infinity` if
 * they are disconnected or either name is unknown.
 */
export declare function stepDistance(a: string, b: string): number;
/**
 * Breadth-first shortest path between two locations, inclusive of both endpoints.
 * `[a]` to itself; `[]` if they are disconnected or either name is unknown.
 */
export declare function shortestPath(a: string, b: string): readonly string[];
