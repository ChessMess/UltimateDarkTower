/**
 * nations.ts — the four kingdoms as a setting: proper name, colour, signature terrain,
 * virtue, guild, and prose description.
 *
 * `description` comes from the Return to Dark Tower RPG and `neighbor` from draft
 * Expeditions text; both describe the published setting. The source sheet's 'Tribe' /
 * 'Ancient' / element columns were the author's own campaign design and are not imported.
 */

import type { BoardKingdom, TerrainType } from './board/gameBoard';

/**
 * A kingdom's virtue. Also classifies monthly quests — a quest's virtue always matches the
 * virtue of its kingdom (see `quests.ts`).
 */
export type NationVirtue = 'Prowess' | 'Valor' | 'Sacrifice' | 'Compassion';

/**
 * A kingdom's setting/lore entry. `description` comes from the Return to Dark Tower RPG
 * and `neighbor` from draft Expeditions text; both describe the published setting.
 * Purely RPG-design material lives in `NATION_RPG_NOTES` instead.
 */
export interface Nation {
  /** Stable, unique kebab-case id (the nation's proper name). */
  id: string;
  /** In-fiction proper name ("Durnin"). */
  name: string;
  /** Which of the four kingdoms this is. */
  kingdom: BoardKingdom;
  /** Player colour associated with the kingdom. */
  color: string;
  /** The kingdom's signature terrain. */
  terrain: TerrainType;
  /** The kingdom virtue ("Valor"). */
  virtue: NationVirtue;
  /** The guild seated in this kingdom. */
  guild: string;
  /** Prose description of the kingdom, from the RtDT RPG. */
  description: string;
  /** Prose description of the neighbouring realm beyond the map edge (draft Expeditions
   *  text). */
  neighbor?: string;
}

export const NATIONS: readonly Nation[] = [
  {
    id: 'durnin',
    name: 'Durnin',
    kingdom: 'north',
    color: 'Yellow',
    terrain: 'Mountains',
    virtue: 'Valor',
    guild: 'Paladins Order',
    description:
      'Though as varied in landscape as all of the Four Kingdoms, the North is the coldest and driest of the four. The people that live there are as strong and tough as bears. Falcons and eagles hunt the skies, and fish fill the cold lakes and rivers. Coins bearing double-headed falcons can still be found in the barrows and tombs of the forgotten empire that once held all of the North. Most northerners live in mountain towns that rely on deep mines and hard timber forests for their wealth.',
    neighbor:
      'To the north are the Gasping Mountains, home to the aether monks, giants who live among the snowy peaks in pursuit of the perfect alignment of body and mind. The spirits of the fallen are entombed within towering statues that watch over their charges as they did in life.',
  },
  {
    id: 'brynthia',
    name: 'Brynthia',
    kingdom: 'east',
    color: 'Blue',
    terrain: 'Hills',
    virtue: 'Prowess',
    guild: 'Arcane Scouts',
    description:
      'To the east lies the oldest of the human cities, as well as the ruins of the ancient race that once called the griffon-haunted crags and canyons home. The Kinghills and the Tombstones alike are home to a vigorous people, as well as tales of an ancient kingdom that has faded from memory. The cosmopolitan towns of the East are home to many merchants and traders, and the Easterners are known for traveling far and wide in search of goods for their colorful bazaars.',
    neighbor:
      'To the east are the Inkstain Isles, home to freebooters, freeloaders, and the enigmatic Madame Dolo, whose undying smiths fashion accursed altars from the driftwood of ships that crash upon the rocks.',
  },
  {
    id: 'arisilon',
    name: 'Arisilon',
    kingdom: 'south',
    color: 'Red',
    terrain: 'Desert',
    virtue: 'Compassion',
    guild: 'Thieves Guild',
    description:
      'Once the most powerful of the Four Kingdoms, the South is still the wealthiest and haughtiest. A land of sparkling sands and skyscraping mountains, the South is famed for its lions and lion-hunters, its jewel mines, and the Watchers - the first humans to settle in the harsh climates of the south.',
    neighbor:
      'To the south is the Brassbound League, a loose alliance of city-states amidst the sands. The barren landscape has led its people to ingenuity and a knack for negotiation and trade. Renowned for their lotus-shaped workshops, their artisans can make almost anything... for a price.',
  },
  {
    id: 'zenon',
    name: 'Zenon',
    kingdom: 'west',
    color: 'Green',
    terrain: 'Forest',
    virtue: 'Sacrifice',
    guild: 'Druids Circle',
    description:
      'The Kingdom of the West is home to dense forests and herds of wild unicorns. The most peaceful of the Four Kingdoms, the West is nevertheless home to warriors and wizards and is known for producing particularly fine archers and bows. Kingdom Dragons, the violent scourge, are more likely found in the West, particularly in Cloudhold and the Hissing Groves.',
    neighbor:
      'To the west lies the Umberwood an ancient forest of towering trees, cyclopean fungi, and lurking fauna. Ancient ruins are home to mysterious stone menhirs carved with inscrutable runes and infused with primordial power.',
  },
];

/** Nation entries keyed by their stable `id`. */
export const NATIONS_BY_ID: Readonly<Record<string, Nation>> = Object.freeze(
  NATIONS.reduce<Record<string, Nation>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
