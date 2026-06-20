/**
 * udtFoes.ts — foe in-play status + foe/adversary identity metadata (static reference data).
 *
 * Consumed by `ultimatedarktowerboard` (re-exported, not vendored). This module is PURELY
 * additive: it does NOT touch the seed-parser foe enums (`Tier1Foe`/`Tier2Foe`/`Tier3Foe`/
 * `Adversary`) or the positionally-encoded `TIER1/2/3_FOES`/`ADVERSARIES` arrays — those stay
 * exactly as-is. Here we attach `level`/`tier`/`source` metadata keyed by the same foe names and
 * add the in-play `FoeStatus` progression the board package tracks.
 *
 * `FoeStatus` (panicked → unsteady → ready → savage → lethal) is the in-play power progression and
 * is DISTINCT from a foe's `level` (the number on its card: 2–4 for foes, 5 for adversaries), which
 * is identity. The five statuses match the official game's foe-status track (rules glossary): the app
 * can surface any of them, so consumers must model all five.
 */
import type { ContentSource } from './udtHeroes';
import type { Tier1Foe, Tier2Foe, Tier3Foe, Adversary } from '../seed/udtSeedParser';
/**
 * In-play power progression a foe advances through, ascending threat (the official game's
 * foe-status track). Distinct from identity `level`/`tier`.
 */
export type FoeStatus = 'panicked' | 'unsteady' | 'ready' | 'savage' | 'lethal';
/** The statuses in progression order, lowest → highest threat. */
export declare const FOE_STATUSES: readonly FoeStatus[];
/** A foe's identity level (the number on its card). Foes are 2–4; adversaries are 5. */
export type FoeLevel = 2 | 3 | 4 | 5;
/** Stable, unique foe identity id (kebab-case), e.g. `'shadow-wolves'`. */
export type FoeId = string;
/** Display name — the existing seed-parser foe/adversary unions (the source of truth for names). */
export type FoeName = Tier1Foe | Tier2Foe | Tier3Foe | Adversary;
export interface Foe {
    /** Stable, unique kebab-case identity id. */
    id: FoeId;
    /** Display name (matches the seed-parser union exactly). */
    name: FoeName;
    /** Whether this is a tiered foe or the apex (level-5) adversary. */
    kind: 'foe' | 'adversary';
    /** Identity level: 2/3/4 for foes, 5 for adversaries. */
    level: FoeLevel;
    /** Seed-encoding tier (1–3) for foes; omitted for adversaries (level 5). */
    tier?: 1 | 2 | 3;
    /** The product this foe ships in. Inferred `'base'` (no per-foe source data in UDT today). */
    source: ContentSource;
}
/** The 12 tiered foes (Tier 1→level 2, Tier 2→level 3, Tier 3→level 4). Names match the seed unions. */
export declare const FOES: readonly Foe[];
/** The 8 adversaries (the apex foe — level 5). `ADVERSARIES` (the name array) is the seed enum. */
export declare const ADVERSARY_ROSTER: readonly Foe[];
/** Foes and adversaries together (20 entries), levels 2–5. */
export declare const ALL_FOES: readonly Foe[];
/** Every foe/adversary keyed by its stable `id`. */
export declare const FOE_BY_ID: Readonly<Record<FoeId, Foe>>;
/** Every foe/adversary keyed by its display `name` (interop with the seed-parser unions). */
export declare const FOE_BY_NAME: Readonly<Record<FoeName, Foe>>;
