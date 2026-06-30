# Return to Dark Tower — Scenario Creator

**Product Requirements Document — v0.3**
**Status:** Draft for review · **Supersedes:** v0.2 · **Last updated:** 2026-06-23

---

## What changed in v0.3

- **Authoring model decided (§6.3).** The editor is a **Node-RED skin** with three borrowed **Blueprint** ideas — typed reference pins, a Timeline node for the tower program, and an optional Power-Author exec/data wire split — and an explicit cap on Blueprint complexity beyond that.
> **Grounding update — re-verified against `ultimatedarktower` v4.1.0 (2026-06-23).** The "grounding corrections pending" note below was written against UDT v2.3.0; the repo has since shipped the data it said was missing. Net change: **UDT v4.1.0's public API now exports the board reference layer** — `BOARD_LOCATIONS`, `BOARD_ADJACENCY` + `neighborsOf`/`stepDistance`/`shortestPath`, `FOES`/`ADVERSARY_ROSTER`/`FOE_STATUSES`, `HEROES`/`HERO_BY_ID`, `MONUMENTS` — and `ultimatedarktowerboard` re-exports it. The §2.1 "UDT is tower-only" framing and the Board "dependency risk" are **superseded for this layer**; rich *content* data (hero virtues/banners/move, foe battle defs, card effects) is identity-only and **remains** forthcoming. Also: **21** baked `TOWER_LIGHT_SEQUENCES` (not 19); `TOWER_AUDIO_LIBRARY` is a UDT export; **the canonical schema has landed** (`scenario-schema-v0_3.md` + `scenario.schema.json`, `schemaVersion 0.3.0`, ajv-validated), resolving §8's "pick one canonical schema" item (seed interop was already decided — §8).

- **Grounding corrections pending.** A verification pass against `ultimatedarktower` v2.3.0 and the content repo found three claims in this doc that need reconciliation in a follow-up edit: (a) §2.1 attributes board data — locations, adjacency, movement graph, rosters, foe statuses — to **UDT**, but UDT v2.3.0 ships **none** of these (it is tower-only: BLE, lights, sounds, drum, seals, glyphs, skull count, `TowerState`); that data must live in **Board** (pre-release/unpublished), which raises the dependency risk. (b) §7.8's custom-light "track kinds" don't match the real firmware light model (a fixed 6-effect set + 19 named sequences). (c) The "16-building model" gap is resolved and was mischaracterized — there are **4 building *types*** (one of each per kingdom), with per-type free/enhanced effects now sourced from `buildings.md`. These are now corrected in the body (§2.1, §2.2, §7.6, §7.8, §8, §10), and the concrete MVP scenario is pinned (§13): the recommended first game — *Recover Azkol's Treasures*, adversary **Ashstrider**, foes **Brigands / Frost Trolls / Dragon**.

## What changed since v0.1

v0.1 treated the Creator as a near-greenfield build and flagged "can a third party even command the Tower?" as the top project risk. That risk is **resolved**: the UltimateDarkTower (UDT) ecosystem already provides BLE control, a software tower, the board state model, the canonical rosters, and a light-sequence authoring format. This revision re-architects the Creator as a **composition layer on top of that ecosystem** rather than a from-scratch app, which removes a large amount of scope and replaces several speculative sections (especially Tower control) with concrete integration against real APIs.

The headline shifts: the Tower-control model is now defined by UDT's command surface plus Display's light-sequence JSON schema; testing and preview run against Display (software tower) and Board (software board) with no hardware required; heroes, foes, locations, adjacency, and statuses come from existing packages instead of being re-authored; and the scenario file becomes a composition of existing types rather than a bespoke format.

---

## 1. Summary

The Scenario Creator lets designers build custom *Return to Dark Tower* scenarios without code — decks, events, turn structure, foe behavior, win/loss conditions, and a scripted Tower program (lights, sound, drum rotation, seal breaks, skull drops). It outputs a portable **scenario file** that the companion **Player app** runs at the table.

The Creator does not reinvent the parts the ecosystem already solves. It builds on UDT (driver + board data), UltimateDarkTowerDisplay (tower rendering + light-sequence format), and UltimateDarkTowerBoard (board state + rendering + rosters). Its net-new value is the authoring experience (a node-based editor), the rules/flow/content the existing packages deliberately leave to the host, and the scenario file format that ties it all together.

---

## 2. Architecture — building on the UDT ecosystem

This section is the spine of v0.2. The Creator and Player are both **hosts** that sit on top of a shared stack of existing packages.

### 2.1 Layer map

- **Hardware** — the physical Tower, or nothing (development/test).
- **Driver (UDT)** — *verified against the published build (^2.3.0 → v2.5.0):* BLE connect/calibrate, tower commands (lights, sound, drum rotation, seal break, skull counter), `TowerState` pack/unpack + `isCalibrated`, glyph tracking (`GLYPHS` = the five action glyphs), `LIGHT_EFFECTS` (6) and the enumerated `TOWER_LIGHT_SEQUENCES` (**21** as of v4.1.0; this bullet's "19" predates it). UDT also ships a **seed parser** (`udtSeedParser.ts`, with a byte-exact C# `System.Random` replica `udtSystemRandom.ts`, in the `seed-decoder` package) that decodes/creates the **official app's 12-character game seeds** — a setup section (foes ×3 tiers, adversary, ally, difficulty, expansions, source, player count) plus a base-34 RNG section that drives the official game's procedural generation. ~~UDT is otherwise tower-only…~~ **Superseded (v4.1.0):** UDT now ships the board reference layer in its public API — `BOARD_LOCATIONS`, `BOARD_ADJACENCY` + `neighborsOf`/`stepDistance`/`shortestPath`, the `FOES`/`ADVERSARY_ROSTER`/`FOE_STATUSES` rosters, `HEROES`/`HERO_BY_ID`, and `MONUMENTS`. Only **rich content data** (hero virtues/banners/move, foe battle defs, card effects) remains forthcoming — author those against placeholders.
- **Canonical board data — now in UDT v4.1.0.** Locations, adjacency, the movement graph (`neighborsOf` / `stepDistance` / `shortestPath`), the hero/foe/adversary/monument rosters, and foe statuses are exported from **UDT's public API** and re-exported by Board. The prior "pre-release Board, dependency risk" framing is resolved for this layer; pin `meta.pins.udt`.
- **Tower render + light layer (Display)** — text / 2D / 3D renderers that consume a `TowerState`, plus the JSON **light-sequence format** and its player. This is the software tower.
- **Board state + render layer (Board)** — a `BoardState` (heroes, foes, adversary, skulls-on-buildings, monuments, markers) with a command reducer, controller, events, versioned save/load, three renderers, and an optional editing UI. It is deliberately **rules-free**: it stores, renders, and emits events; the host owns the rules.
- **Sync (UltimateDarkTowerSync)** — keeps multiple devices aligned to one tower (host + players + spectator). Mostly a Player-app concern.
- **AI bridge (mcp-server-return-to-dark-tower)** — optional; exposes tower control to agents.
- **Hero authoring (board-game-creator)** — an existing hero creator; the Scenario Creator references heroes rather than re-authoring them.
- **THE NEW LAYER — Scenario Creator + scenario file + rules engine.** This is what the project adds: the authoring tool, the file format, and the rules the lower layers leave to the host.

### 2.2 Build vs. reuse

| Concern | Source | Build or reuse |
| --- | --- | --- |
| BLE, calibration, tower commands, `TowerState`, glyph tracking, seeds | UDT | Reuse |
| Locations, adjacency, movement graph, hero/foe/adversary/monument rosters, foe statuses | **UDT v4.1.0** (public API; re-exported by Board) | Reuse — risk resolved |
| Enumerated named light sequences (`TOWER_LIGHT_SEQUENCES`) | UDT | Reuse |
| Light-sequence JSON format + player (the lighting authoring substrate) | Display | Reuse + author into |
| Software tower for preview (text/2D/3D) | Display | Reuse + embed |
| Board state model, reducer, save/load, renderers, editing UI | Board | Reuse + embed |
| Multi-device sync | Sync | Reuse (Player) |
| Hero definitions | board-game-creator | Reference |
| Node-based authoring UX | — | **Build** |
| Scenario file format (the contract) | — | **Build** |
| Rules engine: turn flow, events, win/loss, decks | — | **Build** |
| Dungeon authoring + skull-economy rules | — | **Build** |
| Validation, test harness wiring, export/import | — | **Build** |

### 2.3 The scenario file as the composition layer

Because the lower layers already define types for tower state, light sequences, and board state, the scenario file should **compose those types** rather than re-describe them. Concretely, a scenario references named light sequences by id and/or embeds Display-format sequence JSON for custom effects; expresses its starting board as a Board `BoardState`; references foes/adversary/heroes/locations by their roster ids; and adds the net-new layers on top (decks, events, flow, win/loss, dungeon and skull rules). Section 8 details this.

### 2.4 Repository & app structure (monorepo)

The Creator and the Player are **two standalone applications shipped from a single monorepo**. Each builds and runs independently — a designer opens the Creator, players open the Player — but they share one codebase, which is the natural home for the contract between them. Because the whole ecosystem is TypeScript, the shared concerns become internal workspace packages both apps import:

- **scenario schema + types** — the composed format from §8 as a single source of truth, so the contract is enforced at build time rather than by convention.
- **rules engine** — the turn / flow / event / win-loss / dungeon / skull logic the host must own (Board is rules-free). The Player runs it live; the Creator runs it in its simulator and preview. One implementation, two consumers.
- **ecosystem adapters + validation** — thin wrappers over UDT / Display / Board and the validators that gate authoring and loading.

The ecosystem packages (UDT, Display, Board, Sync) are consumed as **external npm dependencies, pinned once at the workspace level** so both apps stay version-aligned. This structure resolves the rules-engine ownership question raised in v0.1: the engine is neither "the Creator's" nor "the Player's" — it is a shared package in the repo.

---

## 3. Goals & Non-Goals

### Goals (unchanged from v0.1, plus)

1. Let a non-programmer author a complete, valid scenario end to end.
2. Make Tower control first-class — now meaning: compose UDT commands and Display light sequences, not invent a new lighting model.
3. Guarantee exported scenarios run in the Player app (validation before export), validating against the real schemas the ecosystem already enforces.
4. Compose the ecosystem instead of duplicating it.

### Non-Goals (expanded)

1. Do not rebuild the board model, tower rendering, rosters, light-sequence runtime, or BLE layer — those are owned by UDT/Display/Board.
2. Do not author heroes — that is board-game-creator's job; the Creator references heroes.
3. No live multiplayer co-authoring, no marketplace/monetization in v1.
4. No Tower firmware changes.

---

## 4. Target Users

Unchanged from v0.1: the primary **Scenario Designer** (rules-literate, non-technical), the **Power Author** (wants custom branching, custom light sequences, precise escalation), and the **Playtester**. The ecosystem grounding mainly benefits the Power Author. On the **physical** tower, lights are the fixed baked sequences from the UDT library plus the firmware effect set; programmable / custom light sequences are a **software-tower (Display)** capability (post-MVP). For MVP, light authoring is limited to selecting baked sequences (§7.8).

---

## 5. Scope — net-new vs reused

The Creator's **net-new scope** is: the node-authoring UX; the scenario file format; the rules the host must own (turn flow, events, win/loss, decks, dungeon rules, skull economy); validation; export/import; and the test harness that wires Display and Board in as the preview surface. Everything else is integration against existing packages. This is a substantial reduction from v0.1's implied scope.

---

## 6. Node-Based Authoring

The node-editor direction from v0.1 stands (rationale, node model, and taxonomy in v0.1 §6 still apply). Two updates:

- **CR-6.8 (accessibility fix).** Node *type* must not be conveyed by color alone — pair every category with an icon/shape and label so the editor is usable by color-blind authors. This corrects a v0.1 gap.
- **CR-6.9 (board/tower nodes wrap real commands).** Action and effect nodes that touch the board or tower should map onto the real controller commands (e.g. Board's `spawnFoe` / `placeHero`, UDT's tower commands) so the graph is executable against the live preview, not just descriptive.

### 6.3 Authoring model — Node-RED skin, Blueprint discipline underneath

The editor presents as **Node-RED** — an approachable palette, config nodes for shared definitions, per-node edit forms, subflows, links, comments — to protect the primary non-technical Scenario Designer. It borrows exactly **three** ideas from Unreal Engine **Blueprints**, each where it directly serves validation, and nothing more. The Creator is not a general visual-scripting VM; building one is the net-new scope the v0.2 reframe deliberately shed.

- **CR-6.10 Typed reference pins.** References to a foe, location, building type, dungeon room, advantage type, deck, or light sequence are **typed pins**, not free text or loose dropdowns. A pin accepts only a value of its type, so an invalid wire is impossible at author time. This *is* the bounded, validatable effect/reference vocabulary §8 requires — enforced at the wire rather than by a post-hoc validator.
- **CR-6.11 A Timeline node for the tower program.** The cross-channel tower moments of §7.8 are authored on a single **Timeline** node: a tick ruler (50 Hz / 20 ms) with one lane per channel — lights, sound, drum, seal — and **explicit timed waits** (never chain-on-complete). This is the one place Node-RED's single message wire is genuinely insufficient and Blueprint's Timeline fits exactly. It composes **real** tower commands (a named sequence, a per-LED effect from the firmware's fixed effect set, a sound index, a rotation, a seal break) — it is not a freeform brightness-curve editor, because the tower's light model does not support arbitrary interpolation.
- **CR-6.12 Optional exec/data wire split — Power-Author only.** The default canvas keeps a single wire. A Power-Author mode may surface Blueprint-style separate **execution** ("then") and **data** ("value") wires for complex branching; the Designer never has to see it.

**Explicit complexity cap (to keep this from sprawling):** no pure/impure node distinction, no execution-pin discipline on every node, no user-defined variables or functions-with-signatures, and no general type system beyond the fixed set of game reference types in CR-6.10.

**Library note.** This is a UX/semantics decision, not a framework lock-in. React Flow, LiteGraph.js (the Blueprint-style library behind ComfyUI), and Rete can each render either style and impose no runtime of their own — and custom-node freedom is needed regardless for the embedded Board editor, the dungeon grid sub-editor, and the Timeline node. The model can therefore be adopted incrementally: ship the Node-RED skin first, add typed pins and the Timeline node as they're needed.

---

## 7. Functional Requirements

### 7.1 Project & metadata

Unchanged from v0.1 §7.1: create/open/save/duplicate/version projects; edit title, description, version, creator/attribution.

### 7.2 Starting board state *(now via Board)*

- **CR-7.2.1** Author the scenario's starting board as a Board `BoardState` — hero placements, foe/adversary spawns, skulls-on-buildings, monuments, and space markers.
- **CR-7.2.2** Reuse Board's editing UI (palette / inspector / summary) and its versioned save/load rather than building a board editor; the Creator embeds it.
- **CR-7.2.3** Use Board/UDT data for all references — locations from `BOARD_LOCATIONS`, foes/adversary from the rosters, adjacency from the movement graph — so authored placements are always valid board positions.

### 7.3 Decks & card builder

As in v0.1 §7.2: author custom card sets by category (gear, treasure, potion, corruption, quest, companion equivalents), with copy counts and effects drawn from the shared effect vocabulary. Net-new — the ecosystem does not model decks.

### 7.4 Foe authoring

- **CR-7.4.1** Reference foes, the adversary, and their statuses from the UDT rosters (`FOES`, `ADVERSARY_ROSTER`, `FOE_STATUSES`) — including level/tier — rather than re-typing them.
- **CR-7.4.2** Author net-new **behavior rules** the rosters don't carry: starting status, status-escalation triggers (Panicked → Lethal), strike behavior, and movement across kingdoms (using the movement graph helpers for validity).
- **CR-7.4.3** Allow custom foes that extend the roster shape, with custom battle definitions (battle is otherwise net-new — see decks/effects).

### 7.5 Event & trigger authoring

As in v0.1 §7.4: define events (id, name, trigger, effect) across the game's categories (Foes Strike/Spawn/Grow, The Tower Stirs/Acts, Companion, New Wares); build schedules and condition-based triggers; compose effects from the shared library — including tower effects (7.8), board commands (via Board's reducer), and skull/economy effects (7.10).

### 7.6 Turn structure, flow & player-count scaling

- **CR-7.6.1** Author the month → turn → phase structure as a graph (v0.1 §7.5), including the three phases, heroic actions, and reinforce behavior per building type. The base game has **four building types** — Citadel / Sanctuary / Village / Bazaar, one per kingdom (16 instances) — each with a **free** and a **spirit-enhanced** effect now sourced from `buildings.md` (Citadel: potion / gain virtue; Sanctuary: spirit / remove all corruptions; Village: 2 warriors / more warriors; Bazaar: gear / treasure). This **closes the prior "building model" gap** (it was mischaracterized as 16 distinct buildings).
- **CR-7.6.2** Configure game length (max months/turns, optional timer) and difficulty-driven turn counts (Gritty = fewer turns).
- **CR-7.6.3 (gap fix).** Author **player-count scaling** — turns per month vary with player count (1→6 … 4→9) — and **dormant kingdoms** for sub-4-player games, including dormant-kingdom skull-placement rules. Scenarios must run across 1–4 players.

### 7.7 Win/loss conditions

As in v0.1 §7.6: author win conditions (complete main goal, then defeat adversary) and loss conditions (third corruption, month limit, empty skull supply, plus custom triggers), with competitive variants behind a scenario option.

### 7.8 Tower program *(rewritten — now grounded on UDT + Display)*

The Tower program is authored as a coordinated timeline across the real command channels. It is no longer modeled as freeform "color/pattern/duration."

- **CR-7.8.1 Channels.** Expose the actual channels: **light sequences** (Display format), **sound** (UDT tower-speaker triggers), **drum rotation** (UDT), **seal break/replace** (UDT), and **skull drop / counter** (UDT). Each tower effect node targets one channel.
- **CR-7.8.2 Two tiers of light authoring.**
  - *Tier 1 (most authors):* reference an existing named sequence from `TOWER_LIGHT_SEQUENCES` by id (victory, defeat, seal-reveal, month-started, rotation, dungeon-idle, etc.) at a game moment. No custom authoring.
  - *Tier 2 (power authors — **post-MVP**):* the tower's baked sequences are **fixed firmware** and cannot be changed; programmable / custom light sequences are a **software-tower (Display) feature** — Display can render authored sequences (its richer track format is real for the emulator). The physical tower offers only its baked sequences plus per-LED/group effects from the fixed `LIGHT_EFFECTS` set (`off`, `on`, `breathe`, `breatheFast`, `breathe50percent`, `flicker`), with no brightness interpolation. **For MVP, the Creator allows only the selected baked sequences from the UDT library (Tier 1);** custom/programmable authoring is deferred and, where used, targets the software tower.
- **CR-7.8.3 Timing model.** Use Display's tick model (50 Hz, 20 ms/tick, half-open `[atTick, endTick)` ranges) as the authoring timeline. Cross-channel coordination (e.g. dim lights → ominous sound → rotate → break seal) is sequenced on this timeline with **explicit timed waits**, because the tower signals "command complete" when a sound/animation *starts*, not when it ends — chaining on completion is unsafe.
- **CR-7.8.4 Sound has two outputs.** Tower-speaker sound (UDT trigger, limited to firmware-defined clips) is distinct from app/device audio (Display's swappable audio pack / arbitrary assets). Let authors target either, and make the distinction explicit in the UI.
- **CR-7.8.5 Bundle a rotation as a unit.** A "rotate" moment is a physical drum-rotation command plus its matching `rotation` light sequence; the Creator should compose these together so the visual and physical stay in sync.
- **CR-7.8.6 Hardware limits.** Surface real constraints (24 LEDs across 6 layers × 4 lights, 12 seals, 3 drum levels, calibration required before reliable rotation) and prevent invalid programs at authoring time.

### 7.9 Dungeon authoring *(net-new — added gap)*

- **CR-7.9.1** Author dungeons: rooms, the target room, per-room Advantage spends, and apply-result outcomes.
- **CR-7.9.2** Model cleared-room persistence across visits and the link from quests that spawn dungeons.
- **CR-7.9.3** Support the competitive Tower-dungeon / relic structure as a scenario option.

### 7.10 Skull economy *(net-new rules — added gap)*

- **CR-7.10.1** Configure the skull supply size as a difficulty lever (default 24) and the empty-supply loss condition.
- **CR-7.10.2** Author building skull capacity and destruction rules (4th skull destroys a building and yields a corruption in a home kingdom), and skull-placement logic for home vs. dormant kingdoms. Board models skulls-on-buildings as *state*; these are the *rules* on top.

### 7.11 Validation

As in v0.1 §7.9, plus: validate custom light sequences against Display's schema, validate board placements against Board/UDT data, and validate references (foe ids, location ids, sequence ids) resolve against the rosters and enumerations. Block export on any failure.

### 7.12 Test / simulate / preview *(now concrete)*

- **CR-7.12.1 Software tower.** Embed Display as the live tower preview. Feed it hand-built `TowerState` for fast preview, or run authored tower commands through UDT's logic for validated preview. Use the lightweight `readout` / `side-view` renderers for an always-on panel and gate the `3d-view` behind an explicit full-preview (it carries a large GLB + audio payload).
- **CR-7.12.2 Software board.** Embed Board (text/2D, with 3D lazy-loaded) to show the board responding to authored events and commands, reusing its editing UI for the starting state.
- **CR-7.12.3 Step-through.** Step the authored flow ("what fires on turn 3 of month 2?") and dry-run scenario logic in a simulator mirroring the Player's rules engine.

### 7.13 Export, import & heroes

- **CR-7.13.1** Export/import the scenario file with round-trip fidelity (v0.1 §7.11).
- **CR-7.13.2** Reference heroes rather than defining them here. *(Update: UDT v4.1.0 `HEROES`/`HERO_BY_ID` now supplies hero **identity**; the rich data — warriors/spirit/move/banner/3+3 virtues — is still board-game-creator's or forthcoming. The integration question narrows to that rich layer.)*
- **CR-7.13.3** Optional raw-file inspection for power users.

---

## 8. Data Model & Schema

The scenario file is a **composition** of existing types plus net-new layers. The early schema in the project should be reconciled accordingly:

- **Replace drifted terms with ecosystem types.** `enemies` → foes from `FOES` / `ADVERSARY_ROSTER`; `regions` → kingdoms / `BOARD_LOCATIONS`; `hero_start_health` → the real resource model (warriors, spirit, corruption) and heroes referenced from board-game-creator. Statuses come from `FOE_STATUSES`.
- **Starting state is a Board `BoardState`.** Don't re-describe board contents; embed/reference the Board state and reuse its versioned save/load.
- **Tower program references `TOWER_LIGHT_SEQUENCES` ids and/or embeds Display sequence JSON.** Custom sequences validate against Display's schema; named sequences are referenced by id.
- **Bound the effect/trigger/condition vocabulary.** The early schema's open `additionalProperties: true` effects are unvalidatable; define a closed vocabulary so the Creator can validate and the Player can execute.
- **Seed interop — decided.** UDT's seed parser (`udtSeedParser.ts`) decodes the official app's 12-char seed: a **setup section** (foes ×3 tiers, adversary, ally, difficulty, expansions, source/core-vs-competitive, player count) and an **RNG section** that seeds the official game's procedural generation (timelines, quests, spawns, dungeon layouts, companion events). The Creator should **import a seed's setup section to pre-fill the selection nodes** (a fast "start from a known game" path), but it does **not** consume the RNG section — the Creator *replaces* procedural generation with explicitly authored content, which is the opposite of seed-driven RNG. (Forward prediction of the RNG pipeline is a separate, currently-blocked UDT research goal, out of scope here.) **Main Goal is not encoded in the seed**, so it stays a Creator-level selection. *(UDT's tower-**state** pack/unpack — `rtdt_pack_state`/`rtdt_unpack_state` — is a distinct, lower-level concept, unrelated to seeds.)*
- **Pick one canonical schema — resolved.** A single-file canonical schema has landed: `scenario.schema.json` (`schemaVersion 0.3.0`, draft 2020-12, ajv-validated) with the design rationale in `scenario-schema-v0_3.md`. It supersedes `Early_json_schema` and the split layout.

**CR-8.1** Finalize this composed schema jointly with the Player app and pin it to the ecosystem package versions it references. It is the contract; nothing downstream can get ahead of it. *(Update: v0.3 of the contract has landed — `scenario.schema.json` @ `schemaVersion 0.3.0`, pinned to UDT v4.1.0 via `meta.pins`. Remaining: wire Board's `BoardState` validator and Display's sequence schema into validation layer 2 when those publish.)*

---

## 9. Platform & Non-Functional Requirements

- **CR-9.1 Web Bluetooth reality.** BLE control runs in Chrome / Edge / Samsung Internet on desktop and Android, but **not** iOS Safari/Chrome (needs Bluefy) and **not** Firefox; Node, Electron, and React Native (custom adapter) are options. **Creator** barely cares — it only touches BLE during optional live-tower preview, and the software tower (Display) sidesteps even that. **Player** must drive the Tower, so it is constrained to a BLE-capable environment; the common "use an iPad" advice collides with iOS's lack of Web Bluetooth and needs Bluefy or a native build. Document this in the Player PRD.
- **CR-9.2 3D asset weight.** The 3D tower/board path pulls a large model + audio footprint; prefer the light renderers for always-on panels and lazy-load 3D.
- **CR-9.3 Offline-first** authoring; **no silent data loss** (autosave + versioning); **schema/version compatibility** warnings on open; responsive canvas with large graphs.

---

## 10. Dependencies & Risks

- **Ecosystem packages are the platform.** UDT (driver + board data), Display (tower render + sequences), Board (board state/render) and their version compatibility (single-instance `three`, peer ranges) are hard dependencies. Pin them once at the **monorepo/workspace level** (§2.4) and in the schema contract so both apps stay version-aligned.
- **Board is pre-release** (not yet published to npm at time of writing). The Creator's board-state authoring and software-board preview depend on it maturing; track that as a real schedule risk and have a fallback (headless state core is available even where 3D isn't).
- **Tower command vocabulary** is now known (UDT) but still firmware-bounded; the "completion fires at start" timing behavior must be respected in sequencing.
- **Rules-engine ownership.** Board is rules-free by design, so the scenario rules engine must live in the host (Player) and be mirrored by the Creator's simulator. Decide where that engine lives and how the two apps share it.
- **Rich content data is forthcoming, not present.** Hero virtues/banners/move and the gear/treasure/potion/adversary card effects are not in any published source today (the content repo marks them TODO; UDT's `Foe`/`Hero` shapes are identity-only). This is now narrower than "board data" generally — rosters/locations/adjacency/identity **have** landed in UDT v4.1.0. Author the rich layer against placeholders and pin versions when it ships.
- **IP / fan-content.** This builds on reverse-engineered, fan-made libraries in the RTDT fan ecosystem; confirm what's permissible before any public/commercial distribution.

---

## 11. Open Questions

1. **Seed interop — resolved (§8).** Import the official seed's *setup section* to pre-fill selections; do not consume the RNG/procedural-gen section (the Creator authors that explicitly). Remaining detail: how an author optionally surfaces/edits an imported setup.
2. **Rules engine design** — the monorepo settles *where* it lives (a shared workspace package, §2.4); the remaining questions are its internal design and whether it's also published for the wider ecosystem or kept repo-internal.
3. **Board maturity** — what's the timeline for Board reaching a stable, published release the Creator can depend on?
4. **Hero integration** — shared format or import bridge with board-game-creator?
5. **Competitive mode** — full authoring in v1, or co-op first?
6. **Sound channel default** — when an author adds a "sound," does it default to the tower speaker or app audio?
7. **Custom assets vs. official/homebrew assets** — and does the Homebrew Resources repo become the default asset library?

---

## 12. Suggested Phasing

- **Phase 0 — Contract.** Finalize the composed schema (CR-8.1); confirm package versions; decide rules-engine ownership and seed interop.
- **Phase 1 — Authoring core.** Node canvas + palette + inspector; metadata; decks; events; flow (incl. player-count scaling); win/loss; validation; export/import. Embed Board for starting state.
- **Phase 2 — Tower & test.** Tower program (named sequences + custom Display sequences + cross-channel timeline); embed Display as software tower; simulator step-through.
- **Phase 3 — Depth & polish.** Dungeon authoring; skull-economy rules; accessibility; templates/grouping/auto-layout; power-user raw editing; hero integration; optional community library.

---

## 13. Success Metrics

- **The canonical end-to-end target** is the recommended first game — *Recover Azkol's Treasures*, adversary **Ashstrider**, foes **Brigands (Tier 1 / L2) / Frost Trolls (Tier 2 / L3) / Dragons (Tier 3 / L4)** — authored in the Creator and run in the Player. *(Levels confirmed via the seed format's tier→level mapping; this exact selection is the documented baseline seed `AA9A-AAGS-W634` = Core / Heroic / 1P / Ashstrider / Zaida / Brigands / Frost Trolls / Dragons, so the MVP setup round-trips against a real seed.)* This is the shared MVP for both apps; competitive mode is **post-MVP**.
- A first-time author produces a valid, playable scenario in one sitting.
- 100% of exported scenarios load and run in the Player app (validation effectiveness).
- A scenario can drive every supported tower channel — light sequences (named and custom), sound, rotation, seal break, skull drop — previewed live against the software tower before any hardware is involved.
- Round-trip fidelity: export → import yields an equivalent graph and an equivalent `BoardState`.
- Zero duplication of board/tower/roster/sequence logic the ecosystem already owns.
