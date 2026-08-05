# packages/board (`ultimatedarktowerboard`) — game-board renderer

2D board renderer + optional `Board3DPlugin`. Depth in `docs/` (`ARCHITECTURE.md`,
`STATE_MODEL.md`, `STAGE.md`, `DISPLAY_INTEGRATION.md`).

## Invariant: no game rules

The reducer (`applyBoardCommand`) does **no** validation or clamping except flooring skull
counts at 0; it **never throws**, even for unknown location/hero ids (may `console.warn` in
dev). Hosts own the rules. Don't add rule enforcement here.

- **Controlled vs uncontrolled**: `BoardStateController({ mode })` — `'self'` (default,
  controller owns truth) vs `'host'` (host owns truth; `dispatch` emits a `change` intent
  without mutating, and `applyState(next)` is the only commit path).
- `SelectionStore` / `LocationPickStore` are the only channel between renderers (produce
  clicks) and editing UI (consumes them) — neither imports the other.
- `Board3DPlugin` implements display's `ScenePlugin` interface (adapter pattern, one layer
  up from core's `IBluetoothAdapter`).

## Build

- Three Vite library entries, each ESM+CJS: `.` (headless, three-free), `./plugin`
  (`Board3DPlugin`, imports `three` + display), `./stage` (`BoardStageView`; the 3D tower
  is a dynamic `import()`, never bundled into `stage`). Matches the `exports` map.
- **CJS filenames are `.cjs`** (see the comment in `vite.config.ts`) — display originally
  shipped the broken `.cjs.js` and has since been fixed to match this convention.
- Tests: **vitest** (`vitest.config.ts`), in `__tests__/` (note: not `tests/`).
  `plugin.contract.test.ts` asserts `Board3DPlugin` satisfies display's `ScenePlugin`
  at the type level; `plugin.integration.test.ts` runs a real `Tower3DView` against
  display-ported mocks.
- The config is standalone, **not** a `test` block in `vite.config.ts` — that file is
  the library-build config whose `rollupOptions.external` lists `three`, and aliasing
  `three` to a mock alongside it is not worth reasoning about.
- **Every alias key is a `RegExp`.** Vite's string alias keys match by _prefix_, so a
  bare `'three'` would also swallow `three/examples/jsm/*` and `three/addons/*`.
- The two `ultimatedarktowerdisplay` → `dist/*.cjs.js` aliases are **gone**. They only
  existed because jest's CJS loader could not use display's `.cjs.js` under
  `type: module`; vitest resolves the package `exports` map to the ESM build.
- Mocks in `__tests__/__mocks__/` are **ESM** (`export default` + named re-exports).
  They were CJS, which is inert in this `type: module` package. Names are re-exported
  through `__e_`-prefixed aliases because several (e.g. `Layers`) collide with the
  class declarations in the same file.
- **Snapshot keys differ from jest**: vitest separates describe/test with `>`. The
  three `readout.snapshot` baselines were re-keyed during migration; their content is
  byte-identical to the jest originals (verified). Watch for "N obsolete" in the
  output — it means keys stopped matching and vitest silently wrote new ones.

## Stale-doc warnings (do not trust these verbatim)

- `docs/TROUBLESHOOTING.md` describes siblings as `file:` devDeps checked out next to the
  repo — **stale**: it's a pnpm monorepo, deps are `workspace:^`/`workspace:*`.

The three-free `.`/`./stage` invariant IS enforced now: `build` runs
`scripts/check-three-free.mjs` after the Vite/tsc build, walking the static import closure of
the `.`/`stage` ESM bundles and failing if either statically imports `three` (a dynamic
`import()`, as `./stage` uses, is allowed).

## Token art: two seams, not one

- **Images** — `makeTokenImageResolver(urls)` (exported from `.`) builds a `resolveTokenImage`
  callback from a `'<group>/<file>' → URL` map. It runs `defaultTokenImagePath` against a
  `udt://` sentinel base and maps the result through `urls`, so the `OFFICIAL_*` tables stay the
  single source of truth instead of being duplicated per consumer. This is what in-repo apps use,
  because bundler-hashed filenames make the `${assetBaseUrl}${group}/${id}.png` convention
  impossible.
- **`assetBaseUrl` is NOT deprecated.** It remains the right path for external npm consumers who
  self-host the art at a stable directory, and every test still covers it.
- **3D models are a SEPARATE seam.** `resolveTokenImage` covers images only — the plugin resolves
  models via `defaultTokenModelPath(art, assetBaseUrl)`, and `resolveTokenModel` is not exposed
  through `BoardStageView`/`stageTower` at all. Dropping `assetBaseUrl` without also passing
  `tokenArt` silently degrades `markers/skull.glb` to a sprite billboard **with no error**. Pass
  `@udtc/assets`' `tokenArt` export alongside the resolver.
- All three public surfaces thread both options: `BoardRenderView`, `BoardStageView`, `stageTower`.

## The example is NOT typechecked

`tsconfig.json` has `exclude: [..., "example"]`, so `pnpm typecheck` never looks at
`example/**`. `pnpm build:example` (a Vite build) is the only gate on it — run it after touching
the demo, the Art Forge, the Token Designer, or the location-marker page.

`example/` is a **four-page** build (`vite.config.example.ts`): `index.html`, `tokens.html`
(Art Forge), `token-designer.html`, `location-marker.html`. Art changes usually touch more than
`main.ts`. The Forge's asset picker is served by `tokenArtDevPlugin` (`apply: 'serve'`, so
dev-only) and lists from `packages/assets/tokens` in **manifest format** (`./tokens/…`) —
that string is what gets saved to `<kind>_tokens.json`, so it must not be the hashed URL.
`resolveDemoPath` (exported from `example/src/tokenArt`) converts manifest path → bundled URL and
is applied **only** where a preview `src` is set, never to the input/save value.

## Coupling

Depends on `ultimatedarktowerdata` (`workspace:^`) for board/hero/monument data (v6 moved
this out of core). **Does not depend on `ultimatedarktower` at all** — board is
Bluetooth-free by design. Peer-depends on `ultimatedarktowerdisplay` (only for `./plugin`)
and `three`/`gsap`; `three` must be a single instance (pinned to display's exact range).
Consumed by `apps/digital` and `packages/creator-adapters`.
