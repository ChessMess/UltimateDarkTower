# ultimatedarktowerdata

## 3.0.0

### Major Changes

- 9046309: **One record per entity: the `gameContent` namespace is removed.** `HEROES`
  entries now carry the gameplay sheet — `bannerAction`, `defaultVirtues`,
  `unlockableVirtues` — alongside board identity, and the foe/adversary/companion
  copies are gone in favour of the rosters that already covered them.

  Through v2, 10 of the 14 heroes existed twice: identity in `heroes.ts` keyed by a
  stable `id`, and the gameplay sheet in `gameContent.HEROES` keyed by display name
  with no `id` at all. Nothing could join the two halves except by matching on a
  name string, and the two could drift apart silently. The split was never a
  modelling decision — it was a workaround for a `Hero`/`HEROES` name collision,
  recorded as such in `src/index.ts`.

  The sheet half had **no consumers**, in this repo or its apps. The identity half
  has many: `apps/digital` (hero pickers, player boards) and
  `packages/board` (default roster, and portrait asset paths keyed by `id`).
  So the merge keeps the `id`-keyed roster and folds the sheet into it.

  ### Breaking

  **`gameContent` no longer exists.** Every export moves to a flat one:

  | Removed                                                                               | Use instead                                                              |
  | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
  | `gameContent.HEROES`                                                                  | `HERO_BY_NAME` (same name keys) or `HERO_BY_ID`                          |
  | `gameContent.heroes`                                                                  | `HEROES`                                                                 |
  | `gameContent.FOES`                                                                    | `FOES` — same 12, plus `id`, `kind`, `tier`, `source`                    |
  | `gameContent.ADVERSARIES`                                                             | `ADVERSARY_ROSTER` — same 8, plus `id`, `tier`, `source`                 |
  | `gameContent.COMPANIONS`                                                              | `COMPANION_CARDS` — a superset; the quest ten are the rows with `quest`  |
  | `gameContent.KINGDOM_VIRTUES`                                                         | `KINGDOM_VIRTUES` (now flat, from `virtues.ts`)                          |
  | `gameContent.kingdomVirtues`                                                          | `kingdomVirtues`                                                         |
  | `gameContent.Virtue`                                                                  | `Virtue`                                                                 |
  | `gameContent.Hero`                                                                    | `Hero`                                                                   |
  | `gameContent.Foe` / `.Adversary` / `.Companion`                                       | `Foe` / `CompanionCard`                                                  |
  | `gameContent.HeroName`, `.FoeName`, `.AdversaryName`, `.CompanionName`, `.VirtueName` | `string` — these are lists, not keyed literal maps                       |
  | `gameContent.HeroExpansion`                                                           | `ContentSource` (`'base' \| 'alliances' \| 'covenant' \| 'expeditions'`) |

  `hero.expansion` (`'Base Game' | 'Alliances' | 'Covenant'`) is gone; it agreed
  with `hero.source` on all 10 rows, so `source` is the single vocabulary now.

  **Adversaries no longer have their own type.** `gameContent.Adversary` collapses
  into `Foe` — `ADVERSARY_ROSTER` is a `readonly Foe[]`, and `ALL_FOES` is
  `[...FOES, ...ADVERSARY_ROSTER]`. Annotate with `Foe` wherever you used
  `Adversary`; the fields you were reading are all still there, plus `id`, `tier`
  and `source`.

  ```diff
  -import { gameContent } from 'ultimatedarktowerdata';
  -const banner = gameContent.HEROES['Spymaster'].bannerAction;
  -const foes = Object.values(gameContent.FOES);
  +import { HERO_BY_NAME, FOES } from 'ultimatedarktowerdata';
  +const banner = HERO_BY_NAME['Spymaster'].bannerAction;
  +const foes = FOES;
  ```

  ### Why the namespace existed, and why it doesn't now

  It was never a domain boundary. It held a second, poorer copy of four datasets
  the flat rosters already covered — each keyed by display name with **no `id`**,
  so the two halves of an entity could only be joined by matching a display string,
  and could drift apart silently. Those duplicates were the only things colliding
  (`Hero`, `HEROES`, `Foe`, `FOES`, `Adversary`), and the namespace was the
  workaround for the collision.

  None of them had a single consumer, in this repo or its apps. Removing the
  duplicates removed the collisions, which left the namespace with nothing to
  protect — so its last member, the kingdom virtues, is now flat in `virtues.ts`.

  Nothing was lost in the removal, and each claim is asserted in the suite:

  - all 10 hero sheets transferred byte-identical (110 text fields verified)
  - all 12 `gameContent.FOES` and 8 `ADVERSARIES` exist in `FOES` /
    `ADVERSARY_ROSTER` at the same level, with ids and sources they lacked
  - the 10 quest companions are exactly the `COMPANION_CARDS` rows carrying a
    `quest`, with identical titles — `nameConsistency.test.ts` asserts the 10/12
    split

  ### Not breaking

  `HEROES`, `HERO_BY_ID`, `Hero`, `HeroId` and `ContentSource` keep their shape;
  the sheet fields are additive and optional. Existing consumers compile unchanged.

  The sheet fields are **optional because four heroes genuinely have no sheet** —
  the unreleased Expeditions heroes, whose cards are not public. They carry none of
  it rather than a guess, matching how the package treats every other unobserved
  row. `heroes.test.ts` asserts a hero has the whole sheet or none of it.

  New: `HERO_BY_NAME`, for the name-keyed lookup `gameContent.HEROES` provided, and
  `Virtue` / `KINGDOM_VIRTUES` / `kingdomVirtues` / `KingdomDirection` as flat
  exports from the new `virtues.ts`.

### Minor Changes

- 974549e: Add the Return to Dark Tower card datasets, and reconcile `boxInventory` names against them.

  **New exports.** The printed card face for every card, keyed by the same stable ids as the
  existing identity rosters: `FOE_CARDS`, `MONUMENT_CARDS`, `COMPANION_CARDS` (all 22 —
  the 12 guild companions are new), `TREASURES` (62), `POTIONS_AND_GEAR`, `CORRUPTIONS` (24),
  `QUEST_ITEMS`, `QUESTS` (16), `SPELLS`, `NATIONS`, plus `DUNGEON_ROOMS` (78 rooms across
  the six dungeon types), `DUNGEON_ADVANTAGE`, `CARAVAN_ROOMS`, and the shared
  `AdvantageType` / `ADVANTAGE_TYPES`. Each dataset ships a frozen `_BY_ID` map.

  `BoardLocation` gains `borders` (Tower / map edge / neighbouring kingdom) and an optional
  `dungeon` (`{ name, type }`), identified for 46 of the 60 locations. Purely additive.

  **Data corrections in `boxInventory.ts`.** It independently named the same ~130 cards and
  disagreed with the card text on 56 of them; every one is now the printed card spelling.
  Five were outright errors — `Diadem/Ring/Vestments Of The Emmisary` → `… of the Emissary`,
  `Orhpaned Scion's Charm` → `Orphaned`, `Opal of Protection` → `Opal of Projection`,
  `Potion Of one Thousand Strides` → `of One Thousand Strides`, and
  `Repair The Weeping Damn` → `Repair the Weeping Dam`. The rest was mechanical title-casing
  (`Amulet Of Hope` → `Amulet of Hope`, `Perform The Song Of Peril` → `Perform the Song of
Peril`). **If you match on `boxInventory` component names, they have changed.**

  `tests/nameConsistency.test.ts` now enforces the agreement in both directions, so this
  class of drift cannot return.

  Provenance and the known gaps are in `docs/spreadsheet-import.md` and
  `docs/open-questions.md`. Data compiled from play by George Krubski (`@gwek` on
  BoardGameGeek); rows he could not fully observe carry `needsReview: true` and a
  `sourceNote` rather than a guess.

### Patch Changes

- 5f9deec: Fix two transcription typos in the reference data. These are the names apps
  display and — now that consumers pick cards from a dropdown rather than typing
  them — the exact strings they persist, so the misspellings had started leaking
  into saved game state.

  - `boxInventory`: the base-game gear card `'LeaTher Armor'` → `'Leather Armor'`.
  - Companion Vasa's title `'The Devine'` → `'The Divine'`, in **both**
    `boxInventory` (`Component.description`) and `gameContent.COMPANIONS`
    (`Companion.title`). The two copies are corrected together — leaving one
    behind is exactly the roster drift `tests/nameConsistency.test.ts` exists to
    catch.

## 2.2.0

### Minor Changes

- 25c9a5e: Ship a real ESM build (`dist/esm/{index,board/index,seed/index}.mjs`, an `esbuild --bundle`
  pass per entry point) and expose it via the `exports` map's `import` condition — the same
  pattern `ultimatedarktower` uses for its `browser` condition. Previously this package was
  CJS-only; its `export * from` re-exports compiled to tsc's `__exportStar(require(...),
exports)` runtime helper, which Vite/esbuild's dev-mode CJS-interop can't statically resolve
  into named exports. Any bundler-dev-server consumer doing `import { GLYPHS } from
'ultimatedarktowerdata'` (or any other star-re-exported name) against the linked workspace
  package would fail with "does not provide an export named ...". `require()` consumers are
  unaffected — the `require` condition still points at the existing `tsc` CJS output.

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
