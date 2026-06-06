// Re-export the static board data + rosters from `ultimatedarktower` (>= 4.1.0) so
// consumers get them from this package too — re-exported, never vendored.
export { BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME, BOARD_GROUPINGS } from 'ultimatedarktower';
export type {
  BoardLocation,
  TerrainType,
  BuildingType,
  BoardKingdom,
  BoardGrouping,
} from 'ultimatedarktower';

// Board layout anchors + image metadata (token placement) and the movement-adjacency
// graph + pure BFS helpers (move-validation utilities; the board enforces no rules).
export {
  BOARD_ANCHORS,
  BOARD_IMAGE_INFO,
  BOARD_ADJACENCY,
  neighborsOf,
  stepDistance,
  shortestPath,
} from 'ultimatedarktower';
export type {
  Anchor,
  AnchorSlot,
  LocationAnchors,
  BoardAnchorMap,
  BoardImageInfo,
  BoardAdjacency,
} from 'ultimatedarktower';

// Rosters + setup enums (heroes are seeded per game; foes/adversaries/allies are fixed sets).
export {
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
  DIFFICULTIES,
  GAME_SOURCES,
} from 'ultimatedarktower';
export type {
  Tier1Foe,
  Tier2Foe,
  Tier3Foe,
  Adversary,
  Ally,
  Difficulty,
  GameSource,
  ExpansionType,
} from 'ultimatedarktower';
