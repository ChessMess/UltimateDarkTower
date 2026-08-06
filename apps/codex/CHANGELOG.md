# Changelog

## 0.2.0

### Minor Changes

- c4b5e89: The Codex now browses the game **art** as well as the game data. New **Graphics** section at
  `#/art/<group>/<asset>`: board art, the full token roster, the tower model, the drum glyphs and
  the tower's 115-file sound library, read straight out of `@udtc/assets`.

  This absorbs what was briefly a standalone `apps/asset-browser` gallery at `/gallery`. It was the
  same app pointed at different data — same hash router, same shell, same `resolve.dedupe`
  invariant, same "registry is the app" design — so it is now one app at one URL with one design.

  **Two registries, deliberately not one.** `src/art.ts` sits beside `src/datasets.ts` rather than
  registering art as `Dataset` rows: art carries `kind`/`heavy`/`preview` and renders as media, and
  keeping it out of `DATASETS` is what keeps `TOTAL_ROWS` an honest claim about
  `ultimatedarktowerdata`. Everything else is shared — router, shell, sidebar, breadcrumbs, field
  lists — and art contributes only `art-`prefixed CSS.

  **Every sidebar section now collapses, and stays that way.** The shelf carries 11 headings once
  Graphics is in it, so each is a native `<details>` and the collapsed set is remembered in
  `localStorage` across reloads. New sections default to open.

  Also:

  - `src/art.test.ts` globs `packages/assets/**/*` and asserts the file list equals the
    registry's, so adding art turns these tests red until it is registered.
  - `search` and `art` are now guarded reserved route ids — a dataset claiming either would be
    silently unreachable. (`search` had been magic and unguarded since day one.)
  - The art palette is Codex's own warm paper, not the gallery's dark chrome. The one thing kept is
    the transparency checkerboard behind thumbnails — and it stays light in night mode by design,
    because the drum glyphs are near-black on transparency and a checkerboard that follows the page
    would swallow them. It also only draws behind images; audio and model tiles have no transparency
    to reveal.

- 5c04476: New app: **Tower Codex** — a browsable reference for everything
  `ultimatedarktowerdata` exports.

  Twenty-eight datasets, ~1,300 records: the identity rosters, the full card layer
  imported in `55dfad3` (foe/monument/companion cards, treasures, potions and
  gear, corruptions, quest items, quests, spells, nations), all 78 dungeon rooms
  and 32 caravan rooms, the 60 board locations with their adjacency graph and 212
  token spots, the flattened box inventory, the tower's 113 audio cues and light
  sequences, and the seed encoding tables.

  Each dataset gets a sortable table and a card view; records cross-link on the
  shared kebab-case ids — a foe reaches its printed card and its tower sound, a
  box component reaches the card that names it, a board location reaches its
  dungeon's room pool. Global search covers every record in one pass.

  Rows the source author could not fully observe are stamped `needs review` with
  their source note shown, and the home page reports the data's known gaps
  (6 flagged rows, 14 of 60 locations without an identified dungeon, 4 provisional
  Expeditions heroes) rather than leaving them buried in `open-questions.md`.

  A registry test asserts the app covers every export of `ultimatedarktowerdata`,
  so adding data there fails this app's tests until it is registered.

### Patch Changes

- ff21b00: Fix the blank page in production: dedupe `react`/`react-dom` in the Vite config.

  `@udtc/theme` is source-only and declares `react` as a **peer**, so pnpm gives it
  its own copy under `packages/creator-theme/node_modules/react` while the app
  resolves the workspace root copy. Without `resolve.dedupe` both were bundled,
  and `useTheme`'s `useSyncExternalStore` ran against the copy whose dispatcher
  was never set — the app threw
  `Cannot read properties of null (reading 'useSyncExternalStore')` on mount and
  rendered nothing.

  Every other React app here already sets this (`creator`, `player`, `digital`);
  the codex was the only one that didn't.

  Also adds `src/App.test.tsx`, which mounts the real `<App/>` through the real
  theme store and asserts registry content reaches the DOM. The existing suite
  checked the data and the data was fine, so a blank page passed every test. The
  new suite fails with all five cases when `dedupe` is removed, so it guards the
  actual regression rather than restating it. Test environment moves to `jsdom`
  for it.

- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [5f9deec]
- Updated dependencies [974549e]
- Updated dependencies [9046309]
  - @udtc/assets@0.2.0
  - ultimatedarktowerdata@3.0.0

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
