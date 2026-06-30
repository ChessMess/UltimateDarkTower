# Return to Dark Tower — Canonical Scenario Schema

**v0.3 · Draft for review · The contract between Creator (produces) and Player (consumes) · Last updated: 2026-06-25**

> **Update (2026-06-25).** No JSON changes. Two §13 open questions resolved in lockstep with Rules-Engine Contract v0.3: **§13.1** month-end `randomInRange` is a uniform engine-PRNG draw bounded by the range; **§13.5** the seed's `allyId` and the main goal's companion are the **same entity** (the main companion). Also records the **known limitation** that official-app runs are not reproducible from a seed (only the factual setup section is usable). See §13.

> **This is the contract.** Per Creator PRD CR-8.1 and Player PRD §8, the scenario file is the single shared contract: the Creator validates against it on export, the Player validates against it on load, and *nothing downstream gets ahead of it*. This document supersedes the project's `Early_json_schema` (single-file) and the split `main/metadata/resources/ruleset` drafts — both are folded into one canonical schema here.

> **Grounding note — verified against `ultimatedarktower` `v4.1.0` (2026-06-23), not the `^2.3.0–v2.5.0` the catalog/PRDs assume.** The repo has moved past several documented assumptions. Corrections folded into this design (details in §13):
> - **Rosters are no longer "forthcoming."** `FOES` (12), `ADVERSARY_ROSTER` (8), `FOE_STATUSES` (5), `BOARD_LOCATIONS` (60), `GLYPHS`, and `HEROES` are **present in UDT v4.1.0**. The catalog §13 / PRD §8 "forthcoming in UDT; not UDT v2.3.0" notes are stale.
> - **There are 21 baked light sequences (`0x01–0x15`), not 19.** The schema therefore **never hardcodes the count** — it references a sequence by id and resolves it against the pinned `TOWER_LIGHT_SEQUENCES` at validation time.
> - **`TOWER_AUDIO_LIBRARY` is a UDT export** (12 `SoundCategory` values), resolving the catalog's "confirm whether the library is a UDT export or tooling-local" open question.
> - **Building types are exactly four** in UDT (`'Bazaar' | 'Village' | 'Sanctuary' | 'Citadel'`), confirming the 4-type model.
> - **Heroes are now in UDT but identity-only** (`id`/`name`/`source`/`startLocation?`); the rich gameplay data (7 warriors + 1 spirit start, move value, banner, 3+3 virtues) is still **not** in UDT — so CR-7.13.2 narrows but doesn't fully close.

---

## 1. Design decisions

Six decisions shape the schema. Each is a deliberate call against the alternatives.

1. **One canonical file, modular `$defs`.** A single self-contained schema (`scenario.schema.json`) with internal `$defs`, not the split four-file layout. The Player does one strict load-time validation; pinning, round-trip fidelity, and "no schema drift" are all simpler with one artifact. The split layout remains fine as an *authoring* convenience but is not the contract.

2. **JSON Schema draft 2020-12, closed everywhere.** Upgraded from the early schema's draft-07. Every object is `additionalProperties: false` (and `unevaluatedProperties: false` where `allOf`/`if` compose), and every vocabulary is a **discriminated union** (`oneOf` over a `const` discriminant). This is the structural half of the "bounded vocabulary" the PRD demands — the early schema's `additionalProperties: true` effects are deleted outright.

3. **The file *is* the executable graph.** Player PRD §6.1 is explicit: "the node graph the Creator produces is precisely what the Player walks at runtime." So the schema is not a flat config blob with an `event_flow` array (the early model). It has three live parts: **`graph`** (flow nodes + wires — the verbs/spine the engine walks), **`library`** (config nodes — the nouns referenced by id), and **`setup`** (scenario-wide levers + selections). Plus **`meta`**.

4. **Compose, never redefine.** Foes, the adversary, locations, statuses, glyphs, heroes (identity), light sequences, sound clips, and the Board `BoardState` all come from the ecosystem. The schema **references them by id** and resolves those ids against the **pinned** package versions in `meta.pins` — it does not restate their contents. Block catalog §0.1.

5. **Typed references = data, not free text.** CR-6.10's typed pins are encoded as typed reference fields: a foe ref is a kebab-case `FoeId`, a sequence ref is a `TOWER_LIGHT_SEQUENCES` key, etc. JSON Schema enforces shape (string + pattern); validation layer 2 (§9) enforces membership against the pinned enumeration. An invalid reference cannot survive to runtime.

6. **Four independent version numbers.** Deliberately separated so each can move on its own axis:
   - **`schemaVersion`** (in every file) — which version of *this contract* the file targets. Drives the Player's strict validation and the "no drift" rule.
   - **`meta.scenarioVersion`** — the *designer's* version of their own scenario (their `v0.1 → v0.2`).
   - **`meta.pins.*`** — the *ecosystem package* versions (UDT/Board/Display/board-game-creator/content) the file's references resolve against.
   - **document version** (this `.md`, v0.3) — the human-readable spec, aligned with the sibling Creator/Player/Catalog v0.3 docs.

---

## 2. Top-level structure

```jsonc
{
  "schemaVersion": "0.3.0",   // contract version (semver) — REQUIRED
  "meta":    { /* §3 — versioning, designer attribution, links/contact, pins, provenance */ },
  "setup":   { /* §4 — mode, difficulty, player-count scaling, month-end range, selections, board */ },
  "library": { /* §5 — config nodes: the scenario's nouns, keyed by id */ },
  "graph":   { /* §6 — flow nodes + wires: the scenario's verbs, walked at runtime */ }
}
```

All five keys are required; the root is `additionalProperties: false`.

---

## 3. `meta` — versioning, attribution, contact, pins, provenance

This block carries everything the request called out: **versioning**, **designer attribution**, and **links to get more info or contact the designer** — plus the ecosystem pins CR-8.1 requires and optional seed provenance.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string (req) | Scenario title |
| `description` | string | Short blurb |
| `scenarioVersion` | semver (req) | The designer's own version of this scenario |
| `designer` | object (req) | Attribution — see below |
| `designer.name` | string (req) | Display name |
| `designer.handle` | string | e.g. GitHub/social handle (`ChessMess`) |
| `designer.contact` | object | `{ email, url }` — how to reach the designer |
| `designer.links` | array | `[{ label, url, rel }]` — "more info" links; `rel ∈ {homepage, source, docs, video, social, support, other}` |
| `license` | string | SPDX id or free text |
| `createdAt` / `updatedAt` | date-time | Timestamps |
| `pins` | object (req) | Ecosystem versions this file resolves against — `udt`, `board`, `display`, `boardGameCreator`, `contentPack` (each semver). **The mechanism for "no schema drift."** |
| `contentSources` | array | Declared content origins — `base | alliances | covenant | expeditions` (UDT `ContentSource`). MVP = `["base"]`. |
| `provenance.importedSeed` | object | *Optional.* The 12-char seed this scenario was pre-filled from + its decoded **setup** section (`tier1Foe`/`tier2Foe`/`tier3Foe`/`adversary`/`ally`/`difficulty`/`source`/`expansions`/`playerCount`). **Provenance only** — the RNG section is never consumed (Creator §8). |
| `tags` | array of string | Discovery/filtering |

---

## 4. `setup` — scenario-wide levers + selections

The Select-* nodes' choices are hoisted here so the Player's setup UI and the validator have one authoritative place to read them (the graph still contains the Select nodes; they reference these values).

| Field | Notes |
| --- | --- |
| `mode` | `coop` (default) or `competitive`. Gates competitive-only nodes (§6). |
| `difficulty` | `{ profile: heroic\|gritty, turnsPerMonthModifier, skullSupply (default 24) }` |
| `playerCountScaling` | `{ turnsPerMonth: {1,2,3,4}, dormantKingdoms: {...} }` — average baseline 6/7/8/9; dormant-kingdom setup + skull-placement rules. **Scenarios must run 1–4 players.** |
| **`monthEnd`** | **The new contract field (Player §7.5.5).** `{ resolution: randomInRange\|triggerAdvanced, default: {minTurn, maxTurn}, perMonth?: {1..6: {minTurn, maxTurn}} }`. Per-month overrides win; otherwise `default` applies. `resolution` defaults to `randomInRange`; `triggerAdvanced` is the open alternative (§13). |
| `turnTimerSeconds` | Optional turn timer (Player §7.5.6). |
| `expansions` | Reserved/inert for MVP (`Alliances`/`Monuments` per UDT `ExpansionType`). |
| `selections` | `{ adversaryId (ADVERSARY_ROSTER FoeId), foes: {tier1, tier2, tier3} (FOES FoeIds — one each L2/L3/L4), mainGoalId (→ library.quests), allyId (→ library.companions) }` |
| `board` | The starting Board `BoardState`: either `boardStateRef` (a `library.resources.documents` key) **or** an embedded `boardState` object validated **opaquely** by Board's own schema at `pins.board`. The schema does **not** re-describe board contents (Creator §8, CR-7.2.1). |

---

## 5. `library` — config nodes (the nouns), keyed by id

Keyed objects (`id → definition`) so references resolve in O(1) and duplicate ids are structurally impossible. Where the ecosystem owns the type, the entry **wraps a reference + adds only net-new authoring fields** (catalog §13).

| Registry | Wraps / references | Net-new fields (summary) |
| --- | --- | --- |
| `resources` | early `resources` | `images/sounds/videos/documents`: `{ key: uri }` — feeds media (§H) + art |
| `heroes` | UDT `HEROES` + board-game-creator | `{ heroId (HeroId), source, ref: {package, version}, overrides? }` — **referenced, not authored**; identity from UDT, rich data from `pins.boardGameCreator` |
| `adversary` | UDT `ADVERSARY_ROSTER` | level-5 battle def, the-tower-acts behavior, adversary quest, main-goal pairing, **bespoke `tokenTypes`** (Ashstrider's River of Fire) |
| `foes` | UDT `FOES` + `FOE_STATUSES` | starting status, escalation triggers, strike behavior, cross-kingdom movement, traits (Advantage types), battle def |
| `buildingTypes` | UDT `BuildingType` (4) | exactly `citadel`/`sanctuary`/`village`/`bazaar`; each `free`/`enhanced` effects from `buildings.md`; `skullCapacity: 3`, destroy on 4th |
| `decks` / `cards` | early `cardArray` | deck category + cards + copy counts (gear = 3 each) + market size; card `effects[]` from the §F vocabulary (replaces open `additionalProperties`) |
| `companions` | — | main + recruitable; abilities; granting quest |
| `quests` | — | requirements (location/resource/foe/dungeon); success/failure outcomes; `spawnsDungeonId?`; `isMainGoal?` |
| `dungeons` | — | grid sub-editor: trait, grid size, master bitmap, entrance/target, rooms (§6 / catalog §5) |
| `lightSequences` | UDT `TOWER_LIGHT_SEQUENCES` / Display JSON | `{ source: named\|custom, namedId? (validated vs the 21 baked), custom? (Display sequence JSON, post-MVP) }` |
| `battleDefs` | — | per-foe-level card count; battle cards keyed to advantage thresholds → outcomes |
| `tokenTypes` | — | adversary primitives — see below |

**`tokenTypes` (the adversary primitives, catalog §F):**

```jsonc
{
  "id": "river-of-fire",
  "name": "River of Fire",
  "kind": "edgeToken",                 // boardToken | edgeToken | perHeroCounter
  "placement": "edge",                  // space | edge | heroBoard
  "removable": false,
  "crossingPenalty": { "resource": "warriors", "amount": 6 },   // River of Fire
  "threshold": null                     // perHeroCounter only — e.g. Spore: { "at": 3, "onReach": [<effect>] }
}
```

---

## 6. `graph` — flow nodes + wires (walked at runtime)

Node-RED-shaped: an array of nodes, each with `id`, a discriminated `kind`, `props`, and named-output `wires`. Plus the `entry` node and reusable `subflows` (Battle, Dungeon, Reinforce-at-building, reusable events — catalog §1.4).

```jsonc
{
  "entry": "n_game_start",
  "nodes": [
    { "id": "n_game_start", "kind": "lifecycle.gameStart", "surface": "app",
      "props": { "intro": { "title": "…", "splashResource": "img_intro" } },
      "wires": { "next": ["n_select_difficulty"] } }
    // …
  ],
  "subflows": {
    "battle": { "ports": { "in": ["enter"], "out": ["defeated", "retreated"] }, "entry": "…", "nodes": [ /* … */ ] }
  }
}
```

The `kind` enum is **closed** and mirrors the block catalog §3–§11 one-to-one. v0.3 fully specifies `props` for the lifecycle spine, turn actions, the effect/trigger/condition vocabulary, tower ops, media, and win/loss (the MVP-critical set); the remaining `kind`s are enumerated (so the vocabulary is closed) with `props` subschemas tracked for v0.4 (§13). The full list, by category:

- **A. Lifecycle:** `lifecycle.gameStart`, `lifecycle.importSeed`, `lifecycle.selectGameDifficulty`, `lifecycle.selectAdversary`, `lifecycle.selectFoes`, `lifecycle.selectMainGoal`, `lifecycle.selectAlly`, `lifecycle.boardSetup`, `lifecycle.startMonth`, `lifecycle.playerTurn`, `lifecycle.actionStart`, `lifecycle.actionMiddle`, `lifecycle.actionEnd`, `lifecycle.newMonthCheck`, `lifecycle.newQuests`, `lifecycle.gameEnd`
- **B. Turn actions:** `action.banner`, `action.move`, `action.cleanse`, `action.battle`, `action.quest`, `action.reinforce`, `action.skullDrop`, `action.endTurn`, `action.trade`
- **C. Battle/Dungeon:** `battle.selectFoe`, `battle.cardSelect`, `battle.applyAdvantage`, `battle.retreat`, `battle.end`, `battle.removeFoeNoBattle`, `battle.foeStatus`, `dungeon.subflow`, `dungeon.room`, `dungeon.relicTower`
- **D. Events:** `event.router`, `event.foesStrike`, `event.foesSpawn`, `event.foesGrow`, `event.towerStirs`, `event.towerActs`, `event.companion`, `event.newWares`, `event.readAloud`
- **E. Triggers/Conditions:** `trigger.schedule`, `trigger.onState`, `cond.check`, `cond.branch`, `cond.glyphGate`, `cond.random`, `cond.setFlag`
- **F. Effects (verbs):** see `$defs/effect` discriminant list (§7)
- **G. Tower:** see `$defs/towerOp` discriminant list (§8)
- **H. Media:** `media.playVideo`, `media.playSound`, `media.showImage`, `media.narration`, `media.cutscene`
- **I. Win/Loss:** `winloss.mainGoal`, `winloss.winCondition`, `winloss.lossCondition`, `winloss.competitiveEnd`
- **K. Graph hygiene:** `util.linkOut`, `util.linkIn`, `util.group`, `util.comment`, `util.catch`

---

## 7. Closed vocabularies

The heart of the contract. Each is a discriminated union; the discriminant is in **bold**.

### 7.1 `$defs/effect` — discriminated on **`op`**

`resource.gain` · `resource.lose` *(mandatory; unresolved → one corruption via `util.catch`)* · `resource.spend` *(optional)* · `corruption.gain` *(≤1 per source; 3rd = loss)* · `corruption.remove` · `virtue.activate` · `virtue.grant` · `item.gain` *(gear/treasure/potion/questItem)* · `item.enforceLimits` · `foe.spawn` · `foe.move` · `foe.remove` *(adversary exempt)* · `foe.escalateStatus` · `adversary.spawn` · `token.place` · `token.counterIncrement` · `token.remove` · `hero.placeOrMove` · `board.placeMonument` · `board.placeMarker` · `skull.place` · `skull.remove` · `building.destroy` · `skull.modifySupply` · `deck.draw` · `deck.discard` · `deck.reshuffle` · `market.refresh` · `market.acquireReplace` · `quest.complete` · `quest.spawnDungeon` · `quest.placeMarker` · `seal.remove` · `seal.replace` · `flag.set` · `counter.set`

> **Critical skull constraint.** There is **no effect that dictates how many skulls *emerge*** — emergence count is determined by the physical tower's internal state + rotation/seal action (Player §7.12.2). `skull.place {count}` carries a count only for **scenario-determined additions** (an event that explicitly adds N skulls); **tower emergence** is triggered by `tower.skullDropTrigger` (§8), which has **no count**, and the engine reacts to the reported counter. The validator (layer 3) rejects any attempt to attach an emergence count to a tower op.

### 7.2 `$defs/trigger` — discriminated on **`on`**

`schedule` `{ month?, turn?, everyNTurns? }` · `onState` `{ event: foeDefeated | corruptionGained | buildingDestroyed | sealRemoved | questComplete | mainGoalComplete | adversarySpawned }`

### 7.3 `$defs/condition` — composable

A leaf `{ subject, comparator, value }` where `subject ∈ {resource, flag, counter, sealsRemoved, foeOnSpace, heroAtLocation, …}` and `comparator ∈ {eq, ne, lt, lte, gt, gte, has, in}`, composed with `allOf`/`anyOf`/`not`.

### 7.4 Fixed reference enumerations (resolved at layer 2)

`Advantage ∈ {Beast, Magic, Humanoid, Melee, Undead, Stealth, Wild}` (Wild = any). **Dungeon `trait` excludes `Wild`.** `FoeStatus ∈ {panicked, unsteady, ready, savage, lethal}`. `Glyph ∈ {banner, quest, battle, reinforce, cleanse}`. `BoardKingdom ∈ {north, south, east, west}`. `BuildingType ∈ {citadel, sanctuary, village, bazaar}`. Each is validated against the matching UDT export at `pins.udt`.

---

## 8. Tower program model

Authored on a tick timeline; each op targets **one channel**. `$defs/towerOp` discriminated on **`channel`**:

`light.named` `{ sequenceId }` *(MVP — validated vs `TOWER_LIGHT_SEQUENCES`)* · `light.custom` `{ sequenceRef | inline DisplaySequenceJSON }` *(software-tower, post-MVP)* · `light.effect` `{ effectId (LIGHT_EFFECTS: off/on/breathe/breatheFast/breathe50percent/flicker), target }` *(physical primitive, post-MVP)* · `sound` `{ clipIndex | category (SoundCategory) }` *(`TOWER_AUDIO_LIBRARY`, firmware-bounded)* · `drum.rotate` `{ level: top|middle|bottom|all }` · `seal.break` · `seal.replace` · `skull.dropTrigger` *(no count)* · `wait` `{ atTick, endTick }` *(half-open `[atTick, endTick)`)* · `rotationBundle` `{ level }` *(drum + matching `rotation*` light as one unit)* · `timeline` `{ lanes: [perChannelOps] }`

**Timing rule (encoded as a layer-3 check):** cross-channel coordination uses **explicit `wait`s**; chaining on command-complete is invalid, because the tower reports "complete" when an action *starts* (Creator CR-7.8.3). **Hardware limits** surfaced at authoring and validated: 24 LEDs (6 layers × 4), 12 seals, 3 drum levels; rotation requires prior calibration.

---

## 9. Validation strategy (four layers)

The schema alone can't express everything; validation is layered, and **both apps run all four** (the Creator on export, the Player on load — Player §8 "a scenario that would fail mid-game must fail at load").

1. **Structural — JSON Schema (ajv, draft 2020-12).** Closed discriminated unions, `additionalProperties:false`, ranges, required fields. Catches unknown ops, malformed nodes, wrong types.
2. **Reference resolution.** Every typed id resolves either against the pinned ecosystem enumeration (`FOES`, `ADVERSARY_ROSTER`, `BOARD_LOCATIONS`, `TOWER_LIGHT_SEQUENCES`, `TOWER_AUDIO_LIBRARY`, `GLYPHS`, `HEROES`) at `meta.pins.*`, or against an intra-file `library` key. A pin mismatch or missing export is a **hard fail**, not a runtime surprise.
3. **Graph / semantic.** Reachability from `entry`; no orphan nodes; port-type compatibility on every wire; **exactly one target room** per dungeon and target-reachable-from-entrance; door geometry consistent; building types limited to the 4; foe selection = one each L2/L3/L4; main goal present; at least one win + the three default losses present; `monthEnd` `min ≤ max` and within player-count turn bounds; skull supply > 0; **no scenario-dictated emergence count**; competitive nodes only when `mode = competitive`.
4. **Simulation dry-run.** The Creator's step-through and the Player's engine walk the graph against fixtures. This is the ultimate check that *authored == runnable* — and the reason the engine is a **single shared implementation** (the lockstep risk in both PRDs).

---

## 10. Testing strategy

- **Golden scenario (the success metric, executable).** The MVP base game — main goal *Recover Azkol's Treasures*, adversary **Ashstrider**, foes **Brigands / Frost Trolls / Dragons** — authored against this schema, committed as a fixture, must pass all four layers **and** run end-to-end in the Player. This *is* the MVP bar made into a test.
- **Round-trip fidelity.** `export → import → export` is byte-identical under canonical JSON ordering (CR-7.13.1).
- **Conformance suite, shared by Creator + Player.** A corpus of `valid/` fixtures (must pass) and `invalid/` fixtures (must fail with a specific error code) — one per closed-vocab branch and one per semantic rule — lives **in the shared package** so both apps test against the same corpus. This is the mechanism that keeps the two engines in lockstep.
- **Negative tests for closure.** Each must fail at the named layer: an unknown effect `op` (L1), an out-of-roster `FoeId` (L2), a 5th building type (L1/L3), an emergence op carrying a count (L3), a dungeon with two target rooms (L3), a wire to a nonexistent node (L3), an unpinned ecosystem version (L2).
- **Pin-drift test.** Validate the same file against two pinned UDT versions; a renamed/removed export surfaces as an L2 reference failure — never a runtime crash.
- **Property/fuzz (optional).** Generate schema-valid random graphs; assert the validator never throws and the engine never deadlocks.

---

## 11. The schema (`scenario.schema.json`, draft 2020-12)

A real, implementable v0.3 covering the spine, the reusable `$defs`, and full MVP coverage. `kind`/`op`/`channel` discriminants are fully enumerated (the vocabulary is *closed*); `props` are fully specified for the MVP-critical kinds and marked `$comment: "props TBD — catalog §X"` where deferred to v0.4 (§13).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://chessmess.dev/rtdt/schemas/scenario.schema.json",
  "title": "Return to Dark Tower — Custom Scenario",
  "type": "object",
  "required": ["schemaVersion", "meta", "setup", "library", "graph"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "meta":    { "$ref": "#/$defs/meta" },
    "setup":   { "$ref": "#/$defs/setup" },
    "library": { "$ref": "#/$defs/library" },
    "graph":   { "$ref": "#/$defs/graph" }
  },

  "$defs": {
    "semver":  { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(?:[-+].+)?$" },
    "uri":     { "type": "string", "format": "uri" },
    "id":      { "type": "string", "pattern": "^[a-z0-9]+(?:[-_][a-z0-9]+)*$",
                 "$comment": "kebab/snake id; also the registry key" },
    "foeId":   { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                 "$comment": "L2: member of UDT FOES@pins.udt" },
    "advId":   { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                 "$comment": "L2: member of UDT ADVERSARY_ROSTER@pins.udt" },
    "heroId":  { "type": "string", "$comment": "L2: member of UDT HEROES@pins.udt" },
    "kingdom": { "enum": ["north", "south", "east", "west"] },
    "buildingType": { "enum": ["citadel", "sanctuary", "village", "bazaar"] },
    "foeStatus":    { "enum": ["panicked", "unsteady", "ready", "savage", "lethal"] },
    "glyph":        { "enum": ["banner", "quest", "battle", "reinforce", "cleanse"] },
    "advantage":    { "enum": ["Beast", "Magic", "Humanoid", "Melee", "Undead", "Stealth", "Wild"] },
    "dungeonTrait": { "enum": ["Beast", "Magic", "Humanoid", "Melee", "Undead", "Stealth"] },
    "resource":     { "enum": ["warriors", "spirit"] },
    "contentSource":{ "enum": ["base", "alliances", "covenant", "expeditions"] },
    "resourceKey":  { "type": "string", "$comment": "L2: key in library.resources.*" },

    "meta": {
      "type": "object",
      "required": ["title", "scenarioVersion", "designer", "pins"],
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "description": { "type": "string" },
        "scenarioVersion": { "$ref": "#/$defs/semver" },
        "designer": {
          "type": "object",
          "required": ["name"],
          "additionalProperties": false,
          "properties": {
            "name": { "type": "string", "minLength": 1 },
            "handle": { "type": "string" },
            "contact": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "email": { "type": "string", "format": "email" },
                "url": { "$ref": "#/$defs/uri" }
              }
            },
            "links": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["url"],
                "additionalProperties": false,
                "properties": {
                  "label": { "type": "string" },
                  "url": { "$ref": "#/$defs/uri" },
                  "rel": { "enum": ["homepage", "source", "docs", "video", "social", "support", "other"] }
                }
              }
            }
          }
        },
        "license": { "type": "string" },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" },
        "pins": {
          "type": "object",
          "required": ["udt"],
          "additionalProperties": false,
          "properties": {
            "udt": { "$ref": "#/$defs/semver" },
            "board": { "$ref": "#/$defs/semver" },
            "display": { "$ref": "#/$defs/semver" },
            "boardGameCreator": { "$ref": "#/$defs/semver" },
            "contentPack": { "$ref": "#/$defs/semver" }
          }
        },
        "contentSources": { "type": "array", "items": { "$ref": "#/$defs/contentSource" } },
        "provenance": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "importedSeed": {
              "type": "object",
              "required": ["seed"],
              "additionalProperties": false,
              "properties": {
                "seed": { "type": "string", "pattern": "^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$" },
                "decodedSetup": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "tier1Foe": { "type": "string" }, "tier2Foe": { "type": "string" },
                    "tier3Foe": { "type": "string" }, "adversary": { "type": "string" },
                    "ally": { "type": "string" }, "difficulty": { "enum": ["Heroic", "Gritty"] },
                    "source": { "enum": ["Core", "Competitive"] },
                    "expansions": { "type": "array", "items": { "enum": ["Alliances", "Monuments"] } },
                    "playerCount": { "type": "integer", "minimum": 1, "maximum": 4 }
                  }
                }
              }
            }
          }
        },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    },

    "turnRange": {
      "type": "object",
      "required": ["minTurn", "maxTurn"],
      "additionalProperties": false,
      "properties": {
        "minTurn": { "type": "integer", "minimum": 1 },
        "maxTurn": { "type": "integer", "minimum": 1 }
      },
      "$comment": "L3: minTurn <= maxTurn, within player-count turn bounds"
    },

    "setup": {
      "type": "object",
      "required": ["mode", "difficulty", "playerCountScaling", "monthEnd", "selections", "board"],
      "additionalProperties": false,
      "properties": {
        "mode": { "enum": ["coop", "competitive"], "default": "coop" },
        "difficulty": {
          "type": "object",
          "required": ["profile", "skullSupply"],
          "additionalProperties": false,
          "properties": {
            "profile": { "enum": ["heroic", "gritty"] },
            "turnsPerMonthModifier": { "type": "integer" },
            "skullSupply": { "type": "integer", "minimum": 1, "default": 24 }
          }
        },
        "playerCountScaling": {
          "type": "object",
          "required": ["turnsPerMonth"],
          "additionalProperties": false,
          "properties": {
            "turnsPerMonth": {
              "type": "object",
              "required": ["1", "2", "3", "4"],
              "additionalProperties": false,
              "properties": {
                "1": { "type": "integer", "minimum": 1 }, "2": { "type": "integer", "minimum": 1 },
                "3": { "type": "integer", "minimum": 1 }, "4": { "type": "integer", "minimum": 1 }
              }
            },
            "dormantKingdoms": { "type": "object", "$comment": "props TBD — catalog §13 Player-Count Scaling" }
          }
        },
        "monthEnd": {
          "type": "object",
          "required": ["resolution", "default"],
          "additionalProperties": false,
          "properties": {
            "resolution": { "enum": ["randomInRange", "triggerAdvanced"], "default": "randomInRange" },
            "default": { "$ref": "#/$defs/turnRange" },
            "perMonth": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "1": { "$ref": "#/$defs/turnRange" }, "2": { "$ref": "#/$defs/turnRange" },
                "3": { "$ref": "#/$defs/turnRange" }, "4": { "$ref": "#/$defs/turnRange" },
                "5": { "$ref": "#/$defs/turnRange" }, "6": { "$ref": "#/$defs/turnRange" }
              }
            }
          }
        },
        "turnTimerSeconds": { "type": "integer", "minimum": 0 },
        "expansions": { "type": "array", "items": { "enum": ["Alliances", "Monuments"] } },
        "selections": {
          "type": "object",
          "required": ["adversaryId", "foes", "mainGoalId"],
          "additionalProperties": false,
          "properties": {
            "adversaryId": { "$ref": "#/$defs/advId" },
            "foes": {
              "type": "object",
              "required": ["tier1", "tier2", "tier3"],
              "additionalProperties": false,
              "properties": {
                "tier1": { "$ref": "#/$defs/foeId" },
                "tier2": { "$ref": "#/$defs/foeId" },
                "tier3": { "$ref": "#/$defs/foeId" }
              },
              "$comment": "L3: tier1=L2, tier2=L3, tier3=L4 per FOES@pins.udt"
            },
            "mainGoalId": { "$ref": "#/$defs/id", "$comment": "L2: key in library.quests with isMainGoal" },
            "allyId": { "$ref": "#/$defs/id", "$comment": "L2: key in library.companions" }
          }
        },
        "board": {
          "type": "object",
          "oneOf": [
            { "required": ["boardStateRef"] },
            { "required": ["boardState"] }
          ],
          "additionalProperties": false,
          "properties": {
            "boardStateRef": { "$ref": "#/$defs/resourceKey" },
            "boardState": { "type": "object", "$comment": "opaque — validated by Board's schema @pins.board" }
          }
        }
      }
    },

    "effect": {
      "type": "object",
      "required": ["op"],
      "$comment": "Closed verb vocabulary — catalog §F. MVP-critical ops fully specified; remainder enumerated, props TBD v0.4.",
      "properties": {
        "op": {
          "enum": [
            "resource.gain", "resource.lose", "resource.spend",
            "corruption.gain", "corruption.remove", "virtue.activate", "virtue.grant",
            "item.gain", "item.enforceLimits",
            "foe.spawn", "foe.move", "foe.remove", "foe.escalateStatus", "adversary.spawn",
            "token.place", "token.counterIncrement", "token.remove",
            "hero.placeOrMove", "board.placeMonument", "board.placeMarker",
            "skull.place", "skull.remove", "building.destroy", "skull.modifySupply",
            "deck.draw", "deck.discard", "deck.reshuffle", "market.refresh", "market.acquireReplace",
            "quest.complete", "quest.spawnDungeon", "quest.placeMarker",
            "seal.remove", "seal.replace", "flag.set", "counter.set"
          ]
        }
      },
      "allOf": [
        { "if": { "properties": { "op": { "const": "resource.gain" } } },
          "then": { "required": ["resource", "amount"], "properties": {
            "op": true, "resource": { "$ref": "#/$defs/resource" }, "amount": { "type": "integer", "minimum": 1 } },
            "unevaluatedProperties": false } },
        { "if": { "properties": { "op": { "const": "resource.lose" } } },
          "then": { "required": ["resource", "amount"], "properties": {
            "op": true, "resource": { "$ref": "#/$defs/resource" }, "amount": { "type": "integer", "minimum": 1 } },
            "unevaluatedProperties": false,
            "$comment": "mandatory; unresolved → one corruption via util.catch" } },
        { "if": { "properties": { "op": { "const": "corruption.gain" } } },
          "then": { "properties": { "op": true }, "unevaluatedProperties": false,
            "$comment": "≤1 per source; 3rd = loss" } },
        { "if": { "properties": { "op": { "const": "foe.spawn" } } },
          "then": { "required": ["foeId", "location"], "properties": {
            "op": true, "foeId": { "$ref": "#/$defs/foeId" }, "location": { "type": "string" },
            "status": { "$ref": "#/$defs/foeStatus" } }, "unevaluatedProperties": false } },
        { "if": { "properties": { "op": { "const": "foe.escalateStatus" } } },
          "then": { "required": ["foeId"], "properties": {
            "op": true, "foeId": { "$ref": "#/$defs/foeId" }, "steps": { "type": "integer", "minimum": 1, "default": 1 } },
            "unevaluatedProperties": false } },
        { "if": { "properties": { "op": { "const": "skull.place" } } },
          "then": { "required": ["count", "kingdom"], "properties": {
            "op": true, "count": { "type": "integer", "minimum": 1 }, "kingdom": { "$ref": "#/$defs/kingdom" },
            "chooser": { "enum": ["homeOwner", "dropper"] } }, "unevaluatedProperties": false,
            "$comment": "scenario-DETERMINED additions only; emergence count is tower-determined (see tower.skullDropTrigger)" } },
        { "if": { "properties": { "op": { "const": "skull.modifySupply" } } },
          "then": { "required": ["delta"], "properties": {
            "op": true, "delta": { "type": "integer" } }, "unevaluatedProperties": false } },
        { "if": { "properties": { "op": { "const": "token.place" } } },
          "then": { "required": ["tokenTypeId", "target"], "properties": {
            "op": true, "tokenTypeId": { "$ref": "#/$defs/id" }, "target": { "type": "string" } },
            "unevaluatedProperties": false } },
        { "if": { "properties": { "op": { "const": "item.gain" } } },
          "then": { "required": ["itemType"], "properties": {
            "op": true, "itemType": { "enum": ["gear", "treasure", "potion", "questItem"] },
            "from": { "type": "string" } }, "unevaluatedProperties": false } }
      ],
      "$comment-extension": "ops without an allOf branch are valid by enum but props are unconstrained pending v0.4; layer-3 still applies"
    },

    "trigger": {
      "type": "object",
      "required": ["on"],
      "additionalProperties": false,
      "properties": {
        "on": { "enum": ["schedule", "onState"] },
        "month": { "type": "integer", "minimum": 1, "maximum": 6 },
        "turn": { "type": "integer", "minimum": 1 },
        "everyNTurns": { "type": "integer", "minimum": 1 },
        "event": { "enum": ["foeDefeated", "corruptionGained", "buildingDestroyed", "sealRemoved",
          "questComplete", "mainGoalComplete", "adversarySpawned"] }
      }
    },

    "condition": {
      "type": "object",
      "oneOf": [
        { "required": ["subject", "comparator", "value"], "additionalProperties": false,
          "properties": {
            "subject": { "enum": ["resource", "flag", "counter", "sealsRemoved", "foeOnSpace", "heroAtLocation"] },
            "comparator": { "enum": ["eq", "ne", "lt", "lte", "gt", "gte", "has", "in"] },
            "value": {}, "key": { "type": "string" } } },
        { "required": ["allOf"], "additionalProperties": false,
          "properties": { "allOf": { "type": "array", "items": { "$ref": "#/$defs/condition" } } } },
        { "required": ["anyOf"], "additionalProperties": false,
          "properties": { "anyOf": { "type": "array", "items": { "$ref": "#/$defs/condition" } } } },
        { "required": ["not"], "additionalProperties": false,
          "properties": { "not": { "$ref": "#/$defs/condition" } } }
      ]
    },

    "towerOp": {
      "type": "object",
      "required": ["channel"],
      "properties": {
        "channel": { "enum": ["light.named", "light.custom", "light.effect", "sound", "drum.rotate",
          "seal.break", "seal.replace", "skull.dropTrigger", "wait", "rotationBundle", "timeline"] }
      },
      "allOf": [
        { "if": { "properties": { "channel": { "const": "light.named" } } },
          "then": { "required": ["sequenceId"], "properties": {
            "channel": true, "sequenceId": { "type": "string", "$comment": "L2: key in TOWER_LIGHT_SEQUENCES@pins.udt (21 baked)" } },
            "unevaluatedProperties": false } },
        { "if": { "properties": { "channel": { "const": "sound" } } },
          "then": { "oneOf": [ { "required": ["clipIndex"] }, { "required": ["category"] } ],
            "properties": { "channel": true,
              "clipIndex": { "type": "integer", "minimum": 1 },
              "category": { "enum": ["Adversary", "Ally", "Battle", "Classic", "Unlisted", "Dungeon",
                "Foe", "Spawn", "Quest", "Glyph", "State", "Seals"] } },
            "unevaluatedProperties": false,
            "$comment": "TOWER_AUDIO_LIBRARY@pins.udt — confirmed a UDT export" } },
        { "if": { "properties": { "channel": { "const": "wait" } } },
          "then": { "required": ["atTick", "endTick"], "properties": {
            "channel": true, "atTick": { "type": "integer", "minimum": 0 }, "endTick": { "type": "integer", "minimum": 0 } },
            "unevaluatedProperties": false,
            "$comment": "half-open [atTick, endTick); 50 Hz / 20 ms per tick" } },
        { "if": { "properties": { "channel": { "const": "drum.rotate" } } },
          "then": { "required": ["level"], "properties": {
            "channel": true, "level": { "enum": ["top", "middle", "bottom", "all"] } },
            "unevaluatedProperties": false } },
        { "if": { "properties": { "channel": { "const": "rotationBundle" } } },
          "then": { "required": ["level"], "properties": {
            "channel": true, "level": { "enum": ["top", "middle", "bottom", "all"] } },
            "unevaluatedProperties": false } },
        { "if": { "properties": { "channel": { "const": "skull.dropTrigger" } } },
          "then": { "properties": { "channel": true }, "unevaluatedProperties": false,
            "$comment": "NO count — emergence count is tower-determined (Player §7.12.2)" } }
      ]
    },

    "tokenType": {
      "type": "object",
      "required": ["id", "name", "kind", "placement", "removable"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "name": { "type": "string" },
        "kind": { "enum": ["boardToken", "edgeToken", "perHeroCounter"] },
        "placement": { "enum": ["space", "edge", "heroBoard"] },
        "removable": { "type": "boolean" },
        "crossingPenalty": {
          "type": "object", "required": ["resource", "amount"], "additionalProperties": false,
          "properties": { "resource": { "$ref": "#/$defs/resource" }, "amount": { "type": "integer", "minimum": 1 } }
        },
        "threshold": {
          "type": ["object", "null"], "required": ["at", "onReach"], "additionalProperties": false,
          "properties": { "at": { "type": "integer", "minimum": 1 },
            "onReach": { "type": "array", "items": { "$ref": "#/$defs/effect" } } }
        }
      }
    },

    "buildingTypeDef": {
      "type": "object",
      "required": ["free", "enhanced", "skullCapacity"],
      "additionalProperties": false,
      "properties": {
        "free": { "type": "array", "items": { "$ref": "#/$defs/effect" } },
        "enhanced": {
          "type": "object", "required": ["cost", "effects"], "additionalProperties": false,
          "properties": { "cost": { "type": "object", "additionalProperties": false,
              "properties": { "resource": { "$ref": "#/$defs/resource" }, "amount": { "type": "integer", "minimum": 1 } } },
            "effects": { "type": "array", "items": { "$ref": "#/$defs/effect" } } }
        },
        "skullCapacity": { "const": 3 },
        "destroyOnSkull": { "const": 4 }
      }
    },

    "card": {
      "type": "object",
      "required": ["id", "name", "type"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/$defs/id" }, "name": { "type": "string" },
        "type": { "type": "string" }, "description": { "type": "string" },
        "effects": { "type": "array", "items": { "$ref": "#/$defs/effect" } }
      }
    },

    "deck": {
      "type": "object",
      "required": ["category", "cards"],
      "additionalProperties": false,
      "properties": {
        "category": { "enum": ["gear", "treasure", "potion", "corruption", "quest", "companion"] },
        "cards": { "type": "array", "items": {
          "type": "object", "required": ["cardId", "copies"], "additionalProperties": false,
          "properties": { "cardId": { "$ref": "#/$defs/id" }, "copies": { "type": "integer", "minimum": 1 } } } },
        "marketSize": { "type": "integer", "minimum": 0 }
      }
    },

    "room": {
      "type": "object",
      "required": ["id", "cell", "exits"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "cell": { "type": "object", "required": ["col", "row"], "additionalProperties": false,
          "properties": { "col": { "type": "integer", "minimum": 0 }, "row": { "type": "integer", "minimum": 0 } } },
        "exits": { "type": "object", "additionalProperties": false,
          "properties": { "N": { "enum": ["wall", "door"] }, "E": { "enum": ["wall", "door"] },
            "S": { "enum": ["wall", "door"] }, "W": { "enum": ["wall", "door"] } } },
        "insideEvent": { "type": "array", "items": { "$ref": "#/$defs/effect" } },
        "displayText": { "type": "string" },
        "bitmapSlice": { "$ref": "#/$defs/resourceKey" },
        "isEntrance": { "type": "boolean" },
        "isTarget": { "type": "boolean" },
        "improveOnce": { "type": "object", "$comment": "props TBD — catalog §5" },
        "enterRequirement": { "type": "object", "$comment": "props TBD — catalog §5" }
      }
    },

    "dungeon": {
      "type": "object",
      "required": ["id", "name", "trait", "grid", "masterBitmap", "rooms"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/$defs/id" }, "name": { "type": "string" },
        "trait": { "$ref": "#/$defs/dungeonTrait" },
        "grid": { "type": "object", "required": ["cols", "rows"], "additionalProperties": false,
          "properties": { "cols": { "type": "integer", "minimum": 1 }, "rows": { "type": "integer", "minimum": 1 } } },
        "masterBitmap": { "$ref": "#/$defs/resourceKey" },
        "rooms": { "type": "array", "items": { "$ref": "#/$defs/room" }, "minItems": 1 },
        "idleLight": { "type": "string", "default": "dungeonIdle" },
        "ambientSoundCategory": { "const": "Dungeon" },
        "spawningQuestId": { "$ref": "#/$defs/id" }
      },
      "$comment": "L3: exactly one isTarget room; target reachable from an entrance via doors; door geometry consistent; bitmap covers grid"
    },

    "lightSequenceAsset": {
      "type": "object",
      "required": ["source"],
      "additionalProperties": false,
      "properties": {
        "source": { "enum": ["named", "custom"] },
        "namedId": { "type": "string", "$comment": "L2: TOWER_LIGHT_SEQUENCES@pins.udt" },
        "custom": { "type": "object", "$comment": "Display sequence JSON @pins.display; post-MVP" }
      }
    },

    "library": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "resources": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "images":    { "type": "object", "additionalProperties": { "$ref": "#/$defs/uri" } },
            "sounds":    { "type": "object", "additionalProperties": { "$ref": "#/$defs/uri" } },
            "videos":    { "type": "object", "additionalProperties": { "$ref": "#/$defs/uri" } },
            "documents": { "type": "object", "additionalProperties": { "$ref": "#/$defs/uri" } }
          }
        },
        "heroes": { "type": "object", "additionalProperties": {
          "type": "object", "required": ["heroId", "source"], "additionalProperties": false,
          "properties": { "heroId": { "$ref": "#/$defs/heroId" }, "source": { "$ref": "#/$defs/contentSource" },
            "ref": { "type": "object", "additionalProperties": false,
              "properties": { "package": { "type": "string" }, "version": { "$ref": "#/$defs/semver" } } },
            "overrides": { "type": "object", "$comment": "props TBD — rich hero data not yet in UDT (CR-7.13.2)" } } } },
        "adversary": {
          "type": "object", "required": ["foeId"], "additionalProperties": false,
          "properties": { "foeId": { "$ref": "#/$defs/advId" }, "mainGoalId": { "$ref": "#/$defs/id" },
            "battleDefId": { "$ref": "#/$defs/id" }, "towerActsSubflow": { "$ref": "#/$defs/id" },
            "questId": { "$ref": "#/$defs/id" }, "tokenTypeIds": { "type": "array", "items": { "$ref": "#/$defs/id" } } } },
        "foes": { "type": "object", "additionalProperties": {
          "type": "object", "required": ["foeId"], "additionalProperties": false,
          "properties": { "foeId": { "$ref": "#/$defs/foeId" }, "startingStatus": { "$ref": "#/$defs/foeStatus" },
            "traits": { "type": "array", "items": { "$ref": "#/$defs/advantage" } },
            "battleDefId": { "$ref": "#/$defs/id" },
            "escalation": { "type": "array", "items": { "$ref": "#/$defs/trigger" } },
            "strike": { "type": "object", "$comment": "props TBD — catalog §13 Foe" },
            "movement": { "type": "object", "$comment": "props TBD — catalog §13 Foe" } } } },
        "buildingTypes": {
          "type": "object", "required": ["citadel", "sanctuary", "village", "bazaar"],
          "additionalProperties": false,
          "properties": {
            "citadel":   { "$ref": "#/$defs/buildingTypeDef" },
            "sanctuary": { "$ref": "#/$defs/buildingTypeDef" },
            "village":   { "$ref": "#/$defs/buildingTypeDef" },
            "bazaar":    { "$ref": "#/$defs/buildingTypeDef" }
          }
        },
        "decks": { "type": "object", "additionalProperties": { "$ref": "#/$defs/deck" } },
        "cards": { "type": "object", "additionalProperties": { "$ref": "#/$defs/card" } },
        "companions": { "type": "object", "additionalProperties": {
          "type": "object", "required": ["id", "name"], "additionalProperties": false,
          "properties": { "id": { "$ref": "#/$defs/id" }, "name": { "type": "string" },
            "abilities": { "type": "array", "items": { "$ref": "#/$defs/effect" } },
            "grantedByQuestId": { "$ref": "#/$defs/id" } } } },
        "quests": { "type": "object", "additionalProperties": {
          "type": "object", "required": ["id", "name"], "additionalProperties": false,
          "properties": { "id": { "$ref": "#/$defs/id" }, "name": { "type": "string" },
            "isMainGoal": { "type": "boolean" }, "spawnsDungeonId": { "$ref": "#/$defs/id" },
            "requirements": { "type": "array", "items": { "type": "object", "$comment": "props TBD — catalog §13 Quest" } },
            "outcomes": { "type": "object", "additionalProperties": false,
              "properties": { "success": { "type": "array", "items": { "$ref": "#/$defs/effect" } },
                "failure": { "type": "array", "items": { "$ref": "#/$defs/effect" } } } } } } },
        "dungeons": { "type": "object", "additionalProperties": { "$ref": "#/$defs/dungeon" } },
        "lightSequences": { "type": "object", "additionalProperties": { "$ref": "#/$defs/lightSequenceAsset" } },
        "battleDefs": { "type": "object", "additionalProperties": {
          "type": "object", "additionalProperties": false,
          "properties": { "cards": { "type": "array", "items": { "type": "object", "$comment": "battle-card outcomes keyed to advantage thresholds — props TBD v0.4" } } } } },
        "tokenTypes": { "type": "object", "additionalProperties": { "$ref": "#/$defs/tokenType" } }
      }
    },

    "node": {
      "type": "object",
      "required": ["id", "kind"],
      "additionalProperties": false,
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "kind": { "enum": [
          "lifecycle.gameStart", "lifecycle.importSeed", "lifecycle.selectGameDifficulty",
          "lifecycle.selectAdversary", "lifecycle.selectFoes", "lifecycle.selectMainGoal",
          "lifecycle.selectAlly", "lifecycle.boardSetup", "lifecycle.startMonth", "lifecycle.playerTurn",
          "lifecycle.actionStart", "lifecycle.actionMiddle", "lifecycle.actionEnd",
          "lifecycle.newMonthCheck", "lifecycle.newQuests", "lifecycle.gameEnd",
          "action.banner", "action.move", "action.cleanse", "action.battle", "action.quest",
          "action.reinforce", "action.skullDrop", "action.endTurn", "action.trade",
          "battle.selectFoe", "battle.cardSelect", "battle.applyAdvantage", "battle.retreat",
          "battle.end", "battle.removeFoeNoBattle", "battle.foeStatus",
          "dungeon.subflow", "dungeon.room", "dungeon.relicTower",
          "event.router", "event.foesStrike", "event.foesSpawn", "event.foesGrow",
          "event.towerStirs", "event.towerActs", "event.companion", "event.newWares", "event.readAloud",
          "trigger.schedule", "trigger.onState", "cond.check", "cond.branch", "cond.glyphGate",
          "cond.random", "cond.setFlag",
          "effect.apply",
          "tower.op",
          "media.playVideo", "media.playSound", "media.showImage", "media.narration", "media.cutscene",
          "winloss.mainGoal", "winloss.winCondition", "winloss.lossCondition", "winloss.competitiveEnd",
          "util.linkOut", "util.linkIn", "util.group", "util.comment", "util.catch"
        ] },
        "label": { "type": "string" },
        "surface": { "enum": ["app", "tower", "media", "silent", "authorOnly"] },
        "props": { "type": "object", "$comment": "per-kind subschema; effect.apply→effect[], tower.op→towerOp, cond.*→trigger/condition. Spine props specified v0.3; remainder v0.4." },
        "wires": { "type": "object", "additionalProperties": {
          "type": "array", "items": { "$ref": "#/$defs/id" } },
          "$comment": "named output → [target node ids]; L3 validates targets exist + port types match" }
      }
    },

    "graph": {
      "type": "object",
      "required": ["entry", "nodes"],
      "additionalProperties": false,
      "properties": {
        "entry": { "$ref": "#/$defs/id" },
        "nodes": { "type": "array", "items": { "$ref": "#/$defs/node" }, "minItems": 1 },
        "subflows": { "type": "object", "additionalProperties": {
          "type": "object", "required": ["ports", "entry", "nodes"], "additionalProperties": false,
          "properties": {
            "ports": { "type": "object", "additionalProperties": false,
              "properties": { "in": { "type": "array", "items": { "type": "string" } },
                "out": { "type": "array", "items": { "type": "string" } } } },
            "entry": { "$ref": "#/$defs/id" },
            "nodes": { "type": "array", "items": { "$ref": "#/$defs/node" } } } } }
      },
      "$comment": "L3: entry exists; all wire targets exist; no unreachable nodes; competitive nodes only when setup.mode=competitive"
    }
  }
}
```

---

## 12. Coverage check vs. block catalog §14

Every rule area in the catalog's base-game checklist maps to a schema location: setup levers + selections → `setup`; the month/turn/phase spine, turn actions, battle/dungeon, events, triggers, win/loss → `graph` node `kind`s; the closed effect/tower/media verbs → `$defs/effect` · `$defs/towerOp` · media kinds; the nouns (foes, adversary, buildings ×4, decks/cards, companions, quests, dungeons, light assets, tokens, heroes-by-reference, resources) → `library`. The two v0.3-added areas — **adversary bespoke tokens** (River of Fire / Spore) and **item gains + carry limits** — are `$defs/tokenType` and the `item.gain` / `item.enforceLimits` effects. The **month-end range** is `setup.monthEnd`.

---

## 13. Open questions & assumptions to verify

**Verified and corrected against UDT v4.1.0 (this pass):**
- Light sequences = **21** (`0x01–0x15`), not 19 → schema references by id, never by count.
- Rosters **present now** (`FOES`/`ADVERSARY_ROSTER`/`FOE_STATUSES`/`BOARD_LOCATIONS`/`GLYPHS`/`HEROES`) → the catalog §13 / PRD §8 "forthcoming" notes are stale; update them.
- `TOWER_AUDIO_LIBRARY` **is a UDT export** (12 `SoundCategory` values) → resolves the catalog's audio-source open question.
- `BuildingType` = exactly 4 → confirms the 4-type model.
- `LIGHT_EFFECTS` = 6 (`off/on/breathe/breatheFast/breathe50percent/flicker`) → confirms the firmware effect set.
- Foe ids are **kebab-case** (`shadow-wolves`, `ashstrider`) → the canonical reference key.

**Still open (modeled but flag-and-revisit):**
1. **✅ RESOLVED (Rules-Engine Contract v0.3 §10.1)** — Month-end within-range. `randomInRange` (default) vs `triggerAdvanced` both stay in the schema; the within-range pick is a **uniform engine-PRNG draw bounded by `[minTurn, maxTurn]`**, deterministic from the engine seed + input stream. The toolchain does not reproduce official-app runs (see §13 note below), so there is no official algorithm to match.
2. **Rich hero data source** — UDT carries hero *identity* only; warriors/spirit/move/banner/3+3 virtues live in board-game-creator (or a future UDT module). `library.heroes.overrides` is a placeholder until CR-7.13.2 resolves.
3. **Board `BoardState` shape** — embedded **opaquely** and validated by Board's schema at `pins.board` (pre-release). Confirm its serialization and version when Board publishes.
4. **Display custom-sequence JSON** — Tier-2 / post-MVP; pin and validate against `pins.display` when used. Not needed for the MVP (Tier-1 baked only).
5. **✅ RESOLVED (Rules-Engine Contract v0.3 §10.8)** — Main-goal companion vs. seed `ally`. They are the **same entity** — the *main companion*, tied to the selected main goal (content-verified: quests.md "a matching companion card is retrieved during setup"; lore.md "main companion tied to the selected main goal"). `setup.selections.allyId` IS the main goal's companion; recruited companions (Companion Quests) are a distinct set. The explicit goal→companion mapping table is still unenumerated (quests.md TODO), so the goal↔ally consistency check is gated on that content.

> **Known limitation (Rules-Engine Contract v0.3) — official-app runs are not reproducible.** `provenance.importedSeed` is used **only** for its decoded setup section. UDT's `SystemRandom` replicates the official RNG *stream* exactly, but the official app's generation logic that consumes it is unknown to us, so the seed's RNG section cannot be mapped to official game state. The engine uses its own engine-local PRNG seeded by a separate runtime seed; "same seed, identical game" against the official app is not achievable now and may never be.
6. **JSON Schema dialect alignment** — this schema is draft 2020-12; confirm Board/Display validators interoperate or run them as separate passes.

---

*Companion to: Creator PRD v0.3 (§8), Player PRD v0.3 (§8), Node Block Catalog v0.3 (§15). Supersedes: `Early_json_schema`.*
