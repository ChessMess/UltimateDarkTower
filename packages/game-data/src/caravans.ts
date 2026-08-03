/**
 * caravans.ts — the caravan room pools for the three caravans of the Miras quest.
 *
 * As with dungeons these are pools, not layouts: rooms are drawn at random and can repeat
 * within a run. The pools here are KNOWN INCOMPLETE — see `docs/open-questions.md`.
 */

/** Which of the three caravans a room belongs to; `'all'` = shared by every caravan. */
export type CaravanRoute = 'east' | 'north' | 'west' | 'all';

/**
 * A caravan room card. Caravans are the moving 'dungeons' of the Miras quest.
 *
 * As with dungeons, rooms are drawn at random and can repeat, so these are pools rather
 * than layouts. The three caravans that were mapped before the source author realised
 * layouts are generated ran 11–13 rooms long; the unique-room pools below are known to be
 * incomplete.
 */
export interface CaravanRoom {
  /** Stable, unique kebab-case id, prefixed by route (e.g. `'east-ironsides'`). */
  id: string;
  /** Display name as printed. */
  name: string;
  /** Which caravan this room appears in. */
  route: CaravanRoute;
  /** `'entrance'`/`'finale'` are the shared framing cards; `'room'` is an encounter. */
  kind: 'entrance' | 'room' | 'finale';
  /** Rules text in the room's initial (un-upgraded) state. */
  initial: string;
  /** Rules text once the room is upgraded. */
  upgraded?: string;
  /** Set where the source row is incomplete — see the `sourceNote` for why. */
  needsReview?: boolean;
  /** Why this row is incomplete or uncertain. */
  sourceNote?: string;
}

export const CARAVAN_ROOMS: readonly CaravanRoom[] = [
  {
    id: 'east-cavaliers',
    name: 'Cavaliers',
    route: 'east',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'east-cavalry',
    name: 'Cavalry',
    route: 'east',
    kind: 'room',
    initial: 'Lose 1 gear and 1 potion.',
    upgraded: 'No losses.',
  },
  {
    id: 'east-dragoons',
    name: 'Dragoons',
    route: 'east',
    kind: 'room',
    initial: 'Lose 1 spirit.',
    upgraded: 'No losses.',
  },
  {
    id: 'east-hussars',
    name: 'Hussars',
    route: 'east',
    kind: 'room',
    initial: 'Lose 6 warriors and 1 spirit.',
    upgraded: 'If you do not have trusted maps, lose 6 warriors.',
  },
  {
    id: 'east-ironsides',
    name: 'Ironsides',
    route: 'east',
    kind: 'room',
    initial: 'Lose half your warriors (rounded down).',
    upgraded: 'No losses.',
  },
  {
    id: 'east-lancers',
    name: 'Lancers',
    route: 'east',
    kind: 'room',
    initial: 'Lose 2 gear.',
    upgraded: 'No losses.',
  },
  {
    id: 'east-mounted-scouts',
    name: 'Mounted Scouts',
    route: 'east',
    kind: 'room',
    initial: 'Lose 4 warriors for each skull on or adjacent to your space.',
    upgraded: 'No losses.',
  },
  {
    id: 'east-skirmisher-squad',
    name: 'Skirmisher Squad',
    route: 'east',
    kind: 'room',
    initial: 'Lose 6 warriors and 1 item.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'east-spearmen',
    name: 'Spearmen',
    route: 'east',
    kind: 'room',
    initial: 'Lose 8 warriors and 1 gear.',
    upgraded: 'No losses.',
  },
  {
    id: 'east-war-horses',
    name: 'War Horses',
    route: 'east',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'You may gain 1 trusted maps gear card.',
  },
  {
    id: 'east-heavy-lancers',
    name: 'Heavy Lancers',
    route: 'east',
    kind: 'room',
    initial: 'Lose 6 warriors for each gear you have.',
    upgraded: 'No losses.',
    needsReview: true,
    sourceNote: 'Caravan route not recorded when this room was observed; East is a guess.',
  },
  {
    id: 'north-artillery-carriage',
    name: 'Artillery Carriage',
    route: 'north',
    kind: 'room',
    initial: 'Each hero in your kingdom loses 4 warriors.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'north-bomb-cart',
    name: 'Bomb Cart',
    route: 'north',
    kind: 'room',
    initial: 'If you have more than 10 warriors, lose 10 warriors.',
    upgraded: 'Lose 1 warrior.',
  },
  {
    id: 'north-cannon-wagon',
    name: 'Cannon Wagon',
    route: 'north',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'north-carabiner',
    name: 'Carabiner',
    route: 'north',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'If you do not have leather armor, lose 4 warriors.',
  },
  {
    id: 'north-fusilier-transport',
    name: 'Fusilier Transport',
    route: 'north',
    kind: 'room',
    initial: 'Lose 1 gear.',
    upgraded: 'No losses.',
  },
  {
    id: 'north-ghostly-dreadnaught',
    name: 'Ghostly Dreadnaught',
    route: 'north',
    kind: 'room',
    initial: 'Lose 5 warriors and 2 spirit.',
    upgraded: 'No losses.',
  },
  {
    id: 'north-haunted-musketeers',
    name: 'Haunted Musketeers',
    route: 'north',
    kind: 'room',
    initial: 'Lose 3 warriors and 1 spirit.',
    upgraded: 'Lose 1 spirit.',
  },
  {
    id: 'north-rest-site',
    name: 'Rest Site',
    route: 'north',
    kind: 'room',
    initial: 'Lose 1 spirit.',
    upgraded: 'Gain 4 warriors.',
  },
  {
    id: 'north-undead-swordsmen',
    name: 'Undead Swordsmen',
    route: 'north',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Lose 3 warriors.',
  },
  {
    id: 'west-centaur-spearmen',
    name: 'Centaur Spearmen',
    route: 'west',
    kind: 'room',
    initial: 'Lose 6 warriors and add a skull to the village of your current kingdom.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'west-enchanted-archers',
    name: 'Enchanted Archers',
    route: 'west',
    kind: 'room',
    initial: 'If you do not have a potion, lose 12 warriors.',
    upgraded: 'Gain 1 potion.',
  },
  {
    id: 'west-fiery-janissary',
    name: 'Fiery Janissary',
    route: 'west',
    kind: 'room',
    initial: 'Add 2 skulls to the citadel in your current kingdom.',
    upgraded: 'No losses.',
  },
  {
    id: 'west-fount-of-magic',
    name: 'Fount of Magic',
    route: 'west',
    kind: 'room',
    initial: 'Gain 1 spirit.',
    upgraded: 'Gain 2 spirit.',
  },
  {
    id: 'west-frozen-swordsmen',
    name: 'Frozen Swordsmen',
    route: 'west',
    kind: 'room',
    initial: 'Lose 2 spirit.',
    upgraded: 'No losses.',
  },
  {
    id: 'west-goblin-mercenaries',
    name: 'Goblin Mercenaries',
    route: 'west',
    kind: 'room',
    initial: 'Add a skull to 4 buildings in your current kingdom.',
    upgraded: 'No losses.',
  },
  {
    id: 'west-lizardmen',
    name: 'Lizardmen',
    route: 'west',
    kind: 'room',
    initial: 'Lose 12 warriors.',
    upgraded: 'No losses.',
  },
  {
    id: 'west-mechanized-men',
    name: 'Mechanized Men',
    route: 'west',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'You may gain 1 longswords gear card.',
  },
  {
    id: 'west-sorcerous-artillery',
    name: 'Sorcerous Artillery',
    route: 'west',
    kind: 'room',
    initial: 'Add 1 skull to each building on or adjacent to this space.',
    upgraded: 'No losses.',
  },
  {
    id: 'all-entrance',
    name: 'Entrance',
    route: 'all',
    kind: 'entrance',
    initial:
      'The chamber is musty and slate, a layer of dust confirms no one has set foot here in ages.',
  },
  {
    id: 'all-the-evil-relic',
    name: 'The Evil Relic',
    route: 'all',
    kind: 'finale',
    initial: 'You destroy the evil relic and the caravan disbands.',
  },
  {
    id: 'north-armament-wagon',
    name: 'Armament Wagon',
    route: 'north',
    kind: 'room',
    initial: '',
    upgraded: 'You may gain 1 gear.',
    needsReview: true,
    sourceNote:
      'Only observed with the companion Berat recruited, who auto-upgrades rooms; the initial face has not been seen.',
  },
];

/** CaravanRoom entries keyed by their stable `id`. */
export const CARAVAN_ROOMS_BY_ID: Readonly<Record<string, CaravanRoom>> = Object.freeze(
  CARAVAN_ROOMS.reduce<Record<string, CaravanRoom>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
