// Lighting bake-off data module.
// Every numeric literal here is sourced from one of:
//   - docs/lighting-experiments/00-baseline.md
//   - docs/lighting-experiments/4.18-twelve-lights.md  (origin/lighting-docs/4.18-twelve-lights)
//   - docs/lighting-experiments/4.16-emissive-standard.md (origin/lighting-docs/4.16-emissive-standard)
//   - docs/lighting-experiments/4.2-range-cull.md       (origin/lighting-docs/4.2-range-cull)
//   - docs/lighting-experiments/4.5-light-probe.md      (origin/lighting-docs/4.5-light-probe)
//   - docs/lighting-experiments/4.1-hdr-proxies.md      (origin/lighting-docs/4.1-hdr-proxies)
//   - docs/lighting-experiments/4.4-two-directional.md  (origin/lighting-docs/4.4-two-directional)
//   - docs/lighting-experiments/4.19-interior-sprites.md (origin/lighting-docs/4.19-interior-sprites)
//   - docs/lighting-experiments/4.11-min-cost-combo.md  (on current docs branch)
// `// src:` comments mark non-obvious sourcing.

export const meta = {
  baselineSha: '3ab257f',
  baselineShaFull: '3ab257f1b027cacd1f45e1e8c382cc365cc5d5ee',
  baselineCommitMessage: 'Testing plan + 3js upgrade',
  captureMachine: 'Apple Silicon Mac (arm64)',
  captureOS: 'macOS 26.4.1 (25E253)',
  captureBrowser: 'Chrome 148.0.0.0 via chrome-devtools-mcp',
  captureDates: ['2026-05-23', '2026-05-24'], // baseline + Path A on 05-23; Path B on 05-24
  threeVersion: '0.184.0',
  canvases: {
    display: { cssW: 694, cssH: 659, bufW: 1390, bufH: 1322, dpr: 2, backingPx: 1837580 },
    retina:  { cssW: 2416, cssH: 833, bufW: 4836, bufH: 1670, dpr: 2, backingPx: 8076120 }, // baseline; alts vary ±2%
  },
  repoUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay',
  sources: {
    testingPlan: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-testing-plan.md',
    alternatives: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-alternatives.md',
    perfSkill:   'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/.claude/skills/darktower-3d-perf/SKILL.md',
    baseline:    'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/00-baseline.md',
    results:     'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/RESULTS.md',
  },
};

// Shape of every perf-row:
//   { fps, ms, p95, max, bloom, draws, tris }
//   where bloom is `null` when bloomEnabled=false (4.11 only).
// Programs is recorded separately under signals/programs.

export const baseline = {
  id: '00', slug: 'baseline', name: 'baseline', path: 'baseline',
  status: 'baseline-captured',
  shortDescription: '36 PointLights, full bloom — current main.',
  visualCharacter: 'per-seal hot spots + dark interstitial drum surface', // src: 4.11 comparison-to-prior-leaders table
  visualRiskFlag: false,
  sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/00-baseline.md',
  branchUrl: null,
  implementation: { loc: null, files: null, summary: 'No code change — baseline reference.', decisionOnScope: 'N/A.', knobsChosen: [] },
  display: {
    empty:   { fps: 120,  ms: 8.3,  p95: 8.6,  max: 9.3,  bloom: 0.7, draws: 91,  tris: 1648143 },
    oneLed:  { fps: 13.8, ms: 74.1, p95: 83.4, max: 90.8, bloom: 1.0, draws: 95,  tris: 1648307 },
    allLeds: { fps: 14.9, ms: 66.6, p95: 75.1, max: 91.6, bloom: 0.6, draws: 187, tris: 1652079 },
    seq5:    { fps: 13.1, ms: 75.1, p95: 91.7, max: 91.8, bloom: 0.9, draws: 187, tris: 1652079 },
  },
  retina: {
    empty:   { fps: 105.3, ms: 8.3,   p95: 16.7,  max: 18.6,  bloom: 0.6, draws: 91,  tris: 1648143 },
    oneLed:  { fps: 7.1,   ms: 140.2, p95: 155.4, max: 157.6, bloom: 0.5, draws: 95,  tris: 1648307 },
    allLeds: { fps: 7.0,   ms: 141.5, p95: 157.8, max: 169.1, bloom: 0.7, draws: 187, tris: 1652079 },
    seq5:    { fps: 6.9,   ms: 141.6, p95: 159.7, max: 161.1, bloom: 0.6, draws: 187, tris: 1652079 },
  },
  signals: { programs: 30, visiblePointLights: 36, visibleDirectionalLights: 1, bloomEnabled: true },
  programsStability: null, // not separately captured for baseline
  screenshots: null,
  tests: { result: 'n/a', count: null, touched: [] },
  interpretation:
    'PointLight perf cliff reproduced: empty runs near v-sync (120/105 fps), turning on 1 LED collapses fps to ~14/7 because the bulk-lights gate flips all 36 PointLights visible. `programs` stable at 30 — prewarm machinery works.',
  observations: [
    'chrome-devtools-mcp Chrome runs the 36-PointLight fragment loop ~2× worse than the user’s normal Chrome at the same canvas; absolute numbers are not comparable to framerate-issue.md but within-session deltas are.',
    'Viewport height capped at ~870 by chrome-devtools-mcp; baseline used 2416×833 CSS (~8.08 M backing px) to hit the ≥7.84 M Retina target.',
    'bloomTotalMs negligible (≤1.0 ms median) at both canvas sizes — the 36-PointLight fragment loop, not bloom, is the bottleneck.',
  ],
};

export const alternatives = [
  // ─────────────────────────────────────────── PATH A ───────────────────────────────────────────
  {
    id: '4.18', slug: '4.18-twelve-lights', name: 'twelve-lights', path: 'A',
    status: 'report-complete',
    shortDescription: 'Drop 24 of 36 PointLights; keep 12 seal accent PointLights.',
    visualCharacter: 'per-seal hot spots (12 of them) + dark interstitial', // src: 4.11 comparison table
    visualRiskFlag: false,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.18-twelve-lights.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.18-twelve-lights',
    implementation: {
      loc: '+100 / −84', files: 3,
      summary: 'Removed the 12 ring + 12 ledge/base PointLights in Tower3DView.buildLeds. Kept the 12 seal accent PointLights in SealManager.buildSealBacklights. LedRef.redLight is now nullable; LedEffectAnimator and Tower3DView guard the four remaining redLight accesses. Bulk-lights gate state moves from 0↔36 to 0↔12 — prewarm machinery kept intact.',
      decisionOnScope: 'Scope kept conservative: only per-LED PointLights dropped; seal accents preserved so per-seal locality survives. Proxy meshes + halo sprites for ledge/base LEDs unchanged — those LEDs still look lit, only the cast spill is lost.',
      knobsChosen: ['Removed: 12 ring + 12 ledge/base PointLights', 'Kept: 12 seal accent PointLights', 'No other config changes'],
    },
    display: {
      empty:   { fps: 120,   ms: 8.3, p95: 9.0, max: 9.3, bloom: 0.7, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 120.2, ms: 8.3, p95: 9.1, max: 9.4, bloom: 0.7, draws: 95,  tris: 1648307 },
      allLeds: { fps: 120,   ms: 8.3, p95: 8.7, max: 9.4, bloom: 1.0, draws: 187, tris: 1652079 },
      seq5:    { fps: 120,   ms: 8.3, p95: 9.1, max: 9.4, bloom: 1.0, draws: 187, tris: 1652079 },
    },
    retina: {
      empty:   { fps: 105.4, ms: 8.3,  p95: 16.7, max: 18.2, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 72.7,  ms: 16.6, p95: 17.7, max: 27.0, bloom: 0.8, draws: 95,  tris: 1648307 },
      allLeds: { fps: 73.5,  ms: 16.5, p95: 17.9, max: 26.3, bloom: 1.1, draws: 187, tris: 1652079 },
      seq5:    { fps: 74.5,  ms: 16.6, p95: 17.4, max: 25.0, bloom: 1.0, draws: 187, tris: 1652079 },
    },
    signals: { programs: 30, visiblePointLights: 12, visibleDirectionalLights: 1, bloomEnabled: true },
    programsStability: { iters: 3, samples: [30,30,30,30,30,30,30], stable: true },
    screenshots: null,
    screenshotsNote: 'No pair — 4.18 is not flagged as visual-difference risk in the testing plan (per §2 step 6).',
    tests: { result: 'pass', count: '279/279', touched: ['tests/unit/Tower3DView.test.ts'] },
    interpretation:
      'Pass — meets every gate by a wide margin. Sequence frameMs.median dropped −88.3% on Retina (vs ≥60% required). Empty unchanged; programs stable at 30. 8.5× speedup at Retina seq exceeds the predicted 3× (12/36) because the original 36-light cost already exceeded v-sync ceiling. Strong winning candidate; smallest implementation footprint of any v-sync-improving alternative.',
    observations: [
      'The 12 PointLights now in the shader hash are the seal accent lights from SealManager.buildSealBacklights. Bake-off downstream alts can chain here: 4.5 would drop those 12; 4.4 would replace them; 4.16 would combine cleanly.',
      'Display canvas hit v-sync at 120 Hz across all scenarios — GPU has substantial headroom even with bloom enabled.',
      'Retina active-scenario frameMs.max of 25–27 ms is < 1% outliers (GC + GSAP jitter); p95 still inside v-sync at 17.4–17.9 ms.',
      'No impact on the ledge/base LED bulb visuals themselves — proxy spheres + halo sprites still render through bloom; only cast spill onto surrounding drum is lost.',
    ],
  },
  {
    id: '4.16', slug: '4.16-emissive-standard', name: 'emissive-standard', path: 'A',
    status: 'report-complete',
    shortDescription: 'Switch proxy material MeshBasicMaterial → MeshStandardMaterial (emissive). Building-block validation only.',
    visualCharacter: 'pixel-level identical to baseline', // src: 4.16-emissive-standard.md Visual capture section
    visualRiskFlag: false,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.16-emissive-standard.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.16-emissive-standard',
    isValidationOnly: true,
    implementation: {
      loc: '+39 / −20', files: 3,
      summary: 'Switched all 24 LED proxy meshes from MeshBasicMaterial to MeshStandardMaterial { color: 0x000000, emissive: <led-color>, emissiveIntensity: 0, toneMapped: false, depthWrite: false }. Driver-write changed from material.opacity to emissiveIntensity. No new config knobs. 1:1 driver mapping.',
      decisionOnScope: 'NOT a perf candidate — MeshStandardMaterial is marginally more expensive than MeshBasicMaterial per fragment. Success criterion is visual parity + no programs growth + tests pass, NOT frameMs improvement. Exists to confirm the emissive pattern is safe to combine later with 4.1 or 4.18.',
      knobsChosen: ['color: 0x000000 + emissive: <led-color> + toneMapped: false (zeros diffuse, emissive-only)', 'emissiveIntensity = driver.v (1:1 mapping)', 'depthWrite: false (preserves prior occlusion semantics)'],
    },
    display: {
      empty:   { fps: 120.3, ms: 8.3,  p95: 8.6,  max: 9.4,  bloom: 0.7, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 14.2,  ms: 67.5, p95: 76.7, max: 91.8, bloom: 0.5, draws: 95,  tris: 1648307 },
      allLeds: { fps: 14.0,  ms: 73.0, p95: 81.4, max: 83.3, bloom: 0.7, draws: 187, tris: 1652079 },
      seq5:    { fps: 13.8,  ms: 71.9, p95: 84.2, max: 86.4, bloom: 0.6, draws: 187, tris: 1652079 },
    },
    retina: {
      empty:   { fps: 106.7, ms: 8.3,   p95: 16.7,  max: 17.6,  bloom: 0.7, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 6.9,   ms: 146.8, p95: 153.4, max: 157.5, bloom: 0.5, draws: 95,  tris: 1648307 },
      allLeds: { fps: 6.7,   ms: 149.5, p95: 159.2, max: 159.2, bloom: 0.8, draws: 187, tris: 1652079 },
      seq5:    { fps: 6.7,   ms: 150.2, p95: 165.0, max: 165.0, bloom: 0.8, draws: 187, tris: 1652079 },
    },
    signals: { programs: 29, visiblePointLights: 36, visibleDirectionalLights: 1, bloomEnabled: true },
    programsStability: { iters: 3, samples: [29,29,29,29,29,29,29], stable: true },
    screenshots: {
      pairs: [
        { id: 'display', label: 'Display canvas — All-LEDs',
          baseline: 'screenshots/4.16-emissive-standard-baseline-display.png',
          after:    'screenshots/4.16-emissive-standard-after-display.png',
          caption:  'Pixel-level identical at Display canvas. Driver-coupled emissive output reproduces the prior MeshBasicMaterial+opacity behavior end-to-end.' },
        { id: 'retina', label: 'Retina full-window — All-LEDs',
          baseline: 'screenshots/4.16-emissive-standard-baseline-retina.png',
          after:    'screenshots/4.16-emissive-standard-after-retina.png',
          caption:  'Same parity at Retina full-window. The black-albedo + emissive-driven approach is background-independent.' },
      ],
    },
    tests: { result: 'pass', count: '279/279', touched: [] },
    interpretation:
      'Pass on the specialised criterion. Visual parity confirmed pixel-level identical at both canvases via deterministic all-on shots. programs stable at 29 across all scenarios; net count DROPPED by one vs baseline because the new MeshStandardMaterial proxies share a program with the drum-interior material. No one-shot recompile spike. The +5–6% Retina perf regression is documented expected behavior — not a disqualifier.',
    observations: [
      '`programs` count dropped from 30 → 29 because the new MeshStandardMaterial proxies share a program variant with the drum-interior MeshStandardMaterial — *eliminates* a unique variant rather than adding one.',
      'Switched from transparent: true + opacity: driver.v to opaque + emissive — semantically cleaner; no longer depends on dark background for visibility.',
      'Initial mid-sequence-5 screenshots were misleading because frames landed differently between captures. Retook with the deterministic btn-allon preset; pixel-level parity then evident. Lesson: always use a static state for visual-parity comparison, never a mid-sequence snapshot.',
      'Building-block validated. Combines cleanly with 4.1 (emissiveIntensity > 1.0 + raised bloom threshold) or 4.18 (no visual delta — material change is orthogonal to PointLight removal).',
    ],
  },
  {
    id: '4.2', slug: '4.2-range-cull', name: 'range-cull', path: 'A',
    status: 'report-complete',
    shortDescription: 'onBeforeCompile hook injects per-fragment distance² early-exit into the PointLight loop. Keeps 36 PointLights.',
    visualCharacter: 'identical to baseline', // src: 4.11 comparison table
    visualRiskFlag: false,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.2-range-cull.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.2-range-cull',
    implementation: {
      loc: 'single-file change (not quoted as +/−)', files: 1,
      summary: 'Single-file change in Tower3DView.ts. Added buildRangeCulledLightsChunk() + applyPointLightRangeCull(root) helpers. Traverses the loaded GLB and attaches onBeforeCompile to every MeshStandardMaterial (covers MeshPhysicalMaterial too — all 6 unique lit GLB materials). Hook substitutes #include <lights_fragment_begin> with a copy whose PointLight loop wraps each iteration in a distance² guard. Per-material scope; THREE.ShaderChunk never mutated.',
      decisionOnScope: 'All 6 unique lit GLB materials patched, not just drum-interior — biggest gain comes from the tower body (82 168 triangles dominates screen pixels). Patch returns null if chunk text drifts; degrades to baseline perf rather than producing a broken shader.',
      knobsChosen: ['Per-material onBeforeCompile (no global ShaderChunk mutation)', 'Chunk-text validation guards on the 0.184.0 source', 'castShadow: false for both light types — no shadow-map cost added'],
    },
    display: {
      empty:   { fps: 120,  ms: 8.3,  p95: 8.8,  max: 9.3,  bloom: 0.7, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 44.3, ms: 23.6, p95: 28.3, max: 31.7, bloom: 0.4, draws: 95,  tris: 1648307 },
      allLeds: { fps: 43.6, ms: 23.4, p95: 30.2, max: 32.3, bloom: 0.6, draws: 187, tris: 1652079 },
      seq5:    { fps: 43.4, ms: 24.0, p95: 29.8, max: 31.8, bloom: 0.6, draws: 187, tris: 1652079 },
    },
    retina: {
      empty:   { fps: 102.4, ms: 8.3,  p95: 16.7, max: 17.6, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 12.9,  ms: 76.6, p95: 83.4, max: 83.5, bloom: 0.5, draws: 95,  tris: 1648307 },
      allLeds: { fps: 13.0,  ms: 75.9, p95: 83.4, max: 83.5, bloom: 0.7, draws: 187, tris: 1652079 },
      seq5:    { fps: 12.9,  ms: 76.9, p95: 85.3, max: 85.5, bloom: 0.7, draws: 183, tris: 1651915 },
    },
    signals: { programs: 30, visiblePointLights: 36, visibleDirectionalLights: 1, bloomEnabled: true },
    programsStability: null, // text says "stable across the empty → 1-LED cycle" but no 3-iter table captured
    screenshots: null,
    screenshotsNote: 'No pair committed — 4.2 is perf-only by construction. Sanity screenshot captured during session (no visible range-cull edges) but not committed (8.3 MB).',
    tests: { result: 'pass', count: '279/279 + 22 snapshot tests (16+1 suites)', touched: [] },
    interpretation:
      'Pass — frameMs.median dropped −68% at Display (75.1 → 24.0 ms) and −46% at Retina (141.6 → 76.9 ms). visiblePointLights unchanged at 36 (the smoking gun the cull is per-fragment, not per-light). Empty/idle unchanged. programs stable at 30 — patched materials replaced their baseline programs rather than coexisting. Sanity-checked: no visible range-cull artifacts.',
    observations: [
      'programs did NOT grow — patched materials swapped their compiled program in place. perf-skill expected-signals table predicted +1; in this codebase the patched materials replace pre-existing baseline programs rather than coexisting.',
      'Three.js version anchor: 0.184.0. Patch keys off specific chunk text; a future bump that renames identifiers degrades to baseline perf with a one-shot warning, not a broken shader.',
      'MeshPhysicalMaterial is what the GLB ships, not MeshStandardMaterial. isMeshStandardMaterial === true for instances of either — same patch applies.',
      'Range-cull cutoff is C0-continuous with three.js distance attenuation (which → 0 at d == cutoff); confirmed by sanity screenshot — no visible banding.',
    ],
  },
  {
    id: '4.5', slug: '4.5-light-probe', name: 'light-probe', path: 'A',
    status: 'report-complete',
    shortDescription: 'Drop all 36 PointLights; add one LightProbe (SH3) updated analytically per-frame from 12 emitter positions.',
    visualCharacter: 'smooth global SH wash (subtle, no hot spots)', // src: 4.11 comparison table
    visualRiskFlag: false, // not on user's 4-flagged list but has bonus screenshots
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.5-light-probe.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.5-light-probe',
    implementation: {
      loc: '+494 / −156', files: '4 modified + 2 new',
      summary: 'NEW LightProbeManager.ts owns the single THREE.LightProbe. accumulateSH3FromDirectional() projects one directional radiance into 9 SH3 coefficients (Ramamoorthi-Hanrahan analytical irradiance projection). update() sums contributions from the 12 lit emitters each frame. SealManager + Tower3DView drop their PointLights. New unit-test file LightProbeManager.test.ts covers SH math (7 tests).',
      decisionOnScope: 'All 36 PointLights dropped (not just 12 seal accents). §8.4 requires visiblePointLights → 0; keeping the 24 ring/ledge/base reds would prevent that. §4.18 result showed those 24 cast mostly outward — negligible interior spill contribution.',
      knobsChosen: ['LightProbe added at scene init (USE_LIGHT_PROBES define in program key from first compile)', 'SH update O(N=12) on CPU per frame: ~360 FLOPs', 'Per-fragment cost: O(1) — 9-term SH dot product regardless of N'],
    },
    display: {
      empty:   { fps: 120.2, ms: 8.3, p95: 9.4, max: 10.3, bloom: 0.8, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 120.2, ms: 8.3, p95: 9.6, max: 10.3, bloom: 0.8, draws: 95,  tris: 1648307 },
      allLeds: { fps: 120.2, ms: 8.3, p95: 9.1, max: 10.3, bloom: 1.1, draws: 187, tris: 1652079 },
      seq5:    { fps: 120.2, ms: 8.3, p95: 9.2, max: 10.3, bloom: 1.1, draws: 183, tris: 1651915 },
    },
    retina: {
      empty:   { fps: 105.7, ms: 8.3, p95: 16.7, max: 17.7, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 105.7, ms: 8.3, p95: 16.7, max: 17.7, bloom: 0.6, draws: 95,  tris: 1648307 },
      allLeds: { fps: 105.0, ms: 8.3, p95: 16.7, max: 17.6, bloom: 0.9, draws: 187, tris: 1652079 },
      seq5:    { fps: 105.0, ms: 8.4, p95: 16.7, max: 17.2, bloom: 0.8, draws: 187, tris: 1652079 },
    },
    signals: { programs: 22, visiblePointLights: 0, visibleDirectionalLights: 1, bloomEnabled: true },
    programsStability: { iters: 3, samples: [22,22,22,22,22,22,22], stable: true },
    screenshots: {
      pairs: [
        { id: 'allon-retina', label: 'All-LEDs / Retina full-window',
          baseline: 'screenshots/4.5-light-probe-baseline.jpeg',
          after:    'screenshots/4.5-light-probe-after.jpeg',
          caption:  'Per-seal hot spots replaced by a smooth global SH wash. Bulbs + halos (bloom layer) unchanged. The 9 SH terms cannot reproduce sharp localized peaks — only the smoothly varying integral.' },
      ],
    },
    tests: { result: 'pass', count: '285/285 (17 suites; +1 new LightProbeManager suite, 7 tests)', touched: ['tests/unit/Tower3DView.test.ts', 'tests/__mocks__/three.js', 'tests/unit/LightProbeManager.test.ts (NEW)'] },
    interpretation:
      'Pass — beats the success criterion by the largest margin in the bake-off so far. Sequence frameMs.median at Retina = 8.4 ms (v-sync ceiling); the only Path A alternative that drives every active-scenario window to the same cost as Empty. ~2× faster than 4.18 on Retina sequence frame time. Decision rests on the visual tradeoff: loss of per-seal hot spots.',
    observations: [
      'No directional shadow / per-seal hot spots — the documented SH-irradiance behavior. If highlight shaping matters, combine with 4.4 (two-directional).',
      'No spatial falloff in the probe (single point); fragments far from the probe get the same irradiance scaled only by surface normal. Acceptable here because drum interior is roughly equidistant from origin.',
      'MeshBasicMaterial ignores the LightProbe by design — drum body is MeshPhysicalMaterial and DOES read the probe. Proxies/halos are emitters not receivers.',
      'Bulk-lights gate machinery survives as dead weight (null-guarded). Cleanup appropriate at decision time if 4.5 wins.',
    ],
  },
  // ─────────────────────────────────────────── PATH B ───────────────────────────────────────────
  {
    id: '4.1', slug: '4.1-hdr-proxies', name: 'hdr-proxies', path: 'B',
    status: 'report-complete',
    shortDescription: 'Drop all 36 PointLights. Push proxy/halo color into HDR (×3.0) and raise bloom threshold to 1.0.',
    visualCharacter: 'none (only bloom-amplified bulbs)', // src: 4.11 comparison table
    visualRiskFlag: true,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.1-hdr-proxies.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.1-hdr-proxies',
    implementation: {
      loc: '+259 / −172', files: 8,
      summary: 'New HDR_PROXY_SCALE = 3.0 constant + applyHdrColor() helper. DEFAULT_LIGHTING.scene.bloom.threshold flipped 0.0 → 1.0 (the load-bearing architectural change). All 24 ring + ledge/base + 12 seal accent PointLights dropped. Proxy/halo material colors HDR-scaled. Driver-coupled opacity unchanged — what newly carries opacity over the bloom threshold is the HDR-scaled color.',
      decisionOnScope: 'All 36 PointLights dropped (same as 4.5). §8.5 success criterion is "frameMs.median at v-sync cap (≤ 16.7 ms) on Retina full-window" — unambiguous; keeping any PointLights would not achieve it.',
      knobsChosen: ['HDR_PROXY_SCALE = 3.0 (peak red = linear(0xff2020).r × 3.0 = 3.0 well above bloom threshold)', 'bloom.threshold = 1.0 (only HDR-bright pixels bloom)', 'bloom.strength / radius / resolutionScale unchanged'],
    },
    display: {
      empty:   { fps: 120,   ms: 8.3, p95: 10.1, max: 10.4, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 120,   ms: 8.3, p95: 10.0, max: 10.3, bloom: 0.7, draws: 95,  tris: 1648307 },
      allLeds: { fps: 120,   ms: 8.3, p95: 10.0, max: 10.4, bloom: 0.9, draws: 187, tris: 1652079 },
      seq5:    { fps: 119.9, ms: 8.3, p95: 10.0, max: 10.4, bloom: 0.9, draws: 183, tris: 1651915 },
    },
    retina: {
      empty:   { fps: 101.7, ms: 8.4, p95: 16.7, max: 18.2, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 102.0, ms: 8.4, p95: 16.7, max: 17.7, bloom: 0.6, draws: 95,  tris: 1648307 },
      allLeds: { fps: 104.0, ms: 8.4, p95: 16.7, max: 17.1, bloom: 0.9, draws: 187, tris: 1652079 },
      seq5:    { fps: 104.3, ms: 8.3, p95: 16.7, max: 17.1, bloom: 0.8, draws: 187, tris: 1652079 },
    },
    signals: { programs: 22, visiblePointLights: 0, visibleDirectionalLights: 1, bloomEnabled: true },
    programsStability: { iters: 3, samples: [22,22,22,22,22,22,22], stable: true },
    screenshots: {
      pairs: [
        { id: 'allon-retina', label: 'All-LEDs / Retina full-window',
          baseline: 'screenshots/4.1-hdr-proxies-baseline.jpeg',
          after:    'screenshots/4.1-hdr-proxies-after.jpeg',
          caption:  'Ledge/base bulbs still pop via HDR bloom. Seal cutouts visible as small red dots. Drum-interior atmospheric spill is GONE — the §4.1 "key tradeoff" reproduced exactly.' },
      ],
    },
    tests: { result: 'pass', count: '279/279', touched: ['tests/unit/Tower3DView.test.ts', 'tests/__mocks__/three.js'] },
    interpretation:
      'Pass on perf, mixed on visual. Retina sequence frameMs.median 8.3 ms (v-sync cap). The drum-interior atmospheric spill loss is the load-bearing tradeoff — bulbs/halos at the bottom still pop via bloom, but seal-cutout surrounds read black. Decision-relevance: 4.1 alone is unlikely a shipping config; pairs naturally with 4.4 (two-directional), 4.5 (LightProbe), or 4.19 (interior-sprites) for spill recovery.',
    observations: [
      'programs dropped 30 → 22 — same one-shot reduction as 4.5/4.4/4.19. Removing 36 PointLights eliminates NUM_POINT_LIGHTS=36 keyed variants; threshold change is a uniform, not a define.',
      'Interior spill loss is the load-bearing visual concern, exactly as flagged in §4.1 + §8.5. The screenshot pair makes it unambiguous.',
      'HDR_PROXY_SCALE=3.0 makes peak red 3.0; threshold reached when driver.v ≈ 0.33. Below that breathe-yoyo periods read as a brief flash-off rather than smooth pulse-through-dim. Invisible at typical viewing distance.',
      'SpriteMaterial halos with AdditiveBlending still bloom convincingly — HDR src (3,0,0) × opacity 0.75 adds (2.25, 0, 0), well above threshold.',
      'Inheritability: 4.4 / 4.19 / 4.11 all chain on top of 4.1\'s zero-PointLights floor.',
    ],
  },
  {
    id: '4.4', slug: '4.4-two-directional', name: 'two-directional', path: 'B',
    status: 'report-complete',
    shortDescription: 'Drop all 36 PointLights. Add 2 red DirectionalLights inside the drum (+X/−X). Continuous-driven by max(driver.v).',
    visualCharacter: 'uniform global wash from 2 opposing directionals (no hot spots, but bright across the whole body — peaks at any LED on)', // src: 4.11 comparison table
    visualRiskFlag: true,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.4-two-directional.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.4-two-directional',
    implementation: {
      loc: '+374 / −165', files: 5,
      summary: 'All 36 LED PointLights dropped. 2 red DirectionalLights at (±modelRadius × 2, 0, 0), target origin, castShadow: false, visible: true always. Continuous-drive: updateLightsGate writes max(driver.v) × cfg.intensity to both directionals every frame — breathing-spill character. New __testables.getInteriorLights helper for unit tests.',
      decisionOnScope: 'Continuous-drive (intensity every frame) over binary-gate (visible flip). Sidesteps recompile-trap entirely — count stable at 3 forever (1 white scene.key + 2 red interior). Produces the breathing-spill character §4.4 advertises.',
      knobsChosen: ['Positions: +X / −X opposing pair at ±modelRadius × 2 (covers cylindrical drum walls)', 'Intensity scale = cfg.intensity = 2 (unchanged from sealBacklights.intensity baseline)', 'castShadow: false (no shadow-map work added)'],
    },
    display: {
      empty:   { fps: 120, ms: 8.3, p95: 8.6, max: 9.2, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 120, ms: 8.3, p95: 8.6, max: 9.3, bloom: 0.6, draws: 95,  tris: 1648307 },
      allLeds: { fps: 120, ms: 8.3, p95: 8.4, max: 9.3, bloom: 0.9, draws: 187, tris: 1652079 },
      seq5:    { fps: 120, ms: 8.3, p95: 8.5, max: 9.3, bloom: 0.9, draws: 187, tris: 1652079 },
    },
    retina: {
      empty:   { fps: 103.0, ms: 8.3, p95: 16.7, max: 18.6, bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 101.4, ms: 8.4, p95: 16.7, max: 17.0, bloom: 0.6, draws: 95,  tris: 1648307 },
      allLeds: { fps: 103.3, ms: 8.3, p95: 16.7, max: 18.4, bloom: 0.9, draws: 187, tris: 1652079 },
      seq5:    { fps: 103.7, ms: 8.3, p95: 16.7, max: 17.0, bloom: 0.8, draws: 183, tris: 1651915 },
    },
    signals: { programs: 22, visiblePointLights: 0, visibleDirectionalLights: 3, bloomEnabled: true },
    programsStability: { iters: 3, samples: [22,22,22,22,22,22,22], stable: true },
    screenshots: {
      pairs: [
        { id: 'allon-retina', label: 'All-LEDs / Retina full-window',
          baseline: 'screenshots/4.4-two-directional-allon-baseline.jpeg',
          after:    'screenshots/4.4-two-directional-allon-after.jpeg',
          caption:  'Entire drum body actively lit red — no per-seal hot spots but a uniform global wash. Bulbs/halos still pop via bloom. Recovers a full atmospheric-spill character via globals.' },
        { id: '1led-retina', label: '1-LED / Retina full-window',
          baseline: 'screenshots/4.4-two-directional-1led-baseline.jpeg',
          after:    'screenshots/4.4-two-directional-1led-after.jpeg',
          caption:  'Defining tradeoff: ONE LED lights the entire drum body. Per-seal locality gone (the body looks the same as in the All-LEDs shot); reads as "fire inside the tower" even when a single LED breathes.' },
      ],
    },
    tests: { result: 'pass', count: '283/283 (16 suites; +5 new tests)', touched: ['tests/unit/Tower3DView.test.ts', 'tests/__mocks__/three.js'] },
    interpretation:
      'Pass on perf with significant but recovered visual delta. Unlike 4.1, 4.4 adds spill rather than removing it: replaces per-seal locality with a global "drum-glowing-from-within" look. Standalone-viable shipping candidate — doesn\'t need combining to look lit. Spill character arguably more atmospheric than baseline.',
    observations: [
      '1-LED and All-LEDs frameMs.median are identical at both canvases — the §4.4 smoking gun. Per-fragment cost does not scale with active-LED count because lights are global.',
      'programs dropped 30 → 22; adding 2 DirectionalLights did NOT re-create variants because scene already had 1 DirectionalLight at compile time — count bumps from 1 → 3 at scene init, then never changes.',
      'Intensity scale unchanged from baseline cfg.intensity = 2. Decision-time knob: drop sealBacklights.intensity to ~0.5–1.0 for closer perceptual parity to baseline subtle per-cutout glow. No code change required.',
      'accentLight: false respected — interior directionals collapse to 0 intensity in that case.',
      'Positions are +X / −X (opposing horizontal). Did not iterate; visual eye-check showed uniform wash with no obvious dark band. One-line change in buildInteriorLights to try +Y/−Y or other geometry.',
    ],
  },
  {
    id: '4.19', slug: '4.19-interior-sprites', name: 'interior-sprites', path: 'B',
    status: 'report-complete',
    shortDescription: 'Drop all 36 PointLights. Add 1–3 large additive interior Sprites per seal, reusing the existing halo recipe.',
    visualCharacter: 'per-seal localised additive blobs + bloom amplification', // src: 4.11 comparison table
    visualRiskFlag: true,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.19-interior-sprites.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.19-interior-sprites',
    implementation: {
      loc: '+375 / −157', files: 6,
      summary: 'All 36 LED PointLights dropped. SealManager.buildSealBacklights extended to construct cfg.interior.count interior Sprites per seal (always built; runtime toggle). Reuses existing radial-gradient CanvasTexture cache + SpriteMaterial + AdditiveBlending recipe. New config knob leds.sealBacklights.interior { enabled, count, sizeFactor, opacity }. Off by default.',
      decisionOnScope: 'All 36 dropped (matches §4.5/§4.1/§4.4 floor). "Pairs naturally with 4.1" + "with 4.11" framing assumes zero-PointLights baseline. Dropping only 12 seal accents would have landed in ~50 ms/frame zone at Retina (superlinear scaling).',
      knobsChosen: ['enabled: false (default; opt-in via applyLightingConfig)', 'count: 2 (vertically distributed ±0.15 × modelRadius)', 'sizeFactor: 0.6 (vs halo\'s 0.3)', 'opacity: 0.5 (mid-range — saturates at All-LEDs; decision-time knob)', 'renderOrder: 1 (between drum body 0 and proxy/halo 2/3)'],
    },
    display: {
      empty:   { fps: 120, ms: 8.3, p95: 9.0, max: 9.3,  bloom: 0.6, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 120, ms: 8.3, p95: 9.2, max: 10.5, bloom: 0.7, draws: 99,  tris: 1648315 },
      allLeds: { fps: 120, ms: 8.3, p95: 9.0, max: 10.5, bloom: 1.0, draws: 235, tris: 1652175 },
      seq5:    { fps: 120, ms: 8.3, p95: 8.8, max: 9.3,  bloom: 1.0, draws: 235, tris: 1652175 },
    },
    retina: {
      empty:   { fps: 108.7, ms: 8.3, p95: 16.7, max: 17.3, bloom: 0.5, draws: 91,  tris: 1648143 },
      oneLed:  { fps: 108.7, ms: 8.3, p95: 16.7, max: 17.5, bloom: 0.6, draws: 99,  tris: 1648315 },
      allLeds: { fps: 108.3, ms: 8.3, p95: 16.7, max: 17.5, bloom: 1.0, draws: 235, tris: 1652175 },
      seq5:    { fps: 108.7, ms: 8.3, p95: 16.6, max: 16.8, bloom: 0.8, draws: 227, tris: 1652003 },
    },
    signals: { programs: 22, visiblePointLights: 0, visibleDirectionalLights: 1, bloomEnabled: true },
    programsStability: { iters: 3, samples: [22,22,22,22,22,22,22], stable: true, note: 'visibleSprites swung 0 → 48 between samples; programs never moved — confirms sprites are OUTSIDE the lights shader hash.' },
    screenshots: {
      pairs: [
        { id: 'allon-retina', label: 'All-LEDs / Retina full-window',
          baseline: 'screenshots/4.19-interior-sprites-allon-baseline.jpeg',
          after:    'screenshots/4.19-interior-sprites-allon-after.jpeg',
          caption:  'Drum body enveloped in bright red atmospheric glow from 24 additive sprite blobs (12 seals × 2). At default opacity 0.5 the All-LEDs case saturates; decision-time knob: drop to ~0.25.' },
        { id: '1led-retina', label: '1-LED / Retina full-window',
          baseline: 'screenshots/4.19-interior-sprites-1led-baseline.jpeg',
          after:    'screenshots/4.19-interior-sprites-1led-after.jpeg',
          caption:  'Glow originates from the north-top seal cutout only — per-seal locality preserved. The §4.19 vs §4.4 axis: 4.4\'s 1-LED lights the entire drum; 4.19\'s lights only the local sprite column.' },
      ],
    },
    tests: { result: 'pass', count: '284/284 (16 suites; +6 new tests)', touched: ['tests/unit/Tower3DView.test.ts'] },
    interpretation:
      'Pass on perf with significant but localised visual delta. Per-seal locality preserved (unlike 4.4). Visible additive saturation at default opacity 0.5; tunable. Qualitatively a third option distinct from 4.4 (global wash) and 4.5 (smooth SH).',
    observations: [
      'visibleSprites Δ at All-LEDs is +24 vs baseline — precisely count × seal-count = 2 × 12. Confirms the sprite-only spill mechanism.',
      'drawCalls +48 at All-LEDs (187 → 235): 24 new sprites × 2 (bloom + main passes). Did not move frameMs.median away from v-sync — per-draw overhead is in the noise at this canvas size.',
      'Saturation visible at default opacity. The 1-LED case is well-tuned; All-LEDs saturates because 12 seals × 2 sprites overlap on the drum silhouette. Single-knob retune in LightingResolver.ts: opacity 0.5 → ~0.25.',
      'Always-build sprite array choice (regardless of enabled): makes applyLightingConfig({ ... interior: { enabled: true } }) a true runtime toggle. 24 invisible sprites + materials when off; negligible memory cost.',
      'Camera-aligned billboard fakery has a visible signature. Convincing at head-on orbit; low-angle / from-above orbit may reveal the sprite plane.',
    ],
  },
  {
    id: '4.11', slug: '4.11-min-cost-combo', name: 'min-cost-combo', path: 'B',
    status: 'report-complete',
    shortDescription: '§4.1 + §4.4 + §4.8 fused. 0 PointLights, 2 interior DirectionalLights, BLOOM PIPELINE DISABLED. Baseline-color proxies (NOT HDR-scaled).',
    visualCharacter: 'global directional wash NO BLOOM — flat-bright bulbs + un-amplified halos; most extreme departure from baseline aesthetic', // src: 4.11 comparison table
    visualRiskFlag: true,
    sourceFile: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/blob/main/docs/lighting-experiments/4.11-min-cost-combo.md',
    branchUrl: 'https://github.com/ChessMess/UltimateDarkTowerDisplay/compare/main...lighting/4.11-min-cost-combo',
    implementation: {
      loc: '+340 / −161', files: 6,
      summary: 'Single load-bearing flip: DEFAULT_LIGHTING.scene.bloom.enabled = false. The existing conditional at Tower3DView.ts:1093 already null-checked bloom.enabled before constructing BloomManager — flip makes bloomManager === null after initScene. All 36 PointLights dropped. 2 interior DirectionalLights added (identical to 4.4 recipe). Proxy/halo materials UNCHANGED from baseline (NOT HDR-scaled — without bloom, > 1.0 colors clamp on display).',
      decisionOnScope: 'All 36 dropped + bloom dropped + proxy color BASELINE (not HDR-scaled). §8.8 "bright MeshBasicMaterial proxies" confirmed with user as baseline-color + toneMapped: false (the existing baseline recipe), NOT 4.1\'s HDR-scaled color.setRGB(2, 0, 0). Keeps §4.11-vs-§4.4 perf comparison clean — only delta vs §4.4 is the bloom drop.',
      knobsChosen: ['DEFAULT_LIGHTING.scene.bloom.enabled = false (the single load-bearing flip)', '2 DirectionalLights at ±modelRadius × 2 on X (identical to 4.4)', 'Intensity scale = cfg.intensity = 2 (identical to 4.4)', 'Proxy/halo materials unchanged from baseline'],
    },
    display: {
      empty:   { fps: 120.3, ms: 8.3, p95: 9.9, max: 10.3, bloom: null, draws: 39, tris:  824064 },
      oneLed:  { fps: 120.3, ms: 8.3, p95: 9.8, max: 10.3, bloom: null, draws: 41, tris:  824146 },
      allLeds: { fps: 120.3, ms: 8.3, p95: 9.8, max: 10.3, bloom: null, draws: 87, tris:  826032 },
      seq5:    { fps: 120.5, ms: 8.3, p95: 9.9, max: 10.4, bloom: null, draws: 87, tris:  826032 },
    },
    retina: {
      empty:   { fps: 120.0, ms: 8.3, p95: 9.6,  max: 10.4, bloom: null, draws: 39, tris:  824064 },
      oneLed:  { fps: 120.0, ms: 8.3, p95: 10.2, max: 10.4, bloom: null, draws: 41, tris:  824146 },
      allLeds: { fps: 120.0, ms: 8.3, p95: 9.8,  max: 10.4, bloom: null, draws: 87, tris:  826032 },
      seq5:    { fps: 120.0, ms: 8.3, p95: 10.0, max: 10.4, bloom: null, draws: 87, tris:  826032 },
    },
    signals: { programs: 6, visiblePointLights: 0, visibleDirectionalLights: 3, bloomEnabled: false },
    programsStability: { iters: 3, samples: [6,6,6,6,6,6,6], stable: true, note: 'visibleSprites swung 0 → 24; programs never moved; bloomMgr stayed false throughout — pipeline genuinely never constructed.' },
    screenshots: {
      pairs: [
        { id: 'allon-retina', label: 'All-LEDs / Retina full-window',
          baseline: 'screenshots/4.11-min-cost-combo-allon-baseline.jpeg',
          after:    'screenshots/4.11-min-cost-combo-allon-after.jpeg',
          caption:  'Drum body uniformly red-washed across entire surface. Bulbs/halos visible but FLAT — no bloom-amplified aura. Most extreme aesthetic departure in the bake-off.' },
        { id: '1led-retina', label: '1-LED / Retina full-window',
          baseline: 'screenshots/4.11-min-cost-combo-1led-baseline.jpeg',
          after:    'screenshots/4.11-min-cost-combo-1led-after.jpeg',
          caption:  'Whole drum bathed in uniform red wash from 2 directionals — even with just one LED active. NO per-LED locality information in the spill pattern. Same as §4.4 but flatter un-amplified bulb character.' },
      ],
    },
    tests: { result: 'pass', count: '287/287 (16 suites; +9 new tests)', touched: ['tests/unit/Tower3DView.test.ts', 'tests/__mocks__/three.js'] },
    interpretation:
      'Pass — best Empty perf in the bake-off (Retina Empty 120 vs baseline 105.3, +14%). Active-scenario frameMs.median identical to §4.4 (the bloom-pipeline cost was already small relative to PointLight cost). Decision-relevance is incremental over §4.4: drawCalls −53%, programs −73%, Retina Empty +14% fps. Visual character is the most extreme departure; useful only if the dropped-bloom look is explicitly approved.',
    observations: [
      'bloomEnabled: false in every PerfReport — the bloom-step column family omitted. Load-bearing claim that §4.11 actually executes its bloom-drop.',
      'drawCalls drops ~57% (Empty 91 → 39; All-LEDs 187 → 87). Confirms the bloom-pipeline second-composer pass is genuinely gone.',
      'programs drops 73% (22 → 6). Bloom pipeline contributed 16 program variants (UnrealBloomPass blur shaders, EffectComposer copy/output, selective-bloom darken, final composite).',
      'Bloom-toggle takes effect only at construction time. applyLightingConfig({ scene: { bloom: { enabled: true } } }) updates resolved config but does NOT rebuild BloomManager. Existing limitation, not a 4.11 regression.',
      'Triangles per frame ~halved (1.65M → 0.82M) — bloom pipeline\'s scene traversal was doubling the triangle work; without it, scene traverses once.',
      '§4.11 is the cheapest possible delivery short of dropping all visuals. Bake-off floor established — no in-scope alternative is expected to beat it.',
    ],
  },
];

// ─────────────────────────────────────────── DERIVED ───────────────────────────────────────────
// Pre-computed helpers for the charts and matrix; convenience only — all source data above.

export const vsyncWinners = ['4.5', '4.1', '4.4', '4.19', '4.11']; // src: testing-plan §1 + 4.11 comparison table

export function pctDelta(current, base) {
  return ((current - base) / base) * 100;
}

// Decision framework rows. Each "because" line quotes the source MD.
export const decisionFramework = [
  {
    want: 'Closest visual match to baseline',
    pick: '4.2 (range-cull) — keeps all 36 PointLights, just culls per-fragment',
    runner: 'or 4.18 (twelve-lights) — loses only the faint ledge/base spill',
    because: '4.2: "identical to baseline" (4.11 comparison-to-prior-leaders table). 4.18 loses only corner-positioned PointLights that "cast mostly outward — contribution to interior spill is negligible" (4.18 observations).',
    source: ['4.2-range-cull.md', '4.18-twelve-lights.md'],
  },
  {
    want: 'Smooth atmospheric spill (subtle, no hot spots)',
    pick: '4.5 (light-probe)',
    runner: null,
    because: '"smooth global SH wash (subtle, no hot spots) … the drum body reads as gently lit; closest to baseline\'s atmospheric feel" (4.5 + 4.19 comparison tables). O(1) per-fragment via 9-term SH dot product.',
    source: ['4.5-light-probe.md'],
  },
  {
    want: 'Per-seal locality preserved AND perf at v-sync',
    pick: '4.19 (interior-sprites)',
    runner: null,
    because: '"per-seal localised additive blobs … you can tell from the spill alone which LED is lit, unlike §4.4" (4.19 interpretation). Reuses proven in-tree halo infrastructure; no shader-recompile risk because sprites are outside the lights hash.',
    source: ['4.19-interior-sprites.md'],
  },
  {
    want: 'Global "fire-inside-the-tower" wash — accept loss of per-LED locality',
    pick: '4.4 (two-directional)',
    runner: null,
    because: '"uniform global wash from 2 opposing directionals … recovers a full atmospheric-spill character via globals … standalone-viable shipping candidate" (4.4 interpretation). Spill character arguably more atmospheric than baseline.',
    source: ['4.4-two-directional.md'],
  },
  {
    want: 'Maximum perf headroom + lowest GPU cost — accept dramatic aesthetic change',
    pick: '4.11 (min-cost-combo)',
    runner: null,
    because: '"the cheapest possible delivery short of dropping all visuals" (4.11 observations). Only entry that drives Retina Empty to v-sync; drawCalls −57%, programs −73%. Useful ONLY if the dropped-bloom look is explicitly approved.',
    source: ['4.11-min-cost-combo.md'],
  },
  {
    want: 'Lowest implementation footprint',
    pick: '4.16 (+39/−20)',
    runner: 'or 4.2 (single-file onBeforeCompile)',
    because: '4.16 is a validation building block (no perf claim) and the smallest LOC change; 4.2 is a single-file perf win with zero visual change. Both preserve the existing paradigm.',
    source: ['4.16-emissive-standard.md', '4.2-range-cull.md'],
  },
  {
    want: 'Recover spill after going PointLight-free',
    pick: '4.4 (global) OR 4.5 (smooth) OR 4.19 (per-seal) chained on 4.1',
    runner: null,
    because: '4.1 ships zero PointLights but loses all interior spill. The three spill-recovery techniques produce three different visual characters at the same v-sync perf — pick by aesthetic.',
    source: ['4.1-hdr-proxies.md', '../lighting-alternatives.md §6'],
  },
];

// All alternatives + baseline in one array, in the order they should appear in the matrix.
export const all = [baseline, ...alternatives];
