# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Location Marker & Adjacency tool wired into the example app.** The dependency-free board-authoring page
  that was previously only runnable standalone from `UltimateDarkTower/tools/location-marker/` is now a
  fourth example page at [`/location-marker.html`](./example/location-marker.html), linked from the demo
  sidebar and cross-linked from the Art Forge / Token Designer headers (matching their existing
  `forge-tabs` pattern). It auto-loads the example's own `board.png`. It still only exports
  `udtBoardAnchors.ts` / `udtBoardAdjacency.ts` / a combined `.json` for manual copy into the
  `UltimateDarkTower` repo — it has no runtime relationship to this package. See
  [docs/EXAMPLE.md](./docs/EXAMPLE.md#location-marker).
- **`npm run promote-token-art` — bridge Token Art Forge demo overrides to the library defaults.** The Forge
  edits the demo's per-token overrides (`example/src/tokenArt/*.json`), not the library's built-in
  `OFFICIAL_2D_ICON` / `OFFICIAL_HERO_ART` tables. This read-only script compares the demo overrides against
  the current library defaults (via the compiled resolver) and prints the exact table entries to paste into
  `src/renderers/assetPaths.ts` plus the asset files to copy into each consumer's `public/tokens`, so art
  added visually in the Forge can be promoted to a default every consumer ships. See `docs/EXAMPLE.md`.
- **`BoardStageView` — a batteries-included render stage (new `ultimatedarktowerboard/stage` entry).** One
  `new BoardStageView({ container })` gives a consumer everything the demo shows: the 2D map + readout, the
  **2D / 3D / 2D+3D / PiP** display switcher with a big↔mini **swap**, a movable/resizable **PiP inset**,
  **Pop Out** into a window, the **Spin / Pan** drag toggle, the **N / E / S / W + All** kingdom-zoom bar (the
  All button set apart in its own group), the dockable **palette / inspector** editing UI, and a **3D tower
  that can be turned on/off** at runtime (`tower3D` option / `setTowerEnabled()`; an optional built-in toggle
  button via `towerToggle`). It is the board-domain analog of Display's `TowerRenderView` and a plain
  framework-agnostic class — it orchestrates the existing `BoardRenderView`, `mountBoardUI`, and
  `attachBoard3D` rather than reimplementing them. The stage's **static graph is `three`-free**: the 3D tower
  (Display + `three`) is reached only via a dynamic `import('../plugin/stageTower')`, so a **2D-only app never
  loads `three`** and the 3D stack is fetched as a separate chunk on first enable. CSS is injected
  automatically (`BOARD_STAGE_CSS` / `injectStageStyles`), scoped under `.bsv-root` and themeable via
  `--bsv-*` variables. The example app is now a thin wrapper that mounts the stage; all its former
  render-stage controllers moved into the component. See [docs/STAGE.md](./docs/STAGE.md).
- **Mouse-spin the 2D map — the `dragMode` option (`BoardMap2D`).** A left-drag can now **spin** the whole
  board (image + tokens) about its center — grab a point and it tracks the cursor, like a lazy-susan —
  mirroring the 3D board's mouse-orbit. `dragMode: 'rotate' | 'pan'` (default `'rotate'`) selects the
  left-drag behavior (`'pan'` keeps the classic move-the-zoomed-view drag); switch at runtime via the new
  `setDragMode()` (on `BoardMap2D`, forwarded through `BoardRenderView`). The **middle mouse button** always
  runs the *other* action — a quick pan while spinning, a press-and-hold spin while panning.
  `resetView()` / double-click now also clears the spin. Pure presentation: a new DOM-free
  `src/renderers/rotate.ts` does the angle/pivot math and all content rides one `.udt-board-rotate` SVG
  layer; `BoardState`, selection, and focus are untouched. The example gains a persisted **Spin / Pan**
  toggle on the 2D control row and a wider default picture-in-picture inset.
- **Mouse zoom/pan on the 2D map (`BoardMap2D`).** Scroll the wheel to zoom toward the cursor, drag to
  pan once zoomed in, and double-click (or call the new `resetView()`) to return to the focus view. On by
  default; pass `enableZoom: false` to opt out (or set `maxZoom`, default `8`) — both also forwarded
  through `BoardRenderView`. Pure presentation: it only rewrites the SVG `viewBox` (a new DOM-free
  `src/renderers/zoom.ts` does the math) and stays inside the current focus region; `BoardState`,
  selection, and focus are untouched.
- **`BoardStateController.moveToken(id, location)`.** A resolver convenience for callers that hold only
  a token instance id: it resolves the kind from current state (heroes → foes → adversary, earlier kind
  wins on a collision), delegates to the existing `moveHero`/`moveFoe`/`placeAdversary` command, and
  returns the moved kind (`'hero' | 'foe' | 'adversary'`) or `null` on a no-op. Also exported a named
  `TokenKind` type (previously inlined on `BoardEvent`).
- **Token Art Forge split into reusable card modules.** The `example/src/tokenArtEditor/` directory now
  has four focused files instead of one monolithic `main.ts`:
  - `helpers.ts` — shared DOM utilities (`el`, `makeInput`, `field`, `slotHead`, `rowFields`, `actions`,
    `emptyState`, `numStr`), the `ICON` SVG strings, and the JSON `highlight`/`escapeHtml` functions.
  - `imageSlot.ts` — self-contained image-picker card component (used for both 2D and 3D image slots).
  - `modelSlot.ts` — self-contained GLB model card component (URL, scale, rotation, `<model-viewer>`
    preview); receives an `onUpdate` callback so it has no coupling back to `main.ts`'s module scope.
  - `main.ts` — trimmed to state management, boot, UI scaffolding, and persistence.

### Changed

- **2D map defaults foe/adversary art to the official flat token icon.** `BoardMap2D` (and the
  `BoardStageView` 2D pane) now resolve a known foe/adversary id to its official small RTDT board-token
  icon (e.g. `foes/Foe-Token-L2-Brigands.png`) in the 2D view, instead of the 3D-style portrait the plain
  `${group}/${kebab(id)}.png` convention resolves to. The 3D tower's sprite billboard and every other token
  kind are unchanged, and any entry can still be overridden per token via `tokenArt.image2d`. Consumers
  whose 2D assets were laid out as `foes/<kebab-id>.png` should rename them to the official icon filenames
  or supply `tokenArt.image2d` (a missing icon file still degrades gracefully to the programmatic disc).
- **Heroes now have a built-in default portrait for the full roster (base + all expansions).** The renderers
  previously returned no default art for any hero (always the programmatic disc); the resolver now knows the
  complete standard hero roster (kept in sync with UDT's `data.heroes.HEROES` — 14 heroes across base,
  Alliances, Covenant and Expeditions) and resolves each to its portrait under `heros/` in both the 2D map
  and the 3D billboard. A roster hero whose portrait hasn't shipped yet, and non-roster instance ids, still
  fall back to the disc (no broken request). Consumers no longer need a per-app `tokenArt` just to show hero
  art; drop the portrait file in `heros/` and it appears. Any entry is still overridable via `tokenArt`.
  The demo's `example/src/tokenArt/{foe,adversary,hero}_tokens.json` overrides — now redundant with these
  built-in defaults — were removed; `example/src/tokenArt` keeps only genuine overrides (skull's 3D model,
  plus monuments/markers for the Art Forge tool).
- **Inspector remove action is now labelled “Remove” for every token type.** The adversary case
  previously read “Clear”; it now matches heroes, foes, and markers for consistency. The underlying
  command is unchanged (`controller.clearAdversary()`), and the button keeps its `.udt-inspector-remove`
  class, so existing selectors and tests are unaffected.
- **Upgraded to three r185.** Bumped the `three` / `@types/three` dev dependencies to `^0.185.0` to stay in
  lockstep with the sibling `ultimatedarktowerdisplay` — Board and Display must share a single `three`
  instance at runtime (Board clones meshes produced by Display's loader). The `three` peer range is
  unchanged (`^0.170.0` already permits r185). No source changes — the board uses no API affected by the
  r184 → r185 migration. Verified against the r185 Display build with typecheck, the full test suite, and a
  live ScenePlugin render.

### Fixed

- **TypeScript CSS side-effect import error in example source.** `import './editor.css'` in the Token
  Art Forge now type-checks cleanly. Added `example/tsconfig.json` (the example folder was excluded from
  the root tsconfig, leaving VS Code without a project config for example files) and
  `example/src/vite-env.d.ts` (Vite triple-slash reference + explicit `declare module '*.css'`).

### Documentation

- **API reference rewritten to the shared family standard.** Replaced the terse symbol-list `docs/API.md`
  with a full per-symbol reference — descriptions, copy-paste runnable examples, parameter tables, a command
  table, and the UDT re-export table — covering both the `.` and `./plugin` entry points (verified: every
  public export has an entry; all snippets typecheck). Added `docs/API_STYLE.md`, the hand-authored
  API-documentation standard now shared across the UDT-family repos, linked from CONTRIBUTING and the docs
  index. README gains a minimal runnable usage snippet.

### Added

- **Per-token 2D-vs-3D art — the `tokenArt` config.** A token can now use **different art in the 2D map
  vs the 3D view** (and, in 3D, a flat image or a GLB model), declared per token instead of in branching
  callback logic. `tokenArt: TokenArtConfig` is a table keyed by token kind → **art id** (the foe *type* for
  foes, so instances share an entry; the id/name otherwise; `"skull"` for skulls — `building` lives under
  `monument`; keys are kebab-insensitive). Each `TokenArt` entry sets `image2d`, `image3d`, and/or `model3d`
  (a `TokenModelRef`). Pass the **same object** to both `BoardMap2D` / `BoardRenderView` (reads `image2d`)
  and the `Board3DPlugin` (reads `model3d`, then `image3d`). Resolution is layered on the existing seam, so
  tokens with no entry render exactly as before: image precedence is `tokenArt` → `resolveTokenImage(ref,
  view)` → the `${assetBaseUrl}${group}/${kebab(id)}.png` convention → fallback; 3D-model precedence is
  `tokenFactory` → `tokenArt.model3d` → `resolveTokenModel`. `resolveTokenImage` gains a `view: '2d' | '3d'`
  argument (additive — existing one-arg callbacks are unaffected); `BoardRenderView` now forwards
  `tokenArt` + `resolveTokenImage` to its 2D map. Heroes — which have no convention art — can finally be
  given art this way. The example renders `Dragons` as its flat foe PNG in 2D but as a GLB model in 3D.
- **3D model tokens — the `resolveTokenModel` seam.** `Board3DPlugin` can now render a token as a real GLB
  model in place of its flat sprite, via the new `resolveTokenModel(art) => TokenModelRef | null` option
  (mirrors `resolveTokenImage`; keyed on `{ kind, id }`, so it works for **any** token kind — skulls today,
  foes/monuments as model art lands). `TokenModelRef` is a model-URL string or `{ url, scale?, rotation?,
  dracoDecoderPath? }`. Models load by **reusing Display's `loadSkullModel`** (load-once / cache-per-URL,
  normalized to a unit bounding sphere), imported from the externalized `ultimatedarktowerdisplay/physics`
  subpath so the GLTF / DRACO loaders stay in Display's chunk — never the board's bundle. Clones **share**
  geometry/material (load-once-clone-many) and skip disposal of the shared template; the async load is
  generation-guarded so a re-render can't populate a cleared token. Resolution order in `addToken` is
  `tokenFactory` → `resolveTokenModel` → sprite (unchanged when unset). The example renders the two Dayside
  skulls as `skull_1.glb` at `scale: 0.6`.
- **`debugCamera` tuning aid.** A dev-only `Board3DPlugin` option that logs the live camera's
  `{ elevationFactor, targetHeightFactor, distanceFactor }` on every camera move, ready to paste into the
  view-angle presets in `angleToCameraConfig`.
- **M4 — dockable editing UI.** `mountBoardUI(host, options)` (in the three-free `.` entry) renders three
  movable / dockable / show-hide-configurable panels — a token **palette** (add foe/adversary/marker/skull),
  a selection **inspector** (move/remove, foe status, building skulls + destroy/restore + monument, marker
  remove, adversary place/clear), and a per-kingdom **summary**. The UI is a _dumb-container client_: it
  calls **only** the controller's public named command methods and reads state/selection — strip it out and
  the host keeps every endpoint. It mounts into any element, so a consumer can dock it into Display's
  `getOverlayContainer()` / `getPanelSlot()` (the example does); `src/ui` never imports Display.
  - **Shared UI seams:** `createSelectionStore()` (active token → the inspector) and
    `createLocationPickStore()` (the armed add-placement channel). `BoardRenderView` grows `uiContainer` +
    `ui` options and owns/exposes `view.selection` / `view.locationPick`, so a click or space-pick from the
    2D map **or** the 3D plugin drives the same panels.
  - **Click-a-space-then-confirm add flow.** The palette arms a placement; `BoardMap2D` and `Board3DPlugin`
    gain an _armed_ space-pick mode (`locationPick`) — the 2D map draws clickable space targets at the
    anchors; the 3D plugin raycasts invisible on-disc discs via a second pointer target. A location dropdown
    is the renderer-less fallback. No state mutation until **Confirm**.
  - **Hero + Monument palette categories:** added `HEROES` (14) and `MONUMENTS` (8) to `ultimatedarktower`
    as `{ id, name, source }` rosters (`HERO_BY_ID`/`MONUMENT_BY_ID`, shared `ContentSource`) and
    re-exported them here. The palette gained roster-driven **Hero** (`placeHero(hero.id, loc)` — the
    identity id doubles as the singleton instance id) and **Monument** (`setMonument(loc, id)`, building-
    targeted) categories. `BoardUIRosters` gained `heroes` + `monuments` (a `RosterEntry = {id,name}` list,
    default from the re-exports, overridable via `ui.rosters`). UDT's `HeroId` is deliberately not
    re-exported (Board's instance-id `HeroId` owns that name). No remaining roster gap.
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

### Changed

- **3D camera angle presets corrected; zoom decoupled from tilt.** `overhead` is now a steep, near-top-down
  framing and `isometric` a pulled-back oblique 3/4 view. Previously `isometric` placed the eye _below_ the
  board plane (an edge-on / from-below view) and `overhead` was only a shallow ~36° tilt. The presets use the
  new `distanceFactor` knob in `ultimatedarktowerdisplay`'s `CameraConfig` to pull the camera back without
  steepening. `DEFAULT_FOCUS` is now `{ kingdom: 'all', angle: 'isometric' }` (was `overhead`); the readout
  snapshot/header and the focus-controls/readout tests were updated to match.
- **No default-camera flash on load.** `Board3DPlugin` pre-seeds the view angle in `attach` (before the GLB
  loads), so Display's on-load `fitToModel` frames the board at the selected angle on the first rendered
  frame — previously the 3D view briefly showed Display's default camera and then snapped to the board's
  framing once the model loaded.
- **Internal quality pass (no public behavior change unless noted):**
  - The 2D map (`renderers/map2d.ts`) and 3D plugin (`plugin/index.ts`) now share one three-free
    `renderers/tokenLayout.ts` (location grouping, fan offset, selection key, and per-kind entry
    builders) instead of each duplicating it — the slot/fan conventions now have a single source.
  - Collapsed the 2D map's `appendArt` into `appendArtOrFallback` so **skull and monument art that
    fails to load now falls back to the programmatic disc** like every other token kind (previously
    a 404 left a broken `<image>`).
  - `placeAdversary` now emits the same dev-only unknown-location warning as the other
    location-bearing commands.
  - The selection / location-pick stores (`ui/stores.ts`) and `BoardStateController` share a small
    internal `createEmitter` subscribe/notify helper; public surfaces are unchanged.
- **Removed `syncFocusControls(host, focus)` (breaking, pre-release).** `mountFocusControls` now
  returns `{ setFocus, unmount }`; call `handle.setFocus(focus)` to fan a focus change into the
  controls (and `handle.unmount()` to remove them). `BoardRenderView` handles this internally, so
  consumers using the facade are unaffected.
- **M5 — docs, example & GitHub Pages polish (docs-only; no library code or public API changed).**
  Reconciled the docs set to the shipped M1–M4 surface: de-stubbed the "stub / curate / scaffold"
  framing; rewrote the two stale `docs/TROUBLESHOOTING.md` entries (the obsolete "3D renders nothing —
  expected for now" and "commit `package-lock.json`" notes); fleshed out `docs/ARCHITECTURE.md`
  (controlled `host` vs uncontrolled `self` ownership + the data-flow narrative); gave `docs/README.md`
  a role-based "pick your path"; and audited `docs/API.md` — documenting the previously-omitted public
  `syncFocusControls` plus the `FocusControlsOptions` / `BoardMap2DOptions` / `BoardRenderViewOptions` /
  `BoardStateControllerOptions` / `RosterEntry` types, and normalizing stray internal `(M3)/(M4)` jargon.
  `README.md` gained CI / TypeScript / License badges, a Live-Demo link, and an ecosystem + See-also
  section; `CONTRIBUTING.md` sibling versions were corrected (UDT `4.1.x`, Display `0.9.x`); the example
  copy/footer were refreshed, and the GitHub Pages build was **verified** deploy-ready (`base: './'` →
  relative asset URLs, public `board.png`/`tower.glb`/`tokens/**` at the dist root, all serving `200`
  under a project subpath). Ecosystem cross-links: added Board to `ultimatedarktowerdisplay`'s
  related-projects (`docs/README.md`) and de-staled its `SCENE_PLUGINS.md` (UDT's `ECOSYSTEM.md` already
  carried a Board entry).
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

### Notes

- Peers: `ultimatedarktower` `^4.1.0` (board datasets/graph helpers), `ultimatedarktowerdisplay` `^0.9.0`
  (`anchorToWorld`). Both build from their `main` in Board CI (`package-lock.json` is committed for
  reproducible `npm ci`). The 3D-model token seam and the camera presets additionally rely on
  `ultimatedarktowerdisplay` symbols that are on its `main` ahead of the next release: `loadSkullModel`
  (now exported from the `./physics` subpath) and the `CameraConfig.distanceFactor` knob — so Display must
  land on `main` before this Board change goes green in CI.
