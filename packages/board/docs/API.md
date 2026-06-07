# API

## `ultimatedarktowerboard` (`.`)

- **State:** `BoardState`, `HeroToken`, `FoeToken`, `BuildingState`, `FoeStatus`, `SpaceMarker`,
  `HeroId`, `FoeId`, `LocationName`, `createDefaultBoardState()`
- **Commands:** `BoardCommand`, `BoardCommandType`
- **Reducer:** `applyBoardCommand(state, command)`
- **Controller:** `BoardStateController` + `BoardStateControllerOptions` (`{ initial?, mode: 'self' | 'host' }`), `getState`,
  `dispatch`, `applyState`, `reset`, `subscribe`, `on(type, fn)`, and named methods (`placeHero`,
  `spawnFoe`, `addSkull`, `setSpaceMarker`, …)
- **Events:** `BoardEvent`, `BoardEventType`, `BoardEventListener`
- **Save/load:** `saveState(state)`, `loadState(json)`, `BOARD_STATE_SCHEMA_VERSION`, `BoardStateLoadError`
- **Renderers:** `BoardReadout`, `BoardMap2D` + `BoardMap2DOptions` (`{ assetBaseUrl?, boardImageUrl?,
  resolveTokenImage?, onTokenSelect?, locationPick?, onLocationPick? }`), `BoardRenderer`,
  `TokenSelection`, `TokenArtRef`, `kebab(value)`
- **Focus:** `BoardFocus` (`{ kingdom: BoardKingdom | 'all'; angle: BoardViewAngle }`), `BoardViewAngle`,
  `DEFAULT_FOCUS`, `focusEquals(a, b)`, `mountFocusControls(host, { focus, onChange })` → unmount fn,
  `syncFocusControls(host, focus)` (reflect an external focus change into already-mounted controls),
  `FocusControlsOptions`
- **Stores (UI seams):** `createSelectionStore()` → `SelectionStore` (`get`/`set`/`subscribe`);
  `createLocationPickStore()` → `LocationPickStore` (`arm`/`disarm`/`isArmed`/`getPending`/`pick`/`subscribe`);
  `PendingPlacement` (`{ kind, label, targets: 'all' | 'buildings' }`), `LocationPickEvent`
- **Editing UI:** `mountBoardUI(host, options)` → `BoardUIHandle` (`{ setPanelVisible(id, on), dispose() }`).
  `BoardUIOptions`: `{ controller, selection, locationPick?, panels?, rosters?, generateId?, floating? }`.
  `PanelId` (`'palette' | 'inspector' | 'summary'`), `PanelPlacement`, `BoardUIRosters`, `RosterEntry`
  (`{ id, name }`). The UI calls only the public command API; it mounts into any element (pass Display's
  overlay/panel slot to dock it).
- **View:** `BoardRenderView` + `BoardRenderViewOptions` (`{ initialState?, mode?, mapContainer?,
  controlsContainer?, uiContainer?, ui?, assetBaseUrl?, boardImageUrl?, onTokenSelect?, onFocusChange? }`)
  with `controller`, `readout`, `map2d?`, `selection`, `locationPick`, `focus`, `setFocus(focus)`,
  `dispose()`
- **UDT re-exports:** `BOARD_LOCATIONS`, `BOARD_LOCATION_BY_NAME`, `BOARD_GROUPINGS`, rosters + setup enums
  (`TIER1_FOES`/`TIER2_FOES`/`TIER3_FOES`/`ADVERSARIES`/`ALLIES`/`DIFFICULTIES`/`GAME_SOURCES`) + their
  types (`Difficulty`, `GameSource`, `ExpansionType`, …); board layout `BOARD_ANCHORS`, `BOARD_IMAGE_INFO`
  and movement graph `BOARD_ADJACENCY` + helpers `neighborsOf`/`stepDistance`/`shortestPath`, with types
  `Anchor`/`AnchorSlot`/`LocationAnchors`/`BoardAnchorMap`/`BoardImageInfo`/`BoardAdjacency`

## `ultimatedarktowerboard/plugin`

> Imports `three` + `ultimatedarktowerdisplay` (optional peers). The `.` entry never does.

- `attachBoard3D(view3D, options?)` → `Board3DHandle` (`{ setBoardState(state), setFocus(focus), dispose() }`)
  — the primary entry; wraps `attachScenePlugin` and closes over the `Tower3DView`.
- `Board3DPlugin` (implements Display `ScenePlugin`; `new Board3DPlugin(view3D, options?)`) for direct
  `attachScenePlugin` wiring; plus `setBoardState` / `setFocus`.
- `Board3DPluginOptions`: `{ boardState?, assetBaseUrl?, boardImageUrl?, northKingdom?: 0|1|2|3
  (default 0), resolveTokenImage?, onTokenSelect?, onFocusChange?, locationPick?, onLocationPick?,
  tokenFactory? }`. With `boardImageUrl` the plugin renders its **own** board on the disc and hides
  Display's; without it, Display's board stays. `locationPick` enables the armed in-scene space-pick
  (the editing add flow), mirroring the 2D map.
- `Board3DHandle`, `TokenBuildContext`, and re-exported `TokenSelection` / `TokenArtRef`.
