# Lighting alternatives — research

> **Status: research only.** Nothing here is committed to. The goal is to map the design space so we can pick a direction the next time the lighting subsystem needs work.
>
> **Read first:** [LIGHTING.md](LIGHTING.md) describes the current system. [framerate-issue.md](framerate-issue.md) §13 describes why the 36-PointLight design is the perf ceiling we'd be replacing.

## 1. Summary comparison table

Quick-scan view. Detail and citations in §4. Code-impact and effort are subjective rough buckets — Low ≈ 1–3 days, Medium ≈ 1 week, High ≈ 2+ weeks.

| # | Option | Replaces / Touches | Perf delta (vs today) | Visual match | Code impact | Effort | Bloom needed | Pros | Cons |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | HDR-color proxies + raised bloom threshold (no PointLights, no emissive material change) | Remove 36 PointLights; raise `bloom.threshold` ~1.0; set proxy `color.setRGB(2,0,0)` | **Eliminates ~66 ms/frame light loop** (best case → v-sync cap) | Bulbs ✅, halos ✅, **interior spill ❌** | Subtractive: ~150 LOC removed | Low | Yes (kept) | Biggest perf win for least change. Visual goals 1+2+4+5 preserved. | Loses interior red atmospheric spill. Mitigation needed (combine with 4.4 or 4.5 or 4.16). |
| 4.2 | `onBeforeCompile` range-cull shader patch (keep 36 PointLights) | Patch built-in `lights_pars_begin` + `lights_fragment_begin` chunks | Discourse claims 58× at 250 lights. At 36 lights probably 2–4× depending on geometry. | Identical | Single material override | Low | Unchanged | Zero visual change. Risk-free if scoped via `onBeforeCompile`. | Tied to three.js version; chunk internals can shift between releases. |
| 4.3 | Fixed-pool of N lights, virtually reassigned per frame | Drop 36 PointLights → N (e.g. 8 or 16) | O(N) vs O(36) per fragment. N=8 → ~4.5× win. | Bulbs ✅, halos ✅, spill mostly preserved (top-N hot spots only) | Moderate: new slot allocator | Medium | Unchanged | Constant light count (no recompile risk). Gracefully degrades. | Visual popping if not tuned; loses per-LED locality when many active. |
| 4.4 | Two `DirectionalLight`s instead of 36 PointLights | Replace all 36 PointLights with 2 directional | DirectionalLight is per-fragment cheaper than PointLight (no distance math) AND 2 ≪ 36 ⇒ ~20–30× win on the light loop | Bulbs (need emissive proxies via 4.16) ✅, halos ✅, spill ✅ (global wash, not per-LED) | Subtractive + 2 light constructors | Low–Medium | Optional | Cheapest spill solution. Aggregate `max(driver.v)` drives them. | Spill is global not local: when one LED breathes, whole drum lights together. |
| 4.5 | `LightProbe` (spherical harmonics) for interior spill | Drop 12 seal accent lights; add 1 LightProbe analytically updated each frame | O(1) per-fragment for ambient component | Spill ✅ (global, smooth) | Moderate: new SH update path | Medium | Unchanged | O(1) ambient. Elegant; no count-hash risk. | No per-LED hot spots. `MeshBasicMaterial` ignores it (already true). Combine with directional for highlights. |
| 4.6 | Baked interior lightmaps blended by driver in custom shader | Custom drum-interior `ShaderMaterial` w/ lightmap atlas | O(1) per-fragment (one texture sample + 12 mul-adds) | Spill ✅ (literally the bake) | Major: bake pipeline + custom shader + UV2 channel | High | Unchanged | Pixel-perfect spill at runtime cost of a single texture lookup. | Bake pipeline (Blender or react-three/lightmap). Tied to GLB UVs. Brittle to model changes. |
| 4.7 | Hand-written `ShaderMaterial` for drum interior, 36 lights hard-coded | Replace drum-interior material with `THREE.ShaderMaterial` + custom GLSL | Specialised math; potentially huge if expressible as low-rank | Full control | Major | High | Maybe | Best theoretical perf. Can exploit known geometry. | Lose stock three.js paths (ACES, SRGB, shadows). Multi-week. |
| 4.8 | Fake-glow material (ektogamat fresnel) + no bloom | Replace proxy mesh + halo sprite with `FakeGlowMaterial` sphere wrapper. Drop bloom. | Eliminates bloom pipeline (~2 full scene renders/frame) AND 36 PointLights | Bulbs ✅ (different character), halos ✅, **spill ❌** | Material swap + bloom removal | Low–Medium | **Removed** | Drops the biggest two costs at once. | View-angle-dependent glow may not match current additive halo. Visual change. |
| 4.9 | Textured `SpotLight`s projecting red gradient | 1–4 SpotLights with `map: redGradient.png` | Trades 36 PointLights for ~4 SpotLights. SpotLight is **more** expensive per-fragment than PointLight (angle math + shadow map), but 4≪36 nets a big win. | Spill ✅ (projector-style), bulbs+halos unchanged | New scene-lighting subclass | Medium | Unchanged | Texturable interior light is exactly what we want. | `SpotLight.map` requires `castShadow: true` — pay 1 shadow map / spotlight (cheap, but real). |
| 4.10 | WebGPU clustered rendering (long horizon) | Migrate to `WebGPURenderer` + adopt Shade/Usnul clustered patterns | Unlimited light budget (~16k lights at interactive fps demonstrated) | All visual goals trivially deliverable | Architectural | Very High | Different pipeline (TSL `BloomNode`) | Drops the lights-cost question entirely. Future-proof. | Browser support ~95% but not 100% in 2026. Clustered work lives in third-party "Shade" renderer, not core three.js. WebGPU EffectComposer requires testing. |
| 4.11 | Minimal-cost combo: drop bloom + 2 directional + bright proxies | §4.1 + §4.4 + §4.8 fused | Eliminates bloom pipeline + 34 PointLights | Bulbs ✅ (crisper, no bloom-amplified glow), halos ✅ (additive sprites already glow), spill ✅ (global from 2 directional) | Big subtractive change | Low | **Removed** | Cheapest possible delivery. Probably v-sync cap at any canvas size. | Visual character changes meaningfully — needs side-by-side mock-up before commit. |
| 4.12 | Decal-projected red gradient on drum interior | `THREE.DecalGeometry` projects red gradient texture onto drum interior near each seal | New geometry but no lights | Spill ✅ (projector-style on actual interior geometry) | New manager class | Medium | Optional | Cheaper than SpotLight (no shadow). Per-seal locality preserved. | Decals can distort around corners. Static unless re-projected on config change. |
| 4.13 | Real-time updated environment map | One `CubeCamera` capturing the LED proxies; bind result to `scene.environment` | Drum's `MeshStandardMaterial` picks up the red from the env map for free, no per-light loop | Spill ✅ (PBR reflection from emissive proxies), bulbs ✅, halos ✅ | Add `CubeCamera` render pass | Medium | Unchanged | Reuses the proxies as light emitters via PBR machinery. No light-count hash. | CubeCamera renders the scene 6× / frame at low res — needs careful target sizing. |
| 4.14 | CSS2D/CSS3D overlay for the seal indicators | Replace seal proxies + halos with DOM `<div>` glow markers positioned over canvas | Eliminates ~24 bloom-layer meshes/sprites entirely | Bulbs ✅ (CSS box-shadow / radial-gradient), halos ✅ (CSS blur), **spill ❌** | New CSS3DRenderer integration | Medium | Optional | Decouples LED indicators from WebGL cost entirely. CSS effects are GPU-accelerated. | DOM does not occlude with depth buffer — indicators always render on top. Requires CSS3DRenderer or position math. |
| 4.15 | Swap UnrealBloomPass for pmndrs `SelectiveBloomEffect` | Use `postprocessing` library | Community-reported smoother + more configurable; perf-similar but better selectivity | Identical or better | Replace bloom-pipeline plumbing | Medium | Yes (different impl) | Modern lib. WebGPU has native `BloomNode`. | New dependency. EffectComposer / passes API differs from current `Tower3DView.ts` wiring. |
| 4.16 | Emissive proxies via `MeshStandardMaterial` (not `MeshBasicMaterial`) | Switch proxy material from `MeshBasicMaterial` → `MeshStandardMaterial { emissive, emissiveIntensity }` | Marginal cost change (Standard is heavier than Basic) but enables emissive HDR + light pickup | Bulbs ✅ (PBR + emissive), halos unchanged | One material constructor change | Low | Yes (kept) | The canonical way to drive emissive intensity over time. Plays with bloom-threshold trick. | `MeshStandardMaterial` is per-fragment more expensive than `MeshBasicMaterial`. Worth it on 12 small proxies; not free. |
| 4.17 | Volumetric god-ray shafts inside drum (Codrops pattern) | Add additive cone meshes radiating from each seal | Cheap fragment cost (additive cones); 12 small meshes | Spill ✅ (god-ray-like), bulbs ✅, halos ✅ | New per-seal cone mesh manager | Medium | Optional | Stylised but distinctive — gives a "molten-core ray" look. | Visual character differs significantly from current. Worth mocking up before committing. |
| 4.18 | Consolidated 12-lights design: one PointLight per seal, ledge/base LEDs become emissive dots only | Collapse 12 ring + 12 accent → 12 seal PointLights; remove 12 ledge/base PointLights entirely | 36 PointLights → 12 PointLights = **3× per-fragment win** on the lights loop; cheaper than 4.4 in count terms but per-LED locality preserved | Bulbs ✅ (seal cutouts glow through), halos ✅ (all 24 sprites), spill ✅ (per-seal hotspots from inside drum), ledge/base bulbs ✅ as crisp dots with no spill | Subtractive on PointLight construction; gate logic simplifies | Low | Yes (kept) | Preserves per-seal locality (unlike 4.4). Honest mapping: 1 light per visible seal LED. Ledge/base "dots" match the visual intent — small indicator LEDs don't need to illuminate the model. | Still has 12 PointLights — not the cheapest option. The 12-light count is still in the shader hash; needs prewarm for the gate flip. Ledge/base LEDs lose their faint atmospheric spill (currently from layers 3–5 corner PointLights). |
| 4.19 | Interior atmospheric sprites (additive blob texture) | Add 1–3 large camera-facing additive sprites *inside* the drum per seal; reuses existing halo infrastructure ([SealManager.ts](../src/3d/SealManager.ts) `SpriteMaterial`+`CanvasTexture` pattern) | Cheap — sprites cost ~µs/frame each; no per-fragment light loop | Bulbs ✅, halos ✅, spill ✅ (faked via additive accumulation, not PBR) | Minimal: extend existing halo pattern | Very Low | Unchanged (sprites already bloom-layer) | Reuses proven in-tree infrastructure. No shader-recompile risk. Per-LED locality preserved. | Camera-aligned billboards, not surface-conforming. No PBR coupling. Overlapping additive can saturate. |

**Reading the table:** The single biggest perf delta is always *"remove the 36-PointLight per-fragment loop."* Options 4.1, 4.3, 4.4, 4.5, 4.10, 4.11, 4.13 all do that completely; 4.18 takes it from 36→12 while preserving per-LED locality. Options 4.2, 4.16 leave lights in place and optimise inside the loop. Options 4.8, 4.11, 4.14, 4.15 additionally address bloom-pass cost. Options 4.17 (god-ray cones) and 4.19 (interior atmospheric sprites) fake the interior spill without lights — 4.19 is the cheaper sibling, reusing in-tree sprite infrastructure rather than authoring new cone geometry.

The recommended starting point (§6) is **4.1 + 4.16 + 4.4** combined: emissive `MeshStandardMaterial` proxies pushed HDR, no per-LED PointLights, two `DirectionalLight`s inside the drum for spill. Smallest perf-positive change that preserves all four visual goals.

**4.18 is the most conservative middle-ground option** — keeps PointLights for per-seal locality but drops 24 of them. Lower risk than 4.1 since the existing visual paradigm is preserved; lower perf ceiling since the lights loop still runs.

## 2. What we are trying to replicate

The current renderer's lighting deliverable (see [LIGHTING.md §11](LIGHTING.md#11-seal-backlight-leds)) is:

1. **Bright red "bulbs"** visible through seal cutouts and at ledge/base LED positions. Each animated by a driver in [0,1] via GSAP — on/off/breathe/breatheFast/breathe50/flicker.
2. **A soft additive halo** around each bulb that reads as bloom-amplified diffusion through the cutout.
3. **Atmospheric red spill onto drum interior surfaces** behind each cutout — the "molten core" feel.
4. **Color and intensity tuneable at runtime** via `applyLightingConfig()` — including switching the whole array to blue.
5. **Effect duration consistent across drivers** — proxy + halo + accent all wake together.

Constraint: **no actual emitter is outside the drum**. The exterior glow read is produced inside-out.

Perf budget today: 36 always-on `PointLight`s during any active sequence ⇒ ~66 ms/frame on Retina full-window at 7.84 M backing pixels (see [framerate-issue.md §13.1](framerate-issue.md#131-the-regression)).

## 3. Why PointLights are expensive in three.js

Verified directly against the installed three.js shader chunks (r0.183.2 — `node_modules/three/src/renderers/shaders/ShaderChunk/`):

```glsl
// lights_pars_begin.glsl.js — PointLight info getter (lines 111–122)
void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
  vec3 lVector = pointLight.position - geometryPosition;
  light.direction = normalize( lVector );
  float lightDistance = length( lVector );
  light.color = pointLight.color;
  light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
  light.visible = ( light.color != vec3( 0.0 ) );
}
```

```glsl
// lights_pars_begin.glsl.js — DirectionalLight getter (line 88, simpler)
void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
  light.color = directionalLight.color;
  light.direction = directionalLight.direction;
  light.visible = true;
}
```

The PointLight getter does `length()`, `normalize()`, and `getDistanceAttenuation()` (a `pow(saturate(1-pow(d/cutoff,4)),2)/pow(d,decay)` chain) **per fragment per light**. DirectionalLight is essentially a uniform copy. This confirms 4.4 is meaningfully cheaper at the same fragment count.

The fragment loop in `lights_fragment_begin.glsl.js` lines 65–80 uses `#pragma unroll_loop_start` so all `NUM_POINT_LIGHTS` lights iterate unconditionally. **Setting `directLight.visible = false` does NOT cause an early-out** — the GLSL flag is just multiplied into the contribution. This is what the 4.2 patch addresses.

Other facts:
- **Count is the shader hash key.** From [framerate-issue.md §3](framerate-issue.md#3-the-bug--root-cause): every change in `directionalLength`/`pointLength`/`spotLength` triggers full material recompiles.
- **PointLight shadows = 6 cube faces per light.** ([three.js Journey](https://threejs-journey.com/lessons/lights)). We don't enable these — but they're why the discourse community caps shadowed PointLights at <16.
- **Three.js's `≤3 active lights` guideline** ([Discover three.js — Tips & Tricks](https://discoverthreejs.com/tips-and-tricks/)). We're 12× over.

## 4. The menu of alternatives (detail)

### 4.1 HDR-color proxies + raised bloom threshold (no PointLights)

**What:** Remove all 36 `PointLight`s. Push proxy colors into HDR (e.g. `color.setRGB(2.0, 0.0, 0.0)` on a `toneMapped: false` `MeshBasicMaterial`). Raise `UnrealBloomPass.threshold` from `0.0` to `~1.0` so only HDR-bright pixels bloom. Animate `color` intensity (or use 4.16 with `emissiveIntensity`) from 0 → peak instead of animating `PointLight.intensity`.

**Important correction:** `MeshBasicMaterial` has **no `emissive` property** (confirmed against [official docs](https://threejs.org/docs/pages/MeshBasicMaterial.html)). The current proxies are already effectively "emissive" because they ignore lighting (`MeshBasicMaterial` + `toneMapped: false`). The HDR trick still works because `Color.setRGB` accepts unclamped float values which propagate to the fragment output. If you want canonical emissive intensity control with bloom, use 4.16 (`MeshStandardMaterial`).

**Visual mapping:**
- Bulbs (1): ✅ Emissive/HDR proxy mesh visible through cutout.
- Halo (2): ✅ Existing halo sprites + tuned bloom strength.
- Interior spill (3): ❌ **The key tradeoff.** Emissive/HDR materials do not illuminate surrounding geometry — they only bloom in screen space. Combine with §4.4 (DirectionalLight), §4.5 (LightProbe), §4.13 (env map), §4.12 (decals), or §4.17 (god rays) to recover spill.
- Runtime color (4): ✅ Animate `color.r/g/b`.
- Driver coupling (5): ✅ Same `LedEffectAnimator.writeLed()` callback; now writes `material.color` instead of `light.intensity`.

**Perf delta:** Eliminates the ~66 ms/frame `PointLight` per-fragment cost. Bloom pass cost unchanged (already at `resolutionScale: 0.5`).

**Citations:**
- [manthrax on discourse](https://discourse.threejs.org/t/optimizing-bloom-effect-in-three-js-for-vehicle-lights/66900/4): *"SelectiveBloom was only really necessary in the olden days when the color pipeline clamped colors to 0 to 1 range. Use an emissive color higher than 1 to push it over the bloom threshold."*
- [Official three.js WebGPU bloom-emissive example](https://threejs.org/examples/webgpu_postprocessing_bloom_emissive.html) — canonical modern pattern.

**Risks:** Atmospheric spill loss is the load-bearing concern. May feel less "alive" without combining with spill source. Removing `toneMapped: false` and going `MeshStandardMaterial` (4.16) requires exposure retuning.

**Effort:** Low. ~3 days.

---

### 4.2 onBeforeCompile range-cull patch (keep all 36 PointLights)

**What:** Use `material.onBeforeCompile` (or global `THREE.ShaderChunk` patch — riskier) to inject an early `continue` into the PointLight loop in `lights_fragment_begin`. Originally proposed in [discourse: Optimizing Point Lights](https://discourse.threejs.org/t/optimizing-point-lights/36153).

The patch idea (adapted to the verified current chunk):

```glsl
// Replace #pragma unroll_loop_start with a dynamic loop in lights_fragment_begin
for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
  pointLight = pointLights[ i ];
  // Cheap range check BEFORE getPointLightInfo (skips the normalize+attenuation)
  vec3 lVector = pointLight.position - geometryPosition;
  if ( dot(lVector, lVector) > pointLight.distance * pointLight.distance ) { continue; }
  getPointLightInfo( pointLight, geometryPosition, directLight );
  RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
}
```

Or the simpler version (multiply `light.color` by `step(d, cutoff)`, then `continue` when `light.color == 0`). Discourse claims 60% gain 50→80 lights and 58× total with 250 lights.

**Visual mapping:** Zero visual change.

**Perf delta:** For our 36 lights at 7.84 M pixels, likely 2–4× speedup depending on geometry — most pixels are within range of at least 1–2 seal accent lights, so early-exit primarily helps pixels far from the drum (sky, board edges).

**Risks:**
- Patching `THREE.ShaderChunk` globally affects every lit material. Use `onBeforeCompile` per-material for surgical scope.
- Three.js can change chunk internals between versions. Patch is tied to the pinned version.
- No three.js maintainer endorsement — community-contributed.
- `step(d, 0)` corner case: lights with `distance: 0` (infinite range) would misbehave. We always set `distance`, so fine.

**Effort:** Low. One file, ~30 lines.

---

### 4.3 Fixed-pool of N lights with virtual reassignment

**What:** Constant N (e.g. 8 or 16) `PointLight`s `visible: true` for scene lifetime. Each frame, the top-N active LEDs (by `driver.v` or by camera-distance) get assigned to the N slots; inactive LEDs sit at `intensity: 0`. Pattern documented in [discourse: Point lights and performance, revisited](https://discourse.threejs.org/t/point-lights-and-performance-revisited/49316).

**Visual mapping:**
- Bulbs (1) + Halo (2): keep emissive proxies (4.1) + halo sprites everywhere.
- Spill (3): preserved for the top-N most-active LEDs. Acceptable if N≥8 (one accent light's spill covers ~⅓ of the drum interior).
- Runtime color (4): trivial (color is a uniform).
- Driver coupling (5): driver-write callback writes to the *currently-assigned slot*, not a fixed one. Slot reassignment runs in `updateLightsGate()`.

**Perf delta:** Per-fragment from O(36) → O(N). N=8 → 4.5× reduction → ~15 ms idle/active → v-sync cap.

**Risks:**
- Visual popping on slot reassignment mid-effect. Mitigations: hysteresis, fade-on-reassign, or pick N high enough to cover steady states (12 covers all seal accents).
- Doesn't address proxy/halo cost — but those aren't the bottleneck.

**Effort:** Medium. ~1 week including hysteresis tuning.

---

### 4.4 Two `DirectionalLight`s instead of 36 PointLights

**What:** Replace all 36 PointLights with **two fixed `DirectionalLight`s** positioned to illuminate the drum interior. Red color. Intensity driven by `max(driver.v)` across all LEDs. Keep emissive proxies + halos (4.1 + 4.16) for per-bulb visual.

**Visual mapping:**
- Bulbs (1) + Halo (2): from 4.1 / 4.16.
- Spill (3): produced by the 2 DirectionalLights. **Global**, not per-LED. Lights whole drum interior red whenever any LED is active.
- Runtime color (4): trivial — set DirectionalLight color from config.
- Driver coupling (5): aggregate function lives in `updateLightsGate()` (renamed).

**Perf delta:**
- DirectionalLight is per-pixel cheaper than PointLight (no distance attenuation math — verified in §3).
- 2 lights vs 36 = **18× fewer per-fragment loop iterations**.
- Bloom can be tuned independently.

**Risks:**
- Loses temporal locality (when one LED breathes alone, whole drum lights). Worth A/B'ing.
- 2 lights are still in the count hash — keep them `visible: true` always. Use the bulk lights gate machinery already in place ([Tower3DView.ts](../src/3d/Tower3DView.ts) `updateLightsGate`/`setBulkLightsVisible`/`prewarmLightPrograms`) generalised to handle a directional gate.

**Effort:** Low–Medium. Mostly subtractive.

---

### 4.5 LightProbe for interior spill (spherical harmonics)

**What:** Drop 12 seal accent PointLights. Add one `THREE.LightProbe` whose SH3 coefficients are computed analytically each frame from the 12 LED positions + colors + intensities. SH3 = 9 floats / channel × 3 channels = 27 uniforms total. The probe lights all `MeshStandardMaterial` / `MeshLambertMaterial` etc. surfaces globally.

**Important:** `MeshBasicMaterial` ignores `LightProbe` (it ignores all lights, [docs](https://threejs.org/docs/pages/MeshBasicMaterial.html)). The drum body is `MeshStandardMaterial` (loaded from GLB) — that picks up the probe. Proxy meshes (also `MeshBasicMaterial`) don't pick it up, which is fine — they're emissive emitters, not receivers.

**Visual mapping:**
- Bulbs (1) + Halo (2): from 4.1 / 4.16.
- Spill (3): smooth global tint from SH. No per-LED hot spots.
- Driver coupling (5): per-frame: write SH coefficients from known emitter positions + intensities.

**Perf delta:** Replaces O(36) per-fragment work with O(1).

**Citations:** [three.js LightProbe docs](https://threejs.org/docs/pages/LightProbe.html), [LightProbeGenerator](https://threejs.org/docs/pages/LightProbeGenerator.html), [Gentle Light Probing showcase](https://discourse.threejs.org/t/gentle-light-probing/44155).

**Risks:**
- No directional shadow. If we want per-seal hot spots, combine with 4.4 (two directionals).
- Analytical SH-from-point-emitters requires a small math helper — straightforward but new code.

**Effort:** Medium. ~1 week.

---

### 4.6 Baked interior lightmaps, blended by driver

**What:** Bake 12 "single seal lit" lightmaps offline (one per seal LED). At runtime, a custom `ShaderMaterial` on the drum interior reads the 12 textures, blends them by `driver.v` weights. Or pack into one RGBA atlas with 3 channels per LED.

**Visual mapping:**
- Bulbs (1) + Halo (2): unchanged.
- Spill (3): pixel-perfect — these are literal renders of the actual spill we want.
- Driver coupling (5): per-frame uniform write of 12 floats; shader composes weighted sum.

**Perf delta:** O(1) per fragment (one or two texture samples + 12 MAD ops).

**Citations:** [@react-three/lightmap by unframework](https://unframework.com/portfolio/simple-global-illumination-lightmap-baker-for-threejs/) — browser-based GI baker. [mem1b/lightbaking](https://github.com/mem1b/lightbaking).

**Risks:**
- Requires UV2 channel on drum interior. Verify against current GLB.
- VRAM: 12× 1024² R8 ≈ 12 MB; manageable but real. Or use a 4×3 atlas.
- Tied to GLB geometry — model swap requires re-bake.
- Tied to fixed seal positions — design change requires re-bake.

**Effort:** High.

---

### 4.7 Hand-written `ShaderMaterial` for drum interior

**What:** A `THREE.ShaderMaterial` (or `THREE.RawShaderMaterial`) on the drum interior that hard-codes the 36-light contribution as a single-purpose shader. Exploit known geometry — e.g. all emitters live at known azimuths and Y bands, so spill from each emitter onto the cylinder can be analytically computed faster than a general per-fragment loop.

**Visual mapping:** Full control.

**Perf delta:** Potentially huge if you can express contribution as a low-rank product (e.g., sum of 4 azimuthal harmonics × 6 vertical bands instead of 36 individual lights).

**Risks:** Loses three.js's stock paths (ACES, SRGB, shadows, bloom-layer integration). High maintenance cost.

**Effort:** High. Multi-week.

---

### 4.8 Fake-glow material (ektogamat fresnel) + drop bloom

**What:** Apply [ektogamat/fake-glow-material-threejs](https://github.com/ektogamat/fake-glow-material-threejs) to a slightly-larger sphere wrapping each seal proxy. The fake-glow is a view-fresnel: `glow = pow(dot(normal, viewDir), N)`. No bloom postprocessing required.

**Visual mapping:**
- Bulbs (1): the fake-glow material IS the bulb.
- Halo (2): the fresnel falloff replaces the halo sprite.
- Spill (3): ❌ — same gap as 4.1.

**Perf delta:** Eliminates bloom pass + 36 PointLights. Massive.

**Risks:**
- Visual character differs from current bloom-amplified additive halo.
- View-direction fresnel shrinks to a point from perpendicular angles. Test camera arc.

**Effort:** Low–Medium. Material swap + tuning.

---

### 4.9 Textured `SpotLight`s projecting red gradient

**What:** Place 1–4 `THREE.SpotLight`s inside the drum with `spotLight.map = redGradient.png`. Cookie-projector style. **Note:** `SpotLight.map` is shipped (verified added in [r171](https://github.com/mrdoob/three.js/releases/tag/r171), Nov 2024) and **requires `castShadow: true`** per the docs warning.

**Visual mapping:**
- Bulbs (1) + Halo (2): keep emissive proxies + halo sprites.
- Spill (3): the projected gradient texture IS the spill.

**Perf delta:** Trades 36 PointLights for ~4 SpotLights. SpotLight is more expensive per-fragment than PointLight (cone math + 1 shadow map) but 4 ≪ 36 wins overall.

**Risks:**
- Mandatory shadow maps add cost — 1 × 1024² per spotlight by default. Mitigation: drop to 256² or 512² since we only use this for atmosphere, not crisp shadows.
- Cone angle tuning needed.

**Effort:** Medium.

---

### 4.10 WebGPU + clustered rendering (long horizon)

**What:** Migrate to `THREE.WebGPURenderer` (production-ready since r171, Sept 2025 — verified). Adopt clustered-rendering work in the community (e.g. [Shade by Usnul](https://discourse.threejs.org/t/clustered-rendering-on-webgpu/81042) — 16k lights at interactive FPS). Bloom moves to TSL `BloomNode` ([docs](https://threejs.org/docs/pages/BloomNode.html)).

**Visual mapping:** Everything trivially deliverable.

**Perf delta:** Light budget effectively unlimited.

**Risks:**
- WebGPU browser support ~95% in 2026 ([migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)) — but not 100%. Older Chromebooks/iPads may fall back to WebGL2; we'd need to ship both pipelines.
- Clustered rendering is NOT in core three.js — third-party "Shade" renderer is the implementation. Adopting means tracking external work.
- Async init: `await renderer.init()` before first frame.
- TSL conversion: custom GLSL shaders (we don't have any non-stock today, so this is small).
- EffectComposer passes need verification — some work with WebGPU, some don't.

**Effort:** Very High. Architectural.

---

### 4.11 Minimal-cost combo: drop bloom + 2 directional + bright proxies

**What:** Combine 4.1 + 4.4 + 4.8: drop bloom entirely, use plain bright `MeshBasicMaterial` proxies, 2 `DirectionalLight`s inside the drum for spill. Halo sprites already use additive blending — they read as glow without bloom.

**Visual mapping:**
- Bulbs (1): crisp colored spheres (no bloom-amplified glow).
- Halo (2): additive sprite halos alone read as soft glow.
- Spill (3): from the 2 directionals.

**Perf delta:** Eliminates entire bloom pipeline + 34 PointLights. Probably v-sync cap at any canvas size.

**Risks:** Aesthetic change. Mock up first.

**Effort:** Low. Big subtractive change.

---

### 4.12 Decal-projected red gradient on drum interior

**What:** Use `THREE.DecalGeometry` ([docs](https://threejs.org/docs/pages/DecalGeometry.html)) to project a red radial-gradient texture onto the drum interior, one decal per seal LED. Decal material driven by `driver.v` (opacity). No lights at all.

**Visual mapping:**
- Bulbs (1) + Halo (2): keep emissive proxies + halo sprites.
- Spill (3): the decal IS the spill, baked into geometry.

**Perf delta:** Decals are static meshes — drawn once, no per-fragment lighting. Cheaper than SpotLight (no shadow map, no cone math).

**Citations:** [three.js DecalGeometry docs](https://threejs.org/docs/pages/DecalGeometry.html), [discourse: How to draw stuff on stuff](https://discourse.threejs.org/t/how-to-draw-stuff-on-stuff/48934).

**Risks:**
- Decals distort around sharp corners — drum interior is mostly cylindrical so fine.
- 12 decals → 12 small extra meshes (cheap).
- Animation: opacity is the only animatable property without re-projecting.

**Effort:** Medium. New manager class. ~1 week.

---

### 4.13 Runtime-updated environment map

**What:** Add a `CubeCamera` at the drum center, target = `WebGLCubeRenderTarget`. Each frame (or every few frames) render the scene into the cube target. Assign to `scene.environment` — the drum's `MeshStandardMaterial` picks up the red from the emissive proxies via PBR reflection. No light loop at all.

**Visual mapping:**
- Bulbs (1) + Halo (2): from 4.1 / 4.16. Their HDR color goes into the cube map.
- Spill (3): the drum interior PBR-samples the env map → sees red where the proxies are.

**Perf delta:**
- CubeCamera renders the scene 6× per update (one per cube face). Mitigation: use a low-res cube target (e.g. 128² or 64² per face) and update only every N frames.
- Replaces 36 PointLights with 6 scene renders at low res. Probably break-even or win at large canvas; depends on tuning.

**Risks:**
- Cube camera "looks at" the scene from inside the drum — needs careful layer setup so it doesn't capture itself recursively.
- `MeshStandardMaterial.envMapIntensity` and `scene.environmentIntensity` interaction is finicky ([discourse: envMap broken on Standard Materials r132+](https://github.com/mrdoob/three.js/issues/22694)).

**Effort:** Medium.

---

### 4.14 CSS2D / CSS3D overlay for the seal indicators

**What:** Replace the 12 seal proxies + halos with HTML `<div>` markers positioned at the seal cutout screen positions using `CSS3DRenderer` or manual projection. The "glow" is a CSS `box-shadow`/`radial-gradient`/`filter: blur()`. WebGL renders the drum body and accent lighting; HTML renders the LED indicators on top.

**Visual mapping:**
- Bulbs (1) + Halo (2): CSS glow. Different aesthetic.
- Spill (3): ❌ — needs combining with 4.4 or 4.13.

**Perf delta:** Eliminates 12 proxy meshes + 12 halo sprites + 12 accent lights from WebGL. Big cost reduction in the bloom pass and lights loop both.

**Citations:** [CSS3DRenderer docs](https://threejs.org/docs/pages/CSS3DRenderer.html), [CSS2DRenderer docs](https://threejs.org/docs/pages/CSS2DRenderer.html).

**Risks:**
- DOM elements don't participate in WebGL depth — they always render on top. For a drum interior cutout we may want them BEHIND certain geometry (e.g. when the drum rotates a seal out of view), which is hard.
- Updating 12 DOM elements at 60 fps is cheap; updating their CSS transforms during rotation may not be (every layout/paint).

**Effort:** Medium.

---

### 4.15 Swap UnrealBloomPass for pmndrs `SelectiveBloomEffect`

**What:** Replace the current `UnrealBloomPass` + `EffectComposer` plumbing with [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) and `SelectiveBloomEffect`. Modern, well-maintained, more configurable, better selectivity.

**Visual mapping:** Identical or improved (more knobs).

**Perf delta:** Community reports smoother and faster, but I couldn't find quantitative comparisons. Likely a small win on top of a different problem space.

**Risks:**
- New dependency.
- API differs from three.js's stock postprocessing.
- WebGPU has its own `BloomNode` — postprocessing lib has WebGPU support but it's newer.

**Effort:** Medium. Mostly plumbing.

---

### 4.16 Emissive proxies via `MeshStandardMaterial`

**What:** Switch proxy mesh material from `MeshBasicMaterial` → `MeshStandardMaterial { emissive: 0xff2020, emissiveIntensity: 2.0, toneMapped: false }`. This is the canonical three.js pattern for an emissive bulb with bloom integration.

**Visual mapping:**
- Bulbs (1): proper emissive output with `emissiveIntensity` driving the breathe/flicker.
- Halo (2): unchanged halo sprites.

**Perf delta:**
- `MeshStandardMaterial` is more expensive per-fragment than `MeshBasicMaterial` (PBR math, normal calculations, env-map sampling).
- On 12 tiny proxy spheres at radius `0.025 × modelRadius`, the screen-pixel footprint is negligible — cost difference is dominated by program-link overhead which is one-time.

**Risks:**
- Adds 12 lit meshes to the scene. If lighting count changes, this material also recompiles. As long as our gate stays at 2 stable states, fine.
- Worth combining with 4.1 / 4.4 — this is the "right" version of the emissive proxy.

**Effort:** Low. Material constructor change. Plus driver-write tweak (`emissiveIntensity` instead of `color.r`).

---

### 4.17 Volumetric god-ray shafts inside drum

**What:** Inspired by [Codrops: Volumetric Light Rays](https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js/) and [Volumetric Light Shafts](https://threejsdemos.com/demos/lighting/godrays). Add a thin additive cone mesh radiating from each seal toward the drum interior. The cone fragment shader produces a god-ray look from the LED.

**Visual mapping:**
- Bulbs (1): emissive proxies (4.1/4.16).
- Halo (2): unchanged.
- Spill (3): per-seal ray cones provide directional spill on the drum interior.

**Perf delta:** 12 additive cone meshes are cheap to render. Probably a few hundred μs / frame total. No per-fragment light loop.

**Risks:**
- Visual character differs from current — adds dramatic "ray" look that might be too stylised.
- Cones need to be positioned carefully relative to drum interior geometry.

**Effort:** Medium.

---

### 4.18 Consolidated 12-lights design: one PointLight per seal, ledge/base as emissive dots

**What:** A targeted simplification of the current paradigm:
- **Remove all 12 ring `PointLight`s** (layers 0–2 in [Tower3DView.ts:buildLeds](../src/3d/Tower3DView.ts) — the inset-radius lights behind seal cutouts). Currently each is paired with a seal accent light, so they're partly redundant.
- **Remove all 12 ledge/base `PointLight`s** (layers 3–5, corner positions near outer drum surface). These illuminate nothing the user is asking the light to illuminate — the ledge/base LEDs are tiny indicator dots, not atmospheric lights.
- **Keep the 12 seal accent `PointLight`s** from [SealManager.ts:buildSealBacklights](../src/3d/SealManager.ts) — one per ring-level seal, positioned inside the drum at `radius × 0.15`. These are the lights that produce both the cutout glow AND the atmospheric drum-interior spill.
- **Keep all 24 ledge/base proxy meshes + halo sprites** as visible-but-non-illuminating "dots." They're already cheap (`MeshBasicMaterial` + additive sprites). Their `driver.v` still animates opacity for on/off/breathe/flicker.

End state: 12 PointLights total, all inside the drum, one per seal. 24 emissive-dot-only LEDs for ledge/base.

**Visual mapping:**
- Bulbs (1): ✅ Seal cutouts still glow because the inside-drum PointLight backlights the cutout from behind. Ledge/base bulbs read as crisp colored dots without spill — which matches their physical-LED inspiration (small indicator lights, not atmospheric).
- Halo (2): ✅ All 24 halo sprites unchanged.
- Interior spill (3): ✅ Preserved for the 12 seals. Lost for the 12 ledge/base positions (currently faint — those PointLights live at `cornerNearSurfaceRadius = 0.52`, near the outer surface, not the interior).
- Runtime color (4): ✅ Same `applyLightingConfig` path.
- Driver coupling (5): ✅ The existing `LedEffectAnimator.writeLed()` callback already drives proxy + halo opacity for layers 3–5 ([LedEffectAnimator.ts:52–103](../src/3d/LedEffectAnimator.ts#L52-L103)). The PointLight write becomes a no-op for those layers. The seal coupling for layers 0–2 stays — but now it's the only light source for those seals (no double-counting).

**Perf delta:** 36 → 12 PointLights = **3× fewer per-fragment loop iterations** (from §3, that's the dominant cost). At 7.84 M backing pixels, expect ~66 ms/frame → ~22 ms/frame. Combined with [framerate-issue.md §13.6](framerate-issue.md#136-known-minor-limitations)'s baseline of ~14 fps under load, this would push to ~40–50 fps. Not v-sync cap, but a major improvement and visually unchanged for the dominant seal lighting.

**Why it's interesting:**
- **Honest mapping.** One light = one visible illumination source. No "ghost" lights at ledge/base positions that don't really do anything atmospheric.
- **Per-seal locality preserved.** Unlike 4.4 (two global directionals), this still has one localised source per seal — breathing one seal alone lights that seal alone.
- **No new code paradigms.** The existing PointLight + gate + prewarm machinery in [Tower3DView.ts](../src/3d/Tower3DView.ts) all still applies. Just construct fewer lights in `buildLeds()` and `buildSealBacklights()` doesn't change.
- **The current `applyLightingToScene()` (Tower3DView.ts:1231–1246) already iterates `ledRefs` and writes the redLight intensity per LED.** With ring layers 0–2 having no `redLight` (or having one with `intensity` always 0), only the cleanup at the call site changes — and the seal coupling via `SealManager.setSealLed` already drives the inside-drum accent lights for those seals.

**Risks:**
- **Still 12 PointLights in the count hash.** The shader recompile trap from [framerate-issue.md §3](framerate-issue.md#3-the-bug--root-cause) still applies — we'd keep the bulk lights gate machinery but its only state would be 0 ↔ 12 instead of 0 ↔ 36. Prewarm both program variants as today.
- **Loss of ledge/base spill is a visual change.** Mostly subtle — layers 3–5 PointLights are at `cornerNearSurfaceRadius = 0.52` so most of their spill goes outward (cast away from the drum interior). Worth side-by-side mock before committing.
- **The 12 ring proxy meshes + halos currently coexist with the 12 seal proxy meshes + halos** — same seal positions, layered ring+accent. Verify in [SealManager.ts](../src/3d/SealManager.ts) and [Tower3DView.ts:buildLeds](../src/3d/Tower3DView.ts) that removing ring-layer PointLights doesn't also remove the ring proxies (they're separate paths; the proxies are owned by `LedRef`, the seal accent lights by `SealBacklightRef`).
- **Per-fragment cost is still 12× a real PointLight.** Not as cheap as 4.4 (2 DirectionalLights). If 22 ms/frame is acceptable at 7.84 M pixels this works; if v-sync is the bar, combine with 4.2 (range-cull patch) or upgrade to 4.4.

**Combining considerations:**
- **With 4.16 (`MeshStandardMaterial` emissive proxies):** Natural pair. Ledge/base "dots" become canonical emissive bulbs with `emissiveIntensity` animated by `driver.v`. Plays with the raised-bloom-threshold trick in 4.1.
- **With 4.2 (range-cull patch):** Each of the 12 seal lights only matters in a small region of screen space, so the range cull should be very effective here — potentially 6×+ on top of the 3× from light reduction.
- **Stepping stone to 4.4 / 4.5:** If 12 lights at one-per-seal feels right, the natural next step is consolidating those 12 into 1 LightProbe (4.5) for an O(1) cost.

**Effort:** Low. ~2–3 days. Subtractive change in [Tower3DView.ts:buildLeds](../src/3d/Tower3DView.ts) (don't construct PointLights for layers 0–5) + a small change in [LedEffectAnimator.ts:writeLed](../src/3d/LedEffectAnimator.ts) (skip the `redLight.intensity = ...` write when `redLight` is null). The seal coupling already exists. Tests need updating to expect fewer lights.

---

### 4.19 Interior atmospheric sprites (additive blob texture)

**What:** Place 1–3 large `THREE.Sprite`s **inside** the drum per seal, scaled big enough to read as a soft red atmospheric blob through the seal cutout and into the drum interior. Material is `THREE.SpriteMaterial { map: redGradient, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }` — the identical recipe already used by the existing halo sprites ([SealManager.ts:120-136](../src/3d/SealManager.ts#L120-L136)). Opacity driven per-frame by the same `LedEffectAnimator.writeLed()` path that already drives the halos ([LedEffectAnimator.ts:75-98](../src/3d/LedEffectAnimator.ts#L75-L98)).

This is a **quantitative extension** of the technique already deployed for the exterior halo deliverable — adding more, larger sprites placed deeper in the drum to fake the "molten core" atmospheric spill that PointLights currently provide.

**Visual mapping:**
- Bulbs (1): ✅ Keep emissive proxies (4.1 / 4.16) — sprites are atmospheric, not the bulb itself.
- Halo (2): ✅ Existing exterior halo sprites unchanged.
- Interior spill (3): ✅ The interior sprites fake the spill via additive accumulation. **Not surface-conforming** — they're billboards floating in space, not light reflected off the drum interior wall. From most camera angles inside an enclosed drum this reads convincingly; close inspection reveals the trick.
- Runtime color (4): ✅ `SpriteMaterial.color` is uniform-set.
- Driver coupling (5): ✅ Same `LedEffectAnimator.writeLed()` callback that already drives 32 existing halo sprites — extends the branch to drive interior sprites too. No new animation infrastructure.

**Perf delta:**
- Sprites have **no per-fragment light loop cost** — pure additive blend of a small textured quad.
- Estimated cost: ~few µs per sprite on draw, no shader recompile risk (sprites don't enter the lights-count hash). 12–36 new sprites add negligible GPU time vs the ~66 ms/frame the 36 PointLights cost today.
- The existing bloom layer (`BLOOM_LAYER`) accepts sprites without configuration changes — `haloSprite.layers.enable(BLOOM_LAYER)` is already standard in [SealManager.ts:133](../src/3d/SealManager.ts#L133).

**Why it's interesting:**
- **Reuses proven in-tree infrastructure.** The codebase has already shipped this technique for halos with 32 deployed sprites. Extending it is the lowest-novelty path among non-PointLight spill options.
- **Per-seal locality preserved** (unlike 4.4's two directionals). One sprite per seal means one breathing seal lights one zone.
- **No shader-recompile risk.** Sprites are outside the `directionalLength`/`pointLength` shader hash from [framerate-issue.md §3](framerate-issue.md#3-the-bug--root-cause). Adding/removing sprites at runtime is free.
- **Pairs naturally with 4.1.** Emissive HDR proxies for the bulbs + halo sprites for the cutout glow + interior atmospheric sprites for the spill = the full visual deliverable with zero PointLights.
- **Cheaper than 4.17 (god-ray cones).** Sprites are billboarded automatically; no cone geometry to author, position, or animate.

**Risks / limitations:**
- **Camera-aligned, not surface-conforming.** A sprite is a flat quad facing the camera. Real PointLights illuminate the actual drum interior wall — light wraps around concavities. Sprites fake this convincingly from many angles but won't survive close inspection (especially with a free-orbit camera). For a fixed or constrained camera arc this is invisible; for the Tower Emulator's free orbit it's worth A/B-testing.
- **No PBR coupling.** Sprites don't interact with `MeshStandardMaterial`'s metalness/roughness/normal. Real PointLights produce subtle specular highlights on the drum interior that sprites cannot replicate. The current PointLight setup mostly uses diffuse wash anyway, so this gap is minor for our deliverable.
- **Additive saturation.** Overlapping additive sprites accumulate without clamping — three sprites at full opacity in the same pixel = `(3r, 0, 0)` which tonemaps to bright red and bloom-amplifies further. Mitigation: tune `cfg.interior.opacity` carefully; A/B with [collectPerfReport()](../src/3d/Tower3DView.ts) screenshots side-by-side; consider gating to one sprite per seal if multi-sprite saturation reads "blown out."
- **Depth-sort fragility.** With `depthWrite: false` (required for additive blending hygiene) sprites rely on render order. The existing halos set `renderOrder = 3` ([SealManager.ts:134](../src/3d/SealManager.ts#L134)) — interior sprites would need to be ordered after the drum body but before halos.
- **Won't capture a `CubeCamera`.** If we later combine with 4.13 (env map), interior sprites are excluded from PBR reflections — the cube camera renders the scene geometry, not bloom-layer sprites.

**Implementation sketch:**
- Extend `SealManager.buildSealBacklights` to construct N interior sprites per seal alongside the existing halo. New position: same `(x, y, z)` as the seal accent light (`radius × 0.15` inside the drum). Scale: larger than the halo, e.g. `modelRadius × 0.6` vs halo's `× 0.3` factor.
- Reuse the existing radial-gradient `CanvasTexture` from [SealManager.ts:357-377](../src/3d/SealManager.ts#L357-L377) — same `getOrCreateGradientTexture()` cache.
- Extend `SealManager.setSealLed` to drive interior-sprite opacity from `driverV * cfg.interior.opacity` alongside the existing halo+proxy writes.
- New config knob in `ResolvedLightingConfig.leds.sealBacklights.interior`: `{ enabled, count, sizeFactor, opacity }`. Off by default until visually validated.
- For ledge/base LEDs (layers 3–5) — likely *not* applicable. Those LEDs are designed as "dot" indicators without spill (consistent with 4.18's premise). Skip.

**Combining considerations:**
- **With 4.1 + 4.16:** Natural pair. Emissive HDR proxies for bulbs + interior sprites for spill + raised bloom threshold = full deliverable with zero PointLights.
- **With 4.8 (fake-glow):** Sprites also work without bloom (§5.4). Combined: fake-glow for the bulb, interior sprites for spill, drop bloom entirely. Cheapest possible delivery short of 4.11.
- **With 4.11 (drop bloom):** Excellent fit — interior sprites' additive blending reads as glow even without bloom amplification.
- **With 4.14 (CSS overlay):** CSS handles exterior indicators; interior sprites stay in WebGL for spill. Clean separation.
- **With 4.18:** Could be combined as a hybrid — keep 12 seal PointLights AND add interior sprites for amplified atmospheric layer. Probably overkill but valid for visual tuning.
- **Vs 4.17 (god-ray cones):** Same goal (fake spill inside drum) but sprites are cheaper, simpler, reuse in-tree infrastructure. Cones offer more directional shaping; sprites are radial-isotropic. Pick cones for stylized "ray" reads, sprites for ambient "blob" reads.

**Citations:**
- [Stemkoski Shader-Glow demo](https://stemkoski.github.io/Three.js/Shader-Glow.html) — canonical halo/glow patterns.
- [three.js SpriteMaterial docs](https://threejs.org/docs/pages/SpriteMaterial.html) — confirms `blending`, `map`, `depthWrite`, `transparent`.
- [three.js Billboards manual](https://threejs.org/manual/en/billboards.html) — `THREE.Sprite` auto-faces camera; no manual rotation math.
- [Codrops: Volumetric Light Rays with three.js](https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js/) — additive-blend fake-volumetrics overview.
- [Front Dev: Volumetric Lights via Layers](https://www.thefrontdev.co.uk/creating-volumetric-lights-with-radial-blur-in-three.js-using-layers/) — community pattern using additive sprites/meshes inside scene.
- Internal: [SealManager.ts:120-136](../src/3d/SealManager.ts#L120-L136) — the existing halo SpriteMaterial recipe that this option extends.
- Internal: [LedEffectAnimator.ts:75-98](../src/3d/LedEffectAnimator.ts#L75-L98) — the driver-coupling write path that would also drive interior sprites.

**Effort:** Very Low. ~1–2 days. ~50 LOC of subtractive-from-PointLight + additive-of-sprite changes in SealManager + a new config knob. Reuses existing texture cache, render-order convention, bloom layer, and animation driver.

---

## 5. Cross-cutting considerations

### 5.1 `MeshBasicMaterial` has no `emissive`

Verified against [docs](https://threejs.org/docs/pages/MeshBasicMaterial.html) and `node_modules/three/src/materials/MeshBasicMaterial.js`. The current proxies are `MeshBasicMaterial` with `color` + `toneMapped: false` — already effectively emissive in behavior. The HDR-color trick (color.setRGB(>1, 0, 0)) works on it because three.js doesn't clamp color values pre-tonemap.

For canonical emissive control (`emissiveIntensity`, `emissiveMap`), you need a lit material — `MeshStandardMaterial` is the standard choice (option 4.16). This is also what the official [WebGPU bloom-emissive example](https://threejs.org/examples/webgpu_postprocessing_bloom_emissive.html) uses.

### 5.2 Bloom pass cost is not free

Today's renderer pays for two full `renderer.render(scene, camera)` calls per frame ([BloomManager.ts:175–194](../src/3d/BloomManager.ts#L175-L194)) plus two full `scene.traverse()` calls for material-swap. From [framerate-issue.md §13.6](framerate-issue.md#136-known-minor-limitations), this isn't the dominant cost at our canvas sizes but it's meaningful at smaller ones. Options 4.8, 4.11, 4.14 drop bloom entirely; option 4.15 replaces UnrealBloom with the pmndrs equivalent.

### 5.3 `InstancedMesh` cannot do per-instance opacity or emissive natively

[Three.js InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html) confirms only `setMatrixAt` / `setColorAt` / `setMorphAt`. Per-instance opacity or emissive requires:
- Custom shader with `instanceColor` and a new `instanceEmissive` attribute, or
- [Troika InstancedUniformsMesh](https://protectwise.github.io/troika/three-instanced-uniforms-mesh/) — a known-good library that adds `setUniformAt(uniformName, instanceIndex, value)`.

Worth doing alongside any option above to collapse 12+ proxy mesh draw calls into 1. Not a substitute for the bigger options.

### 5.4 Halos already work without bloom

Halo sprites use `THREE.AdditiveBlending` with a radial-gradient canvas texture ([SealManager.ts:104–120](../src/3d/SealManager.ts#L104-L120)). Additive blending is itself a "glow" effect — bloom amplifies it but isn't load-bearing for the soft-halo read. Matters for 4.8, 4.11, 4.14. This same additive-sprite-blob technique can be extended *inside* the drum to fake the atmospheric spill that PointLights currently provide — see §4.19.

### 5.5 The shader-recompile trap is still real

Any option that introduces new `THREE.Light` instances must respect the count-in-the-hash trap ([framerate-issue.md §3](framerate-issue.md#3-the-bug--root-cause)). 2 DirectionalLights (4.4) work as long as their `visible` stays true. The bulk-lights-gate machinery in [Tower3DView.ts](../src/3d/Tower3DView.ts) — `updateLightsGate()`, `setBulkLightsVisible()`, `prewarmLightPrograms()` — is a useful generalisation; keep using it.

### 5.6 GLB constraints

4.6 (lightmap) requires drum interior to have a UV2 channel. 4.13 (env map) needs the drum interior material to be PBR (it is — `MeshStandardMaterial` from GLB). 4.7 (custom shader) would replace the drum material entirely. Verify against the current GLB before committing.

### 5.7 Testability

Most current tests in [tests/unit/Tower3DView.test.ts](../tests/unit/Tower3DView.test.ts) work against `LedRef` / `SealBacklightRef` shape and `__testables` accessors. Swapping the light type underneath without changing the public API would let most tests stay. The mock three.js ([tests/__mocks__/three.js](../tests/__mocks__/three.js)) stubs `PointLight`, `DirectionalLight`, `Sprite`, etc. — adding mock types is straightforward. New shader chunks (4.2) would need a chunk-content snapshot test.

### 5.8 Verification recipe

Whatever direction we pick, verification follows [framerate-issue.md §5](framerate-issue.md#5-diagnostic-api-collectperfreport):

1. Capture `display.collectPerfReport(3000)` at idle and during `angryStrobe01` (sequenceId 5) on the Controller's Tower Emulator at full-window Retina (~7.84 M backing pixels).
2. Compare against current baseline: idle 120 fps / 0 PointLights, sequence 14–17 fps / 36 PointLights, programs +3 on first sequence then stable.
3. The replacement must **beat the sequence fps without regressing idle fps** and without growing `programs` over time.

**Operationally, use the `darktower-3d-perf` Claude Code skill** at [`.claude/skills/darktower-3d-perf/SKILL.md`](../.claude/skills/darktower-3d-perf/SKILL.md). The skill encodes this recipe as a standardized capture protocol (Empty → Idle → Scenario → Post-idle), and its "When evaluating a lighting alternative" section adds:
- The mandatory **baseline-first** workflow (capture on `main` before implementing — without a same-machine baseline, "this is faster" claims are noise).
- The **Empty / 1-LED / All-LEDs scenario triplet**, which surfaces step-cost discontinuities that single-scenario tests miss. The current bulk-lights gate pays full 36-light fragment cost for *one* lit LED — most options in 4.1/4.3/4.4/4.5/4.18 are specifically designed to flatten that step, and the triplet is the test that proves they did.
- A per-alternative-class **expected-signals table** (what `visiblePointLights` / `programs` / `bloomTotalMs` should read after each kind of change, plus the smoking-gun signal that proves the alternative actually took effect — e.g. for 4.2, `frameMs.median` drops while `visiblePointLights` stays at 36).
- A consistent **markdown report format** so two reports separated by an alternative-swap diff cleanly in a PR.

If you change anything in this doc that affects how alternatives should be measured (new options, new success criteria, deprecated approaches), update SKILL.md too.

### 5.9 WebGPU compatibility check

If we move forward with 4.10 (or partial-WebGPU for 4.15), confirm:
- Target browser support set. The Controller's Tower Emulator runs in a browser the user has control over — check the user's primary browser.
- The current `EffectComposer` is WebGL2. WebGPU has separate postprocessing — `BloomNode` in TSL. We'd need new code there.
- `OrbitControls` and other deps work fine in both pipelines.

## 6. Recommended next experiments

Two natural ordering principles:

**Path A — preserve current paradigm, just simplify (lowest risk):**

1. **4.18 first** — consolidated 12-lights design (drop ring + ledge/base PointLights, keep seal accent lights, ledge/base become emissive-dot-only). ~3 days. **3× win on the lights loop with minimal visual change.** Lowest-risk perf improvement available — the visual paradigm doesn't shift, just gets honest.
2. **4.16 alongside** — switch ledge/base proxies to `MeshStandardMaterial` for canonical emissive control. Trivial. Better long-term hygiene.
3. **4.2 alongside** — `onBeforeCompile` range-cull on the remaining 12 lights. Cheap to add, multiplies the win from step 1.
4. **4.5 (LightProbe) if 22 ms/frame from 4.18 isn't enough** — consolidate the 12 seal lights into one analytical SH probe. ~1 week. O(1) per-fragment.

**Path B — replace paradigm (bigger upside, more change):**

1. **4.1 + 4.16 first** — emissive `MeshStandardMaterial` proxies + raised bloom threshold + no PointLights. ~3 days. If atmospheric-spill loss is acceptable, ship and stop. Otherwise add **4.19** (interior atmospheric sprites) — also ~1–2 days and reuses existing halo infrastructure.
2. **4.4 second, only if 4.1+4.16 felt visually flat** — add 2 `DirectionalLight`s inside the drum to recover spill. ~2 days on top.
3. **4.5 (LightProbe) if 4.4 doesn't read right** — replace 2 DirectionalLights with analytical SH probe.
4. **4.12 (decals) as an alternative spill solution** — if 4.4 reads too global and 4.5 reads too smooth.
5. **4.13 (env map) as a wild card** — cheap if cube-camera tuning is feasible.
6. **4.11 (drop bloom entirely) as the dramatic option** — mock up first; if the user likes the look, this is the cheapest possible delivery.

**Either path:**
- **4.2** is risk-free, can ship anytime.
- **4.16** is good hygiene regardless.
- **4.19** is the cheapest spill solution if extending an already-deployed pattern is preferred over introducing 2 DirectionalLights (4.4) or new SH math (4.5).
- **4.6, 4.7, 4.10 deferred** — only if lighter options can't hit the target.
- **4.14 (CSS overlay) special-purpose** — only if seal-indicator UI is decoupled from atmospheric design.

**Recommended starting point: 4.18.** Lowest-effort lowest-risk meaningful perf improvement that preserves the existing visual paradigm. If the resulting framerate is good enough, no further work needed; if not, Path A escalates to 4.5 (LightProbe consolidation) and Path B becomes available as a clean replacement.

## 7. References

External (verified):
- [discourse: Optimizing Point Lights](https://discourse.threejs.org/t/optimizing-point-lights/36153) — range-cull shader patch (58× speedup claim).
- [discourse: Point lights and performance, revisited](https://discourse.threejs.org/t/point-lights-and-performance-revisited/49316) — fixed-pool pattern, shadow-cost caveats.
- [discourse: Talk to me about point lights and performance](https://discourse.threejs.org/t/talk-to-me-about-point-lights-and-performance/48258) — env map alternative recommendation.
- [discourse: Optimizing Bloom for Vehicle Lights](https://discourse.threejs.org/t/optimizing-bloom-effect-in-three-js-for-vehicle-lights/66900) — manthrax's emissive-over-threshold approach.
- [discourse: Light emitting objects](https://discourse.threejs.org/t/light-emitting-objects/24533) — fake-glow + bloom alternatives.
- [discourse: Clustered Rendering on WebGPU](https://discourse.threejs.org/t/clustered-rendering-on-webgpu/81042) — Usnul's 16k-lights work.
- [discourse: Volumetric Lighting in WebGPU](https://discourse.threejs.org/t/volumetric-lighting-in-webgpu/87959) — WebGPU-only froxel approach.
- [discourse: How to draw stuff on stuff](https://discourse.threejs.org/t/how-to-draw-stuff-on-stuff/48934) — decal projection patterns.
- [discourse: pmndrs post-processing — selective bloom](https://discourse.threejs.org/t/pmndrs-post-processing-how-to-get-selective-bloom/58452).
- [three.js MeshBasicMaterial docs](https://threejs.org/docs/pages/MeshBasicMaterial.html) — confirms no `emissive`.
- [three.js MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html) + [emissiveIntensity](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.emissiveIntensity).
- [three.js PointLight docs](https://threejs.org/docs/pages/PointLight.html) — `power`, `decay`, `distance`.
- [three.js DirectionalLight docs](https://threejs.org/docs/pages/DirectionalLight.html).
- [three.js SpotLight docs](https://threejs.org/docs/pages/SpotLight.html) — `map`, requires `castShadow`.
- [three.js LightProbe docs](https://threejs.org/docs/pages/LightProbe.html) + [LightProbeGenerator](https://threejs.org/docs/pages/LightProbeGenerator.html).
- [three.js InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html) — confirms `setMatrixAt` / `setColorAt` / `setMorphAt` only.
- [three.js DecalGeometry docs](https://threejs.org/docs/pages/DecalGeometry.html).
- [three.js CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html) + [CSS2DRenderer docs](https://threejs.org/docs/pages/CSS2DRenderer.html).
- [three.js WebGPURenderer docs](https://threejs.org/docs/pages/WebGPURenderer.html).
- [three.js WebGPU bloom-emissive example](https://threejs.org/examples/webgpu_postprocessing_bloom_emissive.html).
- [three.js r171 release notes](https://github.com/mrdoob/three.js/releases/tag/r171) — `SpotLight.map`, WebGPU production-ready.
- [ektogamat/fake-glow-material-threejs](https://github.com/ektogamat/fake-glow-material-threejs).
- [Troika InstancedUniformsMesh](https://protectwise.github.io/troika/three-instanced-uniforms-mesh/).
- [pmndrs/postprocessing SelectiveBloomEffect](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/SelectiveBloomEffect.js~SelectiveBloomEffect.html).
- [Three.js Journey — Lights, Shading, Shaders](https://threejs-journey.com/lessons/lights-shading-shaders) — ≤3 lights guideline.
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips).
- [WebGPU migration guide 2026](https://www.utsubo.com/blog/webgpu-threejs-migration-guide).
- [@react-three/lightmap by unframework](https://unframework.com/portfolio/simple-global-illumination-lightmap-baker-for-threejs/).
- [Codrops: Volumetric Light Rays](https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js/).
- [Codrops: Risograph Grain Light Effect](https://tympanus.net/codrops/2022/03/07/creating-a-risograph-grain-light-effect-in-three-js/).
- [Volumetric Light Shafts demo](https://threejsdemos.com/demos/lighting/godrays).
- [Stemkoski Shader-Glow demo](https://stemkoski.github.io/Three.js/Shader-Glow.html).

Internal (verified against installed code):
- [LIGHTING.md](LIGHTING.md) — current implementation reference.
- [framerate-issue.md](framerate-issue.md) — the perf cliff and its resolution.
- [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts) — orchestration, bulk lights gate, prewarm.
- [src/3d/SealManager.ts](../src/3d/SealManager.ts) — 12 seal proxies/halos/accent lights.
- [src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts) — driver write path.
- [src/3d/BloomManager.ts](../src/3d/BloomManager.ts) — two-composer pipeline + `darkenNonBloom`.
- `node_modules/three/src/renderers/shaders/ShaderChunk/lights_pars_begin.glsl.js` — PointLight + DirectionalLight info getters (verified for 4.2 patch feasibility).
- `node_modules/three/src/renderers/shaders/ShaderChunk/lights_fragment_begin.glsl.js` — light loop with `#pragma unroll_loop_start`.
