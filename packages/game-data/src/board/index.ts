/**
 * Board data aggregate — game board geometry (locations/groupings), layout anchors +
 * image metadata, and the movement-adjacency graph with BFS helpers. The three modules
 * export disjoint names, so this barrel is safe to flatten.
 */
export * from './gameBoard';
export * from './boardAnchors';
export * from './boardAdjacency';
