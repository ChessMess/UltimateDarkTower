/**
 * Builders for fresh sessions and their parts. Keeps default-construction in one place
 * so setup (PRD-04) and tests agree on base-game starting values.
 */
import { createDefaultTowerState } from 'ultimatedarktower';
import { BOARD_LOCATIONS } from '@/lib/udtData';
import { createDefaultBoardState } from 'ultimatedarktowerboard';
import { HERO_VIRTUE_COUNT } from './playerBoard';
import {
  GAME_SESSION_SCHEMA_VERSION,
  type GameConfig,
  type GameProgress,
  type GameSession,
  type Kingdom,
  type PlayerBoard,
  type TowerSlice,
} from './types';

/** App version stamped into exports so a recipient on an older build gets a clear message. */
export const APP_VERSION = '0.1.0';

/** Base-game starting resources (verified: rules.md / heroes.md). */
export const STARTING_WARRIORS = 7;
export const STARTING_SPIRIT = 1;

function newId(): string {
  // crypto.randomUUID exists in modern browsers and Node 18+.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultConfig(): GameConfig {
  return {
    mode: 'cooperative',
    difficulty: 'Heroic',
    expansions: [],
    playerCount: 1,
    heroes: [],
    adversary: null,
    foes: { level2: null, level3: null, level4: null },
    mainGoal: '',
  };
}

export function createDefaultProgress(): GameProgress {
  return { month: 1, turn: 1, dismissedReminders: [] };
}

/** A calibrated default tower (no hardware in MVP, so present as calibrated). */
export function createDefaultTowerSlice(): TowerSlice {
  const state = createDefaultTowerState();
  state.drum.forEach((d) => {
    d.calibrated = true;
  });
  return { state, brokenSeals: [] };
}

/**
 * The Citadel location in a kingdom — a hero's home-kingdom starting space (FR-04.3).
 * "Citadel" is a `building` property of a named location, not a location named "Citadel"
 * (e.g. the north Citadel is "Radiant Mountains"). Returns undefined only if the data is
 * missing a kingdom's Citadel (shouldn't happen for the base board).
 */
export function homeCitadelFor(kingdom: Kingdom): string | undefined {
  return BOARD_LOCATIONS.find((l) => l.kingdom === kingdom && l.building === 'Citadel')?.name;
}

export function createPlayerBoard(heroId: string, homeKingdom: Kingdom): PlayerBoard {
  return {
    heroId,
    homeKingdom,
    warriors: STARTING_WARRIORS,
    spirit: STARTING_SPIRIT,
    corruption: 0,
    potions: 0,
    treasures: [],
    gear: [],
    questItems: [],
    companions: [],
    virtues: {
      hero: Array.from({ length: HERO_VIRTUE_COUNT }, (_, i) => ({
        id: `hero-${i + 1}`,
        active: false,
      })),
      kingdom: { id: 'kingdom', active: false },
    },
  };
}

/**
 * A brand-new session from a config (FR-04.3): default calibrated tower, a board seeded
 * with the 16 buildings and each hero placed on their home-kingdom Citadel, and a player
 * board per configured hero with base-game starting resources.
 */
export function createNewGameSession(config: GameConfig, name?: string): GameSession {
  const now = new Date().toISOString();
  const board = createDefaultBoardState();
  for (const h of config.heroes) {
    const location = homeCitadelFor(h.homeKingdom);
    if (location) board.heroes[h.heroId] = { location, owner: h.homeKingdom };
  }
  return {
    schemaVersion: GAME_SESSION_SCHEMA_VERSION,
    meta: { id: newId(), name, createdAt: now, updatedAt: now, appVersion: APP_VERSION },
    config,
    progress: createDefaultProgress(),
    tower: createDefaultTowerSlice(),
    board,
    playerBoards: config.heroes.map((h) => createPlayerBoard(h.heroId, h.homeKingdom)),
  };
}
