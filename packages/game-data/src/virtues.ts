/**
 * virtues.ts — virtue tiles.
 *
 * `Virtue` is shared: heroes carry their own default/unlockable virtues (see `heroes.ts`),
 * and every hero also takes the kingdom virtue for their seating kingdom at setup. The
 * kingdom ones are NOT hero-specific, which is why they live here rather than on the roster.
 *
 * This file is what remains of the old `gameContent` namespace. That namespace existed only
 * to dodge name collisions with the flat rosters (`Hero`, `HEROES`, `Foe`, `FOES`,
 * `Adversary`) — and every dataset causing a collision was a poorer duplicate of a flat one,
 * so v3 removed them all. Nothing left here collides, so it is exported flat.
 */

/** A virtue tile: its name and rules text. */
export interface Virtue {
  readonly name: string;
  readonly ability: string;
}

/**
 * Kingdom virtues, keyed by kingdom direction. A hero takes the one for their home/seating
 * kingdom at setup — these are not hero-specific.
 */
export const KINGDOM_VIRTUES = {
  East: { name: 'Champion of the East', ability: '+2 Wild Advantages in hills.' },
  North: { name: 'Champion of the North', ability: '+2 Wild Advantages in mountains.' },
  South: { name: 'Champion of the South', ability: '+2 Wild Advantages in deserts.' },
  West: { name: 'Champion of the West', ability: '+2 Wild Advantages in forests.' },
} as const satisfies Record<string, Virtue>;

export type KingdomDirection = keyof typeof KINGDOM_VIRTUES;

/** Kingdom virtues as a list, for iteration. */
export const kingdomVirtues: readonly Virtue[] = Object.values(KINGDOM_VIRTUES);
