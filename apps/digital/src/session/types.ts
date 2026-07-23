/**
 * The single portable game object (PRD-04). One `GameSession` fully describes a game:
 * the manually-entered configuration (the official app does setup, so the player mirrors
 * it here), the tower state, the board state, the player boards, and progress. It is the
 * unit of save / load / export / import / share — `JSON.stringify` of this object is the
 * whole game.
 *
 * Tower & board state are plain JSON-serializable objects from the UDT libraries, so the
 * session needs no custom binary format (the tower's 20-byte packing is for BLE, not saves).
 */
import type { TowerState } from 'ultimatedarktower';
import type { BoardState } from 'ultimatedarktowerboard';
import type { SealRef } from '@/sources/types';

/**
 * Bump on any breaking change to the shape; `deserializeSession` validates it.
 * v2 (PRD-03): `PlayerBoard` gained potions / treasures / gear / questItems /
 * companions / virtues — v1 saves lack those fields and are rejected on load.
 * v3: `board: BoardState` is now `ultimatedarktowerboard`'s 0.5.0 shape (one `tokens`
 * collection, replacing the `heroes`/`foes`/`buildings`/`spaceMarkers`/`questMarkers`
 * buckets) — not backward compatible. A v2 save is refused, not migrated (see
 * `state/gameStore.ts`'s `staleSession` — the app offers a download before it can be cleared).
 */
export const GAME_SESSION_SCHEMA_VERSION = 3;

export type GameMode = 'cooperative'; // 'competitive' is a future mode
export type Difficulty = 'Heroic' | 'Gritty';
export type Kingdom = 'north' | 'south' | 'east' | 'west';

/** The official-app setup, entered by hand (FR-04.1). */
export interface GameConfig {
  mode: GameMode;
  difficulty: Difficulty;
  /** Base game only in MVP — always `[]`. */
  expansions: string[];
  playerCount: number;
  heroes: { heroId: string; homeKingdom: Kingdom }[];
  adversary: string | null;
  foes: { level2: string | null; level3: string | null; level4: string | null };
  /** Not in the libs — free text in MVP (see PRD-04 open question). */
  mainGoal: string;
  /** Optional official seed; if present it pre-fills the rest at setup time. */
  seed?: string;
}

/** Where the game is in the 6-month cadence + UI progress markers. */
export interface GameProgress {
  month: number; // 1..6
  turn: number;
  activeHeroId?: string;
  dismissedReminders?: string[];
  notes?: string;
}

/**
 * The tower slice = the `TowerState` plus broken seals. Seals are tracked *outside*
 * `TowerState` (like the `ultimatedarktower` library does — they aren't in the 19-byte
 * state), so the session captures both to round-trip the tower losslessly.
 */
export interface TowerSlice {
  state: TowerState;
  brokenSeals: SealRef[];
}

/**
 * One virtue tile. Hero tiles and the kingdom tile both flip between an inactive and an
 * active side (rules.md: tiles start inactive side up; activate at a Citadel). The card
 * text is © Restoration Games and is NOT bundled — `label` is an optional player note.
 */
export interface VirtueTile {
  /** Stable slot id: `hero-1`..`hero-3` or `kingdom`. */
  id: string;
  active: boolean;
  /** Optional player-entered name (no IP text is shipped). */
  label?: string;
}

/**
 * Per-hero tracked state (PRD-03). UTDD is a player-owned tracker — it stores and shows
 * these values but enforces no costs or rules. Card/virtue names are not bundled (IP), so
 * gear / treasures / quest items / companions are free-text the player labels themselves.
 *
 * Pools (`warriors`/`spirit`/`corruption`/`potions`) are simple counts; `treasures` (≤4)
 * and `gear` (≤6, "one of each of the 6 types") are capacity-limited labeled lists;
 * `virtues` are toggle tiles. See `playerBoard.ts` for the constants and transforms.
 */
export interface PlayerBoard {
  heroId: string;
  homeKingdom: Kingdom;
  warriors: number;
  spirit: number;
  /** 0..2 in play; a 3rd ends the game (flagged, never enforced). */
  corruption: number;
  potions: number;
  /** Distinct treasure cards, capped at 4 (`TREASURE_CAP`). */
  treasures: string[];
  /** Carried gear, capped at 6 (`GEAR_CAP`) — one of each of the six gear types. */
  gear: string[];
  questItems: string[];
  companions: string[];
  /** 3 hero virtue tiles + 1 kingdom virtue tile, each toggling active/inactive. */
  virtues: { hero: VirtueTile[]; kingdom: VirtueTile };
}

export interface GameSessionMeta {
  id: string;
  name?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  appVersion: string;
}

/** The one object that is the whole game (FR-04.4). */
export interface GameSession {
  schemaVersion: number;
  meta: GameSessionMeta;
  config: GameConfig;
  progress: GameProgress;
  tower: TowerSlice;
  board: BoardState;
  playerBoards: PlayerBoard[];
}
