# apps/codex (`ultimatedarktowercodex`) — the game data + art browser

A read-only React + Vite browser over every export of `ultimatedarktowerdata`
**and** every file in `@udtc/assets`. Deployed to `/UltimateDarkTower/codex/`;
dev server on **3006**.

## Two registries, deliberately not one

- `src/datasets.ts` + `render.tsx`/`views.tsx` — the 28 game-data datasets.
- `src/art.ts` + `artViews.tsx` — the art/audio files, at `#/art/<group>/<asset>`.

They are **not** merged. Art was folded in from a standalone gallery app (it was
the same app pointed at different data), but registering art as
`Dataset` rows was rejected: art carries `kind`/`heavy`/`preview` and renders as
media rather than as fields, and keeping it out of `DATASETS` is what keeps
`TOTAL_ROWS` — and the home page's "N records across M datasets" — an honest
claim about `ultimatedarktowerdata`.

Everything _else_ is shared rather than duplicated: the hash router, the shell,
the sidebar, `.crumbs`, `.fields`/`.field`, `.dataset-head`, `.empty`,
`.home-groups`. Art contributes only genuinely media-specific CSS, all `art-`
prefixed. Resist growing a second shell.

## The registry is the app

`src/datasets.ts` declares all 28 datasets — rows, key, columns, facets,
cross-links. Every view is generic over an entry there, so **adding a dataset is
a data edit, never a component**. Resist adding per-dataset render config:
`render.tsx`'s `<Fields>` walks `Object.entries()` and already handles strings,
string arrays, numbers and one level of nesting, which covers every shape the
package exports. The one exception is the optional `title` (box components label
themselves with `type`, not `name`).

The same rule holds for `src/art.ts`: token and audio groups are _derived_ from
`tokenUrls`/`audioUrls`, so the directory is the source of truth and there is no
hand-maintained list to forget.

## The section is labelled **Graphics**; the route is still `#/art`

The sidebar divider, the breadcrumb, the home block and the search block all say
_Graphics_. Every route, module, export and CSS class stays `art` —
`#/art/<group>`, `art.ts`, `ART_GROUPS`, `.art-tile`. That split is deliberate:
renaming the label is a five-string edit, renaming the identifiers is a
whole-app churn that buys a reader nothing. Do not "finish" the rename.

Note the label is a slight overclaim: 115 of the ~230 files under it are the
tower's **audio**, not graphics. The blurbs say "art and audio" for that reason.
If that ever grates, the fix is to lift Audio out as its own top-level section
rather than to rename things back.

## `#/search` and `#/art` are reserved route ids

Both are dispatched in `App.tsx` **before** `DATASET_BY_ID` is consulted, so a
dataset claiming either id would be silently unreachable — no error, just a page
that never opens. `datasets.test.ts` guards both. (`search` was magic and
unguarded from day one; the guard arrived with `art`.)

## `src/datasets.test.ts` fails when game-data grows

Each entry's `exports` array names the game-data exports it covers, and the test
asserts that union equals the package's whole export surface (minus a named list
of interactive helpers). **Add an export to `packages/game-data` and this app's
tests go red until it is registered.** That is deliberate — it is the only thing
keeping the Codex a complete view. The test also checks every key is unique and
URL-safe and that every `related()` link resolves.

## `src/art.test.ts` fails when the art grows

The art half has its own drift guard, on the same principle: it globs the art
directories of `packages/assets` and asserts the file list equals the registry's.
**Add a file to `packages/assets/audio|board|glyphs|models|tokens` and this app's
tests go red until it is registered.**

It is **one pattern per art directory, not `packages/assets/**`** — the art dirs
sit at the package root next to `src/` and `types/`, which a blanket glob would
sweep in. So a _sixth_ art directory over there is invisible here until a pattern
is added, same fail-loudly posture as the `> 50` assertion. The patterns must
stay inline literals: Vite parses the call out of the AST and throws
`Expected glob to be a string, but got dynamic template literal` if you hoist the
shared `../../../packages/assets` prefix into a `const`.

The glob takes **no options** — bare `import.meta.glob(pattern)` yields path keys
and lazy importers with no asset resolution at all. Do not add `eager` or a
`?url` query: the test would then depend on Vite's asset pipeline rather than on
the filesystem, which is the thing being checked. Keep the `> 50` vacuous-pass
assertion too — a glob that matches nothing returns `{}` silently, and that guard
is what catches a wrong relative path.

`import.meta.glob` is typed by a file-local
`/// <reference types="vite/client" />`, deliberately **not** by
`"types": ["vite/client"]` in `tsconfig.app.json` — setting `types` there would
disable automatic `@types/*` inclusion for every source file in the app.

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
- **Never add `@udtc/assets` to `optimizeDeps.include` either**, for a different
  reason: the dep optimizer rewrites `new URL(…, import.meta.url)` relative to
  `node_modules/.vite/deps` and has **no** `import.meta.glob` handling at all, so
  a pre-bundled copy either 404s every asset or throws `TypeError:
import.meta.glob is not a function`. It is **dev-only**, so `vite build` will
  not catch it — that is why the manual dev pass over `#/art/foes` is a real
  verification step. See `packages/assets/CLAUDE.md`.
- **`heavy: true` is load-bearing, not decorative.** `board.png` is 22 MB; the
  tile and the detail pane show `boardSmall` until the reader presses the button.
  A heavy asset with no `preview` is a broken image — `art.test.ts` asserts the
  pairing. The Dimensions/Size rows are measured from _what is on screen_, so
  while the stand-in is up they are labelled "(small variant)"; unlabelled they
  read as the original's and are off by ~45× (481 KB shown under a 22 MB file's
  name). `App.test.tsx` guards the labelling.
- **Art group ids are deep-linkable URLs.** The audio slugs are authored in
  `AUDIO_SECTIONS` rather than derived from the filename prefix, which would have
  produced `audio-mainobjectivevictory`. `art.test.ts` asserts they stay
  `[a-z0-9-]+`.
- **`markers/` holds both `skull.png` and `skull.glb`**, which share a stem and
  so would share a route. `tokenGroups()` appends the extension to the second id;
  leave that in. The drift guard caught this on its first run.
- **This app's `dist/` is ~71 MB and that is correct.** It is the one place that
  deliberately ships every asset. The size gate that matters is
  `packages/display`'s, not this one's.

- **The shelf's collapsed sections persist under `codex-shelf-collapsed`.** Each
  section is a native `<details>` — no role, no `aria-expanded`, no key handling,
  because the platform already does all three. Two things there are load-bearing:
  the stored array is the **collapsed** set, not the open one, so a section added
  later defaults to open rather than arriving hidden behind a list that never
  names it; and the keys are prefixed `data:` / `art:` because the two registries
  name their sections independently (`Board` is a dataset group, `Board & models`
  an art section). `onToggle` bails when state and the DOM already agree —
  re-rendering `open` re-fires `toggle`, and without that guard the two ping-pong.

## Styling: deliberately not a UDT app

The other apps wear the tower's slate and crimson. This one is a reading room —
warm paper, botanical green, records as library catalog cards. `index.css` is the
whole design, and **every colour is a token**; that is what keeps night mode a
short override rather than a second stylesheet.

**Art wears the same palette.** The gallery it came from was dark-by-default
(good for artwork, wrong for this app); folding it in meant re-deriving its
colours from codex's tokens. The one thing kept from that design is the
**transparency checkerboard** behind thumbnails, and it is not decoration: token
PNGs are transparent, and on a flat panel they read as having a solid
background — exactly the detail someone opens the Graphics section to check.

Its two tokens are **fixed light values, and must not be derived from the
palette** — the one place in this stylesheet where a hardcoded colour is right:

```css
--checker-a: #f2ebdd;
--checker-b: #e2dbce;
```

They started out derived from `--paper-sunk`/`--ink`, which made night mode
follow for free — and made the drum glyphs invisible. `@udtc/assets`' `glyphs/*.svg` is
`#231F20` on transparency, so a checkerboard that darkens with the page puts
near-black art on a near-black plate. **Nothing in `@udtc/assets` is
light-on-transparent**, so a light plate is safe for every file here while a
dark one is not; the values above are exactly what the derived pair computed in
day mode, so daylight is byte-identical.

The checkerboard is scoped to `[data-kind='image']`, which
`ArtTile`/`ArtDetail` already emit. Only images have transparency to reveal, and
audio/model tiles show an `--ink-faint` text badge that would be unreadable on
the fixed plate in night mode — they keep `--paper-sunk`. That scoping raises
specificity, so `.art-stage`'s larger `--check: 20px` carries the attribute
selector too; a bare `.art-stage` would silently lose and draw at the tile's
16px.

`@udtc/theme/theme.css` is **not** imported (it _is_ the tower palette). Only its
`useTheme` store is reused, for the `udtc-theme` localStorage key and the
`data-theme` contract that the FOUC script in `index.html` also depends on. Its
`<ThemeToggle>` is not reused either — it colours itself with inline styles bound
to `--c-*` tokens, which no stylesheet can override, so `App.tsx` has a small
replacement.

## Tests

Three suites, `environment: 'jsdom'`:

- **`datasets.test.ts`** — the game-data drift guard (above), plus key
  uniqueness, URL-safety, link resolution, readable titles and the reserved
  route ids.
- **`art.test.ts`** — the art drift guard (above), plus id safety, the
  `heavy`/`preview` pairing and the 115-file sound-library count (which
  `packages/display/scripts/check-dist-size.mjs` independently asserts reaches
  display's `dist/` — a drift between those two numbers is a real problem).
- **`App.test.tsx`** — mounts the real `<App/>` and asserts registry content
  reaches the DOM. It exists because a blank page once shipped while every data
  test passed: `resolve.dedupe` was missing from `vite.config.ts`, two React
  copies got bundled (`@udtc/theme` is source-only with react as a _peer_, so it
  has its own), and `useTheme`'s `useSyncExternalStore` hit a null dispatcher.
  **Do not remove `dedupe`** — pull it out and every render case fails, which is
  the point.

**There is no `localStorage` under vitest, and it is not jsdom's fault.** The
jsdom environment makes `globalThis` _be_ the window, so Node 22's experimental
`localStorage` global shadows jsdom's implementation — and Node's is `undefined`
unless the process was started with `--localstorage-file`. `sessionStorage` is
untouched, which is exactly what makes the absence read as a jsdom bug. `App.tsx`
survives it because every access there is wrapped, but any test that asserts on
persistence must `vi.stubGlobal('localStorage', …)` first; `App.test.tsx` installs
a Map-backed stand-in per test in `beforeEach`.

**Assert art sidebar entries by href, and scope the query.** Three art group
names — `Monuments`, `Heroes`, `Glyphs` — are _also_ dataset names, so a
`toContain(g.name)` loop passes off the dataset sidebar alone even if art never
renders. And the sidebar and the home art block **both** emit `#/art/<id>`
links, so a document-wide `a[href^="#/art/"]` query passes when either one alone
is present — verified by breaking the sidebar hrefs and watching the unscoped
version stay green. Query `.shelf` and `.home-art` separately.
