# packages/display (`ultimatedarktowerdisplay`) — renderers

Text / 2D / 3D renderers for tower state. This is the **visual layer only**: it does not
open BLE or build `TowerState` — the consumer owns that and calls `applyState(state)`.
Depth in `docs/` (`RENDERERS.md`, `SCENE_PLUGINS.md`, `SEQUENCE_AUTHORING.md`, `AUDIO.md`,
`PHYSICS.md`, `TROUBLESHOOTING.md`).

## Extension seam

- **`ScenePlugin` (`docs/SCENE_PLUGINS.md`)** is how you add 3D content. Plugin callbacks
  are try/catch-wrapped by the view. `attach()` runs before the model may be loaded
  (`ctx.isModelLoaded()` false) — defer model-dependent setup to `onModelLoaded`, **except**
  camera framing, which must happen in `attach()` or the default framing flashes first.
- Custom `.glb` models must contain named nodes `drum_top`/`drum_middle`/`drum_bottom`
  and 12 `seal_<side>_<level>` nodes (lowercase). Missing names silently no-op with one
  console warning.

## Build & test gotchas

- `build` = `vite build && tsc --emitDeclarationOnly` (Vite bundles; tsc only emits `.d.ts`).
- **Tests are vitest** (`vitest.config.ts`), split into two `test.projects`: `unit`
  (jsdom, mocks `three`/`gsap`/assets) and `snapshots` (jsdom, **real gsap** so tweens
  actually advance; targets `tests/sequenceSnapshots/`, a per-tick per-LED parity check
  within 1/255 PWM tolerance). This is the direct replacement for the old two-jest-config
  setup (`jest.config.cjs` + `jest.config.snapshots.cjs`, which filtered `^gsap$` out of
  a shared `moduleNameMapper`) — one `vitest run` now covers both.
- **Verify the project split stays real, not collapsed**: if `snapshots` ever picks up
  the `gsap` alias by mistake, `tl.totalTime(t)` never advances and every parity
  assertion compares mocked-zero to mocked-zero and passes without checking anything.
  Sanity check: corrupt one byte in a `.snap.json` baseline and confirm `vitest run
--project snapshots` fails.
- **`resolve.alias` does not work for `?raw`/`?url` asset specifiers.** Verified directly:
  Vite's `vite:import-analysis` plugin resolves these before `resolve.alias` is
  consulted, so an alias for `\.svg\?raw$` throws "Failed to resolve import" instead of
  redirecting. `vi.mock()` on the exact specifier does work and is what
  `TowerSideView.test.ts` uses for its two `.svg?raw` imports — this is the mechanism for
  any future asset-with-query mock, not `resolve.alias`. `.glb`/`.png` aliases were
  removed rather than fixed: nothing in `src` statically imports either.
- **`vi.fn()` requires a `function`/`class` implementation to be constructible with
  `new`** — an arrow-function implementation throws "is not a constructor". Jest
  tolerated arrow implementations for its mock constructors (e.g. mocking
  `globalThis.AudioContext`); vitest does not, including on later `mockImplementation()`/
  `mockImplementationOnce()` overrides of the same mock. See `TowerSampleAudio.test.ts`
  and `DrumRotationAudio.test.ts`'s `ContextSpy`.
- **Ambient globals (`describe`/`it`/`vi`/…) come from `vitest.config.ts`'s
  `globals: true`.** Per-file environment overrides use `// @vitest-environment <name>`
  (a comment, not a docblock) — the direct replacement for jest's `@jest-environment`
  pragma; `TowerStateController.test.ts` uses `node` (project default is `jsdom`).
- **Test files are typechecked by nothing.** `tsconfig.json` excludes `tests/`, same as
  before — under jest, ts-jest typechecked them anyway (with a loosened inline
  `tsconfig` override, dropped along with `jest.config.cjs`) as a side effect of
  transformation; vitest transforms with esbuild and does not typecheck. This was never
  a wired CI gate either way.
- **Regenerating snapshot baselines**: `test:sequence-snapshots` is read/verify mode
  (`vitest run --project snapshots`); `record-sequence-snapshots` is write mode
  (`UPDATE_SNAPSHOTS=1` gate in `parity.test.ts`, then `prettier --write`). Baselines are
  the frozen golden contract — regenerate only on an intentional sequence change and
  review the diff. The `.snap.json` files stay prettier-managed (not `.prettierignore`d).
  Note: these are hand-rolled JSON fixtures read/written via `fs`, not vitest's own
  `toMatchSnapshot()` mechanism — `jest.unmock('gsap')`, which used to sit at the top of
  `parity.test.ts`, was already inert under jest too (`unmock` affects the module
  registry; the alias that mocked gsap operated on resolution) and has been removed
  rather than translated to `vi.unmock`.
- **The asset bytes live in `@udtc/assets`, not here.** All 115 `.ogg`, `board.png` and
  `tower.glb` moved to `packages/assets/` when the game art was centralized; this package
  keeps only `src/3d/assets/skull_{1,2}.glb`, which the example's physics dropdown globs and
  which is never shipped. `@udtc/assets` is a **devDependency** — it is `private: true` and
  fully inlined, so as a `dependency` the published tarball would carry an unresolvable dep.
  (`skull_1.glb` is byte-identical to `@udtc/assets`' `tokens/markers/skull.glb` and was left
  duplicated on purpose: there is no asset tree-shaking, so importing it from `/tokens` would
  drag all 39 MB of token art into the example build, and moving it into `/models` would push
  632 KB onto `apps/controller`, which has no skull. 632 KB in an unpublished example beats
  either.)
- **Adding a bundled asset requires its module path to be in `URL_ASSET_HOSTS` in
  `vite.config.ts`** — the custom `emitAssetsAsFiles()` Rollup plugin intercepts
  `new URL('<relative>', import.meta.url)` to force separate-file emission; otherwise Vite
  base64-inlines it and balloons the bundle (113 `.ogg` files ≈ 41 MB). The two entries now
  point **into `@udtc/assets`** (`/assets/src/audio/index.ts`, `/assets/src/audio/effects.ts`);
  `id.endsWith()` still matches because pnpm's symlink is realpathed before `transform` runs.
  The regex captures the whole relative specifier and resolves it against the module's own
  directory, so the assets package keeps its top-level `<kind>/` layout — there is no longer a
  `<module>/assets/` convention to mirror.
- **`scripts/check-dist-size.mjs` runs as part of `build` and is not optional.** Base64
  inlining is a completely silent failure: the build _succeeds_, emits 11 MB bundles and 2
  `.ogg` instead of 115, and says nothing. Verified by deleting a `URL_ASSET_HOSTS` entry —
  the build stayed green and only this script caught it. Adding sounds means bumping its
  `EXPECTED_OGG`.
- **`audioLibrary.ts` is one half of a split.** It owns sample id → filename;
  `@udtc/assets/audio` owns filename → URL, keyed by filename so the art package needs no
  dependency on `ultimatedarktower` (where the id enum lives). `scripts/extract-audio.mjs`
  regenerates **both** files in one run — regenerating one alone makes `audioLibrary.ts` throw
  at import time on a filename the art package no longer ships.
- **The audio URL table must not become an `import.meta.glob`.** Verified directly: under
  Vite's _library_ mode a glob resolves to a static, base-less string (`/Adversary_Ashstrider_01.ogg`),
  whereas the per-file `new URL(literal, import.meta.url)` shape survives into the bundle and
  stays relative to the chunk at runtime — which is what lets each consuming app's own bundler
  re-detect and re-emit the files. The glob form is correct for _apps_ (`@udtc/assets/tokens`
  uses it) and wrong for a published library.
- **`board.png` is NOT bundled and NOT in `URL_ASSET_HOSTS`.** The board art is
  consumer-supplied via `TowerDisplayOptions.boardTextureUrl` (mirroring `modelUrl` for the
  tower GLB), because Vite emits assets from the _transform_ hook — before tree-shaking — so a
  static `new URL` forced the 22 MB PNG into every downstream app's `dist/` whether it rendered
  a board or not (~85 MB across the deployed site). `copyStaticAssets()` still ships it to
  `dist/3d/assets/board.png`, exactly as it does for `tower.glb`. With no
  `boardTextureUrl`, `boardDisc.source: 'image'` silently means procedural — there is nothing
  bundled to load. Don't "restore" the static import.
- **`boardTextureUrl` threads through THREE options types**, not one: `TowerRenderViewOptions`
  → `TowerDisplayOptions` → `Tower3DViewOptions` → `GroundDiscManager`. Missing the
  `TowerRenderView` layer is a typecheck error, not a silent break — `apps/controller` uses it.
- **The CJS entry points must keep a bare `.cjs` extension** (`dist/index.cjs`,
  `dist/physics.cjs`), not `.cjs.js` — under this package's `"type":"module"`, a plain
  `.js` file is treated as ESM regardless of its actual CommonJS content, which used to
  make `require('ultimatedarktowerdisplay')` throw `ReferenceError: exports is not
defined in ES module scope` (fixed; matches `packages/board`'s existing `.cjs`
  convention). Separately, a `renderChunk` hook patches rolldown's `{}.url` codegen →
  a `pathToFileURL` shim for `import.meta.url` references in the CJS output — an
  unrelated fix, still required. `pnpm test:cjs-smoke` (wired into CI) guards both.
- `/physics` is an isolated subpath (its own Vite entry) so `@dimforge/rapier3d-compat`
  WASM stays out of consumers who don't import it. Draco decoder defaults to a gstatic CDN
  — breaks under strict CSP unless self-hosted via `dracoDecoderPath`.

## Coupling

Dev-depends on `@udtc/assets` (all bundled art/audio bytes); depends on
`ultimatedarktowerdata` (`workspace:^`); peer-depends on `ultimatedarktower`
(for `TowerState` types), `three`, `gsap`, `@dimforge/rapier3d-compat` (all consumer-supplied).
Consumed by `packages/board`'s `./plugin` entry. The `files` allowlist ships `dist`, `docs`,
and README/LICENSE/CHANGELOG — this file is not in the tarball.
