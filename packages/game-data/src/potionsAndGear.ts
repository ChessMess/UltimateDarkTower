/**
 * potionsAndGear.ts — the potion and gear cards.
 *
 * The four unreleased Expeditions gear rows are incomplete and carry `needsReview: true`.
 * One grants '+1 Humanoid Advantage', which would complete the six-advantage gear set
 * alongside Fell Snares (Beast) and Fulgent Relics (Undead).
 */

import type { ContentSource } from './heroes';

/** A potion or gear card. */
export interface PotionOrGear {
  /** Stable, unique kebab-case id. */
  id: string;
  /** Display name. Empty for the unreleased Expeditions gear not yet publicly named. */
  name: string;
  /** Which deck the card belongs to. */
  kind: 'potion' | 'gear';
  /** The card's rules text. */
  effect?: string;
  /** How many copies are in the deck. */
  count: number;
  /** Potion colour, for potions. */
  color?: string;
  /** Which product the card ships in, for gear. */
  source?: ContentSource;
  /** Set where the source row is incomplete. */
  needsReview?: boolean;
  /** Why this row is incomplete. */
  sourceNote?: string;
}

export const POTIONS_AND_GEAR: readonly PotionOrGear[] = [
  {
    id: 'potion-of-fortunes-favor',
    name: "Potion of Fortune's Favor",
    kind: 'potion',
    effect: 'Spend to gain +1 Wild Advantage',
    count: 3,
    color: 'white',
  },
  {
    id: 'potion-of-the-golden-sun',
    name: 'Potion of the Golden Sun',
    kind: 'potion',
    effect: 'Spend to gain 1[S].',
    count: 3,
    color: 'gold',
  },
  {
    id: 'potion-of-dragon-teeth',
    name: 'Potion of Dragon Teeth',
    kind: 'potion',
    effect: 'Spend to gain 6[W].',
    count: 3,
    color: 'red',
  },
  {
    id: 'potion-of-purifying-breath',
    name: 'Potion of Purifying Breath',
    kind: 'potion',
    effect: 'Spend to remove up to 2 skulls from any building.',
    count: 3,
    color: 'blue',
  },
  {
    id: 'potion-of-the-sirens-song',
    name: "Potion of the Siren's Song",
    kind: 'potion',
    effect: 'Spend to move any foe up to 2 spaces.',
    count: 3,
    color: 'green',
  },
  {
    id: 'potion-of-one-thousand-strides',
    name: 'Potion of One Thousand Strides',
    kind: 'potion',
    effect: 'Spend to move any hero up to 3 spaces.',
    count: 3,
    color: 'yellow',
  },
  {
    id: 'leather-armor',
    name: 'Leather Armor',
    kind: 'gear',
    effect: 'Prevent up to 2[W] losses per battle card.',
    count: 3,
    source: 'base',
  },
  {
    id: 'blessed-scepters',
    name: 'Blessed Scepters',
    kind: 'gear',
    effect: 'After you Reinforce, remove 1 skull from the building on your space.',
    count: 3,
    source: 'base',
  },
  {
    id: 'brass-talismans',
    name: 'Brass Talismans',
    kind: 'gear',
    effect: '+1 Magic Advantage',
    count: 3,
    source: 'base',
  },
  {
    id: 'dusky-cloaks',
    name: 'Dusky Cloaks',
    kind: 'gear',
    effect: '+1 Stealth Advantage',
    count: 3,
    source: 'base',
  },
  {
    id: 'longswords',
    name: 'Longswords',
    kind: 'gear',
    effect: '+1 Melee Advantage',
    count: 3,
    source: 'base',
  },
  {
    id: 'trusted-maps',
    name: 'Trusted Maps',
    kind: 'gear',
    effect: 'Your base move is +1',
    count: 3,
    source: 'base',
  },
  {
    id: 'fell-snares',
    name: 'Fell Snares',
    kind: 'gear',
    effect: '+1 Beast Advantage',
    count: 3,
    source: 'expeditions',
  },
  {
    id: 'fulgent-relics',
    name: 'Fulgent Relics',
    kind: 'gear',
    effect: '+1 Undead Advantage',
    count: 3,
    source: 'expeditions',
  },
  {
    id: 'gilded-alembic',
    name: 'Gilded Alembic',
    kind: 'gear',
    count: 3,
    source: 'expeditions',
    needsReview: true,
    sourceNote: 'Unreleased Expeditions gear; a photo exists but the effect text is not legible.',
  },
  {
    id: 'unnamed-gear-1',
    name: '',
    kind: 'gear',
    effect: '+1 Humanoid Advantage',
    count: 3,
    source: 'expeditions',
    needsReview: true,
    sourceNote: 'Unreleased Expeditions gear; name not yet public.',
  },
  {
    id: 'unnamed-gear-2',
    name: '',
    kind: 'gear',
    count: 3,
    source: 'expeditions',
    needsReview: true,
    sourceNote: 'Unreleased Expeditions gear; name not yet public.',
  },
  {
    id: 'unnamed-gear-3',
    name: '',
    kind: 'gear',
    count: 3,
    source: 'expeditions',
    needsReview: true,
    sourceNote: 'Unreleased Expeditions gear; name not yet public.',
  },
];

/** PotionOrGear entries keyed by their stable `id`. */
export const POTIONS_AND_GEAR_BY_ID: Readonly<Record<string, PotionOrGear>> = Object.freeze(
  POTIONS_AND_GEAR.reduce<Record<string, PotionOrGear>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
