---
'ultimatedarktowercodex': minor
---

The Codex now browses the game **art** as well as the game data. New **Graphics** section at
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
