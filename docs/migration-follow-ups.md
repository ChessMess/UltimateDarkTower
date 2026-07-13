# Migration Follow-Ups

Non-blocking items discovered during the monorepo consolidation and its
verification pass. **None of these are migration-caused regressions** — they are
pre-existing issues surfaced by the consolidated build/CI, plus cosmetic debt.
Recorded here so they can be reviewed and scheduled independently of the cutover.

Status legend: **OPEN** (needs work/decision) · **DONE** (fixed on the migration
branch) · **WONTFIX** (documented, intentionally left).

> **Update (2026-07-12):** all three previously-deferred code-cleanup items are
> now resolved — **#1 board.png inlining** (emit-as-file, non-breaking),
> **#3 nested-ESLint crash**, and **#4 ESLint violation debt** (both via PR #16).
> See each item below.

---

## 1. `board.png` is base64-inlined into the display library bundle — DONE ✅

**Severity:** high (published-package size) · **Package:** `packages/display`

`src/3d/GameBoardImageTexture.ts` did a default asset import
(`import boardImageUrl from './assets/board.png'`). Vite **library mode
base64-inlines** default asset imports regardless of `assetsInlineLimit: 0` (the
same behavior the emit plugin exists to dodge for the `.ogg` files). The 21 MB
`board.png` therefore became ~28 MB of base64 in **both** `dist/index.esm.js`
and `dist/index.cjs.js` — each bundle was ~30 MB, almost entirely this one image.

**Fix (chosen approach: emit-as-file, non-breaking — mirrors the `.ogg`
handling):** the source now references the PNG via
`new URL('./assets/board.png', import.meta.url)`, and the generalized
`emitAssetsAsFiles()` build plugin (was `emitOggsAsFiles()`) intercepts that
expression and emits the PNG as a standalone file at `dist/3d/assets/board.png`
(beside the copied `tower.glb`). Result: **both bundles dropped ~30 MB → ~1.1 MB**,
zero base64 image bytes remain, and the CJS bundle uses a `pathToFileURL`
reference (no raw `import.meta`). **No consumer API/behavior change** — the
default `boardDisc.source: 'image'` still loads the real board art out of the box
(esbuild/webpack/Rollup/Parcel each re-emit the asset), and it can now also be
self-hosted directly from the package.

Two follow-on fixes this required:

- The pure `getBoardTextureRotation` math moved to a new `boardTextureRotation`
  module so tests can import it where Jest's CJS transform can't parse
  `import.meta`; `GameBoardImageTexture` (now `import.meta`-bearing) is stubbed in
  `jest.config.cjs` like the audio modules.
- Fixed a **pre-existing, local** Jest breakage surfaced while verifying: the
  hoisted `node_modules` had a stray `signal-exit@4` nested under
  `write-file-atomic@4.0.2` (which needs v3), crashing every suite with
  `onExit is not a function` before any test ran. Removed the stray nested copy so
  it falls back to the correct root `signal-exit@3.0.7` (matches the lockfile;
  a clean install was never affected). Jest is green across core/board/display
  again.

---

## 2. Bundled `.ogg` files not all emitted by the display lib build — DONE ✅

**Package:** `packages/display` · Fixed in `fix(display): emit all 115 bundled
.ogg as files, not just single-line refs`.

`emitOggsAsFiles()`'s regex required `)` immediately followed by `.href`, but
Prettier line-wraps the longer `audioLibrary.ts` entries, so 23 of 115 fell
through and were base64-inlined. Widened the regex to tolerate an optional
trailing comma before `)` and whitespace before `.href`. Library build now emits
all 115 `.ogg` as files (was 92); zero audio base64 remains in the bundle.

---

## 3. Per-package `pnpm run ci` lint crashes on a nested ESLint — DONE ✅

**Severity:** low (root gating CI unaffected) · **Package:** `packages/display`
(and others with a nested `node_modules/eslint`) · Fixed in PR #16 (`c19ae6d`,
`fix(lint): unbreak monorepo ESLint and clear surfaced findings`).

Running `pnpm run ci` **inside** `packages/display` used to crash at the `lint`
step:

```
TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions':
Cannot read properties of undefined (reading 'allowShortCircuit')
```

`core`, `board`, `display`, and `apps/seed` each still declared their own
`eslint@8` + `@typescript-eslint` v8 devDeps, which pnpm nested and which shadowed
the workspace's shared ESLint 9 flat config; the v8 plugin's rules then crashed
against the v9 API.

**Fix (the proposed dedupe):** removed the stale `eslint`/`@typescript-eslint`
devDeps from those four packages so every package inherits the single hoisted root
ESLint 9 (as the `creator-*` packages already did). Verified: no nested
`node_modules/eslint` remains; `eslint .` exits 0 in `packages/display` and
`packages/core`; `pnpm -r lint` is green across the workspace (one non-blocking
`react-refresh` warning in `apps/creator` remains, unrelated to this item).

---

## 4. Unified-ESLint violation debt — DONE ✅

**Severity:** low (lint is not in the gating CI path) · Fixed in PR #16
(`c19ae6d`), alongside item 3.

The ~149 violations surfaced once the crash in item 3 was cleared (150 in `core`
alone) were fixed properly rather than suppressed: annotated the intentional lazy
`require()` calls, dropped now-redundant `@ts-ignore`/`eslint-disable` directives,
rewrote short-circuit debug logging as `if`, typed test mock callbacks, and
cleaned up the examples. `@typescript-eslint/no-explicit-any` was relaxed for
`**/examples/**` only (demo/reference code, not shipped source). `pnpm -r lint`
now exits 0. Lint still does **not** gate the root `ci` chain — adding it remains
an optional future step.

---

## 5. Core `game` demo handlers were undefined at runtime — DONE ✅

**Package:** `packages/core` (`examples/game`) · Fixed in `fix(core): expose
TowerGame handlers on window; point example favicons at rtdtlogo`.

`TowerGame.js` is bundled as an IIFE, so the example's top-level functions
weren't global — the six functions the HTML calls (`startGame`, `glyphClick`,
`challengeTower` via inline `onclick=`, plus `setDifficultyNormal`,
`populateSelections`, `resetScore` from the trailing on-load `<script>`) all
threw "not defined". Exposed all six via `(window as any).fn = fn` at the end of
`TowerGame.ts`, mirroring the controller example's pattern. Browser-verified:
zero console errors on load, all six live on `window`, `startGame()` runs clean.

---

## 6. Missing `favicon.png` in core examples — DONE ✅

**Package:** `packages/core` (examples) · Fixed alongside item 5.

`TowerController.html` and `TowerGame.html` referenced a same-dir `favicon.png`
that isn't shipped (404). Repointed both to the existing 512×512
`../assets/rtdtlogo.png`, which matches the `../assets/` convention already used
for the shared background/fonts/style and ships in `dist/examples/assets/`
(and at the deployed site root). Browser-verified 200. (`TowerEmulator.html` has
no favicon reference — nothing to fix there.)

---

## 7. Historical / PRD docs still name the old repos — WONTFIX (by default)

**Severity:** trivial · Various `docs/history/**`, PRD suites

Archived history and product docs still refer to the old standalone repo names
(e.g. `UltimateDarkTowerDisplay`). These are historical records; the
consumer-facing READMEs and cross-links were already repointed during the
migration. Left as-is unless a specific doc is promoted to current guidance.

---

_Cutover steps (push/merge to main, Pages flip, npm Trusted Publishing, archive
old repos) are tracked separately and are user-driven — not part of this list._
