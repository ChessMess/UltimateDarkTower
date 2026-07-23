---
'ultimatedarktowerboard': major
'ultimatedarktowerdata': minor
'@udtc/schema': minor
'@udtc/adapters': minor
---

Board locations now own an open list of **spots** (`{id, at, accepts}`) instead of a fixed
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
