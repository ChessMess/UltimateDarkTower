/**
 * heroes.ts — the Return to Dark Tower hero roster (static reference data).
 *
 * Consumed by `ultimatedarktowerboard` (re-exported, not vendored). Heroes are NOT
 * seed-encoded. 14 heroes: 4 base, 2 Alliances, 4 Covenant, 4 Expeditions (the Expeditions
 * heroes' virtues are recorded; their banner actions are not yet).
 *
 * This is the ONE hero record. Until v3, 10 of the 14 existed twice — identity here
 * (keyed by `id`) and the gameplay sheet in `gameContent.HEROES` (keyed by name, no id at
 * all), so nothing could join them without matching on a display string. The split was a
 * workaround for a `Hero`/`HEROES` name collision, not a modelling decision, and the sheet
 * half had no consumers. The sheet fields now live here; `gameContent` no longer exports
 * heroes. See CHANGELOG for the migration.
 */

import type { Virtue } from './virtues';

/**
 * Which product a roster entry ships in (base game + expansions). Distinct from the seed
 * parser's `ExpansionType` (which only encodes the Alliances/Monuments expansion bits) and
 * from `GameSource` (Core vs Competitive play).
 */
export type ContentSource = 'base' | 'alliances' | 'covenant' | 'expeditions';

/** Stable, unique hero identity id (kebab-case), e.g. `'archwright'`. */
export type HeroId = string;

export interface Hero {
  /** Stable, unique kebab-case identity id. */
  id: HeroId;
  /** Display name. */
  name: string;
  /** The product this hero ships in. */
  source: ContentSource;
  /** Optional fixed start location name, if the hero has one (none recorded yet). */
  startLocation?: string;
  /**
   * The hero's banner action. Absent only where it has not been recorded yet — the 4
   * Expeditions heroes. Never infer one.
   */
  bannerAction?: string;
  /** The 2 virtues active from the start (printed on the player board). */
  defaultVirtues?: readonly Virtue[];
  /** The 3 virtue tiles unlocked during play. */
  unlockableVirtues?: readonly Virtue[];
}

/**
 * All 14 heroes, grouped by source (base → alliances → covenant → expeditions).
 * The 10 base/Alliances/Covenant heroes carry their full gameplay sheet; the 4 Expeditions
 * heroes carry their virtues but no banner action until one is transcribed.
 */
export const HEROES: readonly Hero[] = [
  {
    id: 'brutal-warlord',
    name: 'Brutal Warlord',
    source: 'base',
    bannerAction: 'Gain 5 warriors.',
    defaultVirtues: [
      { name: 'Baleful', ability: '+1 Melee Advantage.' },
      { name: 'Veteran', ability: '+1 Wild Advantage when you Battle.' },
    ],
    unlockableVirtues: [
      { name: 'Inspiring', ability: 'After you Reinforce, also gain 6 warriors.' },
      {
        name: 'Callous',
        ability:
          'After you Battle, if you lost at least 10 warriors, gain a treasure from the market.',
      },
      { name: 'Relentless', ability: 'If you double your move, gain +1 Wild Advantage.' },
    ],
  },
  {
    id: 'orphaned-scion',
    name: 'Orphaned Scion',
    source: 'base',
    bannerAction: 'Gain 1 spirit.',
    defaultVirtues: [
      { name: 'Arcane', ability: '+1 Magic Advantage.' },
      { name: 'Generous', ability: 'After you Cleanse, remove 1 skull from any building.' },
    ],
    unlockableVirtues: [
      {
        name: 'Infused',
        ability: 'At the start of your turn, remove 1 skull from a building in your home kingdom.',
      },
      {
        name: 'Blessed',
        ability:
          'Spend 1 spirit to prevent up to 6 warrior losses from a battle card or dungeon room.',
      },
      {
        name: 'Anointed',
        ability: '+1 Wild Advantage for each building with no skulls on or adjacent to your space.',
      },
    ],
  },
  {
    id: 'relic-hunter',
    name: 'Relic Hunter',
    source: 'base',
    bannerAction: 'Gain 1 potion.',
    defaultVirtues: [
      { name: 'Precise', ability: '+1 Humanoid Advantage.' },
      {
        name: 'Prepared',
        ability: 'When you Reinforce at a bazaar, spend 1 less spirit to gain a treasure.',
      },
    ],
    unlockableVirtues: [
      { name: 'Crafty', ability: 'When you spend a potion, double the number on it.' },
      {
        name: 'Lucky',
        ability: 'When you spend (not lose) a treasure, gain the top card of the treasure deck.',
      },
      { name: 'Inventive', ability: 'Spend 4 potions to remove a foe from your space.' },
    ],
  },
  {
    id: 'spymaster',
    name: 'Spymaster',
    source: 'base',
    bannerAction: 'Place your hero on any space in your current kingdom.',
    defaultVirtues: [
      { name: 'Alert', ability: '+1 Stealth Advantage.' },
      { name: 'Swift', ability: 'Your base move is 4.' },
    ],
    unlockableVirtues: [
      { name: 'Resourceful', ability: 'At the end of each month, gain 15 warriors.' },
      { name: 'Fortunate', ability: 'You may Reinforce twice per turn at the same building.' },
      {
        name: 'Unseen',
        ability:
          'When you complete a monthly quest, you may remove a foe instead of gaining spirit.',
      },
    ],
  },
  {
    id: 'archwright',
    name: 'Archwright',
    source: 'alliances',
    bannerAction: 'Place a battlement on any space or move a battlement up to 2 spaces.',
    defaultVirtues: [
      { name: 'Innovative', ability: '+1 Beast Advantage.' },
      { name: 'Clever', ability: 'Battlements give you +2 Wild Advantages (instead of +1).' },
    ],
    unlockableVirtues: [
      {
        name: 'Tactical',
        ability:
          'While on a battlement, you can Battle a foe on an adjacent space. (Terrain advantages use the space you are on.)',
      },
      {
        name: 'Wily',
        ability: 'Battlements give you advantages when you Quest (in addition to when you Battle).',
      },
      {
        name: 'Exalted',
        ability:
          'While on a battlement, you may Cleanse to remove skulls from all adjacent buildings.',
      },
    ],
  },
  {
    id: 'haunted-recluse',
    name: 'Haunted Recluse',
    source: 'alliances',
    bannerAction: 'Move 1 skull from any building to any other building with 2 or fewer skulls.',
    defaultVirtues: [
      { name: 'Spiritreaver', ability: '+1 Undead Advantage.' },
      {
        name: 'Skullweaver',
        ability:
          'When a skull emerges in your home kingdom, you can place it on any building with 2 or fewer skulls in any kingdom.',
      },
    ],
    unlockableVirtues: [
      {
        name: 'Shadowspinner',
        ability: '+1 Wild Advantage for each building with skulls on or adjacent to your space.',
      },
      {
        name: 'Soulreaper',
        ability:
          'Prevent up to 2 warrior losses per battle card for each skull on or adjacent to your space.',
      },
      {
        name: 'Sinbearer',
        ability:
          'At the end of the month you can spend up to 12 warriors to remove all skulls from your current kingdom.',
      },
    ],
  },
  {
    id: 'devious-swindler',
    name: 'Devious Swindler',
    source: 'covenant',
    bannerAction: 'Roll the haggle die and gain the result.',
    defaultVirtues: [
      {
        name: 'Inventive',
        ability: 'When you Battle, gain all advantages in the treasure market.',
      },
      { name: 'Joyful', ability: 'When you roll the haggle die, ignore the Cancelled symbol.' },
    ],
    unlockableVirtues: [
      {
        name: 'Fortuitous',
        ability: 'After you roll the haggle die, you may reroll once and take either result.',
      },
      {
        name: 'Opportunistic',
        ability: 'When any player gains a treasure from the treasure market, you gain a blessing.',
      },
      {
        name: 'Calculating',
        ability: 'You may ignore warrior and spirit losses on critical hit battle cards.',
      },
    ],
  },
  {
    id: 'relentless-warden',
    name: 'Relentless Warden',
    source: 'covenant',
    bannerAction:
      'Place quarry token on a foe if it is not already, else move quarry token up to 2 spaces.',
    defaultVirtues: [
      { name: 'Perceptive', ability: '+1 Wild Advantage vs. your quarry.' },
      {
        name: 'Guarded',
        ability: 'Prevent up to 3 warrior losses per battle card when you Battle your quarry.',
      },
    ],
    unlockableVirtues: [
      { name: 'Keen-Eyed', ability: '+2 Wild Advantages vs. your quarry.' },
      {
        name: 'Instinctive',
        ability: 'You may remove your quarry token to ignore your quarry during its strike event.',
      },
      {
        name: 'Inspiring',
        ability: 'When you defeat your quarry, remove all skulls on or adjacent to your space.',
      },
    ],
  },
  {
    id: 'reverent-astromancer',
    name: 'Reverent Astromancer',
    source: 'covenant',
    bannerAction: 'Remove a skull on or adjacent to your space.',
    defaultVirtues: [
      {
        name: 'Well Versed',
        ability: 'If you remove a skull with your Banner action, gain a blessing.',
      },
      {
        name: 'Pious',
        ability: 'At the start of each month, prepare spells equal to the month number.',
      },
    ],
    unlockableVirtues: [
      { name: 'Exalted', ability: 'You can prepare invocations.' },
      { name: 'Zealous', ability: 'Whenever you cast a spell, gain a blessing.' },
      {
        name: 'Bounteous',
        ability: 'Once per turn, when you cast a spell, gain the top card of the treasure deck.',
      },
    ],
  },
  {
    id: 'undaunted-aegis',
    name: 'Undaunted Aegis',
    source: 'covenant',
    bannerAction:
      'For each corruption you have, gain 3 warriors. You may spend 10 warriors to remove one of your corruptions.',
    defaultVirtues: [
      {
        name: 'Ascetic',
        ability: 'Gain 1 spirit for each battle card you spend no advantages on.',
      },
      {
        name: 'Iron-Willed',
        ability: 'You can have an additional corruption. Start the game with 1 random corruption.',
      },
    ],
    unlockableVirtues: [
      { name: 'Emboldened', ability: '+1 Wild Advantage for each corruption you have.' },
      {
        name: 'Resolute',
        ability: 'When you Reinforce, spend 1 less spirit for each corruption you have.',
      },
      {
        name: 'Steeled',
        ability:
          'Once per turn, if another hero would gain a corruption, you may gain it instead and gain 2 spirit.',
      },
    ],
  },
  {
    id: 'jocular-druid',
    name: 'Jocular Druid',
    source: 'expeditions',
    defaultVirtues: [
      { name: 'Empowered', ability: '+1 Wild Advantage in your champion terrain.' },
      {
        name: 'Mesmerizing',
        ability: 'You may spend your moves to move foes in your current kingdom.',
      },
    ],
    unlockableVirtues: [
      {
        name: 'Attuned',
        ability: 'When you Reinforce in your champion terrain, spend 2 less spirit.',
      },
      {
        name: 'Gregarious',
        ability: 'If you end your turn in your champion terrain, gain 6 warriors and 1 potion.',
      },
      {
        name: 'Mystical',
        ability:
          'After you take a heroic action in your champion terrain, place yourself in any space with your champion terrain.',
      },
    ],
  },
  {
    id: 'grizzled-mariner',
    name: 'Grizzled Mariner',
    source: 'expeditions',
    defaultVirtues: [
      {
        name: 'Commanding',
        ability: "You can take your heroic action as if you were in the Brinewraith's space.",
      },
      {
        name: 'Seasoned',
        ability: '+1 Wild Advantage when you Battle on or adjacent to a river or lake space.',
      },
    ],
    unlockableVirtues: [
      {
        name: 'Accursed',
        ability: 'Once per turn, remove all skulls from a space the Brinewraith enters.',
      },
      {
        name: 'Marauding',
        ability:
          'After you take your Banner action, gain 6 warriors, 1 spirit, 1 gear, or 1 potion.',
      },
      {
        name: 'Ruthless',
        ability: '+1 Wild Advantage and +1 Undead Advantage when you use your Commanding virtue.',
      },
    ],
  },
  {
    id: 'clever-tinkerer',
    name: 'Clever Tinkerer',
    source: 'expeditions',
    defaultVirtues: [
      { name: 'Astute', ability: 'After you Reinforce, spend a gear to upgrade another gear.' },
      { name: 'Ingenious', ability: 'You can have a duplicate gear if one of them is upgraded.' },
    ],
    unlockableVirtues: [
      {
        name: "Sprocket's Condenser",
        ability: 'When you spend a gear, gain 1 spirit or 1 potion.',
      },
      {
        name: "Sprocket's Manifold",
        ability: 'After you Battle or Quest, gain a gear and upgrade it for free.',
      },
      {
        name: "Sprocket's Resonator",
        ability: 'At the start of your turn, gain 2 warriors for each upgraded gear you have.',
      },
    ],
  },
  {
    id: 'enlightened-ascetic',
    name: 'Enlightened Ascetic',
    source: 'expeditions',
    defaultVirtues: [
      { name: 'Centered', ability: 'Your Virtues cost only 4 spirit.' },
      { name: 'Studied', ability: '+1 Humanoid Advantage.' },
    ],
    unlockableVirtues: [
      {
        name: 'Illuminated',
        ability:
          'You may lock this virtue to gain +1 Wild Advantage for each virtue you have (including this one).',
      },
      {
        name: 'Long-Strider',
        ability: 'After you Reinforce, move up to 1 space for each virtue you have.',
      },
      {
        name: 'Temperate',
        ability: 'Prevent up to 1 warrior loss per battle card for each virtue you have.',
      },
    ],
  },
];

/** Heroes keyed by their stable `id`. */
export const HERO_BY_ID: Readonly<Record<HeroId, Hero>> = Object.freeze(
  HEROES.reduce<Record<HeroId, Hero>>((acc, hero) => {
    acc[hero.id] = hero;
    return acc;
  }, {}),
);

/** Heroes keyed by display name — the join the old `gameContent.HEROES` was used for. */
export const HERO_BY_NAME: Readonly<Record<string, Hero>> = Object.freeze(
  HEROES.reduce<Record<string, Hero>>((acc, hero) => {
    acc[hero.name] = hero;
    return acc;
  }, {}),
);
