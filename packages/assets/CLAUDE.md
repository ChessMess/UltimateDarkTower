# packages/assets (`@udtc/assets`) — the game art + audio package (private)

Single source of truth for Return to Dark Tower **game art**: board art, token art, 3D models,
glyphs, and the tower's `.ogg` sound library. Not generic web chrome — favicons, README
screenshots, landing-page thumbs and webfonts stay with whoever owns them.

The bytes live in one directory per kind at the package root — `audio/`, `board/`, `glyphs/`,
`models/`, `tokens/` — with the URL modules in `src/` and hand-written declarations in `types/`.
`src/<kind>/` mirrors `<kind>/` one-for-one, which is what makes every internal specifier a plain
`'../../<kind>/…'`.

## Why this package exists

Art used to be copy-pasted into every consumer's `public/` and resolved at runtime from
`${import.meta.env.BASE_URL}assets/…`. That meant **~223 MiB of tracked art for ~73 MB of unique
content**, three hand-maintained copies of the token tree, and a script
(`packages/board/scripts/promote-token-art.mjs`) whose job was to print a checklist of files for
a human to copy between apps. The copies had already drifted into a live bug: quest-marker art
shipped in `packages/board/example` but not in player or digital, so `OFFICIAL_QUEST_ART`
resolved to 404s there.

## How delivery works — bundler-resolved URLs

Every export is a URL produced by `new URL('<literal>', import.meta.url)` (or
`import.meta.glob` for the token set). Consumers `import` it; their own Vite build emits the file
with a content hash. **No `public/` copies, no `BASE_URL` string concat.**

This works for a _source-only linked workspace package_ because `vite:asset-import-meta-url` has
no `node_modules` exclusion and `preserveSymlinks: false` realpaths the id to
`<repo>/packages/assets/...`, which is outside `node_modules` — so it is crawled as ordinary
source. Verified in both dev (`/@fs/…` URLs, served because `server.fs.allow` defaults to the
`pnpm-workspace.yaml` root) and build (hashed emitted files).

## Browsing what's in here

The **Graphics** section of `apps/codex` (`pnpm dev:codex`, then `#/art`; deployed at
`/UltimateDarkTower/codex/`) is the read-only view over this package. Its `src/art.test.ts` globs
this package's art directories and asserts the file list matches its registry, so **adding art here
turns that app's tests red until it is registered** — that guard is the reason the Graphics section
can be trusted as a complete inventory. It lists the five directories explicitly rather than
globbing the package root (which would sweep in `src/` and `types/`), so **a sixth art directory
here needs a matching pattern added over there** or its contents go uncatalogued.

(It began as a standalone gallery app and was folded into Codex — same shell, same router, same
registry-is-the-app design, just pointed at different data.)

## Traps

- **Never add `@udtc/assets` to `optimizeDeps.include`.** The dep optimizer rewrites
  `new URL(..., import.meta.url)` relative to `node_modules/.vite/deps` and has **no**
  `import.meta.glob` handling at all — so a pre-bundled copy either 404s every asset or throws
  `TypeError: import.meta.glob is not a function`. Dev-only, so it presents as a mystery.
  Linked packages are excluded by default, but this repo force-includes linked packages in four
  apps, so consumers that do carry an `optimizeDeps.include` should also carry
  `exclude: ['@udtc/assets']`.
- **`.glb` uses `new URL`, never `?url`.** `glb` is not in Vite's `KNOWN_ASSET_TYPES`, so the
  `?url` form would need `assetsInclude: ['**/*.glb']` in every consumer. `new URL` calls
  `fileToUrl` directly and skips that check.
- **Dev and build are two different implementations.** Vite 8 swaps `vite:import-glob` for a
  native Rust rolldown plugin when bundling. A dev-only smoke test proves nothing about the
  build — always check `vite build` too.
- **There is no asset tree-shaking.** `emitFile` runs in `transform`, _before_ tree-shaking, so
  every asset a module references is written to disk even if the export is unused. The module
  split (`/tokens`, `/board`, `/board-small`, `/models`, `/glyphs`, `/audio`, `/audio-effects`)
  **is** the granularity — that is why they are separate subpaths rather than one barrel. Proven
  the hard way: `board` and `board-small` started as one module, and `apps/creator` — which
  explicitly wants only the downscale — emitted the 22 MB PNG anyway, 34 MB of dist for a 13 MB app.
- **`/audio` uses per-file `new URL`, NOT a glob — and that is not interchangeable.** Verified
  directly: under Vite's _library_ mode a glob resolves to a static, base-less string
  (`/Adversary_Ashstrider_01.ogg`), while `new URL(literal, import.meta.url)` survives into the
  emitted bundle and stays relative to the chunk at runtime. `packages/display` is a library, so
  only the latter lets each consuming app's bundler re-detect and re-emit the files. `/tokens`
  uses a glob because its consumers are all apps. Don't unify them.
- **`src/audio/index.ts` is generated.** `packages/display/scripts/extract-audio.mjs` owns it,
  together with the sample-id→filename half in `packages/display/src/audio/audioLibrary.ts`. Both
  are written in one run; hand-editing either invites a drift that fails at import time. New
  hand-maintained sounds go in `src/audio/effects.ts`, which the generator never touches.
- **Zero dependencies, and it must stay that way.** `packages/board/example` has no
  `package.json` of its own and resolves through `packages/board`'s, so a dependency on
  `ultimatedarktowerboard` here would create a `board ⇄ assets` cycle. Key unions (e.g. the five
  glyph names) are written out structurally rather than imported.
- **Export only string-typed values** (`string`, `Record<string, string>`). No named interfaces.
  `ultimatedarktowerdisplay` publishes its `.d.ts` to npm; a type leaked from this private
  package would be an unresolvable `TS2307` for downstream consumers.

## `types/` is hand-written and committed — do not generate it

`exports` uses a `types` condition pointing at `types/*.d.ts`, with `default` pointing at the raw
`.ts`. TypeScript matches `types` (it must come **first** in object-key order — the resolver takes
the first matching key) and reads the declaration; Vite has no `types` condition and falls through
to the source.

This exists because `packages/display` _emits_ declarations (`rootDir: "src"`,
`declaration: true`), and importing a `.ts` outside its `rootDir` is `TS6059`. Declaration files
are exempt from that check.

**Why hand-written rather than `tsc --emitDeclarationOnly`:** if a generated `.d.ts` is missing or
stale, TS's exports resolver does **not** abort — it silently continues to `default`, loads the
`.ts`, and fails with TS6059 _plus_ `Cannot find name 'import.meta.glob'`. Committing five
one-line files removes that cold-clone/CI build-order landmine entirely and keeps this package
no-emit like `packages/scenario-store`. The package's own `typecheck` still compiles the real
`.ts`, so drift surfaces there.

Keep the declarations beside each other in `types/`, **not** next to the `.ts` files — a
`src/glyphs/index.d.ts` alongside `src/glyphs/index.ts` puts two modules with identical exports in
this package's own program.

## Wiring into `packages/board`

Board resolves token art at runtime from an `assetBaseUrl` string, which cannot work with hashed
bundler URLs. Rather than duplicating board's four hand-maintained `OFFICIAL_*` tables here, board
exports `makeTokenImageResolver(urls)` — it runs its own resolver against a `udt://` sentinel base
and maps the result through this package's path→URL map. `assetBaseUrl` is **not** deprecated; it
remains the path for external npm consumers of `ultimatedarktowerboard` who self-host.

3D models are a **second seam**: `resolveTokenImage` does not cover them (the plugin falls through
to `defaultTokenModelPath(art, assetBaseUrl)`, and `resolveTokenModel` is not exposed through
`BoardStageView`). Pass this package's `tokenArt` export alongside `resolveTokenImage` — a
`tokenArt` override takes precedence over both the callback and the convention.

## Known duplication, deliberately kept

`docs/pages/media/glyphs/*.svg` (5 files, ~90 KB) duplicate this package's `glyphs/`. They are consumed by
static CSS `mask-image:` and a `cp -r` in `deploy-pages.yml` — no bundler is involved. Deduping
would add a deploy-script coupling whose failure mode is invisible (unstyled icons, not an error).
