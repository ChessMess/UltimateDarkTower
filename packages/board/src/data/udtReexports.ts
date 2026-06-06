// Re-export the board data + rosters that `ultimatedarktower` ships TODAY (4.0.x).
//
// NOT yet available upstream (in progress — see spec §2 / §12-Q2): BOARD_ANCHORS,
// BOARD_ADJACENCY, BOARD_IMAGE_INFO, and the graph helpers (e.g. stepDistance).
// Add their re-exports here once they land and bump the `ultimatedarktower` peer
// range in package.json accordingly.
export { BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME, BOARD_GROUPINGS } from 'ultimatedarktower';
export type {
  BoardLocation,
  TerrainType,
  BuildingType,
  BoardKingdom,
  BoardGrouping,
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
