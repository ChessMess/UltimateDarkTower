/**
 * advantages.ts — the seven advantage keywords (static reference data).
 *
 * Cross-cutting vocabulary: foes carry them as traits, treasures and gear grant them, and
 * a dungeon restricts you to spending exactly one type inside it (`DUNGEON_ADVANTAGE` in
 * `dungeons.ts`). It belongs to no single one of those modules, hence its own file.
 */

/**
 * An advantage keyword. `Melee`/`Magic`/`Stealth` are attack types,
 * `Beast`/`Humanoid`/`Undead` are creature types, and `Wild` matches anything.
 * A foe normally carries one of each pair as its traits.
 */
export type AdvantageType =
  'Melee' | 'Magic' | 'Stealth' | 'Beast' | 'Humanoid' | 'Undead' | 'Wild';

/** All seven advantage types: the three attack types, the three creature types, then `Wild`. */
export const ADVANTAGE_TYPES: readonly AdvantageType[] = [
  'Melee',
  'Magic',
  'Stealth',
  'Beast',
  'Humanoid',
  'Undead',
  'Wild',
];
