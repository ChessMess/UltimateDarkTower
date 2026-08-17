# @udtc/adapters

## 0.3.1

### Patch Changes

- a00cf63: Fix: `createDisplayAdapter` no longer re-fires a light sequence on every subsequent op.

  `light.named` stamped `current.led_sequence = numId` onto the adapter's long-lived
  `TowerState` and never cleared it — unlike `current.audio`, which was already reset in
  both places. Since `packFullState()` packs byte 18 into every snapshot pushed to the
  relay, the **physical tower** re-ran the light sequence on each later drum rotation,
  sound, or seal op in the same program.

  `led_sequence` is now cleared alongside `current.audio`, at the `wait` boundary and at
  the end of `program()`.

- Updated dependencies [99f396e]
- Updated dependencies [6961078]
- Updated dependencies [6961078]
- Updated dependencies [c4b5e89]
- Updated dependencies [5f9deec]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [af416e7]
- Updated dependencies [974549e]
- Updated dependencies [9046309]
- Updated dependencies [23cfe9f]
- Updated dependencies [6961078]
- Updated dependencies [f41fd0c]
- Updated dependencies [f41fd0c]
- Updated dependencies [a00cf63]
- Updated dependencies [f41fd0c]
- Updated dependencies [23d4db8]
- Updated dependencies [6961078]
- Updated dependencies [5c900e4]
- Updated dependencies [af416e7]
  - ultimatedarktowerboard@3.0.0
  - ultimatedarktowerdisplay@2.0.0
  - ultimatedarktowerdata@3.0.0
  - @udtc/engine@0.2.1
  - @udtc/schema@0.3.1
  - ultimatedarktower@7.1.2

## 0.3.0

### Minor Changes

- 33381f7: Board locations now own an open list of **spots** (`{id, at, accepts}`) instead of a fixed
  five-slot anchor map, and `library.tokenTypes` becomes a real, renderable registry — an
  author-defined token type is now a first-class citizen on the board, not just engine state.

  **`ultimatedarktowerboard` (major, 1.0.0 → 2.0.0) — data loss warning, not a migration guide.**
  `BoardState` collapses from six per-kind buckets (`heroes`/`foes`/`adversary`/`buildings`/
  `spaceMarkers`/`questMarkers`) into one `tokens: Record<string, PlacedToken>` collection.
  `BOARD_STATE_SCHEMA_VERSION` bumps 1 → 2. **Saves and scenarios from earlier versions cannot be
  opened by this build** — there is no migration path. `loadState`/`saveState` refuse an
  unrecognized version outright (`BoardStateLoadError` with `foundVersion` set); each host app
  detects the mismatch at its own load boundary and offers a download of the raw data before it's
  cleared, rather than silently discarding it.

  Removed outright (zero external consumers, confirmed): `BOARD_ANCHORS`, `AnchorSlot`,
  `LocationAnchors`, `anchorPxOf`, and the 18 legacy per-kind commands (`placeHero`, `spawnFoe`,
  `setSpaceMarker`, `addSkull`, …) from the `BoardCommand` union. **Those names survive as
  `BoardStateController` convenience methods** reimplemented over five new generic commands
  (`placeToken`/`moveToken`/`removeToken`/`updateToken`/`setSelections`), so most callers need no
  code change — only direct `BoardCommand`/bucket-shape consumers do. New: a `selectors` module
  (`heroesOf`, `foesOf`, `adversaryOf`, `buildingAt`, `skullsAt`, `monumentAt`, `markersAt`,
  `questsAt`, `tokensAt`, `tokensOfType`) replaces reading the old bucket properties directly.

  **`ultimatedarktowerdata` (minor).** `BOARD_SPOTS` (a `BoardSpotMap`) and `RESERVED_TOKEN_TYPES`
  are additive exports alongside the now-removed `BOARD_ANCHORS`/`AnchorSlot`/`LocationAnchors`
  (those three move with the board package's major, since board is this package's only in-repo
  consumer of them).

  **`@udtc/schema` / `@udtc/adapters` (private).** Scenario schema 0.5.0: `boardDef.anchors` is
  replaced by `boardDef.spots`; `$defs/tokenType` gains optional `artRef`/`color`/`capacity` so a
  `library.tokenTypes` entry can double as a board-renderable type. **This is the first schema
  change in the 0.4.x/0.5.x line that is not backward compatible** — a document authored before
  0.5.0 no longer validates. The Creator, `apps/digital`, and `apps/player` each detect an
  incompatible `schemaVersion`/save-version at load and offer an export-then-clear dialog instead
  of attempting to migrate. `@udtc/adapters`' `board.mutate: placeToken`/`removeToken` directives,
  previously silent no-ops in the Player, now actually mutate board state.

### Patch Changes

- Updated dependencies [fba6490]
- Updated dependencies [33381f7]
  - ultimatedarktowerboard@2.0.0
  - ultimatedarktowerdisplay@1.0.2
  - ultimatedarktowerdata@2.1.0
  - @udtc/schema@0.3.0

## 0.2.2

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerdisplay@1.0.0
  - ultimatedarktowerdata@2.0.0
  - ultimatedarktowerboard@1.0.0

## 0.2.1

### Patch Changes

- Updated dependencies [0d06832]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktowerboard@0.4.0
  - ultimatedarktower@6.0.0
  - ultimatedarktowerdisplay@0.11.0
  - ultimatedarktowerdata@1.0.0
