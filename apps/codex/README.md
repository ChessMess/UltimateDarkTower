<h1 align="center">Tower Codex</h1>

<p align="center">
  Browse the whole <em>Return to Dark Tower</em> reference — every printed card face, the board, the rosters, the box contents, and every piece of game art and audio — searchable and cross-linked.
</p>

---

## What this is

A read-only browser over two packages:

- [`ultimatedarktowerdata`](../../packages/game-data) — twenty-eight datasets,
  roughly 1,300 records, presented as a sortable table or a grid of catalog
  cards, with a detail view for every record.
- [`@udtc/assets`](../../packages/assets) — every piece of game art and audio,
  under **Graphics** (`#/art`): board art, the full token roster, the tower model, the
  drum glyphs and the tower's 115-file sound library.

It reads both packages directly, so it is never a copy that drifts. Each art
group page shows the exact import to write to use those URLs in your own code.

**Live:** https://chessmess.github.io/UltimateDarkTower/codex/

## Why it exists

The card layer — every printed card face, imported from research spreadsheets —
had no consumer anywhere in the monorepo. Several thousand lines of transcribed
card text had never been looked at by eye. This app is where you look at it.

It is also honest about the data's gaps. Rows the source author could not fully
observe carry `needsReview` and a source note; the Codex stamps them and shows
the note, and the home page counts them alongside the board locations with no
identified dungeon and the provisional Expeditions heroes.

## Running it

From the repo root:

```bash
pnpm run dev:codex        # http://localhost:3006
```

`predev` builds `ultimatedarktowerdata` first, so a fresh clone works without a
separate library build.

**Editing game data while the dev server runs?** Vite watches this app's source,
not the symlinked `packages/game-data/dist/`. Rebuild it to see your change:

```bash
pnpm --filter ultimatedarktowerdata build
```

## How it is put together

Everything hangs off [`src/datasets.ts`](src/datasets.ts) — a registry declaring,
per dataset, its rows, key, columns, facets and cross-links. Every view is a
generic renderer over an entry there, so adding a dataset is a data edit, never a
component. There is no per-dataset render config: `render.tsx`'s `<Fields>` walks
`Object.entries()` and handles every shape the package exports.

| File           | What it does                                           |
| -------------- | ------------------------------------------------------ |
| `datasets.ts`  | The registry. The only real logic.                     |
| `App.tsx`      | Hash routing, the shelf sidebar, home, global search.  |
| `views.tsx`    | Sortable table, card grid, facet chips.                |
| `render.tsx`   | The generic record renderer, badges, detail view.      |
| `search.ts`    | Substring search, faceting, sorting.                   |
| `art.ts`       | The art registry — groups derived from `@udtc/assets`. |
| `artViews.tsx` | Graphics tiles, grid, detail pane, audio players.      |
| `index.css`    | The whole visual design.                               |

`src/datasets.test.ts` asserts the registry covers every export of
`ultimatedarktowerdata`; `src/art.test.ts` asserts the art registry covers every
file in `packages/assets/`. Add either and this app's tests fail until it is
registered — the Codex cannot silently stop being a complete view.

## Notes

- The **Seed Decoder** link in the sidebar resolves on the deployed site, where
  both apps sit under the same base path. It 404s in local dev, since that app
  runs on its own port.
- Fonts come from Google Fonts (Fraunces, Karla, DM Mono). With them blocked the
  app still reads correctly — every family has a system fallback stack.
