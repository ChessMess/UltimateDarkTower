/**
 * types.ts — App-specific types for the seed decoder web app.
 */

import type { seed as seedApi } from 'ultimatedarktower';

export interface FieldMapping {
  name: string;
  bitOffset: number;
  bitLength: number;
  confidence: seedApi.Confidence;
  options?: string[];
}

/** Full game configuration recorded by the user for a seed. */
export type GameConfig = Partial<Record<ChangeableField, string>>;

export interface SeedEntry {
  id: string;
  seed: string;
  timestamp: number;
  /** For variants: which field was changed from the baseline. */
  changedField?: string;
  /** For variants: the new value of that field. */
  changedValue?: string;
  notes?: string;
}

export interface Session {
  id: string;
  name: string;
  created: number;
  baseline: SeedEntry | null;
  /** The full game configuration for the baseline seed. */
  baselineConfig: GameConfig;
  variants: SeedEntry[];
  /** Post-game-start observations for derived-state correlation. */
  events: GameEvent[];
}

export interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  fieldMappings: FieldMapping[];
}

// ── Game Event Types (post-game-start observations) ─────────────────────────

export const EVENT_TYPES = [
  'Foe Spawn',
  'Foe Defeated',
  'Foe Acts',
  'Dungeon Discovered',
  'Quest Appeared',
  'Quest Completed',
  'Companion Event',
  'Seal Broken',
  'New Wares',
  'Battle',
  'Rumor',
  'No Events',
  'Other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Kingdoms / board quadrants where things can spawn. */
export const KINGDOMS = ['North', 'East', 'South', 'West'] as const;
export type Kingdom = (typeof KINGDOMS)[number];

/** All foes across all levels, for spawn/defeat tracking. */
export const ALL_FOES = [
  'Brigands', 'Oreks', 'Shadow Wolves', 'Spine Fiend',
  'Frost Troll', 'Lemure', 'Clan of Neuri', 'Widowmade Spider',
  'Dragon', 'Mormo', 'Striga', 'Titan',
] as const;

export const COMPANIONS = ['Berat', 'Grigor', 'Yana'] as const;

export const QUEST_TYPES = ['Adversary', 'Companion'] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export interface GameEvent {
  id: string;
  month: number;
  /** Turn within the month (optional). */
  turn?: number;
  type: EventType;
  /** Which kingdom/quadrant, if applicable. */
  kingdom?: Kingdom;
  /** Which foe, if applicable. */
  foe?: string;
  /** Which companion, if applicable. */
  companion?: string;
  /** Quest subtype (Adversary or Companion), if applicable. */
  questType?: QuestType;
  /** Free-text details. */
  notes?: string;
  timestamp: number;
}

// ── Changeable Fields (pre-game-start config) ───────────────────────────────

export const CHANGEABLE_FIELDS = [
  'Source',
  'Difficulty',
  'Expansions',
  'Player Count',
  'Adversary',
  'Ally',
  'Foe Level 2',
  'Foe Level 3',
  'Foe Level 4',
] as const;

export type ChangeableField = (typeof CHANGEABLE_FIELDS)[number];

export const FIELD_OPTIONS: Record<ChangeableField, string[]> = {
  'Source': ['Core', 'Competitive'],
  'Difficulty': ['Heroic', 'Gritty'],
  'Expansions': ['None', 'Monuments', 'Alliances', 'Alliances + Monuments'],
  'Player Count': ['1', '2', '3', '4'],
  'Adversary': [
    'Ashstrider', 'Bane of Omens', 'Empress of Shades', 'Gaze Eternal',
    'Gravemaw', 'Isa the Exile', 'Lingering Rot', "Utuk'Ku",
  ],
  'Ally': [
    'Gleb', 'Grigor', 'Hakan', 'Letha', 'Miras',
    'Nimet', 'Tomas', 'Vasa', 'Yana', 'Zaida',
  ],
  'Foe Level 2': [
    'Brigands', 'Oreks', 'Shadow Wolves', 'Spine Fiends',
  ],
  'Foe Level 3': [
    'Frost Trolls', 'Clan of Neuri', 'Lemures', 'Widowmade Spiders',
  ],
  'Foe Level 4': [
    'Dragons', 'Mormos', 'Striga', 'Titans',
  ],
};
