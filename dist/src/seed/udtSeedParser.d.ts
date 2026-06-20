/**
 * udtSeedParser.ts — Encode and decode Return to Dark Tower game seeds.
 *
 * Seeds are 12-character base-34 strings formatted as XXXX-XXXX-XXXX.
 * The alphabet uses 34 characters (excludes '0' and 'o' — visually identical in the game font).
 *
 * Structure:
 *   chars 0–5:  Setup section — bitwise-encoded game configuration
 *   chars 6–11: RNG seed section — base-34 little-endian polynomial
 *
 * Ported from the official C# SeedParser implementation.
 */
export type Tier1Foe = 'Brigands' | 'Oreks' | 'Shadow Wolves' | 'Spine Fiends';
export type Tier2Foe = 'Frost Trolls' | 'Clan of Neuri' | 'Lemures' | 'Widowmade Spiders';
export type Tier3Foe = 'Dragons' | 'Mormos' | 'Striga' | 'Titans';
export type Adversary = 'Ashstrider' | 'Bane of Omens' | 'Empress of Shades' | 'Gaze Eternal' | 'Gravemaw' | 'Isa the Exile' | 'Lingering Rot' | "Utuk'Ku";
export type Ally = 'Gleb' | 'Grigor' | 'Hakan' | 'Letha' | 'Miras' | 'Nimet' | 'Tomas' | 'Vasa' | 'Yana' | 'Zaida';
export type Difficulty = 'Heroic' | 'Gritty';
export type GameSource = 'Core' | 'Competitive';
export type ExpansionType = 'Alliances' | 'Monuments';
export type Confidence = 'confirmed' | 'suspected' | 'unknown';
export declare const TIER1_FOES: readonly Tier1Foe[];
export declare const TIER2_FOES: readonly Tier2Foe[];
export declare const TIER3_FOES: readonly Tier3Foe[];
export declare const ADVERSARIES: readonly Adversary[];
export declare const ALLIES: readonly Ally[];
export declare const DIFFICULTIES: readonly Difficulty[];
export declare const GAME_SOURCES: readonly GameSource[];
export interface SeedBank {
    initializationSeed: number;
    questSeed: number;
    seedString: string;
}
export interface DecodedSeed {
    /** Normalized seed string (XXXX-XXXX-XXXX, uppercase). */
    seed: string;
    tier1Foe: Tier1Foe;
    tier2Foe: Tier2Foe;
    tier3Foe: Tier3Foe;
    adversary: Adversary;
    ally: Ally;
    difficulty: Difficulty;
    source: GameSource;
    expansions: ExpansionType[];
    /** Player count (1–4). */
    playerCount: number;
    /** RNG seed integer (base-34 polynomial from chars 6–11). */
    rngSeed: number;
    seedBank: SeedBank;
    /** Raw setup character values [0–5] for inspection. */
    setup: number[];
}
export interface SeedConfig {
    source: GameSource;
    playerCount: number;
    adversary: Adversary;
    ally: Ally;
    difficulty: Difficulty;
    foes: [Tier1Foe, Tier2Foe, Tier3Foe];
    expansions: ExpansionType[];
}
export interface CharDiff {
    charIndex: number;
    value1: number;
    value2: number;
    char1: string;
    char2: string;
}
export interface SeedComparison {
    seed1: string;
    seed2: string;
    diffs: CharDiff[];
    setupDiffs: CharDiff[];
    rngDiffs: CharDiff[];
}
export interface CharInfo {
    index: number;
    char: string;
    value: number;
    section: 'setup' | 'rng';
    field?: string;
}
export interface CharDump {
    seed: string;
    chars: CharInfo[];
}
export declare function charToValue(c: string): number;
export declare function valueToChar(v: number): string;
/**
 * Normalize and validate a seed string.
 * Accepts with or without dashes, case-insensitive.
 * Returns the normalized XXXX-XXXX-XXXX form (uppercase).
 */
export declare function validateSeed(seed: string): string;
/**
 * Decode a seed string into its component fields.
 * Matches the C# ConvertSeedToGame implementation exactly.
 */
export declare function decodeSeed(seed: string): DecodedSeed;
/**
 * Extract just the RNG seed integer from a seed string.
 */
export declare function decodeRngSeed(seed: string): number;
/**
 * Encode a game configuration into a seed string.
 * Matches the C# CreateSeed implementation.
 * The RNG portion (chars 6–11) is randomly generated.
 */
export declare function createSeed(config: SeedConfig): {
    seed: string;
    rngValue: number;
};
/**
 * Encode a game configuration with a specific RNG value (deterministic).
 */
export declare function encodeSeed(config: SeedConfig, rngValue: number): string;
/**
 * Compare two seeds at the character level.
 */
export declare function compareSeedsRaw(seed1: string, seed2: string): SeedComparison;
/**
 * Dump all characters of a seed with section and field labels.
 */
export declare function dumpSeedChars(seed: string): CharDump;
