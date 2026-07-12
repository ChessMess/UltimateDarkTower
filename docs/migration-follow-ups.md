# Migration Follow-Ups

Non-blocking items discovered during the monorepo consolidation and its
verification pass. **None of these are migration-caused regressions** — they are
pre-existing issues surfaced by the consolidated build/CI, plus cosmetic debt.
Recorded here so they can be reviewed and scheduled independently of the cutover.

Status legend: **OPEN** (needs work/decision) · **DONE** (fixed on the migration
branch) · **WONTFIX** (documented, intentionally left).

> **Deferred (2026-07-12):** the remaining code-cleanup item — **#1 board.png
> inlining** — is intentionally postponed to **after the cutover**. It is
> non-blocking and does not affect correctness of the shipped apps; scheduling it
> post-cutover keeps the migration branch stable for merge. (**#3 nested-ESLint
> crash** and **#4 ESLint violation debt**, previously deferred alongside it, were
> both resolved by PR #16 — see below.)

---

## 1. `board.png` is base64-inlined into the display library bundle — OPEN (deferred, post-cutover) ⚠️

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
