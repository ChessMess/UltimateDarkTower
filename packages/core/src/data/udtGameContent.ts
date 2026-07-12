// Return to Dark Tower — game content (heroes, virtues, foes, adversaries, companions).
// Gameplay-facing data for UDT apps. Box/component counts live in udtBoxInventory.ts.
// Names use the spreadsheet's wording (not reconciled with TOWER_AUDIO_LIBRARY keys).

export type HeroExpansion = 'Base Game' | 'Alliances' | 'Covenant';

/** A virtue: its tile name and rules text. */
export interface Virtue {
  readonly name: string;
  readonly ability: string;
}

/**
 * A playable hero.
 * - `defaultVirtues`: the 2 virtues active from the start (printed on the board).
 * - `unlockableVirtues`: the 3 virtue tiles unlocked during play.
 * Kingdom virtues are NOT hero-specific — see KINGDOM_VIRTUES.
 */
export interface Hero {
  readonly name: string;
  readonly expansion: HeroExpansion;
  readonly bannerAction: string;
  readonly defaultVirtues: readonly Virtue[];
  readonly unlockableVirtues: readonly Virtue[];
}

/** All heroes, keyed by name for O(1) lookup (e.g. HEROES.Spymaster). */
export const HEROES = {
  Spymaster: {
    name: 'Spymaster',
    expansion: 'Base Game',
    bannerAction: 'Place your hero on any space in your current kingdom.',
    defaultVirtues: [
      { name: 'Alert', ability: '+1 Stealth Advantage.' },
      { name: 'Swift', ability: 'Your base move is 4.' },
    ],
    unlockableVirtues: [
      { name: 'Resourceful', ability: 'At the end of each month, gain 15 warriors.' },
      {
        name: 'Fortunate',
        ability: 'You may Reinforce twice per turn at the same building.',
      },
      {
        name: 'Unseen',
        ability:
          'When you complete a monthly quest, you may remove a foe instead of gaining spirit.',
      },
    ],
  },
  'Brutal Warlord': {
    name: 'Brutal Warlord',
    expansion: 'Base Game',
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
  'Orphaned Scion': {
    name: 'Orphaned Scion',
    expansion: 'Base Game',
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
  'Relic Hunter': {
    name: 'Relic Hunter',
    expansion: 'Base Game',
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
  'Haunted Recluse': {
    name: 'Haunted Recluse',
    expansion: 'Alliances',
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
  Archwright: {
    name: 'Archwright',
    expansion: 'Alliances',
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
  'Relentless Warden': {
    name: 'Relentless Warden',
    expansion: 'Covenant',
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
  'Undaunted Aegis': {
    name: 'Undaunted Aegis',
    expansion: 'Covenant',
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
  'Devious Swindler': {
    name: 'Devious Swindler',
    expansion: 'Covenant',
    bannerAction: 'Roll the haggle die and gain the result.',
    defaultVirtues: [
      {
        name: 'Inventive',
        ability: 'When you Battle, gain all advantages in the treasure market.',
      },
      {
        name: 'Joyful',
        ability: 'When you roll the haggle die, ignore the Cancelled symbol.',
      },
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
  'Reverent Astromancer': {
    name: 'Reverent Astromancer',
    expansion: 'Covenant',
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
} as const satisfies Record<string, Hero>;

export type HeroName = keyof typeof HEROES;
export type VirtueName =
  | (typeof HEROES)[HeroName]['defaultVirtues'][number]['name']
  | (typeof HEROES)[HeroName]['unlockableVirtues'][number]['name'];

/** Heroes as a list, for iteration. */
export const heroes: readonly Hero[] = Object.values(HEROES);

/** A non-adversary foe (levels 2–4). */
export interface Foe {
  readonly name: string;
  readonly level: 2 | 3 | 4;
}

/** Foes keyed by name. The adversary (level 5) lives in ADVERSARIES. */
export const FOES = {
  Brigands: { name: 'Brigands', level: 2 },
  Oreks: { name: 'Oreks', level: 2 },
  'Shadow Wolves': { name: 'Shadow Wolves', level: 2 },
  'Spine Fiend': { name: 'Spine Fiend', level: 2 },
  'Clan Of Neuri': { name: 'Clan Of Neuri', level: 3 },
  'Frost Troll': { name: 'Frost Troll', level: 3 },
  Lemure: { name: 'Lemure', level: 3 },
  'Widowmade Spider': { name: 'Widowmade Spider', level: 3 },
  Dragon: { name: 'Dragon', level: 4 },
  Mormo: { name: 'Mormo', level: 4 },
  Striga: { name: 'Striga', level: 4 },
  Titan: { name: 'Titan', level: 4 },
} as const satisfies Record<string, Foe>;
export type FoeName = keyof typeof FOES;
export const foes: readonly Foe[] = Object.values(FOES);

/** An adversary (the level-5 "foe"). */
export interface Adversary {
  readonly name: string;
  readonly level: 5;
}

/** Adversaries keyed by name. */
export const ADVERSARIES = {
  Ashstrider: { name: 'Ashstrider', level: 5 },
  'Bane Of Omens': { name: 'Bane Of Omens', level: 5 },
  'Empress Of Shades': { name: 'Empress Of Shades', level: 5 },
  'Gaze Eternal': { name: 'Gaze Eternal', level: 5 },
  Gravemaw: { name: 'Gravemaw', level: 5 },
  'Isa The Exile': { name: 'Isa The Exile', level: 5 },
  'Lingering Rot': { name: 'Lingering Rot', level: 5 },
  "U'tuk-Ku The Ice Herald": { name: "U'tuk-Ku The Ice Herald", level: 5 },
} as const satisfies Record<string, Adversary>;
export type AdversaryName = keyof typeof ADVERSARIES;
export const adversaries: readonly Adversary[] = Object.values(ADVERSARIES);

/** A companion ally and their title/epithet. */
export interface Companion {
  readonly name: string;
  readonly title: string;
}

/** Companions keyed by name. */
export const COMPANIONS = {
  Gleb: { name: 'Gleb', title: 'The Outlaw King' },
  Grigor: { name: 'Grigor', title: 'The Unbreakable' },
  Hakan: { name: 'Hakan', title: 'The Artificer' },
  Letha: { name: 'Letha', title: 'The Dryad' },
  Miras: { name: 'Miras', title: 'The Horselord' },
  Nimet: { name: 'Nimet', title: 'The Fathomless' },
  Tomas: { name: 'Tomas', title: 'The Scout' },
  Vasa: { name: 'Vasa', title: 'The Devine' },
  Yana: { name: 'Yana', title: 'The Assassin' },
  Zaida: { name: 'Zaida', title: 'The Efreet' },
} as const satisfies Record<string, Companion>;
export type CompanionName = keyof typeof COMPANIONS;
export const companions: readonly Companion[] = Object.values(COMPANIONS);

/** Kingdom virtues, keyed by kingdom direction. A hero takes the one for their
 *  home/seating kingdom at setup (not hero-specific). */
export const KINGDOM_VIRTUES = {
  East: { name: 'Champion of the East', ability: '+2 Wild Advantages in hills.' },
  North: { name: 'Champion of the North', ability: '+2 Wild Advantages in mountains.' },
  South: { name: 'Champion of the South', ability: '+2 Wild Advantages in deserts.' },
  West: { name: 'Champion of the West', ability: '+2 Wild Advantages in forests.' },
} as const satisfies Record<string, Virtue>;
export type KingdomDirection = keyof typeof KINGDOM_VIRTUES;
export const kingdomVirtues: readonly Virtue[] = Object.values(KINGDOM_VIRTUES);
