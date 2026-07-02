# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

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

- Creator and Player now use user-facing "Sample Scenario" wording in the load controls and prompts instead of internal "golden" fixture terminology
- Creator top canvas toolbar now sizes to its button content (with a viewport cap) instead of using a fixed width, reducing visual whitespace and keeping the control bar naturally compact

### Fixed

- Battling a foe with no authored battle deck (e.g. non-adversary foes in the original golden fixture) no longer resolves as an instant, card-less defeat — the engine now faults loudly instead
- Adapters L3 graph-reachability check no longer flags `trigger.*`/`lifecycle.newQuests` chains as unreachable orphans (they're engine-fired roots, not wire targets)
- Heroes and foes no longer fail to appear on the Board: `lifecycle.boardSetup` now sends `board.mutate placeHero` directives for each hero's starting location, `spawnAdversary` now places the adversary on the board when a location is given, and board mutations dispatched before the board package's dynamic import resolves are queued and replayed instead of silently dropped
