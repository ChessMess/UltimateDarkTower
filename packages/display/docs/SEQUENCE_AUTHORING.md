# Authoring light sequences in JSON

_Docs: [Index](README.md) > Sequence author > Sequence authoring_

This document explains how to write a new light sequence as a JSON file and have the player run it on the tower. It assumes you've never touched this code before — a junior dev should be able to read this top-to-bottom and end up with a working sequence.

This file focuses on the _how_: file format, available track kinds, and the steps to wire a new sequence into the app. The existing JSON sequences under [src/sequences/data/](../src/sequences/data/) are the best worked examples of what each firmware sequence looks like.

---

## What's a sequence?

A **sequence** is an animation that drives the 24 tower LEDs over time. The tower has 6 layers (0 = top ring, 5 = base2) with 4 lights per layer (indexes 0..3). Time is measured in **firmware ticks** at 50 Hz — one tick is 20 ms.

A sequence file lives at `src/sequences/data/{name}.json`. Each file is one JSON object; the **player** ([src/sequences/SequencePlayer.ts](../src/sequences/SequencePlayer.ts)) reads it and produces a [GSAP](https://gsap.com/) timeline that schedules all the per-LED writes.

The simplest possible sequence:

```json
{
  "name": "exampleFlash",
  "totalTicks": 50,
  "loop": false,
  "endBehavior": "cutToBlack",
  "tracks": [
    { "kind": "solid", "atTick": 0, "layers": [0, 1, 2, 3, 4, 5], "lights": "all", "level": 1 }
  ]
}
```

That sequence: at tick 0, every LED snaps to full brightness; at tick 50 (1 second later), every LED snaps to black. Done.

---

## The sequence root

Every JSON file has the same outer shape, validated by [src/sequences/schema.ts](../src/sequences/schema.ts):

| Field         | Type                       | Required | Notes                                                                                                                                                                         |
| ------------- | -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | string                     | yes      | Human label. Should match the file name (`defeat.json` → `"name": "defeat"`).                                                                                                 |
| `description` | string                     | no       | Free-form. Goes nowhere at runtime; appears in the file for the next person who reads it.                                                                                     |
| `totalTicks`  | positive int               | yes      | When the sequence ends (non-loop) or how long one loop iteration is (loop). Ticks are 20 ms each.                                                                             |
| `loop`        | boolean                    | yes      | `true` → the timeline repeats forever (until the state changes). `false` → runs once and signals completion.                                                                  |
| `endBehavior` | `"cutToBlack"` \| `"hold"` | yes      | What happens at `totalTicks`. `cutToBlack` writes 0 to every LED; `hold` leaves them as-is. **`cutToBlack` is rejected if `loop: true`** — it would zero out every iteration. |
| `tracks`      | Track[]                    | yes      | Ordered list of tracks (animation primitives). Order matters when two tracks fire at the same tick — see [Intra-tick ordering](#intra-tick-ordering).                         |

Every **track** has a `kind` discriminator that picks the schema the rest of the object follows. Every track may also include an `_comment: string` — the schema accepts it and the player ignores it. Use it the same way you'd use a `//` comment in code.

---

## Track kinds

There are nine data-driven kinds plus a `custom` escape hatch. Each one is its own file under [src/sequences/playerKinds/](../src/sequences/playerKinds/) — the schema and the handler live together.

A handful of conventions that apply to all kinds:

- **Tick ranges are half-open `[atTick, endTick)`** — `atTick` is inclusive, `endTick` is exclusive. So `atTick: 0, endTick: 100` runs on ticks 0 through 99.
- **Levels** are normalized 0..1. Anywhere a `level` field appears, you can also pass `levelPwm` (integer 0..255) and the player divides by 255 internally — the schema enforces "exactly one of." This makes firmware-derived constants like "PWM 165" readable as `"levelPwm": 165` instead of `0.6470588235294118`.
- **`layers`** is an array of layer indices (0..5), one or more entries.
- **`lights`** is either `"all"` (every light on the listed layers) or an explicit array like `[0, 2]`.
- **Iteration order** when a kind iterates LEDs is **layer-major, light-minor** — outer loop over layers, inner loop over lights. This matters for RNG-consuming kinds (see [RNG ordering](#rng-and-determinism)).

### Quick reference table

| Kind              | One-line summary                                                       | Used by                                                                     |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `solid`           | Write a constant level to a scope of LEDs at one tick.                 | victory, sealReveal ph3, dungeonIdle, rotation steady, final cuts.          |
| `linearRamp`      | Interpolate every LED in scope linearly from `from` → `to`.            | defeat, monthStarted ph1, slowFlareThenFade.                                |
| `scaleAll`        | Multiply every LED by `mul/div` once per tick over a range.            | flare ph2, gloat per-tick, angryStrobe ph2, victory ramp-up, twinkle decay. |
| `discreteSet`     | At specific ticks: setAll, subtractAll-from-shadow, or randomLed.      | gloat chortles, monthStarted ph2, victory random-drop.                      |
| `exponentialRamp` | Per-tick read-modify-write `× mul/div`, clamped to `[floor, 1]`.       | flareThenFade, flareThenFadeBase, flareThenFlicker ph1.                     |
| `flickerStep`     | Per-LED random-target lerp; or respawn-one-LED-conditionally per tick. | flareThenFlicker ph2, angryStrobe ph1, dungeonIdle, twinkle.                |
| `breathe`         | Symmetric triangle wave applied to all 24 LEDs in lockstep.            | wholeTowerBreathing.                                                        |
| `rotationChase`   | Chase pattern across layers + steady-fill layer + decay tail.          | rotation × 4 (AllDrums + per-drum variants).                                |
| `pulseFlicker`    | Per-LED pulse-and-decay with reseedable delays.                        | sealReveal ph1+2.                                                           |
| `custom`          | Escape hatch — names a TS handler registered at runtime.               | none initially.                                                             |

Detailed reference for each follows.

---

### `solid`

Write a constant `level` to a scope of LEDs at one tick. The LEDs hold that value until another track touches them — there is no "off at endTick" — that's [exactly_one]'s job, or just a second `solid` with `level: 0`.

```json
{
  "kind": "solid",
  "atTick": 60,
  "layers": [0, 1, 2],
  "lights": "all",
  "levelPwm": 200
}
```

| Field                | Type                             | Required  | Notes                                                      |
| -------------------- | -------------------------------- | --------- | ---------------------------------------------------------- |
| `kind`               | `"solid"`                        | yes       |                                                            |
| `atTick`             | int ≥ 0                          | yes       | When to write.                                             |
| `endTick`            | int > 0                          | no        | Informational only — the player does not write at endTick. |
| `layers`             | int[] (each 0..5), min length 1  | yes       |                                                            |
| `lights`             | `"all"` \| int[] (each 0..3)     | yes       |                                                            |
| `level` / `levelPwm` | one of: number 0..1 / int 0..255 | yes (one) | Exactly one must be set.                                   |

**When to use it:** any time you want LEDs to snap to a value and stay there. Stage builds (victory's bottom-up phases), final cuts, "off" states.

---

### `linearRamp`

Linearly interpolate every LED in `scope` from `from` to `to` over `durationTicks` starting at `atTick`.

```json
{
  "kind": "linearRamp",
  "atTick": 0,
  "durationTicks": 100,
  "layers": [5],
  "lights": "all",
  "from": 0,
  "to": 1,
  "interpolation": "gsapTween"
}
```

| Field           | Type                            | Required | Notes           |
| --------------- | ------------------------------- | -------- | --------------- |
| `kind`          | `"linearRamp"`                  | yes      |                 |
| `atTick`        | int ≥ 0                         | yes      |                 |
| `durationTicks` | int > 0                         | yes      |                 |
| `layers`        | int[] (each 0..5), min length 1 | yes      |                 |
| `lights`        | `"all"` \| int[] (each 0..3)    | yes      |                 |
| `from`          | number 0..1                     | yes      | Starting level. |
| `to`            | number 0..1                     | yes      | Ending level.   |
| `interpolation` | `"gsapTween"` \| `"perTick"`    | yes      | See below.      |

**Two interpolation modes:**

- **`gsapTween`** uses GSAP's tween engine, which writes the LED level on every animation frame (typically 60 fps). Visually smooth. Use this for ramps that are short enough that the extra detail matters.
- **`perTick`** registers one `tl.call` per firmware tick (50 Hz) with the level pre-computed at registration time. Mathematically identical at tick boundaries, but visually steps at 50 Hz instead of gliding at 60 fps.

Default to `gsapTween` for new sequences. Use `perTick` if you're matching a TS builder that did per-tick scheduling (e.g. slowFlareThenFade).

---

### `scaleAll`

Multiply every LED's level by `multiplierNum / multiplierDen` once per tick across `[atTick, endTick)`.

```json
{
  "kind": "scaleAll",
  "atTick": 25,
  "endTick": 225,
  "multiplierNum": 768,
  "multiplierDen": 800
}
```

Despite the name, the multiplier can be **greater than 1** (victory's flurry uses `200/198 ≈ 1.01` to ramp UP). Naming reflects "scale every LED" rather than "decay every LED."

| Field           | Type         | Required |
| --------------- | ------------ | -------- |
| `kind`          | `"scaleAll"` | yes      |
| `atTick`        | int ≥ 0      | yes      |
| `endTick`       | int > 0      | yes      |
| `multiplierNum` | positive int | yes      |
| `multiplierDen` | positive int | yes      |

The math mirrors the firmware's `lights_decay_all` primitive in [src/sequences/builders/ledMath.ts:16-21](../src/sequences/builders/ledMath.ts#L16-L21) — it operates on PWM bytes via integer division, so the result is rounded to PWM granularity (1/255). This means decay sequences eventually reach exactly 0 instead of asymptoting to a tiny float.

---

### `discreteSet`

At each tick in `atTicks`, perform one of three operations selected by `mode`. All three modes share the `atTicks` array; the rest of the fields depend on the mode.

#### `mode: "setAll"`

Every LED is written to `level`.

```json
{
  "kind": "discreteSet",
  "atTicks": [15, 35, 60, 80, 100],
  "mode": "setAll",
  "levelPwm": 160
}
```

#### `mode: "subtractAll"`

Every LED's level is decremented by `delta`, clamped to ≥ 0. Uses an internal **shadow array** initialized to `from` — so the math is deterministic regardless of what other tracks have written. Mirrors monthStarted's read-modify-write.

```json
{
  "kind": "discreteSet",
  "atTicks": [175, 200, 225, 250, 275, 300, 325, 350, 375],
  "mode": "subtractAll",
  "deltaPwm": 28,
  "from": 1.0
}
```

`from` must be set explicitly so the shadow starts at a known state (typically `1.0` if a prior phase saturated everything).

#### `mode: "randomLed"`

One random `(layer, light)` is written to `level`. **Consumes 2 RNG draws per fire at playback time** (layer pick, then light pick) — so each play picks a different LED.

```json
{
  "kind": "discreteSet",
  "atTicks": [649, 653, 657, 661, 665],
  "mode": "randomLed",
  "levelPwm": 128
}
```

| Field                | Type                                           | Required                 | Notes                 |
| -------------------- | ---------------------------------------------- | ------------------------ | --------------------- |
| `kind`               | `"discreteSet"`                                | yes                      |                       |
| `atTicks`            | int[] (each ≥ 0), min length 1                 | yes                      |                       |
| `mode`               | `"setAll"` \| `"subtractAll"` \| `"randomLed"` | yes                      |                       |
| `level` / `levelPwm` | one of: number 0..1 / int 0..255               | yes for setAll/randomLed | Exactly one.          |
| `delta` / `deltaPwm` | one of: number 0..1 / int 0..255               | yes for subtractAll      | Exactly one.          |
| `from`               | number 0..1                                    | yes for subtractAll      | Initial shadow level. |

---

### `exponentialRamp`

Per-tick read-modify-write: every tick in `[atTick, atTick + durationTicks)`, read each LED in scope, multiply by `multiplierNum / multiplierDen`, clamp to `[floorLevel, 1]`. If the LED has already reached `saturationLevel`, it snaps to 1.

```json
{
  "kind": "exponentialRamp",
  "atTick": 0,
  "durationTicks": 25,
  "layers": [0, 1, 2, 3, 4, 5],
  "lights": "all",
  "multiplierNum": 5,
  "multiplierDen": 4,
  "floorLevelPwm": 5,
  "saturationLevelPwm": 204
}
```

The first tick lifts every LED from 0 up to `floorLevel` (because `0 × 5/4 = 0`, then clamped up to `floorLevel`). After that, growth compounds. Mirrors firmware's flare ramp.

| Field                                    | Type                             | Required  | Notes                                              |
| ---------------------------------------- | -------------------------------- | --------- | -------------------------------------------------- |
| `kind`                                   | `"exponentialRamp"`              | yes       |                                                    |
| `atTick`                                 | int ≥ 0                          | yes       |                                                    |
| `durationTicks`                          | int > 0                          | yes       |                                                    |
| `layers`                                 | int[] (each 0..5), min length 1  | yes       |                                                    |
| `lights`                                 | `"all"` \| int[] (each 0..3)     | yes       |                                                    |
| `multiplierNum`                          | positive int                     | yes       | Per-tick growth ratio numerator (e.g. 5 for ×5/4). |
| `multiplierDen`                          | positive int                     | yes       | Per-tick growth ratio denominator.                 |
| `floorLevel` / `floorLevelPwm`           | one of: number 0..1 / int 0..255 | yes (one) | Initial seed when the LED is dark.                 |
| `saturationLevel` / `saturationLevelPwm` | one of: number 0..1 / int 0..255 | yes (one) | Once an LED reaches this, snap to 1.               |

---

### `flickerStep`

Two distinct behaviors live under this kind, switched by whether `respawn` is set.

#### Standard mode (no `respawn`)

Per tick over `[atTick, endTick)` (or `'forever'`), iterate every (layer, light) in scope and apply the firmware's "Effect_Flicker" step: 25% chance to refresh a per-LED random target, then lerp current level toward that target by `alpha`.

```json
{
  "kind": "flickerStep",
  "atTick": 80,
  "endTick": "forever",
  "layers": [0, 1, 2, 3, 4, 5],
  "lights": "all",
  "alpha": 0.15
}
```

Higher `alpha` = more aggressive snap toward the target (chaotic). Lower `alpha` = slow drift. Used by angryStrobe (0.4), flareThenFlicker (0.15), dungeonIdle (0.15).

The handler reuses [`applyFlickerStep`](../src/sequences/builders/ledSequenceOps.ts#L80-L94) so the math is bit-identical to the TS path.

#### Respawn mode (with `respawn`)

The standard per-LED iteration is **skipped**. Instead, **each playback tick**, the handler:

1. Draws once from the RNG to test `respawn.probability`.
2. On pass: draws twice more to pick a random `(layer, light)`.
3. If that LED's level is below `respawn.threshold`: draws one final time to choose a level uniformly in `[levelMin, levelMax]` and writes it.

All draws happen live at playback time, so each play produces a different sparkle pattern.

This is the twinkle pattern.

```json
{
  "kind": "flickerStep",
  "atTick": 0,
  "endTick": 1,
  "layers": [0, 1, 2, 3, 4, 5],
  "lights": "all",
  "alpha": 0,
  "respawn": {
    "probability": 0.5,
    "thresholdPwm": 20,
    "levelMin": 0,
    "levelMax": 1
  }
}
```

`alpha` is required by the schema even in respawn mode — set it to `0`.

| Field                                        | Type                             | Required  | Notes                                                                   |
| -------------------------------------------- | -------------------------------- | --------- | ----------------------------------------------------------------------- |
| `kind`                                       | `"flickerStep"`                  | yes       |                                                                         |
| `atTick`                                     | int ≥ 0                          | yes       |                                                                         |
| `endTick`                                    | int > 0 \| `"forever"`           | yes       | `"forever"` wraps the per-tick callback in a `repeat: -1` sub-timeline. |
| `layers`                                     | int[] (each 0..5), min length 1  | yes       |                                                                         |
| `lights`                                     | `"all"` \| int[] (each 0..3)     | yes       |                                                                         |
| `alpha`                                      | number 0..1                      | yes       | Lerp factor for standard mode. Set to 0 in respawn mode.                |
| `respawn`                                    | object                           | no        | If present, switches to respawn mode.                                   |
| `respawn.probability`                        | number 0..1                      | yes       | Chance per tick of attempting a spawn.                                  |
| `respawn.threshold` / `respawn.thresholdPwm` | one of: number 0..1 / int 0..255 | yes (one) | LEDs brighter than this aren't overwritten.                             |
| `respawn.levelMin`                           | number 0..1                      | yes       | Lower bound of random level.                                            |
| `respawn.levelMax`                           | number 0..1                      | yes       | Upper bound of random level.                                            |

---

### `breathe`

Symmetric triangle wave applied to **all 24 LEDs** in lockstep. Mirrors firmware `Sequence_WholeTowerBreathing`.

```json
{
  "kind": "breathe",
  "atTick": 0,
  "endTick": 1,
  "periodTicks": 256,
  "peakPwm": 255,
  "divisor": 6
}
```

Math, per tick (with internal counter `elapsed`):

```
doubled   = (2 * elapsed) & ((peakPwm * 2) | 1)
magnitude = doubled >= peakPwm + 1 ? (peakPwm * 2 + 1) - doubled : doubled
level     = magnitude / divisor / 255
```

Period is `2 × (peakPwm + 1)` ticks (so `peakPwm: 255` gives a 512-tick double-cycle, but with the fold the visible period is 256 ticks). Peak normalized level is `peakPwm / divisor / 255`.

**Idiomatic usage** is a forever-loop: pair with `loop: true, totalTicks: 1` and `endTick: 1` (one breathe call per outer-loop iteration). See [twinkle.json](../src/sequences/data/twinkle.json) for the same pattern.

| Field         | Type                   | Required | Notes                                        |
| ------------- | ---------------------- | -------- | -------------------------------------------- |
| `kind`        | `"breathe"`            | yes      |                                              |
| `atTick`      | int ≥ 0                | yes      |                                              |
| `endTick`     | int > 0 \| `"forever"` | yes      |                                              |
| `periodTicks` | positive int           | yes      | Triangle period.                             |
| `peakPwm`     | int 0..255             | yes      | Peak PWM byte; defines the bitmask range.    |
| `divisor`     | positive int           | yes      | Brightness divisor (firmware uses 6 → ~17%). |

---

### `rotationChase`

Chase pattern: each `chaseLayer` lights one position at a time and rotates around. Optional `steadyLayer` is held at `steadyLevel` every tick. LEDs not currently lit decay via `decayMultiplierNum / decayMultiplierDen`.

```json
{
  "kind": "rotationChase",
  "atTick": 0,
  "endTick": 1,
  "chaseLayers": [0, 1, 2],
  "steadyLayer": 3,
  "steadyLevelPwm": 180,
  "phaseOffsetTicks": 16,
  "lightStepTicks": 12,
  "decayMultiplierNum": 700,
  "decayMultiplierDen": 768,
  "periodTicks": 48
}
```

Math, per tick (with internal counter `elapsed`):

```
for each chaseLayer:
  phase = (elapsed + phaseOffsetTicks * chaseLayer) % periodTicks
  for each light in 0..3:
    if phase == lightStepTicks * light:
      setLevel(chaseLayer, light, 1)
    else:
      setLevel(chaseLayer, light, currentLevel * decayMultiplierNum / decayMultiplierDen)
```

So with `lightStepTicks: 12` and `periodTicks: 48`, each layer's lit position moves through lights 0→3 over 48 ticks, and `phaseOffsetTicks: 16` staggers consecutive layers by 1/3 period.

| Field                            | Type                             | Required                | Notes                                   |
| -------------------------------- | -------------------------------- | ----------------------- | --------------------------------------- |
| `kind`                           | `"rotationChase"`                | yes                     |                                         |
| `atTick`                         | int ≥ 0                          | yes                     |                                         |
| `endTick`                        | int > 0 \| `"forever"`           | yes                     |                                         |
| `chaseLayers`                    | int[] (each 0..5), min length 1  | yes                     |                                         |
| `steadyLayer`                    | int 0..5                         | no                      | Hold at `steadyLevel` every tick.       |
| `steadyLevel` / `steadyLevelPwm` | one of: number 0..1 / int 0..255 | only with `steadyLayer` |                                         |
| `phaseOffsetTicks`               | int ≥ 0                          | yes                     | Phase stagger between chase layers.     |
| `lightStepTicks`                 | positive int                     | yes                     | Ticks between adjacent light positions. |
| `decayMultiplierNum`             | positive int                     | yes                     |                                         |
| `decayMultiplierDen`             | positive int                     | yes                     |                                         |
| `periodTicks`                    | positive int                     | yes                     | One full revolution.                    |

---

### `pulseFlicker`

Specialized for sealReveal. Allocates one slot per LED in scope, each with `{layer, light, delay, level}`. For each tick `t` in `[atTick, endTick)`:

- If `t - atTick` matches one of the `reseed[i].atTick` offsets: reseed every slot's `delay` to `magnitude × ((rand mod 12) + 4)`. **No LED writes on a reseed tick.** Consumes 1 RNG draw per slot **at playback time**, so each play's reseed produces a different delay pattern.
- Otherwise: for each slot, if `slot.delay > 0 && (t - atTick) % slot.delay == 0`, set `slot.level = pulseLevel`; otherwise `slot.level *= decayPerTick`. Then write to the LED.

```json
{
  "kind": "pulseFlicker",
  "layers": [0, 1, 2],
  "atTick": 0,
  "endTick": 60,
  "pulseLevelPwm": 200,
  "decayPerTick": 0.911,
  "reseed": [
    { "atTick": 0, "magnitude": 10 },
    { "atTick": 30, "magnitude": 8 }
  ]
}
```

The `reseed[i].atTick` is the tick **relative to the track's `atTick`**, not absolute.

| Field                          | Type                             | Required  | Notes                                       |
| ------------------------------ | -------------------------------- | --------- | ------------------------------------------- |
| `kind`                         | `"pulseFlicker"`                 | yes       |                                             |
| `atTick`                       | int ≥ 0                          | yes       |                                             |
| `endTick`                      | int > 0                          | yes       |                                             |
| `layers`                       | int[] (each 0..5), min length 1  | yes       | Allocates 4 slots per layer (all 4 lights). |
| `pulseLevel` / `pulseLevelPwm` | one of: number 0..1 / int 0..255 | yes (one) |                                             |
| `decayPerTick`                 | number 0..1                      | yes       | Per-tick multiplier when not pulsing.       |
| `reseed`                       | object[]                         | yes       | Empty array OK if no reseeds.               |
| `reseed[i].atTick`             | int ≥ 0                          | yes       | Relative to the track's `atTick`.           |
| `reseed[i].magnitude`          | positive int                     | yes       | Larger → longer delays.                     |

---

### `custom`

Escape hatch for sequences that don't fit any data-driven kind. The player resolves `handlerId` against a registry populated via `registerCustomHandler` from outside. **No customs are registered initially** — the eight data-driven kinds cover every existing sequence.

```json
{
  "kind": "custom",
  "handlerId": "myWeirdEffect",
  "params": { "intensity": 0.7 }
}
```

If the player can't find a registered handler matching `handlerId`, it logs a warning and skips the track. Use this only when you've actually registered a handler in TS — see [src/sequences/SequencePlayer.ts](../src/sequences/SequencePlayer.ts) for the API.

| Field       | Type                           | Required | Notes                           |
| ----------- | ------------------------------ | -------- | ------------------------------- |
| `kind`      | `"custom"`                     | yes      |                                 |
| `handlerId` | non-empty string               | yes      | Looked up at build time.        |
| `params`    | object (string-keyed unknowns) | no       | Passed verbatim to the handler. |

---

## Common patterns

### Loop sequences

For a sequence that repeats forever (twinkle, dungeonIdle, rotation, wholeTowerBreathing):

- Set `loop: true, totalTicks: 1`.
- Each track sets `atTick: 0, endTick: 1` (one call per loop iteration).
- The outer timeline's `repeat: -1` re-fires the tracks each iteration.
- `endBehavior: "hold"` — `cutToBlack` is rejected by the schema for loops (would zero LEDs every iteration).

### `endTick: "forever"` inside a non-loop sequence

flareThenFlicker has a 80-tick ramp followed by an indefinite flicker. The sequence root is `loop: false, totalTicks: 80`, but the flickerStep track has `endTick: "forever"`. The handler wraps it in its own `repeat: -1` sub-timeline added at offset 80.

```json
{
  "totalTicks": 80,
  "loop": false,
  "endBehavior": "hold",
  "tracks": [
    { "kind": "exponentialRamp", "atTick": 0, "durationTicks": 80 /* ... */ },
    { "kind": "flickerStep", "atTick": 80, "endTick": "forever" /* ... */ }
  ]
}
```

### Intra-tick ordering

When two tracks fire at the **same tick**, GSAP runs the calls in **registration order** — i.e. the order they appear in the `tracks` array.

This matters for victory's flurry, which both writes a random LED to PWM 128 (via `discreteSet randomLed`) AND scales every LED by 200/198 (via `scaleAll`) on the same ticks. The TS code does the random drop FIRST, then decays. So the JSON lists `discreteSet` before `scaleAll`:

```json
"tracks": [
  /* ... earlier solid phases ... */
  { "kind": "discreteSet", "atTicks": [649, 653, /* ... */], "mode": "randomLed", "levelPwm": 128 },
  { "kind": "scaleAll",    "atTick": 649, "endTick": 845, "multiplierNum": 200, "multiplierDen": 198 },
  /* ... cut to black ... */
]
```

Same goes for gloat (chortle setAll before per-tick decay) and twinkle (respawn before global decay). When in doubt, write the order that matches what the original TS builder did.

---

## RNG and determinism

**When the random draws happen:** every RNG call is wrapped in a GSAP `tl.call(() => …)` so it runs each time the timeline ticks — not when the JSON is loaded or when `SequencePlayer.build()` runs. The practical consequence: **each play of a random sequence looks different**. Nothing is baked in. The seeded `mulberry32` PRNG is used only in tests to make this reproducible.

Several kinds consume random numbers (`flickerStep`, `pulseFlicker`, `discreteSet randomLed`). The sequence player consumes random numbers via an injectable `rng: () => number` on `SequenceAnimatorDeps` ([src/sequences/builders/types.ts:11](../src/sequences/builders/types.ts#L11)) — defaults to `Math.random` in production.

Two rules to follow when authoring RNG-using kinds:

1. **Iteration order is layer-major, light-minor.** All handlers iterate `for (const layer of layers) { for (const light of lights) { ... } }`. Both the JSON player and the TS builders follow this order — that's what lets parity tests under a fixed seed produce bit-identical output.

2. **Draw order matters even within one tick.** twinkle's respawn does: probability check (1 draw) → layer pick (1 draw) → light pick (1 draw) → optional level (1 draw conditional on threshold check). The handler mirrors this exact order. If you write a new RNG-consuming kind, document the draw order in the handler.

For testing, the snapshot driver uses a seeded `mulberry32` PRNG in [src/utils/seededRng.ts](../src/utils/seededRng.ts) — same seed → same draws across both implementations.

---

## How a sequence becomes runnable

After you write `src/sequences/data/myThing.json`, two things have to happen:

### 1. Register it in `jsonSequences.ts`

[src/sequences/jsonSequences.ts](../src/sequences/jsonSequences.ts) imports each JSON and parses it via `parseSafe` so a typo only takes out its own sequence:

```ts
import myThingJson from './data/myThing.json';

export const JSON_SEQUENCE_DATA: ReadonlyMap<number, Sequence> = new Map(
  (
    [
      /* ... existing entries ... */
      [TOWER_LIGHT_SEQUENCES.myThing, parseSafe('myThing', myThingJson)],
    ] as ReadonlyArray<[number, Sequence | null]>
  ).filter((kv): kv is [number, Sequence] => kv[1] !== null),
);
```

The map is keyed by the numeric id from `TOWER_LIGHT_SEQUENCES` (defined in the `ultimatedarktower` package). If your sequence is brand new, you'll also need to add it to `TOWER_LIGHT_SEQUENCES` upstream **and** add an entry to [tests/sequenceSnapshots/sequences.ts](../tests/sequenceSnapshots/sequences.ts) — the parity test has a completeness assertion that fails CI if a `SEQUENCES`-listed id is missing from `JSON_SEQUENCE_DATA`.

### 2. Verify against the committed baseline

[tests/sequenceSnapshots/parity.test.ts](../tests/sequenceSnapshots/parity.test.ts) runs your JSON through the player and diffs against the committed snapshot in [tests/sequenceSnapshots/**snapshots**/](../tests/sequenceSnapshots/__snapshots__/) — every (tick, LED) must agree within 1/255 PWM.

```sh
npm test                                # runs everything including parity
```

For fresh sequences with no committed baseline, the parity test has nothing to compare against — you'll need to either (a) capture a baseline manually (see the archive at `.local/legacy-sequence-system/` for the legacy recorder script) or (b) write a sequence-specific test that validates against firmware-derived expected values.

---

## Verifying your work

Two layers of verification:

### Numeric parity test (the gate)

```sh
npm test
```

Runs every parity test. If your JSON diverges from the committed baseline at any tick, the failure points at the exact divergence:

```
defeat: divergence at tick 47 LED (2,1) — TS=0.421, JSON=0.418, diff 0.003
```

(The `TS=` label is a holdover from when the baselines were captured from the legacy TS builders. The baselines are now frozen artifacts of that capture and serve as the canonical contract.)

### Single-tower smoke test

```sh
npm run dev:example
```

Pick your sequence from the toolbar's Light Effects dropdown and click "Trigger". The player runs your JSON and the rendered tower shows the result. Watch a few cycles to be confident.

> **Side-by-side visual A/B (archived).** A `?ab=1` panel that rendered TS and JSON towers side-by-side previously lived here. With the legacy TS builders archived, the panel is no longer in tree. The full panel + revival recipe is preserved in `.local/legacy-sequence-system/example/` if you ever need to add a TS reimplementation of a new sequence and verify it side-by-side.

---

## Walkthrough: reading a complex sequence

If you want to internalize how the pieces fit, [src/sequences/data/victory.json](../src/sequences/data/victory.json) is a good study. It uses five different kinds:

- **`solid` × 6** — phase 0 reset, then bottom-up build (base → ledge → ring2 → ring1 → ring0). Each phase writes one or two layers at PWM 165 at a specific tick.
- **`discreteSet` mode `randomLed`** — phase 6 sparkle: every 4th tick from 649 through 709, drop one random LED to PWM 128.
- **`scaleAll`** — phase 6+7 ramp-up: every tick from 649 through 844, multiply every LED by 200/198. (Yes, scaleAll ramping up.)
- **`solid`** — phase 8 cut: write 0 to every LED at tick 845.
- **End anchor** — `endBehavior: "hold"` + `totalTicks: 1026` adds a no-op padding tween at tick 1026 so `onComplete` fires at the right time, matching the firmware's `Sequence_CompletedAndNotifyApp` timing.

Note the **track order** for the flurry phase: `discreteSet` (random drop) is registered before `scaleAll` (decay/ramp), matching the TS builder's "drop first, then decay" sequence within each tick.

---

## Pitfalls and FAQ

**Q: I added a JSON file but the player doesn't seem to use it.**
Check [src/sequences/jsonSequences.ts](../src/sequences/jsonSequences.ts) — your file needs an entry in both the import block and the `JSON_SEQUENCE_DATA` map. If a sequence id has no entry, `SequenceAnimator.apply(id)` returns `false` and the renderer plays nothing for it. The completeness assertion in `parity.test.ts` should catch this in CI.

**Q: My JSON parses but the parity test fails.**
The error message names the first divergence (`tick X, LED (Y, Z): TS=A, JSON=B`). Walk through what each side does at that tick and find where they differ. Common causes: track order wrong, wrong RNG draw order in a custom handler, off-by-one on `endTick` (it's exclusive), wrong `from` on a `subtractAll` shadow.

**Q: Schema parse fails with a Zod error.**
Check the field path in the error. Common: missing required field, wrong type (number where string expected), `level` AND `levelPwm` both set or both missing, `loop: true` with `endBehavior: "cutToBlack"`.

**Q: Can I put `//` comments in JSON?**
No — Vite's JSON import is strict. Use the `description` field at the sequence root and `_comment` field on individual tracks (the schema accepts them; the player ignores them).

**Q: The level I want is `0.10980392…` — is there a way to make that readable?**
Yes — wherever you see a `level`/`delta`/`floorLevel`/etc. field, there's a sibling `<name>Pwm` field that takes an integer 0..255. So `"deltaPwm": 28` instead of `"delta": 0.10980392156862745`.

**Q: Where do the firmware constants come from?**
The original TS builders that translated from the firmware C source are archived under `.local/legacy-sequence-system/builders/` for reference.

**Q: My sequence needs behavior that doesn't fit any kind.**
Use `custom` and register a TS handler via `registerCustomHandler('myId', ...)` from outside the player. If you find yourself doing this often, the kind is probably worth adding to `playerKinds/`.

---

## Further reading

- [src/sequences/data/](../src/sequences/data/) — the 21 existing JSON files. Read them as worked examples.
- [src/sequences/playerKinds/](../src/sequences/playerKinds/) — one file per kind, schema and handler co-located.
- [tests/sequenceSnapshots/parity.test.ts](../tests/sequenceSnapshots/parity.test.ts) — how parity is checked.
- `.local/legacy-sequence-system/` (off-tree, gitignored) — archived TS builders + A/B panel + recording test, with a README explaining how to revive any piece.
