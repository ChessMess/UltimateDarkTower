# Return to Dark Tower — Scenario Creator: Node Block Catalog

**v0.3 · Draft for review · Companion to Creator PRD v0.3 · Last updated: 2026-06-23**

> **Grounding update — re-verified against `ultimatedarktower` v4.1.0 (2026-06-23).** The repo has moved well past the `^2.3.0–v2.5.0` this doc was written against, and several notes below are now stale (left in place with this correction rather than deleted, for traceability):
> - **Board reference data now ships in UDT's public API** (`src/index.ts`) and is re-exported by `ultimatedarktowerboard`, not owned by it: `BOARD_LOCATIONS` (60), `BOARD_ADJACENCY` + the movement graph `neighborsOf`/`stepDistance`/`shortestPath`, `FOES` (12) / `ADVERSARY_ROSTER` (8) / `FOE_STATUSES` (5), `HEROES`/`HERO_BY_ID`, `MONUMENTS`. **The "forthcoming in UDT / not UDT v2.3.0 / Board-only / dependency risk" notes for this layer are superseded.**
> - **Still forthcoming:** rich *gameplay/content* data — hero virtues/banners/move values, foe battle definitions, card effects. The UDT `Foe`/`Hero` shapes are **identity-only**, so that caveat stands; the dependency risk shrinks from "all board data" to "rich content data."
> - **Tower constants:** there are **21** baked `TOWER_LIGHT_SEQUENCES` (`0x01–0x15`), **not 19** (corrected in §9, §15.5); `LIGHT_EFFECTS` ×6 confirmed; **`TOWER_AUDIO_LIBRARY` is a UDT export** (12 `SoundCategory`) — resolving §15.5's open question. `BuildingType` (4) is a UDT export, confirming the §13 building model.
> - **The canonical scenario schema has landed:** `scenario-schema-v0_3.md` + `scenario.schema.json` (`schemaVersion 0.3.0`, ajv-validated). It resolves the §15 contract gaps — closed effect/trigger/condition vocabulary, month-end range (`setup.monthEnd`), adversary-token primitives, the 4-building model, and seed interop (provenance-only). It supersedes `Early_json_schema`.

> **What changed in v0.3 (grounding reconciliation).** Verified against `ultimatedarktower` (^2.3.0 → v2.5.0) + the content repo: light model clarified (§9 — the **physical** tower plays only its fixed baked sequences + 6-effect firmware set; programmable/custom sequences are a **software-tower** feature; **MVP = baked sequences only**); roster/location attributions corrected (§13 — Board, not UDT; `GLYPHS` and a seed parser *are* UDT); **Building config resolved** (§13 — 4 types from `buildings.md`); adversary-token primitives, item gains, and carry-limit enforcement added to §F; MVP scenario pinned below. The v0.2 dungeon sub-editor (§5) is unchanged.

> **MVP scenario (coverage target).** The recommended first game: main goal *Recover Azkol's Treasures*, adversary **Ashstrider** (drops **River of Fire** tokens), foes **Brigands (Tier 1 / L2) / Frost Trolls (Tier 2 / L3) / Dragons (Tier 3 / L4)** *(levels confirmed via the seed tier→level mapping; matches the documented baseline seed `AA9A-AAGS-W634`)*. Every block here should suffice to author and run this scenario. Competitive mode is post-MVP.

> **What changed in v0.2.** The Dungeon block (§5) is now a full **click-into sub-editor** spec — a 4-direction square grid of Room sub-nodes with directional doors, per-room events/text, and a single master bitmap auto-sliced across the cells so the dungeon image assembles "like puzzle pieces" as it's explored. Grounded against the `mcp-server-return-to-dark-tower` content repo (dungeon trait set, exploration flow, persistence, board token, `dungeonIdle` light, `Dungeon` audio category). The §13 Dungeon config row is updated to match.

This document defines the **user-draggable blocks (nodes)** that make up the Scenario Creator palette — the things a designer drops onto the canvas and wires together to author a custom *Return to Dark Tower* scenario. It is scoped to the **base co-op game** (and the competitive variant the rules already describe). Alliances and Covenant content are deliberately deferred — see §16.

The goal is full coverage: every rule, resource, action, event, and tower behavior needed to author and play the base game should map to a block here, with no logic the UDT ecosystem already owns re-implemented (Creator PRD §2.2, §5).

---

## 0. Design stance

Three principles drive the block design:

1. **Compose, don't re-author.** Rosters, locations, adjacency, statuses, and named light sequences come from UDT/Board; the board state comes from Board; light-sequence authoring uses Display's format. Blocks that touch those things **reference** them rather than redefining them (PRD §2.3, §8). The net-new blocks are the *rules, flow, decks, events, dungeon/skull logic, and the authoring verbs* on top.
2. **Bounded vocabulary.** The early schema's `additionalProperties: true` effects are unvalidatable (PRD §8). Every effect/trigger/condition here is a **named block with typed properties**, so the Creator can validate and the Player can execute it.
3. **Executable graph.** Action/effect/tower blocks map onto real controller commands (Board's `spawnFoe`/`placeHero`, UDT tower commands, Display sequences) so the same graph the author wires is what the Player's rules engine walks (PRD CR-6.9; Player PRD §6.1).

---

## 1. How to read this catalog — node anatomy & conventions

The Creator follows the **Node-RED visual model** where it helps, and departs from it where the game needs something Node-RED doesn't have.

### 1.1 Anatomy of a block

| Aspect | Meaning |
| --- | --- |
| **Category** | Palette section. Each has a color **and** an icon/shape **and** a text label — never color alone (CR-6.8). |
| **Ports** | Inputs (left) / outputs (right). Notation below: `in → out`. `—` = no port on that side. Named outputs are listed in brackets. |
| **Surface** | What the block produces at *runtime* in the Player. One of the four values in §1.3. |
| **Properties** | The fields the author fills in the edit panel. This is the block's contract. |

### 1.2 Flow nodes vs. config nodes (the Node-RED distinction)

- **Flow nodes** are wired into the graph (have ports). They are *when/what-happens* — the spine, actions, effects, events, triggers, tower output.
- **Config nodes** have **no ports**. They are shared, reusable *definitions* referenced by flow nodes via a dropdown (e.g. a Foe definition, a Building, a Deck, a custom Light Sequence). This is exactly the Node-RED config-node pattern, and it's the right home for everything the scenario "has" rather than "does." The grey `Location:` nodes in the current draft graph are config-style references; §13 generalizes that.

This split is the answer to "what has UI and what doesn't": **config nodes have a Creator editor form but no runtime presence of their own** — they only matter when a flow node references them.

### 1.3 Surfaces (runtime presence)

Every flow block is tagged with exactly one surface:

- **App** — presents a table-facing screen/prompt in the Player (a picker, the battle screen, read-aloud text, the market, a confirm). These blocks need authored prompt text, button labels, choices.
- **Tower** — produces *physical* tower output (lights, sound, drum, seals, skull counter) via the Relay. No app screen of its own.
- **Media** — produces *app/device* output (video, sound, image, narration) — the cinematic channel, distinct from Tower output (CR-7.8.4).
- **Silent** — mutates game state with no surface of its own (gain spirit, escalate a foe, spawn a foe). The board/HUD reflects the result.
- **Author-only** — config nodes; no runtime surface.

### 1.4 Graph-hygiene blocks (borrowed from Node-RED)

Because the flow graph is large, the palette includes Node-RED's organizational primitives:

- **Subflow** — package a reusable sub-graph as a single block (Battle, Dungeon, Reinforce-at-building, a reusable Event are natural subflows).
- **Link Out / Link In** — virtual wires across the canvas. Used to route the `Event(s)` outlet to the individual event sub-graphs and back, and to funnel every "this can cause a corruption" path into one shared handler without spaghetti.
- **Group / Comment** — visual grouping and annotation only; no runtime effect.
- **Catch / On-Fail** — a hook that fires when an effect can't fully resolve (the "lose what you can, gain one corruption" rule, applied uniformly).

---

## 2. Category map

| Category | Color | Icon / shape | Wired? | Role |
| --- | --- | --- | --- | --- |
| A. Lifecycle & Flow | Slate | ▸ rounded bar | flow | The spine: start, setup, month/turn/phase, end |
| B. Turn Actions | Amber | 📄 document | flow | What a hero does on a turn |
| C. Battle & Dungeon | Red | ⚙ gear | flow | Battle and dungeon sub-flows |
| D. Events | Olive | ✉ envelope | flow | End-of-turn event categories |
| E. Triggers & Conditions | Cyan | 🔍 magnifier / fork | flow | Sources, routing, gates |
| F. Effects (verbs) | Green | ⚡ bolt | flow | The closed state-mutation vocabulary |
| G. Tower Program | Indigo | 🗼 tower | flow | Physical tower channels |
| H. Cinematic / Media | Purple | 🎬 film | flow | App/device video, sound, image, narration |
| I. Win / Loss | Charcoal | 🏁 flag | flow | Goal, win and loss conditions |
| J. Config / Reference | Grey | 🗺 card | config | Shared definitions: rosters, locations, decks, assets |
| K. Graph hygiene | Neutral | ⋯ | mixed | Subflow, link, group, comment, catch |

---

## 3. Category A — Lifecycle & Flow

The orchestration spine. This is the graph the Player walks at runtime (Player PRD §6.1); the Creator both authors it and dry-runs it in the simulator.

| Block | in → out | Surface | Key properties |
| --- | --- | --- | --- |
| **Game Start** | — → [next] | App (opt. intro) | Entry point; optional title/intro splash; initial scenario flags |
| **Import Seed** *(optional)* | — → [next] | App / Author-only | Decode an official 12-char seed via UDT's `udtSeedParser` and **pre-fill** the selection nodes — foes (×3 tiers), adversary, **ally**, difficulty, expansions, source, player count. The seed's RNG section is *not* consumed (the Creator authors content explicitly); **Main Goal is not in the seed**, so it stays a separate selection |
| **Select Game & Difficulty** | 1 → [next] | App | Available difficulties (Heroic default, Gritty); turns-per-month modifier per difficulty (Gritty = fewer); expansion toggles (reserved) |
| **Select Adversary** | 1 → [next] | App | Adversary pool (refs to Adversary config §13); placement of adversary token; bound to its main-goal pairing |
| **Select Foes** | 1 → [next] | App | Foe pool by tier; constraint *one each of Level 2 / 3 / 4*; spawn placement rules |
| **Select Main Goal** | 1 → [next] | App | Main-goal quest ref → quest-marker placement. **Not encoded in the official seed** — a Creator-level selection. *(Rules pair the main goal with a companion; confirm whether that companion is the same as the seed's Ally or distinct.)* |
| **Select Ally** | 1 → [next] | App | The main companion/ally (the seed's `ally` field — 10 options). Refs the Companion config §13 |
| **Board Setup** | 1 → [next] | App | **Embeds Board's editing UI.** Starting `BoardState`: hero figures on home-kingdom citadels, initial foes/adversary, skulls-on-buildings, monuments, markers; supply skull count (default 24) |
| **Start Month** | 1 → [first turn] | Silent/App | Month index (1–6); turn budget basis = player-count scaling §13; **month-end range** (per-month or one default range — the new contract field, Player PRD §7.5.5); month banner |
| **Player Turn** | 1 → [Start, Middle, End] | Silent | Turn-order rule: clockwise; first turn of months 2+ = player left of last month's final player |
| **Action: Start** | 1 → [Banner, start-of-turn effects] | Silent | Hosts the optional Banner + any "start of turn" hooks, any order |
| **Action: Middle** | 1 → [Move, Heroic(Cleanse/Battle/Quest), Reinforce] | Silent | Enforces *any order*, *one heroic action*, *split-move allowed* |
| **Action: End** | 1 → [Skull Drop → Events] | Silent | Sequences end-of-turn: skull drop → place emergent skulls → events; sets the **item-lock** after the drop |
| **New Month Check** | 1 → [continue, end-month] | Silent | Resolves month-end within the authored range (random-in-range or trigger-advanced — open Q, Player PRD §11.1) |
| **New Quests** | 1 → [next] | App | Months 2+: emit a **companion quest** (reward on success) and an **adversary quest** (adversary advances on fail); both fail if unfinished by month end |
| **Game End** | 1 → — | App | Resolve to the Win or Loss screen (terminal) |

> The current draft graph's `Clense` node is the **Cleanse** heroic action (spelling fix), and its `Start Month` clock node is this Start Month block.

---

## 4. Category B — Turn Actions

What a hero may do during a turn. All are net-new (rules logic), but they *call into* Board/UDT for placement and the movement graph.

| Block | in → out | Surface | Key properties / rules |
| --- | --- | --- | --- |
| **Banner** | 1 → [next] | App | References the acting hero's banner action; optional; **cannot be deferred**; resolves with other start-of-turn effects |
| **Move** | 1 → [next] | App + board | Move value (from hero); **double = spend 1 spirit, declared before moving**; modifiers applied **before** doubling; adjacency via UDT movement graph (`neighborsOf`/`stepDistance`/`shortestPath`); river-cross rule; nothing on board blocks movement |
| **Cleanse** | 1 → [next] | App | Remove **all** skulls from a building on the hero's space; only where skulls exist (unless an ability allows); **+2 spirit** on completion |
| **Battle** | 1 → [Battle subflow] | App | One heroic action/turn; enters the Battle subflow §5; **+2 spirit** on completion |
| **Quest** | 1 → [Quest/Dungeon] | App | Press-and-hold quest; requirements (location / resources / defeat foe / clear dungeon); **+2 spirit** on completion |
| **Reinforce** | 1 → [building menu] | App | Once/turn at a building space; offers the building's **free** and **spirit-enhanced** effects (from Building config §13); optional **Haggle Die** beforehand |
| **Skull Drop** | 1 → [Events] | App + Tower | **Mandatory** end-of-turn; physical drop the tower senses (skull-counter change via Relay); triggers emergence; sets **item-lock for the rest of the turn** |
| **End Turn** | 1 → [next] | Silent | Advances clockwise turn order; hands off to New Month Check |
| **Trade** | 1 → [next] | App | Once/turn with heroes on same space; mutual consent; warriors/spirit/items/companions only; **never** virtues or corruptions |

**Reinforce → Location outlets.** The draft graph wires Reinforce to `Citadel / Sanctuary / Village / Bazaar`. Those are **Location/Building config references** (§13), not actions — they select *which building's* free/enhanced effect set applies. Citadel adds the "gain a virtue with spirit" affordance; Sanctuary adds "remove a corruption with spirit."

---

## 5. Category C — Battle & Dungeon

Reusable sub-flows. Both are good candidates to package as **Subflows** (§1.4) so an author drops one node and configures it.

### Battle subflow

| Block | in → out | Surface | Key properties / rules |
| --- | --- | --- | --- |
| **Select: Foe** | 1 → [Card Select] | App | Choose a foe on the hero's space; compute **automatic Advantages** |
| **Card Select** | 1 → [Next, Apply Advantage, End] | App | Draw battle cards = **foe level** (2–4; adversary = 5); reveal one at a time |
| **Apply Advantage** | 1 → [Card Select] | App | Spend Advantages to improve a card; **max 10 per heroic action**; no undo; each card has a best achievable result |
| **Battle Card** *(def, config)* | — | Author-only | Per-card outcomes keyed to advantage thresholds; losses → resolve, else single corruption |
| **Retreat** *(adversary only)* | 1 → [next] | App | Allowed only after **≥1 card** resolved; adversary fights are cumulative |
| **End (battle)** | 1 → [next] | App | Foe defeated → remove token; **Advantages spent on the adversary persist** across battles/heroes/turns |
| **Remove Foe (no battle)** | 1 → [next] | App | Via foe-status screen; **not** a heroic action (no +2 spirit); **adversary cannot be removed this way** |
| **Foe Status** | 1 → [next] | App | View foe info; entry point for remove-without-battle |

### Dungeon subflow *(click-into sub-editor)*

The **Dungeon** block is a **subflow you double-click into.** Its internal canvas is a **4-direction square grid**; the author drops **Room** sub-nodes onto cells and connects orthogonal neighbors with **doors**. One **master bitmap** sits behind the grid and is auto-sliced to the cells, so each room reveals its slice as it is entered and the dungeon picture assembles **like puzzle pieces** as exploration proceeds. Subflow ports: `in [enter] → out [completed, left]`.

This honors the source rules — the text-rule flow of "choose a room → apply results → continue or leave → clear the target room" becomes "move through an open door to an adjacent room, resolve it, then move again or leave." Grounded fields (trait set, persistence, token, exploration cues) come from the content repo.

**Dungeon-level properties** (on the Dungeon node; see the §13 Dungeon config):

- **id, name**
- **trait** — `Beast | Magic | Humanoid | Melee | Undead | Stealth` — sets which Advantages apply and the board token's face
- **grid size** — columns × rows
- **master bitmap** — one image (from Resources §13) auto-sliced to the grid; a room may override its own slice
- **entrance** — one or more start cells; **target room** — exactly one; clearing it completes the dungeon and its quest
- **exploration cues** — dungeon-idle light (default `dungeonIdle`, Tier-1 named or a custom Display sequence) + an ambient `Dungeon`-category tower clip; both overridable
- **spawning quest** — the quest that spawns this dungeon (auto-completed on clear)
- **board token** — trait shown on the board; removed on completion or by event

**Room sub-node (the square):**

| Property | Meaning / rules |
| --- | --- |
| **cell position** (col, row) | Fixes which master-bitmap slice the room reveals |
| **exits** N/E/S/W | Each is **Wall** or **Door**. A door is a wire from this room's directional port to the neighbor's opposite port — **two-way by default**; the wire *is* the corridor, and the editor validates geometric consistency (an E door must reach the cell to the east) |
| **inside event** | A small effect graph (reuses §F effects / §D events): battle a foe, lose resources → one corruption if unresolved, grant rewards, reveal info, or branch on a condition. This is the "apply results" step |
| **display text** | Read-aloud shown on entry |
| **bitmap slice** | Auto-derived from cell position against the master image; per-room override allowed |
| **flags** | is-entrance, is-target |
| **improve-once** | Whether **1 Advantage** may improve this room's result (each room improvable once) and the improved outcome |
| **cleared persistence** | Cleared state persists for **any hero**; defines what a cleared room shows on re-entry (revealed slice, no re-resolution) |
| **enter requirement** *(opt)* | e.g. a quest item gates the room |
| **per-room tower cue** *(opt)* | Light/sound on entering this specific room |

**Runtime walk (Player):** enter → land on an entrance room, reveal its text + bitmap slice, resolve its inside event (optional 1-Advantage improvement) → move through an open door to an orthogonally adjacent room, **or** leave at an entrance (no board-move cost — exploration is part of the Quest heroic action) → cleared rooms stay cleared → clearing the **target room** completes the dungeon **and its quest** and removes the board token.

**Editor interactions:** double-click Dungeon → nested grid canvas with the master bitmap previewed beneath the cells; drop Room sub-nodes; toggle doors between adjacent cells (or wire directional ports); a per-room inspector holds text, entrance/target flags, the improve-once outcome, and the inside-event mini-graph. **Validation:** exactly one target room; target reachable from an entrance via doors; door directions geometrically consistent; the master bitmap covers the grid; all references resolve.

**Node-RED mapping:** Dungeon = a **Subflow** (`enter` in; `completed`/`left` out); **Room** = a node type that exists only inside the dungeon subflow; **doors** = wires on directional ports; the master image + grid live on the subflow's config.

| Block | in → out | Surface | Notes |
| --- | --- | --- | --- |
| **Dungeon** *(subflow)* | enter → [completed, left] | App | The container above; click-into grid editor |
| **Room** *(sub-node)* | door ports N/E/S/W | App | The square; properties above |
| **Relic / Tower-Dungeon** *(competitive option)* | 1 → [next] | App | Competitive structure: heroic tests → enter tower dungeon → find relic; behind a scenario option |

---

## 6. Category D — Events

Events fire at the end of most turns (`Action: End → Event(s)`). The **Event(s)** block is a router into the seven categories; each category block carries the read-aloud text and dispatches effects (§F) and tower output (§G).

| Block | in → out | Surface | Key properties / rules |
| --- | --- | --- | --- |
| **Event(s)** | 1 → [one per fired event] | Silent | Container/router; selects which event(s) fire this turn (schedule or condition) |
| **Foes Strike** | 1 → [next] | App | Foes move and/or strike; **skipped if none of that foe on board** |
| **Foes Spawn** | 1 → [next] | App | New foes appear (uses `Spawn Foe` effect + placement) |
| **Foes Grow in Power** | 1 → [next] | App | Escalate foe status (uses `Escalate Foe Status`); skipped if none on board |
| **The Tower Stirs** | 1 → [next] | App + Tower | Rotate the Tower or remove a seal (glowing-lights indicator); place emergent skulls |
| **The Tower Acts** | 1 → [next] | App + Tower | Adversary strikes from within the Tower |
| **Companion Event** | 1 → [next] | App | Beneficial companion effect |
| **New Wares** | 1 → [next] | App | Refresh the market (uses `Refresh Market`) |
| **Read-Aloud / Prompt** | 1 → [choices…] | App | Authored body text; optional **choices** (label → outcome) — generalizes the early schema's `prompt` + `choices` |

---

## 7. Category E — Triggers & Conditions

Sources and routing. These are the Node-RED `inject` / `switch` analogues, plus the game-specific glyph gate.

| Block | in → out | Surface | Key properties / rules |
| --- | --- | --- | --- |
| **Trigger: Schedule** | — → [fire] | Silent | Fire on month *X* / turn *Y* / every *N* turns (generalizes New Month Check; reconciles the early schema's `event_schedule`) |
| **Trigger: On State** | — → [fire] | Silent | Hook a game moment: on-foe-defeated, on-corruption-gained, on-building-destroyed, on-seal-removed, on-quest-complete, on-main-goal, on-adversary-spawned |
| **Condition: Check** | 1 → [true, false] | Silent | Compare a resource/flag/board fact (e.g. spirit ≥ 1, seals removed ≥ 6, foe on space) |
| **Branch / Switch** | 1 → [n named outs] | Silent | Route by condition; the green fork nodes in the draft graph (Select…, Next) are this shape |
| **Glyph Gate** | 1 → [allowed, blocked] | App | While a revealed glyph faces the hero's home kingdom, require **1 spirit** to take the matching action (Banner/Quest/Battle/Reinforce/Cleanse), else block. Reads UDT `GLYPHS` via the Relay |
| **Random / Roll** | 1 → [outcomes] | App/Silent | Haggle Die (5 outcomes), or random-within-range (e.g. month-end resolution) |
| **Set Flag / Counter** | 1 → [next] | Silent | Scenario-scoped variable for branching and bespoke conditions |

---

## 8. Category F — Effects (the closed verb vocabulary)

These are the **bounded effect library** the PRD requires (§8). Each is a typed, validatable mutation. Most are **Silent**; board mutations dispatch through Board's reducer, tower mutations route to §G. An author composes events, quest outcomes, and battle-card results out of these.

### Resources & hero state

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Gain Resource** | Silent | Warriors / spirit, amount |
| **Lose Resource** *(mandatory)* | Silent | Resolve what's possible; if not fully → **one** corruption (Catch §1.4) |
| **Spend Resource** *(optional)* | Silent | Author-offered spend; does not stack with item's normal effect |
| **Gain Corruption** | App | Draw top corruption card, apply immediately; **≤1 per source**; **3rd corruption = loss** |
| **Remove Corruption** | App | e.g. at a Sanctuary by spending spirit; returned to bottom of deck |
| **Activate Virtue** | App | Flip an inactive virtue (e.g. spirit at a Citadel); immediate |
| **Grant Virtue** | Silent | Scenario-granted virtue |
| **Gain Item** | App | Gain a **potion** (top of potion deck) / **gear** (from a gear stack; gear often grants **automatic Advantages**) / **treasure** (from the market). Backs the building free/enhanced effects |
| **Enforce Item Limits** | App/Silent | Carry limits: gear = one of each (6 types), treasure = max 4, potions/quest-items unlimited; gaining a duplicate gear or a 5th treasure forces losing one |

### Foes & adversary

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Spawn Foe** | Silent | Board `spawnFoe`; foe ref + location + starting status |
| **Move Foe** | Silent | Across kingdoms via movement graph |
| **Remove Foe** | Silent | Board reducer; adversary exempt from no-battle removal |
| **Escalate Foe Status** | Silent | Step the **Panicked → Unsteady → Ready → Savage → Lethal** ladder |
| **Spawn Adversary** | Silent + Tower | On main-goal completion: place adversary on the board so it can be battled |

### Tokens & counters *(adversary / bespoke mechanics — added v0.3)*

Adversaries introduce typed tokens with their own rules; the MVP adversary (Ashstrider) alone requires the first row.

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Place Typed Token** | Silent | A named token on a space **or board edge** (e.g. a river), with optional rules: a **movement-crossing penalty** (Ashstrider's *River of Fire* → crossing costs 6 warriors) and a **removable / non-removable** flag |
| **Per-Hero Counter Token** | Silent | Accumulating token on a hero board with a **threshold effect** (Lingering Rot's *Spore* → at 3, clear all and gain a corruption instead) |
| **Remove Token** | Silent | Remove a typed token; respects the non-removable flag |

### Board, skulls & buildings

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Place / Move Hero** | Silent | Board `placeHero`; valid spaces only |
| **Place Monument / Marker** | Silent | Board state |
| **Place Skull(s)** | Silent + Tower | On a building in the kingdom of emergence; **home owner chooses for own kingdom, dropper chooses for dormant** |
| **Remove Skull(s)** | Silent | Return to supply |
| **Destroy Building** | Silent | 4th skull: remove building + its 3 skulls, return the 4th to supply; **home-kingdom owner gains a corruption** (none for dormant) |
| **Modify Skull Supply** | Silent | Difficulty lever (default 24); empty supply = loss |

### Decks, market & quests

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Draw Card** | App | From a named deck (gear/treasure/potion/corruption/quest/companion) |
| **Discard / Reshuffle** | Silent | Deck maintenance |
| **Refresh Market** | App | New Wares: replace face-up treasures |
| **Acquire / Replace (Market)** | App | Market interactions the scenario allows |
| **Complete Quest** | App | Resolve a quest; may grant companion/quest item |
| **Spawn Dungeon** | Silent | Link a quest to its Dungeon subflow |
| **Place Quest Marker** | Silent | Board marker for active quests / main goal |

### Tower-state shortcuts (thin wrappers over §G)

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Remove Seal / Replace Seal** | Tower | Indicated by glowing lights; emergent skulls placed; reveals glyphs |
| **Rotate Drum** | Tower | Requires calibration; prefer the Rotation Bundle (§9) |

---

## 9. Category G — Tower Program

The physical channels, grounded on UDT's command surface (verified against UDT v4.1.0). Each block targets **one channel**, sequenced on the tick timeline. On the **physical** tower the light model is fixed: the 21 baked `TOWER_LIGHT_SEQUENCES` plus per-LED/group `LIGHT_EFFECTS` (×6), with no brightness interpolation; fully programmable/custom sequences are a **software-tower (Display)** feature. **MVP allows only the baked named sequences (Tier 1).** **Never chain on command-complete** — the tower reports "complete" when an action *starts*, so coordination uses explicit timed waits (CR-7.8.3).

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Light Sequence (Named)** — *Tier 1* | Tower | Reference one of the **21** `TOWER_LIGHT_SEQUENCES` by id — e.g. `victory`, `defeat`, `sealReveal`, `monthStarted`, `dungeonIdle`, `rotationAllDrums` / `rotationDrumTop` / `…Middle` / `…Bottom`, `twinkle`, `flareThenFade`, `angryStrobe01-03`, `gloat01-03`. No custom authoring |
| **Light Program (Custom)** — *Tier 2 · software tower · post-MVP* | Tower (emulator) | Programmable / custom light sequences run on the **software tower (Display)**; the **physical** tower plays only its fixed baked sequences, so custom authoring targets the emulator. Display's richer authoring format is real there. **Excluded from MVP** — MVP uses Tier-1 baked sequences only. (Per-LED `LIGHT_EFFECTS` ×6 exist as physical primitives but are also out of MVP scope.) |
| **Tower Sound** | Tower | UDT tower-speaker clip — **firmware-bounded** (`TOWER_AUDIO_LIBRARY`); distinct from app audio (§H) |
| **Drum Rotation** | Tower | Rotate level(s); calibration required |
| **Seal Break / Replace** | Tower | Break or replace a seal; glowing-lights indicator |
| **Skull Drop / Counter** | Tower | Trigger emergence / read the counter |
| **Timed Wait** | Silent | Explicit wait on the **50 Hz / 20 ms-per-tick** timeline (half-open `[atTick, endTick)`); the safe way to coordinate channels |
| **Rotation Bundle** | Tower | Drum rotation **+ matching `rotation` light sequence** as one unit, so physical and visual stay in sync (CR-7.8.5) |
| **Tower Timeline** *(container)* | Tower | Coordinates the above on one tick timeline (e.g. dim → ominous sound → rotate → break seal) |

**Hardware limits surfaced at authoring time (CR-7.8.6):** 24 LEDs across 6 layers × 4 lights, 12 seals, 3 drum levels, calibration required before reliable rotation. The Creator should block invalid programs.

---

## 10. Category H — Cinematic / Media

The explicitly requested cinematic channel. These target **app/device output** (Display's swappable audio pack or arbitrary assets), *not* the tower speaker — the UI must make the distinction clear (CR-7.8.4). All reference entries in the **Resources** registry (§13).

| Block | Surface | Properties / rules |
| --- | --- | --- |
| **Play Video** | Media | Video resource (uri); blocking vs. background; skippable; on-end → [next] |
| **Play Sound / Music (app)** | Media | Audio resource; loop; volume; fade; one-shot vs. ambient bed; distinct from Tower Sound |
| **Show Image / Splash** | Media | Image resource; duration or dismiss-on-tap; caption |
| **Narration / Text Card** | Media | Rich text; optional read-aloud (TTS); used for lore beats and event flavor |
| **Cutscene** *(container)* | Media | Compose video/sound/image/narration on a timeline; can run **alongside** a Tower Timeline (§9) for a coordinated cinematic moment (e.g. month-1 intro: splash + narration while the tower plays `month-started`) |

---

## 11. Category I — Win / Loss

| Block | in → out | Surface | Properties / rules |
| --- | --- | --- | --- |
| **Main Goal** | 1 → [next] | App | A special quest; **completing it spawns the adversary** on the board |
| **Win Condition** | 1 → [win] | App | Default: main goal complete **and** adversary defeated; custom conditions allowed |
| **Loss Condition** | 1 → [loss] | App | Any of: a hero's **3rd corruption**, the **6th month ends**, **empty skull supply**; plus custom triggers |
| **Competitive End** *(option)* | 1 → [end] | App | Relic found / last hero standing / nobody; hero elimination + dormant-kingdom conversion |

---

## 12. Category K — Graph hygiene (utility)

| Block | Role |
| --- | --- |
| **Subflow** | Package a reusable sub-graph as one node (Battle, Dungeon, Reinforce-at-building, reusable events) |
| **Link Out / Link In** | Virtual wires; route `Event(s)` to event sub-graphs and funnel shared handlers (e.g. all corruption paths) |
| **Group** | Visual grouping of related nodes; no runtime effect |
| **Comment** | Designer notes on the canvas; no runtime effect |
| **Catch / On-Fail** | Uniform handler for unresolved losses → single corruption |

---

## 13. Category J — Config / Reference (no ports, shared definitions)

These are the scenario's *nouns*. They have a Creator edit form but **no runtime presence of their own**; flow nodes reference them by id. Wherever the ecosystem already defines the type, the config node **wraps/references** it and adds only the net-new authoring fields.

| Config node | Wraps / references | Net-new authoring fields |
| --- | --- | --- |
| **Scenario Metadata** | early schema `metadata` | title, description, version, creator (name/email/homepage/social) |
| **Resources** | early schema `resources` | named registry of images / sounds / videos / documents (uri) — feeds §H and foe/event art |
| **Difficulty Profile** | — | Heroic / Gritty; turns-per-month modifier; skull-supply size; other levers |
| **Player-Count Scaling** | — | Turns/month per count (1→6, 2→7, 3→8, 4→9 *average*); dormant-kingdom setup + dormant skull-placement rules; scenarios must run 1–4 players |
| **Adversary** | UDT `ADVERSARY_ROSTER` (v4.1.0; re-exported by Board) | Level-5 battle behavior, the-tower-acts behavior, adversary quest, main-goal pairing, **bespoke tokens** (e.g. Ashstrider's River of Fire) |
| **Foe** | UDT `FOES` + `FOE_STATUSES` (v4.1.0; re-exported by Board) | Starting status, escalation triggers, strike behavior (~monthly), cross-kingdom movement, traits (Advantage types), battle definition; custom foes extend the roster shape |
| **Hero** | UDT `HEROES` (identity) + board-game-creator (rich data) | **Referenced, not authored** here. UDT v4.1.0 supplies hero *identity* (`HEROES`/`HERO_BY_ID`); the rich data — starting 7 warriors + 1 spirit, move value, banner, 3+3 virtues, kingdom virtue — is **still** board-game-creator/forthcoming |
| **Location** | UDT `BOARD_LOCATIONS` (v4.1.0; re-exported by Board) | Reference only — kingdom, terrain, building type (citadel/sanctuary/village/bazaar); the grey `Location:` nodes in the draft |
| **Building Type** | `buildings.md` *(resolved)* | **4 types**, one per kingdom (16 instances): **Citadel** (free: 1 potion / enh: gain a virtue), **Sanctuary** (free: 1 spirit / enh: remove all corruptions), **Village** (free: 2 warriors / enh: more warriors), **Bazaar** (free: 1 gear / enh: 1 treasure). Skull capacity 3; 4th destroys. The 4 Reinforce outlets in the draft graph map to these |
| **Dungeon** | — | Subflow with a **4-direction square grid** of Room sub-nodes; **trait** (Beast/Magic/Humanoid/Melee/Undead/Stealth); grid size; **master bitmap** auto-sliced to cells; entrance + single target room; doors between adjacent cells; per-room inside-event/text/slice; `dungeonIdle` light + `Dungeon`-category sound; cleared-room persistence; spawning-quest link; board token. Full spec in §5 |
| **Deck** | — | Category (gear/treasure/potion/corruption/quest/companion); cards + copy counts (gear = 3 each); market size |
| **Card** | early schema `cardArray` | id/name/type/description + **effect composed from §F vocabulary** (replaces open `additionalProperties`) |
| **Companion** | — | Main companion + recruitable companions; abilities; the quests that grant them |
| **Quest** | — | Requirements (location/resource/foe/dungeon); outcomes; whether it spawns a dungeon |
| **Light Sequence (Custom) Asset** | Display JSON | A custom sequence stored once, referenced by many Tower nodes |
| **Advantage Set** | UDT (glossary) | The six types + **Wild**; automatic (no cost) vs. conditional (cost); 10-per-action cap — mostly fixed, surfaced for reference |

---

## 14. Base-game coverage checklist

Every rule area maps to at least one block. (Rules and Glossary cross-referenced.)

| Rule area | Covered by |
| --- | --- |
| World/hero/app setup, starting board & resources | Board Setup; Select Difficulty/Adversary/Foes/Main Goal; Player-Count Scaling; Hero/Adversary/Foe config |
| Months ≤ 6, turns clockwise, player-count turn counts, Gritty | Start Month; Player Turn; New Month Check; Difficulty + Player-Count Scaling |
| Turn structure: Start / Middle / End, any order, split move | Action: Start/Middle/End; Move |
| Banner (optional, non-deferrable) | Banner |
| Movement (value, double-via-spirit, modifiers, adjacency, rivers) | Move (movement graph) |
| Heroic actions + 2 spirit | Cleanse / Battle / Quest |
| Reinforce, building free/enhanced, Haggle Die | Reinforce; Building config; Random/Roll |
| Battle, advantages (≤10), adversary retreat & persistence, no-battle removal | Battle subflow; Apply Advantage; Retreat; Remove Foe |
| Quests, dungeons, cleared-room persistence, main goal → adversary spawn | Quest; Dungeon subflow; Main Goal; Spawn Adversary |
| Events (all 7 categories), read-aloud, seal/glyph reveal | Event(s) + category blocks; Read-Aloud; Remove Seal |
| Spending vs. losing; one corruption per source | Spend/Lose Resource; Gain Corruption; Catch/On-Fail |
| Trades | Trade |
| Skull economy: emergence, placement, building destruction, supply | Skull Drop; Place/Remove Skull; Destroy Building; Modify Skull Supply |
| Seals (12) & Glyphs (spirit-cost gate) | Seal Break/Replace; Glyph Gate |
| Corruptions (max 2, 3rd loses, removal) | Gain/Remove Corruption; Loss Condition |
| Virtues (3+3, activate by spirit at citadel) | Activate/Grant Virtue; Citadel location |
| Foe statuses (Panicked → Lethal), strike, escalation | Foe config; Escalate Foe Status; Foes Grow |
| Decks, market, corruption deck, potions | Deck/Card config; Draw/Discard/Reshuffle; Refresh Market; New Wares |
| Tower program (lights, sound, drum, seals, skull counter, timing) | All of §9 |
| Cinematics (video, custom sound, image, narration) | All of §10 |
| Win / Loss (incl. competitive) | §11 |
| Companions, monthly quests | Companion/Quest config; New Quests |
| Adversary bespoke tokens (River of Fire, Spore) | Place Typed Token; Per-Hero Counter Token; Remove Token |
| Item gains & carry limits (gear/treasure/potion) | Gain Item; Enforce Item Limits; Deck/Card config |

---

## 15. Contract dependencies these blocks imply

The catalog surfaces a few things the **shared schema** must carry (PRD §8, Player PRD §8):

1. **Closed effect/trigger/condition vocabulary** — §F/§E replace the early schema's `additionalProperties: true`; the schema must enumerate them.
2. **Month-end range** — the Start Month / New Month Check blocks need the per-month-or-default range field that isn't in the schema yet (Player PRD §7.5.5, §11.1).
3. **Building model — resolved.** 4 building types (Citadel/Sanctuary/Village/Bazaar) with per-type free/enhanced effects from `buildings.md`; schema models 4 type definitions, not 16.
4. **Starting state = Board `BoardState`** — Board Setup embeds Board's editor and serializes its state rather than re-describing the board.
5. **Tower channels reference real types** — light authoring = the 21 baked `TOWER_LIGHT_SEQUENCES` by id (the **MVP** ceiling; physical sequences are fixed firmware). Programmable/custom sequences are a software-tower (Display) feature, post-MVP — pin Display's format when used. Tower sound = `TOWER_AUDIO_LIBRARY` clip indices/categories — **resolved: this is a UDT export** (12 `SoundCategory`).
6. **Roster/board-data source — now in UDT v4.1.0.** Foes, adversaries, locations, adjacency + movement graph (`neighborsOf`/`stepDistance`/`shortestPath`), statuses, heroes (identity), and monuments are exported from UDT's public API and re-exported by Board. `GLYPHS` was already in UDT. Pin `meta.pins.udt`; the prior "forthcoming/pre-release Board" risk is resolved for this layer (rich content data — virtues/banners/card effects — remains forthcoming).
7. **Adversary-token primitives** — the closed vocabulary must include a typed board/edge token with a movement-crossing penalty (River of Fire) and a per-hero accumulating counter with a threshold effect (Spore).
8. **Terminology fixes** — `enemies → foes`, `regions → kingdoms`, `hero_start_health →` the warriors/spirit/corruption model with heroes referenced from board-game-creator.

---

## 16. Reserved for later (out of scope for v0.1)

- **Alliances** and **Covenant** content — their block types, statuses, and any new tower behaviors will be added once the base-game palette is settled.
- **Expansion toggles** (Select Difficulty) are stubbed but inert.
- **Remote/multiplayer view sharing** — a runtime concern deferred in the Player PRD; no authoring blocks yet.
