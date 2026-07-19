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
- **`test` runs two jest configs**: `jest.config.cjs` (jsdom, mocks `three`/`gsap`/assets)
  then `jest.config.snapshots.cjs` (**unmocks gsap** so tweens actually advance; targets
  `tests/sequenceSnapshots/`, a per-tick per-LED parity check within 1/255 PWM tolerance).
- **The doc-referenced `record-sequence-snapshots` script does not exist** — only
  `test:sequence-snapshots` (read/verify mode) is defined. Regenerating baselines per the
  doc comment will fail on a missing script.
- **Adding a bundled asset requires adding its module path to `URL_ASSET_HOSTS` in
  `vite.config.ts`** — the custom `emitAssetsAsFiles()` Rollup plugin intercepts
  `new URL('./assets/…', import.meta.url)` to force separate-file emission; otherwise Vite
  base64-inlines it and balloons the bundle (113 `.ogg` files + a 21 MB `board.png`).
- **The shipped CJS build (`*.cjs.js`) is known-broken** under `"type":"module"` (Node
  treats `.cjs.js` as ESM). A `renderChunk` hook patches `{}.url` → a `pathToFileURL` shim,
  but consumers should prefer the ESM build. `packages/board` deliberately ships `.cjs`
  (not `.cjs.js`) to avoid repeating this.
- `/physics` is an isolated subpath (its own Vite entry) so `@dimforge/rapier3d-compat`
  WASM stays out of consumers who don't import it. Draco decoder defaults to a gstatic CDN
  — breaks under strict CSP unless self-hosted via `dracoDecoderPath`.

## Coupling

Depends on `ultimatedarktowerdata` (`workspace:*`); peer-depends on `ultimatedarktower`
(for `TowerState` types), `three`, `gsap`, `@dimforge/rapier3d-compat` (all consumer-supplied).
Consumed by `packages/board`'s `./plugin` entry. The `files` allowlist ships `dist`, `docs`,
and README/LICENSE/CHANGELOG — this file is not in the tarball.
