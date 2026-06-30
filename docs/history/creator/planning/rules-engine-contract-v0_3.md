# Return to Dark Tower — Rules-Engine / Shared-Package Contract

**v0.3 · Draft for review · The contract for the shared rules engine that both apps run · Last updated: 2026-06-25**

> **v0.3 resolutions (determinism + ally/companion).** Two open questions are settled. **(1) PRNG & seed isolation (§6, §10.2):** the engine uses its **own engine-local PRNG** (a fully-specified deterministic generator — `pcg32` recommended — living in the shared package), seeded by a **separate runtime seed**, never by the official 12-char seed. The official seed is used **only** for its factual setup section (`decodeSeed().setup`); its RNG section is never consumed. This is now grounded in a hard limitation, not just a style choice — see the **known limitation** below. Consequently the `randomInRange` month-end pick (§4.5, §10.1) is simply a uniform engine-PRNG draw bounded by `[minTurn, maxTurn]`; there is no official within-range algorithm to match. **(2) Ally = main companion (§3.1, §10.8):** the seed's `allyId` and the main goal's companion are the **same entity** — the *main companion*, tied to the selected main goal (content-verified: quests.md "a matching companion card is retrieved during setup"; lore.md "main companion tied to the selected main goal"). Companions **recruited via Companion Quests** in play are a separate, growable per-hero set. **(3) Mutual-consent trade (§5.3, §10.9):** a trade is one **atomic, unanimous-by-construction `decision`** (host runs the negotiation; engine applies all transfers atomically or faults) over a **closed `TradeAsset` union** — warriors/spirit/item/companion only, so virtues and corruptions are structurally untradeable. **(4) Version compatibility (§8, §10 cross-ref):** all version checks use **semver-range satisfaction** (not exact-string), with the standard window — same *minor* pre-1.0, same *major* 1.0+ — applied uniformly to `schemaVersion`, `meta.pins.*`, and the Relay handshake.
>
> **Known limitation — official-app runs are not reproducible.** Given an official 12-char seed, the toolchain reproduces the same **factual setup** (`decodeSeed().setup` — foes/adversary/ally/difficulty/source), but **cannot reproduce a full official-app game**. UDT's `SystemRandom` replicates the official RNG *number stream* byte-for-byte, but the official app's **generation logic that consumes that stream** (what it draws, and in what order, to lay out board/quests/events) is not known to us — so the seed's RNG section cannot be mapped to official game state. This is by design irrelevant to authored scenarios (authored content replaces procedural generation), but a side-by-side "same seed, identical game" comparison against the official app is **not achievable now and may never be.** It is recorded here so no later work assumes otherwise.

> **v0.2 correction (observed → derived).** A cross-document finding (Relay protocol §10 Q12 / §11 R7, confirmed against UDT v4.1.0 + `UltimateDarkTowerDisplay` source on 2026-06-25) establishes that **glyph facing and seal presence are *not* tower-reported observations** — they are engine-owned. Glyph facing is *derived* from the engine's mirrored drum positions (UDT `getGlyphsFacingDirection`; drums home to a known position at calibration and move only on engine-commanded rotations). Seal selection is *engine-commanded* (UDT `breakSeal`), and seal presence has **no hardware sensor**, so it can only be *remembered* from commanded breaks, never read back. Only `skullCounter` and `towerState` remain genuinely observed. This version removes `sealIndicated`/`glyphRevealed` from the observed-input set (§5.4), rewrites the tower mirror (§3.4) and the seal/glyph verbs (§4.3–§4.4), and adds the engine's emission of app-level seal state to the Display target (§5.2), since seal state rides outside the 19-byte hardware `TowerState` packet.

> **This is a contract, not a tutorial.** It specifies the rules engine that the Creator *simulates* and the Player *runs live* — one implementation, two consumers. It sits **below** the scenario file and **above** the ecosystem: it never contradicts `scenario.schema.json` (`schemaVersion 0.3.0`), and it never re-describes anything UDT / Board / Display / Relay already own. Where the engine would need something the schema lacks, it is raised in §10 (Open Questions), never silently invented.
>
> **Grounding — verified against `ultimatedarktower` v4.1.0 (cloned `--depth 1`, grepped 2026-06-24).** Every external surface this contract depends on was checked against source, not assumed (this project has been burned by version drift before). Pinned and confirmed present in UDT v4.1.0's public API: `FOES` (12) / `ADVERSARY_ROSTER` (8) / `FOE_STATUSES` (5) / `ALL_FOES` / `FOE_BY_ID`; `BOARD_LOCATIONS` (60, keyed by `name`) + `BOARD_ADJACENCY` with `neighborsOf` / `stepDistance` / `shortestPath`; `HEROES` / `HERO_BY_ID` (identity-only); `MONUMENTS`; `BuildingType` (4: Bazaar/Village/Sanctuary/Citadel); `GLYPHS` (5); `LIGHT_EFFECTS` (6: off/on/breathe/breatheFast/breathe50percent/flicker); `TOWER_LIGHT_SEQUENCES` (21); `SoundCategory` (12) + `TOWER_AUDIO_LIBRARY`; `TowerState` + `rtdt_pack_state` / `rtdt_unpack_state` / `isCalibrated`; the seed parser (`decodeSeed` / `validateSeed` / `decodeRngSeed`) and `SystemRandom` (the byte-exact C# `System.Random` replica). MVP entities resolve in-roster: `brigands` (L2/T1), `frost-trolls` (L3/T2), `dragons` (L4/T3), `ashstrider` (adversary L5), ally `Zaida` — and `decodeSeed('AA9A-AAGS-W634')` round-trips to exactly that setup (Core / Heroic / 1P; no Main Goal in the seed, confirming it stays a Creator-level selection). **The engine resolves entities by reference (foe/hero/adversary by id; locations by name) at `meta.pins.udt`; it never hardcodes counts** (the schema's stance — §7.4 there).

---

## 0. What this is, in one paragraph

The rules engine is the **logic core** of the toolchain: a deterministic, near-pure reducer that takes a schema-valid scenario plus a stream of inputs and produces the next game state plus an ordered list of directives for a host to execute. The Creator drives it in a **simulator** (step-through preview against a software tower/board); the Player drives it in a **live runtime** (real table, real tower via the Relay). Because it is a single shared package, "what previewed" and "what plays" are the same computation — the **lockstep** guarantee. This document defines its boundaries (§1), where it lives (§2), the state it owns (§3), how it executes the graph (§4), the host interface (§5), determinism (§6), the validation it still performs (§7), versioning (§8), and how lockstep is tested (§9).

---

## 1. Purpose & boundaries

### 1.1 Two principles, stated up front

- **Zero duplication.** The engine owns *only* rules logic the ecosystem deliberately leaves to the host. It does **not** reimplement the movement graph, rosters, board placement validity, board rendering, tower hardware, BLE/transport, or UI. Anything UDT / Board / Display / Relay already solves is referenced or delegated, never restated (Creator PRD §2.2/§5, Player PRD §5).
- **Lockstep.** The Creator's simulator and the Player's runtime run the **identical** engine package at the **identical** version (a monorepo workspace dependency, §2). A behavioral divergence would mean a scenario plays differently than it previewed — the named risk in both PRDs. The engine's purity (§6) plus the shared test corpus (§9) make divergence detectable and, by construction, structurally hard.

### 1.2 What the engine owns vs. delegates

| Concern | Owner | The engine's relationship |
| --- | --- | --- |
| Turn/month/phase flow, heroic-action legality, reinforce, events, win/loss | **Engine** | Owns and computes |
| Per-hero resources / corruption / virtues / items / companions, foe **status** ladder, adversary cumulative advantages & quest progress, decks/market order, scenario flags/counters, dungeon cleared-state, skull **supply**, RNG | **Engine** | Owns and computes |
| Hero/foe/adversary **positions**, skulls-on-buildings, monuments, markers, building presence/destruction, **placement validity** | **Board** (`BoardState` + reducer @ `pins.board`) | Emits `board.mutate` directives; holds a read-side **projection** for rule evaluation (§3.3) |
| Movement graph, location/roster/status/glyph/monument **identity** | **UDT** v4.1.0 (@ `pins.udt`) | Resolves references via adapters; never restates contents |
| Skull **counter**, seals, revealed **glyphs**, drum positions, calibration, light/sound/rotation/seal **hardware** | **Tower** (via **Relay**) | Triggers actions through `tower.program` directives; **mirrors** tower state read-only from observed inputs (§3.4); never authors it |
| BLE / transport / fan-out / calibration | **Relay** | Never touched; the engine emits a command stream, the host routes it |
| Tower render / light playback / emulator; board render / editing UI; table UX | **Display / Board / host UI** | The host renders `ui.*` / `media.*` directives; the engine has no UI |

> **The skull invariant (non-negotiable, inherited from the schema and both PRDs).** No effect, and no directive, ever dictates **how many skulls emerge**. Emergence count is determined by the physical tower's internal state + rotation/seal action. The engine *triggers* emergence (a `tower.program` carrying `skull.dropTrigger`, which carries **no count**) and then *reacts* to the reported counter delta, which arrives as an observed input (§5.4). `skull.place {count}` exists only for **scenario-determined additions** (an event that explicitly adds N skulls), never for emergence.

---

## 2. Package shape

### 2.1 Where it sits

The monorepo ships two apps (Creator, Player) over **three shared workspace packages** (Creator PRD §2.4, Player PRD §2.4). Working names below are non-normative; the **roles** are the contract.

```
repo/
├── apps/
│   ├── creator/                 # imports engine for the simulator (§7.12 sim)
│   └── player/                  # imports engine for the live runtime
└── packages/
    ├── schema/    (role: scenario schema + types)   # scenario.schema.json + generated TS types + L1 validator (ajv 2020-12)
    ├── engine/    (role: rules engine)               # THIS CONTRACT — the reducer
    └── adapters/  (role: ecosystem adapters + validation)  # UDT/Board/Display/Relay wrappers + L2/L3 validation
```

External ecosystem packages (UDT, Display, Board, Relay client) are pinned **once at the workspace level** so both apps stay version-aligned (§8).

### 2.2 Dependency direction (the headless-engine rule)

The engine depends on `schema` (for the `ValidScenario` type and L1 outcome) and on `adapters` (for reference resolution, L2/L3 checks, and the directive **target contracts**). The engine has **no direct dependency on UDT / Board / Display / Relay.** Ecosystem data is *injected* by adapters at load; directives are *described* in adapter-defined shapes and executed by the host. This keeps the engine a pure logic core that runs and tests **headless**, with no hardware, no DOM, and no network.

```
creator/player  ─→  engine  ─→  schema
                       └──────→  adapters  ─→  (UDT / Board / Display / Relay)
```

### 2.3 Public exports (the engine API surface)

| Export | Kind | Purpose |
| --- | --- | --- |
| `init(scenario, opts) → StepResult` | fn | Validate (L2/L3 via adapters; L1 assumed done by `schema`), resolve references, build initial `EngineState`, advance to the first input boundary. `opts = { seed: string; playerCount: 1\|2\|3\|4; resolver }` — `resolver` is the adapter-provided pinned-ecosystem lookup (§2.2), so the engine stays headless and never imports UDT/Board directly. |
| `step(state, input) → StepResult` | fn | The reducer. Pure: `(EngineState, Input) → StepResult`. Advances the graph from the cursor until it blocks on input or reaches a terminal. |
| `EngineState` | type | Opaque, fully serializable runtime state (§3). Checkpointable. |
| `Input` | type | Closed host→engine union (§5.3). |
| `Directive` | type | Closed engine→host union (§5.2). |
| `StepResult` | type | `{ state, directives, status, awaiting? }` (§5.1). |
| `InputRequest` | type | What the host must collect when `status = "awaitingInput"` (§5.1). |
| `serialize(state) / deserialize(blob)` | fn | Stable, canonical (de)serialization for checkpoints and replay (§6, §9). |
| `replay(scenario, opts, inputs[]) → StepResult[]` | fn | Convenience driver: `init` then fold `step` over an input stream. The lockstep test harness (§9). |
| `ENGINE_VERSION`, `SUPPORTED_SCHEMA_RANGE` | const | Version metadata (§8). |

The Creator simulator and the Player runtime import **exactly these** — and differ only in how they *source* `Input` and *execute* `Directive` (§5).

---

## 3. Game-state model

`EngineState` is the complete authoritative runtime state the engine owns. It is opaque to the host, serializable, and the single thing a checkpoint persists (alongside Board's own versioned save and the last full-state tower command — Player §7.15).

### 3.1 Engine-owned state (authoritative here)

| Group | Contents |
| --- | --- |
| **Clock / cursor** | `month` (1–6), `turnInMonth`, the active **node id** (graph cursor) + sub-phase pointer, `turnOrder` (seating), `activeHero`, `firstPlayerOfMonth`, per-turn latches (`bannerUsed`, `heroicActionUsed`, `reinforceUsed`, `tradeUsed`, `itemLock`). |
| **Kingdom ownership** | Home-kingdom → hero mapping and the **dormant-kingdom set** (derived at setup from `playerCount`). Required by three rules: the skull-placement chooser (home owner vs. dropper), building-destroy corruption (home-kingdom owner only), and the glyph gate (a glyph facing a hero's *home* kingdom). |
| **Per hero** | `warriors`, `spirit`, `corruption` (0–2; a would-be 3rd ends the game), `virtues` (3 active + 3 inactive, which are active), `items` (`gear` set of ≤6 distinct types · `treasure` ≤4 · `potions` ∞ · `questItems` ∞), `companions` (the per-hero set **recruited via Companion Quests** — distinct from the game's single **main companion**, which is the seed's `allyId` tied to the main goal, §10.8), per-hero counter tokens (e.g. Spore). Hero **rich stats** (move value, banner, 7+1 start, 3+3 virtue identities) are *injected content* today (§10.3). |
| **Foes** | Foe instances: which roster `foeId`, `status` on the **panicked→unsteady→ready→savage→lethal** ladder, traits (Advantage types). *Positions* are a Board projection (§3.3). |
| **Adversary** | `spawned?`, cumulative **Advantages** applied to its battle (persist across battles/heroes/turns), bespoke tokens/counters (River of Fire edges; Spore counters live per-hero), adversary-quest progress. |
| **Skull economy** | `supply` (default 24; empty → loss). Skulls-on-buildings and building-destroyed state are a Board projection. |
| **Decks & market** | Per deck: draw-pile order (from the seeded shuffle), discard pile; the face-up treasure **market**; the **corruption** deck order. |
| **Flags / counters** | `scenarioFlags[name]`, `scenarioCounters[name]`, the `sealsRemoved` counter **and the broken-seal set** (*which* seals are removed, keyed `level-side` per UDT `SealIdentifier` — needed for glyph-reveal logic and for the Display target's persistent seal render, §5.2; mirrors UDT's `brokenSeals`), quest / main-goal completion, monthly companion+adversary quest state, dungeon **cleared-rooms** (per dungeon; persists across heroes). |
| **RNG** | The engine PRNG **seed + position** (§6). Advances only inside the engine. |
| **Outcome** | `status ∈ running / awaitingInput / won / lost / ended`, and the loss/win reason. |

### 3.2 What is a *reference*, not state

Roster identity (`FOES`, `ADVERSARY_ROSTER`, `FOE_STATUSES`, `HEROES`, `MONUMENTS`, `GLYPHS`), locations (`BOARD_LOCATIONS`), adjacency (`BOARD_ADJACENCY`), light sequences (`TOWER_LIGHT_SEQUENCES`), and audio (`TOWER_AUDIO_LIBRARY`) are **resolved by reference at load** (foes/heroes/adversary/monuments by id; locations by `name`; light sequences by key) against `meta.pins.udt` and held immutable. They are inputs to the engine, never part of mutable `EngineState`.

### 3.3 Board projection — consistency with `BoardState`

Board is the source of truth for **positions, placements, and placement validity**, and is what the table renders. The engine cannot reason without reading positions (conditions like `foeOnSpace`, `heroAtLocation`; movement legality), so `EngineState` carries a **minimal projection** of placements.

The projection stays consistent with Board by a **single-origin** rule: *every* placement change originates as an engine-computed mutation, which the engine (a) applies to its projection **and** (b) emits as a `board.mutate` directive for Board's reducer. Because both derive from one computation, they cannot silently diverge. Board may still **reject** a mutation on validity grounds (e.g. an off-graph space); the engine pre-checks validity via adapters (`neighborsOf` / `shortestPath`) before emitting, so a rejection is a **fault to surface**, not a state to reconcile. The one exception is the un-observable physical board (Player §7.15.3): on recovery, the host confirms physical placements with players; the engine projection remains authoritative for *digital* rule evaluation.

### 3.4 Tower mirror — read-only for what is observed; engine-owned for what is commanded

The engine holds a **read-only mirror** of the tower's *physical* state — but only **two** values genuinely come back from the tower via the Relay (§5.4): the **skull counter** (emergence delta) and **`towerState`** (drum positions + calibration, used mainly for resync after a drop/reconnect). Under normal play the engine tracks **drum positions from its own commanded rotations** (the drums home to a known position at calibration and move only when the engine commands a rotation), so it does not need the tower to report them turn-to-turn; `towerState` is the recovery re-sync, not a per-turn input.

Two things that *look* like tower reports are actually **engine-owned**, corrected in v0.2:

- **Glyph facing is derived, not observed.** Glyphs are fixed to the drums; given the mirrored drum positions, facing is a pure function (UDT `getGlyphsFacingDirection`). What a broken seal *reveals* (nothing vs. which glyph) is the same computation. The engine computes it; the tower never reports it.
- **Seal presence is engine-owned, not observed.** The engine (or scenario/player decision) *chooses* which of the 12 seals to break and commands the hardware to light it (UDT `breakSeal` → `sealReveal` animation). There is **no seal sensor**, so seal presence can only be *remembered* from commanded breaks (the broken-seal set, §3.1) — it can never be read back.

The mirror is never the engine's ground truth: the engine *acts* (triggers rotation, seal break, skull drop) and *reacts* only to what is truly physical — most importantly the emergence count, which the engine never predicts (the skull invariant, §1.2).

---

## 4. Execution model

### 4.1 The graph is the program; the engine is its interpreter

The file *is* the executable graph (Player §6.1; schema §3/§6). The engine walks `graph.nodes` from `graph.entry`, following named-output `wires`, maintaining the cursor in `EngineState`. The spine it walks is exactly the authored one (confirmed against the draft graph):

```
Game Start → Select Game & Difficulty → Select Adversary → Select Foes → (Select Main Goal / Select Ally) →
Board Setup → Start Month → Player Turn → { Action: Start, Action: Middle, Action: End } → … →
New Month Check → New Quests → (next Start Month) … → Game End
```

The engine **does not invent** this flow; it executes whatever the scenario authored, through the closed node-`kind` vocabulary (67 kinds; schema `$defs/node`).

**Execution vs. data wires.** The schema's `wires` are `{ namedOutput: [targetNodeIds] }` with no structural exec/data distinction (CR-6.12's exec/data split is an *optional* Power-Author UX affordance, not yet encoded). The engine therefore treats **every wire as an execution edge** ("then" — advance the cursor to the target). If the split later graduates to runtime semantics, a *data* edge would be side-effect-free, pull-evaluated when the consuming node reads its prop, and required to be acyclic — but that must land in the schema first (§10.4); v0.1 specifies execution semantics only.

### 4.2 Node interpretation by category

| Node category (schema `kind`) | Engine behavior |
| --- | --- |
| **Lifecycle** (`lifecycle.*`) | Sequence sub-phases and set legal actions; `startMonth` reads `setup.monthEnd` (+ any `monthEndOverride`); `newMonthCheck` resolves month-end within the authored range (§4.5); `playerTurn` orders turns clockwise; `gameStart`/`gameEnd` bound the run. |
| **Turn actions** (`action.*`) | Enforce per-turn legality (one heroic action → +2 spirit; one reinforce; banner non-deferrable; split-move allowed; item-lock after skull drop). Most emit `ui.prompt` (App surface) and resolve via player `decision` inputs. |
| **Battle / Dungeon** (`battle.*`, `dungeon.*`) | Run the subflows: battle = select foe → draw cards = foe level (2–4; adversary 5) → reveal → apply Advantages (≤10/action, no undo) → resolve; adversary allows retreat after ≥1 card and persists Advantages. Dungeon = enter → resolve room inside-event (1 Advantage/room, improvable once) → move through doors → clear target room → complete dungeon **and** its quest; cleared rooms persist per-hero. |
| **Events** (`event.*`) | `event.router` selects which events fire this turn and fans (via `util.linkOut/In`) to the category sub-graphs; skip foe events with no eligible foe on board. |
| **Triggers** (`trigger.*`) | Not walked inline — registered as hooks; the engine's scheduler/event bus injects them (§4.4). |
| **Conditions** (`cond.*`) | Evaluate a condition / glyph gate / RNG branch and route to a named output (§4.4); `cond.setFlag` writes a flag/counter. |
| **Effects** (`effect.apply`) | Apply the node's `effect` / `effects[]` — the 36 verbs (§4.3). |
| **Tower** (`tower.op`) | Emit `tower.program` directives — the 11 channels (§4.6). |
| **Media** (`media.*`) | Emit `media.play` directives (app/device cinematics; distinct from tower output). |
| **Win/Loss** (`winloss.*`) | Evaluate terminal conditions; `mainGoal` completion routes into `adversary.spawn`. |
| **Utility** (`util.*`) | `linkOut/In` are virtual wires; `group`/`comment` are inert; **`util.catch`** is the uniform "resolve what you can, gain one corruption" handler for unresolved mandatory losses (≤1 corruption per source). |

### 4.3 The instruction set — how each of the 36 effect verbs mutates state

Discriminated on `op` (schema `$defs/effect`). "Mutation" = change to `EngineState`; "Emits" = directive(s) handed to the host. Board-touching verbs update the projection **and** emit `board.mutate`. None of these verbs ever carries an emergence skull count.

**Resources & hero state**

| `op` | Mutation | Emits |
| --- | --- | --- |
| `resource.gain` | `hero[resource] += amount` | `ui.update` |
| `resource.lose` *(mandatory)* | `hero[resource] -= amount` (clamp ≥0); shortfall routes to `util.catch` → one corruption | `ui.update` |
| `resource.spend` *(optional)* | `hero[resource] -= amount` if afforded (else offered/blocked) | `ui.update` |
| `corruption.gain {source}` | Draw top corruption card, apply its effects now; `corruption += 1` (≤1 per source; would-be 3rd → loss) | `ui.prompt` (reveal) · `ui.update` |
| `corruption.remove {all\|count}` | `corruption -= count` (or all); removed card(s) to bottom of corruption deck | `ui.update` |
| `virtue.activate` | Flip one inactive virtue active | `ui.prompt` (if ambiguous) · `ui.update` |
| `virtue.grant {virtue}` | Add a scenario-granted virtue | `ui.update` |
| `item.gain {itemType, from?}` | Add `gear`/`treasure`/`potion`/`questItem`, possibly from a deck/market | `deck.draw`/`market` as needed · `ui.update` |
| `item.enforceLimits` | Enforce carry limits (gear one-of-each-6, treasure ≤4, potions/quest ∞); duplicate gear or 5th treasure forces a discard choice | `ui.prompt` · `ui.update` |

**Foes & adversary**

| `op` | Mutation | Emits |
| --- | --- | --- |
| `foe.spawn {foeId, location, status?}` | Add foe instance (status from config if omitted) | `board.mutate(spawnFoe)` · `ui.update` |
| `foe.move {foeId, to}` | Move instance (adapter validates `to` reachable) | `board.mutate(moveFoe)` |
| `foe.remove {foeId}` | Remove instance (adversary exempt from *no-battle* removal — a battle rule, not this verb) | `board.mutate(removeFoe)` |
| `foe.escalateStatus {foeId, steps?}` | Step status up the ladder (clamp at lethal) | `ui.update` |
| `adversary.spawn` | On main-goal completion: place adversary; set `adversary.spawned` | `board.mutate` · `tower.program` · `ui.update` |

**Tokens & counters (bespoke adversary mechanics)**

| `op` | Mutation | Emits |
| --- | --- | --- |
| `token.place {tokenTypeId, target}` | Place a typed token on a space/edge per its `tokenType` (e.g. River of Fire edge; non-removable) | `board.mutate` |
| `token.counterIncrement {tokenTypeId, hero?, amount?}` | Increment a per-hero counter; on reaching `threshold.at`, run `threshold.onReach` (e.g. Spore → clear all + one corruption) | `ui.update` |
| `token.remove {tokenTypeId, target}` | Remove token if `removable` (else fault) | `board.mutate` |

**Hero/board placement**

| `op` | Mutation | Emits |
| --- | --- | --- |
| `hero.placeOrMove {hero?, to}` | Place/move a hero figure (adapter validates space) | `board.mutate(placeHero)` |
| `board.placeMonument {location}` | Record monument | `board.mutate(placeMonument)` |
| `board.placeMarker {location, markerType?}` | Record marker | `board.mutate(placeMarker)` |

**Skulls & buildings** *(scenario-determined only; emergence is observed, never authored)*

| `op` | Mutation | Emits |
| --- | --- | --- |
| `skull.place {count, kingdom, chooser?}` | Place `count` scenario-added skulls in `kingdom`; `chooser = homeOwner\|dropper`; `supply -= count`; capacity/destroy rules apply | `ui.prompt` (choose building) · `board.mutate(placeSkull)` |
| `skull.remove {count}` | Remove `count` skulls; return to supply | `board.mutate` |
| `building.destroy {location}` | Remove building + its 3 skulls (4th → supply); home-kingdom owner gains one corruption (none dormant) | `board.mutate(removeBuilding)` · possible `corruption.gain` |
| `skull.modifySupply {delta}` | `supply += delta` (difficulty lever) | `ui.update` |

**Decks & market**

| `op` | Mutation | Emits |
| --- | --- | --- |
| `deck.draw {deck}` | Draw top of deck (seeded order) | `ui.update` |
| `deck.discard {deck, card?}` | Move card to discard | — |
| `deck.reshuffle {deck}` | Shuffle discard into draw using the engine PRNG (advances RNG state) | — |
| `market.refresh` | Replace face-up treasures (New Wares) | `ui.update` |
| `market.acquireReplace {card?}` | Market interaction the scenario allows | `ui.prompt`/`ui.update` |

**Quests & seals & variables**

| `op` | Mutation | Emits |
| --- | --- | --- |
| `quest.complete {quest}` | Mark complete; run `outcomes.success`; may grant companion/quest item; if `isMainGoal` → fires `mainGoalComplete` → `adversary.spawn` path | fires onState event |
| `quest.spawnDungeon {quest, dungeon}` | Instantiate the dungeon subflow + board token | `board.mutate` |
| `quest.placeMarker {quest, location?}` | Place quest/main-goal marker | `board.mutate(placeMarker)` |
| `seal.remove` | `sealsRemoved += 1`; **add the chosen seal to the broken-seal set** (which seal is engine-/scenario-/player-chosen, not observed); whether a glyph is revealed is **derived** from the mirrored drum positions; any emergent skulls arrive as the observed `skullCounter` | fires onState event · (paired `tower.program` `seal.break` → `sealReveal`) · `ui.prompt` (pause for physical removal) · seal-state update to the Display target (§5.2) |
| `seal.replace` | Inverse: remove the seal from the broken-seal set / `sealsRemoved -= 1` | (paired `tower.program`) · seal-state update to the Display target |
| `flag.set {name, value}` | `scenarioFlags[name] = value` | — |
| `counter.set {name, value}` | `scenarioCounters[name] = value` | — |

> **`seal.remove` (effect) vs. `seal.break` (tower op).** The **effect** mutates the game-state seal model (`sealsRemoved` + the broken-seal set — *which* seal, engine-chosen). The **tower op** commands the hardware (`breakSeal` → the `sealReveal` animation lighting the seal to remove). A "remove a seal" moment pairs both: the engine picks the seal, increments the state model, emits the `seal.break` animation, **pauses with a `ui.prompt`** while the player physically removes the seal, then continues on the player's `decision`. Whether a glyph sits behind it is **derived** from the mirrored drum positions (§3.4) — not observed. The only thing the engine waits on from the tower is the emergent `skullCounter` (§5.4). The same split applies to `seal.replace`.

### 4.4 Conditions, triggers, and routing

- **Conditions** (`$defs/condition`) are **pure** boolean predicates over `EngineState` + the board projection. Leaf form `{ subject, comparator, value, key? }` with `subject ∈ {resource, flag, counter, sealsRemoved, foeOnSpace, heroAtLocation}` and `comparator ∈ {eq, ne, lt, lte, gt, gte, has, in}`, composed with `allOf`/`anyOf`/`not`. Side-effect-free; evaluating a condition never mutates state.
- **Triggers** (`$defs/trigger`) are hooks, not walked inline. `schedule {month?, turn?, everyNTurns?}` is checked by the engine's scheduler at phase boundaries; `onState {event}` (`foeDefeated`, `corruptionGained`, `buildingDestroyed`, `sealRemoved`, `questComplete`, `mainGoalComplete`, `adversarySpawned`) is fired by an event bus when the engine raises the matching internal event. A fired trigger **injects execution** at its node's outputs.
- **Determinism of firing order.** When multiple triggers/events are eligible at the same boundary, the engine fires them in a **fixed total order**: schedule before onState, then ascending by node id. This guarantees two runs order identically (§6).
- **Glyph gate** (`cond.glyphGate`): while a revealed glyph faces the acting hero's home kingdom, the matching action (Banner/Quest/Battle/Reinforce/Cleanse) requires 1 spirit, else it is blocked. Glyph facing is **derived** from the engine's mirrored drum positions (UDT `getGlyphsFacingDirection`, §3.4) — not a tower report.

### 4.5 Phase sequencing — the MVP-critical ordering

**Action: End** runs a fixed sub-sequence (rules.md "End of Turn"; Player §7.5.4, §7.12):

1. **Skull drop (mandatory).** Take one skull from `supply` to drop into the tower: `supply -= 1`. **If `supply` is empty when the drop is required → immediate loss** (the empty-supply loss condition fires exactly here). Emit `tower.program(skull.dropTrigger)` — **no count** — and **set `itemLock`** for the rest of this turn. (The dropped skull enters the tower; emergent skulls tumble *out* and do not further decrement `supply`.)
2. **Await the counter.** Block on an observed input `skullCounter` (the tower-reported emergence delta). The engine never assumes the value (the skull invariant).
3. **Place emergent skulls first** (before events): in the kingdom of emergence, home-kingdom owner chooses for their own kingdom, the dropper chooses for dormant kingdoms (`ui.prompt`); apply capacity (a 4th skull destroys the building → home-owner corruption, none dormant).
4. **Then resolve Event(s).** `event.router` selects fired events; each runs its sub-graph (effects / tower / media).
5. **End Turn.** Advance clockwise; hand to **New Month Check**.

**New Month Check** resolves month-end **within the authored range** (`setup.monthEnd`): per-month override wins, else `default`. The `resolution` policy is `randomInRange` (default) or `triggerAdvanced`. The engine guarantees the resolved end is **bounded by `[minTurn, maxTurn]`** and **deterministic from the seed + input stream**; the exact within-range algorithm is **open** (§10.1) and must not be guessed here. On month-end (months 2+): run **New Quests** — a companion quest (reward on success) and an adversary quest (adversary advances on failure); both fail if unfinished. Then **Start Month** for the next month, or **Game End** after month 6.

### 4.6 Tower ops and the tick timeline

`tower.op` nodes (schema `$defs/towerOp`, 11 channels: `light.named` · `light.custom` · `light.effect` · `sound` · `drum.rotate` · `seal.break` · `seal.replace` · `skull.dropTrigger` · `wait` · `rotationBundle` · `timeline`) compile to `tower.program` directives. Cross-channel coordination uses **explicit `wait` ops** on the 50 Hz / 20 ms tick timeline — **never chain on command-complete**, because the tower reports "complete" when an action *starts* (Creator CR-7.8.3; schema §8). MVP light authoring is **Tier-1 baked sequences only** (`light.named` → one of the 21 `TOWER_LIGHT_SEQUENCES`); `light.custom`/`light.effect` are post-MVP (software-tower).

> **"Tick" is a tower-program substructure, not the engine's clock.** The engine's `step` is **discrete and event-driven** (one input → advance the graph), not real-time. The 50 Hz tick belongs to the *tower program* carried inside a `tower.program` directive and is played by the Relay/Display. The engine **resolves and emits** the tick timeline; it does not tick. This is why one `step` API drives both the simulator (which renders the program against Display) and the runtime (which sends it to the Relay) **identically** (§5).

---

## 5. Host-directive interface

The engine is a **near-pure reducer**: `(EngineState, Input) → (EngineState, Directive[])`, surfaced as `init` / `step`. The host *executes* directives and *feeds back* inputs.

### 5.1 The step contract

```ts
interface StepResult {
  state: EngineState;          // next state; the input state is never mutated
  directives: Directive[];     // ordered side-effects for the host to execute, in order
  status: "running" | "awaitingInput" | "won" | "lost" | "ended";
  awaiting?: InputRequest;      // present iff status === "awaitingInput"
}

interface InputRequest {
  id: string;                   // correlates the player's decision back to this request
  kind: "choice" | "target" | "advantageSpend" | "confirm" | "rollDecision" | "observed";
  options?: Choice[];           // for choice/target kinds
  observed?: ObservedKind;      // when the engine is waiting on a tower-reported value (§5.4)
  // ...node-specific payload (prompt text lives in the paired ui.prompt directive)
}
```

`step` advances from the cursor, applying effects and emitting directives, **until** it reaches a node needing host input (an App-surface prompt, a choice, a decision to roll, or a tower observation) or a terminal. It then returns `awaitingInput` (with the `InputRequest`) or a terminal status. The host collects exactly the requested input and calls `step` again. **One driver, two consumers** — the Creator scripts the inputs; the Player gathers them from players and the Relay.

### 5.2 Directive vocabulary (engine → host, closed)

| Directive | Target | Carries |
| --- | --- | --- |
| `tower.program` | **Relay** | A resolved tower program: one or more `towerOp`s and/or a `timeline` with `wait`s on the 50 Hz tick. Idempotent / full-state where the protocol allows. **Never** an emergence count. **Broken-seal state travels alongside, not inside, this program:** seal presence is not part of the 19-byte packed `TowerState` (it has no hardware field), so the engine emits the current broken-seal set as an app-level companion to the snapshot. The **physical-tower** target ignores it (no seal sensor; the seal is removed by hand); the **Display (emulator)** target renders persistent open/sealed doorways from it via its `applySeals(SealIdentifier[])` surface (Relay protocol §5.6 / R12). |
| `board.mutate` | **Board reducer** | A named Board command + args (`spawnFoe`, `moveFoe`, `removeFoe`, `placeHero`, `placeSkull`, `removeBuilding`, `placeMonument`, `placeMarker`, …). Board validates placement. *Verified 2026-06-24:* UDT v4.1.0 carries the Board **reference layer only** (`udtGameBoard` + re-exported rosters); the reducer + `BoardState` live in the unpublished `ultimatedarktowerboard`, so the command names here track the PRDs' examples (`spawnFoe`/`placeHero`) and the **exact set pins to Board @ `pins.board`** when it ships (§10.5). |
| `ui.prompt` | **Host UI (table)** | A blocking screen/choice/read-aloud/confirm (App surface): prompt text, button labels, options, and the `InputRequest.id` it expects back. |
| `ui.update` | **Host UI (HUD)** | Non-blocking state deltas to reflect: resources, foe status, corruption, virtues, items, market, flags, supply. |
| `media.play` | **Host (Display/device)** | App/device cinematics (`media.*`): video / sound / image / narration / cutscene — distinct from tower output. |
| `log.entry` | **Host (play log)** | A structured session record (turn, intent, event, tower command, outcome) for designer review/replay (Player §7.17.1). Emitted alongside material directives. |

### 5.3 Input vocabulary (host → engine, closed)

| Input | Meaning |
| --- | --- |
| `decision` | A player's response to a `ui.prompt` / `InputRequest`: selected option id, target selections (which foe / building / space / card), Advantage spends, quantities, or a **mutual-consent trade** (the atomic, unanimous-by-construction trade shape — §10.9). Keyed by `InputRequest.id`. |
| `rollDecision` | The player's choice to take an optional roll (e.g. the **decision to roll the haggle die**). The *outcome* is engine-resolved (§5.4 / §6) — except a physically rolled die, which arrives as `observed`. |
| `observed` | A host-reported value the engine cannot compute (§5.4). Becomes part of the canonical input stream so replays reproduce it exactly. |
| `control` | Session control unrelated to game logic (pause/resume/checkpoint-restore). Does not advance the graph. |

### 5.4 Observed inputs — the bridge for physical nondeterminism

Some values are determined by the physical world, not the engine. They enter as `observed` inputs and become first-class members of the canonical input stream (so a recorded session replays bit-identically — §6, §9):

| `ObservedKind` | Source | Why it must be observed, not computed |
| --- | --- | --- |
| `skullCounter` | Tower via Relay | **The emergence count** — tower-determined; the skull invariant forbids the engine predicting it. |
| `towerState` | Tower via Relay | Drum positions, calibration, full-state resyncs after a drop/reconnect. Used for **recovery**, not as a per-turn input (the engine tracks drum positions from its own commanded rotations, §3.4). |
| `physicalDie` | The table (optional) | A haggle die rolled with the physical die instead of the engine PRNG. |

> **Not observed (corrected v0.2): `sealIndicated`, `glyphRevealed`.** Earlier drafts listed these as observed. They are not. *Which* seal a "remove a seal" moment indicates is **engine-chosen** and commanded to the hardware (`breakSeal`); the tower's glowing lights are an engine-driven *output*, not a value read back, and seal presence has no sensor (§3.4). Which glyph is revealed, and its facing, is **derived** from the engine's mirrored drum positions (`getGlyphsFacingDirection`). Listing them as observed would make the engine block on inputs that never arrive, or compute the same value twice on two sides — the exact divergence lockstep forbids.

Engine-internal randomness (deck shuffles, `randomInRange` month-end, an engine-resolved haggle die) is **seeded** (§6) and needs no observed input. The split is deliberate: anything the engine *can* reproduce from the seed, it owns; anything the physical world decides, the host observes and the engine records.

---

## 6. Determinism & RNG

Lockstep requires that, given **the same seed and the same input stream**, `init` + `step*` produce **bit-identical** results in the Creator simulator and the Player runtime.

- **Purity.** `init` and `step` are pure functions. They mutate nothing outside their return value; they read no clock, no global, no network. All nondeterminism is captured in two places: the seeded PRNG (in `EngineState`) and the `observed` inputs (in the input stream).
- **The engine seed is *not* the official game seed — and structurally cannot be.** `meta.provenance.importedSeed.seed` is the official 12-char seed and is **provenance only** — its RNG section is never consumed (Creator §8). Only its setup section is read (`decodeSeed().setup`, for factual selections). The engine's PRNG seed is a **separate runtime seed** established at `init(opts.seed)`, stored in `EngineState`, advanced **only** by the engine, and serialized with every checkpoint so save/resume and replay survive intact. This separation is not just hygiene: we **could not** drive the engine from the official RNG section even if we wanted to, because the official app's generation logic that consumes that stream is unknown to us (the v0.3 known limitation). Keeping the engine PRNG a distinct generator makes "we are not recreating official runs" structurally true. Conflating the two is a bug; this contract forbids wiring the official seed into the engine PRNG.
- **Who advances it.** Only the engine, and only at defined draw points (`deck.reshuffle`, `deck.draw` from a shuffled deck, `cond.random`, `randomInRange` month-end). The host never touches RNG state. Identical draw order ⇒ identical results.
- **Reproducibility = seed + input stream.** The Creator simulator supplies a synthetic stream (scripted `decision`s + scripted `observed` values); the Player records the real stream. A recorded Player stream replayed in the simulator reproduces the run exactly — the basis of the lockstep test (§9).
- **Algorithm — resolved (v0.3).** The engine uses an **engine-local PRNG** defined in the shared `engine` package (so both consumers use the same bytes by construction), **not** UDT's `SystemRandom`. `SystemRandom` exists to replicate the *official* seed's RNG and stays confined to seed parsing; reusing it as the gameplay PRNG would blur the official-vs-engine boundary and carries a bulky 56-int state. The recommended generator is **`pcg32`** (well-specified reference, deterministic, compact serializable state); the contractual requirement is only that the generator be **fully specified, identical across consumers, and serialized (state + position) in `EngineState`** — the specific choice may be ratified at implementation, but it must be one engine-local generator, used everywhere.

---

## 7. Validation handoff

The engine assumes a **schema-valid** scenario — the Player refuses invalid files before run, and the Creator gates export (schema §9; Player §8). Validation is layered; the engine performs L2/L3 (via `adapters`) at **load**, trusts L1 from `schema`, and enforces only **dynamic legality** at **run**.

| Layer | Who | When | What |
| --- | --- | --- | --- |
| **L1 Structural** | `schema` (ajv 2020-12) | Before the engine | Closed discriminated unions, `additionalProperties:false`, ranges, required fields, the 36 ops / 11 channels / 67 kinds. The existing **12-case conformance suite** lives here (§9). |
| **L2 Reference** | `adapters` (engine load) | At `init` | Every typed id resolves against the pinned ecosystem enumeration (`FOES`/`ADVERSARY_ROSTER`/`FOE_STATUSES`/`BOARD_LOCATIONS`/`TOWER_LIGHT_SEQUENCES`/`TOWER_AUDIO_LIBRARY`/`GLYPHS`/`HEROES`@`pins.udt`) **or** an intra-file `library` key. A pin mismatch or missing export is a **hard load fail**. |
| **L3 Graph/semantic** | `adapters` + engine | At `init` | `entry` exists; all wire targets exist; **no unreachable nodes**; port-type compatibility; exactly one `isTarget` room per dungeon + reachable from an entrance; door geometry consistent; building types = the 4; foe selection one each L2/L3/L4; main goal present; ≥1 win + the three default losses; `monthEnd` `min ≤ max` within player-count turn bounds; `supply > 0`; **no scenario-dictated emergence count**; competitive nodes only when `mode = competitive`. |
| **L4 Simulation** | engine (this package) | Tests + preview | The dry-run that proves *authored == runnable* — the reason the engine is one shared implementation (§9). |

**At run, the engine trusts L1–L3 held** and does **not** re-validate structure each step. It enforces only what is decided at runtime: one heroic action per turn, one reinforce, banner non-deferrable, affordability of spends, the post-drop item-lock, capacity on placement, and corruption caps. If a host-reported observation contradicts an invariant (e.g. Board rejects a pre-checked placement, or a counter delta is impossible), the engine raises a **fault** and surfaces it — it never silently coerces and never proceeds into an inconsistent state. *A scenario that would fail mid-game must have failed at load* (Player §8).

---

## 8. Versioning & compatibility

Four version axes already exist (schema §1.6): `schemaVersion` (the contract), `meta.scenarioVersion` (the designer's), `meta.pins.*` (ecosystem packages), and the doc version. The engine adds one:

- **`ENGINE_VERSION`** (semver) — the rules-engine package version. Because it is a monorepo workspace dependency pinned once, the Creator simulator and the Player runtime **always run the same `ENGINE_VERSION`** — this is the structural root of lockstep.
- **`SUPPORTED_SCHEMA_RANGE`** — the engine declares the `schemaVersion` range it can execute. At `init`, if `scenario.schemaVersion` is outside the range → **hard fail at load** with a clear compatibility error. Never mid-game.
- **Comparison policy — semver-range satisfaction, uniform across every axis (resolved v0.3).** All version checks use **semver-range satisfaction**, not exact-string equality (which Sync's prior art used and which forces needless reloads on harmless patch bumps). The compatibility window follows semver: **pre-1.0, compatible within the same *minor*** (`0.N.x` — a minor bump, e.g. `0.3 → 0.4`, is a breaking contract change; patches are additive/fixes); **1.0+, compatible within the same *major*** (caret `^1.N`, minors additive/back-compatible, majors break). The engine's declared `SUPPORTED_SCHEMA_RANGE` therefore defaults to the running schema's same-minor window (e.g. `>=0.3.0 <0.4.0`) but is **explicitly declared** so it can widen when back-compat is maintained. This same rule governs the pins check below and the Relay handshake (Relay §8 / R9) — one policy everywhere.
- **`meta.pins.*` check** — at `init`, `adapters` confirm the *running* ecosystem packages (UDT/Board/Display/Relay-client, pinned at the workspace) **satisfy** the scenario's pins under that same semver-range rule (e.g. a scenario pinned `udt: 4.1.0` runs on any `^4.1.0` workspace UDT, `>=4.1.0 <5.0.0`). A mismatch is a **load-time compatibility error**, surfaced clearly (Player §7.1.2).
- **Error behavior, uniformly:** fail at load (or at connect, for the Relay), fail clearly (structured error codes via `adapters`), never partially run, never silently downgrade. Mid-game version surprises are the exact failure mode the four-axis scheme exists to prevent.

---

## 9. Lockstep / testing guarantee

The shared package **plus** a shared test corpus enforce *Creator-sim == Player-run*.

- **Shared corpus, both apps test against it.** The `valid/` and `invalid/` fixtures and the conformance suite live **in the shared package** so both apps run the same tests. The existing **12-case conformance suite** (`conformance_test.js`) and the **golden MVP fixture** are the seed of this corpus.
- **What the 12 cases cover.** They are all **L1** closure (ajv strict-mode): the valid full MVP scenario, plus rejections for an unknown op, an extra prop on `resource.gain`, a 5th building type, `skull.dropTrigger` carrying a count, missing `meta.pins`, a malformed seed, an incomplete foe selection, `light.named` without `sequenceId`, an empty `effect.apply`, and `corruption.remove` with neither `all` nor `count` — plus the positive `corruption.remove {count}`. The engine's **L2/L3** checks (§7) are **additive** to this suite; the **L4 lockstep** tests below are the new layer this contract introduces.
- **What a lockstep test asserts.** Given `(validScenario, seed, inputStream)`, `replay(...)` must produce an **identical** sequence of `(per-step state digest, ordered directive list, status)` — and running the *same* triple through the Creator's simulator harness and the Player's runtime harness must be **byte-identical** (they call the same engine). The assertion compares: final `status` (win/loss/ended), the **ordered directive stream**, and a stable hash of `serialize(state)` at each step.
- **The golden fixture must reach both ends.** The MVP — main goal **Recover Azkol's Treasures**, adversary **Ashstrider** (drops River of Fire), foes **Brigands / Frost Trolls / Dragons**, baseline seed `AA9A-AAGS-W634` (Core / Heroic / 1P / ally Zaida) — must be driven by two scripted input streams to a **clean win** (main goal complete → adversary spawns → adversary defeated) and a **clean loss** (third corruption, or end of month 6, or empty supply). This is the MVP bar made executable.
- **Determinism & round-trip companions.** Same seed + same stream ⇒ identical; differing seeds may differ only in RNG-driven branches (shuffles, `randomInRange`), never in authored logic. Round-trip fidelity (`export → import → export` byte-identical) is a `schema`-package test that complements the engine's L4.

---

## 10. Open questions

Carried forward and flagged rather than guessed — each is something this contract deliberately does **not** resolve from the engine side alone.

1. **✅ RESOLVED v0.3 — Month-end within-range algorithm.** `randomInRange` (default) vs `triggerAdvanced` both remain in `setup.monthEnd`; the *within-range* pick (how `randomInRange` chooses the end turn between `minTurn` and `maxTurn`) is now a **uniform draw from the engine-local PRNG, bounded by `[minTurn, maxTurn]`**. Since the toolchain does not reproduce official-app runs (v0.3 known limitation), there is no official within-range algorithm to match. Invariants unchanged: bounded by the range, deterministic from the engine seed + input stream, identical in both consumers. (Mirror this in schema §13.1 / Player §11.1.)
2. **✅ RESOLVED v0.3 — PRNG choice & seed wiring.** **Engine-local PRNG** (recommended `pcg32`), defined in the shared package, **not** UDT's `SystemRandom` (§6 Algorithm). The official seed (`meta.provenance`) **never** seeds the engine PRNG — locked, and now grounded in a hard limitation (the official generation logic is unknown, so official runs are not reproducible; v0.3 known limitation). RNG state (generator state + position) serializes inside `EngineState`. The draw-point set is: `deck.reshuffle`, `deck.draw` from a shuffled deck, `cond.random`, and `randomInRange` month-end (§6) — confirmed exhaustive for the MVP; extend only by amending §6.
3. **Rich-content layer is identity-only today.** Hero virtues/banners/move values, **foe battle definitions**, and card effects are not yet in UDT (`Foe`/`Hero` are identity-only). The engine must run against **placeholders**: it already applies authored `card.effects` (in the schema) and treats hero rich-stats and foe battle-card math as **injected content** to resolve when it lands. The official-app analysis's combat model (10-card / 2×5 depletion; keyword-vs-boss decks) is a **candidate default**, not a contract — verify against `adversaries.md` before encoding.
4. **Exec/data wire split.** CR-6.12's optional Power-Author exec/data distinction is a UX affordance **not yet encoded** in the schema's `wires` (which is `{ output: [targetIds] }`). The engine treats all wires as **execution** edges. If the split graduates to runtime semantics, the schema must type edges first (a data edge being side-effect-free, pull-evaluated, acyclic) — propose there, not here.
5. **Board reducer contract.** *Verified 2026-06-24:* UDT v4.1.0 exposes only the Board **reference layer** (`udtGameBoard`, re-exported rosters), explicitly *consumed by* the unpublished `ultimatedarktowerboard`; there is **no reducer or `BoardState` surface to mine yet**. So the `board.mutate` command set and `BoardState` serialization pin to Board @ `pins.board` when it publishes; until then the command names track the PRDs' `spawnFoe`/`placeHero` examples (not a guess, but not yet pinnable).
6. **Player↔Relay protocol.** Unpublished; the `tower.program` directive shape and the `observed` kinds (`skullCounter`, `towerState`, …) are specified on intended design (full-state idempotent commands) and re-grounded when the Relay repo lands.
7. **Competitive mode.** Modeled in the vocabulary (`winloss.competitiveEnd`, `dungeon.relicTower`, hero elimination → dormant conversion) but full engine support is post-MVP; co-op first.
8. **✅ RESOLVED v0.3 — Main companion = seed ally.** Content-verified (quests.md: "a matching companion card is retrieved during setup"; lore.md: "main companion tied to the selected main goal"): the seed's `allyId` (`setup.selections.allyId`) and the main goal's companion are the **same entity** — the *main companion*, determined by the selected main goal. The engine treats them as one: the main goal is the Creator-level selection, and its matching companion **is** the imported ally. **Companions recruited via Companion Quests** in play are a **distinct, growable per-hero set** (`EngineState` per-hero `companions`, §3.1). Residual: the explicit goal→companion **mapping table** is not yet enumerated (quests.md TODO), so the goal↔ally **consistency check** (the imported ally must equal the chosen goal's companion) is **gated on that content** — until it lands, the engine carries the ally as the main companion without enforcing the cross-check. (Mirror in schema §13.5.)
9. **✅ RESOLVED v0.3 — Mutual-consent trade input.** A trade is **one atomic `decision`**, host-mediated and unanimous **by construction** (the App surface runs the face-to-face negotiation; the engine only ever receives a finalized, all-agreed trade — if consent isn't unanimous, the host submits nothing). Shape, in response to a trade `InputRequest`:

   ```
   decision (trade) = {
     parties:   HeroId[],                       // ≥2 heroes, all on the acting hero's space
     transfers: { from: HeroId, to: HeroId, asset: TradeAsset }[]
   }
   TradeAsset =                                  // CLOSED union — virtues/corruptions are unrepresentable
       { type: "warriors",  count: int }
     | { type: "spirit",    count: int }
     | { type: "item",      itemId: Id }         // gear | treasure | potion | questItem
     | { type: "companion", companionId: Id }    // a recruited companion (not the main companion)
   ```

   The engine validates and applies it atomically: all `parties` co-located on the acting hero's space (Board projection); the acting hero's **once-per-turn `tradeUsed` latch** is unset (then sets it); every `from` hero can afford each asset; and — enforced structurally by the closed `TradeAsset` union — **no virtues or corruptions**. On success it applies every transfer in one step and emits a `ui.update` per affected hero; on any violation it faults (it never applies a partial trade). The latch belongs to the **acting** hero only — consenting parties don't spend their own future trade action.

---

*Companion to: Canonical Scenario Schema v0.3 (`scenario.schema.json` @ `schemaVersion 0.3.0`, `scenario-schema-v0_3.md`), Player PRD v0.3 (§6.1, §7, §8), Creator PRD v0.3 (§7.12, §8), Node Block Catalog v0.3 (§3–§8). Verified against `ultimatedarktower` v4.1.0 and `UltimateDarkTowerDisplay` (source-read 2026-06-25); content verified against `mcp-server-return-to-dark-tower` (quests.md, lore.md, rules.md). Supersedes: Rules-Engine / Shared-Package Contract v0.2.*

### Changelog

- **v0.3 (2026-06-25)** — **Determinism + ally/companion resolutions.** Resolved §10.2 (PRNG): engine uses an engine-local PRNG (recommended `pcg32`), not UDT's `SystemRandom`; official seed never seeds it; §6 Algorithm bullet rewritten and the seed-isolation bullet strengthened with the hard rationale. Resolved §10.1 (month-end): `randomInRange` is a uniform engine-PRNG draw bounded by `[minTurn, maxTurn]` (no official algorithm to match). Resolved §10.8 (ally/companion): the seed `allyId` and the main goal's companion are the **same entity** (the main companion); recruited companions are a distinct per-hero set (§3.1 clarified); goal→companion consistency check gated on the still-unenumerated mapping (quests.md TODO). Added the **known limitation** to the banner: official-app runs are not reproducible — `SystemRandom` replicates the official RNG stream but the official generation logic that consumes it is unknown, so only the factual setup section is usable. Content-verified against `mcp-server-return-to-dark-tower` (quests.md, lore.md) and the UDT seed parser / `SystemRandom` source (`decodeSeed` setup section is SystemRandom-free). Also resolved §10.9 (mutual-consent **trade**): one atomic, unanimous-by-construction `decision` over a closed `TradeAsset` union (warriors/spirit/item/companion; virtues/corruptions structurally excluded), validated for co-location + the acting hero's once-per-turn `tradeUsed` latch + affordability and applied atomically (§5.3 row updated). And resolved the §8 **version-compatibility** policy: uniform **semver-range satisfaction** (replacing exact-string), same-minor pre-1.0 / same-major 1.0+, applied to `schemaVersion`, `meta.pins.*`, and the Relay handshake (mirrors Relay §8 / R9).
- **v0.2 (2026-06-25)** — **Observed → derived correction.** Resolves the cross-document finding from the Relay protocol (§10 Q12 / §11 R7): glyph facing and seal presence are engine-owned, not tower-reported. Removed `sealIndicated` and `glyphRevealed` from the observed-input set (§5.4); the only genuinely observed values are now `skullCounter` and `towerState` (the latter for recovery resync, not per-turn). Rewrote the tower mirror (§3.4) to separate the two observed values from engine-derived glyph facing (drum positions tracked from commanded rotations, homed at calibration) and engine-owned seal presence (no sensor; remembered from commanded breaks). Rewrote `seal.remove` / `seal.replace` (§4.3) and `cond.glyphGate` (§4.4) accordingly, and specified the `seal.break`/`ui.prompt` pause-for-physical-removal flow. Added the **broken-seal set** to `EngineState` (§3.1) and the **app-level seal-state companion** on `tower.program` (§5.2) — seal state rides outside the 19-byte packed `TowerState` (no hardware field) and feeds the Display target's `applySeals`. Verified against UDT v4.1.0 (`brokenSeals`/`breakSeal`/`getGlyphsFacingDirection`, `TowerState` = `drum[3]` + `layer[6]` with no seal field) and `UltimateDarkTowerDisplay` (`TowerRenderView`/`TowerDisplay`/`SealManager`.`applySeals(SealIdentifier[])`).
- **v0.1 (2026-06-24)** — Initial draft. Establishes the engine as a pure `(state, input) → (state, directives[])` reducer shared by Creator sim and Player runtime; pins external surfaces against UDT v4.1.0 (source-verified); maps all 36 effect verbs to state mutations + directives; defines the closed directive/input vocabularies, the observed-input bridge for the skull invariant, the determinism model (engine seed ≠ official seed), the load/run validation split (L1 trusted, L2/L3 at load, L4 lockstep), the engine-version compatibility rules, and the lockstep test tied to the 12-case conformance suite + golden MVP fixture. Nine open questions carried forward.
