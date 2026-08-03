# apps/codex (`ultimatedarktowercodex`) — the game data browser

A read-only React + Vite browser over every export of `ultimatedarktowerdata`.
Deployed to `/UltimateDarkTower/codex/`; dev server on **3006**.

## The registry is the app

`src/datasets.ts` declares all 28 datasets — rows, key, columns, facets,
cross-links. Every view is generic over an entry there, so **adding a dataset is
a data edit, never a component**. Resist adding per-dataset render config:
`render.tsx`'s `<Fields>` walks `Object.entries()` and already handles strings,
string arrays, numbers and one level of nesting, which covers every shape the
package exports. The one exception is the optional `title` (box components label
themselves with `type`, not `name`).

## `src/datasets.test.ts` fails when game-data grows

Each entry's `exports` array names the game-data exports it covers, and the test
asserts that union equals the package's whole export surface (minus a named list
of interactive helpers). **Add an export to `packages/game-data` and this app's
tests go red until it is registered.** That is deliberate — it is the only thing
keeping the Codex a complete view. The test also checks every key is unique and
URL-safe and that every `related()` link resolves.

## Traps

- **Vite does not watch `packages/game-data/dist/`.** It is a symlink to built
  output, so editing game-data source shows nothing until
  `pnpm --filter ultimatedarktowerdata build`. `predev`/`pretest` cover a cold
  start, not a mid-session edit. This bites here more than anywhere else in the
  repo, because reviewing that data is the whole point of the app.
- **Never `.sort()` a `dataset.rows` array in place.** game-data's arrays are
  `readonly` to TypeScript but _not frozen at runtime_, so an in-place sort would
  reorder the data for every other consumer in the tab. `asRows()` copies the
  array defensively and `sortRows()` returns a copy; keep it that way.
- **Composite keys go through `safeKey()`.** `#` would terminate the hash route
  and `/` would fake a path segment — and real data hits this: box categories
  include `"Manuals / Sheets"`.
- **Do not add `optimizeDeps.include` or a CJS alias for `ultimatedarktowerdata`.**
  It ships an `import` condition pointing at a real ESM bundle. If you see "does
  not provide an export named …", rebuild game-data — don't edit the vite config.
  See `packages/game-data/CLAUDE.md`.

## Styling: deliberately not a UDT app

The other apps wear the tower's slate and crimson. This one is a reading room —
warm paper, botanical green, records as library catalog cards. `index.css` is the
whole design, and **every colour is a token**; that is what keeps night mode a
short override rather than a second stylesheet.

`@udtc/theme/theme.css` is **not** imported (it _is_ the tower palette). Only its
`useTheme` store is reused, for the `udtc-theme` localStorage key and the
`data-theme` contract that the FOUC script in `index.html` also depends on. Its
`<ThemeToggle>` is not reused either — it colours itself with inline styles bound
to `--c-*` tokens, which no stylesheet can override, so `App.tsx` has a small
replacement.

## Tests

`environment: 'node'` — the only suite is a pure data check, so there is no
`jsdom` devDep. Add one with the first component test.
