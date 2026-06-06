# API

> Curate as the surface stabilizes.

## `ultimatedarktowerboard` (`.`)

- **State:** `BoardState`, `HeroToken`, `FoeToken`, `BuildingState`, `FoeStatus`, `SpaceMarker`,
  `HeroId`, `FoeId`, `LocationName`, `createDefaultBoardState()`
- **Commands:** `BoardCommand`, `BoardCommandType`
- **Reducer:** `applyBoardCommand(state, command)`
- **Controller:** `BoardStateController` (`{ initial?, mode: 'self' | 'host' }`), `getState`,
  `dispatch`, `applyState`, `reset`, `subscribe`, `on(type, fn)`, and named methods (`placeHero`,
  `spawnFoe`, `addSkull`, `setSpaceMarker`, …)
- **Events:** `BoardEvent`, `BoardEventType`, `BoardEventListener`
- **Save/load:** `saveState(state)`, `loadState(json)`, `BOARD_STATE_SCHEMA_VERSION`, `BoardStateLoadError`
- **Renderers:** `BoardReadout`, `BoardMap2D`, `BoardRenderer`, `BoardFocus`
- **View/UI:** `BoardRenderView`, `mountBoardUI(host, controller)`
- **UDT re-exports:** `BOARD_LOCATIONS`, `BOARD_LOCATION_BY_NAME`, `BOARD_GROUPINGS`, rosters + setup enums
  (`TIER1_FOES`/`TIER2_FOES`/`TIER3_FOES`/`ADVERSARIES`/`ALLIES`/`DIFFICULTIES`/`GAME_SOURCES`) + their
  types (`Difficulty`, `GameSource`, `ExpansionType`, …); board layout `BOARD_ANCHORS`, `BOARD_IMAGE_INFO`
  and movement graph `BOARD_ADJACENCY` + helpers `neighborsOf`/`stepDistance`/`shortestPath`, with types
  `Anchor`/`AnchorSlot`/`LocationAnchors`/`BoardAnchorMap`/`BoardImageInfo`/`BoardAdjacency`

## `ultimatedarktowerboard/plugin`

- `Board3DPlugin` (implements Display `ScenePlugin`), `Board3DPluginOptions`
