/**
 * questItems.ts — the quest item cards.
 *
 * 17 entries summing to the 20 physical cards in the box: only Amulet of Hope has more
 * than one copy (competitive play deals every player one at setup).
 */

/** A quest item card. */
export interface QuestItem {
  /** Stable, unique kebab-case id. */
  id: string;
  /** Display name. */
  name: string;
  /** The card's rules text. */
  effect: string;
  /** Where the item comes from ("Hakan's quest", "Bane of Omens foe", …). */
  note?: string;
  /**
   * How many copies exist. Only Amulet of Hope has more than one: competitive play deals
   * every player one at setup, so a four-player game needs four. The 17 entries here sum
   * to the 20 physical quest-item cards in the box.
   */
  count?: number;
}

export const QUEST_ITEMS: readonly QuestItem[] = [
  {
    id: 'amulet-of-annihilation',
    name: 'Amulet of Annihilation',
    effect: 'Spend to remove all foes from your space and all adjacent spaces.',
  },
  {
    id: 'amulet-of-hope',
    name: 'Amulet of Hope',
    effect:
      'After you Battle, you can gain a treasure from the market instead of gaining 2[S]. +1 Wild Advantage',
    note: 'Competitive play',
    count: 4,
  },
  {
    id: 'bezoar',
    name: 'Bezoar',
    effect: 'You cannot lose more than 5[W] from any Empress of Shades event.',
    note: 'Empress of Shades quest',
  },
  {
    id: 'dragon-scales',
    name: 'Dragon Scales',
    effect: '+2 Wild Advantages against level 4 foes',
    note: "Hakan's quest",
  },
  {
    id: 'fulminating-silver',
    name: 'Fulminating Silver',
    effect: 'Spend 1[S] to gain +1 Wild Advantage. You can do this once per battle.',
    note: "Hakan's quest",
  },
  {
    id: 'golden-wolf-pelt',
    name: 'Golden Wolf Pelt',
    effect: 'Prevent up to 6[W] losses per battle card.',
    note: "Grigor's quest",
  },
  {
    id: 'herbal-remedy',
    name: 'Herbal Remedy',
    effect: 'After you Reinforce, remove all your spore tokens.',
    note: 'Lingering Rot foe',
  },
  {
    id: 'horn-of-the-elements',
    name: 'Horn of the Elements',
    effect: 'Once per turn, you can move a foe or siege tree 1 space.',
    note: "Letha's quest",
  },
  {
    id: 'mark-of-the-outlaw',
    name: 'Mark of the Outlaw',
    effect: 'After you Reinforce at a village, gain 5 additional [W].',
    note: "Gleb's quest",
  },
  {
    id: 'orb-of-pure-snow',
    name: 'Orb of Pure Snow',
    effect: 'Prevent up to 1[S] loss per battle card.',
  },
  {
    id: 'relic-of-light',
    name: 'Relic of Light',
    effect: 'After you Cleanse, gain 1 additional [S].',
    note: "Vasa's quest",
  },
  {
    id: 'smugglers-coin',
    name: "Smuggler's Coin",
    effect:
      'After you Reinforce at a bazaar, move any number of treasures from the market to the bottom of the treasure deck, then refill the market.',
    note: "Zaida's quest",
  },
  {
    id: 'the-black-mark',
    name: 'The Black Mark',
    effect:
      'You cannot spend or lose this card for any reason. Spend 1[S] to give this card to another hero.',
    note: 'Bane of Omens foe',
  },
  {
    id: 'tomass-map',
    name: "Tomas's Map",
    effect: 'Spend to gain +5 Wild Advantages in a dungeon',
    note: "Tomas's quest",
  },
  {
    id: 'tools-of-the-saboteur',
    name: 'Tools of the Saboteur',
    effect: '+3 Wild Advantages against caravans',
    note: 'Miras quest',
  },
  {
    id: 'turquoise-urn',
    name: 'Turquoise Urn',
    effect: 'You can carry up to 2 extra treasures.',
    note: "Hakan's quest",
  },
  {
    id: 'wraps-of-invisibility',
    name: 'Wraps of Invisibility',
    effect: 'Prevent up to 3[W] losses per dungeon room.',
    note: "Yana's quest",
  },
];

/** QuestItem entries keyed by their stable `id`. */
export const QUEST_ITEMS_BY_ID: Readonly<Record<string, QuestItem>> = Object.freeze(
  QUEST_ITEMS.reduce<Record<string, QuestItem>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
