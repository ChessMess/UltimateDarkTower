// Re-export the static board data + rosters from `ultimatedarktowerdata` so consumers get
// them from this package too — re-exported, never vendored.
//
// v6.0.0: this data moved out of `ultimatedarktower` (which no longer ships it) into
// `ultimatedarktowerdata`, a zero-dependency package with no Bluetooth. It's exported flat —
// no more `data` / `seed` namespaces to destructure.
export {
  // Board geometry, layout spots + image metadata (token placement), and the
  // movement-adjacency graph + pure BFS helpers (move-validation utilities).
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_GROUPINGS,
  BOARD_SPOTS,
  RESERVED_TOKEN_TYPES,
  BOARD_IMAGE_INFO,
  BOARD_ADJACENCY,
  neighborsOf,
  stepDistance,
  shortestPath,
  type BoardLocation,
  type TerrainType,
  type BuildingType,
  type BoardKingdom,
  type BoardGrouping,
  type SpotPoint,
  type BoardSpot,
  type BoardSpotMap,
  type ReservedTokenType,
  type BoardImageInfo,
  type BoardAdjacency,

  // Hero + monument reference rosters.
  HEROES,
  HERO_BY_ID,
  MONUMENTS,
  MONUMENT_BY_ID,
  type Hero,
  type ContentSource,
  type Monument,
  type MonumentId,
  // NOTE: UDT's `HeroId` (a hero *identity* id) is deliberately NOT re-exported — a placed
  // hero's *instance* id is just `PlacedToken.id: string` (state/boardState), unkeyed by any
  // dedicated type since 0.5.0's move to one flat `tokens` collection. Use a `Hero`'s `id`
  // field for the identity.

  // Seed-encoded setup rosters + enums (foes/adversaries/allies, difficulty, source).
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
  DIFFICULTIES,
  GAME_SOURCES,
  type Tier1Foe,
  type Tier2Foe,
  type Tier3Foe,
  type Adversary,
  type Ally,
  type Difficulty,
  type GameSource,
  type ExpansionType,

  // Foe in-play status + foe/adversary identity metadata (level/tier/source). `FoeStatus` is the
  // ready→savage→lethal progression this package tracks in board state (was a local copy).
  FOE_STATUSES,
  FOES,
  ADVERSARY_ROSTER,
  ALL_FOES,
  FOE_BY_ID,
  FOE_BY_NAME,
  type FoeStatus,
  type FoeLevel,
  type FoeName,
  type Foe,
  // NOTE: UDT's `FoeId` (a foe *identity* id) is deliberately NOT re-exported — mirrors `HeroId`
  // above: a placed foe's *instance* id is just `PlacedToken.id: string`. Use a `Foe`'s `id`
  // field for the identity.
} from 'ultimatedarktowerdata';
