/**
 * quests.ts — the 16 monthly quest cards.
 *
 * Complete: competitive play deals each player one quest per kingdom, so four players ×
 * four kingdoms = 16. The source sheet's 'Type' column is the kingdom's virtue, emitted
 * here as `virtue` — it always matches the `virtue` of the quest's kingdom in
 * `nations.ts`.
 */

import type { BoardKingdom } from './board/gameBoard';
import type { NationVirtue } from './nations';

/** A monthly quest card. */
export interface Quest {
  /** Stable, unique kebab-case id. */
  id: string;
  /** Display name. */
  name: string;
  /** The virtue this quest is associated with. */
  virtue: NationVirtue;
  /** The kingdom the quest belongs to. */
  kingdom: BoardKingdom;
  /** The quest's requirement text. */
  details: string;
}

export const QUESTS: readonly Quest[] = [
  {
    id: 'race-to-the-golden-obelisk',
    name: 'Race to the Golden Obelisk',
    virtue: 'Prowess',
    kingdom: 'east',
    details: 'Quest in the Decaying Wilds and spend 4 different Advantages.',
  },
  {
    id: 'survive-the-drowned-barrows',
    name: 'Survive the Drowned Barrows',
    virtue: 'Prowess',
    kingdom: 'east',
    details: 'Quest in Dragontooth Lake and spend 4 different Advantages.',
  },
  {
    id: 'solve-the-riddle-of-the-marid',
    name: 'Solve the Riddle of the Marid',
    virtue: 'Prowess',
    kingdom: 'east',
    details: 'Quest in Three Rivers and spend 4 of the same Advantage.',
  },
  {
    id: 'perform-the-song-of-peril',
    name: 'Perform the Song of Peril',
    virtue: 'Prowess',
    kingdom: 'east',
    details: 'Quest in the Lake of Songs and spend 4 of the same Advantage.',
  },
  {
    id: 'win-egans-tournament',
    name: "Win Egan's Tournament",
    virtue: 'Valor',
    kingdom: 'north',
    details: "Quest in Egan's End and spend 18[W].",
  },
  {
    id: 'impress-the-winter-fey',
    name: 'Impress the Winter Fey',
    virtue: 'Valor',
    kingdom: 'north',
    details: 'Quest in the Lower Ice Fangs and have 3 treasures.',
  },
  {
    id: 'protect-the-radiant-castle',
    name: 'Protect the Radiant Castle',
    virtue: 'Valor',
    kingdom: 'north',
    details: 'Quest in the Radiant Mountains and spend 18[W].',
  },
  {
    id: 'activate-the-ley-lines',
    name: 'Activate the Ley Lines',
    virtue: 'Valor',
    kingdom: 'north',
    details: 'Quest in Green Bridge and have 3 treasures.',
  },
  {
    id: 'repair-the-weeping-dam',
    name: 'Repair the Weeping Dam',
    virtue: 'Sacrifice',
    kingdom: 'west',
    details: 'Quest in the Weeping Waters and spend 3 gear.',
  },
  {
    id: 'supply-the-watchtowers',
    name: 'Supply the Watchtowers',
    virtue: 'Sacrifice',
    kingdom: 'west',
    details: 'Quest in the Lonelight Hills and spend 3 gear.',
  },
  {
    id: 'consecrate-arkartus',
    name: 'Consecrate Arkartus',
    virtue: 'Sacrifice',
    kingdom: 'west',
    details: 'Quest in Arkartus and spend 5 potions.',
  },
  {
    id: 'lay-plovos-ghost-to-rest',
    name: "Lay Plovo's Ghost to Rest",
    virtue: 'Sacrifice',
    kingdom: 'west',
    details: 'Quest in the Plains of Plovo and spend 5 potions.',
  },
  {
    id: 'finish-building-the-shrine',
    name: 'Finish Building the Shrine',
    virtue: 'Compassion',
    kingdom: 'south',
    details: 'Quest in Archmont and spend 4[S].',
  },
  {
    id: 'suffer-with-the-silent-sisters',
    name: 'Suffer with the Silent Sisters',
    virtue: 'Compassion',
    kingdom: 'south',
    details: 'Quest in the Bone Hills and spend 4[S].',
  },
  {
    id: 'guide-abandoned-pilgrims',
    name: 'Guide Abandoned Pilgrims',
    virtue: 'Compassion',
    kingdom: 'south',
    details: 'Quest in the Emerald Expanse and have 4 virtues.',
  },
  {
    id: 'hold-a-moonless-vigil',
    name: 'Hold a Moonless Vigil',
    virtue: 'Compassion',
    kingdom: 'south',
    details: 'Quest in the Howling Desert and have 4 virtues.',
  },
];

/** Quest entries keyed by their stable `id`. */
export const QUESTS_BY_ID: Readonly<Record<string, Quest>> = Object.freeze(
  QUESTS.reduce<Record<string, Quest>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
