# Seed Parser & SystemRandom

The library includes a complete encoder/decoder for Return to Dark Tower game seeds, plus a byte-exact replica of .NET's `System.Random` that the game uses for procedural generation.

> The seed _format_ (base-34 alphabet, bitwise layout of the setup section, RNG polynomial) is documented separately in [SEED_FORMAT.md](../SEED_FORMAT.md). This page covers the **API surface** for working with seeds in code.

---

## Decoding a seed

```typescript
import { decodeSeed } from 'ultimatedarktower';

const decoded = decodeSeed('AA9A-AAGS-W634');

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
import { createSeed } from 'ultimatedarktower';

const { seed, rngValue } = createSeed({
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
import { encodeSeed } from 'ultimatedarktower';

const seed = encodeSeed({ /* …same config… */ }, 186022107);
// 'AA9A-AAGS-W634'
```

---

## Validating and comparing seeds

```typescript
import {
  validateSeed,
  compareSeedsRaw,
  dumpSeedChars,
} from 'ultimatedarktower';

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
import {
  TIER1_FOES,    // ['Brigands', 'Oreks', 'Shadow Wolves', 'Spine Fiends']
  TIER2_FOES,    // ['Frost Trolls', 'Clan of Neuri', 'Lemures', 'Widowmade Spiders']
  TIER3_FOES,    // ['Dragons', 'Mormos', 'Striga', 'Titans']
  ADVERSARIES,   // ['Ashstrider', 'Bane of Omens', …, "Utuk'Ku"]
  ALLIES,        // ['Gleb', 'Grigor', …, 'Zaida']
  DIFFICULTIES,  // ['Heroic', 'Gritty']
  GAME_SOURCES,  // ['Core', 'Competitive']
} from 'ultimatedarktower';
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

```typescript
import type {
  DecodedSeed,
  SeedConfig,
  SeedBank,
  SeedComparison,
  CharDiff,
  CharDump,
  CharInfo,
  Confidence,              // 'confirmed' | 'suspected' | 'unknown' — per-field decode confidence
  Tier1Foe, Tier2Foe, Tier3Foe,
  Adversary, Ally,
  Difficulty, GameSource, ExpansionType,
} from 'ultimatedarktower';
```

---

## SystemRandom — C# PRNG replica

A byte-exact TypeScript implementation of .NET Framework's `System.Random` (modified Knuth subtractive generator). The game uses this PRNG seeded from the RNG portion of the game seed to drive procedural generation.

```typescript
import { SystemRandom } from 'ultimatedarktower';

const rng = new SystemRandom(186022107);

rng.next();             // Next() — [0, 2147483647)
rng.nextMax(100);       // Next(100) — [0, 100)
rng.nextRange(10, 50);  // Next(10, 50) — [10, 50)
rng.nextDouble();       // NextDouble() — [0.0, 1.0)
```

### Using with game seeds

```typescript
import { decodeSeed, SystemRandom } from 'ultimatedarktower';

const decoded = decodeSeed('AA9A-AAGS-W634');

const mainRng  = new SystemRandom(decoded.seedBank.initializationSeed);
const questRng = new SystemRandom(decoded.seedBank.questSeed);

// These produce identical sequences to the C# game code.
```

> Predicting specific in-game events (rotations, spawns, quests, dungeons) requires calling `next()` in the exact same order the game does. That ordering isn't part of this library — it requires reverse-engineering the game's init sequence.

---

## See also

- [../SEED_FORMAT.md](../SEED_FORMAT.md) — the seed format spec (base-34 alphabet, bit layout, RNG polynomial).
- [../api/README.md](README.md) — back to the API index.
