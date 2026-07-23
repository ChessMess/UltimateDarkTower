# ultimatedarktowerdata

## 2.1.0

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

## 2.0.1

### Patch Changes

- e4e952c: Internal-only: factor the CJS/Node16 `tsconfig.json` family (this package plus `game-data`, the relay family, and `mcp-server`) into a shared root `tsconfig.node-lib.json`, mirroring the existing `tsconfig.browser-lib.json` pattern for `board`/`display`. Each package keeps only its own path options (`outDir`/`rootDir`/`composite`/`include`/`exclude`); the repeated compiler-options block and its explanatory comment move to the shared file.

  No public API or emitted-JS change for `ultimatedarktower`, `ultimatedarktowerdata`, `ultimatedarktowerrelay-shared`, `ultimatedarktowerrelay-core`, or `ultimatedarktowerrelay-client` — verified byte-for-byte identical `dist/` output before/after.

  `mcp-server-return-to-dark-tower` additionally gains the `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` strictness its five siblings already had (it was missed by an earlier alignment pass), which surfaced two genuinely dead write-only fields (`TowerController`'s `connected`/`calibrated`) — removed; the public `connected`/`calibrated` snapshot fields are unaffected, since they already read from the `isConnected`/`isCalibrated` getters, not these fields.

## 2.0.0

### Major Changes

- cdf7f37: Raise the declared Node floor to `>=22.13.0`.

  These packages previously declared `engines.node: ">=18.0.0"`, which was never verified —
  the monorepo's own toolchain requires Node >= 22.13 (pnpm 11.9 loads `node:sqlite`) and CI
  only ever exercised Node 22 and 24. The claim is now aligned with what is actually built and
  tested.

  `engines` is advisory by default: npm emits an `EBADENGINE` warning rather than failing the
  install unless the consumer has set `engine-strict`. Node 18 reached end of life, and the
  compiled output itself is unchanged by this release.

  Also corrects `packages/board`'s `three` peer range, which was `^0.170.0` — on a `0.x` line
  that resolves to `>=0.170.0 <0.171.0` and could not be satisfied by the `three` version the
  package is actually built and tested against. It now matches `packages/display` at
  `>=0.185.0`.

  Bundled with this Node-floor bump rather than releasing separately (same set of packages,
  same window): `ultimatedarktower`, `ultimatedarktowerdata`, `ultimatedarktowerrelay-shared`,
  `ultimatedarktowerrelay-core`, and `ultimatedarktowerrelay-client` move their TypeScript
  compile target from `ES2017` to `ES2022`, matching the rest of the workspace, plus enable
  `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`. **Module format is
  unchanged** — these packages still emit CommonJS (`module`/`moduleResolution` stay
  `Node16`/`Node16`, now with `exports`-map-aware resolution rather than the previous
  `commonjs`+implicit-`node10`). Adopting the workspace's `ESNext`/`bundler` module settings
  outright was evaluated and rejected: verified directly that it makes `require()` throw
  `ERR_MODULE_NOT_FOUND` for every consumer of these `require()`-based CJS packages, since
  none of them declare `"type": "module"`. `ES2022` output syntax on a package that already
  requires Node >= 22.13 (this same release) is not a compatibility concern.

## 1.0.0

### Major Changes

- 6a89e0e: Initial release. Return to Dark Tower reference data — board locations, foes, heroes, monuments,
  box inventory, glyphs, light sequences, the audio-cue catalog, and seed encode/decode — split out
  of `ultimatedarktower` (the BLE driver) in its v6.0.0. Zero runtime dependencies, no Bluetooth.

  Exported flat at the package root, plus `./board` and `./seed` subpaths for consumers who want a
  slice. `gameContent` (a separate, name-colliding gameplay-content dataset — banner actions and
  virtues, not the board-identity roster) stays namespaced to avoid shadowing `Hero` / `HEROES` /
  `Foe` / `FOES`.

  Install this directly when you want the reference data without a Bluetooth dependency — a browser
  app, a content tool, a card generator. `ultimatedarktower`, `ultimatedarktowerdisplay`, and
  `ultimatedarktowerboard` all depend on it and re-export what they need, so you don't need it
  directly if you're already using one of those.
