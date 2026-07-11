/**
 * Shared board-UI data used by the palette, the inspector, and the LocationSelect picker
 * (PRD-02). Rosters and the 60 locations come from `ultimatedarktower`; nothing here mutates
 * state — these are display helpers only.
 */
import { ADVERSARY_ROSTER, BOARD_LOCATIONS, FOES, FOE_BY_ID, HERO_BY_ID } from '@/lib/udtData';

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
