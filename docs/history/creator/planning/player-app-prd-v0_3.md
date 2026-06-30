# Return to Dark Tower — Player App

**Product Requirements Document — v0.3**
**Status:** Draft for review · **Supersedes:** v0.2 · **Sibling to:** Creator PRD v0.3 · **Last updated:** 2026-06-25

> **Correction note (2026-06-25, glyph/seal ownership).** Aligns the runtime requirements with the Rules-Engine Contract v0.2 and Player↔Relay Protocol v0.1.2: **glyph facing and seal presence are engine-owned, not tower-reported.** Glyph facing is *derived* from the engine's mirrored drum positions (drums home at calibration and move only on commanded rotations; UDT `getGlyphsFacingDirection`); seal selection is *engine-commanded* (`breakSeal`) and seal presence has **no hardware sensor**, so it is remembered from commanded breaks, never read back. Only the **skull counter** and **`towerState`** (drum positions/calibration, for recovery) are observed via the Relay. Edits to PR-7.3.2, PR-7.7.4, PR-7.11.2, PR-7.15.3 below. Seal presence reaches the **emulator** for rendering via an app-level seal sidecar (it is not in the packed `TowerState`); the physical tower needs only the `sealReveal` animation + the player's hand.

> **Grounding update — re-verified against `ultimatedarktower` v4.1.0 (2026-06-23).** Three corrections to the v0.3 note below. (1) **Board data is now UDT's public API**, not a pre-release Board package: `BOARD_LOCATIONS`, `BOARD_ADJACENCY` + `neighborsOf`/`stepDistance`/`shortestPath`, `FOES`/`ADVERSARY_ROSTER`/`FOE_STATUSES`, `HEROES`/`HERO_BY_ID`, `MONUMENTS` — re-exported by Board. The "Board's, not UDT's / dependency risk" framing (§2.3, §7-table) is superseded for this layer; rich content data (virtues/banners/card effects) is identity-only and remains forthcoming. (2) The library has **21** baked sequences, **not 19** (§7.16). (3) `TOWER_AUDIO_LIBRARY` is a **UDT export** (§7.16's open question resolved). Separately, **the canonical schema has landed** (`scenario.schema.json`, `schemaVersion 0.3.0`) — the **month-end range is now in it** as `setup.monthEnd` (§7.5.5, §8 no longer pending).

> **What changed in v0.3 (grounding reconciliation).** Verified against `ultimatedarktower` (^2.3.0 → v2.5.0) + the content repo: (a) board data — locations, adjacency, movement graph, rosters, statuses — is **Board's, not UDT's** (UDT is tower-only); §2.3 corrected. (b) The **physical** tower plays only its **fixed baked sequences** (19 in the UDT library) + the 6-effect firmware set; programmable/custom light sequences are a **software-tower (Display)** feature — **MVP uses baked sequences only**; §7.16 corrected. (c) The **building model is resolved** — 4 building types from `buildings.md`, not 16 distinct; §7.7.3 corrected. (d) The **MVP scenario is pinned** — *Recover Azkol's Treasures* + Ashstrider + Brigands/Frost Trolls/Dragon; §3/§13. (e) Adversary-specific tokens (River of Fire, Spore) need vocabulary the closed set lacks; §11. (f) UDT carries a source-confirmed **seed parser** (`udtSeedParser.ts` + C# `System.Random` replica) for the official app's 12-char seeds — interop resolved in §11.8. Content card data is forthcoming in UDT; §10.

**Original v0.2 header:** Draft for review · Supersedes v0.1 · Sibling to Creator PRD v0.2

---

## What changed since v0.1

v0.1 modeled the Player as a BLE-driving host with a same-table, per-player multi-device session layered on "Sync." Grounding that against the real ecosystem corrected two things at once.

- **Transport is a standalone Relay, not an in-app session layer.** The former Sync work has been split: a dedicated **Relay** project now owns *all* tower connections. Its sole job is to take a **command source** and fan the command stream out to one or more **targets** — a physical tower over Bluetooth, a digital tower / emulator (Display), and/or one or more remote clients. The Player is simply one such source.
- **The Player owns the game; it does not own Bluetooth.** Game state and the rules engine live entirely in the Player — it takes the official companion app's seat as the thing that *runs the game*. But it drives tower output by emitting a command stream to the Relay and never manages a BLE connection itself. This **lifts the Web Bluetooth platform constraint off the Player** (v0.1's defining limitation), since the Player needs only a network link to the Relay.
- **MVP is scoped — and now concrete.** The first deliverable is the recommended first game authored as a custom scenario and run end to end: main goal *Recover Azkol's Treasures*, adversary **Ashstrider**, foes **Brigands (Tier 1 / L2) / Frost Trolls (Tier 2 / L3) / Dragons (Tier 3 / L4)** *(levels confirmed via the seed tier→level mapping; matches the documented baseline seed `AA9A-AAGS-W634`)*. Remote / multiplayer **and competitive** play are explicitly deferred.
- **Target choice + month-end range.** The Player presents a real-tower-vs-emulator choice (both go through the Relay), and month-end is a **Creator-defined range** (per-month, or one default range for all months) that the Player consumes — a setting the shared schema and the Creator's month-end-check block still need to add.
- **Accuracy + gaps from review folded in.** Month-end is no longer modeled as a fixed turn budget; decks/market, the corruption deck, potions, a designer play-log, and a turn timer are added; the physical↔digital recovery boundary is acknowledged; and platform/resilience/API facts are now grounded on the real repos.

---

## 0. What this is

The **Player app** is the runtime end of the contract the Scenario Creator authors. The Creator *produces* a scenario file offline against a software tower; the Player *consumes* it and runs a complete game **live at the table**, taking the place of the official companion app as the thing that owns game state and drives the tower. It is the second host on the shared UDT stack: same monorepo, same shared packages, opposite job.

It leans on the Creator PRD's §2 (layer map, build/reuse, monorepo) rather than restating it, and adds the concerns that are specifically the Player's: **running the shared rules engine live as the source of truth**, **driving tower output through the Relay**, and **table-side runtime UX**.

---

## 1. Summary

The Player takes a portable scenario file and runs a full *Return to Dark Tower* session — guided setup, the month/turn/phase flow, heroic actions, battles, dungeons, events, decks and the skull economy, win/loss — emitting the tower's lights, sound, drum rotation, seal breaks, and skull-counter activity as a command stream to the Relay, which delivers it to a physical tower or an emulator interchangeably.

The Player does not author anything and does not reinvent what the ecosystem already solves. It runs the shared rules engine, renders state through Display/Board, and sends tower commands to the Relay. Its net-new value is the **live runtime**: the table-facing UX, the input → engine → effects loop, the Relay-client integration, and game persistence/recovery.

---

## 2. Architecture — the runtime host on the UDT ecosystem

The Player and the Creator are the two hosts in Creator PRD §2. The layer map is identical; the Player occupies the *live* end of every layer the Creator uses in *preview*, with one structural change from v0.1: tower transport is externalized to the Relay.

### 2.1 Where the Player differs from the Creator

| Layer | Creator uses it for… | Player uses it for… |
| --- | --- | --- |
| Rules engine | Runs in a simulator | **Runs live** as the source of truth |
| Tower transport (Relay) | Not needed (software preview) | **Required** — emits the command stream to the Relay |
| Bluetooth / Web Bluetooth | Optional, in-app preview only | **Not used in-app** — owned by the Relay |
| UDT board data / rosters / sequences | Validating authored references | Resolving the running scenario's references |
| Display | Software-tower preview | Live tower render + as a Relay target (emulator) |
| Board | Embedded editor + preview surface | Live `BoardState` the table acts on; editing UI reused for **setup** |

### 2.2 The runtime loop (the spine)

Every interaction follows one loop:

1. **Render** — present current `BoardState` + `TowerState` + scenario context via Display/Board renderers and the runtime UI.
2. **Capture intent** — a player declares an action (move, banner, heroic action, reinforce, end turn, resolve event, spend advantage, draw, etc.).
3. **Resolve** — feed the intent + current state to the **shared rules engine**, which validates legality, applies the scenario's rules, and emits effects.
4. **Dispatch effects** — board effects go to Board's reducer (`spawnFoe`, `placeHero`, skull placement…); tower effects are emitted as a **command stream to the Relay**, which routes them to the physical tower, an emulator, and/or clients. The Player is agnostic to which targets exist.
5. **Reconcile** — update `TowerState`/`BoardState`, persist a checkpoint, and reflect the result in the UI.

The Creator runs steps 3–4 in a simulator against a software tower; the Player runs them live. **One rules-engine implementation, two consumers** (Creator PRD §2.4).

### 2.3 Build vs. reuse

| Concern | Source | Build or reuse |
| --- | --- | --- |
| Locations, adjacency, movement graph, rosters, foe statuses | **UDT v4.1.0** (public API; re-exported by Board) | Reuse — risk resolved |
| Named light sequences (21), audio library (`TOWER_AUDIO_LIBRARY`), glyphs, tower state | UDT v4.1.0 (verified) | Reuse |
| Tower render + light-sequence playback; emulator target | Display | Reuse + embed |
| `BoardState`, reducer, save/load, renderers, editing UI (for setup) | Board | Reuse + embed |
| Tower transport + fan-out (BLE / emulator / clients) | Relay | Reuse (talk to it) |
| Scenario schema + types | shared workspace pkg | Reuse (consume) |
| Rules engine (turn flow, events, win/loss, decks, dungeon, skull economy) | shared workspace pkg | Reuse (run live) |
| Validation / ecosystem adapters | shared workspace pkg | Reuse |
| Runtime table UX (setup, turn HUD, battle/dungeon/event/market screens) | — | **Build** |
| Relay-client integration (connect, emit commands, read status, reconnect) | — | **Build** |
| Game persistence / crash & disconnect recovery | — | **Build** |

### 2.4 Shared monorepo packages the Player imports

The Player imports the same three workspace packages the Creator does — **scenario schema + types**, **rules engine**, and **ecosystem adapters + validation** — pinning the external ecosystem packages (UDT/Display/Board) at the workspace level so both apps stay version-aligned. The Player defines no scenario types of its own; any needed change lands in the shared package so the Creator gets it too.

### 2.5 The Relay layer (replaces v0.1's device-roles model)

Tower transport is a standalone **Relay** project, sitting between command **sources** and command **targets**:

- **Sources** — any producer of the tower's command stream: the Player app (custom scenarios), or the official companion app, etc. The Relay is source-agnostic.
- **Targets** — a physical tower (Bluetooth), a digital tower / emulator (Display), and/or one or more remote clients (each driving their own target). One source can fan out to many targets.
- **Dumb by design** — commands are full-state, idempotent ~20-byte snapshots, so the Relay carries **no game logic, turn state, or scenario data**. It mirrors tower output; it does not coordinate gameplay. A missed command is corrected by the next; late joiners catch up from the last full-state command.

For the Player this means: **the Player presents the user a choice of target — a real tower or an emulator — and requests that target from the Relay, but it never opens a Bluetooth connection, picks a device, or calibrates hardware directly.** Both routes go through the Relay; connection/calibration/health are the Relay's concern, surfaced back to the Player as status. Because the emulator is a first-class target rather than a special mode, no-hardware play (Player → Relay → Display) runs on the **same code path** as real-tower play, mirroring the Creator's software-tower preview.

> Grounding note: the Relay was recently split out of the prior Sync project and is not yet published. This section is grounded on its intended design plus the prior Sync architecture (full-state idempotent commands over WebSocket, with a tower-impersonating source path). Re-ground the Player↔Relay protocol against the real repo when available.

---

## 3. Goals & Non-Goals

### Goals

1. **Play the base game end to end** — load the recommended first game (*Recover Azkol's Treasures*, Ashstrider, foes Brigands / Frost Trolls / Dragon) authored as a custom scenario and run it from setup to win/loss. This is the MVP proof.
2. Run the shared rules engine live as the source of truth for turn flow, events, battle/dungeon resolution, decks, the skull economy, and win/loss.
3. Drive every tower channel the scenario uses (light sequences named + custom, sound, drum rotation, seal break/replace, skull drop/counter) by emitting commands to the Relay — to a physical tower or an emulator interchangeably.
4. Own game state completely, independent of the transport; survive Relay/network drops without losing game state.
5. Provide a guided, accessible table UX that mirrors the official companion app's flows (setup, turns, battle, dungeon, events, market, foe-status), parameterized by the scenario.

### Non-Goals

1. **No authoring.** The Player consumes and validates scenario files; it does not edit them (that is the Creator).
2. **No re-implementation** of board/tower rendering, rosters, the light runtime, or tower transport — owned by UDT/Display/Board/Relay.
3. **No in-app Bluetooth.** The Player does not manage Web Bluetooth, device selection, or calibration; it delegates all of that to the Relay.
4. **No independent rules logic.** The Player runs the shared rules-engine package; it does not fork or duplicate it.
5. **No multiplayer / remote-client play in the MVP.** Sharing the full game *view* (cards, prompts, board) to remote players is deferred (§11); the Relay only carries tower commands.
6. **No firmware changes; no content marketplace; no hero authoring** (heroes are referenced from board-game-creator, as in the Creator).

---

## 4. Target Users

- **The table / players** — the group physically present, sharing one Player device (the base game's model). Want minimal setup friction and clear in-the-moment prompts.
- **The scenario designer (playtest)** — overlaps with the Creator's Playtester: loads their own draft scenario and plays it for real, validating that what they authored actually runs. The Player is the final proof of the Creator's "100% of exported scenarios run" metric.
- **(Later) remote players / observers** — deferred with multiplayer (§11).

---

## 5. Scope — net-new vs. reused

The Player's **net-new scope** is the live runtime: the input → engine → effects loop, the table-facing runtime UI for every flow in §6–§7, Relay-client integration (connect, emit, read status, reconnect), and game persistence/recovery. Everything else — board/tower state and rendering, rosters, light sequences, tower transport, validation, and the rules engine itself — is reused from the ecosystem and the shared packages. As with the Creator, the explicit goal is **zero duplication** of logic the ecosystem already owns.

---

## 6. Runtime UX model

### 6.1 The authored flow graph is the runtime state machine

The node graph the Creator produces is precisely what the Player walks at runtime. Read against the current draft graph, the sequence is:

`Game Start → Select Game & Difficulty → Select Adversary → Select Foes → Board Setup → Start Month → Player Turn → {Action: Start, Action: Middle, Action: End} → … → New Month Check → New Quests → (next month) …`

- **Action: Start** → optional **Banner**.
- **Action: Middle** → **Move**, one heroic action (**Cleanse** / **Battle** / **Quest**), and **Reinforce**, in any order. Battle resolves through **Select: Foe → Card Select → {Next, Apply Advantage, End}**. Reinforce resolves at a building space.
- **Action: End** → **Skull Drop → Event(s)**.
- **New Month Check** detects month-end and runs **New Quests** (companion + adversary) from month 2 on.

The runtime does not invent this flow; it executes the scenario's authored graph through the rules engine. (The draft graph's "Clense" node is the Cleanse heroic action.)

### 6.2 Surfaces

The runtime UI reproduces the official app's button set against the scenario's content — Battle, Dungeon, Foe Status, Advantage, Event, Companion Quest, Adversary Quest, Main Goal, Completed Quest, Market, and a Game-Lost affordance — plus an always-on tower/board readout panel built on the light Display/Board renderers (3D lazy-loaded, per §9).

---

## 7. Functional Requirements

### 7.1 Scenario loading & validation

- **PR-7.1.1** Load a scenario file from local storage or a shared file/link and validate it against the shared schema **before** starting; refuse to run an invalid scenario, mirroring the Creator's export gate.
- **PR-7.1.2** Resolve all references (foe/adversary/hero/location/light-sequence ids) against the pinned ecosystem versions; surface a clear compatibility error on version mismatch rather than failing mid-game.
- **PR-7.1.3** Show scenario metadata (title, description, creator/attribution, version) before play.

### 7.2 Relay connection

- **PR-7.2.1** Connect to a Relay over its network protocol and emit the scenario's tower command stream to it. The Player **presents the user a target choice — real tower or emulator — and requests that target from the Relay**, but opens no Bluetooth and does not manage the connection itself. Fan-out to any additional targets (clients) remains the Relay's responsibility.
- **PR-7.2.2** Surface Relay-reported status: connection health, target connectivity (e.g. tower connected / calibrating / dropped), and the last-known tower state.
- **PR-7.2.3** Treat the emulator as one of the two user-selectable targets, not a hidden mode: selecting it routes through the Relay to Display so a full game runs with no physical tower, on the **same path** as real-tower play.
- **PR-7.2.4** Auto-reconnect to the Relay on network drop without abandoning the game; on reconnect, resynchronize from the last full-state command and the local game checkpoint (§7.15).

### 7.3 Tower connection & calibration *(via the Relay)*

- **PR-7.3.1** Request tower connection/calibration **through the Relay**; gate the scenario's first rotation on the Relay reporting a calibrated tower, but do not implement BLE or calibration in the Player.
- **PR-7.3.2** Maintain `TowerState` (drum positions + calibration) and **derive** glyph facing from it (`getGlyphsFacingDirection`) throughout the game; track drum positions from the engine's commanded rotations, re-syncing from the Relay's reported `towerState` only on recovery (not as a per-turn input).
- **PR-7.3.3** On a Relay-reported tower drop, hold game state and present a clear pause/reconnect affordance; rely on the Relay to reconnect/recalibrate and replay the last full-state command.

### 7.4 Game setup (guided)

- **PR-7.4.1** Walk the scenario's setup: confirm player count, apply the scenario's starting **Board `BoardState`** (hero placements, initial foes/adversary, skulls-on-buildings, monuments, markers) using Board's editing UI as the setup surface, and emit the scenario's setup tower program (initial seals, opening light/sound) to the Relay.
- **PR-7.4.2** Derive turns/month from player count (1→6, 2→7, 3→8, 4→9 *average*) and difficulty (Gritty = fewer), and establish dormant kingdoms for sub-4-player games.
- **PR-7.4.3** Distribute starting resources/virtues per the scenario and referenced heroes (warriors, spirit, hero + kingdom virtue tiles), and build the initial decks/market (§7.8).

### 7.5 Turn flow runtime

- **PR-7.5.1** Run the month → turn → phase loop from §6.1, ordering turns clockwise; first month one turn each; following months begin with the player left of the previous month's last player.
- **PR-7.5.2** **Start:** offer the optional Banner action (and "start of turn" effects), respecting that it cannot be deferred.
- **PR-7.5.3** **Middle:** allow Move, one heroic action, and one Reinforce in any order, including splitting movement around actions.
- **PR-7.5.4** **End:** require the end-of-turn skull drop; if skulls emerge, place them first, then resolve events; lock out item use for the rest of that turn once the skull is dropped.
- **PR-7.5.5** **Month-end uses a Creator-defined range.** The scenario carries a month-end range authored via the Creator's month-end-check block — either a per-month range or a single default range applied to every month. The rules engine resolves the actual month-end within that range; the Player does not impose a fixed turn count of its own. *(Resolved: now present in the canonical schema v0.3 as `setup.monthEnd` — `{ resolution, default: {minTurn,maxTurn}, perMonth? }`; the `resolution` policy — randomInRange vs triggerAdvanced — remains the open question, §11.)* On month-end (from month 2) run a **companion quest** (reward on success) and an **adversary quest** (adversary advances on failure); both fail if unfinished by month end.
- **PR-7.5.6** Enforce an optional **turn timer** when the scenario authors one.

### 7.6 Movement & board interaction

- **PR-7.6.1** Enforce movement against the UDT movement graph (`neighborsOf` / `stepDistance` / `shortestPath`): move up to the hero's move value, optionally spend 1 spirit to double (declared before moving), apply virtue/gear modifiers before doubling, and respect that nothing on the board blocks movement.
- **PR-7.6.2** Apply movement and all placements through Board's reducer so positions are always valid board spaces.

### 7.7 Heroic actions, Reinforce & Banner

- **PR-7.7.1** Permit exactly one heroic action per turn (**Cleanse** / **Battle** / **Quest**) and grant +2 spirit on completion.
- **PR-7.7.2** **Cleanse:** remove all skulls from a building on the hero's space (only where skulls exist, unless an ability allows otherwise).
- **PR-7.7.3** **Reinforce:** once per turn at a building space, offering the building's free and spirit-enhanced effects, with the optional **haggle die** beforehand (normal / +3 warriors / +1 potion / +1 gear / canceled). *(Resolved: there are **4 building types** — Citadel / Sanctuary / Village / Bazaar, one per kingdom, 16 instances — with per-type effects from `buildings.md`: Citadel free=1 potion, enhanced=gain a virtue; Sanctuary free=1 spirit, enhanced=remove all corruptions; Village free=2 warriors, enhanced=more warriors; Bazaar free=1 gear, enhanced=1 treasure. The prior "16 distinct buildings" framing was a mischaracterization.)*
- **PR-7.7.4** **Glyph enforcement:** while a revealed glyph faces a hero's home kingdom, require 1 spirit to take the matching action (Banner / Quest / Battle / Reinforce / Cleanse), or block it. Glyph facing is **derived** from the engine's mirrored drum positions (UDT `getGlyphsFacingDirection` over `GLYPHS`), not reported by the tower.

### 7.8 Decks & market *(added — net-new runtime)*

- **PR-7.8.1** Run the scenario's decks: gear stacks, treasure deck + the **face-up market**, potion deck, corruption deck, quest/companion decks — draws, discards, and reshuffles.
- **PR-7.8.2** Run the **market**: maintain the face-up treasures and refresh them on the **New Wares** event; support market interactions (acquire/replace) the scenario allows.
- **PR-7.8.3** **Corruption deck mechanic:** on gaining a corruption, draw the top corruption card, apply its effect immediately, and place removed corruptions on the bottom of the deck.
- **PR-7.8.4** Run **potions** and other consumables per their authored effects, respecting the post-skull-drop item lock.

### 7.9 Battle runtime

- **PR-7.9.1** Compute automatic Advantages, open the battle screen, select the foe, draw battle cards equal to foe level (2–4; adversary 5), and reveal them one at a time.
- **PR-7.9.2** Let players spend Advantages per card (up to 10 per heroic action, no undo) toward each card's best achievable result; resolve results; on an unresolvable loss, apply a single corruption.
- **PR-7.9.3** **Adversary exceptions:** allow retreat after at least one card resolved, and persist Advantages applied to the adversary across battles (cumulative across heroes/turns).
- **PR-7.9.4** **Remove-without-battling:** support effects that remove foes via the foe-status screen (no +2 spirit, not a heroic action); the adversary can never be removed this way.

### 7.10 Dungeon runtime

- **PR-7.10.1** Enter a dungeon, choose rooms, allow 1 Advantage per room (each room improvable once), apply results, and on an unresolvable loss apply a corruption.
- **PR-7.10.2** Persist cleared rooms across visits by any hero; complete the dungeon (and its quest) when the target room is cleared; allow leave/re-enter.
- **PR-7.10.3** Support the competitive Tower-dungeon / relic structure when the scenario enables it.

### 7.11 Events runtime

- **PR-7.11.1** Fire events at end of turn per the scenario across all categories (Foes Strike / Spawn / Grow, The Tower Stirs / Acts, Companion, New Wares), surfacing read-aloud text and dispatching the resulting board + tower effects.
- **PR-7.11.2** Skip foe events with no eligible foes on the board; on seal removal, the engine **chooses** which seal to break, commands the tower's `sealReveal` animation to light it, **pauses** while the player physically removes that seal, then continues; place any emergent skulls (count observed from the tower, never dictated). Whether a glyph sits behind the seal is derived from drum positions, not observed.

### 7.12 Skull economy & placement

- **PR-7.12.1** Enforce the supply (scenario-configurable, default 24) and the empty-supply loss condition.
- **PR-7.12.2** Distinguish the two skull flows: the **end-of-turn drop** is a physical player action the tower senses (reported via the Relay as a skull-counter change), while **event-driven emergence** is the tower mechanism the scenario triggers. **The *number* of skulls that emerge is determined by the physical tower (its internal state + rotation/seal action), not dictated by the scenario** — the Player triggers the action and reacts to the counter. Place emergent skulls in the kingdom where they emerged — home-kingdom owner chooses for their own kingdom, the dropper for dormant kingdoms.
- **PR-7.12.3** Enforce capacity: a 4th skull destroys the building (remove building + its 3 skulls, return the 4th to supply); a home-kingdom owner gains a corruption (none for dormant). Board models skulls-on-buildings as state; the rules engine owns these rules.

### 7.13 Quests, companions & win/loss

- **PR-7.13.1** Track and resolve quests (location/resource/foe/dungeon requirements), the monthly companion/adversary quests, companions and quest items, and the **main goal** — completing the main goal spawns the adversary on the board.
- **PR-7.13.2** **Win** when the main goal is complete *and* the adversary is defeated in battle.
- **PR-7.13.3** **Lose** on a third corruption (any hero), the end of the final month, or an empty skull supply — plus any custom loss triggers.
- **PR-7.13.4** Support competitive end conditions (relic found / last hero standing / nobody) behind a scenario option, with hero elimination + dormant-kingdom conversion.

### 7.14 Resource, corruption, virtue & glyph tracking

- **PR-7.14.1** Track per-hero warriors, spirit, items, companions, virtues (3 active + 3 inactive; activation by spirit at a citadel), and corruptions (max 2; 3rd ends the game; removable, e.g. at a sanctuary).
- **PR-7.14.2** Enforce spending (optional, any time) vs. losing (mandatory, at most one corruption per source) and the per-turn item lock after the skull drop.
- **PR-7.14.3** Support trading among heroes on the same space (mutual consent; warriors/spirit/items/companions only; never virtues or corruptions).

### 7.15 Save / resume / recovery

- **PR-7.15.1** Checkpoint game state after every resolved intent (Board's versioned save/load for board state, plus rules-engine state).
- **PR-7.15.2** Resume a paused game and recover from app reload from the last checkpoint; on Relay reconnect, resync the tower from the last full-state command.
- **PR-7.15.3** **Acknowledge the physical↔digital boundary.** The Player's `BoardState` is authoritative but **cannot be verified against the physical table** (token and skull *positions* aren't machine-readable); only the **skull counter** and **`towerState`** (drum positions + calibration) are observable via the Relay. Seal presence and glyph facing are **engine-owned** (seals remembered from commanded breaks — no sensor; glyph facing derived from drum positions), so recovery re-establishes them from engine state + the resynced `towerState`, not from a tower report. Recovery must reconcile observable tower state automatically and prompt players to confirm physical board state (and physical seal presence) where it cannot.

### 7.16 Tower program playback *(via the Relay)*

- **PR-7.16.1** Emit the scenario's tower program across real channels as a command stream to the Relay: **named baked sequences from `TOWER_LIGHT_SEQUENCES` (21) by id** — the only light authoring the **MVP** uses; the physical tower's sequences are fixed firmware. (Per-LED/group `LIGHT_EFFECTS` exist as physical primitives, and fully programmable/custom sequences are a **software-tower (Display)** feature — both post-MVP.) Also: sound (tower speaker — firmware clip indices/categories, distinct from app/device audio); drum rotation; seal break/replace; and skull drop/counter. *(Audio — resolved: `TOWER_AUDIO_LIBRARY` is a UDT export; the 12 `SoundCategory` values are confirmed.)*
- **PR-7.16.2** Sequence cross-channel moments on Display's tick timeline (50 Hz, 20 ms/tick) using **explicit timed waits** — never chain on command-complete, because the tower signals completion when an action *starts*, not when it ends.
- **PR-7.16.3** Bundle a rotation as drum command + matching `rotation` light sequence so physical and visual stay in sync; respect hardware limits (24 LEDs / 6 layers × 4, 12 seals, 3 drum levels, calibration required) — though calibration itself is the Relay's concern.

### 7.17 Play log, accessibility & options

- **PR-7.17.1** Emit a structured, designer-facing **play log / session record** (turns, intents, events, tower commands, outcomes) so a scenario author can review or replay what happened — leveraging the structured-logging pattern already used on the transport side.
- **PR-7.17.2** Do not convey state by color alone (carry the Creator's CR-6.8 principle into the runtime): pair color with icon/label for foe status, glyphs, kingdoms, and advantage types.
- **PR-7.17.3** Read-aloud text for events/quests; clear, large turn prompts suitable for a shared table device.

---

## 8. The scenario file as the contract (consumption side)

The Player is the downstream consumer of the composed schema the Creator finalizes (Creator §8, CR-8.1). It does not define its own format. Two consumption rules:

- **Strict load-time validation.** Validate against the shared schema and resolve all references against pinned ecosystem versions before play; a scenario that would fail mid-game must fail at load.
- **No schema drift.** If the Player needs a field the schema lacks, the change is made once in the shared schema package and both apps adopt it. This keeps the "exported scenarios always run" guarantee real — and is the mechanism by which the **base game** is expressed as a scenario the Player can run.

Concretely, the **month-end range** (§7.5.5) — a per-month range, or a single default — is now carried by the canonical schema as `setup.monthEnd` (resolved); it stands as the worked example of the no-drift mechanism.

---

## 9. Platform & Non-Functional Requirements

- **PR-9.1 No Web Bluetooth constraint on the Player.** Because the Player drives tower output through the **Relay** rather than a direct BLE link, it is **not** bound by Web Bluetooth's platform limits (the defining constraint of v0.1). The BLE-capable-environment requirement — and the known **macOS peripheral-mode limitation** (a tower-impersonating source cannot register the standard Device Information Service UUID on macOS, so a Raspberry Pi or HCI dongle is the recommended approach) — live with the **Relay**, not the Player. The Player needs only a network connection to the Relay and can run in any modern browser, **including iOS Safari**.
- **PR-9.2 Resilience.** Treat Relay/network drops as expected: reconnect with backoff, hold game state, and resync from the last full-state command. Tower reconnect/recalibration is the Relay's job; the Player surfaces it.
- **PR-9.3 3D asset weight.** Prefer Display/Board's light renderers for the always-on panel; lazy-load the 3D tower/board (large GLB + audio).
- **PR-9.4 Local-network / offline play.** Table sessions may have no internet; the Player↔Relay link must work over a local network.
- **PR-9.5 Offline-first state.** No silent data loss: autosave + versioning, with schema/version compatibility warnings on load.

---

## 10. Dependencies & Risks

- **Ecosystem packages are the platform.** UDT, Display, Board, and the **Relay** plus their version compatibility are hard dependencies, pinned once at the workspace level (UDT/Display/Board) or by the Player↔Relay protocol version (Relay).
- **Relay is newly split out and unpublished.** The Player↔Relay protocol is a hard contract and must be re-grounded against the real repo; until then, the integration is specified on intended design + prior Sync architecture.
- **Relay/source platform constraints** (macOS DIS peripheral limitation, Pi-recommended, BLE-capable client environments) are inherited risks even though they no longer touch the Player directly.
- **Board is pre-release.** Live board state and the setup UI depend on Board maturing; fallback is the headless state core where rendering isn't ready.
- **Rules-engine lockstep.** The Player runs the same engine the Creator simulates; a behavior difference means a scenario plays differently than it previewed. Shared package + shared tests.
- **Tower command vocabulary** is firmware-bounded; the "completion fires at start" timing behavior must be respected in emitted sequences. Prior art exists in UDT's `examples/game` (a complete game on the tower) and can inform the engine.
- **Rich content data is forthcoming.** Hero virtues/banners/move and gear/treasure/potion/adversary card effects are not in any published source yet (content repo marks them TODO; UDT's `Foe`/`Hero` shapes are identity-only). Note rosters/locations/adjacency/identity **have** landed in UDT v4.1.0 — only this rich layer is pending. The MVP scenario is defined at the selection level now; detailed card data fills in when UDT ships it.
- **Adversary mechanics need bespoke vocabulary.** Even the MVP adversary (Ashstrider) introduces **River of Fire** tokens (crossing a river of fire costs 6 warriors; cannot be removed); others use accumulating per-hero tokens (Lingering Rot's Spore → corruption at 3). The closed effect/condition vocabulary must add an edge/river-attached movement penalty and a per-hero accumulating counter with a threshold effect (§11).
- **IP / fan-content.** Built on reverse-engineered, fan-made RTDT libraries; confirm what's permissible before any public/commercial distribution.

---

## 11. Open Questions

1. **Month-end range** — the basis is settled: a designer-authored range via the Creator's month-end-check block (per-month or a default for all months). Remaining work is (a) adding the field to the shared schema + Creator, and (b) deciding how the engine resolves an actual end *within* the range (random within range, or advanced by a trigger).
2. **Building model** — the 16 base-game buildings and their free/enhanced reinforce effects aren't in the current source set (`buildings.md` missing); resolve how buildings are represented in the schema/contract.
3. **Multiplayer / remote play** — deferred for MVP. Later: how is the full game *view* (cards, prompts, board), not just tower commands, shared to remote players, given the Relay carries only tower output?
4. **Player↔Relay protocol** — finalize and version against the real Relay repo (message shapes, status events, target abstraction).
5. **Recovery reconciliation** — how much is auto-reconciled from tower state vs. confirmed by players for the un-observable physical board?
6. **Hero integration** — UDT v4.1.0 `HEROES`/`HERO_BY_ID` now supplies hero **identity**; the open question narrows to the **rich** hero data (warriors/spirit/move/banner/3+3 virtues) — shared format vs. import bridge with board-game-creator (shared with the Creator).
7. **Competitive mode** — full runtime support in v1, or co-op first (parallels the Creator's question)?
8. **Seed interop — resolved.** UDT's `udtSeedParser.ts` decodes the official 12-char seed (setup section: foes/adversary/ally/difficulty/expansions/source/player-count; RNG section: procedural generation). The contract uses the **setup section** to pre-fill a scenario's selections; the RNG section is *not* consumed (scenarios author content explicitly). Main Goal is not in the seed. Forward prediction of the official RNG pipeline is a separate, blocked UDT research goal — out of scope for the Player.
9. **Adversary-token vocabulary** — add the closed-vocabulary primitives the MVP adversary needs: an edge/river-attached movement penalty (River of Fire) and a per-hero accumulating counter with a threshold effect (Spore). Land these in the shared schema + Creator block catalog.

---

## 12. Suggested Phasing

- **Phase 0 — Contract.** Consume the finalized shared schema and rules engine; finalize and version the Player↔Relay protocol; confirm package versions; add the Creator-defined **month-end range** setting to the schema (and the Creator's month-end-check block); add the adversary-token vocabulary (§11.9); and confirm the MVP scenario's selections, enough to express it. *(Building model: resolved — 4 types from `buildings.md`.)*
- **Phase 1 — MVP: the base game, end to end.** Load the base game authored as a custom scenario; connect to the Relay; run the full loop — setup, turn flow, heroic actions, reinforce, decks/market, events, skull economy, win/loss — to a clean resolution, driving either a physical tower or an emulator through the Relay. Single shared device. Embed Board for setup. This phase alone proves the "exported scenarios run" metric.
- **Phase 2 — Depth & resilience.** Dungeon runtime; full decks/market polish; robust Relay/tower recovery; play log; accessibility; turn timer.
- **Phase 3 — Multiplayer & competitive.** Remote-client play and shared game view; competitive mode.

---

## 13. Success Metrics

- **The recommended first game — *Recover Azkol's Treasures*, Ashstrider, foes Brigands / Frost Trolls / Dragon — authored as a custom scenario in the Creator, plays end to end in the Player** through the Relay, to a clean win or loss — the MVP bar.
- **100% of Creator-exported scenarios load and play to a resolution** — the live confirmation of the Creator's matching metric.
- A scenario exercises every supported tower channel (named + custom light sequences, sound, rotation, seal break, skull drop) with cross-channel timing intact, **to a physical tower and an emulator interchangeably** through the Relay.
- A Relay/network drop mid-game recovers and resyncs **without losing game state**.
- The Player runs with **no in-app Bluetooth** — all tower transport is delegated to the Relay — and runs on platforms (including iOS Safari) that direct Web Bluetooth would exclude.
- **Zero duplication** of board/tower/roster/sequence/rules logic the ecosystem and shared packages already own; the rules engine is the same package the Creator simulates.
