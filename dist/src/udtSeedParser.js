"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_SOURCES = exports.DIFFICULTIES = exports.ALLIES = exports.ADVERSARIES = exports.TIER3_FOES = exports.TIER2_FOES = exports.TIER1_FOES = void 0;
exports.charToValue = charToValue;
exports.valueToChar = valueToChar;
exports.validateSeed = validateSeed;
exports.decodeSeed = decodeSeed;
exports.decodeRngSeed = decodeRngSeed;
exports.createSeed = createSeed;
exports.encodeSeed = encodeSeed;
exports.compareSeedsRaw = compareSeedsRaw;
exports.dumpSeedChars = dumpSeedChars;
// ── Base-34 Alphabet ───────────────────────────────────────────────────────
const ALPHABET = 'a123456789bcdefghijklmnpqrstuvwxyz';
const BASE = 34;
const SETUP_LENGTH = 6;
const RNG_SEED_LENGTH = 6;
const SEED_LENGTH = SETUP_LENGTH + RNG_SEED_LENGTH; // 12
// Build lookup maps
const CHAR_TO_VALUE = new Map();
const VALUE_TO_CHAR = new Map();
for (let i = 0; i < ALPHABET.length; i++) {
    CHAR_TO_VALUE.set(ALPHABET[i], i);
    VALUE_TO_CHAR.set(i, ALPHABET[i]);
}
// ── Lookup Arrays (index = encoded value) ──────────────────────────────────
exports.TIER1_FOES = ['Brigands', 'Oreks', 'Shadow Wolves', 'Spine Fiends'];
exports.TIER2_FOES = ['Frost Trolls', 'Clan of Neuri', 'Lemures', 'Widowmade Spiders'];
exports.TIER3_FOES = ['Dragons', 'Mormos', 'Striga', 'Titans'];
exports.ADVERSARIES = [
    'Ashstrider',
    'Bane of Omens',
    'Empress of Shades',
    'Gaze Eternal',
    'Gravemaw',
    'Isa the Exile',
    'Lingering Rot',
    "Utuk'Ku",
];
exports.ALLIES = [
    'Gleb', 'Grigor', 'Hakan', 'Letha', 'Miras',
    'Nimet', 'Tomas', 'Vasa', 'Yana', 'Zaida',
];
exports.DIFFICULTIES = ['Heroic', 'Gritty'];
exports.GAME_SOURCES = ['Core', 'Competitive'];
// ── Character Conversion ───────────────────────────────────────────────────
function charToValue(c) {
    const v = CHAR_TO_VALUE.get(c.toLowerCase());
    if (v === undefined) {
        throw new Error(`Invalid seed character: '${c}'`);
    }
    return v;
}
function valueToChar(v) {
    const c = VALUE_TO_CHAR.get(v);
    if (c === undefined) {
        throw new Error(`Invalid seed value: ${v} (must be 0–${BASE - 1})`);
    }
    return c;
}
// ── Seed Validation ────────────────────────────────────────────────────────
/**
 * Normalize and validate a seed string.
 * Accepts with or without dashes, case-insensitive.
 * Returns the normalized XXXX-XXXX-XXXX form (uppercase).
 */
function validateSeed(seed) {
    const stripped = seed.replace(/[-\s]/g, '').toLowerCase();
    if (stripped.length !== SEED_LENGTH) {
        throw new Error(`Invalid seed length: expected ${SEED_LENGTH} characters, got ${stripped.length}`);
    }
    for (const c of stripped) {
        if (!CHAR_TO_VALUE.has(c)) {
            throw new Error(`Invalid seed character: '${c}'`);
        }
    }
    const upper = stripped.toUpperCase();
    return `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8, 12)}`;
}
// ── Seed Decoding ──────────────────────────────────────────────────────────
/**
 * Decode a seed string into its component fields.
 * Matches the C# ConvertSeedToGame implementation exactly.
 */
function decodeSeed(seed) {
    const normalized = validateSeed(seed);
    const stripped = normalized.replace(/-/g, '').toLowerCase();
    // Decode setup section (chars 0–5)
    const setup = [];
    for (let i = 0; i < SETUP_LENGTH; i++) {
        setup.push(charToValue(stripped[i]));
    }
    // Decode RNG section (chars 6–11) — base-34 little-endian polynomial
    let rngSeed = 0;
    for (let i = 0; i < RNG_SEED_LENGTH; i++) {
        const value = charToValue(stripped[SETUP_LENGTH + i]);
        rngSeed += value * Math.round(Math.pow(BASE, i));
    }
    // setup[0] = foeByteA: bits 0–1 = Tier 1, bits 2–3 = Tier 2, bit 4 = Tier 3 low bit
    const foeByteA = setup[0];
    const tier1 = foeByteA & 0b00011;
    const tier2 = (foeByteA & 0b01100) >> 2;
    // setup[1] = foeByteB: bits 0–3 = Adversary, bit 4 = Tier 3 high bit
    const foeByteB = setup[1];
    const tier3 = ((foeByteA & 0b10000) >> 4) | ((foeByteB & 0b10000) >> 3);
    const adversaryIndex = foeByteB & 0b01111;
    // setup[2] = allyByte
    const allyIndex = setup[2];
    // setup[3] = extraByte: bit 0 = Difficulty, bits 1–2 = Expansions, bit 3 = Source
    const extra = setup[3];
    const difficultyIndex = extra & 0b00001;
    const expansionBits = (extra & 0b00110) >> 1;
    const sourceBits = (extra & 0b01000) >> 2; // intentionally >> 2, not >> 3 (matches C#)
    // setup[4] = versionByte (always 0, reserved)
    // setup[5] = ancillaryByte: bits 0–1 = Player count
    const playerCount = (setup[5] & 0b00011) + 1;
    // Decode expansions
    const expansions = [];
    if (expansionBits & 0b01)
        expansions.push('Monuments');
    if (expansionBits & 0b10)
        expansions.push('Alliances');
    // Decode source — C# switch: 0b00 = Core, 0b10 = Competitive
    let source;
    switch (sourceBits) {
        case 0b10:
            source = 'Competitive';
            break;
        default:
            source = 'Core';
            break;
    }
    const seedBank = {
        initializationSeed: rngSeed,
        questSeed: rngSeed - 1,
        seedString: normalized,
    };
    return {
        seed: normalized,
        tier1Foe: exports.TIER1_FOES[tier1],
        tier2Foe: exports.TIER2_FOES[tier2],
        tier3Foe: exports.TIER3_FOES[tier3],
        adversary: exports.ADVERSARIES[adversaryIndex],
        ally: exports.ALLIES[allyIndex],
        difficulty: exports.DIFFICULTIES[difficultyIndex],
        source,
        expansions,
        playerCount,
        rngSeed,
        seedBank,
        setup,
    };
}
/**
 * Extract just the RNG seed integer from a seed string.
 */
function decodeRngSeed(seed) {
    const normalized = validateSeed(seed);
    const stripped = normalized.replace(/-/g, '').toLowerCase();
    let rngSeed = 0;
    for (let i = 0; i < RNG_SEED_LENGTH; i++) {
        const value = charToValue(stripped[SETUP_LENGTH + i]);
        rngSeed += value * Math.round(Math.pow(BASE, i));
    }
    return rngSeed;
}
// ── Seed Encoding ──────────────────────────────────────────────────────────
/**
 * Encode a game configuration into a seed string.
 * Matches the C# CreateSeed implementation.
 * The RNG portion (chars 6–11) is randomly generated.
 */
function createSeed(config) {
    // Encode foes into foeByteA and foeByteB
    let foeByteA = 0;
    let foeByteB = 0;
    const tier1Index = exports.TIER1_FOES.indexOf(config.foes[0]);
    const tier2Index = exports.TIER2_FOES.indexOf(config.foes[1]);
    const tier3Index = exports.TIER3_FOES.indexOf(config.foes[2]);
    if (tier1Index < 0)
        throw new Error(`Invalid Tier 1 foe: ${config.foes[0]}`);
    if (tier2Index < 0)
        throw new Error(`Invalid Tier 2 foe: ${config.foes[1]}`);
    if (tier3Index < 0)
        throw new Error(`Invalid Tier 3 foe: ${config.foes[2]}`);
    foeByteA = tier1Index & 0b00011;
    foeByteA |= (tier2Index & 0b00011) << 2;
    // Tier 3 split: low bit → foeByteA bit 4, high bit → foeByteB bit 4
    foeByteA |= (tier3Index & 0b01) << 4;
    foeByteB |= ((tier3Index >> 1) & 0b01) << 4;
    // Encode adversary into foeByteB bits 0–3
    const adversaryIndex = exports.ADVERSARIES.indexOf(config.adversary);
    if (adversaryIndex < 0)
        throw new Error(`Invalid adversary: ${config.adversary}`);
    foeByteB |= adversaryIndex & 0b01111;
    // Encode ally
    const allyIndex = exports.ALLIES.indexOf(config.ally);
    if (allyIndex < 0)
        throw new Error(`Invalid ally: ${config.ally}`);
    // Encode extra byte: bit 0 = difficulty, bits 1–2 = expansions, bit 3 = source
    let extraByte = 0;
    if (config.difficulty === 'Gritty')
        extraByte |= 0b00001;
    for (const expansion of config.expansions) {
        switch (expansion) {
            case 'Monuments':
                extraByte |= 0b00010;
                break;
            case 'Alliances':
                extraByte |= 0b00100;
                break;
        }
    }
    if (config.source === 'Competitive')
        extraByte |= 0b01000;
    // Version byte (always 0)
    const versionByte = 0;
    // Player count
    const playerCountByte = Math.max(0, Math.min(3, config.playerCount - 1));
    // Build setup string
    let seedStr = valueToChar(foeByteA) +
        valueToChar(foeByteB) +
        valueToChar(allyIndex) +
        valueToChar(extraByte) +
        valueToChar(versionByte) +
        valueToChar(playerCountByte);
    // Generate random RNG portion
    let rngValue = 0;
    for (let i = 0; i < RNG_SEED_LENGTH; i++) {
        const value = Math.floor(Math.random() * BASE);
        seedStr += valueToChar(value);
        rngValue += value * Math.round(Math.pow(BASE, i));
    }
    const upper = seedStr.toUpperCase();
    const formatted = `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8, 12)}`;
    return { seed: formatted, rngValue };
}
/**
 * Encode a game configuration with a specific RNG value (deterministic).
 */
function encodeSeed(config, rngValue) {
    // Encode setup portion (same as createSeed)
    let foeByteA = 0;
    let foeByteB = 0;
    const tier1Index = exports.TIER1_FOES.indexOf(config.foes[0]);
    const tier2Index = exports.TIER2_FOES.indexOf(config.foes[1]);
    const tier3Index = exports.TIER3_FOES.indexOf(config.foes[2]);
    if (tier1Index < 0)
        throw new Error(`Invalid Tier 1 foe: ${config.foes[0]}`);
    if (tier2Index < 0)
        throw new Error(`Invalid Tier 2 foe: ${config.foes[1]}`);
    if (tier3Index < 0)
        throw new Error(`Invalid Tier 3 foe: ${config.foes[2]}`);
    foeByteA = tier1Index & 0b00011;
    foeByteA |= (tier2Index & 0b00011) << 2;
    foeByteA |= (tier3Index & 0b01) << 4;
    foeByteB |= ((tier3Index >> 1) & 0b01) << 4;
    const adversaryIndex = exports.ADVERSARIES.indexOf(config.adversary);
    if (adversaryIndex < 0)
        throw new Error(`Invalid adversary: ${config.adversary}`);
    foeByteB |= adversaryIndex & 0b01111;
    const allyIndex = exports.ALLIES.indexOf(config.ally);
    if (allyIndex < 0)
        throw new Error(`Invalid ally: ${config.ally}`);
    let extraByte = 0;
    if (config.difficulty === 'Gritty')
        extraByte |= 0b00001;
    for (const expansion of config.expansions) {
        switch (expansion) {
            case 'Monuments':
                extraByte |= 0b00010;
                break;
            case 'Alliances':
                extraByte |= 0b00100;
                break;
        }
    }
    if (config.source === 'Competitive')
        extraByte |= 0b01000;
    const versionByte = 0;
    const playerCountByte = Math.max(0, Math.min(3, config.playerCount - 1));
    let seedStr = valueToChar(foeByteA) +
        valueToChar(foeByteB) +
        valueToChar(allyIndex) +
        valueToChar(extraByte) +
        valueToChar(versionByte) +
        valueToChar(playerCountByte);
    // Encode RNG value as base-34 little-endian
    let remaining = rngValue;
    for (let i = 0; i < RNG_SEED_LENGTH; i++) {
        const digit = remaining % BASE;
        seedStr += valueToChar(digit);
        remaining = Math.floor(remaining / BASE);
    }
    const upper = seedStr.toUpperCase();
    return `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8, 12)}`;
}
// ── Seed Comparison ────────────────────────────────────────────────────────
/**
 * Compare two seeds at the character level.
 */
function compareSeedsRaw(seed1, seed2) {
    const n1 = validateSeed(seed1);
    const n2 = validateSeed(seed2);
    const s1 = n1.replace(/-/g, '').toLowerCase();
    const s2 = n2.replace(/-/g, '').toLowerCase();
    const diffs = [];
    for (let i = 0; i < SEED_LENGTH; i++) {
        const v1 = charToValue(s1[i]);
        const v2 = charToValue(s2[i]);
        if (v1 !== v2) {
            diffs.push({
                charIndex: i,
                value1: v1,
                value2: v2,
                char1: s1[i],
                char2: s2[i],
            });
        }
    }
    return {
        seed1: n1,
        seed2: n2,
        diffs,
        setupDiffs: diffs.filter((d) => d.charIndex < SETUP_LENGTH),
        rngDiffs: diffs.filter((d) => d.charIndex >= SETUP_LENGTH),
    };
}
// ── Seed Dump ──────────────────────────────────────────────────────────────
const SETUP_FIELD_LABELS = {
    0: 'Tier1/Tier2/Tier3lo',
    1: 'Adversary/Tier3hi',
    2: 'Ally',
    3: 'Difficulty/Expansions/Source',
    4: 'Version',
    5: 'PlayerCount',
};
/**
 * Dump all characters of a seed with section and field labels.
 */
function dumpSeedChars(seed) {
    const normalized = validateSeed(seed);
    const stripped = normalized.replace(/-/g, '').toLowerCase();
    const chars = [];
    for (let i = 0; i < SEED_LENGTH; i++) {
        const isSetup = i < SETUP_LENGTH;
        chars.push({
            index: i,
            char: stripped[i],
            value: charToValue(stripped[i]),
            section: isSetup ? 'setup' : 'rng',
            field: isSetup ? SETUP_FIELD_LABELS[i] : undefined,
        });
    }
    return { seed: normalized, chars };
}
//# sourceMappingURL=udtSeedParser.js.map