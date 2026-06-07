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

// Rosters + setup enums (fixed reference rosters: foes/adversaries/allies/heroes/monuments).
export {
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
  HEROES,
  HERO_BY_ID,
  MONUMENTS,
  MONUMENT_BY_ID,
  DIFFICULTIES,
  GAME_SOURCES,
} from 'ultimatedarktower';
export type {
  Tier1Foe,
  Tier2Foe,
  Tier3Foe,
  Adversary,
  Ally,
  Hero,
  Monument,
  MonumentId,
  ContentSource,
  Difficulty,
  GameSource,
  ExpansionType,
} from 'ultimatedarktower';
// NOTE: UDT's `HeroId` (a hero *identity* id) is deliberately NOT re-exported — this package's
// own `HeroId` (a caller-assigned *instance* id, in state/boardState) owns that name. Use a
// `Hero`'s `id` field for the identity.
