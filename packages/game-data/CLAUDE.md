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

## Build & test

- `build` = `tsc --build` (composite project, `"composite": true`), `es2017`/CommonJS.
- No package-local `lint`/`ci` scripts — relies on the root `eslint .` and `pnpm -r` fan-out.
- Tests are **vitest** (`tests/`, not colocated), one file per data module. Config lives in
  `vitest.config.ts` with `globals: true`, so the suites keep using bare
  `describe`/`it`/`expect` with no imports.
- Subpath exports: `.` (everything), `./board` (locations/anchors/adjacency graph),
  `./seed` (encode/decode/validate + `SystemRandom`).

This is the most heavily depended-upon package in the workspace and imports nothing from
any sibling — the leaf/root of the dependency graph.
