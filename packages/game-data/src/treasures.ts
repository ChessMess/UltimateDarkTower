/**
 * treasures.ts — the 62 treasure cards.
 *
 * The source sheet's 'Full Note' column is a formula rebuilding 'Adv'+'Type'+'Condition',
 * so it is dropped in favour of the structured `advantage` object.
 */

import type { AdvantageType } from './advantages';
import type { ContentSource } from './heroes';

/**
 * Informal grouping recorded by the source author. Two kinds are mixed here:
 * - Mechanical cycles: `Scroll` (spent for a one-off bonus, usually +4 Wild) and
 *   `Wand` (carries charges spent over time).
 * - Naming cycles: `Champion` and `Guild` cards are named for a hero or a guild;
 *   `Azkol's` cards matter for Zaida's quest.
 * - Sets: `Crystal` and `Emissary` are three thematically linked treasures each.
 */
export type TreasureGroup =
  'Scroll' | 'Wand' | "Azkol's" | 'Crystal' | 'Emissary' | 'Champion' | 'Guild';

/** The advantage bonus printed on a treasure, with the condition it applies under. */
export interface TreasureAdvantage {
  /** How many advantages the treasure grants. */
  count: number;
  /** Which advantage type. */
  type: AdvantageType;
  /** Condition the bonus is limited to, e.g. `'in grasslands'`. Absent = unconditional. */
  condition?: string;
}

/** A treasure card. */
export interface Treasure {
  /** Stable, unique kebab-case id. */
  id: string;
  /** Display name. */
  name: string;
  /** Which product the treasure ships in. */
  source: ContentSource;
  /**
   * The card's rules text. Absent where the advantage line IS the whole card
   * (Crystal Blade, Grim Whisper).
   */
  text?: string;
  /**
   * The card's passive advantage bonus. Absent on cards that grant none — scrolls and a
   * handful of others trade the passive bonus for a large one-off effect when spent.
   */
  advantage?: TreasureAdvantage;
  /** Informal cycle/set the card belongs to; see `TreasureGroup`. */
  group?: TreasureGroup;
}

export const TREASURES: readonly Treasure[] = [
  {
    id: 'lamp-of-hope',
    name: 'Lamp of Hope',
    source: 'base',
    text: 'When you Cleanse, you can remove skulls from any space.',
    advantage: { count: 1, type: 'Magic' },
  },
  {
    id: 'scroll-of-the-great-serpent',
    name: 'Scroll of the Great Serpent',
    source: 'base',
    text: 'Spend to gain +4 Melee Advantages',
    group: 'Scroll',
  },
  {
    id: 'spear-of-atish',
    name: 'Spear of Atish',
    source: 'base',
    text: 'When you defeat a Melee foe, gain 10[W]',
    advantage: { count: 1, type: 'Beast' },
  },
  {
    id: 'scroll-of-twilight-shadow',
    name: 'Scroll of Twilight Shadow',
    source: 'base',
    text: 'Spend to gain +4 Stealth Advantages',
    group: 'Scroll',
  },
  {
    id: 'necklace-of-haggling',
    name: 'Necklace of Haggling',
    source: 'base',
    text: 'Ignore [CLOSED] on the haggle die. Reinforce as normal.',
    advantage: { count: 1, type: 'Stealth' },
  },
  {
    id: 'hallowed-reliquary',
    name: 'Hallowed Reliquary',
    source: 'base',
    text: 'After you Battle, remove 1 skull from a building in your current kingdom.',
    advantage: { count: 1, type: 'Undead' },
  },
  {
    id: 'azkols-idol',
    name: "Azkol's Idol",
    source: 'base',
    text: 'Prevent up to 2[W] losses per dungeon room.',
    advantage: { count: 1, type: 'Beast' },
    group: "Azkol's",
  },
  {
    id: 'kamarias-carpet',
    name: "Kamaria's Carpet",
    source: 'base',
    text: 'Once per turn, spend 1[S] to place your hero on any space.',
    advantage: { count: 1, type: 'Magic' },
  },
  {
    id: 'scroll-of-burning-sands',
    name: 'Scroll of Burning Sands',
    source: 'base',
    text: 'Spend to gain +4 Magic Advantages',
    group: 'Scroll',
  },
  {
    id: 'tears-of-the-shedu',
    name: 'Tears of the Shedu',
    source: 'base',
    text: 'When you defeat a Stealth foe, gain 1 potion.',
    advantage: { count: 1, type: 'Undead' },
  },
  {
    id: 'azkols-banner',
    name: "Azkol's Banner",
    source: 'base',
    text: 'You can take the Banner action of any hero in the game instead of yours.',
    advantage: { count: 1, type: 'Melee' },
    group: "Azkol's",
  },
  {
    id: 'acorns-of-the-white-oak',
    name: 'Acorns of the White Oak',
    source: 'base',
    text: 'Spend to remove up to 5 skulls from anywhere on the board.',
    advantage: { count: 1, type: 'Wild', condition: 'in grasslands' },
  },
  {
    id: 'axe-of-soul-rending',
    name: 'Axe of Soul Rending',
    source: 'base',
    text: 'When you defeat a Magic foe, gain 1 additional [S]',
    advantage: { count: 1, type: 'Humanoid' },
  },
  {
    id: 'circlet-of-conviction',
    name: 'Circlet of Conviction',
    source: 'base',
    text: 'Spend instead of dropping a skull into the Tower this turn. Take another turn.',
    advantage: { count: 1, type: 'Humanoid' },
  },
  {
    id: 'lamp-of-darkness',
    name: 'Lamp of Darkness',
    source: 'base',
    text: 'Spend to remove 1 foe from your space.',
    advantage: { count: 1, type: 'Beast' },
  },
  {
    id: 'white-cauldron',
    name: 'White Cauldron',
    source: 'base',
    text: 'After you Reinforce at a citadel, gain 1 potion.',
    advantage: { count: 1, type: 'Undead' },
  },
  {
    id: 'oakstone-bow',
    name: 'Oakstone Bow',
    source: 'base',
    text: 'You can Battle a foe on an adjacent space. (Terrain advantages use the space you are on.)',
    advantage: { count: 1, type: 'Melee' },
  },
  {
    id: 'crown-of-azkol',
    name: 'Crown of Azkol',
    source: 'base',
    text: 'After you reinforce at a sanctuary, also gain spirit equal to the current month.',
    advantage: { count: 1, type: 'Humanoid' },
    group: "Azkol's",
  },
  {
    id: 'azkols-horn',
    name: "Azkol's Horn",
    source: 'base',
    text: 'Do not spend spirit for glyphs facing you.',
    advantage: { count: 1, type: 'Beast' },
    group: "Azkol's",
  },
  {
    id: 'cloak-of-stars',
    name: 'Cloak of Stars',
    source: 'base',
    text: 'Once per turn, when you enter a space with a foe, place that foe on any space.',
    advantage: { count: 1, type: 'Stealth' },
  },
  {
    id: 'golden-mace-of-azkol',
    name: 'Golden Mace of Azkol',
    source: 'base',
    text: "While on a space with a foe, spend spirit equal to that foe's level to remove it.",
    advantage: { count: 1, type: 'Undead' },
    group: "Azkol's",
  },
  {
    id: 'amulet-of-the-marid',
    name: 'Amulet of the Marid',
    source: 'base',
    text: 'When you cross a river, move to any space adjacent to that river.',
    advantage: { count: 2, type: 'Wild', condition: 'in lakes' },
  },
  {
    id: 'ring-of-the-emissary',
    name: 'Ring of the Emissary',
    source: 'alliances',
    text: 'When you Reinforce to increase the rang of a guild, spend 2 less [I].',
    group: 'Emissary',
  },
  {
    id: 'crystal-platemail',
    name: 'Crystal Platemail',
    source: 'alliances',
    text: 'Prevent up to 2[W] losses per battle card for each other treasure you have.',
    advantage: { count: 1, type: 'Melee' },
    group: 'Crystal',
  },
  {
    id: 'crystal-blade',
    name: 'Crystal Blade',
    source: 'alliances',
    advantage: { count: 1, type: 'Wild', condition: 'for each other treasure you have' },
    group: 'Crystal',
  },
  {
    id: 'forbidden-grimoire',
    name: 'Forbidden Grimoire',
    source: 'alliances',
    text: 'If a power skull emerges in your current kingdom, lose this card and gain a corruption.',
    advantage: { count: 3, type: 'Wild' },
  },
  {
    id: 'coffer-of-the-master-thief',
    name: 'Coffer of the Master Thief',
    source: 'alliances',
    text: 'At the end of the month, gain 1[I] for each rank of the Thieves Guild.',
    advantage: { count: 1, type: 'Wild', condition: 'in the kingdom with the Thieves Guild' },
    group: 'Guild',
  },
  {
    id: 'everlasting-brazier',
    name: 'Everlasting Brazier',
    source: 'alliances',
    text: 'The rank of the guild in your current kingdom cannot be decreased.',
    advantage: { count: 1, type: 'Magic' },
  },
  {
    id: 'diadem-of-the-emissary',
    name: 'Diadem of the Emissary',
    source: 'alliances',
    text: 'You can Reinforce at any building to increase the rank of any guild.',
    advantage: { count: 1, type: 'Humanoid' },
    group: 'Emissary',
  },
  {
    id: 'zemayirs-teeth',
    name: "Zemayir's Teeth",
    source: 'alliances',
    text: 'When you Cleanse power skulls, remove them from the game and add a regular skull to the bag for each power skull you removed.',
  },
  {
    id: 'staff-of-wishes',
    name: 'Staff of Wishes',
    source: 'alliances',
    text: 'Spend to remove all power skulls from the board.',
    advantage: { count: 1, type: 'Magic' },
  },
  {
    id: 'trebbloks-hammer',
    name: "Trebblok's Hammer",
    source: 'alliances',
    text: 'When you defeat a foe, gain 2[I].',
    advantage: { count: 1, type: 'Melee' },
  },
  {
    id: 'scroll-of-forged-friendship',
    name: 'Scroll of Forged Friendship',
    source: 'alliances',
    text: 'Spend to increase the rank of the guild in your current kingdom by 1.',
    advantage: { count: 1, type: 'Beast' },
    group: 'Scroll',
  },
  {
    id: 'paladins-greatshield',
    name: "Paladin's Greatshield",
    source: 'alliances',
    text: 'At the end of the month, gain 6[W] for each rank of the Paladins Order.',
    advantage: { count: 1, type: 'Wild', condition: 'in the kingdom with the Paladins Order' },
    group: 'Guild',
  },
  {
    id: 'robes-of-the-last-sultan',
    name: 'Robes of the Last Sultan',
    source: 'alliances',
    text: 'Spend 3[I] to remove 1 foe from your space.',
  },
  {
    id: 'iron-hound-of-azkol',
    name: 'Iron Hound of Azkol',
    source: 'alliances',
    text: 'Before you move, you can place your hero on any space with a foe.',
    advantage: { count: 1, type: 'Beast' },
    group: "Azkol's",
  },
  {
    id: 'crystal-shield',
    name: 'Crystal Shield',
    source: 'alliances',
    text: 'At the end of the month, gain 1[I] for each other treasure you have.',
    advantage: { count: 1, type: 'Magic' },
    group: 'Crystal',
  },
  {
    id: 'ewer-of-the-silent-child',
    name: 'Ewer of the Silent Child',
    source: 'alliances',
    text: 'During your turn, you can spend potions that belong to other heroes (with their permission).',
    advantage: { count: 1, type: 'Stealth' },
  },
  {
    id: 'standard-of-the-scouts',
    name: 'Standard of the Scouts',
    source: 'alliances',
    text: 'At the end of the month, gain 1[S] for each rank of the Arcane Scouts.',
    advantage: { count: 1, type: 'Wild', condition: 'in the kingdom with the Arcane Scouts' },
    group: 'Guild',
  },
  {
    id: 'druids-incense',
    name: "Druid's Incense",
    source: 'alliances',
    text: 'At the end of the month, choose 1 building for each rank of the Druids Circle. Remove 1 skull from each of these buildings.',
    advantage: { count: 1, type: 'Wild', condition: 'in the kingdom with the Druids Circle' },
    group: 'Guild',
  },
  {
    id: 'vestments-of-the-emissary',
    name: 'Vestments of the Emissary',
    source: 'alliances',
    text: 'After you reinforce to increase the rank of a guild, gain 10[W].',
    advantage: {
      count: 1,
      type: 'Wild',
      condition: 'if the guild in your current kingdom is rank 2 or higher',
    },
    group: 'Emissary',
  },
  {
    id: 'jeweled-goblet-of-azkol',
    name: 'Jeweled Goblet of Azkol',
    source: 'alliances',
    text: 'When you influence, gain an additional 2[I] and also 1 potion.',
    group: "Azkol's",
  },
  {
    id: 'brutal-warlords-bell',
    name: "Brutal Warlord's Bell",
    source: 'covenant',
    text: 'When you fully upgrade a battle card, gain 3[W].',
    advantage: { count: 1, type: 'Melee' },
    group: 'Champion',
  },
  {
    id: 'grim-whisper',
    name: 'Grim Whisper',
    source: 'covenant',
    advantage: { count: 2, type: 'Wild', condition: 'when you Battle in a wasteland' },
  },
  {
    id: 'haunted-recluses-effigy',
    name: "Haunted Recluse's Effigy",
    source: 'covenant',
    text: 'When you Cleanse, you may spend this to remove all skulls in your current kingdom.',
    advantage: { count: 1, type: 'Magic' },
    group: 'Champion',
  },
  {
    id: 'orphaned-scions-charm',
    name: "Orphaned Scion's Charm",
    source: 'covenant',
    text: 'Whenever a skull emerges from the Tower in your current kingdom, gain a blessing.',
    advantage: { count: 1, type: 'Magic' },
    group: 'Champion',
  },
  {
    id: 'azkols-vambraces',
    name: "Azkol's Vambraces",
    source: 'covenant',
    text: 'At the start of your turn, you may place your hero in any space adjacent to the Tower. If you do so, gain a blessing.',
    group: "Azkol's",
  },
  {
    id: 'azkols-ichor',
    name: "Azkol's Ichor",
    source: 'covenant',
    text: "When a foe's status changes, gain 7[W]",
    advantage: { count: 1, type: 'Beast' },
    group: "Azkol's",
  },
  {
    id: 'spymasters-journal',
    name: "Spymaster's Journal",
    source: 'covenant',
    text: 'At the start of your turn, you may spend 1[S] to flip one of your inactive virtues. If you do, flip it back over at the end of the turn.',
    advantage: { count: 1, type: 'Stealth' },
    group: 'Champion',
  },
  {
    id: 'opal-of-projection',
    name: 'Opal of Projection',
    source: 'covenant',
    text: 'You may complete a monthly quest from any space.',
    advantage: { count: 1, type: 'Stealth' },
  },
  {
    id: 'azkols-scroll',
    name: "Azkol's Scroll",
    source: 'covenant',
    text: 'Spend when you Battle to gain +6 Wild Advantages. You may not use other Advantages during that battle.',
    group: "Azkol's",
  },
  {
    id: 'wand-of-conflagration',
    name: 'Wand of Conflagration',
    source: 'covenant',
    text: 'When acquired: 3[C]. Spend any number of [C] to remove a foe of that level from your space. At the end of the month, gain 1[C].',
    advantage: { count: 1, type: 'Magic' },
    group: 'Wand',
  },
  {
    id: 'sanctified-flask',
    name: 'Sanctified Flask',
    source: 'covenant',
    text: 'Spend to remove 1 corruption from any hero. That hero gains a blessing.',
    advantage: { count: 1, type: 'Undead' },
  },
  {
    id: 'azkols-chakram',
    name: "Azkol's Chakram",
    source: 'covenant',
    text: 'When you defeat a level 3 or level 3 foe, you may remove one of your corruptions or give another hero a blessing.',
    advantage: { count: 1, type: 'Beast' },
    group: "Azkol's",
  },
  {
    id: 'relic-hunters-flagon',
    name: "Relic Hunter's Flagon",
    source: 'covenant',
    text: 'When you gain a potion, look at the top 4 cards of the potion deck and choose one. Put the rest on the bottom.',
    advantage: { count: 1, type: 'Humanoid' },
    group: 'Champion',
  },
  {
    id: 'wand-of-pacification',
    name: 'Wand of Pacification',
    source: 'covenant',
    text: 'When acquired: 1[C]. Spend 1[C] to remove all skulls on or adjacent to your space. When you Battle an Undead foe, gain 1[C].',
    advantage: { count: 1, type: 'Undead' },
    group: 'Wand',
  },
  {
    id: 'archwrights-sledge',
    name: "Archwright's Sledge",
    source: 'covenant',
    text: 'When you complete a quest, put an offering token on any foundation.',
    advantage: { count: 1, type: 'Wild', condition: 'in kingdoms with a completed monument' },
    group: 'Champion',
  },
  {
    id: 'beacon-stone',
    name: 'Beacon Stone',
    source: 'covenant',
    text: 'At the end of your turn, if you are on a space with a building, you may place your hero on any space in your home kingdom.',
    advantage: { count: 1, type: 'Undead' },
  },
  {
    id: 'everfilled-chest',
    name: 'Everfilled Chest',
    source: 'covenant',
    text: 'At the end of your turn, roll the haggle die and gain the result. (Ignored [Closed].)',
    advantage: { count: 1, type: 'Wild', condition: 'if you are on or adjacent to a Bazaar' },
  },
  {
    id: 'the-iron-wall',
    name: 'The Iron Wall',
    source: 'covenant',
    text: 'Spend to ignore all losses on a battle card, event, or dungeon room that would cause you to lose 10+[W].',
    advantage: { count: 1, type: 'Humanoid' },
  },
  {
    id: 'tent-of-revelry',
    name: 'Tent of Revelry',
    source: 'covenant',
    text: 'You may Reinforce in desert spaces. You you do, choose a non-monument building and use its effect.',
    advantage: { count: 1, type: 'Wild', condition: 'when you Quest' },
  },
  {
    id: 'wand-of-celerity',
    name: 'Wand of Celerity',
    source: 'covenant',
    text: 'When acquired: 4[C]. Spend any number of [C] to place your hero that many spaces away. When you battle a Melee foe, gain 1[C].',
    advantage: { count: 1, type: 'Melee' },
    group: 'Wand',
  },
];

/** Treasure entries keyed by their stable `id`. */
export const TREASURES_BY_ID: Readonly<Record<string, Treasure>> = Object.freeze(
  TREASURES.reduce<Record<string, Treasure>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
