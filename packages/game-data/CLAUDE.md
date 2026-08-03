# packages/game-data (`ultimatedarktowerdata`) — reference data

Static Return to Dark Tower reference data (board locations, foes, heroes, monuments, box
inventory, card text) + seed encode/decode. Split out of `ultimatedarktower` in v6. Depth in
`docs/` (`SEED_FORMAT.md`, `board-data.md`, `seed.md`, `spreadsheet-import.md`,
`open-questions.md`).

## Two layers: identity rosters and card faces

- **Rosters** (`foes.ts`, `heroes.ts`, `monuments.ts`, `board/gameBoard.ts`) — who exists,
  keyed by stable kebab-case `id`. Canonical for names.
- **Card faces** (`foeCards.ts`, `monumentCards.ts`, `companionCards.ts`, `treasures.ts`,
  `potionsAndGear.ts`, `corruptions.ts`, `questItems.ts`, `quests.ts`, `spells.ts`,
  `nations.ts`, `dungeons.ts`, `caravans.ts`) — the printed text, keyed by the _same_ ids.

The card layer came from George Krubski's research spreadsheets; **`docs/spreadsheet-import.md`
is the provenance record** and `docs/open-questions.md` the gap list. It is all
observational, so some sets are known-incomplete — rows that are carry `needsReview: true`
plus a `sourceNote`. **Never fill a `needsReview` row in by inference; flag, don't guess.**

Naming rule for this layer: the `*_CARDS` names exist to avoid colliding with `gameContent`
(`COMPANION_CARDS` is NOT `gameContent.COMPANIONS`). Keep new card datasets flat and
collision-free rather than adding another namespace.

## Invariant: zero runtime dependencies

`package.json` has **no `dependencies` key** — only devDeps (vitest). This is the
whole point of the package: core/display/board and every app import it to get data
**without** pulling in a Node-only Bluetooth stack. **Never add a runtime dependency here.**

## Canonical-name drift guard

**`tests/nameConsistency.test.ts`** enforces that `foes.ts`'s `ALL_FOES` is the single
source of truth for foe/adversary spelling, and that every other roster (seed-parser tiers,
`gameContent.ts`, `TOWER_AUDIO_LIBRARY` labels) uses exactly one of those spellings. It
exists because v6 had the same entity spelled 2–3 ways ("Isa the Exile" vs "Isa The Exile").
**Adding a roster entry with an inconsistent spelling fails this test** — match `ALL_FOES`.

The guard now covers the **card layer too**: foe cards vs `FOE_BY_ID`, monument cards vs
`MONUMENT_BY_ID`, companions vs `gameContent.COMPANIONS`, every quest's location text vs
`BOARD_LOCATION_BY_NAME`, and — the big one — **every `boxInventory.ts` component name in a
card category must exist verbatim in the matching card dataset**. That last check was added
because `boxInventory` independently named the same ~130 cards and disagreed on 56 of them
(`Amulet Of Hope`, `Diadem Of The Emmisary`, `Opal of Protection`, `Repair The Weeping
Damn`). Note `boxInventory`'s **`Heroic Tests` category is the 16 monthly quests** — easy to
miss when auditing categories.

## `BOARD_SPOTS` replaces `BOARD_ANCHORS` (schema 0.5.0)

`src/board/boardAnchors.ts` is still generated from the same `tools/location-marker/udtBoardData.json`,
but the generator now lifts each location's slot map into a `BoardSpot[]` (`{id, at, accepts}`) —
`BOARD_ANCHORS`/`AnchorSlot`/`LocationAnchors` no longer exist. `RESERVED_TOKEN_TYPES` (also exported
from here) is the built-in vocabulary (`hero`/`foe`/`adversary`/`building`/`skull`/`monument`/`marker`/
`quest`) usable in a spot's `accepts` with no `library.tokenTypes` registry entry. See
`docs/board-data.md` for the full shape and `gen-board-data.mjs`'s header comment for the slot→spot
lift rules (`foe` spots also accept `adversary`; `marker` spots also accept `quest`).

## Build & test

- `build` = `tsc --build` (composite project, `"composite": true`, `ES2022`/CommonJS,
  `dist/`) **and** a hand-rolled `esbuild --bundle` ESM pass per entry point
  (`dist/esm/{index,board/index,seed/index}.mjs`) — same pattern as `packages/core`'s
  `browser`-condition fix. Needed because this package's CJS `export * from` re-exports
  compile to tsc's `__exportStar(require(...), exports)` runtime helper, which Vite/esbuild's
  static CJS-named-export detection can't see through — `import { GLYPHS } from
'ultimatedarktowerdata'` would come back "does not provide an export named 'GLYPHS'" in any
  dev server that serves this package's CJS dist raw (native ESM interop) rather than running
  it through a real bundler pass. The `exports` map's `import` condition points at the ESM
  bundle; `require` still gets the plain `tsc` CJS output — pure-additive, no consumer changes
  needed. Do **not** re-add `optimizeDeps.include`/alias workarounds in a consumer's vite
  config for this package now that the fix lives here (see `packages/core/CLAUDE.md`'s
  analogous note and `packages/board/vite.config.example.ts`'s history for why).
- `lint` = `eslint .` (root flat config); no package-local `ci` script — relies on the
  root `pnpm -r` fan-out for that.
- Tests are **vitest** (`tests/`, not colocated), one file per data module. Config lives in
  `vitest.config.ts` with `globals: true`, so the suites keep using bare
  `describe`/`it`/`expect` with no imports.
- Subpath exports: `.` (everything), `./board` (locations/anchors/adjacency graph),
  `./seed` (encode/decode/validate + `SystemRandom`).

This is the most heavily depended-upon package in the workspace and imports nothing from
any sibling — the leaf/root of the dependency graph.
