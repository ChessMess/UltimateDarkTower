/**
 * udtHeroes.ts — the Return to Dark Tower hero roster (static reference data).
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
export declare const HEROES: readonly Hero[];
/** Heroes keyed by their stable `id`. */
export declare const HERO_BY_ID: Readonly<Record<HeroId, Hero>>;
