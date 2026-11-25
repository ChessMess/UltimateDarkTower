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

/**
 * Expeditions alternate virtues — a general pool, not tied to any hero.
 * Source: the "Return to Dark Tower – Hero Virtues and Champions" reference sheet (a
 * transcription, not card photos — see `docs/open-questions.md`).
 */
export const ALTERNATE_VIRTUES: readonly Virtue[] = [
  {
    name: 'Ambitious',
    ability: "After you take your Banner action, you can take another player's Banner action.",
  },
  { name: 'Brash', ability: 'Ignore the Cancel face of the haggle die.' },
  { name: 'Charismatic', ability: 'After you Reinforce, gain 4 warriors.' },
  {
    name: 'Charming',
    ability:
      'When you gain warriors from a battle card, dungeon room, or event, gain 8 additional warriors.',
  },
  {
    name: 'Connected',
    ability: '+2 Wild Advantages when you Quest on or adjacent to a building space.',
  },
  { name: 'Ebullient', ability: 'At the end of each month, remove up to 4 skulls from the board.' },
  { name: 'Elusive', ability: 'Foes do not move during strike events on your turn.' },
  {
    name: 'Indomitable',
    ability: 'You do not lose warriors or spirit from the strike events of Level 2 and 3 foes.',
  },
  { name: 'Ironwilled', ability: 'When you lose spirit, lose 2 less.' },
  { name: 'Militant', ability: 'After you Battle, gain 6 warriors and 1 spirit.' },
  { name: 'Nimble', ability: 'After you Battle, move your hero up to 5 spaces.' },
  {
    name: 'Prosperous',
    ability:
      'You can carry 3 additional treasures. When you unlock this virtue, gain the top 2 cards of the treasure deck.',
  },
  { name: 'Resilient', ability: 'When you gain a corruption, gain 4 spirit.' },
  {
    name: 'Untethered',
    ability:
      'If you have not moved this turn, you can Battle a foe anywhere in your current kingdom. (Terrain advantages use the space you are on.)',
  },
  { name: 'Venerated', ability: '+2 Wild Advantages on a building space with no skulls.' },
  {
    name: 'Versatile',
    ability: 'After you Reinforce to gain the enhanced effect, also gain the free effect.',
  },
];

/**
 * Expeditions alternate champions — replacements for the kingdom virtues above. Same
 * provenance and transcription caveat as `ALTERNATE_VIRTUES`.
 */
export const ALTERNATE_CHAMPIONS: readonly Virtue[] = [
  { name: 'Beloved Champion', ability: '+2 Wild Advantages on or adjacent to a village.' },
  { name: 'Champion of Highlands', ability: '+1 Wild Advantage in hills and mountains.' },
  { name: 'Champion of Lowlands', ability: '+1 Wild Advantage in deserts and forests.' },
  { name: 'Champion of Outlands', ability: '+2 Wild Advantages in the outer ring.' },
  { name: 'Champion of Waterways', ability: '+1 Wild Advantage adjacent to a river.' },
  { name: 'Mercenary Champion', ability: '+2 Wild Advantages on or adjacent to a bazaar.' },
  { name: 'Righteous Champion', ability: '+2 Wild Advantages on or adjacent to a sanctuary.' },
  { name: 'Royal Champion', ability: '+2 Wild Advantages on or adjacent to a citadel.' },
];
