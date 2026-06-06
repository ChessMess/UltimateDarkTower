# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **M1 — state core rewrite (breaking, pre-release).** Replaced the scaffold's simple
  `{ version, tokens[], spaceMarkers }` model with the structured `BoardState`
  (`heroes` / `foes` / `adversary` / `buildings` / `spaceMarkers` / `selections` / `meta`), a full
  ~21-command pure/immutable/non-validating reducer, a `BoardStateController` with `self`/`host` modes,
  `subscribe`/`on(type)` plus ergonomic named methods, and a richer `BoardEvent` surface
  (`change` + `tokenAdded`/`tokenMoved`/`tokenRemoved`/`buildingChanged`/`spaceMarkerChanged`/
  `selectionChanged`). The board enforces no game rules.
- **Serialization format break (pre-release; no published saves):** the schema version moved out of
  `BoardState` into a `{ version, state }` save envelope; `loadState` now validates with a rewritten
  zod schema, runs a `migrate(version, state)` hook, and throws a typed `BoardStateLoadError` on bad
  input. `BOARD_STATE_SCHEMA_VERSION` name unchanged.
- Migrated the existing consumers to the new shape (`renderers/readout.ts`, `view/boardRenderView.ts`,
  `example/src/main.ts`); rewrote the reducer/serialize/readout-snapshot tests, added a controller test,
  and regenerated the readout snapshot. Updated `docs/STATE_MODEL.md`, `docs/API.md`,
  `docs/GETTING_STARTED.md`, and `README.md`.

### Added

- UDT re-exports for the setup enums `DIFFICULTIES` / `GAME_SOURCES` and the types `Difficulty` /
  `GameSource` / `ExpansionType` (the board datasets/graph helpers remain pending upstream).
- Initial repository scaffold per `UltimateDarkTowerBoard-Scaffolding-Spec.md` v0.2:
  two-entry package (`.` three-free core + `./plugin` 3D board), headless state core
  (BoardState / commands / reducer / controller / events / zod-v4 save-load), text
  readout + 2D map renderer stubs, `Board3DPlugin` implementing Display's `ScenePlugin`,
  UDT data re-exports (`BOARD_LOCATIONS` + rosters), example app, stub test suites,
  docs stubs, and CI/Pages/Publish workflows.

### Notes / TODO before features

- Peer ranges are pinned to currently-published siblings (`ultimatedarktower@^4.0.0`,
  `ultimatedarktowerdisplay@^0.8.0`). **Bump to the releases that carry the board
  datasets/graph helpers and `anchorToWorld`** once they ship (spec §2 / §12-Q2).
- `BOARD_ANCHORS` / adjacency / `stepDistance` re-exports and the 3D placement code are
  stubbed/pending until upstream lands them.
- Commit the generated `package-lock.json` so CI's `npm ci` is reproducible.
