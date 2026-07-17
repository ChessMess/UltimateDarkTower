/**
 * heroes.ts — the Return to Dark Tower hero roster (static reference data).
 *
 * Consumed by `ultimatedarktowerboard` (re-exported, not vendored). Heroes are NOT
 * seed-encoded — this is identity/source metadata only. 14 heroes: 4 base, 2 Alliances,
 * 4 Covenant, 4 Expeditions (Expeditions is unreleased; its heroes are publicly confirmed
 * but provisional until the box ships).
 */

/**
 * Which product a roster entry ships in (base game + expansions). Distinct from the seed
 * parser's `ExpansionType` (which only encodes the Alliances/Monuments expansion bits) and
 * from `GameSource` (Core vs Competitive play).
 */
export type ContentSource = 'base' | 'alliances' | 'covenant' | 'expeditions';

/** Stable, unique hero identity id (kebab-case), e.g. `'archwright'`. */
export type HeroId = string;

export interface Hero {
  /** Stable, unique kebab-case identity id. */
  id: HeroId;
  /** Display name. */
  name: string;
  /** The product this hero ships in. */
  source: ContentSource;
  /** Optional fixed start location name, if the hero has one (none recorded yet). */
  startLocation?: string;
}

/** All 14 heroes, grouped by source (base → alliances → covenant → expeditions). */
export const HEROES: readonly Hero[] = [
  // Base (4)
  { id: 'brutal-warlord', name: 'Brutal Warlord', source: 'base' },
  { id: 'orphaned-scion', name: 'Orphaned Scion', source: 'base' },
  { id: 'relic-hunter', name: 'Relic Hunter', source: 'base' },
  { id: 'spymaster', name: 'Spymaster', source: 'base' },
  // Alliances (2)
  { id: 'archwright', name: 'Archwright', source: 'alliances' },
  { id: 'haunted-recluse', name: 'Haunted Recluse', source: 'alliances' },
  // Covenant (4)
  { id: 'devious-swindler', name: 'Devious Swindler', source: 'covenant' },
  { id: 'relentless-warden', name: 'Relentless Warden', source: 'covenant' },
  { id: 'reverent-astromancer', name: 'Reverent Astromancer', source: 'covenant' },
  { id: 'undaunted-aegis', name: 'Undaunted Aegis', source: 'covenant' },
  // Expeditions (4, unreleased — provisional)
  { id: 'jocular-druid', name: 'Jocular Druid', source: 'expeditions' },
  { id: 'grizzled-mariner', name: 'Grizzled Mariner', source: 'expeditions' },
  { id: 'clever-tinkerer', name: 'Clever Tinkerer', source: 'expeditions' },
  { id: 'enlightened-ascetic', name: 'Enlightened Ascetic', source: 'expeditions' },
];

/** Heroes keyed by their stable `id`. */
export const HERO_BY_ID: Readonly<Record<HeroId, Hero>> = Object.freeze(
  HEROES.reduce<Record<HeroId, Hero>>((acc, hero) => {
    acc[hero.id] = hero;
    return acc;
  }, {}),
);
