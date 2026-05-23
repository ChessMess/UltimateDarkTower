# Lighting alternatives — running results

Running summary of the lighting bake-off defined by [docs/lighting-testing-plan.md](../lighting-testing-plan.md). Each branch's docs-only PR appends/updates its row here. The full reading is in the linked result file.

**Baseline:** [00-baseline.md](00-baseline.md) — captured `main@3ab257f` on 2026-05-23. All deltas in the table below are computed *vs* that baseline at matching canvas size on the same machine + same chrome-devtools-mcp browser.

**Success criterion gate (from [lighting-alternatives.md §5.8](../lighting-alternatives.md#58-verification-recipe)):** the replacement must beat the sequence `frameMs` *without* regressing idle/empty `frameMs`, and `programs` must not grow over repeated sequence transitions. An alternative that improves sequence fps at the cost of idle regression has not won — it has moved the cost.

## Summary table

`scenario fps Δ` is computed at Sequence-5 (angryStrobe01); `idle/empty regress?` means the Empty window's `frameMs.median` worsened vs baseline; `programs stable?` means `programs` did not grow across the captured windows.

| § | Alternative | Status | scenario fps Δ (Display ~1.84 M) | scenario fps Δ (Retina ~8.08 M) | idle/empty regress? | programs stable? | Visual delta | Result file |
|---:|---|---|---:|---:|---|---|---|---|
| 00 | baseline | baseline-captured | n/a | n/a | n/a | yes | n/a | [00-baseline.md](00-baseline.md) |
| 4.18 | twelve-lights | pending | — | — | — | — | — | `4.18-twelve-lights.md` |
| 4.16 | emissive-standard | pending | — | — | — | — | — | `4.16-emissive-standard.md` |
| 4.2  | range-cull | pending | — | — | — | — | — | `4.2-range-cull.md` |
| 4.5  | light-probe | pending | — | — | — | — | — | `4.5-light-probe.md` |
| 4.1  | hdr-proxies | pending | — | — | — | — | — | `4.1-hdr-proxies.md` |
| 4.4  | two-directional | pending | — | — | — | — | — | `4.4-two-directional.md` |
| 4.19 | interior-sprites | pending | — | — | — | — | — | `4.19-interior-sprites.md` |
| 4.11 | min-cost-combo | pending | — | — | — | — | — | `4.11-min-cost-combo.md` |

Statuses: `baseline-captured` (this file only) → `pending` → `implemented` → `report-complete` → `merged` | `abandoned`.

**Current leader (provisional):** none yet — only baseline is captured. The first alternative to land per the [§6 ordering](../lighting-alternatives.md#6-recommended-next-experiments) is `4.18 twelve-lights` (Path A).

## Baseline numbers (excerpted from `00-baseline.md` for at-a-glance reference)

Display canvas (~1.84 M backing px) on `main@3ab257f`:

| Scenario | fps | frameMs.median | visiblePointLights | programs |
|---|---:|---:|---:|---:|
| Empty | 120 | 8.3 | 0 | 30 |
| 1-LED | 13.8 | 74.1 | 36 | 30 |
| All-LEDs | 14.9 | 66.6 | 36 | 30 |
| Sequence-5 | 13.1 | 75.1 | 36 | 30 |

Retina full-window (~8.08 M backing px) on `main@3ab257f`:

| Scenario | fps | frameMs.median | visiblePointLights | programs |
|---|---:|---:|---:|---:|
| Empty | 105.3 | 8.3 | 0 | 30 |
| 1-LED | 7.1 | 140.2 | 36 | 30 |
| All-LEDs | 7.0 | 141.5 | 36 | 30 |
| Sequence-5 | 6.9 | 141.6 | 36 | 30 |

The full table (drawCalls, triangles, bloomTotalMs, scene composition, capture metadata) lives in [00-baseline.md](00-baseline.md).
