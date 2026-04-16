# Return to Dark Tower — Seed Format

> **Last updated:** 2026-04-09

## Overview

A game seed is a 12-character string that fully determines the initial state of a game.
It has two sections:

- **Setup (characters 0–5):** Player-selected configuration — foes, adversary, ally,
  difficulty, expansions, source, player count — encoded via bitwise operations on
  per-character values.
- **RNG seed (characters 6–11):** A base-34 integer used to seed C# `System.Random`,
  which drives all procedural generation (timelines, quests, dungeons, spawns, etc.).

The seed enables **deterministic replay**: given the same seed, the game initializes
identically. Players can share seeds to replay fun or challenging scenarios. The game
diverges only when players make different decisions.

## Character Alphabet

The seed uses a **34-character** alphabet. `0` (zero) and `o` (letter) are excluded because
they are indistinguishable in the game's display font.

| Val | Char | Val | Char | Val | Char | Val | Char |
| --- | ---- | --- | ---- | --- | ---- | --- | ---- |
| 0   | a    | 9   | 9    | 18  | j    | 27  | t    |
| 1   | 1    | 10  | b    | 19  | k    | 28  | u    |
| 2   | 2    | 11  | c    | 20  | l    | 29  | v    |
| 3   | 3    | 12  | d    | 21  | m    | 30  | w    |
| 4   | 4    | 13  | e    | 22  | n    | 31  | x    |
| 5   | 5    | 14  | f    | 23  | p    | 32  | y    |
| 6   | 6    | 15  | g    | 24  | q    | 33  | z    |
| 7   | 7    | 16  | h    | 25  | r    |     |      |
| 8   | 8    | 17  | i    | 26  | s    |     |      |

Seeds display as `XXXX-XXXX-XXXX` (dashes are cosmetic, stripped before decoding).
All characters are lowercase.

## Seed Structure

```
 char:  0  1  2  3  4  5     6  7  8  9 10 11
        ├────────────────┤   ├────────────────┤
         Setup section        RNG seed section
         Bitwise-encoded      Base-34 little-endian
```

### Setup Section (Characters 0–5) — Fully Confirmed

Each character is decoded to its base-34 value (0–33). Configuration fields are extracted
via **bitwise masking and shifting** on these individual values. The complete encoding,
confirmed from the developer's C# source code:

**setup[0]** — Foes (foeByteA):

| Bits | Field          | Values                                                          |
| ---- | -------------- | --------------------------------------------------------------- |
| 0–1  | Tier 1         | 0=Brigands, 1=Oreks, 2=Shadow Wolves, 3=Spine Fiends            |
| 2–3  | Tier 2         | 0=Frost Trolls, 1=Clan of Neuri, 2=Lemures, 3=Widowmade Spiders |
| 4    | Tier 3 low bit | Combined with setup[1] bit 4 (see below)                        |

**setup[1]** — Adversary + Tier 3 high bit (foeByteB):

| Bits | Field           | Values                                                                                                                      |
| ---- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0–3  | Adversary       | 0=Ashstrider, 1=Bane of Omens, 2=Empress of Shades, 3=Gaze Eternal, 4=Gravemaw, 5=Isa the Exile, 6=Lingering Rot, 7=Utuk'Ku |
| 4    | Tier 3 high bit | Combined with setup[0] bit 4                                                                                                |

**Tier 3 foe** is assembled from two bits split across setup[0] and setup[1]:
`tier3 = ((setup[0] & 0b10000) >> 4) | ((setup[1] & 0b10000) >> 3)`

| Value | Foe     |
| ----- | ------- |
| 0     | Dragons |
| 1     | Mormos  |
| 2     | Striga  |
| 3     | Titans  |

**setup[2]** — Ally (allyByte):

| Value | Ally   | Value | Ally  |
| ----- | ------ | ----- | ----- |
| 0     | Gleb   | 5     | Nimet |
| 1     | Grigor | 6     | Tomas |
| 2     | Hakan  | 7     | Vasa  |
| 3     | Letha  | 8     | Yana  |
| 4     | Miras  | 9     | Zaida |

**setup[3]** — Difficulty, Expansions, Source (extraByte):

| Bits | Field      | Values                                                              |
| ---- | ---------- | ------------------------------------------------------------------- |
| 0    | Difficulty | 0=Heroic, 1=Gritty                                                  |
| 1–2  | Expansions | 0=None, 1=Monuments, 2=Alliances, 3=Alliances+Monuments             |
| 3    | Source     | Masked with `& 0b1000`, shifted `>> 2`: 0b00=Core, 0b10=Competitive |

**setup[4]** — Version (versionByte):

Always 0. Reserved for future use.

**setup[5]** — Player Count (ancillaryByte):

| Bits | Field        | Values                 |
| ---- | ------------ | ---------------------- |
| 0–1  | Player Count | 0=1P, 1=2P, 2=3P, 3=4P |

> **Note:** Main Goal is **not** encoded in the setup section. It is either determined
> by the RNG seed or selected independently of the seed.

### RNG Seed Section (Characters 6–11)

The last 6 characters are evaluated as a base-34 polynomial in **little-endian** order:

```
rng_seed = char[6]*34^0 + char[7]*34^1 + char[8]*34^2 + char[9]*34^3 + char[10]*34^4 + char[11]*34^5
```

**Range:** 0 to 1,544,804,415 (34^6 - 1), fitting a 32-bit signed integer.

This value populates a **SeedBank** with two derived seeds:

| Seed               | Value        | Purpose                     |
| ------------------ | ------------ | --------------------------- |
| InitializationSeed | rng_seed     | Seeds the main game PRNG    |
| QuestSeed          | rng_seed - 1 | Seeds quest generation PRNG |

The game creates two C# `System.Random` instances from these seeds. These two PRNG streams
drive all procedural generation. The seed creator uses its own **unseeded** `Random` instance
to generate this portion (i.e., the seeder itself is not seeded).

## What the Seed Controls

The following table cross-references the game designer's description against what has been
confirmed.

| #   | Component                     | Section | Status                 | Details                                                                                      |
| --- | ----------------------------- | ------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Foes (Tier 1, 2, 3)           | Setup   | Confirmed from source  | setup[0] bits 0–4, setup[1] bit 4. All value mappings confirmed.                             |
| 2   | Adversary                     | Setup   | Confirmed from source  | setup[1] bits 0–3. All 8 adversaries mapped.                                                 |
| 3   | Ally                          | Setup   | Confirmed from source  | setup[2]. All 10 allies mapped.                                                              |
| 4   | Difficulty                    | Setup   | Confirmed from source  | setup[3] bit 0. Heroic=0, Gritty=1.                                                          |
| 5   | Expansions                    | Setup   | Confirmed from source  | setup[3] bits 1–2. Monuments, Alliances, or both.                                            |
| 6   | Source (game type)            | Setup   | Confirmed from source  | setup[3] bit 3. Core or Competitive.                                                         |
| 7   | Player count                  | Setup   | Confirmed from source  | setup[5] bits 0–1. 1–4 players.                                                              |
| 8   | Timeline of events            | RNG     | Confirmed by developer | When foes act/spawn/level up, market clearing, rotation and seal removals.                   |
| 9   | Side quests                   | RNG     | Confirmed by developer | Which quests appear and what tasks complete them.                                            |
| 10  | Quest and foe spawn locations | RNG     | Confirmed by developer | Board placement of quests and foes.                                                          |
| 11  | Dungeon layouts               | RNG     | Confirmed by developer | Internal dungeon structure, including Yana's dungeons.                                       |
| 12  | Effect targets                | RNG     | Designer description   | e.g., which foes gain cards from Gravemaw. Not independently verified.                       |
| 13  | Battle card shuffling         | RNG     | Designer description   | Determines foe fight order. Cleared on save restore (not critical state).                    |
| 14  | Companion events              | RNG     | Confirmed by developer | Berat upgrade chances, Grigor kill chances, Yana stop chances, companion timeline placement. |
| 15  | Reserved expansion space      | Unknown | Designer description   | Extra capacity for future expansions. setup[4] (version byte) may serve this purpose.        |

**Status definitions:**

- **Confirmed from source** — verified from code
- **Confirmed by developer** — stated by the developer
- **Designer description** — stated by a game designer, not fully verified

## Determinism and Replication

The seed generates the **entire initial game state** at startup. Identical seeds with
identical player decisions produce identical games. Player choices cause divergence because
the game tracks mutable state (e.g., foe counts) and acts accordingly.

Replicating procedural generation externally requires:

1. **Exact C# System.Random implementation** — matching .NET Framework's Knuth subtractive
   generator algorithm (implemented in `udtSystemRandom.ts`)
2. **Identical call ordering** — `System.Random` is stateful; calling `Next()` in a different
   sequence produces different results
3. **Matching game logic** — the exact order the game queries the PRNG for each system
   (rotations, spawns, quests, dungeons, companions, etc.)

## Game State Prediction (Goal)

The long-term goal of this research is **forward prediction**: given a seed, replicate
the game's initialization pipeline in TypeScript so we can predict the initial game
state — tower rotation timeline, foe event timing, quest selection and placement,
dungeon layouts, foe spawn locations, and companion events. Prediction is one-way
(seed → state). We are not doing reverse search over the seed space.

### What we already have

- **Byte-exact `System.Random` replica** (`udtSystemRandom.ts`) — verified against
  C#-generated test vectors, including edge cases
- **Full base-34 seed decoder** (`udtSeedParser.ts`) including the `SeedBank`
  (`InitializationSeed` = RNG integer, `QuestSeed` = `InitializationSeed - 1`)

### What is missing (the blocker)

We need the **game's initialization call order** against `System.Random`. Specifically:

- The **ordered sequence** of `Random.Next(...)` calls the game makes during initial
  game setup
- For each call: which `Random` instance is used (`InitializationSeed` vs
  `QuestSeed`), the `maxValue` passed (or `minValue`/`maxValue` range, or
  `NextDouble()`), and what game concept the result maps to
- The **branching rules** that change call order based on configuration — e.g., the
  Alliances expansion inserts guild setup before foe events; player count affects
  number of spawns; adversary choice may alter the quest pool
- Whether `QuestSeed` is consumed during initial setup at all, or only when quests
  actually fire in-game

### Why the missing piece matters

`System.Random` is stateful. Every `Next()` call advances the internal state, so
calling it in a different order — or a different number of times — produces a
completely different stream from that point forward. Without the exact call
sequence, even a byte-exact PRNG replica cannot reproduce the game's output. This
is an ordering problem, not a math problem.

### Minimum useful information

What would unblock partial progress even without the full pipeline:

- **Pseudocode or source for one subsystem** (e.g., foe event timeline generation)
  would let us verify the PRNG replica against real games and confirm we're reading
  the stream correctly
- **A high-level list of setup phases in order** (e.g., `guilds → foe events →
timeline → quests → dungeons → spawns`) would let us scaffold the pipeline even
  before per-step details are known

### Out of scope

- **Reverse search** — finding a seed that produces desired events by brute-forcing
  the ~1.5B seed space
- **Mid-game state prediction** — the game diverges as players make decisions, so
  prediction is only meaningful for the initial state
- **Main Goal selection** — not encoded in the seed setup section; handled by a
  separate mechanism

## Character Stability (Empirical)

From 22-seed testing: which characters change when a single config field is modified. Chars
6–11 always change because the game regenerates the RNG seed on any config change.

```
Field            Char:  0  1  2  3  4  5    6  7  8  9 10 11
                       [─ Setup section ─]  [─ RNG section ──]
───────────────────────────────────────────────────────────────
Tier 1 Foe             x  .  .  .  .  .    x  x  x  x  x  x
Tier 2 Foe             x  .  .  .  .  .    x  x  x  x  x  x
Tier 3 Foe             x  x  .  .  .  .    x  x  x  x  x  x
Adversary              .  x  .  .  .  .    x  x  x  x  x  x
Difficulty             .  .  .  x  .  .    x  x  x  x  x  x
Game Type              .  .  .  x  .  .    x  x  x  x  x  x
Player Count           .  .  .  .  .  x    x  x  x  x  x  x
```

**Notes:**

- Tier 3 Foe affects both chars 0 and 1. Now confirmed: the Tier 3 value is split across
  bit 4 of setup[0] (low bit) and bit 4 of setup[1] (high bit).
- The empirical "Main Goal" row was removed — the test actually varied a field that maps
  to the Ally (char 2), which was not varied in the original test methodology.

## Analysis Methodology

All 22 seeds collected from one session with baseline config:
`AA9A-AAGS-W634` (Core / Heroic / 1P / Ashstrider / Zaida / Brigands / Frost Trolls /
Dragons).

**Protocol:** Change exactly one field per variant, record the new seed, compare.

**Tools:** Seed Decoder web app (`packages/seed-decoder/`), `analyze_bits.py`
(`packages/seed-decoder/scripts/`), TypeScript decoder (`udtSeedParser.ts`).

## Next Steps

1. **Game state prediction** — see the [Game State Prediction (Goal)](#game-state-prediction-goal)
   section above. Currently blocked on obtaining the game's initialization call
   sequence.
2. **Expansion testing** — verify Alliances/Covenant behavior with the confirmed encoding
3. **Main Goal** — determine where/how Main Goal is selected (not in seed setup section)
