# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.2.0] - 2026-07-06

### Added

- Rule-variant support: `setup.selections.adversaryId`, `setup.selections.foes` (and its `tier1`/`tier2`/`tier3`), and `setup.selections.mainGoalId` are now **optional** (schema relaxed to schemaVersion 0.4.1, a backward-compatible change within the `>=0.4.0 <0.5.0` engine range). This unblocks authoring scenarios with non-standard rules (e.g. play as an adversary, no tiered-foe roster, or a custom win instead of a main-goal quest). The Creator's New Scenario dialog moves these into a single optional **"Common Options"** section (only Title is now required to create); the Inspector gains a **"Setup"** section (shown when no node is selected) to set or clear them after creation, backed by new `updateSetupSelections`/`updateMainGoal` store actions. The engine falls back to an empty-string sentinel for an omitted adversary/main-goal that never matches a real foe/quest id, so the adversary-battle and legacy goal-completion paths stay inert — behavior for scenarios that provide full selections (including the frozen `golden`/`goldenFull` fixtures) is byte-identical. The L2 (reference) and L3 (graph) validators already tolerated absent selections, so no change was needed there. Note: this relaxes only `setup.selections`; the month/turn framework (`monthEnd`, `playerCountScaling`, `difficulty.profile`) remains required pending a future engine turn-pacing change
- `lifecycle.selectHero`: a real engine runtime await boundary (not a Creator-only stub) where each active player-seat picks one distinct hero from an authored candidate pool, seat-by-seat, until every seat is assigned — a co-op character-select step. New engine `HeroState.heroRef` and `heroSelect` `InputRequest`/`Input` pair; adapters L2 validates each authored heroId against the UDT roster and the scenario's `library.heroes` manifest; Creator gets a dedicated `SelectHeroEditor` inspector picker (syncing `library.heroes` as heroes are added); Player gets a `HeroSelectInput` component. Wired into the shipped `goldenFull` demo scenario ahead of board setup; the frozen compact `golden` fixture is unaffected
- Docs: comprehensive node catalog at `docs/node-catalog.md` covering all current node kinds with quick index, per-category behavior tables, input/output contracts, closed-props matrix, and known runtime/schema mismatches
- Tooling: `scripts/validate-node-catalog.mjs` to guard node-kind parity across Creator (`NODE_KINDS`) and Schema (`node.kind` enum), and to verify that every current node kind is represented in the node catalog
- Creator: Node-RED-style flow documentation — optional per-node descriptions and an editable scenario-level description, sticky-note `util.comment` nodes, and `util.group` visual groups (colored container, auto-fit to members, drag-to-move members together) built via a "Group Selection" toolbar button. Schema gains `node.description` and closed `props` for both annotation kinds; L3 exempts them from reachability and validates group membership (no wires, no nested groups, members must exist)
- Creator: autosaved local draft (localStorage) with debounced background saves, a restore/discard recovery prompt on load, and a native "leave site?" guard for unsaved changes — protects in-progress authoring from page refreshes, tab closes, and crashes even while the scenario fails validation
- Creator: focus mode button to hide the palette/inspector/bottom panels so the canvas fills the window, plus a wider zoom-out range (down to 0.05x) for viewing large graphs
- Initial monorepo scaffold: `packages/schema`, `packages/engine`, `packages/adapters`, `apps/creator`, `apps/player`
- Planning docs in `planning/` (scenario schema v0.4, rules-engine contract v0.3, Creator/Player PRDs v0.3, build guide v0.1, block catalog, UI architecture, and supporting docs)
- Engine JS artifacts (`engine.js`, `pcg32.js`, `golden-fixture.js`) with 242-assertion test suite
- `goldenFull`: a base-game-fidelity golden scenario alongside the original compact `golden` regression fixture. Implements the real _Return to Dark Tower_ turn structure — optional banner, move, one heroic action (quest/cleanse/battle/dungeon, +2 spirit on completion), reinforce, in any order, then the mandatory skull drop — gated behind a `props.turn: "full"` scenario flag so the legacy engine path stays byte-identical
- Per-building skull placement and destruction (4th skull destroys the building; the owning kingdom's hero gains the corruption), building-based Reinforce/Cleanse using the real building effects, tier-derived foe battle-card counts, and authored battle decks for Brigands/Frost Trolls/Dragons
- End-of-turn event pipeline (`event.foesStrike/foesGrow/foesSpawn/towerStirs/towerActs/newWares`, `trigger.schedule`/`trigger.onState`) and monthly companion/adversary quests (`lifecycle.newQuests`), including quest location requirements and failure penalties
- Location-gated battles and a located final confrontation with the adversary
- Player UI support for the full-turn action protocol (quest picker, enhanced reinforce, move/dungeon controls); Creator canvas and simulator now load and auto-run `goldenFull`
- New engine test suites: `fixture_test.js`, `full_turn_test.js`, `events_test.js`

### Changed

- CI now runs `pnpm validate:nodes` before lint/typecheck/test/build to catch node-catalog drift early
- README planning docs table now links to `docs/node-catalog.md` for contributor discoverability
- Creator and Player now use user-facing "Sample Scenario" wording in the load controls and prompts instead of internal "golden" fixture terminology
- Creator top canvas toolbar now sizes to its button content (with a viewport cap) instead of using a fixed width, reducing visual whitespace and keeping the control bar naturally compact
- Engine internals split for maintainability: the 2,200-line `engine.js` is now a thin (~110-line) assembly point wiring eleven cohesive modules under `packages/engine/src/engine/` (`core`, `conditions`, `effects`, `glyph`, `turn`, `battle`, `dungeon`, `nodes`, `resume`, `run`, `setup`) that form an acyclic dependency graph. Purely mechanical: `engine.js` still resolves ahead of the `engine/` directory, so every test `require('../src/engine')` path and `src/index.js` are unchanged, and per-step digest/directive streams for both `golden` and `goldenFull` are byte-identical to before the split
- Engine public types now have a single checked source of truth in `packages/engine/src/engine/types.ts` (re-exported by `src/index.d.ts`), adding closed-vocabulary unions for effect ops and node kinds; this replaces the standalone hand-written declaration file so the type surface is type-checked rather than free to drift

### Fixed

- Creator's New Scenario scaffold now produces an L1-valid document even for a minimal (title-only) scenario: each `library.buildingTypes` entry now includes the schema-required `enhanced` block (previously omitted, so every new scenario reported four "must have required property 'enhanced'" errors), and a blank Designer no longer emits an empty `meta.designer.name` (which violates `minLength: 1`) — it falls back to "Unknown". Combined with the `setup.selections` relaxation, creating a scenario with only a title now passes all validation layers and can be exported
- Battling a foe with no authored battle deck (e.g. non-adversary foes in the original golden fixture) no longer resolves as an instant, card-less defeat — the engine now faults loudly instead
- Adapters L3 graph-reachability check no longer flags `trigger.*`/`lifecycle.newQuests` chains as unreachable orphans (they're engine-fired roots, not wire targets)
- Heroes and foes no longer fail to appear on the Board: `lifecycle.boardSetup` now sends `board.mutate placeHero` directives for each hero's starting location, `spawnAdversary` now places the adversary on the board when a location is given, and board mutations dispatched before the board package's dynamic import resolves are queued and replayed instead of silently dropped
- Engine (0.4.0) — code-review bug fixes:
  - `serialize`→`deserialize` round-trip no longer produces invalid JSON. `canonical()` now omits object keys whose value is `undefined` (matching `JSON.stringify` semantics), so serializing an engine state that carries undefined spine references (e.g. a scenario with no move/dungeon spine) round-trips cleanly. This also makes `digest(state) === digest(clone(state))`. Note: because the digest hashes canonicalized state, digest **values** shift for states that previously embedded `undefined` keys; run-to-run lockstep determinism and all win/loss outcomes are unchanged. The frozen compact `golden` fixture's outcomes and determinism are preserved; no test hardcodes digest values
  - Full-turn battles now deduct spent Advantages from the acting hero's pool (previously the cap was computed but never subtracted). Gated on the full-turn protocol so legacy `golden` and the `__internals` verb states stay byte-identical
  - A decided game outcome is no longer overwritten within the same resolution: `winGame`/`loseGame` are no-ops once the game is over, battle card `onResolve` and warrior-loss now short-circuit the defeat/win tail, and the `token.counterIncrement` threshold loop stops when an effect ends the game
  - `building.destroy` now marks the standing registry building destroyed and clears its on-board skulls (previously the registry desynced for a directly-authored destroy); `skull.place` now lands scenario-placed skulls on standing buildings in the registry model (incrementing `onBoard`, destroying a building past capacity) so they are visible to Cleanse and can raze a building — matching emergent-skull behavior. Compact `golden` has no buildings registry and is unaffected
  - Engine version bumped `0.3.0` → `0.4.0`
- Engine (0.5.0) — deferred-followup fixes (`planning/engine-deferred-followups.md`, items 1-3):
  - Battling one of two same-type foes no longer removes both: `startBattle` now resolves the
    specific targeted foe instance when the caller supplies `instanceId`, and threads it through
    `foe.remove`/`foe.escalateStatus` on battle resolution. Callers that don't disambiguate (legacy/
    compact streams, `golden`/`goldenFull`, which have at most one foe per type) keep exactly
    today's remove-all-matching-`foeId` behavior. The Player app's target-selection button now
    sends `instanceId` (it already had the value, just wasn't sending it)
  - `completeQuest` no longer recurses unboundedly when a quest's authored success outcome
    completes itself (directly, or via an indirect A→B→A chain) — it now faults immediately on
    re-entry instead of stack-overflowing
  - `digest` now hashes load-bearing clock state (`turnsThisMonth`, `latches`, `battle`, `dungeon`,
    `pendingEvents`, `eventQueue`) instead of load-time refs (`_nodes`/`_lib`/`_setup`/`_spine`/
    `_triggers`), so two states that had genuinely diverged mid-battle or mid-dungeon no longer
    hash identically. **This intentionally changes digest values** — persisted ≤0.4.0
    checkpoints/digests won't match against 0.5.0. Run-to-run lockstep determinism, all win/loss
    outcomes, and every directive stream are unaffected; no test hardcodes a digest value.
    Engine version bumped `0.4.0` → `0.5.0`
  - All three fixes verified byte-identical (status + directives, and pre-0.5.0 digests where
    applicable) for `golden`/`goldenFull` via `run-all.js`, schema conformance, and a replay-
    snapshot diff across representative streams

### Known issues

- One item found during the engine 0.4.0 code review remains deliberately deferred (changes the
  package ship model): the full `.ts`/`dist` TypeScript port. Tracked in
  `planning/engine-deferred-followups.md`.
