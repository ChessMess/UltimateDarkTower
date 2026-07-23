# packages/game-data (`ultimatedarktowerdata`) — reference data

Static Return to Dark Tower reference data (board locations, foes, heroes, monuments, box
inventory) + seed encode/decode. Split out of `ultimatedarktower` in v6. Depth in `docs/`
(`SEED_FORMAT.md`, `board-data.md`, `seed.md`).

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

## `BOARD_SPOTS` replaces `BOARD_ANCHORS` (schema 0.5.0)

`src/board/boardAnchors.ts` is still generated from the same `tools/location-marker/udtBoardData.json`,
but the generator now lifts each location's slot map into a `BoardSpot[]` (`{id, at, accepts}`) —
`BOARD_ANCHORS`/`AnchorSlot`/`LocationAnchors` no longer exist. `RESERVED_TOKEN_TYPES` (also exported
from here) is the built-in vocabulary (`hero`/`foe`/`adversary`/`building`/`skull`/`monument`/`marker`/
`quest`) usable in a spot's `accepts` with no `library.tokenTypes` registry entry. See
`docs/board-data.md` for the full shape and `gen-board-data.mjs`'s header comment for the slot→spot
lift rules (`foe` spots also accept `adversary`; `marker` spots also accept `quest`).

## Build & test

- `build` = `tsc --build` (composite project, `"composite": true`), `ES2022`/CommonJS.
- `lint` = `eslint .` (root flat config); no package-local `ci` script — relies on the
  root `pnpm -r` fan-out for that.
- Tests are **vitest** (`tests/`, not colocated), one file per data module. Config lives in
  `vitest.config.ts` with `globals: true`, so the suites keep using bare
  `describe`/`it`/`expect` with no imports.
- Subpath exports: `.` (everything), `./board` (locations/anchors/adjacency graph),
  `./seed` (encode/decode/validate + `SystemRandom`).

This is the most heavily depended-upon package in the workspace and imports nothing from
any sibling — the leaf/root of the dependency graph.
