/**
 * Board data aggregate — game board geometry (locations/groupings), layout anchors +
 * image metadata, and the movement-adjacency graph with BFS helpers. Exposed from the
 * library as the `data.board` namespace (e.g. `data.board.BOARD_LOCATIONS`,
 * `data.board.neighborsOf(...)`). The three modules export disjoint names.
 */
export * from './udtGameBoard';
export * from './udtBoardAnchors';
export * from './udtBoardAdjacency';
