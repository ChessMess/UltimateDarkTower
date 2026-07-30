/**
 * Shared board-UI data used by the palette, the inspector, and the LocationSelect picker
 * (PRD-02). Rosters and the 60 locations come from `ultimatedarktower`; nothing here mutates
 * state — these are display helpers only.
 */
import type { BoardState, FoeStatus } from 'ultimatedarktowerboard';
import {
  ADVERSARY_ROSTER,
  BOARD_LOCATIONS,
  FOES,
  FOE_BY_ID,
  HERO_BY_ID,
  type FoeLevel,
} from '@/lib/udtData';

export const KINGDOMS = ['north', 'east', 'south', 'west'] as const;

export interface BoardLoc {
  name: string;
  kingdom: string;
  building?: string;
}

/** All 60 locations (in library order). */
export const LOCATIONS = BOARD_LOCATIONS as readonly BoardLoc[];
/** The 16 building spaces — the only legal skull/monument targets. */
export const BUILDING_LOCATIONS = LOCATIONS.filter((l) => Boolean(l.building));

/** Tiered foes grouped by their level (2–4), derived from the roster. */
export const FOE_LEVELS = [...new Set(FOES.map((f) => f.level))]
  .sort((a, b) => a - b)
  .map((level) => ({ level, foes: FOES.filter((f) => f.level === level) }));

/** Common per-space markers; the field is an open string union, so others are allowed too. */
export const MARKER_PRESETS = ['wasteland', 'power-skull', 'quest'] as const;

export const foeName = (id: string): string => FOE_BY_ID[id]?.name ?? id;
export const adversaryName = (id: string): string =>
  ADVERSARY_ROSTER.find((a) => a.id === id)?.name ?? id;
export const heroName = (id: string): string => HERO_BY_ID[id]?.name ?? id;

/** A foe's identity level (2–4), or `undefined` for an unknown/legacy art id. */
export const foeLevelOf = (id: string): FoeLevel | undefined => FOE_BY_ID[id]?.level;

/**
 * The stored threat status for `level` (defaults to `'ready'` until explicitly set). Real
 * Return to Dark Tower rule: status applies to a whole level, not a single placed foe — see
 * `setLevelStatus` in the game store, which is the only thing that writes this.
 */
export function statusForLevel(state: BoardState, level: FoeLevel): FoeStatus {
  const levelStatus = state.meta?.levelStatus as Partial<Record<FoeLevel, FoeStatus>> | undefined;
  return levelStatus?.[level] ?? 'ready';
}

/** This game's foe (levels 2–4 only — level 5 is the adversary, picked separately). */
export type LevelFoes = { level2: string | null; level3: string | null; level4: string | null };

/**
 * The name of whichever foe this game's setup assigned to `level` (e.g. "Brigands"), or a
 * generic "Level N" fallback before setup picks one. Only one foe occupies a level for a given
 * game, so this is more useful than the bare level number once setup is complete.
 */
export function levelLabel(foes: LevelFoes, level: FoeLevel): string {
  const id =
    level === 2 ? foes.level2 : level === 3 ? foes.level3 : level === 4 ? foes.level4 : null;
  return id ? foeName(id) : `Level ${level}`;
}
