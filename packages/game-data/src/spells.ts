/**
 * spells.ts — the 6 spells and 4 invocations. Complete set, all Reverent Astromancer only.
 */

/**
 * A spell or invocation card. These belong solely to the Reverent Astromancer: she
 * prepares spells each month, and unlocks invocations with her Exalted virtue.
 */
export interface Spell {
  /** Stable, unique kebab-case id. */
  id: string;
  /** Display name. */
  name: string;
  /** Spells are prepared normally; invocations need the Exalted virtue. */
  kind: 'spell' | 'invocation';
  /** The card's rules text. */
  effect: string;
}

export const SPELLS: readonly Spell[] = [
  {
    id: 'soothing-word',
    name: 'Soothing Word',
    kind: 'spell',
    effect: 'One hero on your space replaces a corruption with a new one.',
  },
  {
    id: 'ritual-of-warding',
    name: 'Ritual of Warding',
    kind: 'spell',
    effect: 'Place a protection token on your space.',
  },
  {
    id: 'bestow-blessing',
    name: 'Bestow Blessing',
    kind: 'spell',
    effect: 'One hero gains a blessing.',
  },
  {
    id: 'bounty-of-the-gods',
    name: 'Bounty of the Gods',
    kind: 'spell',
    effect:
      'Look at 3 random quest items. Gain 1. At the end of your turn, return it to the quest items deck.',
  },
  {
    id: 'aura-of-friendship',
    name: 'Aura of Friendship',
    kind: 'spell',
    effect: 'When you Reinforce at a building this turn, you can treat it as any building.',
  },
  {
    id: 'winds-of-change',
    name: 'Winds of Change',
    kind: 'spell',
    effect:
      'Put any number of treasures from the market on the bottom of the treasure deck. Then, refill the market.',
  },
  {
    id: 'smite-the-wicked',
    name: 'Smite the Wicked',
    kind: 'invocation',
    effect: 'Remove a savage or lethal foe.',
  },
  {
    id: 'celestial-jaunt',
    name: 'Celestial Jaunt',
    kind: 'invocation',
    effect: 'Place your hero on any space with a quest marker.',
  },
  {
    id: 'abate-the-darkness',
    name: 'Abate the Darkness',
    kind: 'invocation',
    effect:
      'Remove a seal from the Tower. Return any skulls that emerge to the supply. Replace the seal.',
  },
  {
    id: 'commanding-rebuke',
    name: 'Commanding Rebuke',
    kind: 'invocation',
    effect: 'Place a foe that is on your space on any other space.',
  },
];

/** Spell entries keyed by their stable `id`. */
export const SPELLS_BY_ID: Readonly<Record<string, Spell>> = Object.freeze(
  SPELLS.reduce<Record<string, Spell>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
