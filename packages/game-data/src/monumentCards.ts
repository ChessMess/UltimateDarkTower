/**
 * monumentCards.ts — the printed card face for each of the 8 Covenant monuments.
 *
 * The roster (id/name/source) lives in `monuments.ts`; `id` and `name` here match it.
 */

import type { BuildingType } from './board/gameBoard';

/** A Covenant monument card. The roster (id/name/source) lives in `monuments.ts`;
 *  this is the printed card face. */
export interface MonumentCard {
  /** Stable, unique kebab-case id matching `monuments.ts` (e.g. `'argent-oak'`). */
  id: string;
  /** Display name. */
  name: string;
  /** The building type this monument replaces. */
  building: BuildingType;
  /** The monument's first (always free) Reinforce option. */
  reinforce1: string;
  /** The monument's second, upgraded Reinforce option. */
  reinforce2: string;
  /** What the hero must do to make an offering at this monument. */
  offering: string;
  /** Extra standing rule printed on the card, if any. */
  special?: string;
}

export const MONUMENT_CARDS: readonly MonumentCard[] = [
  {
    id: 'colossus-of-bjorn',
    name: 'Colossus of Bjorn',
    building: 'Village',
    reinforce1: 'Free: Gain 6[W]',
    reinforce2: 'Free: Place yourself and the building in any space without a building',
    offering: 'Lose 8+ warriors from a battle card.',
  },
  {
    id: 'endless-necropolis',
    name: 'Endless Necropolis',
    building: 'Village',
    reinforce1: 'Free: Gain 6[W]',
    reinforce2:
      '1[S]: Remove any number of skulls from this building and return them to the supply',
    offering: 'Spend or lose a treasure.',
    special: 'This building can hold any number of skulls. You cannot Cleanse this building.',
  },
  {
    id: 'argent-oak',
    name: 'Argent Oak',
    building: 'Sanctuary',
    reinforce1: 'Free: Gain 1[S]',
    reinforce2: 'Free: Spend any number of items to remove an equal number of your corruptions',
    offering: 'Gain a corruption',
  },
  {
    id: 'moonstone-temple',
    name: 'Moonstone Temple',
    building: 'Sanctuary',
    reinforce1: 'Free: Gain 1[S]',
    reinforce2: '10[S]: You may Battle and Cleanse any number of times this turn',
    offering: 'Complete a battle without using any advantages',
  },
  {
    id: 'arch-of-the-golden-sun',
    name: 'Arch of the Golden Sun',
    building: 'Bazaar',
    reinforce1: 'Free: Gain 1 gear',
    reinforce2: '5[S]: Gain 1 virtue and the top two cards of the treasure deck',
    offering: 'End your turn with 2+ foes on or adjacent to your space.',
  },
  {
    id: 'nightmare-cage',
    name: 'Nightmare Cage',
    building: 'Bazaar',
    reinforce1: 'Free: Gain 1 gear',
    reinforce2: '20[W]: Remove a foe',
    offering: 'End your turn with 4+ skulls on or adjacent to your space.',
  },
  {
    id: 'tower-shard',
    name: 'Tower Shard',
    building: 'Citadel',
    reinforce1: 'Free: Gain 1 potion',
    reinforce2: '1[S]: Gain 2 potions',
    offering: 'Defeat a foe in a space adjacent to the Tower.',
  },
  {
    id: 'cenotaph-of-the-first-prophet',
    name: 'Cenotaph of the First Prophet',
    building: 'Citadel',
    reinforce1: 'Free: Gain 1 potion',
    reinforce2: '4[S]: Gain an active virtue tile from outside the game',
    offering: 'Defeat a foe in a wasteland.',
  },
];

/** MonumentCard entries keyed by their stable `id`. */
export const MONUMENT_CARDS_BY_ID: Readonly<Record<string, MonumentCard>> = Object.freeze(
  MONUMENT_CARDS.reduce<Record<string, MonumentCard>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
