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

## 5. Core `game` demo inline `onClick` handlers are undefined at runtime — OPEN

**Severity:** low (demo not linked from the landing page) · **Package:**
`packages/core` (`examples/game`)

The game example's HTML uses inline `onclick="..."` attributes that call
functions living in the example's IIFE/module scope, so they resolve against
`window` and throw "not defined". Pre-existing; the game demo is built and
deployed at `/game/` but is not linked from the landing page. Fix by exposing
the handlers on `window` or switching to `addEventListener` wiring.

---

## 6. Missing `favicon.png` in core examples — OPEN

**Severity:** trivial (cosmetic 404) · **Package:** `packages/core` (examples)

The example HTML references a `favicon.png` that isn't shipped, producing a 404
in the controller/game/emulator pages. Add a favicon asset or drop the
reference.

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
