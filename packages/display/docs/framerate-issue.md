# Framerate Issue — 3D Renderer Performance Cliff

> **Status: RESOLVED — 2026-05-22 (with follow-up fix same day).**
> **Initial root cause:** per-frame `light.visible` toggling caused ~880 ms shader-recompile stalls on every LED-sequence transition. First fix held all 36 LED `PointLight`s `visible: true` for the scene's lifetime.
> **Side effect found in follow-up:** the first fix introduced sustained per-fragment cost from 36 always-active `PointLight`s at idle — measured ~66 ms / frame at 7.84 M backing pixels (the user's typical Retina full-window layout).
> **Final fix (§17):** pre-warm both program variants (0-lights and 36-lights) at scene init, then bulk-toggle visibility on any-LED-active / all-dark transitions. Idle: 120 fps with 0 active lights; sequences: 36 active lights with no transition stall (cached programs).
> Verified in Playwright on the Controller's Tower Emulator: idle restored to v-sync cap; first sequence p95 = 9.4 ms (no stall); programs count grows by +3 once then stays stable.
> A secondary fix (bloom render-target `resolutionScale: 0.5`) also shipped — helps on ≥4 M-pixel canvases but was not the primary bug.

This doc is the canonical record of the investigation, the fix, and the diagnostic API. Read §1–§4 if you just want to know what was wrong and how it was fixed. Read §5 if you need to diagnose a future perf issue. Read §7–§8 if you need historical context (e.g. to understand why the fix doesn't include more changes, or why earlier attempts were reverted).

---

## Contents

- [1. Resolution Summary](#1-resolution-summary)
- [2. How to Verify the Fix](#2-how-to-verify-the-fix)
- [3. The Bug — Root Cause](#3-the-bug--root-cause)
- [4. The Fix — Code Changes](#4-the-fix--code-changes)
- [5. Diagnostic API: `collectPerfReport`](#5-diagnostic-api-collectperfreport)
- [6. Repositories Involved](#6-repositories-involved)
- [7. Verification Evidence (before / after)](#7-verification-evidence-before--after)
- [8. Historical Investigation — Dead Ends and Lessons](#8-historical-investigation--dead-ends-and-lessons)
- [9. Status of Earlier Proposals](#9-status-of-earlier-proposals)
- [10. Cleanup Status](#10-cleanup-status)
- [11. Reference Material](#11-reference-material)
- [12. Final Verification Checklist](#12-final-verification-checklist)
- [13. Follow-up Fix — Bulk Lights Gate + Prewarm (2026-05-22 PM)](#13-follow-up-fix--bulk-lights-gate--prewarm-2026-05-22-pm)
- [14. Pop-out Window Perf — Open Investigation (unresolved, 2026-05-22)](#14-pop-out-window-perf--open-investigation-unresolved-2026-05-22)

---

## 1. Resolution Summary

**What the user saw:** During heavy LED sequences (`angryStrobe01`, `flareThenFlicker`) the 3D renderer in the Controller's Tower Emulator dropped from ~120 fps to ~13 fps. Initial diagnosis suspected bloom postprocessing and the count of active point lights — both turned out to be wrong.

**Real cause:** When an LED sequence triggered, up to 36 `PointLight`s (24 LED reds + 12 seal accent lights) flipped `visible: false → true` simultaneously. Three.js's shader-program cache key includes the active lights count, so every material that responds to lighting had to recompile its shader. Recompilation runs synchronously on the main thread; with ~20 programs needing it, that produced a **~880 ms one-frame stall** on every sequence start, and again on every sequence end. The median frame time stayed at 8.3 ms — fps collapsed entirely because of 1–2 catastrophic stall frames per sample window.

**Real fix:** All 36 LED-related lights are now created `visible: true` at scene construction and stay that way for the scene's lifetime. The animator drives only `intensity`. An intensity-0 light contributes nothing visually but keeps the lights-count hash constant, so the shader program cache stays hit across every transition.

**Diagnostic tool added (and used to find this):** `collectPerfReport(durationMs)` — a debug API on `TowerRenderView` / `TowerDisplay` / `Tower3DView` that records frame intervals, BloomManager sub-step timings, draw-call totals, **shader-program count**, and scene visibility state into a structured JSON blob. See §5.

**Secondary fix kept:** Bloom now renders at `resolutionScale: 0.5` of the canvas backing buffer by default. Doesn't address the real bug, but is a free 2× GPU-cost reduction on ≥4 M-pixel canvases (Retina full-window setups). See [src/3d/BloomManager.ts](../src/3d/BloomManager.ts).

---

## 2. How to Verify the Fix

The fix is fully shipped in the Display package's `dist/` and pulled in by the Controller's `examples/dist/`. Both built copies are current.

### 2.1 Quickest test (your browser, no code edits)

1. Open the Controller's Tower Emulator at your usual URL (`http://localhost:8080/controller/TowerEmulator` if you've still got the dev server running).
2. Open DevTools console.
3. Paste this and watch the fps line:
   ```js
   window.postMessage({ type: 'playSequence', sequenceId: 5 }, '*'); // angryStrobe01
   let n=0,t=performance.now();
   (function tick(){ n++; performance.now()-t<3000 ? requestAnimationFrame(tick) : console.log('fps:', (n/3).toFixed(1)); })();
   ```
   You should see fps at your monitor's refresh cap (60 / 120 / 144), not 13.

4. Repeat with `flareThenFlicker` (`sequenceId: 4`).

### 2.2 If you want the structured perf report

If raw fps doesn't match expectations, capture the full breakdown for me with `collectPerfReport`. One-line edit to expose the display, then a console snippet. Full recipe in §5.2.

### 2.3 If the cliff is still present on your machine

That would mean either (a) your dist isn't current (rebuild it: `cd UltimateDarkTowerDisplay && npm run build` then `cd UltimateDarkTower && node build-examples.js`), or (b) there's a different perf issue specific to your hardware that the synthetic Playwright run didn't surface. Capture a `collectPerfReport` and share — §5.3 tells you how to read it.

---

## 3. The Bug — Root Cause

Three.js builds a per-program cache key that includes the active-light counts (see [WebGLLights.js:442-451](../node_modules/three/src/renderers/webgl/WebGLLights.js#L442-L451)). The relevant fields:

```
hash: {
  directionalLength, pointLength, spotLength, rectAreaLength, hemiLength,
  numDirectionalShadows, numPointShadows, numSpotShadows, numSpotMaps,
  numLightProbes,
}
```

When this hash changes, every material in the scene that interacts with lights must recompile its shader program. Recompilation is **synchronous on the main thread** — typical cost ~40 ms per program on modern hardware.

In `BloomManager.darkenNonBloom`, the bloom-pass scene render swaps every non-bloom-layer mesh to a `MeshBasicMaterial` (unaffected by lights), but the `finalComposer`'s scene render uses the original lit materials — and those are what get recompiled.

The display's LED system created 36 `PointLight`s:
- 24 in [Tower3DView.ts:927-1040](../src/3d/Tower3DView.ts#L927-L1040) `buildLeds` — one per LED slot.
- 12 in [SealManager.ts:140-148](../src/3d/SealManager.ts#L140-L148) `buildSealBacklights` — atmospheric accents for the seal cutouts.

All 36 were created `visible: false`. The `LedEffectAnimator.writeLed` and `SealManager.setSealLed` paths toggled `visible = on` per-frame based on whether the LED's intensity exceeded a 0.001 threshold. So whenever a sequence started, up to 36 lights flipped to visible at once → hash changed → ~20 materials recompiled → ~800 ms main-thread stall. Same again when the sequence ended.

Measured directly via `collectPerfReport` (§7): `programs` count grew 15 → 35 → 86 → 107 across successive sequence transitions; `frameMs.max` spiked to 883 ms each time. On a slower GPU than the Playwright test machine, the stall would be proportionally longer.

---

## 4. The Fix — Code Changes

> ⚠️ **§4 below documents the FIRST fix.** A follow-up in §13 supplements it with a bulk-lights gate + prewarm to also restore idle perf. The shipped code is §4 + §13 together. Read §13 for the current full picture.

Three files, ~10 lines, no API change, no default change, no visual change.

### 4.1 [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts)

`buildLeds` — change initial `visible = false` to `visible = true`:

```ts
const redLight = new THREE.PointLight(red.color, 0, redHaloDistance, 2);
redLight.visible = true; // was: false. See docs/framerate-issue.md.
redLight.position.set(redPos.x, redPos.y, redPos.z);
```

`applyLightingToScene` — remove the per-frame `visible` write:

```ts
ref.redLight.intensity = ref.driver.v * lighting.leds.red.maxHalo;
// removed: ref.redLight.visible = ref.driver.v > 0.001;
```

### 4.2 [src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts)

`writeLed` — remove the per-frame `visible` write:

```ts
redLight.intensity = driver.v * red.maxHalo;
// removed: redLight.visible = driver.v > 0.001;
```

### 4.3 [src/3d/SealManager.ts](../src/3d/SealManager.ts)

`buildSealBacklights` — set `visible` from config at construction:

```ts
const light = new THREE.PointLight(...);
light.visible = cfg.accentLight; // was: false (toggled per-frame later).
```

`setSealLed` accent branch — drive only intensity:

```ts
if (cfg.accentLight) {
  ref.light.intensity = driverV * cfg.intensity;
  // removed: ref.light.visible = on;
}
```

`updateLighting` — re-sync `visible` on config changes (the only place outside construction where it flips):

```ts
ref.light.visible = cfg.enabled && cfg.accentLight;
```

### 4.4 Why this works

All 36 lights are now `visible: true` for the entire scene lifetime. Their `intensity` is animated from 0 to peak by the existing `LedEffectAnimator` / `SealManager` paths. Three.js still iterates each light in the fragment shader, but:
- An intensity-0 light contributes `color × 0 = 0` per-fragment — visually nothing.
- The lights-count hash never changes, so the shader program cache stays hit across every sequence transition.
- The per-frame iteration cost of N lights with intensity 0 is much smaller than one ~800 ms recompile stall.

### 4.5 Why this doesn't include the default flips from "Hypothesis A"

The first implementation of this fix (see §8.2) also changed the lighting defaults — turning off LED red lights and seal accent lights entirely. That change was reverted because (a) it removed the drum-interior atmospheric red spill (visual regression), and (b) there's no perf benefit on top of the visible-toggle removal alone. The lights are cheap when their intensity is 0; what's expensive is changing the count.

---

## 5. Diagnostic API: `collectPerfReport`

Shipped on `Tower3DView`, `TowerDisplay`, and `TowerRenderView`. Diagnostic-only — no production overhead unless called. Returns a structured `PerfReport` (exported as a type from the package root, along with `PerfStat` and `BloomFrameMetrics`).

### 5.1 What it measures

| Field | Meaning |
|---|---|
| `fps` | Computed from rAF tick count / window duration |
| `frameMs.median / .p95 / .max` | rAF interval — **canonical ground truth** for frame time (CPU + GPU + browser composite) |
| `bloomTotalMs.median / .max` etc. | CPU-side wall time of each `BloomManager.render()` sub-step (darken / bloomComposer / restore / finalComposer). CPU dispatch only — GPU work is async. Only present when bloom is enabled. |
| `drawCalls.median / .max` | Per-frame totals across ALL `renderer.render()` calls (`autoReset` temporarily disabled during the report) |
| `triangles.median / .max` | Same, but triangles |
| `programs` | Snapshot of `renderer.info.programs.length` at the end of the window. **If this grows between samples, shader recompiles are happening.** |
| `scene.{visibleBloomMeshes, visibleNonBloomMeshes, visibleSprites, visiblePointLights, totalMeshes}` | End-of-window scene state |
| `drivers.ledsActive` | LEDs with `driver.v > 0.001` |
| `canvas.{cssW, cssH, bufW, bufH, pixelRatio}` | End-of-window canvas dimensions |

### 5.2 How to use it (recipe)

The Display example app already exposes `window.display`. For the Controller's TowerEmulator (which doesn't), add one diagnostic line in [examples/controller/TowerEmulator.ts](../../UltimateDarkTower/examples/controller/TowerEmulator.ts) right after the `display = new TowerRenderView(...)` constructor:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).display = display;
```

Rebuild: `cd UltimateDarkTower && node build-examples.js`. Reload the Emulator page. Then in DevTools console:

```js
// IDLE baseline
window.display.showIdle?.();
await new Promise(r => setTimeout(r, 800));
const idle = await display.collectPerfReport(3000);
console.log('IDLE:', JSON.stringify(idle, null, 2));
```

```js
// DURING the slow sequence
window.postMessage({ type: 'playSequence', sequenceId: 5 }, '*');
await new Promise(r => setTimeout(r, 500));
const seq = await display.collectPerfReport(3000);
console.log('SEQUENCE:', JSON.stringify(seq, null, 2));
```

**Always capture both idle and sequence.** The delta is what isolates sequence-incurred cost from steady-state cost.

Remember to revert the `(window as any).display = display;` line and rebuild when you're done.

### 5.3 How to read the output (decision tree)

1. **`programs` grew between idle and sequence?** → shader recompiles are happening. The fix in §4 should prevent this. If still happening, look for other state changes during sequences that change the lights-count hash.
2. **`frameMs.max ≫ frameMs.median`?** → one-shot stalls. Compare with `programs` growth (#1) — typically the same cause.
3. **`frameMs.median` high (≥16 ms) but `frameMs.max` close to median?** → sustained per-frame cost. Check `bloomTotalMs.median` vs `frameMs.median`: if `bloom ≈ frame`, bloom is the bottleneck (lower `resolutionScale`). If `bloom ≪ frame`, look at `drawCalls`, `triangles`, or non-Three.js cost (GSAP, DOM, audio).
4. **`drawCalls` jumps significantly under sequence?** → more meshes being drawn. Check `scene.visibleBloomMeshes` and `visibleSprites` for additive-blending overdraw concerns.

### 5.4 Caveats

- **CPU-side only.** `performance.now()` around composer.render() measures the CPU command-dispatch time, not GPU execution. WebGL drivers may run work asynchronously. For end-to-end GPU timing, monkey-patch with `gl.finish()` before/after — but only as a debug technique, never in production.
- **rAF interval is the truth.** `frameMs` includes both CPU and GPU because the next rAF only fires after the previous frame has actually been composited. Use this as the primary signal; sub-step timings are suggestive but not authoritative.
- **First frame is trimmed.** The report drops the first rAF sample of each series because the gap from report-start to first tick is often a partial frame.
- **Bloom disabled.** When `lighting.scene.bloom.enabled: false`, the bloom fields are absent from the report.

---

## 6. Repositories Involved

### 6.1 UltimateDarkTowerDisplay (this repo)

- **Path:** `/Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay`
- **Role:** npm package `ultimatedarktowerdisplay`. Owns the Three.js renderer, BloomManager, all LED visuals, and `collectPerfReport`.
- **Key files for this issue:** [Tower3DView.ts](../src/3d/Tower3DView.ts), [BloomManager.ts](../src/3d/BloomManager.ts), [LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts), [SealManager.ts](../src/3d/SealManager.ts), [LightingResolver.ts](../src/3d/LightingResolver.ts).
- **Example app:** `npm run dev` → http://localhost:5173 (or next free port). **Sidebar layout constrains canvas to ~600 × 600** — too small for several GPU-bound effects to manifest. Tests there can miss issues that surface in the Controller's full-window layout.

### 6.2 UltimateDarkTower (BLE library + Controller example)

- **Path:** `/Users/wopr/Documents/GitHub/UltimateDarkTower`
- **Role:** BLE Tower library plus example apps. The `controller` example imports `ultimatedarktowerdisplay` (via `file:..` symlink dep) for the emulator window.
- **Symlink:** `node_modules/ultimatedarktowerdisplay` → `../../../UltimateDarkTowerDisplay`. Imports resolve to the **built dist/** of the Display package — dist must be rebuilt with `npm run build` for Display-side changes to be visible.
- **Key file:** [examples/controller/TowerEmulator.ts](../../UltimateDarkTower/examples/controller/TowerEmulator.ts) — instantiates `TowerRenderView` with `audio: { bindSequenceToSample: true }`, gives the canvas the **full window** (no sidebar). This is where the user's reported cliff manifested.
- **Dev server:** `npm run dev` (= `tsc -watch`) compiles the library. Examples have a separate build: `node build-examples.js`. **`tsc -watch` does not recompile the examples** — edit-then-rebuild explicitly. Static server at port 8080 serves `dist/examples/`.
- **URL:** http://localhost:8080/controller/TowerEmulator

---

## 7. Verification Evidence (before / after)

All captures via `collectPerfReport(3000)` on the Controller's Tower Emulator, canvas ~1252 × 871 CSS / 1800 × 1746 backing (~3 M pixels), Playwright headed Chromium on Apple Silicon. Same harness, three transitions captured: IDLE → SEQUENCE 1 → idle gap → SEQUENCE 2.

### Pre-fix (the smoking gun)

| Metric | Idle | Sequence 1 | After Seq 1 (idle) | Sequence 2 |
|---|---:|---:|---:|---:|
| `fps` | 120 | 79.1 | — | 88.9 |
| `frameMs.median` | 8.3 | 8.3 | — | 8.3 |
| **`frameMs.max`** | **9.4** | **883.4** | — | **883.3** |
| `bloomTotalMs.max` | 3.8 | 123.2 | — | — |
| **`programs`** | **15** | **35** | **86** | **107** |
| `visiblePointLights` | 0 | 36 | — | 36 |

Programs grew on every transition (start AND end). The stall happened every time, not just once. Median frame time barely moved — fps collapsed because of 1–2 stall frames per 3-second window.

### Post-fix (visible-toggle removed)

| Metric | Idle | Sequence 1 | After Seq 1 (idle) | Sequence 2 |
|---|---:|---:|---:|---:|
| `fps` | **120** | **120.0** | — | **120.1** |
| `frameMs.median` | 8.4 | 8.4 | — | 8.4 |
| **`frameMs.max`** | **9.4** | **9.4** | — | **9.6** |
| `bloomTotalMs.max` | 3.0 | 3.6 | — | 3.0 |
| **`programs`** | **15** | **17** | — | **17 (stable)** |
| `visiblePointLights` | 36 | 36 | 36 | 36 |

Programs grew by exactly **+2** when the first sequence triggered (cached three.js material variants for newly visible bloom-layer meshes — a one-time cost) and **never grew again** on any subsequent transition. Frame max stays within v-sync interval.

---

## 8. Historical Investigation — Dead Ends and Lessons

This section is preserved so a future LLM session knows what was tried, what was rejected, and **why** — so the same dead ends are not chased again. Skip if you only need the resolution.

### 8.1 Investigation timeline

| Date | Event |
|---|---|
| pre-2026-05-20 | User reports "many LEDs on = laggy" — first attributed to per-light fragment cost. |
| 2026-05-20 | Hypothesis A implemented: remove LED PointLights by default, also remove visible-toggle. User tested, reported 13 fps post-fix vs 20 fps stash — fix appeared to make things slightly worse (noise at small canvas). |
| 2026-05-20 | Bloom `resolutionScale: 0.5` shipped as separate fix. Validated against three.js docs. |
| 2026-05-21 | User clarified: Display example fps is FINE; bad fps is in the Controller's Tower Emulator. Canvas size delta noted. |
| 2026-05-21 | Playwright instrumentation. CPU-side bloom timing showed bloom was cheap — couldn't find a bottleneck. |
| 2026-05-21 | Hypothesis A reverted (defaults restored, visible-toggle restored) because no evidence it helped. |
| 2026-05-21 | `collectPerfReport` debug API designed and shipped. |
| 2026-05-21 | First `collectPerfReport` run on the Controller: **`programs: 15 → 35 → 86 → 107`, `frameMs.max: 883 ms`**. Shader-recompile stall identified. |
| 2026-05-22 | Visible-toggle removal re-applied (the actual fix, no default flips this time). Verified. Resolved. |

### 8.2 What we tried that didn't work — and shouldn't be tried again

| Attempted | Outcome | Why it didn't work |
|---|---|---|
| Remove LED PointLights entirely (default off) | Reverted | Removed atmospheric drum spill (visual regression). The lights aren't expensive per-frame; only the recompile is. |
| Cap bloom render-target resolution (`resolutionScale: 0.5`) | **Shipped (kept)** | Real GPU-cost reduction at large canvases. Did NOT fix the user's actual cliff because bloom wasn't the bottleneck — the recompile stall was. |
| Camera-layer mask instead of material-swap in BloomManager | Not implemented | Speculative architectural change. Bloom wasn't the bottleneck; doesn't need this. |
| Cache `scene.traverse()` results in BloomManager | Not implemented | Traverse cost was negligible — `darkenMs` measured 0–0.2 ms median. Not worth the cache-invalidation complexity. |
| Disable halo sprite rendering during sequences | Not implemented | Sprite overdraw was a theory based on bloom-bound assumption. Real bug was elsewhere. |
| Cap bloom DPR independently | Not implemented | Same as above — `resolutionScale` already covers this case. |

### 8.3 Lessons (kept here so future LLM sessions don't repeat the path)

1. **`programs.length` over time is the canonical signal for shader recompiles.** Growing across state transitions = recompiling. Sample it before AND after every state change you suspect. The Hypothesis A revert happened because earlier checks didn't sample programs at sequence start/stop transitions.
2. **`frameMs.median` and `frameMs.max` tell different stories.** Median = sustained per-frame cost. Max = one-shot stalls (shader compiles, GC, allocator spikes). Low fps with median-near-target usually means max-spikes, not slow frames.
3. **Measure on the actual host app, not just the dev example.** The Controller's full-window layout + `bindSequenceToSample` + `postMessage` trigger path exercised code paths the Display example didn't. The Display example's small canvas additionally hid GPU-bound effects.
4. **Don't trust a single fps reading.** Multiple runs, multiple environments. Hypothesis A revert happened because of a single 20-vs-13 datapoint that turned out to be noise.
5. **CPU instrumentation can lie.** `performance.now()` around `bloomComposer.render()` measures CPU dispatch, not GPU work. WebGL drivers buffer GPU work asynchronously. Use `frameMs` (rAF interval) as the canonical ground truth and CPU sub-step times as suggestive only.
6. **Validate against official docs before recommending speculative fixes.** Two close calls in this investigation: bloom-layer camera mask (community pattern, not official) and shader recompile detection (verified against [WebGLLights.js](../node_modules/three/src/renderers/webgl/WebGLLights.js) source). Both were valid concerns but the doc check shaped the recommendation strength correctly.

---

## 9. Status of Earlier Proposals

The earlier sections of this doc proposed multiple fix directions. Their statuses:

| Proposal | Status | Notes |
|---|---|---|
| Remove LED PointLights, keep visual (Hypothesis A defaults) | ❌ **Not needed** | Reverted. The visible-toggle removal alone fixes the issue without removing visual quality. |
| Stop toggling `light.visible` | ✅ **DONE — the actual fix** | See §4. |
| Bloom `resolutionScale: 0.5` default | ✅ **DONE — secondary win** | Helps at ≥4 M-pixel canvases. Kept. |
| `collectPerfReport` debug API | ✅ **DONE** | See §5. Exported as `PerfReport` / `PerfStat` / `BloomFrameMetrics`. |
| Camera-layer mask instead of material-swap in BloomManager | ❌ **Not needed** | Bloom was not the bottleneck. |
| Cache `scene.traverse()` in BloomManager | ❌ **Not needed** | Traverse cost negligible. |
| Cap bloom render-target DPR independently | ❌ **Not needed** | Subsumed by `resolutionScale`. |
| Disable halo sprites during sequences | ❌ **Not needed** | Was a theory based on wrong hypothesis. |
| Profile on user's actual hardware | 🔵 **Optional** | The fix is universal — it removes a deterministic main-thread stall, not a hardware-tuned optimisation. User's machine should see the cliff disappear. If it doesn't, see §12. |
| Expose `TowerRenderView` to `window` via opt-in option | 🔵 **Optional, low priority** | `collectPerfReport` reduces the need. Could still be a nice-to-have for general debugging. |

---

## 10. Cleanup Status

Reflects the shipped state — §4 first fix PLUS §13 follow-up gate fix together.

| File | Repo | Status |
|---|---|---|
| `src/3d/Tower3DView.ts` (`buildLeds`, `applyLightingToScene`, `loadModel`, `startRenderLoop`) | UltimateDarkTowerDisplay | ✅ `redLight.visible = false` at construction; gate owns visibility. New methods: `prewarmLightPrograms`, `setBulkLightsVisible`, `updateLightsGate`, `renderOnce`. `lightsGateOpen` field. Per-tick `updateLightsGate()` call in render loop. Async `loadModel` callback awaits prewarm before `_loadState = 'ready'`. |
| `src/3d/LedEffectAnimator.ts` (`writeLed`) | UltimateDarkTowerDisplay | ✅ `writeLed` drives only `intensity`; visibility owned by Tower3DView's gate. |
| `src/3d/SealManager.ts` (`buildSealBacklights`, `setSealLed`, `updateLighting`) | UltimateDarkTowerDisplay | ✅ `light.visible = false` at construction (gate owns visibility); `setSealLed` drives only intensity; `updateLighting` no longer touches `visible`. |
| `src/3d/BloomManager.ts` | UltimateDarkTowerDisplay | ✅ `resolutionScale` field added (default 0.5); `collectMetrics` / `lastMetrics` for `collectPerfReport`. |
| `src/3d/LightingResolver.ts` + `src/3d/types.ts` | UltimateDarkTowerDisplay | ✅ `scene.bloom.resolutionScale` (default 0.5) added. Other defaults unchanged. |
| `src/3d/Tower3DView.ts` (`collectPerfReport` + `__testables`) | UltimateDarkTowerDisplay | ✅ Added. Forwarded through TowerDisplay + TowerRenderView. `__testables` exports `tickLightsGate` and `isLightsGateOpen` for jsdom-friendly tests. |
| `src/index.ts` | UltimateDarkTowerDisplay | ✅ Re-exports `PerfReport`, `PerfStat`, `BloomFrameMetrics`. |
| `tests/unit/Tower3DView.test.ts` | UltimateDarkTowerDisplay | ✅ Visibility assertions updated to drive `tickLightsGate(view)`; new "bulk lights gate" describe block validates open/close transitions; `collectPerfReport` shape test added; "replays latestState" test became `async` and awaits microtasks (load callback is now async). |
| `tests/__mocks__/three.js` | UltimateDarkTowerDisplay | ✅ Added `Clock`, `TextureLoader`, `WebGLRenderer.capabilities.getMaxAnisotropy`, `WebGLRenderer.info.{render,programs,autoReset,reset}`, `getPixelRatio()`, `compile()`, `compileAsync()`. |
| `tests/__mocks__/pngUrl.js` + `jest.config.cjs` png mapper | UltimateDarkTowerDisplay | ✅ Kept. |
| `docs/LIGHTING.md` | UltimateDarkTowerDisplay | ✅ Updated: §8 adds `resolutionScale` row + bloom-scaling note; §10 driver code snippet updated (no per-frame visible); new §10.1 "Bulk lights gate"; §11.3 accent-light visibility note; §16 render pipeline adds `updateLightsGate`; §17 default config adds `resolutionScale: 0.5`. |
| `CHANGELOG.md` | UltimateDarkTowerDisplay | ✅ Entries: `Fixed` (visible-toggle removal — original §4 fix); `Fixed` (bulk-lights gate + prewarm — §13 follow-up); `Added` (`collectPerfReport`); `Changed` (bloom `resolutionScale`). |
| `examples/controller/TowerEmulator.ts` (`window.display` debug expose) | UltimateDarkTower | ✅ Reverted. Rebuilt clean (`grep -c "__view\|window\.display" dist/...` = 0). |
| `dist/index.esm.js` etc. | UltimateDarkTowerDisplay | ✅ Rebuilt via `npm run build` after each fix. |
| `examples/dist/...` | UltimateDarkTower | ✅ Rebuilt via `node build-examples.js` after each fix. |

**Tests:** 279 unit tests pass (added `collectPerfReport` shape test + bulk-gate describe block since the original count of 277). Both `tsc --noEmit` configs are clean.

---

## 11. Reference Material

External sources consulted during the investigation:

- [three.js — UnrealBloomPass docs](https://threejs.org/docs/pages/UnrealBloomPass.html) — confirms passing a lower-resolution `Vector2` is a documented optimization.
- [three.js — selective bloom example source](https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_unreal_bloom_selective.html) — official pattern (material-swap, not camera-layer), what `BloomManager` mirrors.
- [Discover three.js — Tips & Tricks](https://discoverthreejs.com/tips-and-tricks/) — *"Direct lights are slow. Use as few direct lights as possible."* Notes that adding/removing lights triggers shader recompiles. (Correct on the recompile claim — but per investigation, intensity-modulating a stable set of lights avoids the recompile penalty entirely.)
- [Three.js Journey — Lights, Shading, Shaders](https://threejs-journey.com/lessons/lights-shading-shaders) — recommends ≤3 active lights, with fallback to baked lighting / env maps beyond that. (We're 12× over that recommendation but the fix proves it's manageable as long as the count is stable.)
- [Three.js forum — Optimizing PointLights](https://discourse.threejs.org/t/optimizing-point-lights/36153) — light-pool pattern. Not applicable here but useful future reference.

Internal source code references:

- [WebGLLights.js:442-451](../node_modules/three/src/renderers/webgl/WebGLLights.js#L442-L451) — the lights-count hash that drives shader recompilation.
- [WebGLRenderer.js:1803](../node_modules/three/src/renderers/WebGLRenderer.js#L1803) — `if (object.visible === false) return;` in `projectObject()` — confirms invisible lights are skipped at draw time and therefore excluded from the lights array.
- [RenderPass.js:165](../node_modules/three/examples/jsm/postprocessing/RenderPass.js#L165) — each `RenderPass` calls `renderer.render(scene, camera)` — confirms BloomManager does two full scene renders per frame.

Follow-up research (if revisiting this design):

- [lighting-alternatives.md](lighting-alternatives.md) — survey of 17 alternative lighting approaches that could replace or reduce the 36-PointLight cost ceiling documented in §13.6.

---

## 12. Final Verification Checklist

For the user — confirm the fix is live and works on your machine.

### 12.1 Confirm builds are current

```bash
# Display package
cd /Users/wopr/Documents/GitHub/UltimateDarkTowerDisplay
git log -1 --format="%h %s" CHANGELOG.md src/3d/Tower3DView.ts src/3d/LedEffectAnimator.ts src/3d/SealManager.ts src/3d/BloomManager.ts
# Should show the fix's commit (or `git status` should show these as modified+committed since last build)

ls -lT dist/index.esm.js  # compare against git log timestamp — dist should be newer
# Rebuild if not:
npm run build

# Controller examples
cd /Users/wopr/Documents/GitHub/UltimateDarkTower
ls -lT dist/examples/controller/TowerEmulator.js
# Rebuild if older than the Display dist rebuild:
node build-examples.js
```

### 12.2 Confirm no debug edits remain

```bash
grep -n "window.display\|__view" /Users/wopr/Documents/GitHub/UltimateDarkTower/examples/controller/TowerEmulator.ts
# Should return nothing. If it does, remove the diagnostic line and rebuild examples.
```

### 12.3 Visual / fps test in your browser

Two scenarios to test (one for each fix). Open the Controller's Tower Emulator at your usual URL, open DevTools console.

**Test A — idle smoothness (the §13 gate fix's target):**

```js
// Make sure no sequence is playing, then measure 3 seconds of idle
let n=0,t=performance.now();
(function tick(){ n++; performance.now()-t<3000 ? requestAnimationFrame(tick) : console.log('IDLE fps:', (n/3).toFixed(1)); })();
```

Expected: fps at your monitor's refresh cap (60 / 120 / 144). Pre-§13, idle on a Retina full-window canvas could drop to ~13 fps because 36 always-active `PointLight`s ran in every fragment. After §13, idle should be back to v-sync cap.

**Test B — sequence smoothness (the §4 fix's target):**

```js
window.postMessage({ type: 'playSequence', sequenceId: 5 }, '*'); // angryStrobe01
let n=0,t=performance.now();
(function tick(){ n++; performance.now()-t<3000 ? requestAnimationFrame(tick) : console.log('SEQUENCE fps:', (n/3).toFixed(1)); })();
```

Expected: no one-frame stall on transition (was ~880 ms pre-§4). Sustained fps during sequence depends on your GPU's per-fragment cost for 36 active `PointLight`s — typically still well above 30 fps at natural canvas sizes.

LED visuals should look identical to before — proxy spheres, halo sprites, and drum-interior red spill (when LEDs are active). The §13 gate makes the spill correctly **disappear at idle** (no LEDs lit = no spill), which is the same visual as pre-fix idle and the intended behavior.

### 12.4 Repeat for the other sequences you originally saw drop

- `sequenceId: 4` — Flare Then Flicker
- Any other sequence you previously observed dropping below 30 fps

### 12.5 If something is wrong

1. **Idle still feels slow:** Capture `display.collectPerfReport(3000)` at idle (recipe §5.2). Check `visiblePointLights` — should be `0`. If it's `36`, the §13 gate isn't running (probably an outdated `dist` — rebuild with `npm run build` in Display and `node build-examples.js` in Controller).
2. **Sequence still stalls (one-frame freeze):** Capture both `idle` and `sequence` reports. Compare `programs` counts — if it grows by more than +3 between captures, prewarm isn't covering all needed material variants on your hardware (rare; share the report).
3. **Visual change:** No visual regressions are expected from either fix. The drum-interior red spill appears only when an LED is active (gate open) — that's correct behavior. If spill is missing during a sequence, check the loaded dist via `grep -c "lightsGateOpen" dist/index.esm.js` — should be > 0.
4. **Any other anomaly:** Capture both reports and share. The §5.3 decision tree will point at the next investigation direction.

### 12.6 Closing the loop

Once verified, no further action needed. The `collectPerfReport` API is left in place for any future perf investigations — diagnostic-only, zero production overhead.

For reference: both fixes ship together. §4 + §13 are both required and complementary — §4 eliminates the sequence-transition stall; §13 eliminates the idle-cost side effect of §4. Removing either reintroduces a regression.

If the cliff is gone on your machine: this issue is fully closed. The earlier theories chased in §8 are documented to prevent re-chasing.

---

## 13. Follow-up Fix — Bulk Lights Gate + Prewarm (2026-05-22 PM)

### 13.1 The regression

The fix in §4 traded one problem for another. Eliminating per-frame `light.visible` toggling meant all 36 LED-related `PointLight`s stayed `visible: true` for the scene's lifetime, even at idle. Three.js's fragment shader iterates every active light per fragment regardless of intensity, so:

| Era | Active lights at idle | Active lights during sequence |
|---|---:|---:|
| Pre-original-bug | 0 | varies 0–36 (with recompile stalls on transitions) |
| §4 fix | **36 always** | 36 always (no stalls) |
| §13 fix (now) | **0** | 36 (no stalls, cached programs) |

User reported: "the overall framerate now feels lower than it did even with no lights on."

Measured at 7.84 M backing pixels (canvas = 1400 × 1400 with DPR 2, typical of full-window Retina layouts):

| State | fps | frameMs.median |
|---|---:|---:|
| 36 lights visible (§4 fix's idle) | 13.7 | 74.2 ms |
| 0 lights visible (simulated pre-fix idle) | 120.0 | 8.3 ms |

The 36 always-active lights added **~66 ms / frame** of GPU work. On the test machine this was invisible at smaller canvases (v-sync hid the cost) but became dominant the moment the GPU was challenged. On the user's actual hardware, with less GPU slack than Apple Silicon, the cost is enough to make the renderer feel sluggish even at idle.

### 13.2 The gate + prewarm fix

Keep all 36 lights' visibility STABLE WITHIN any given state, but use **two stable states**:

- **Gate closed (idle):** all 36 lights `visible: false` → fragment shader iterates 0 PointLights.
- **Gate open (any LED active):** all 36 lights `visible: true` → fragment shader iterates 36 PointLights.

To avoid shader recompiles on gate transitions, **pre-compile both program variants at scene init** via `WebGLRenderer.compileAsync` followed by a full render pass. The follow-up render also caches `BloomManager.darkMaterial`'s programs and the proxy/halo mesh variants (which `compileAsync` alone doesn't fully reach since `darkMaterial` isn't in the scene graph and the proxy meshes are `visible: false` initially).

### 13.3 Implementation files

- **[src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts)** — new `lightsGateOpen` field; `prewarmLightPrograms()` async method called from the `loadModel` callback after `buildLeds` + `buildSealBacklights`, before `_loadState = 'ready'`; `setBulkLightsVisible(visible)` for the bulk toggle (respects `accentLight` config); `updateLightsGate()` called per render tick; `applyLightingToScene` re-syncs the gate after config changes; `renderOnce()` helper for the prewarm render.
- **[src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts)** — unchanged from §4: `writeLed` drives only `intensity`. Gate owns visibility.
- **[src/3d/SealManager.ts](../src/3d/SealManager.ts)** — `buildSealBacklights` sets `light.visible = false` initially (Tower3DView's gate owns visibility now); `setSealLed` drives only intensity; `updateLighting` no longer touches `light.visible`.
- **[tests/unit/Tower3DView.test.ts](../tests/unit/Tower3DView.test.ts)** — visibility-related assertions updated to drive `tickLightsGate(view)` from the new `__testables.tickLightsGate` (rAF doesn't run in jsdom); new "bulk lights gate" describe block validates open/close transitions; the "replays latestState" test became `async` and awaits microtasks since `loadModel` is now async.
- **[tests/__mocks__/three.js](../tests/__mocks__/three.js)** — added `compile()` / `compileAsync()` stubs to the `WebGLRenderer` mock.

### 13.4 Async sequencing in the model-load callback

`prewarmLightPrograms` is async (awaits `compileAsync`). The `loadTowerModel` callback became `async` and `await`s the prewarm BEFORE `_loadState = 'ready'` and `applyState(latestState)`, so any user-replay state that turns LEDs on hits the cached program rather than triggering a recompile.

The prewarm guards against `dispose()` during its awaits (`if (!this.scene || !this.camera || !this.renderer) return;` after each `await`) so a quick mount/unmount won't crash.

### 13.5 Verification

Playwright run on Controller, forced canvas to 7.84 M backing pixels (the regression-surfacing scale), three transitions: IDLE → SEQUENCE 1 → idle → SEQUENCE 2.

| Metric | Idle | Sequence 1 | Sequence 2 |
|---|---:|---:|---:|
| `fps` | **120** | 16.8 | 14.2 |
| `frameMs.median` | **8.3 ms** | 65.8 ms | 68.8 ms |
| `frameMs.max` | 9.4 ms | 148.6 ms | 150.3 ms |
| `visiblePointLights` | **0** | 36 | 0 (sequence ended mid-window) |
| `programs` | 27 | 30 | **30 (stable)** |

At the user's natural canvas size (1.1 M backing pixels):

| Metric | Idle | Sequence |
|---|---:|---:|
| `fps` | **120** | **120** |
| `frameMs.median` | 8.3 ms | 8.3 ms |
| `frameMs.max` | 10.3 ms | 10.4 ms |
| `visiblePointLights` | 0 | 36 |
| `programs` | 27 | 30 |

**Key signals:**
- Idle restored to v-sync cap with 0 active lights — exactly the pre-bug idle perf.
- Programs grew by exactly +3 on first sequence (one-time cost for a few sprite/halo material variants prewarm doesn't fully cover) and stayed stable across subsequent transitions.
- At natural canvas size, no measurable stall on sequence transitions (max frame stays inside one 120 Hz v-sync interval).
- Sequence sustained cost is the inherent 36-lights-active cost — only paid while LEDs are actually visible, which is the intended visual.

### 13.6 Known minor limitations

- **+3 programs still compile on first sequence**, down from +5 (intermediate fix) and +20 (original bug). Likely sprite-specific or bloom-pass-internal material variants not reached by `compileAsync` + one render pass. At 7.84 M pixels this manifests as one ~148 ms frame on the first sequence after page load; cached for the lifetime of the session. Could be eliminated with more aggressive prewarm (multiple render passes at both gate states) — left out for simplicity. Negligible at natural canvas sizes.
- **Sequences with 36 active lights still pay the per-fragment cost during playback.** This is the cost of having atmospheric drum-interior spill — fundamental to the visual design. Not addressable without removing or pooling lights, which would be a visual change.

### 13.7 How this updates §4

The instructions in §4 ("The Fix — Code Changes") describe the first fix (keep all lights visible). The CURRENT shipped behavior is §4 PLUS §13 — the gate makes `setBulkLightsVisible(true/false)` the source of truth for the 36 lights' visibility, while individual LEDs still only animate intensity. The two together are what's in the dist.

---

## 14. Pop-out Window Perf — Open Investigation (unresolved, 2026-05-22)

> **Status: UNRESOLVED.** A separate perf problem from §1–§13. The popup window itself slows the 3D renderer down even after §4 + §13 are in effect. Multiple fix attempts in this session did not help and were reverted. The Display example's Pop Out feature is shipped as-is.

### 14.1 What the user observed

In the Display example app ([example/popOutController.ts](../example/popOutController.ts)) the "Pop Out" button transplants `#rendered-panel` into a separate browser window (`window.open`) and recreates the renderer inside it. With all LEDs manually lit via the override panel:

| Scenario | Canvas (CSS) | fps |
|---|---|---:|
| Main page, embedded | ~1194 × 1053 | ~30 |
| Popup window | 940 × 907 | ~18 |

Same scene, smaller canvas in popup, still slower. The §13 prewarm + gate fix is in effect in both cases (verified — `programs` only grows by +3 on first sequence).

### 14.2 What we measured

Two `collectPerfReport(3000)` captures inside the popup (M1 Pro, ANGLE Metal renderer):

**Popup at idle (no LEDs lit):**
- `fps: 50`, `frameMs.median: 20.0 ms` exactly, `max: 21 ms`
- `bloomTotalMs.median: 1.0 ms` — CPU dispatch is essentially free
- `drawCalls: 91`, `triangles: 1.6 M`, `bufW × bufH: 942 × 909` (DPR 1, gate closed)
- `programs: 27`, `visiblePointLights: 0`

**Popup with all LEDs on:**
- `fps: 14.2`, `frameMs.median: 20.0 ms`, **`p95: 480 ms`, `max: 1140 ms`**
- `programs: 30` (only +3 from idle — prewarm gap, expected)
- `visiblePointLights: 36`, `drawCalls: 195`, `triangles: 1.8 M`
- Steady-state fps matches idle. The catastrophic stalls (one or two 0.5–1.1 s frames per 3-second window) are what destroys the average.

### 14.3 What we ruled out

| Hypothesis | Test | Verdict |
|---|---|---|
| Canvas is cross-document-adopted; WebGL context degrades when moved between docs | Ran `canvas.ownerDocument` check while popup open; got `where: "popup"` ✓ | The canvas IS correctly owned by the popup's document. Not the cause. |
| Pixel count (DPR 2 × large canvas = many fragments × 36 active lights) | Added a `maxPixelRatio` option, capped popup to DPR 1 (~860 K backing pixels) | No measurable fps improvement. Pixel count is not the dominant cost in this regime. Reverted. |
| Popup's fps cap is a Chrome cross-window throttle | Moved popup between external (50 Hz) and built-in (120 Hz) monitor; fps idle scaled accordingly | It's just per-display vsync. Not a Chrome quirk. The "50 fps" floor was the user's external monitor. |
| Same-document fullscreen overlay would avoid cross-window cost | Replaced popup with `position: fixed; inset: 0` body class; live canvas + WebGL context stayed alive (no recreate) | Got WORSE — ~4 fps with all LEDs on at fullscreen. Overlay canvas is larger than the popup was, and even with DPR cap the per-fragment cost dominates. Reverted. |
| `transferControlToOffscreen` / OffscreenCanvas would help | Not tested | Speculative. Significant rearchitecture. |

### 14.4 Where the cost actually is

The data points at **transient stall frames during sequence playback in the popup**, not steady-state per-fragment cost. Specifically:

- Steady-state in popup is fine (50 fps median = vsync cap, not a perf cliff)
- Stalls of ~480–1140 ms appear despite `programs` count only growing by +3
- §13's prewarm DOES run in the popup's freshly-recreated renderer (the load callback awaits it before `_loadState = 'ready'`)
- But each program compile in the popup's WebGL context appears to be much more expensive than in the main window's context (3 compiles × ~40 ms = 120 ms doesn't account for a 1140 ms frame)

The stalls might come from:
1. **Popup-context shader compile cost amplified by cross-process compositing** — the popup has its own GPU process binding; compile + first-render of new programs may serialize across a process boundary.
2. **Backpressured GPU pipeline during gate transitions** — when 36 lights become visible, the popup's compositor may struggle to consume the larger frame and back-pressure the renderer.
3. **rAF coordination between main page and popup compositor** — the render loop's `requestAnimationFrame` is bound to the main page's window; the popup paints on its own compositor schedule.

We don't have a smoking-gun measurement that distinguishes these.

### 14.5 What did NOT work — do not try again

| Attempted | Outcome | Why |
|---|---|---|
| `maxPixelRatio` option on Tower3DView, capping popup to DPR 1 | No measurable improvement | Per-fragment cost wasn't the bottleneck in the popup case. The plumbing existed on `Tower3DView` / `TowerDisplay` / `TowerRenderView` / `TowerRenderViewOptions` and the example wired it via a `popoutActive` flag. **All reverted.** Only the popup hits this perf class — adding API surface for no benefit is the wrong trade. |
| In-page fullscreen CSS overlay instead of `window.open` | Worse fps than the popup it was meant to replace (~4 fps with all LEDs on at full viewport) | Overlay canvas is large (full viewport at DPR 2). Even with DPR cap to 1, fragment work for 36 lights dominates. User preferred the popup back — **reverted**. |
| Public `Tower3DView.setPixelRatio(value)` runtime method | Added then removed | Was added to support the overlay path; never used by anything else. Removed when overlay was reverted. |

### 14.6 What to try next (productive directions, untested)

The single most useful next experiment is a **side-by-side perf report at the SAME scene + canvas size** in main vs popup. Currently we have main at ~1194 × 1053 (popup transplants the panel, so they can't both be the same size at the same instant — see below). The bug surfaces in the popup despite the smaller canvas, so the comparison would need to either:

- Test in main with the canvas resized to match the popup (940 × 907) — does main stall too at that size?
- Or test in popup with the canvas resized larger to match the main baseline.

If main is fine at 940 × 907 with all LEDs on but popup is not, that confirms the popup's WebGL context is the issue. Then:

1. **Detect popup context in `prewarmLightPrograms`** and run additional render passes (gate-open + gate-closed). The §13 prewarm uses one render pass — popup-context Three.js may need more variants warmed before `_loadState = 'ready'`.
2. **Stream the rendered frame into the popup instead of re-rendering there** — keep the canvas in the main document, use `canvas.captureStream()` or a `<video>` element in the popup pointing at a MediaStream. Avoids cross-window WebGL entirely. Trade-off: codec overhead vs. cross-window rendering overhead — unknown without measurement.
3. **Cross-browser check** — Firefox / Safari may have different popup compositing behavior. If the cliff is Chrome-specific, that confirms it's a browser pipeline issue and not a Three.js / app-code issue.
4. **Capture a Chrome `chrome://tracing` profile** during a sequence in the popup — would surface whether the 1140 ms is GPU work, IPC, compositor wait, or shader compile.

The Playwright MCP server is available locally (see `~/.claude/memory/reference_playwright_mcp.md`), which can drive both the main and popup windows headlessly to capture comparable `collectPerfReport` blobs without manual repro.

### 14.7 Current shipped state

- [example/popOutController.ts](../example/popOutController.ts) — unchanged from before this investigation. Same browser-window-popup behavior. Same perf characteristics.
- [example/example.css](../example/example.css) `.popout-body` / `.popout-placeholder` rules — unchanged.
- Library code (`src/`, `tests/`) — no diff from before this investigation. No new API surface.
- All `maxPixelRatio` plumbing, the `setPixelRatio` runtime method, and the in-page overlay attempt are **reverted in full**. The diff after the investigation should be zero against the pre-session baseline for everything except this doc entry.

### 14.8 Diagnostic snippets that worked

Two console snippets useful for any future popup-perf investigation. Run in the **main** window's DevTools with the popup open:

**Locate the canvas across both documents:**
```js
(() => {
  const canvases = [];
  const winB = window.open('', 'udtd-render'); // returns existing popup if open
  [window, winB].forEach((w, i) => {
    try {
      w?.document.querySelectorAll('canvas').forEach(c =>
        canvases.push({ where: i === 0 ? 'main' : 'popup', w: c.width, h: c.height }));
    } catch (e) { canvases.push({ where: i === 0 ? 'main' : 'popup', error: String(e) }); }
  });
  return { popupOpen: !!winB && !winB.closed, canvases };
})();
```

**Capture comparable perf reports (with `window.display` exposed):** use `await window.display.collectPerfReport(3000)` exactly as §5 documents. The Display example app already publishes `window.display` via [example/rendererController.ts](../example/rendererController.ts) `publishDisplay()`.
