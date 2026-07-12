# Lighting alternatives — testing plan

> **Status: planning doc.** Defines the bake-off workflow. Companion to [lighting-alternatives.md](lighting-alternatives.md) (the research menu) and the [`darktower-3d-perf`](../.claude/skills/darktower-3d-perf/SKILL.md) skill (the perf capture protocol). No code is changed by this doc itself.

## 1. Purpose & scope

[lighting-alternatives.md](lighting-alternatives.md) enumerates 19 design options that could replace or simplify the current 36-PointLight system (the perf ceiling documented in [framerate-issue.md §13](framerate-issue.md#13-the-sequence-perf-cliff)). That doc is research-only.

This plan turns the recommended subset of those options into an executable, comparable, branch-isolated bake-off:

- Each candidate is implemented on its own branch `lighting/<section>-<slug>`.
- Result documents (perf reports, screenshots, summary) live on **`main`**, landed via small docs-only PRs as each branch finishes capture — so all results are visible without checking out a single experiment branch.
- A running summary at [`docs/lighting-experiments/RESULTS.md`](lighting-experiments/RESULTS.md) (created when the baseline lands) gives the one-table comparison.
- At decision time we pick the winner, squash-merge its code branch to `main`, and leave the losing branches tagged and unmerged.

**Scope — 8 alternatives, both recommended paths from §6 of lighting-alternatives.md:**

- **Path A (conservative):** [4.18](#42-418--twelve-lights), [4.16](#43-416--emissive-standard), [4.2](#44-42--range-cull), [4.5](#45-45--light-probe)
- **Path B (paradigm replacement):** [4.1](#46-41--hdr-proxies), [4.4](#47-44--two-directional), [4.19](#48-419--interior-sprites), [4.11](#49-411--min-cost-combo)

The deferred options (4.3, 4.6, 4.7, 4.8, 4.9, 4.10, 4.12, 4.13, 4.14, 4.15, 4.17) are out of scope until/unless Paths A and B both miss target.

### Success criterion (verbatim from [lighting-alternatives.md §5.8](lighting-alternatives.md#58-verification-recipe))

> The replacement must **beat the sequence fps without regressing idle fps** and without growing `programs` over time.

Stated as a gate: a candidate **fails** if any of these are true after change vs baseline (same machine, same canvas):

- `frameMs.median` increased on the **Empty** or **Idle** windows;
- `programs` continues to grow across repeated sequence starts (a one-shot recompile is fine);
- and it **passes** only if sequence `frameMs.median` decreased meaningfully.

A candidate that improves the sequence at the expense of idle has not won — it has moved the cost.

## 2. Workflow per alternative

Each candidate produces **two PRs**: a code PR (held in draft until decision time) and a docs-only PR (merges to `main` immediately so results are visible).

1. **Cut branch from `main`** (not from another experiment branch):
   `git checkout main && git pull && git checkout -b lighting/<section>-<slug>`
2. **Sanity baseline capture** on the branch before any changes — confirms the machine/canvas state matches `00-baseline.md`. Don't commit these numbers; they're for sanity only.
3. **Implement** the alternative. Only files in the entry's "Primary files" list should change. **Rule: no other config changes.** No tweaks to `bloom.resolutionScale`, camera, DPR, audio config, etc. — anything else invalidates the perf comparison.
4. **Update unit tests** if the alternative changes light counts/types — see [tests/unit/Tower3DView.test.ts](../tests/unit/Tower3DView.test.ts) and [tests/**mocks**/three.js](../tests/__mocks__/three.js). `npm test` must pass on the branch before the report is final.
5. **Capture post-change report** at both canvas sizes via the [darktower-3d-perf](../.claude/skills/darktower-3d-perf/SKILL.md) skill (full Empty / 1-LED / All-LEDs triplet + sequence-5). **Ambiguity rule:** if any scenario's fps is within ~5% of baseline, recapture 2 more times and use the median; record the per-run numbers in "Notable observations."
6. **Visual screenshot pair** (baseline + after, mid-sequence-5) if the alternative is flagged as visual-difference risk: 4.1, 4.4, 4.11, 4.19, anything that drops bloom. Save under `docs/lighting-experiments/screenshots/<section>-<slug>-{baseline,after}.png`.
7. **Open the code PR** as **draft** off `main`. Title: `lighting: <section> <name> (experiment)`. Body links to the result MD that will land on main. Don't merge until the decision phase.
8. **Open a docs-only PR** (separate branch: `lighting-docs/<section>-<slug>`) that lands on `main`:
   - Adds `docs/lighting-experiments/<section>-<slug>.md`
   - Adds the screenshot pair (if applicable)
   - Updates the row in [`docs/lighting-experiments/RESULTS.md`](lighting-experiments/RESULTS.md)
   - Updates the [branch ledger](#5-branch-ledger) below
     Merges immediately. Once merged, anyone on `main` reads the result without checking out the experiment branch.

If an experiment turns out infeasible, mark `Status: abandoned` in the result MD with a one-paragraph post-mortem and land it via the same docs-only PR pattern. **Don't delete the branch** — it preserves the negative result.

**Thermal-throttling note.** If running multiple experiments serially on one machine, give the GPU a 60–90s idle break between Retina-full-window sequence-5 captures. Throttled numbers misrepresent the alternative.

## 3. Test protocol

Delegated entirely to the [`darktower-3d-perf` skill](../.claude/skills/darktower-3d-perf/SKILL.md) — that file is the source of truth for capture mechanics. This plan adds only the lighting-experiment specifics:

- **Perf scenarios.** Empty / 1-LED / All-LEDs triplet + sequence-5 (angryStrobe01), per the skill's "When evaluating a lighting alternative" section.
- **Canvas sizes.** Both:
  - Display example default (~1.7 M backing px at DPR 2)
  - Retina full-window (~7.84 M backing px) — set via `mcp__chrome-devtools__resize_page(2000, 2000)` then force `.t3v-wrapper` visible per the skill's preflight step 3.
- **Visual capture** (only for flagged alternatives — see workflow step 6). Side-by-side baseline-vs-after, mid-sequence-5, via `mcp__chrome-devtools__take_screenshot`. Perf data alone does not catch "looks different now."
- **Dev server.** The perf skill requires `npm run dev:example` running. Per the skill, the **user** starts it (working tree may not be clean); the agent does not start it autonomously.
- **Reproducibility metadata.** Every result MD records `Captured on: <machine> | <OS + version> | <browser + version> | <date ISO>`.

## 4. Baseline

Baseline is captured **directly from `main` at a known SHA** — no `lighting/00-baseline` branch needed since it's docs-only.

- Run the full triplet + sequence-5 at both canvas sizes on `main`.
- Open a docs-only PR off `main` that adds [`docs/lighting-experiments/00-baseline.md`](lighting-experiments/00-baseline.md) and initialises [`docs/lighting-experiments/RESULTS.md`](lighting-experiments/RESULTS.md). The result MD records the `main` SHA it was captured against.
- Every per-alternative result references that SHA.

**Re-baselining on main drift.** If `main` advances in any of `src/3d/`, `src/3d/BloomManager.ts`, `src/3d/Tower3DView.ts`, `src/3d/SealManager.ts`, `src/3d/LedEffectAnimator.ts`, or `tests/`, the baseline is re-captured. The latest baseline always sits at `00-baseline.md`; the prior file moves to `00-baseline-<short-sha>.md` and stays for history. Every active experiment branch then rebases onto current `main` and **recaptures** before its report is considered final.

## 5. Branch ledger

Updated by each branch's docs-only PR. (Largely redundant with [`RESULTS.md`](lighting-experiments/RESULTS.md) — see note below the table.)

| Section     | Branch                                               | Status   | Result file                                             | Winner? |
| ----------- | ---------------------------------------------------- | -------- | ------------------------------------------------------- | ------- |
| 00 baseline | (no branch — captured on `main@3ab257f`, 2026-05-23) | captured | [`00-baseline.md`](lighting-experiments/00-baseline.md) | n/a     |
| 4.18        | `lighting/4.18-twelve-lights`                        | pending  | `4.18-twelve-lights.md`                                 |         |
| 4.16        | `lighting/4.16-emissive-standard`                    | pending  | `4.16-emissive-standard.md`                             |         |
| 4.2         | `lighting/4.2-range-cull`                            | pending  | `4.2-range-cull.md`                                     |         |
| 4.5         | `lighting/4.5-light-probe`                           | pending  | `4.5-light-probe.md`                                    |         |
| 4.1         | `lighting/4.1-hdr-proxies`                           | pending  | `4.1-hdr-proxies.md`                                    |         |
| 4.4         | `lighting/4.4-two-directional`                       | pending  | `4.4-two-directional.md`                                |         |
| 4.19        | `lighting/4.19-interior-sprites`                     | pending  | `4.19-interior-sprites.md`                              |         |
| 4.11        | `lighting/4.11-min-cost-combo`                       | pending  | `4.11-min-cost-combo.md`                                |         |

Statuses: `pending` → `implemented` → `report-complete` → `merged` | `abandoned`.

> The ledger emphasises _branch state_; [`RESULTS.md`](lighting-experiments/RESULTS.md) emphasises _measured outcome_. If both feel duplicative once in use, fold the ledger into `RESULTS.md` and remove this section.

## 6. Result MD template

Every per-alternative result MD on `main` follows this shape:

```markdown
# <section> — <name>

**Branch:** lighting/<section>-<slug> (link to compare view vs main)
**Status:** baseline-captured | implemented | report-complete | merged | abandoned
**Implementer:** <name>
**Captured on:** <machine> | <OS + version> | <browser + version> | <date ISO>
**Baseline reference:** docs/lighting-experiments/00-baseline.md @ main@<short-sha>

## Implementation summary

Bullet list of what changed (files, lines). Link to the diff vs main.

## Baseline (excerpted from 00-baseline.md)

Inline copy of the relevant baseline rows so this file is self-contained.

## Results — Display canvas (~1.7 M backing px)

<perf-skill report tables for Empty / 1-LED / All-LEDs / Sequence-5>

## Results — Retina full-window (~7.84 M backing px)

<same set of reports at the larger canvas>

## Visual capture (visual-difference-risk alternatives only)

![baseline](screenshots/<section>-<slug>-baseline.png)
![after](screenshots/<section>-<slug>-after.png)

## Unit tests

- `npm test` result on this branch: pass | fail
- Tests touched: <list of files>

## Interpretation

One paragraph: did it beat the success criterion? Any regression on idle/empty? `programs` stable?

## Notable observations / risks

Free-form. Visual deltas, recompile pops, ambiguity-rule recaptures, anything to flag at decision time.
```

## 7. RESULTS.md template

The running summary table on `main`. Initialised by the baseline PR; each branch's docs-only PR appends/updates its row.

```markdown
# Lighting alternatives — running results

**Baseline:** [00-baseline.md](00-baseline.md) — captured main@<sha>

|    § | Alternative   | Status          | scenario fps Δ (Display) | scenario fps Δ (Retina) | idle/empty regress? | programs stable? | Visual delta | Result file                                    |
| ---: | ------------- | --------------- | -----------------------: | ----------------------: | ------------------- | ---------------- | ------------ | ---------------------------------------------- |
| 4.18 | twelve-lights | report-complete |                      +X% |                     +Y% | no                  | yes              | none         | [4.18-twelve-lights.md](4.18-twelve-lights.md) |
|    … |               |                 |                          |                         |                     |                  |              |                                                |

**Current leader (provisional):** <link to result file> — see Decision section in this plan.
```

## 8. Per-alternative entries

Path A → Path B order, matching [lighting-alternatives.md §6](lighting-alternatives.md#6-recommended-next-experiments) recommended escalation.

**Two alternatives need special framing** — call this out in their result MDs:

- **4.16 standalone is a building-block validation, not a perf candidate.** `MeshStandardMaterial` is marginally _more_ expensive per fragment than `MeshBasicMaterial` — its success criterion is **visual parity + no `programs` growth + tests pass**, NOT "frameMs improves." It exists in the bake-off to confirm it's safe to combine with 4.1 / 4.18 later.
- **4.11 is defined as `4.1 + 4.4 + 4.8` combined.** Its result is only meaningful when read alongside the 4.1 and 4.4 results — if 4.1 alone hits target, 4.11's added information is purely "what does dropping bloom buy us on top?" Note this in its result MD's Interpretation section.

Each entry below follows the same shape: **Source**, **Branch**, **Result file**, **Implementation sketch**, **Test plan**, **Success criterion**, **Risks to watch**.

### 8.1 4.18 — twelve-lights

- **Source:** [lighting-alternatives.md §4.18](lighting-alternatives.md#418-consolidated-12-lights-design-one-pointlight-per-seal-ledgebase-as-emissive-dots)
- **Branch:** `lighting/4.18-twelve-lights`
- **Result file:** `docs/lighting-experiments/4.18-twelve-lights.md`
- **Implementation sketch:** Remove the 12 ring + 12 ledge/base `PointLight` constructions in [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts) `buildLeds`. Keep the 12 seal accent lights in [src/3d/SealManager.ts](../src/3d/SealManager.ts) `buildSealBacklights`. Skip the `redLight.intensity =` write in [src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts) when `redLight` is null. Bulk lights gate state moves from 0↔36 to 0↔12 — keep the prewarm.
- **Test plan:** Full triplet at both canvas sizes. **Expected signal** (from perf skill): `visiblePointLights` → 12 when gate open; `programs` stable at the new count after one-shot recompile; 1-LED cost should drop ~3× (12/36).
- **Success criterion:** sequence `frameMs.median` drops ≥ 60% on Retina full-window; idle/empty unchanged; `programs` stable across 3 repeated sequence transitions.
- **Risks to watch:** Loss of ledge/base spill (subtle — those PointLights were at `cornerNearSurfaceRadius=0.52`, mostly casting outward). 12 lights still in the shader hash — prewarm both gate states.

### 8.2 4.16 — emissive-standard

- **Source:** [lighting-alternatives.md §4.16](lighting-alternatives.md#416-emissive-proxies-via-meshstandardmaterial)
- **Branch:** `lighting/4.16-emissive-standard`
- **Result file:** `docs/lighting-experiments/4.16-emissive-standard.md`
- **Implementation sketch:** Switch proxy mesh material in [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts) (or [src/3d/SealManager.ts](../src/3d/SealManager.ts) depending on which proxies you target) from `MeshBasicMaterial` → `MeshStandardMaterial({ emissive, emissiveIntensity, toneMapped: false })`. Change driver-write from `color.r` to `emissiveIntensity` in [src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts).
- **Test plan:** Full triplet at both canvas sizes. **Expected signal:** one-shot recompile (new material), then stable. Marginal perf cost increase is acceptable.
- **Success criterion (specialised — building-block validation):** visual parity vs baseline; `programs` stable after one-shot recompile; `npm test` passes. **No perf-improvement requirement.**
- **Risks to watch:** Adds 12 lit meshes — confirm they don't interact with the bulk lights gate in unexpected ways. Exposure may need retuning (`toneMapped: false` preserves the existing behavior).

### 8.3 4.2 — range-cull

- **Source:** [lighting-alternatives.md §4.2](lighting-alternatives.md#42-onbeforecompile-range-cull-shader-patch-keep-all-36-pointlights)
- **Branch:** `lighting/4.2-range-cull`
- **Result file:** `docs/lighting-experiments/4.2-range-cull.md`
- **Implementation sketch:** Add a `material.onBeforeCompile` hook to the drum-interior `MeshStandardMaterial` (in [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts) where the GLB is loaded). Patch the `lights_fragment_begin` chunk with the range-check `continue` from §4.2 of the research doc. Per-material scope only — don't touch `THREE.ShaderChunk` globally.
- **Test plan:** Full triplet at both canvas sizes. **Expected signal (the smoking gun):** `frameMs.median` drops meaningfully while `visiblePointLights` stays at **36**. If lights drop, the patch isn't doing what you think.
- **Success criterion:** sequence `frameMs.median` drops ≥ 30% on Retina full-window with `visiblePointLights` unchanged; `programs` adds 1 (the patched variant) then stable.
- **Risks to watch:** Tied to the installed three.js version's chunk internals; document the version in the result MD. Lights with `distance: 0` would misbehave — we always set `distance`, but assert it.

### 8.4 4.5 — light-probe

- **Source:** [lighting-alternatives.md §4.5](lighting-alternatives.md#45-lightprobe-for-interior-spill-spherical-harmonics)
- **Branch:** `lighting/4.5-light-probe`
- **Result file:** `docs/lighting-experiments/4.5-light-probe.md`
- **Implementation sketch:** Drop the 12 seal accent `PointLight`s in [src/3d/SealManager.ts](../src/3d/SealManager.ts) `buildSealBacklights`. Add one `THREE.LightProbe` to the scene. Write a small SH-from-point-emitters helper that updates the probe's 27 SH coefficients each frame from the 12 LED positions × colors × intensities. Wire into the per-frame update path in [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts).
- **Test plan:** Full triplet at both canvas sizes. **Expected signal:** `visiblePointLights` → 0; one-shot recompile then stable; cost should be near-Empty regardless of LED state (the All-LEDs scenario should not produce meaningful fragment-cost growth over 1-LED).
- **Success criterion:** sequence `frameMs.median` drops ≥ 60% on Retina full-window; idle/empty unchanged; spill visually present (probe drives the drum's `MeshStandardMaterial`).
- **Risks to watch:** No directional shadow — per-seal hot spots disappear. May need to combine with 4.4 (two directionals) for highlights. SH math is new code; cover with a unit test on the analytical update.

### 8.5 4.1 — hdr-proxies

- **Source:** [lighting-alternatives.md §4.1](lighting-alternatives.md#41-hdr-color-proxies--raised-bloom-threshold-no-pointlights)
- **Branch:** `lighting/4.1-hdr-proxies`
- **Result file:** `docs/lighting-experiments/4.1-hdr-proxies.md`
- **Implementation sketch:** Remove the 36 `PointLight` constructions in [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts) and [src/3d/SealManager.ts](../src/3d/SealManager.ts). Push proxy color into HDR (`color.setRGB(2, 0, 0)` on the existing `MeshBasicMaterial` + `toneMapped: false`). Raise `UnrealBloomPass.threshold` from `0.0` → `~1.0` in [src/3d/BloomManager.ts](../src/3d/BloomManager.ts). Animate proxy color in [src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts).
- **Test plan:** Full triplet at both canvas sizes. **Expected signal:** `visiblePointLights` → 0; bloom column unchanged; visual delta likely (spill loss) — capture screenshot pair.
- **Success criterion:** sequence `frameMs.median` at v-sync cap (≤ 16.7 ms) on Retina full-window; idle/empty unchanged; visual evaluation acceptable OR clearly addressable by pairing with 4.4/4.19.
- **Risks to watch:** **Interior spill loss is the load-bearing concern** (§4.1's "key tradeoff"). The screenshot pair is mandatory. May need to combine with 4.4 / 4.19 before the result is usable.

### 8.6 4.4 — two-directional

- **Source:** [lighting-alternatives.md §4.4](lighting-alternatives.md#44-two-directionallights-instead-of-36-pointlights)
- **Branch:** `lighting/4.4-two-directional`
- **Result file:** `docs/lighting-experiments/4.4-two-directional.md`
- **Implementation sketch:** Replace 36 `PointLight`s with 2 `DirectionalLight`s positioned inside the drum in [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts). Intensity driven by `max(driver.v)` across all LEDs via the existing bulk lights gate machinery (`updateLightsGate` / `setBulkLightsVisible` / `prewarmLightPrograms`) generalised for directional lights. Keep emissive proxies + halos.
- **Test plan:** Full triplet at both canvas sizes. **Expected signal:** `visiblePointLights` → 0. `visibleDirectionalLights` (not in PerfReport — capture via `evaluate_script`) → 2. **1-LED and All-LEDs fragment cost should be nearly identical** because the lights are global. Capture screenshot pair — spill character will differ.
- **Success criterion:** sequence `frameMs.median` at v-sync cap on Retina full-window; idle/empty unchanged; visual evaluation accepts the global-spill character (one LED breathing lights the whole drum interior).
- **Risks to watch:** Loss of per-seal locality — biggest visual change. 2 directionals are in the shader hash; gate carefully and prewarm both program variants.

### 8.7 4.19 — interior-sprites

- **Source:** [lighting-alternatives.md §4.19](lighting-alternatives.md#419-interior-atmospheric-sprites-additive-blob-texture)
- **Branch:** `lighting/4.19-interior-sprites`
- **Result file:** `docs/lighting-experiments/4.19-interior-sprites.md`
- **Implementation sketch:** Extend [src/3d/SealManager.ts](../src/3d/SealManager.ts) `buildSealBacklights` to add 1–3 large additive `Sprite`s **inside** the drum per seal (same `radius × 0.15` position as the existing seal accent light). Reuse the existing radial-gradient `CanvasTexture` cache (`getOrCreateGradientTexture`). Extend `setSealLed` to drive interior-sprite opacity from `driverV * cfg.interior.opacity`. New config knob `ResolvedLightingConfig.leds.sealBacklights.interior = { enabled, count, sizeFactor, opacity }` — off by default. Remove the 12 seal accent `PointLight`s.
- **Test plan:** Full triplet at both canvas sizes. **Expected signal** (this row needs to be added to the perf skill's expected-signals table — see [§9](#9-perf-skill-update)): `visibleSprites` up by ~12–36 vs baseline; `visiblePointLights` → 0 (or down by 12 if paired with 4.18-style retention of ring lights); **no shader recompile** (sprites are outside the lights hash).
- **Success criterion:** sequence `frameMs.median` drops ≥ 50% on Retina full-window; idle/empty unchanged; visual evaluation accepts the billboard fake (not surface-conforming).
- **Risks to watch:** Camera-aligned billboards don't conform to drum interior wall — close-inspection visual gap. Additive saturation when sprites overlap — tune `interior.opacity` carefully. Depth-sort fragility with `depthWrite: false` — interior sprites need `renderOrder` between drum body and exterior halos.

### 8.8 4.11 — min-cost-combo

- **Source:** [lighting-alternatives.md §4.11](lighting-alternatives.md#411-minimal-cost-combo-drop-bloom--2-directional--bright-proxies)
- **Branch:** `lighting/4.11-min-cost-combo`
- **Result file:** `docs/lighting-experiments/4.11-min-cost-combo.md`
- **Implementation sketch:** **Combines 4.1 + 4.4 + 4.8.** All 36 `PointLight`s removed; 2 `DirectionalLight`s added; bloom pipeline disabled in [src/3d/BloomManager.ts](../src/3d/BloomManager.ts). Bright `MeshBasicMaterial` proxies. Halos already use additive blending so they read as glow without bloom amplification.
- **Test plan:** Full triplet at both canvas sizes. **Expected signal:** `bloomEnabled: false` in the PerfReport — the bloom column drops from the report entirely. `visiblePointLights` → 0. **Mandatory screenshot pair** — this is the most visual-change-heavy candidate.
- **Success criterion (specialised — read alongside 4.1 and 4.4):** sequence `frameMs.median` at v-sync cap at any canvas; idle/empty unchanged; visual evaluation accepts the dramatic look change. Decision-relevance is **incremental over 4.1+4.4** (what does dropping bloom add?).
- **Risks to watch:** Biggest visual character shift in the bake-off — the dropped bloom-amplified glow is fundamental to the current aesthetic. Useful only if the user explicitly approves the look.

## 9. Perf skill update

The [`darktower-3d-perf` skill's](../.claude/skills/darktower-3d-perf/SKILL.md) "Expected signals per alternative class" table already covers 4.1, 4.2, 4.4, 4.5, 4.11, 4.16, 4.18 (verified against lines 164–172). **Only 4.19 needs a new row**, to be added on the `lighting/4.19-interior-sprites` branch as part of its docs-only PR:

| Alternatives                        | Expected `visiblePointLights` after change                      | Expected `programs` change                     | Expected `bloomTotalMs` change | Other signals to verify                                                                    |
| ----------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| 4.19 (interior atmospheric sprites) | 0 (if all PointLights removed) or 12 (if seal accents retained) | **None** — sprites are outside the lights hash | Unchanged                      | `visibleSprites` up by ~12–36; depth-sort hygiene check (no z-fighting with drum interior) |

Per the skill's closing instruction: _"If you change anything in this doc that affects how alternatives should be measured … update SKILL.md too."_

## 10. Time budget

Multi-week initiative. Effort estimates from [§4 of lighting-alternatives.md](lighting-alternatives.md#4-the-menu-of-alternatives-detail):

|    § | Alternative       | Effort    |
| ---: | ----------------- | --------- |
| 4.16 | emissive-standard | ~1 day    |
|  4.2 | range-cull        | ~1 day    |
| 4.11 | min-cost-combo    | ~2 days   |
|  4.4 | two-directional   | ~2 days   |
| 4.19 | interior-sprites  | ~1–2 days |
| 4.18 | twelve-lights     | ~3 days   |
|  4.1 | hdr-proxies       | ~3 days   |
|  4.5 | light-probe       | ~1 week   |

Serial: ~3–4 weeks. Parallel across contributors: less, since each branch is independent. Nothing in the workflow forces serial execution.

## 11. Selection & merge (decision)

1. **Open [`RESULTS.md`](lighting-experiments/RESULTS.md) on `main`** — all results are already there. No branch hopping needed.
2. **Apply the success criterion gate** from [§1](#success-criterion-verbatim-from-lighting-alternativesmd-58). Drop any alternative that regressed idle/empty or grew `programs`.
3. **Pick the winner** from the surviving set on perf win + visual quality + implementation footprint. Annotate the winning row in `RESULTS.md` with `**WINNER**`; mark the branch-ledger row `Winner?: ✅`.
4. **Final dry-run** — rebase the winning branch onto current `main`, recapture the triplet once more at Retina full-window. If the result still holds, proceed.
5. **Take the winning code PR out of draft and squash-merge.** Commit body links to the winning result MD (already on main) as the decision record.
6. **Archive losers.** Add a final-status line to each loser's result MD via one last docs-only PR. Tag each loser branch with `lighting-experiment-<section>-final`; the branch can then be deleted from origin without losing the snapshot. The tag stays for archaeological reference.
7. **Keep `docs/lighting-experiments/`** in-tree as historical record — preserves the bake-off decision audit trail. (Optional cleanup is allowed but the default is to retain.)

## 12. Critical files (reference)

- [lighting-alternatives.md](lighting-alternatives.md) — research menu; §6 ordering; §5.8 success criterion.
- [framerate-issue.md](framerate-issue.md) — §3 shader-recompile trap; §13 perf cliff baseline.
- [LIGHTING.md](LIGHTING.md) — current implementation reference.
- [../.claude/skills/darktower-3d-perf/SKILL.md](../.claude/skills/darktower-3d-perf/SKILL.md) — perf capture protocol.
- [../src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts) — orchestration, bulk lights gate, prewarm.
- [../src/3d/SealManager.ts](../src/3d/SealManager.ts) — seal proxies, halos, accent lights.
- [../src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts) — driver write path.
- [../src/3d/BloomManager.ts](../src/3d/BloomManager.ts) — two-composer pipeline, bloom threshold.
- [../example/presets.ts](../example/presets.ts) — `createEmptyState`, `createAllOnState` for the triplet.
- [../tests/unit/Tower3DView.test.ts](../tests/unit/Tower3DView.test.ts), [../tests/**mocks**/three.js](../tests/__mocks__/three.js) — tests requiring updates when light counts/types change.
