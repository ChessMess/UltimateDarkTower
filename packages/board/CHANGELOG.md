# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **M4 — dockable editing UI.** `mountBoardUI(host, options)` (in the three-free `.` entry) renders three
  movable / dockable / show-hide-configurable panels — a token **palette** (add foe/adversary/marker/skull),
  a selection **inspector** (move/remove, foe status, building skulls + destroy/restore + monument, marker
  remove, adversary place/clear), and a per-kingdom **summary**. The UI is a *dumb-container client*: it
  calls **only** the controller's public named command methods and reads state/selection — strip it out and
  the host keeps every endpoint. It mounts into any element, so a consumer can dock it into Display's
  `getOverlayContainer()` / `getPanelSlot()` (the example does); `src/ui` never imports Display.
  - **Shared UI seams:** `createSelectionStore()` (active token → the inspector) and
    `createLocationPickStore()` (the armed add-placement channel). `BoardRenderView` grows `uiContainer` +
    `ui` options and owns/exposes `view.selection` / `view.locationPick`, so a click or space-pick from the
    2D map **or** the 3D plugin drives the same panels.
  - **Click-a-space-then-confirm add flow.** The palette arms a placement; `BoardMap2D` and `Board3DPlugin`
    gain an *armed* space-pick mode (`locationPick`) — the 2D map draws clickable space targets at the
    anchors; the 3D plugin raycasts invisible on-disc discs via a second pointer target. A location dropdown
    is the renderer-less fallback. No state mutation until **Confirm**.
  - **Monument palette category:** added `MONUMENTS` (the 8 Covenant monuments) to `ultimatedarktower`
    and re-exported it here, so the palette has a roster-driven **Monument** category (dropdown + free-text,
    building-targeted) that calls `setMonument`. `BoardUIRosters` gained `monuments` (default from the
    re-export). The example art already lives under `tokens/monuments/<kebab(name)>.png`.
  - **Deferred (documented):** the palette's **hero** *add* category — UDT exposes no `HEROES` roster yet
    and Board re-exports rather than vendors that data; it slots in as a `ui.rosters` default with no API
    change once UDT ships it (M4 spec §8). The inspector still edits an already-placed hero.
  - Example: the editing UI is docked into Display's overlay HUD; tests are plain jsdom (no three-harness
    re-port; the 3D pick reuses the existing M3 integration harness).
- **M3 — `Board3DPlugin` (the Display ScenePlugin).** The `ultimatedarktowerboard/plugin` subpath now
  renders the board in Display's 3D scene. `attachBoard3D(view3D, options)` (mirroring Display's
  `attachSkullPhysics`) attaches a `ScenePlugin` that, on model load, places tokens as image billboards
  (`THREE.Sprite`) on the disc via Display 0.9's `anchorToWorld(anchor, getDiscMetrics(), northKingdom)`.
  With a `boardImageUrl` it also renders the board's **own** surface — a flat quad whose corners run through
  the same `anchorToWorld` mapping as the tokens (so the art is pixel-aligned with placement) — and hides
  Display's placeholder (`setBoardDiscEnabled(false)`; disc mesh + physics floor stay); without one,
  Display's board stays visible.
  It reuses the 2D map's asset conventions (`assetBaseUrl`, `${group}/${kebab(id)}.png`, programmatic
  fallback; heroes always fall back) and emits the same `TokenSelection` on raycast click (consuming the
  gesture so orbit/side-select don't fire). Focus is shared: `setFocus` maps kingdom → `selectSide` and
  angle → `CameraConfig`; the camera reflects side changes back via `onFocusChange`. `northKingdom`
  (default `0`) is board-owned, not read from Display's lighting config — a live one-marker check confirmed
  tokens land on the printed buildings at `nk = 0`. Options include `tokenFactory` (seam for real 3D
  models) and `resolveTokenImage`. Returns a `Board3DHandle` (`setBoardState` / `setFocus` / `dispose`).
- `src/renderers/assetPaths.ts` — extracted the shared token-art convention (`kebab`, `TokenSelection`,
  `TokenArtRef`, `KIND_TINT`, `defaultTokenImagePath`) so the 2D map and 3D plugin use one source. The
  `.` entry stays three-free (`map2d.ts` re-exports the symbols for back-compat).
- Example app: the 3D board is now live alongside the 2D map + readout (one controller, one focus). A
  tower GLB ships under `example/public/tower.glb` (example-only; never in the npm tarball).
- Tests: a real-`Tower3DView` integration test for the plugin seam (Display's CJS dist run WebGL-free
  against ported three/addons/gsap mocks); the contract test now covers the type-shape + `attachBoard3D`.
- **M2 — renderers + focus controls.** `BoardMap2D` is now a real inline-SVG renderer: it draws the
  board image and places tokens via UDT's `BOARD_ANCHORS` (normalized, resolution-independent;
  `northHeadingDegrees` is a 3D-disc concern and is not applied in 2D). Token art is loaded at runtime
  from `assetBaseUrl` by the convention `{base}{group}/{kebab(id)}.png` (with a `resolveTokenImage`
  override), and falls back to a programmatic labeled disc when art is missing — heroes always use the
  fallback (no hero art exists). Click-to-select fires `onTokenSelect({ kind, id, location })` and draws
  a selection ring (renderer-local UI state; never written to `BoardState`). Editing UI is M4.
- `BoardReadout` now honours a per-kingdom focus filter (joins via `BOARD_LOCATION_BY_NAME`); `all`
  is unchanged apart from the header.
- Shared focus controls: `mountFocusControls(host, { focus, onChange })` renders the All / N / E / S / W
  selector + the Overhead / Isometric toggle. `BoardRenderView` gained `mapContainer` / `controlsContainer`
  / `assetBaseUrl` / `boardImageUrl` / `onTokenSelect` / `onFocusChange` options, a `map2d` field, and
  `setFocus` (early-returns on an equal focus, fans out to readout + map + controls) + `dispose`.
- Example app rewritten to render the readout + 2D map + focus controls over a seeded state, with curated
  board/token art under `example/public/` (loaded via `assetBaseUrl`, never bundled into the library).
  This `tokens/` tree stages the future standalone board-assets package.

### Changed

- **`ultimatedarktowerdisplay` peer bumped `^0.8.0` → `^0.9.0`** (carries `anchorToWorld` +
  `attachScenePlugin` + the `ScenePlugin*` types) for M3. Still an optional peer; only `./plugin` imports it.
- **`BoardFocus` is now an object (breaking, pre-release):**
  `{ kingdom: BoardKingdom | 'all'; angle: 'overhead' | 'isometric' }` (was a flat
  `'all' | 'north' | …` string), with `DEFAULT_FOCUS` and `focusEquals`. `angle` is reserved for the 3D
  camera (M3) and is inert for the readout/2D map. The readout snapshot header changed accordingly.
- `vite.example.config.ts`: opt the symlinked `ultimatedarktower` sibling into Rollup's commonjs
  transform (`build.commonjsOptions.include`) so the production example build resolves its CJS named
  exports (the sibling resolves outside `node_modules`).
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
  `GameSource` / `ExpansionType`.
- **Board layout + adjacency re-exports** now that `ultimatedarktower@4.1.0` ships them: `BOARD_ANCHORS`,
  `BOARD_IMAGE_INFO`, `BOARD_ADJACENCY`, and the graph helpers `neighborsOf` / `stepDistance` /
  `shortestPath`, plus the types `Anchor` / `AnchorSlot` / `LocationAnchors` / `BoardAnchorMap` /
  `BoardImageInfo` / `BoardAdjacency`. Re-exported from UDT (not vendored); the `ultimatedarktower` peer
  range is bumped to `^4.1.0`. This unblocks the 2D-map / 3D-plugin token placement (M2/M3).
- Initial repository scaffold per `UltimateDarkTowerBoard-Scaffolding-Spec.md` v0.2:
  two-entry package (`.` three-free core + `./plugin` 3D board), headless state core
  (BoardState / commands / reducer / controller / events / zod-v4 save-load), text
  readout + 2D map renderer stubs, `Board3DPlugin` implementing Display's `ScenePlugin`,
  UDT data re-exports (`BOARD_LOCATIONS` + rosters), example app, stub test suites,
  docs stubs, and CI/Pages/Publish workflows.

### Notes / TODO before features

- Peers: `ultimatedarktower` `^4.1.0` (board datasets/graph helpers), `ultimatedarktowerdisplay` `^0.9.0`
  (`anchorToWorld`; consumed by M3). Both build from their `main` in Board CI.
- Commit the generated `package-lock.json` so CI's `npm ci` is reproducible.
