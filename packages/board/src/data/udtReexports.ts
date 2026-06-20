// Re-export the static board data + rosters from `ultimatedarktower` (>= 5.0.0) so
// consumers get them from this package too — re-exported, never vendored.
//
// As of UDT v5 these live under the `data` / `seed` namespaces; we destructure them
// back to flat names so this package's public API (and its own internal imports) stay
// unchanged.
import { data, seed } from 'ultimatedarktower';

// Board geometry, layout anchors + image metadata (token placement), and the
// movement-adjacency graph + pure BFS helpers (move-validation utilities).
export const {
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_GROUPINGS,
  BOARD_ANCHORS,
  BOARD_IMAGE_INFO,
  BOARD_ADJACENCY,
  neighborsOf,
  stepDistance,
  shortestPath,
} = data.board;
export type BoardLocation = data.board.BoardLocation;
export type TerrainType = data.board.TerrainType;
export type BuildingType = data.board.BuildingType;
export type BoardKingdom = data.board.BoardKingdom;
export type BoardGrouping = data.board.BoardGrouping;
export type Anchor = data.board.Anchor;
export type AnchorSlot = data.board.AnchorSlot;
export type LocationAnchors = data.board.LocationAnchors;
export type BoardAnchorMap = data.board.BoardAnchorMap;
export type BoardImageInfo = data.board.BoardImageInfo;
export type BoardAdjacency = data.board.BoardAdjacency;

// Hero + monument reference rosters.
export const { HEROES, HERO_BY_ID } = data.heroes;
export const { MONUMENTS, MONUMENT_BY_ID } = data.monuments;
export type Hero = data.heroes.Hero;
export type ContentSource = data.heroes.ContentSource;
export type Monument = data.monuments.Monument;
export type MonumentId = data.monuments.MonumentId;
// NOTE: UDT's `HeroId` (a hero *identity* id) is deliberately NOT re-exported — this package's
// own `HeroId` (a caller-assigned *instance* id, in state/boardState) owns that name. Use a
// `Hero`'s `id` field for the identity.

// Seed-encoded setup rosters + enums (foes/adversaries/allies, difficulty, source).
export const {
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
  DIFFICULTIES,
  GAME_SOURCES,
} = seed;
export type Tier1Foe = seed.Tier1Foe;
export type Tier2Foe = seed.Tier2Foe;
export type Tier3Foe = seed.Tier3Foe;
export type Adversary = seed.Adversary;
export type Ally = seed.Ally;
export type Difficulty = seed.Difficulty;
export type GameSource = seed.GameSource;
export type ExpansionType = seed.ExpansionType;

// Foe in-play status + foe/adversary identity metadata (level/tier/source). `FoeStatus` is the
// ready→savage→lethal progression this package tracks in board state (was a local copy).
export const {
  FOE_STATUSES,
  FOES,
  ADVERSARY_ROSTER,
  ALL_FOES,
  FOE_BY_ID,
  FOE_BY_NAME,
} = data.foes;
export type FoeStatus = data.foes.FoeStatus;
export type FoeLevel = data.foes.FoeLevel;
export type FoeName = data.foes.FoeName;
export type Foe = data.foes.Foe;
// NOTE: UDT's `FoeId` (a foe *identity* id) is deliberately NOT re-exported — this package's own
// `FoeId` (a caller-assigned *instance* id, in state/boardState) owns that name, mirroring `HeroId`
// above. Use a `Foe`'s `id` field for the identity.
