---
description: Captures, structures, and interprets 3D-renderer perf measurements for the UltimateDarkTowerDisplay project using its built-in collectPerfReport() API, optionally combined with chrome-devtools MCP performance traces. Produces a standardized report comparable across sessions, contributors, and code changes.
when_to_use: When the user reports fps drops, frame stalls, jank, sequence-transition perf cliffs, shader-recompile suspicions, "renderer feels slow", or wants a perf baseline before/after a code change in src/3d, BloomManager, Tower3DView, TowerDisplay, or TowerRenderView. Also proactively when planning any change that could affect rendering performance.
allowed-tools: mcp__chrome-devtools__navigate_page mcp__chrome-devtools__list_pages mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__performance_start_trace mcp__chrome-devtools__performance_stop_trace mcp__chrome-devtools__performance_analyze_insight mcp__chrome-devtools__list_console_messages mcp__playwright__browser_evaluate mcp__playwright__browser_console_messages
---

# darktower-3d-perf

Standardized perf capture for the UltimateDarkTowerDisplay 3D renderer. Follow this protocol every time — successive measurements then diff cleanly across sessions and contributors.

## Why this exists

Past investigations made bad calls on noisy data (see `docs/framerate-issue.md` §8.2 — the "Hypothesis A" revert). The fix was a consistent capture procedure plus the structured `collectPerfReport()` API. This skill encodes that procedure.

## Pick the app

| Goal | Use | Note |
|---|---|---|
| Routine capture, fastest setup | **Display example** — `npm run dev:example` (Vite, port 5173+, opens `/example/`) | `window.display` is pre-published by `example/rendererController.ts` `publishDisplay()`. Canvas ~600×600 (sidebar-constrained). |
| Reproduce reported Controller-emulator perf | **Controller emulator** — in the sibling `UltimateDarkTower` repo: `npm run dev:controller` → `http://localhost:8080/examples/controller/TowerEmulator.html` | Full-window canvas, `bindSequenceToSample: true`. Where `framerate-issue.md` §14 was investigated. Requires a temporary patch (see Preflight) and lives in a sibling repo. |

Prefer the Display example unless the issue specifically only reproduces in the Controller emulator. Display canvas is small but the protocol is the same and the data is comparable across sessions.

## Preflight (run in order)

1. **Is the dev server up?** Display: `curl -fsI http://localhost:5173/example/`. Controller: `curl -fsI http://localhost:8080/examples/controller/TowerEmulator.html`. If down, ask the user to start it — don't start it yourself, their working tree may not be clean.
2. **Can you reach the renderer?**
   - Display: run `await window.display.collectPerfReport(50)` via `mcp__chrome-devtools__evaluate_script` (or `mcp__playwright__browser_evaluate`). Non-null Promise → ready.
   - Controller: there is **no shipped `window.display`**. The emulator stores the display in a module-scoped `let`. To capture, temporarily patch `examples/controller/TowerEmulator.ts` adding `(window as any).display = display;` right after the `display = new TowerRenderView(...)` block, then rebuild with `node build-examples.js`. **Revert the patch and rebuild again before committing.** (See `docs/framerate-issue.md` §5.2 and §10.)
3. **Is the canvas actually rendering at a usable size?** The 50ms probe's `canvas.bufW`/`bufH` must be ≥ a few hundred pixels each. If you see something trivial like `2×2`, the renderer's container is hidden or collapsed (a common failure mode under chrome-devtools MCP's launched Chrome when the example's layout panels toggle). All fragment-cost data is meaningless in that state. Resize the window (`mcp__chrome-devtools__resize_page`) and/or force the renderer wrapper visible (`document.querySelector('.t3v-wrapper').setAttribute('style', 'display: flex !important; width: 100%; height: 100%;'); window.dispatchEvent(new Event('resize'));`) before continuing, and re-probe.
4. **Is chrome-devtools MCP available?** Check whether `mcp__chrome-devtools__performance_start_trace` appears in the tool list. If yes, the optional trace layer is available. If no, capture still works with `collectPerfReport` alone; report skips the trace insights.

## Capture protocol — windows, in order

Each window is `collectPerfReport(3000)`. Don't change the duration without documenting it in the report. The "Idle" windows mean *no sequence is playing*, not an explicit forced-idle state — let the renderer settle naturally.

0. **EMPTY (optional baseline)** — *the* "everything off" reading. Useful when isolating the renderer's standing cost (camera, drum geometry, ground, ambient lights) from any scene complexity, or when IDLE looks unexpectedly expensive and you need to know whether to blame the renderer or the scene. Include this window when investigating renderer overhead or validating a renderer-only refactor; skip when investigating scenario-specific regressions.
   - Display: `document.getElementById('btn-empty').click(); await new Promise(r=>setTimeout(r,800)); const empty = await window.display.collectPerfReport(3000);`
   - Controller: no equivalent UI hook. Skip unless you're driving the emulator from the Controller's tower-state editor.
1. **IDLE (baseline)** — verify no sequence is currently active by checking that a quick `(await window.display.collectPerfReport(50)).drivers.ledsActive === 0`. If it's non-zero, wait until it returns to 0 (sequence is still finishing). Then `await new Promise(r=>setTimeout(r,500)); const idle = await window.display.collectPerfReport(3000);`
2. **SCENARIO** — fire the scenario, wait 500ms, capture 3s:
   - Display, by sequence: `window.display.playSequence(N);`
   - Controller, by sequence: `window.postMessage({type:'playSequence', sequenceId:N}, '*');`
   - Display, by direct state (when the "scenario" is a static LED configuration rather than a sequence, e.g. "1 LED on" or "all LEDs on"): `window.display.setLedOverride(layer, light, effect)` (single LED, effect ∈ {0=off, 1=on, 2=breathe, 3=breatheFast, 4=breathe50, 5=flicker}), or `window.display.applyState(state)` for whole-state replacement (build the state with `createDefaultTowerState()` + mutations, or use one of the example presets like `createAllOnState()`).
3. **POST-IDLE** — wait for the sequence to finish naturally (poll `drivers.ledsActive` back to 0, or wait ~8s for a typical sequence), then `await new Promise(r=>setTimeout(r,1000)); const postIdle = await window.display.collectPerfReport(3000);` — catches retained state from the scenario. This is the window that surfaced the §13 regression in framerate-issue.md.

Default scenario: `sequenceId: 5` (angryStrobe01) — canonical stressor. Common alternatives from `UltimateDarkTower/src/udtConstants.ts`:

| ID | Name |
|---:|---|
| 1 | twinkle |
| 2 | flareThenFade |
| 3 | flareThenFadeBase |
| 4 | flareThenFlicker |
| 5 | angryStrobe01 |
| 6 | angryStrobe02 |
| 7 | angryStrobe03 |
| 8 | gloat01 |
| 9 | gloat02 |
| 10 | gloat03 |

### Optional: chrome-devtools trace overlay

Only when `mcp__chrome-devtools__*` is available. Wrap the SCENARIO capture:

1. `mcp__chrome-devtools__performance_start_trace`
2. Fire scenario, wait, `collectPerfReport`
3. `mcp__chrome-devtools__performance_stop_trace`
4. `mcp__chrome-devtools__performance_analyze_insight`

The trace attributes long frames (GPU vs. compositor vs. JS vs. shader compile); `collectPerfReport` tells you *that* the frame was long. Different layers — use them together when investigating an attribution question.

## Output — emit exactly this shape

```markdown
## Perf report — <scenario name>, <ISO date>
**App:** Display example | Controller emulator
**Canvas:** <cssW>×<cssH> CSS / <bufW>×<bufH> buffer (DPR <pixelRatio>)
**Tools:** collectPerfReport(3000)[, chrome-devtools trace]

| Metric | Empty | Idle | Scenario | Post-idle |
|---|---:|---:|---:|---:|
| fps | … | … | … | … |
| frames | … | … | … | … |
| frameMs.median / p95 / max | … | … | … | … |
| bloomTotalMs.median / max (if bloomEnabled) | … | … | … | … |
| drawCalls.median / max | … | … | … | … |
| triangles.median / max | … | … | … | … |
| programs | … | … | … | … |
| scene.visiblePointLights | … | … | … | … |
| drivers.ledsActive | … | … | … | … |

Drop the **Empty** column when window 0 was skipped — keep column order otherwise so reports diff cleanly across runs.

**Interpretation:** <one sentence keyed to decision tree below>
**Suggested next step:** <one line>

(Optional) **Trace insights:** <chrome-devtools performance_analyze_insight summary>
```

Fixed columns and field names are the point — two reports separated by a code change must diff cleanly. `frameMs` and bloom sub-step timings have full `PerfStat` (median/p95/max). `drawCalls` and `triangles` have only `{median, max}` — don't invent a p95 for them.

## Interpretation decision tree

In this order — first match wins:

1. **`programs` grew between idle and scenario** → shader recompile happening on scenario transition. Look for state that changes a Three.js shader hash (light count, shadow map count, defines toggled per frame). Canonical signal — see `docs/framerate-issue.md` §8.3 lesson 1.
2. **`frameMs.max ≫ frameMs.median`** → one-shot stalls. Usually the same cause as #1; if `programs` is flat, suspect GC, allocator spikes, or main-thread sync work fired by the scenario start.
3. **`frameMs.median ≥ 16ms` with `max ≈ median`** → sustained per-frame cost.
   - If `bloomTotalMs.median ≈ frameMs.median` → bloom is the bottleneck. Try lower `resolutionScale`.
   - Else look at `drawCalls`, `triangles`, or non-Three.js cost (audio, GSAP, DOM).
4. **`drawCalls` jumps with scenario** → more meshes drawn. Check `scene.visibleBloomMeshes` / `visibleSprites` for additive-blending overdraw.
5. **`scene.visiblePointLights` doesn't track `drivers.ledsActive`** → the bulk-lights gate (§13) is out of sync. Investigate `Tower3DView.updateLightsGate`.

If you captured **Empty**, use it to split #3:
- `frameMs.median(empty) ≈ frameMs.median(idle)` → the standing scene complexity is essentially free; the cost is in the renderer baseline (camera/composer/composite). Renderer-level investigation.
- `frameMs.median(empty) ≪ frameMs.median(idle)` → the standing scene (default geometry, ambient lights, etc.) is doing real work even when nothing is animating. Scene-content investigation.

If nothing fires, the data is inconclusive — recapture with the chrome-devtools trace overlay for attribution.

## Gotchas

- **Always check `canvas.bufW`/`bufH` in the IDLE report before trusting any frame timings.** Trivial values (e.g. `2×2`) mean the renderer's container collapsed and the GPU did essentially zero fragment work — `fps: 120` in that state is meaningless. Re-do preflight step 3 and recapture.
- **Don't call `display.showIdle()` from the protocol.** It is being removed from the Display example app (toggles a UI panel that hides `.t3v-wrapper` and zeroes the canvas — measurements taken in that state are invalid). Treat "Idle" as "no sequence currently playing" and verify via `drivers.ledsActive === 0`.
- **`TowerDisplay.collectPerfReport` and `TowerRenderView.collectPerfReport` return `Promise<PerfReport> | null`** (null if no 3D view). Only `Tower3DView.collectPerfReport` always returns `Promise<PerfReport>`. Handle null at the wrapper layer.
- **`collectPerfReport` mutates `renderer.info.autoReset` and `bloomManager.collectMetrics` for the window** and restores at end. If the page navigates mid-report those flags stay flipped until next mount — don't measure across navigations.
- **First rAF sample is trimmed** by the helper. A 3000ms window yields ~2800-2900ms of actual samples. Don't compute fps from the duration yourself; use the returned `fps` field.
- **CPU-side `bloomTotalMs` measures dispatch only**, not GPU work. WebGL is async. `frameMs` (rAF interval) is ground truth.
- **Display canvas is ~600×600** in the original layout — fine for protocol comparison, but won't surface GPU-bound effects that need ≥4 M-pixel canvases.
- **Controller-emulator `window.display` patch must be reverted** before committing. See `docs/framerate-issue.md` §10 for the cleanup status format.
- **chrome-devtools MCP launches its own Chrome by default** with a small viewport; layout panels may collapse the renderer container. To attach to your already-open emulator, pass `--browser-url` (Chrome 144+) when adding the MCP server.

## When evaluating a lighting alternative

`docs/lighting-alternatives.md` enumerates 18 design options that could replace or simplify the current 36-PointLight system. Any time someone is investigating one of those (or proposes a new one), use this addendum to the protocol:

**Canonical success criterion (from lighting-alternatives.md §5.8):** the replacement must **beat the sequence frameMs without regressing idle/empty frameMs**, and `programs` must not grow over repeated sequence transitions. An alternative that improves sequence fps but regresses idle has not won — it has moved the cost.

**Required workflow:**

1. **Baseline capture FIRST** — run the full triplet (Empty / 1-LED / All-LEDs, see below) on `main` *before* implementing the alternative. Save the report. Without a same-machine same-canvas baseline, "this is faster" claims are noise.
2. **Implement the alternative** on a branch.
3. **Recapture** the same triplet at the same canvas size.
4. **Diff and document** in the PR using the table format. Call out any field that regressed.

**Scenario triplet — Empty / 1-LED / All-LEDs.** Run all three when evaluating an alternative — the cost curve between them is the test:

| State | How to set | Why it matters for alternatives |
|---|---|---|
| Empty | `document.getElementById('btn-empty').click()` | Baseline. Renderer with no LEDs. Any alternative that regresses this has added cost to the "nothing happening" path. |
| 1 LED on | `window.display.setLedOverride(0, 0, 1)` | Discontinuity probe. Current bulk-lights gate pays the **full 36-light cost for one LED**. Most alternatives in 4.1/4.3/4.4/4.5/4.18 are specifically designed to flatten this step. |
| All LEDs on | apply `createAllOnState()` from `example/presets.ts` | Worst-case sustained cost. Confirms the alternative's ceiling under maximum scene load. |

**Canvas-size sensitivity.** The dominant cost on most alternatives is per-fragment. Test at the canvas size that *matters*:
- ~1.7 M backing pixels (Display example default at DPR 2) — quick iteration baseline.
- ~7.84 M backing pixels (Retina full-window via Controller emulator, or use `mcp__chrome-devtools__resize_page(2000, 2000)` then force `.t3v-wrapper` visible) — the canonical "is this actually fast enough for the user" check, per framerate-issue.md §13.1.

An alternative that hits v-sync at 1.7M but craters at 7.84M has not solved the problem.

**Expected signals per alternative class** (use to verify the alternative did what it claimed):

| Alternatives | Expected `visiblePointLights` after change | Expected `programs` change | Expected `bloomTotalMs` change | Other signals to verify |
|---|---|---|---|---|
| 4.1, 4.11 (remove PointLights) | 0 (always) | One-shot recompile on first scenario, then stable at new count | Unchanged (4.1) or undefined (4.11 drops bloom) | proxy material change (`MeshBasicMaterial` → `MeshStandardMaterial` if combined with 4.16) |
| 4.2 (`onBeforeCompile` cull) | 36 (unchanged) | +1 program (the patched material variant) on first render, stable after | Unchanged | `frameMs.median` drops while `visiblePointLights` stays 36 — that's the smoking gun the patch is active |
| 4.3 (fixed pool of N) | N (e.g. 8 or 16, constant) | Stable once gate is generalised | Unchanged | Test 1-LED vs Many-LEDs: 1-LED should drop dramatically (now O(N) per fragment instead of O(36)) |
| 4.4 (2 directional lights) | 0; `visibleDirectionalLights` not in PerfReport — capture via `evaluate_script` if needed | One-shot recompile to new (0 point, 2 directional) hash, then stable | Unchanged | DirectionalLights are global — 1-LED and All-LEDs should produce identical fragment cost |
| 4.5 (LightProbe) | 0 | One-shot recompile, then stable | Unchanged | No DirectionalLight count change either; cost should be near-Empty regardless of LED state |
| 4.8, 4.14 (drop bloom) | depends on combination | n/a | undefined (bloom disabled) | `bloomEnabled: false` in report; the bloom column drops |
| 4.13 (cube-camera env map) | 0 | One-shot recompile | Unchanged | `drawCalls` jumps by 6× per CubeCamera update — a new cost line worth flagging; trade-off check |
| 4.16 (`MeshStandardMaterial` emissive) | unchanged | One-shot recompile (new material) | Unchanged | Marginal; mostly a "before/after looks the same" check |
| 4.18 (12-light consolidation) | 0 (empty/idle) or 12 (any LED on, gate open) | New stable count = 12 (vs current 30) after one-shot recompile | Unchanged | 1-LED cost should drop to ~3× lower than today (12 / 36 ratio per §3) |

For fields the standard PerfReport doesn't capture (DirectionalLight count, shadow-map count, cube-camera render-target size, custom shader chunks injected), supplement the report with a `mcp__chrome-devtools__evaluate_script` snippet that reads them directly off the scene graph or renderer.info — and add the captured value to the report as a custom row.

## References

- `docs/framerate-issue.md` §5 (`PerfReport` field reference), §5.3 (decision tree, source for this skill's tree), §7 & §13.5 (exemplar report tables), §13.6 (why the current 36-light cost is a known ceiling), §14 (popup-window-specific diagnostics).
- `docs/lighting-alternatives.md` — the menu of replacement designs. §5.8 has the canonical success criterion this skill reproduces.
- `src/3d/Tower3DView.ts` `PerfReport` / `PerfStat` type definitions (~line 138-180), `collectPerfReport` implementation (~line 734).
- `tests/unit/Tower3DView.test.ts` — `collectPerfReport` shape assertion, sanity reference for the returned fields.
- `docs/LIGHTING.md` (current implementation), `docs/RENDERERS.md`, `docs/TROUBLESHOOTING.md` for tuning knobs the interpretation may point to.
- `example/presets.ts` — `createDefaultTowerState`, `createAllOnState`, `createEmptyState` for constructing states for `applyState`. `LIGHT_EFFECTS` enum is re-exported from `ultimatedarktower` (values: off=0, on=1, breathe=2, breatheFast=3, breathe50percent=4, flicker=5).
