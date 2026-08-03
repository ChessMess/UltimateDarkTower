/** corruptions.ts — the 24 corruption cards. */

import type { ContentSource } from './heroes';

/** A corruption card. */
export interface Corruption {
  /** Stable, unique kebab-case id. */
  id: string;
  /** Display name. */
  name: string;
  /** Which product the card ships in. */
  source: ContentSource;
  /** The card's rules text. */
  description: string;
}

export const CORRUPTIONS: readonly Corruption[] = [
  {
    id: 'selfish',
    name: 'Selfish',
    source: 'base',
    description: 'You cannot give other heroes anything when you trade.',
  },
  { id: 'tempted', name: 'Tempted', source: 'base', description: 'Spend 1 extra [S] for glyphs.' },
  {
    id: 'cursed',
    name: 'Cursed',
    source: 'base',
    description: 'You cannot spend more than 4 Advantages per turn.',
  },
  {
    id: 'uncertain',
    name: 'Uncertain',
    source: 'base',
    description: 'After you reinforce, immediately end your turn.',
  },
  {
    id: 'cruel',
    name: 'Cruel',
    source: 'base',
    description: 'After you reinforce at a village, lose 1[S].',
  },
  {
    id: 'feral',
    name: 'Feral',
    source: 'base',
    description: 'If you end your turn on a space with a building, lose 2[S].',
  },
  { id: 'feeble', name: 'Feeble', source: 'base', description: 'You cannot double your move.' },
  {
    id: 'lost',
    name: 'Lost',
    source: 'base',
    description: 'If you end your turn in your home kingdom, lose 1[S].',
  },
  {
    id: 'weak',
    name: 'Weak',
    source: 'base',
    description: 'You cannot carry more than 2 treasures.',
  },
  {
    id: 'feverish',
    name: 'Feverish',
    source: 'base',
    description: 'You cannot Cleanse a building with 3 skulls.',
  },
  {
    id: 'greedy',
    name: 'Greedy',
    source: 'base',
    description: 'After you reinforce at a bazaar, lose 1[S].',
  },
  {
    id: 'suspicious',
    name: 'Suspicious',
    source: 'base',
    description: 'You cannot carry more than 2 potions.',
  },
  {
    id: 'shaken',
    name: 'Shaken',
    source: 'covenant',
    description: 'You cannot take the action of glyphs facing your current kingdom.',
  },
  {
    id: 'reckless',
    name: 'Reckless',
    source: 'covenant',
    description: 'You must roll the haggle die when you take the Reinforce action.',
  },
  {
    id: 'inobservant',
    name: 'Inobservant',
    source: 'covenant',
    description: 'You cannot gain warriors, spirit, or items from battle cards.',
  },
  {
    id: 'indolent',
    name: 'Indolent',
    source: 'covenant',
    description: 'You can only Reinforce in your home kingdom.',
  },
  {
    id: 'fatigued',
    name: 'Fatigued',
    source: 'covenant',
    description: 'Your base move is reduced by 1.',
  },
  { id: 'vain', name: 'Vain', source: 'covenant', description: 'You cannot Battle level 2 foes.' },
  {
    id: 'disreputable',
    name: 'Disreputable',
    source: 'covenant',
    description: 'You must pay 1[S] to take a free Reinforce action.',
  },
  {
    id: 'crestfallen',
    name: 'Crestfallen',
    source: 'covenant',
    description: 'You cannot take a Banner action.',
  },
  {
    id: 'arrogant',
    name: 'Arrogant',
    source: 'covenant',
    description: 'You cannot take the Quest action.',
  },
  {
    id: 'aquaphobic',
    name: 'Aquaphobic',
    source: 'covenant',
    description: 'You lose 1[S] when you cross a river.',
  },
  {
    id: 'timid',
    name: 'Timid',
    source: 'covenant',
    description: 'You cannot enter a space adjacent to the Tower.',
  },
  {
    id: 'snobby',
    name: 'Snobby',
    source: 'covenant',
    description: 'You cannot hold gear. (When you gain this corruption, lose all your gear.)',
  },
];

/** Corruption entries keyed by their stable `id`. */
export const CORRUPTIONS_BY_ID: Readonly<Record<string, Corruption>> = Object.freeze(
  CORRUPTIONS.reduce<Record<string, Corruption>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
