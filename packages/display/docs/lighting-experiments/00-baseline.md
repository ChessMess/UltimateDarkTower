# 00 — Baseline

**Branch:** none — captured directly on `main` (see [§4 of lighting-testing-plan.md](../lighting-testing-plan.md#4-baseline)).
**Status:** baseline-captured
**Implementer:** Chris Koerner
**Captured on:** Apple Silicon Mac (arm64) | macOS 26.4.1 (25E253) | Chrome 148.0.0.0 via chrome-devtools-mcp | 2026-05-23
**Main SHA at capture:** [`3ab257f`](https://github.com/ChessMess/UltimateDarkTowerDisplay/commit/3ab257f1b027cacd1f45e1e8c382cc365cc5d5ee) — "Testing plan + 3js upgrade"
**three.js version:** `0.184.0` (per `node_modules/three/package.json` on this commit)
**Tools:** `collectPerfReport(3000)` via `mcp__chrome-devtools__evaluate_script`. No chrome-devtools trace overlay.

## Implementation summary

Baseline — no code change. This document records the perf numbers `main` produces *before* any lighting alternative is implemented. Every per-alternative result in [`docs/lighting-experiments/`](.) references this file as its before-state and must record numbers captured at the same canvas sizes on the same machine.

If `main` advances in any of [src/3d/](../../src/3d/), [src/3d/BloomManager.ts](../../src/3d/BloomManager.ts), [src/3d/Tower3DView.ts](../../src/3d/Tower3DView.ts), [src/3d/SealManager.ts](../../src/3d/SealManager.ts), [src/3d/LedEffectAnimator.ts](../../src/3d/LedEffectAnimator.ts), or `tests/`, this baseline is re-captured per [§4 of the testing plan](../lighting-testing-plan.md#4-baseline) — the prior file moves to `00-baseline-<short-sha>.md` for history.

## Capture protocol

Per the [darktower-3d-perf skill](../../.claude/skills/darktower-3d-perf/SKILL.md). Each scenario is a `collectPerfReport(3000)` window. Scenarios:

| State | How it was set |
|---|---|
| Empty | `document.getElementById('btn-empty').click()` (applies `createEmptyState()`), settle 800–1000ms |
| 1-LED on | `window.display.setLedOverride(0, 0, 1)`, settle 800–1000ms |
| All-LEDs on | `document.getElementById('btn-allon').click()` (applies `createAllOnState()`), settle 800–1000ms |
| Sequence-5 (angryStrobe01) | `window.display.clearLedOverrides(); btn-empty.click()`, settle 800ms, `window.display.playSequence(5)`, settle 800–1000ms |

`playSequence(5)` is called directly on `window.display` rather than via `#btn-trigger-sequence` because the latter routes through `display.showIdle()` which toggles a UI panel that collapses `.t3v-wrapper` and invalidates the capture (see [darktower-3d-perf SKILL.md "Gotchas"](../../.claude/skills/darktower-3d-perf/SKILL.md#gotchas)).

## Results — Display canvas (~1.84 M backing px)

**Browser window:** 1440×900 (chrome-devtools-mcp). **Canvas:** 1390×1322 buffer / 694×659 CSS at DPR 2 — **1,837,580 backing px**. Close to the perf-skill's "Display example default ~1.7 M" target (within ~8%).

| Metric | Empty | 1-LED | All-LEDs | Sequence-5 |
|---|---:|---:|---:|---:|
| fps | 120 | 13.8 | 14.9 | 13.1 |
| frames | 360 | 41 | 44 | 39 |
| frameMs.median / p95 / max | 8.3 / 8.6 / 9.3 | 74.1 / 83.4 / 90.8 | 66.6 / 75.1 / 91.6 | 75.1 / 91.7 / 91.8 |
| bloomTotalMs.median / max | 0.7 / 2.0 | 1.0 / 3.5 | 0.6 / 1.0 | 0.9 / 3.3 |
| drawCalls.median / max | 91 / 91 | 95 / 95 | 187 / 187 | 187 / 187 |
| triangles.median / max | 1,648,143 / 1,648,143 | 1,648,307 / 1,648,307 | 1,652,079 / 1,652,079 | 1,652,079 / 1,652,079 |
| programs | 30 | 30 | 30 | 30 |
| scene.visiblePointLights | 0 | 36 | 36 | 36 |
| scene.visibleBloomMeshes | 0 | 1 | 24 | 12 |
| scene.visibleSprites | 0 | 1 | 24 | 12 |
| drivers.ledsActive | 0 | 1 | 24 | 12 |

## Results — Retina full-window (~8.08 M backing px)

**Browser window:** 3200×2400 requested → actual viewport 3200×870 (chrome-devtools-mcp caps height at ~870). **Canvas:** 4836×1670 buffer / 2416×833 CSS at DPR 2 — **8,076,120 backing px**. ~3% above the perf-skill's "Retina full-window ~7.84 M" target. `.t3v-wrapper` was forced visible (`display: flex !important; width: 100%; height: 100%;`) per the perf-skill preflight step 3, then `window.dispatchEvent(new Event('resize'))` triggered a renderer re-resize.

The canvas aspect here is wide-and-short (2416×833 CSS) rather than the square-ish ratio of a real Retina full-window — total backing pixel count is what matters for per-fragment cost, so this is comparable on the fragment-cost axis.

| Metric | Empty | 1-LED | All-LEDs | Sequence-5 |
|---|---:|---:|---:|---:|
| fps | 105.3 | 7.1 | 7.0 | 6.9 |
| frames | 316 | 21 | 21 | 21 |
| frameMs.median / p95 / max | 8.3 / 16.7 / 18.6 | 140.2 / 155.4 / 157.6 | 141.5 / 157.8 / 169.1 | 141.6 / 159.7 / 161.1 |
| bloomTotalMs.median / max | 0.6 / 3.8 | 0.5 / 0.7 | 0.7 / 1.1 | 0.6 / 0.9 |
| drawCalls.median / max | 91 / 91 | 95 / 95 | 187 / 187 | 187 / 187 |
| triangles.median / max | 1,648,143 / 1,648,143 | 1,648,307 / 1,648,307 | 1,652,079 / 1,652,079 | 1,652,079 / 1,652,079 |
| programs | 30 | 30 | 30 | 30 |
| scene.visiblePointLights | 0 | 36 | 36 | 36 |
| scene.visibleBloomMeshes | 0 | 1 | 24 | 4 |
| scene.visibleSprites | 0 | 1 | 24 | 4 |
| drivers.ledsActive | 0 | 1 | 24 | 4 |

## Visual capture

N/A for baseline — alternatives flagged as visual-difference risk (4.1, 4.4, 4.11, 4.19, anything that drops bloom) capture screenshot pairs against this baseline at capture time.

## Unit tests

N/A — baseline is docs-only, no code changes.

## Interpretation

The PointLight perf cliff documented in [framerate-issue.md §13](../framerate-issue.md#13-the-sequence-perf-cliff) is clearly reproduced:

- **Empty (0 PointLights)** runs near v-sync at both canvas sizes (120 fps Display, 105 fps Retina). The base scene is essentially free.
- **1-LED on** lights the gate (`visiblePointLights: 0 → 36`) and collapses fps. The bulk-lights gate pays the full 36-light fragment cost the moment one LED activates — the discontinuity the lighting alternatives in [§4](../lighting-alternatives.md#4-the-menu-of-alternatives-detail) are designed to flatten.
- **All-LEDs** is essentially the same cost as 1-LED at the lights-loop level (66.6–75.1ms median Display; 141.5ms median Retina) because `visiblePointLights` is 36 in both cases. The drawCalls jump (95 → 187) reflects 23 extra proxy + 23 extra sprite draws, but those are cheap; the fragment-loop dominates.
- **Sequence-5** confirms the same cost during a real sequence (75.1ms median Display, 141.6ms median Retina).
- **`programs` is stable at 30 across all 4 scenarios** at both canvas sizes — the bulk-lights gate prewarm machinery in `Tower3DView.prewarmLightPrograms()` is working. No recompiles fired during baseline. This is the "no recompile" half of the [§5.8 success criterion](../lighting-alternatives.md#58-verification-recipe) that every alternative must preserve.

The fps numbers here (13–15 fps at 1.84M; 7 fps at 8.08M with all 36 lights active) are markedly slower than the numbers cited in [framerate-issue.md §13.1](../framerate-issue.md#131-the-regression) (14–17 fps at 7.84M). The most likely cause is the chrome-devtools-mcp browser running with less GPU acceleration than the user's normal Chrome — see "Notable observations" below.

## Notable observations / risks

- **chrome-devtools-mcp Chrome vs. normal Chrome.** The 36-PointLight fragment cost in this capture session is roughly **2× worse than the user's normal Chrome at the same canvas size** (extrapolating from framerate-issue.md §13's numbers). chrome-devtools-mcp launches Chrome with a separate user-data-dir and likely runs with reduced GPU acceleration. **All alternative captures in the bake-off must use the same chrome-devtools-mcp Chrome** — otherwise the deltas are noise. The within-session-same-machine constraint is what makes the comparison valid; absolute numbers should not be compared against framerate-issue.md.
- **Viewport height capped at ~870 by chrome-devtools-mcp.** Even at requested `resize_page(3200, 2400)`, the actual viewport was 3200×870. To hit ≥7.84M backing px we resorted to a wide-and-short canvas (2416×833 CSS = 4836×1670 buffer). Per-fragment cost is what dominates the bake-off, so total backing pixel count (8.08M ≈ 7.84M ± 3%) is the comparable axis. Alternative captures must use the same viewport setup.
- **All-LEDs slightly faster than 1-LED at Display canvas** (66.6 vs 74.1 ms median, ~10% delta). Both have `visiblePointLights: 36`, so fragment-loop cost should be near-identical. The delta is likely capture-noise plus the extra-mesh-overhead being small. Not within the 5% ambiguity band, but flagged for awareness — at Retina canvas the two scenarios converge to 141.5 vs 140.2 ms (~1%).
- **bloomTotalMs is negligible at both canvas sizes** (median ≤ 1.0 ms). Confirms the [framerate-issue.md §13.6](../framerate-issue.md#136-known-minor-limitations) finding that bloom is not the dominant cost; the 36-PointLight fragment loop is.
- **canvas size of "Display" depends on browser-window size.** The skill's "~1.7 M Display default" is approximate — the exact number depends on the panel layout and chrome window size. Locking the browser size (here: 1440×900) is the only way to reproduce a stable Display canvas across captures.
- **No screenshot pair captured.** Baseline doesn't need one — alternatives capture their own pair against current `main`.
