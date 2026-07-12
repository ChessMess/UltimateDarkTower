# Migration Follow-Ups

Non-blocking items discovered during the monorepo consolidation and its
verification pass. **None of these are migration-caused regressions** — they are
pre-existing issues surfaced by the consolidated build/CI, plus cosmetic debt.
Recorded here so they can be reviewed and scheduled independently of the cutover.

Status legend: **OPEN** (needs work/decision) · **DONE** (fixed on the migration
branch) · **WONTFIX** (documented, intentionally left).

---

## 1. `board.png` is base64-inlined into the display library bundle — OPEN ⚠️

**Severity:** high (published-package size) · **Package:** `packages/display`

`src/3d/GameBoardImageTexture.ts:2` does a default asset import:

```ts
import boardImageUrl from './assets/board.png';
```

Vite **library mode base64-inlines** default asset imports regardless of
`assetsInlineLimit: 0` (the same behavior the `emitOggsAsFiles()` plugin exists
to dodge for the `.ogg` files). The 21 MB `board.png` therefore becomes ~28 MB
of base64 in **both** `dist/index.esm.js` and `dist/index.cjs.js` — the bundle
is ~30 MB, almost entirely this one image. Every npm consumer downloads and
parses that base64 whether or not they use the default board texture.

**Proposed fix (mirrors the existing `tower.glb` handling):** stop importing the
PNG directly; emit it as a separate asset and reference it by URL — either via a
`copyBoardAsset()` closeBundle plugin like `copyTowerAsset()`, or the
`new URL('./assets/board.png', import.meta.url)` + `emitOggsAsFiles`-style
emit pattern, or make it consumer-supplied like `tower.glb`'s `modelUrl`.

**Decision needed:** this changes how consumers obtain the default board texture
(they'd need the emitted file served alongside, or to pass a URL), so it is a
deliberate API/behavior change, not a silent edit. Pick the approach before
implementing.

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

## 3. Per-package `pnpm run ci` lint crashes on a nested ESLint — OPEN

**Severity:** low (root gating CI unaffected) · **Package:** `packages/display`
(likely others with a nested `node_modules/eslint`)

Running `pnpm run ci` **inside** `packages/display` crashes at the `lint` step:

```
TypeError: Error while loading rule '@typescript-eslint/no-unused-expressions':
Cannot read properties of undefined (reading 'allowShortCircuit')
```

A package-local `eslint@8.57.1` gets loaded against the root's flat config +
`@typescript-eslint` v8, which is incompatible. The **root** `pnpm run ci`
(`validate:nodes → build → typecheck → test`, no lint) is green and unaffected,
so this does not gate the migration — but per-package `ci` is misleading.

**Proposed fix:** dedupe ESLint to a single root version (remove the nested
`eslint` from the offending packages' deps, or align versions), then re-enable
per-package lint. Ties into item 4.

---

## 4. Unified-ESLint violation debt — OPEN

**Severity:** low (lint is not in the gating CI path)

~149 violations under the unified root ESLint config (majority
`@typescript-eslint/no-explicit-any`). Lint intentionally does **not** gate CI
yet. Chip down incrementally, then consider adding `lint` to the root `ci` chain.

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
