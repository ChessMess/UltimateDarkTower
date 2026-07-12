/**
 * udtMonuments.ts — the 8 Covenant monuments (static reference roster).
 *
 * Consumed by `ultimatedarktowerboard` (re-exported, not vendored). A monument replaces a
 * building on its space during a Covenant game, but WHICH building space a given monument
 * occupies is a runtime setup choice — NOT fixed data — so no monument→building mapping is
 * encoded here. This is just the roster; placement lives in board state at runtime.
 */
import type { ContentSource } from './udtHeroes';

/** Stable, unique monument id (kebab-case), e.g. `'argent-oak'`. */
export type MonumentId = string;

export interface Monument {
  /** Stable, unique kebab-case identity id. */
  id: MonumentId;
  /** Display name. */
  name: string;
  /** The product this monument ships in (always `'covenant'`). */
  source: ContentSource;
}

/** The 8 Covenant monuments (alphabetical by name). */
export const MONUMENTS: readonly Monument[] = [
  { id: 'arch-of-the-golden-sun', name: 'Arch of the Golden Sun', source: 'covenant' },
  { id: 'argent-oak', name: 'Argent Oak', source: 'covenant' },
  {
    id: 'cenotaph-of-the-first-prophet',
    name: 'Cenotaph of the First Prophet',
    source: 'covenant',
  },
  { id: 'colossus-of-bjorn', name: 'Colossus of Bjorn', source: 'covenant' },
  { id: 'endless-necropolis', name: 'Endless Necropolis', source: 'covenant' },
  { id: 'moonstone-temple', name: 'Moonstone Temple', source: 'covenant' },
  { id: 'nightmare-cage', name: 'Nightmare Cage', source: 'covenant' },
  { id: 'tower-shard', name: 'Tower Shard', source: 'covenant' },
];

/** Monuments keyed by their stable `id`. */
export const MONUMENT_BY_ID: Readonly<Record<MonumentId, Monument>> = Object.freeze(
  MONUMENTS.reduce<Record<MonumentId, Monument>>((acc, monument) => {
    acc[monument.id] = monument;
    return acc;
  }, {}),
);
