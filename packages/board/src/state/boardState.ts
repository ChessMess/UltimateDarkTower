import type { BoardKingdom, FoeStatus } from '../data/udtReexports';
import { BOARD_LOCATIONS } from '../data/udtReexports';

/** A `BOARD_LOCATIONS[n].name`. Kept as a string — the board never validates it. */
export type LocationName = string;
/** Caller-assigned instance id for a placed hero. */
export type HeroId = string;
/** Caller-assigned instance id for a placed foe. */
export type FoeId = string;

/**
 * In-play foe power progression (panicked → unsteady → ready → savage → lethal). Tracked in
 * state but NOT rendered (lethality is not shown). Re-exported from UDT (`ultimatedarktower`)
 * so this stays the single source of truth; importers keep getting it from `'../state/boardState'`.
 */
export type { FoeStatus };

/**
 * A per-space overlay. Open set across expansions (Covenant wasteland, Alliances
 * power skulls, …) — the literal members are documentation; the type is `string`.
 */
export type SpaceMarker = 'wasteland' | 'power-skull' | string;

/**
 * A quest marker placed on a space — the game's four quest pieces (Main Goal, and the
 * Adversary / Guild / Companion quest markers). Its own category (distinct art, own board
 * host) but stored like {@link SpaceMarker}: a per-space overlay. Open string set; the
 * literal members are the canonical roster and double as documentation.
 */
export type QuestMarker =
  'main-goal' | 'adversary-quest' | 'guild-quest' | 'companion-quest' | string;

/** A hero pawn placed on the board. */
export interface HeroToken {
  location: LocationName;
  /** The kingdom that owns the hero, if tracked. */
  owner?: BoardKingdom;
  meta?: Record<string, unknown>;
}

/** A foe/adversary token placed on the board. `foe` is the foe *type* id (from UDT's tiered rosters). */
export interface FoeToken {
  foe: string;
  location: LocationName;
  status: FoeStatus;
  meta?: Record<string, unknown>;
}

/** Per-building space: skull stack, destroyed flag, and an optional monument placed on it. */
export interface BuildingState {
  skulls: number;
  destroyed: boolean;
  monument?: string | null;
}

/**
 * The full board state — a dumb container. It stores what it is told and enforces
 * no game rules; renderers read it and hosts own the rules.
 *
 * All values are plain, JSON-serializable data (no class instances, no `Map`/`Set`,
 * no functions), so state round-trips through JSON cleanly. The schema version is
 * not stored here — it lives in the save envelope (see `serialize.ts`).
 */
export interface BoardState {
  /** Placed heroes, keyed by instance id. */
  heroes: Record<HeroId, HeroToken>;
  /** Placed foes, keyed by instance id. */
  foes: Record<FoeId, FoeToken>;
  /** The selected/placed adversary, if any. */
  adversary?: { id: string; location?: LocationName };
  /** Building spaces, keyed by the 16 building-location names. */
  buildings: Record<LocationName, BuildingState>;
  /** Per-space overlays, keyed by location name. A key is present only while it has markers. */
  spaceMarkers: Record<LocationName, SpaceMarker[]>;
  /** Quest markers placed per space, keyed by location name. A key is present only while it has quests. */
  questMarkers: Record<LocationName, QuestMarker[]>;
  /** Game-setup selections (free-form; the board does not interpret them). */
  selections?: {
    difficulty?: string;
    adversary?: string;
    allies?: string[];
    foes?: string[];
    expansions?: string[];
  };
  /** Escape hatch for host-specific data. */
  meta?: Record<string, unknown>;
}

/**
 * An empty board: no heroes/foes/adversary/markers/quests, with all 16 building spaces
 * present at `{ skulls: 0, destroyed: false }`. Optional keys are omitted so the
 * state round-trips through JSON without `undefined`-vs-absent mismatches.
 */
export function createDefaultBoardState(): BoardState {
  const buildings: Record<LocationName, BuildingState> = {};
  for (const location of BOARD_LOCATIONS) {
    if (location.building) {
      buildings[location.name] = { skulls: 0, destroyed: false };
    }
  }
  return { heroes: {}, foes: {}, buildings, spaceMarkers: {}, questMarkers: {} };
}
