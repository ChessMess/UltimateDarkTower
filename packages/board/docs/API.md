# API

> Scaffold stub — generate/curate as the surface stabilizes.

## `ultimatedarktowerboard` (`.`)

- **State:** `BoardState`, `BoardToken`, `BoardTokenKind`, `BoardSide`, `createDefaultBoardState()`
- **Commands:** `BoardCommand`, `BoardCommandType`
- **Reducer:** `applyBoardCommand(state, command)`
- **Controller:** `BoardStateController`
- **Events:** `BoardEventName`, `BoardEventMap`, `BoardEventListener`
- **Save/load:** `saveState(state)`, `loadState(json)`, `BOARD_STATE_SCHEMA_VERSION`
- **Renderers:** `BoardReadout`, `BoardMap2D`, `BoardRenderer`, `BoardFocus`
- **View/UI:** `BoardRenderView`, `mountBoardUI(host, controller)`
- **UDT re-exports:** `BOARD_LOCATIONS`, `BOARD_LOCATION_BY_NAME`, `BOARD_GROUPINGS`, rosters
  (`TIER1_FOES`/`TIER2_FOES`/`TIER3_FOES`/`ADVERSARIES`/`ALLIES`) + their types

## `ultimatedarktowerboard/plugin`

- `Board3DPlugin` (implements Display `ScenePlugin`), `Board3DPluginOptions`
