# Seed Parser & SystemRandom

The library includes a complete encoder/decoder for Return to Dark Tower game seeds, plus a byte-exact replica of .NET's `System.Random` that the game uses for procedural generation.

> The seed _format_ (base-34 alphabet, bitwise layout of the setup section, RNG polynomial) is documented separately in [SEED_FORMAT.md](../SEED_FORMAT.md). This page covers the **API surface** for working with seeds in code.

> **v5.0.0:** every seed export (functions, lookup arrays, types, and `SystemRandom`) now lives under the **`seed`** namespace. Import it once and reach members via `seed.*`:
>
> ```typescript
> import { seed } from 'ultimatedarktower';
> seed.decodeSeed('AA9A-AAGS-W634');
> // (or destructure: const { decodeSeed } = seed;)
> ```
>
> The examples below show the namespaced form.

---

## Decoding a seed

```typescript
import { seed } from 'ultimatedarktower';

const decoded = seed.decodeSeed('AA9A-AAGS-W634');

console.log(decoded.tier1Foe);    // 'Brigands'
console.log(decoded.tier2Foe);    // 'Frost Trolls'
console.log(decoded.tier3Foe);    // 'Dragons'
console.log(decoded.adversary);   // 'Ashstrider'
console.log(decoded.ally);        // 'Zaida'
console.log(decoded.difficulty);  // 'Heroic'
console.log(decoded.source);      // 'Core'
console.log(decoded.expansions);  // []
console.log(decoded.playerCount); // 1
console.log(decoded.rngSeed);     // 186022107
console.log(decoded.seedBank);    // { initializationSeed, questSeed, seedString }
```

`DecodedSeed` is the canonical type — see the type list below.

---

## Creating a seed

### `createSeed(config)` — random RNG portion

```typescript
import { seed as seedApi } from 'ultimatedarktower';

const { seed, rngValue } = seedApi.createSeed({
  tier1Foe: 'Brigands',
  tier2Foe: 'Frost Trolls',
  tier3Foe: 'Dragons',
  adversary: 'Ashstrider',
  ally: 'Zaida',
  difficulty: 'Heroic',
  source: 'Core',
  expansions: [],
  playerCount: 1,
});
```

### `encodeSeed(config, rngValue)` — deterministic

```typescript
import { seed as seedApi } from 'ultimatedarktower';

const seed = seedApi.encodeSeed({ /* …same config… */ }, 186022107);
// 'AA9A-AAGS-W634'
```

---

## Validating and comparing seeds

```typescript
import { seed } from 'ultimatedarktower';
const { validateSeed, compareSeedsRaw, dumpSeedChars } = seed;

const normalized = validateSeed('aa9aagsw634');
// 'AA9A-AAGS-W634' — uppercased, dashes inserted

const cmp = compareSeedsRaw('AA9A-AAGS-W634', 'AA9A-AAGS-W635');
cmp.diffs;       // CharDiff[] — every differing char
cmp.setupDiffs;  // diffs in the setup section (chars 0–5)
cmp.rngDiffs;    // diffs in the RNG section (chars 6–11)

const dump = dumpSeedChars('AA9A-AAGS-W634');
// dump.chars: [{ index, char, value, section, field }, …]
```

---

## Lookup arrays

```typescript
import { seed } from 'ultimatedarktower';
const {
  TIER1_FOES,    // ['Brigands', 'Oreks', 'Shadow Wolves', 'Spine Fiends']
  TIER2_FOES,    // ['Frost Trolls', 'Clan of Neuri', 'Lemures', 'Widowmade Spiders']
  TIER3_FOES,    // ['Dragons', 'Mormos', 'Striga', 'Titans']
  ADVERSARIES,   // ['Ashstrider', 'Bane of Omens', …, "Utuk'Ku"]
  ALLIES,        // ['Gleb', 'Grigor', …, 'Zaida']
  DIFFICULTIES,  // ['Heroic', 'Gritty']
  GAME_SOURCES,  // ['Core', 'Competitive']
} = seed;
```

---

## Low-level char helpers

The base-34 alphabet primitives the codec is built on — rarely needed directly, but exported for tooling.

| Export | Signature | Purpose |
|---|---|---|
| `charToValue` | `(c: string) => number` | A single seed char → its base-34 value. |
| `valueToChar` | `(v: number) => string` | A base-34 value → its seed char. |
| `decodeRngSeed` | `(seed: string) => number` | Decode just the RNG portion of a seed to its integer. |

---

## Types

Types live under the same `seed` namespace — reference them as `seed.DecodedSeed`, etc.:

```typescript
import { seed } from 'ultimatedarktower';

type Decoded = seed.DecodedSeed;
type Config = seed.SeedConfig;
type Bank = seed.SeedBank;
type Comparison = seed.SeedComparison;
type Diff = seed.CharDiff;
type Dump = seed.CharDump;
type Info = seed.CharInfo;
type Conf = seed.Confidence;        // 'confirmed' | 'suspected' | 'unknown' — per-field decode confidence
type T1 = seed.Tier1Foe;            // also Tier2Foe, Tier3Foe
type Adv = seed.Adversary;          // also Ally
type Diff2 = seed.Difficulty;       // also GameSource, ExpansionType
```

---

## SystemRandom — C# PRNG replica

A byte-exact TypeScript implementation of .NET Framework's `System.Random` (modified Knuth subtractive generator). The game uses this PRNG seeded from the RNG portion of the game seed to drive procedural generation.

```typescript
import { seed } from 'ultimatedarktower';

const rng = new seed.SystemRandom(186022107);

rng.next();             // Next() — [0, 2147483647)
rng.nextMax(100);       // Next(100) — [0, 100)
rng.nextRange(10, 50);  // Next(10, 50) — [10, 50)
rng.nextDouble();       // NextDouble() — [0.0, 1.0)
```

### Using with game seeds

```typescript
import { seed } from 'ultimatedarktower';

const decoded = seed.decodeSeed('AA9A-AAGS-W634');

const mainRng  = new seed.SystemRandom(decoded.seedBank.initializationSeed);
const questRng = new seed.SystemRandom(decoded.seedBank.questSeed);

// These produce identical sequences to the C# game code.
```

> Predicting specific in-game events (rotations, spawns, quests, dungeons) requires calling `next()` in the exact same order the game does. That ordering isn't part of this library — it requires reverse-engineering the game's init sequence.

---

## See also

- [../SEED_FORMAT.md](../SEED_FORMAT.md) — the seed format spec (base-34 alphabet, bit layout, RNG polynomial).
- [../api/README.md](README.md) — back to the API index.
