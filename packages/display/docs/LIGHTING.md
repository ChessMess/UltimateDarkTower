# 3D lighting reference

*Docs: [Index](README.md) > 3D tuner > Lighting*

**Before reading:** [API §Tower3DView](API.md#tower3dview) covers the lighting and camera methods that consume this config. [EXAMPLE §3D Options](EXAMPLE.md#panel-3d-options-lighting-and-scene) shows the demo's live editor.

Comprehensive reference for the lighting system in `Tower3DView` — covering both the public configuration surface (what consumers tune) and the internal wiring (how it is rendered). All defaults, behaviors, and constants documented here are linked back to source so they can be verified or modified directly.

## 1. Overview

The 3D scene is illuminated by a small fixed set of light sources, all driven from a single resolved `LightingConfig` value held on `Tower3DView`. The model is lit by a classic three-point rig (hemisphere + key + fill). The on-tower LEDs are **not** lights — each is an HDR-bright emissive proxy mesh + halo sprite on a dedicated bloom layer. A two-pass `UnrealBloomPass` pipeline with its `threshold` raised to `1.0` selects only those HDR-bright pixels and amplifies them, which is what makes the LEDs read as glowing. The seals are lit through the GLB cutouts by the same inside-the-drum proxy/halo system. A noir ground disc catches the key-light shadow and optionally renders a canvas-drawn game board.

Light sources at a glance:

- 1 × `THREE.HemisphereLight` (scene ambient)
- 1 × `THREE.DirectionalLight` (key, camera-parented, casts shadow)
- 1 × `THREE.RectAreaLight` (fill, camera-parented)
- **No per-LED `PointLight`s** — the LEDs are emissive proxies, not lights
- 24 × `THREE.Mesh` (HDR-bright LED proxy "bulbs" on `BLOOM_LAYER` — 12 seal + 12 ledge/base)
- 24 × `THREE.Sprite` (LED halo billboards on `BLOOM_LAYER`)
- Optional equirectangular skybox (HDR/EXR/PNG/JPG) or solid `scene.background` color
- Post-process: `UnrealBloomPass` with a two-composer selective-bloom pipeline
- Renderer: `THREE.ACESFilmicToneMapping` + `THREE.SRGBColorSpace` with configurable exposure
- Optional shadow-catching ground disc + optional canvas-rendered game board overlay

## 2. Table of contents

1. [Overview](#1-overview)
2. [Table of contents](#2-table-of-contents)
3. [Relevant files](#3-relevant-files)
4. [Public exports & import paths](#4-public-exports--import-paths)
5. [Configuration surface](#5-configuration-surface)
6. [Scene lighting (three-point rig)](#6-scene-lighting-three-point-rig)
7. [Tone mapping & exposure](#7-tone-mapping--exposure)
8. [Bloom post-processing](#8-bloom-post-processing)
9. [Skybox & background](#9-skybox--background)
10. [On-tower LEDs (HDR emissive proxies)](#10-on-tower-leds-hdr-emissive-proxies)
11. [Seal backlight LEDs](#11-seal-backlight-leds)
12. [LED effects & driver model](#12-led-effects--driver-model)
13. [Animations](#13-animations)
14. [Ground disc & game board](#14-ground-disc--game-board)
15. [Spatial layout reference](#15-spatial-layout-reference)
16. [Render pipeline](#16-render-pipeline)
17. [Full default config](#17-full-default-config)
18. [Tuning recipes](#18-tuning-recipes)
19. [Debug & inspection](#19-debug--inspection)
20. [Known gaps & discrepancies](#20-known-gaps--discrepancies)

## 3. Relevant files

File-by-file orientation. Use this table to jump straight to the code that owns each subsystem.

| File                                                          | Focus                                                                                                                                                                           | Key exports / classes                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [src/3d/types.ts](../src/3d/types.ts)                         | Lighting type definitions and field-level JSDoc                                                                                                                                 | `LightingConfig`, `LightingConfigCore`, `ResolvedLightingConfig`, `HexColor`, `Vec3`, `CameraConfig`       |
| [src/3d/LightingResolver.ts](../src/3d/LightingResolver.ts)   | Single source of truth for default values; shallow-merge resolver                                                                                                               | `DEFAULT_LIGHTING`, `resolveLighting()`                                                                    |
| [src/3d/SceneLighting.ts](../src/3d/SceneLighting.ts)         | Three-point rig (hemi/key/fill); shadow camera retargeting; idle breathing tween                                                                                                | `SceneLighting` class                                                                                      |
| [src/3d/Tower3DView.ts](../src/3d/Tower3DView.ts)             | Top-level 3D orchestration; bloom pipeline; public lighting methods; re-exports `DEFAULT_LIGHTING` + `resolveLighting`                                                          | `Tower3DView` class                                                                                        |
| [src/3d/SealManager.ts](../src/3d/SealManager.ts)             | 12 seal nodes + per-seal HDR-bright proxy mesh / halo sprite; broken-seal coupling                                                                                              | `SealManager` class, `SealBacklightRef`                                                                    |
| [src/3d/LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts) | Maps `LIGHT_EFFECTS` enum values to GSAP tweens that drive `driver.v ∈ [0,1]`; syncs ring LEDs (layer 0–2) with their corresponding seal backlight via `SealManager.setSealLed` | `LedEffectAnimator` class, `LedRef`                                                                        |
| [src/3d/EntranceAnimator.ts](../src/3d/EntranceAnimator.ts)   | Six-beat noir entrance timeline; auto-starts breathing on completion                                                                                                            | `EntranceAnimator` class                                                                                   |
| [src/3d/GroundDiscManager.ts](../src/3d/GroundDiscManager.ts) | Shadow-catching disc + optional canvas board overlay                                                                                                                            | `GroundDiscManager` class                                                                                  |
| [src/3d/SkyboxManager.ts](../src/3d/SkyboxManager.ts)         | Equirectangular HDR/EXR/PNG/JPG loader with stale-load guard                                                                                                                    | `SkyboxManager` class                                                                                      |
| [src/3d/constants.ts](../src/3d/constants.ts)                 | Azimuths, layer Y-fractions, `RED_LIGHT_LAYOUT`, `BLOOM_LAYER`, `SEAL_LED_RADIUS_FACTOR`                                                                                        | `RING_AZIMUTH`, `CORNER_AZIMUTH`, `LED_LAYOUT`, `RED_LIGHT_LAYOUT`, `BLOOM_LAYER`, `SIDES`, `SIDE_AZIMUTH` |
| [src/3d/utils.ts](../src/3d/utils.ts)                         | Spatial math: polar→Cartesian, red light positioning, seal LED pose                                                                                                             | `polarToXZ()`, `computeRedLightPosition()`, `computeSealLedPose()`                                         |
| [src/TowerDisplay.ts](../src/TowerDisplay.ts)                 | High-level wrapper that forwards lighting calls to `view3d`                                                                                                                     | `TowerDisplay` class                                                                                       |
| [src/types.ts](../src/types.ts)                               | Re-exports `LightingConfig` (note: not in `src/index.ts` package barrel — see [Public exports](#4-public-exports--import-paths))                                                | —                                                                                                          |

## 4. Public exports & import paths

The package barrel ([src/index.ts](../src/index.ts)) re-exports:

```ts
import {
  TowerDisplay,
  TowerStateReadout,
  TowerSideView,
  Tower3DView,
} from 'ultimatedarktowerdisplay';
import type {
  TowerDisplayOptions,
  Tower3DViewOptions,
  ITowerDisplay,
  RendererType,
  TowerSide,
  SealIdentifier,
  CameraConfig,
} from 'ultimatedarktowerdisplay';
```

`LightingConfig`, `DEFAULT_LIGHTING`, and `resolveLighting` are **not** in that barrel. In practice you do not need to import `LightingConfig` directly — TypeScript infers it at the option site:

```ts
new TowerDisplay({
  container,
  lighting: {
    // structural-typed against LightingConfig
    scene: { exposure: 0.9 },
  },
});
```

`DEFAULT_LIGHTING` and `resolveLighting` are re-exported from `Tower3DView.ts` ([Tower3DView.ts:22](../src/3d/Tower3DView.ts#L22)) but only reachable via deep imports in this version. See [Known gaps](#20-known-gaps--discrepancies).

## 5. Configuration surface

There are five entry points that change lighting state.

### 5.1 Construction

```ts
new TowerDisplay({ container, lighting });
new Tower3DView(container, { modelUrl, lighting });
```

The constructor calls `resolveLighting(options.lighting)` once ([Tower3DView.ts:158](../src/3d/Tower3DView.ts#L158)) to merge the partial input with `DEFAULT_LIGHTING`. The fully-resolved config is stored on `this.lighting`.

### 5.2 Full re-resolve at runtime

```ts
display.applyLightingConfig({ scene: { exposure: 0.9 } });
```

Merges via `resolveLighting(partial, currentResolved)` and reapplies every subsystem ([Tower3DView.ts:252-256](../src/3d/Tower3DView.ts#L252-L256)). After applying, the current LED state is replayed via `ledAnimator.replayAll(latestState)` so any changes to `leds.*` immediately recolor and rescale running effects. Does **not** stop the entrance timeline.

### 5.3 Fast scene-lights path

```ts
display.setSceneLights({
  hemi: 0.06,
  key: 1.8,
  fill: 5.5,
  exposure: 0.8,
  keyX: 3,
  keyY: 5,
  keyZ: -1,
});
```

Direct property writes for the three-point rig ([Tower3DView.ts:209-244](../src/3d/Tower3DView.ts#L209-L244)). Three guarantees:

- **Always stops the entrance timeline** ([Tower3DView.ts:219](../src/3d/Tower3DView.ts#L219)) — manual edits win over the cinematic.
- **Writes back into `this.lighting`** so a subsequent `getLightingConfig()` reflects the changes.
- **Restarts breathing with the new key target** if the breathing tween is currently running and `key` is set.

### 5.4 Subsystem-specific toggles

```ts
display.setSkyboxUrl('https://example.com/sky.hdr'); // null clears
display.setGroundDiscVisible(true);
display.setBoardDiscEnabled(false);
```

`setSkyboxUrl` writes back to `this.lighting.scene.skyboxUrl`. `setBoardDiscEnabled` writes back to `this.lighting.boardDisc.enabled`. `setGroundDiscVisible` does not write back — it only toggles `Object3D.visible` on the disc mesh; there is no `groundDisc.enabled` field.

### 5.5 Animations and inspection

```ts
display.playEntrance(); // see Section 13
const config = display.getLightingConfig(); // JSON-cloned snapshot
```

`playEntrance` is never called automatically; consumers must invoke it. It auto-transitions to the idle breathing tween via `onComplete` ([EntranceAnimator.ts:50](../src/3d/EntranceAnimator.ts#L50)). `getLightingConfig` returns a deep clone so callers can mutate freely without affecting internal state ([Tower3DView.ts:247-249](../src/3d/Tower3DView.ts#L247-L249)).

## 6. Scene lighting (three-point rig)

Implemented in [`SceneLighting`](../src/3d/SceneLighting.ts). All three lights are constructed once in the constructor and updated in `applyLights()` whenever the config changes.

### 6.1 Hemisphere

`THREE.HemisphereLight` providing scene-wide ambient (sky color blended with ground bounce). Defaults are intentionally low — most of the look comes from key + fill, not ambient.

| Field                        | Type       | Default    | Description                             |
| ---------------------------- | ---------- | ---------- | --------------------------------------- |
| `scene.hemisphere.color`     | `HexColor` | `0xffffff` | Sky color                               |
| `scene.hemisphere.ground`    | `HexColor` | `0x000000` | Ground bounce color (black = no bounce) |
| `scene.hemisphere.intensity` | `number`   | `0.04`     | Ambient strength                        |

Source: [SceneLighting.ts:26-31](../src/3d/SceneLighting.ts#L26-L31).

### 6.2 Key (directional, shadow-casting)

`THREE.DirectionalLight`, parented to the camera with target at camera-local `(0, 0, -10)`. Camera-parenting means the key orbits with the viewer, so modeling reads consistently from any angle.

| Field                                  | Type       | Default        | Description                                        |
| -------------------------------------- | ---------- | -------------- | -------------------------------------------------- |
| `scene.key.color`                      | `HexColor` | `0xffffff`     | Light color                                        |
| `scene.key.intensity`                  | `number`   | `1.6`          | Light intensity                                    |
| `scene.key.position`                   | `Vec3`     | `[3, 4.5, -1]` | Camera-local position                              |
| `scene.key.shadow.mapSize`             | `number`   | `2048`         | Shadow map resolution (square)                     |
| `scene.key.shadow.bias`                | `number`   | `-0.0003`      | Shadow bias                                        |
| `scene.key.shadow.normalBias`          | `number`   | `0.02`         | Normal-based bias                                  |
| `scene.key.shadow.frustumRadiusFactor` | `number`   | `1.3`          | Ortho frustum half-size as factor of `modelRadius` |
| `scene.key.shadow.farFactor`           | `number`   | `10`           | Shadow camera far plane as factor of `modelRadius` |

The shadow camera is recomputed in `retargetShadows()` ([SceneLighting.ts:113-124](../src/3d/SceneLighting.ts#L113-L124)) every time `applyLights` runs, so it stays correct after model swaps and config re-resolves. Renderer shadow setup is `shadowMap.enabled = true` and `shadowMap.type = THREE.PCFShadowMap` ([Tower3DView.ts:414-415](../src/3d/Tower3DView.ts#L414-L415)).

Source: [SceneLighting.ts:33-50](../src/3d/SceneLighting.ts#L33-L50).

### 6.3 Fill (RectAreaLight)

`THREE.RectAreaLight`, parented to the camera and made to face the model centre via `lookAt(0, 0, 0)` **every frame** in the render loop ([Tower3DView.ts:627](../src/3d/Tower3DView.ts#L627)) — so the rectangle keeps facing origin as the camera orbits.

| Field                  | Type       | Default         | Description                                           |
| ---------------------- | ---------- | --------------- | ----------------------------------------------------- |
| `scene.fill.color`     | `HexColor` | `0xffffff`      | Light color                                           |
| `scene.fill.intensity` | `number`   | `5.0`           | Light intensity (high — area light decay is physical) |
| `scene.fill.width`     | `number`   | `1.5`           | Rectangle width                                       |
| `scene.fill.height`    | `number`   | `2.5`           | Rectangle height                                      |
| `scene.fill.position`  | `Vec3`     | `[-4, 1.5, -8]` | Camera-local position (opposite side from key)        |

`RectAreaLightUniformsLib.init()` is called once globally and skipped when `window` is unavailable ([SceneLighting.ts:6-12](../src/3d/SceneLighting.ts#L6-L12)) — this is the test-environment guard.

Source: [SceneLighting.ts:52-62](../src/3d/SceneLighting.ts#L52-L62).

## 7. Tone mapping & exposure

Set during `initScene` ([Tower3DView.ts:411-413](../src/3d/Tower3DView.ts#L411-L413)):

```ts
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = lighting.scene.exposure;
```

| Field            | Type     | Default | Description                    |
| ---------------- | -------- | ------- | ------------------------------ |
| `scene.exposure` | `number` | `0.7`   | Renderer tone-mapping exposure |

The entrance cinematic dips this to `0.7 × 0.15 = 0.105` for the silhouette beat ([EntranceAnimator.ts:55-59](../src/3d/EntranceAnimator.ts#L55-L59)). Update via `scene.exposure` config or `setSceneLights({ exposure })`.

## 8. Bloom post-processing

`UnrealBloomPass` plus a two-composer pipeline (`bloomComposer` → `finalComposer`) built in `initScene` ([Tower3DView.ts:420-449](../src/3d/Tower3DView.ts#L420-L449)).

| Field                          | Type      | Default | Description                                                                                                 |
| ------------------------------ | --------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `scene.bloom.enabled`          | `boolean` | `true`  | Build the bloom pipeline at all                                                                             |
| `scene.bloom.strength`         | `number`  | `1.5`   | Glow intensity (0–3)                                                                                        |
| `scene.bloom.radius`           | `number`  | `0.5`   | Bloom spread radius (0–1)                                                                                   |
| `scene.bloom.threshold`        | `number`  | `1.0`   | Luminance threshold — `1.0` means only HDR-bright pixels (the LED proxies/halos, scaled by `HDR_PROXY_SCALE`) bloom |
| `scene.bloom.resolutionScale`  | `number`  | `0.5`   | Bloom render-target size as a fraction of the canvas backing buffer. Visually transparent; ~4× GPU savings. |

`resolutionScale` only affects the `bloomComposer` (the offscreen target where the scene is re-rendered for bloom extraction + UnrealBloomPass blurs); `finalComposer` always renders at full canvas resolution. The bloom result is upsampled by the GPU's bilinear sampler when composited. Bloom is intrinsically a wide Gaussian blur — rendering it at half or quarter resolution is visually indistinguishable from full res because the blur smears over any aliasing introduced by the downsample. See [`docs/framerate-issue.md`](framerate-issue.md) for the perf rationale.

Selective-bloom mechanism:

1. Meshes that should bloom call `mesh.layers.enable(BLOOM_LAYER)` (`BLOOM_LAYER = 1`, [constants.ts:99](../src/3d/constants.ts#L99)).
2. Each frame the render loop calls `darkenNonBloom()` to swap non-bloom-layer materials to a black `MeshBasicMaterial`, renders `bloomComposer` so only bright/bloom-layer pixels contribute, calls `restoreMaterials()`, then renders the final composite via `finalComposer` ([Tower3DView.ts:598-621, 623-650](../src/3d/Tower3DView.ts#L598-L650)).

Currently on `BLOOM_LAYER`: every LED proxy mesh and halo sprite — the 12 seal proxies/halos ([SealManager.ts](../src/3d/SealManager.ts)) plus the 12 ledge/base proxies/halos built in `buildLeds()`. Their materials are `toneMapped: false` and colored via `applyHdrColor()` (× `HDR_PROXY_SCALE`), so at peak driver value their pixels exceed the `threshold: 1.0` selector and bloom; below ≈⅓ driver they fall under the threshold and read as a dim, un-bloomed mesh. No `PointLight`s contribute to bloom.

Note: `scene.bloom.enabled: false` skips constructing the pipeline entirely; the render loop falls back to a plain `renderer.render(scene, camera)` call.

## 9. Skybox & background

Two ways to set what is behind the model.

| Field              | Type       | Default    | Description                                             |
| ------------------ | ---------- | ---------- | ------------------------------------------------------- |
| `scene.background` | `HexColor` | `0x000000` | Solid clear color when no skybox is loaded              |
| `scene.skyboxUrl`  | `string`   | `''`       | Equirectangular image URL — `.hdr`/`.exr`/`.png`/`.jpg` |

`SkyboxManager.apply(url, bgColor)` ([SkyboxManager.ts:19-52](../src/3d/SkyboxManager.ts#L19-L52)) handles loading: `.hdr`/`.exr` go through `HDRLoader`, others through `THREE.TextureLoader`. Loaded textures get `mapping = THREE.EquirectangularReflectionMapping` and are assigned to `scene.background`.

**Stale-load guard**: if `apply()` is called again with a different URL while a previous load is still in flight, the older result is disposed and discarded on completion ([SkyboxManager.ts:32-36](../src/3d/SkyboxManager.ts#L32-L36)).

Runtime control via `setSkyboxUrl(url | null)` ([Tower3DView.ts:295-298](../src/3d/Tower3DView.ts#L295-L298)). Passing `null` writes `''` back into `this.lighting.scene.skyboxUrl` and reverts to the solid `scene.background` color.

## 10. On-tower LEDs (HDR emissive proxies)

The 24 on-tower LEDs (6 layers × 4 lights) are **not** lights — there are no per-LED `PointLight`s. Each is a ref in `ledRefs: Map<string, LedRef>` keyed `"${layer}:${light}"`, built in `buildLeds()` ([Tower3DView.ts](../src/3d/Tower3DView.ts)):

- **Ring layers 0–2** render through the 12 seal proxies/halos owned by `SealManager` (see [§11](#11-seal-backlight-leds)); their `LedRef` carries no geometry of its own.
- **Ledge (layer 3) + base (layers 4–5)** each own an HDR-bright proxy sphere (`MeshBasicMaterial`, `toneMapped: false`) + additive halo sprite on `BLOOM_LAYER`, configured by `leds.ledgeLeds` / `leds.baseLeds`.

There is no light intensity, distance, or decay to configure. Each LED's brightness is its proxy/halo **material opacity**, written from `driver.v`; the proxy/halo color is pushed into HDR by `applyHdrColor()` (× `HDR_PROXY_SCALE = 3.0`, [constants.ts](../src/3d/constants.ts)) so that at peak driver the pixels cross the `UnrealBloomPass.threshold` of `1.0` and bloom.

Layer/azimuth assignment via `computeRedLightPosition()` ([utils.ts](../src/3d/utils.ts)):

- **Layers 0–2** (top/middle/bottom rings): cardinal `RING_AZIMUTH = [0, π/2, π, -π/2]` (N/E/S/W), radial `RED_LIGHT_LAYOUT.ringInsetRadius = 0.35` (inset inside the drum)
- **Layers 3–5** (ledge/base1/base2): corner `CORNER_AZIMUTH = [π/4, 3π/4, 5π/4, 7π/4]` (NE/SE/SW/NW), radial `RED_LIGHT_LAYOUT.cornerNearSurfaceRadius = 0.52` (near outer surface, between cardinal seal positions)

Y position from `LED_Y_FRACTIONS` keyed by layer index ([constants.ts:78-85](../src/3d/constants.ts#L78-L85)):

| Layer | Name        | Y fraction of `modelRadius` |
| ----- | ----------- | --------------------------- |
| 0     | top ring    | `0.83`                      |
| 1     | middle ring | `0.53`                      |
| 2     | bottom ring | `0.23`                      |
| 3     | ledge       | `-0.36`                     |
| 4     | base1       | `-0.26`                     |
| 5     | base2       | `0.02`                      |

**Color config:** ring LEDs take `leds.sealBacklights.color`; ledge/base take `leds.ledgeLeds.color` / `leds.baseLeds.color`. All default to `0xff2020` (bright red).

**Driver model**: each LED stores `driver: { v: number }` ∈ [0,1], animated by `LedEffectAnimator.setEffect()` (see [Section 12](#12-led-effects--driver-model)). The write callback drives proxy + halo opacity directly:

```ts
proxyMesh.material.opacity = driver.v;
proxyMesh.visible = driver.v > 0.001;
haloSprite.material.opacity = driver.v * halo.opacity;
```

The HDR-scaled material color (set once via `applyHdrColor`) is what carries that opacity over the bloom threshold. There are no per-frame light writes, so sequence transitions never trigger a shader recompile. Program variants for the proxy/halo + bloom materials are pre-compiled once at scene init by `prewarmBloomPrograms()` so the first sequence start is stall-free.

## 11. Seal backlight LEDs

Two components per ring-level seal (4 sides × 3 ring levels = 12 seals × 2 components), both parented to the **model root** — not the seal node — so they stay at fixed cardinal positions while drums rotate ([SealManager.ts](../src/3d/SealManager.ts)).

### 11.1 Proxy mesh

`THREE.Mesh` with `MeshBasicMaterial`. The directly-visible "LED bulb" seen through the GLB cutout holes.

- Sphere or cylinder geometry; radius `modelRadius × proxy.sizeFactor (0.025)`
- `transparent: true`, `depthWrite: false`, `toneMapped: false`
- On `BLOOM_LAYER`
- Visibility & opacity driven by `driver.v`

Source: [SealManager.ts:84-100](../src/3d/SealManager.ts#L84-L100).

### 11.2 Halo sprite

`THREE.Sprite` with a radial-gradient `CanvasTexture` (white centre → transparent edge, generated once per `SealManager` in `getOrCreateGradientTexture()` [SealManager.ts:315-335](../src/3d/SealManager.ts#L315-L335)).

- Scale `modelRadius × halo.sizeFactor (0.14)`
- `AdditiveBlending`, `depthWrite: false`, `toneMapped: false`
- On `BLOOM_LAYER`
- Opacity = `driver.v × halo.opacity (0.75)`

Source: [SealManager.ts:104-120](../src/3d/SealManager.ts#L104-L120).

> **No accent PointLight.** Earlier builds added a per-seal `PointLight` for atmospheric spill onto the drum interior. That light is gone — the HDR-bright proxy + halo (crossing the raised bloom threshold) carry the seal's glow on their own. A consequence is that the drum interior between seals reads dark rather than washed with red; see [§11.4](#114-why-the-user-perceives-an-exterior-glow).

### 11.3 Position

Both components share `(x, y, z)` computed by `computeSealLedPose(layer, lightIdx, modelRadius, radiusFactor)` ([utils.ts](../src/3d/utils.ts)) — cardinal azimuth at `radius × radiusFactor (0.15)` deep inside the drum. Light travels drum-interior → glyph/chute cutout → seal → camera; depth testing handles occlusion automatically.

### 11.4 Why the user perceives an "exterior glow"

There is **no** light positioned outside the drum aimed inward at the seal exterior face. The apparent exterior glow is produced by two combined effects:

1. The **proxy mesh** is a tiny HDR-bright sphere (`MeshBasicMaterial`, `toneMapped: false`, on `BLOOM_LAYER`) visible through the cutout.
2. The **halo sprite** is a `0.14 × modelRadius` billboard whose pixels, after `UnrealBloomPass` (`strength: 1.5` by default), bleed visually well beyond the cutout edges.

Both emitters sit inside the drum, yet the bloomed result reads as an exterior glow at the cutout. Because there is no longer an accent `PointLight`, the drum-interior surfaces *between* seals read dark — the glow is localized to the cutouts rather than washing the interior. If a true exterior fill on seal faces (or an interior wash) is wanted, it is a new feature — see the recipe gap in [Section 18](#18-tuning-recipes).

### 11.5 Driver coupling and broken seals

Drivers for the seal backlights are not animated independently. Instead, `LedEffectAnimator.setEffect(layer, light, effect)` for layers 0–2 calls `sealManager.setSealLed(\`${side}:${level}\`, driver.v, lighting)`from inside its`write` callback ([LedEffectAnimator.ts:42-49](../src/3d/LedEffectAnimator.ts#L42-L49)). Layers 3–5 (ledge/base) do not have seal backlights — the synchronization only spans the three ring levels.

Broken-seal handling: `applySeals(brokenSeals, lighting)` ([SealManager.ts:193-206](../src/3d/SealManager.ts#L193-L206)) toggles `sealNode.visible` and updates the backlight when a seal becomes broken:

- `backlightWhenBroken: true` (default): backlight keeps its current driver
- `backlightWhenBroken: false`: backlight driver is forced to 0

`setSealLed(key, driverV, lighting)` ([SealManager.ts](../src/3d/SealManager.ts)) is the single write path for opacity and visibility on both components. It is called from both `LedEffectAnimator` and `applySeals`.

### 11.6 Configuration

| Field                                     | Type                     | Default    | Description                                     |
| ----------------------------------------- | ------------------------ | ---------- | ----------------------------------------------- |
| `leds.sealBacklights.enabled`             | `boolean`                | `true`     | Master enable for all seal LED visuals          |
| `leds.sealBacklights.color`               | `HexColor`               | `0xff2020` | Color for the proxy mesh and halo sprite        |
| `leds.sealBacklights.radiusFactor`        | `number`                 | `0.15`     | Radial position factor (inside drum)            |
| `leds.sealBacklights.backlightWhenBroken` | `boolean`                | `true`     | Keep backlight on when seal is broken           |
| `leds.sealBacklights.proxy.enabled`       | `boolean`                | `true`     | Render the proxy mesh                           |
| `leds.sealBacklights.proxy.sizeFactor`    | `number`                 | `0.025`    | Proxy sphere radius factor                      |
| `leds.sealBacklights.proxy.geometry`      | `'sphere' \| 'cylinder'` | `'sphere'` | Proxy mesh shape                                |
| `leds.sealBacklights.halo.enabled`        | `boolean`                | `true`     | Render the halo sprite                          |
| `leds.sealBacklights.halo.sizeFactor`     | `number`                 | `0.14`     | Halo sprite scale factor                        |
| `leds.sealBacklights.halo.opacity`        | `number`                 | `0.75`     | Halo peak opacity at `driver.v = 1`             |

## 12. LED effects & driver model

`LIGHT_EFFECTS` is exported by the peer dependency `ultimatedarktower`. `LedEffectAnimator.setEffect(layer, light, effect)` ([LedEffectAnimator.ts](../src/3d/LedEffectAnimator.ts)) maps each effect to a GSAP tween that writes to `driver.v`. The same `write` callback drives the ledge/base LED proxy + halo opacity and (for layers 0–2) the matching seal backlight.

| Effect               | Tween target              | Easing       | Loop      | Duration source                   |
| -------------------- | ------------------------- | ------------ | --------- | --------------------------------- |
| `on`                 | `v: 1`                    | linear       | —         | `animation.fadeS` (`0.15s`)       |
| `off` (also default) | `v: 0`                    | linear       | —         | `animation.fadeS` (`0.15s`)       |
| `breathe`            | `v: 1`, yoyo              | `sine.inOut` | repeat -1 | `animation.breatheS` (`2.0s`)     |
| `breatheFast`        | `v: 1`, yoyo              | `sine.inOut` | repeat -1 | `animation.breatheFastS` (`0.8s`) |
| `breathe50percent`   | `v: 0.5`, yoyo            | `sine.inOut` | repeat -1 | `animation.breatheS` (`2.0s`)     |
| `flicker`            | `v: 1` then yoyo to `0.2` | `steps(1)`   | repeat -1 | `animation.flickerS` (`0.3s`)     |

`replayAll(state)` ([LedEffectAnimator.ts:86-93](../src/3d/LedEffectAnimator.ts#L86-L93)) is called on every `applyState` to drive every LED in the grid from the latest `TowerState`, and again from `applyLightingConfig` ([Tower3DView.ts:255](../src/3d/Tower3DView.ts#L255)) so config changes immediately recolor and rescale running effects.

## 13. Animations

Two timed sequences sit on top of the static lighting state.

### 13.1 Idle breathing

A looping yoyo GSAP tween on `key.intensity` to `keyTarget × peakFactor` over `durationS`, eased `sine.inOut` ([SceneLighting.ts:87-102](../src/3d/SceneLighting.ts#L87-L102)).

| Field                              | Type     | Default | Description                           |
| ---------------------------------- | -------- | ------- | ------------------------------------- |
| `animation.idleBreathe.peakFactor` | `number` | `1.08`  | Overshoot multiplier on key intensity |
| `animation.idleBreathe.durationS`  | `number` | `4`     | Yoyo cycle duration in seconds        |

Started by `EntranceAnimator`'s `onComplete` ([EntranceAnimator.ts:50](../src/3d/EntranceAnimator.ts#L50)). Killed by `stopBreathing()`. `setSceneLights` restarts it with the new key target if `key` is set and breathing was already running.

### 13.2 Entrance cinematic

Six-beat GSAP timeline driven by `EntranceAnimator.play()` ([EntranceAnimator.ts:18-118](../src/3d/EntranceAnimator.ts#L18-L118)). Triggered by `playEntrance()` — never auto-called.

Initial state ([EntranceAnimator.ts:37-44](../src/3d/EntranceAnimator.ts#L37-L44)): `hemi.intensity = key.intensity = fill.intensity = renderer.toneMappingExposure = 0`, then key snapped to `(-|keyX| × 1.8, keyY × 0.25, keyZ - 8)`. Targets are captured from the lights' current values **at play time**, so calling `playEntrance` after `setSceneLights` adopts the new targets.

Beat-by-beat:

| Beat                     | Target                                                                        | Duration source               | Delay source              | Easing         |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------- | ------------------------- | -------------- |
| 1a (silhouette exposure) | `renderer.toneMappingExposure → exposure × silhouetteExposureFactor` (`0.15`) | `silhouetteDurationS` (`1.4`) | `0`                       | `power1.in`    |
| 1b (silhouette hemi)     | `hemi.intensity → hemi × silhouetteHemiFactor` (`0.25`)                       | `silhouetteDurationS` (`1.4`) | `0`                       | `power1.in`    |
| 2 (key arc 1)            | `key.position → (keyX × 0.2, max(keyY × 1.8, keyY+3), keyZ − 3)`              | `keyArc1DurationS` (`0.9`)    | `keyArc1DelayS` (`1.2`)   | `power2.in`    |
| 3a (key punch)           | `key.intensity → key × peakKeyFactor` (`2.5`)                                 | `keyPunchDurationS` (`0.6`)   | `keyPunchDelayS` (`1.5`)  | `power3.out`   |
| 3b (exposure in)         | `renderer.toneMappingExposure → exposure` (target)                            | `exposureInDurationS` (`1.2`) | `keyPunchDelayS` (`1.5`)  | `power2.out`   |
| 4 (key arc 2)            | `key.position → (keyX, keyY, keyZ)` (target)                                  | `keyArc2DurationS` (`1.0`)    | `keyArc2DelayS` (`2.1`)   | `power2.out`   |
| 5 (key settle)           | `key.intensity → key` (target)                                                | `keySettleDurationS` (`1.2`)  | `keySettleDelayS` (`2.3`) | `power2.inOut` |
| 6 (fill in)              | `fill.intensity → fill` (target)                                              | `fillInDurationS` (`1.1`)     | `fillInDelayS` (`2.6`)    | `power1.out`   |
| 7 (hemi in)              | `hemi.intensity → hemi` (target)                                              | `hemiInDurationS` (`1.1`)     | `hemiInDelayS` (`2.8`)    | `power1.out`   |

`onComplete: () => sl.startBreathing(targets.key, lighting)` — entrance auto-transitions to idle breathing.

All beat values live under `entrance.beats.*` and are merged via spread (`{ ...base.entrance.beats, ...user?.entrance?.beats }`, [LightingResolver.ts:213](../src/3d/LightingResolver.ts#L213)). This is the **only** branch in the resolver that uses spread merge — every other branch uses leaf-level nullish-coalesce. Setting one beat does not clear the others, but the resolver is internally inconsistent (see [Section 20](#20-known-gaps--discrepancies)).

| Field                                     | Type     | Default | Description                                                 |
| ----------------------------------------- | -------- | ------- | ----------------------------------------------------------- |
| `entrance.peakKeyFactor`                  | `number` | `2.5`   | How far the key overshoots its target during the flash beat |
| `entrance.beats.silhouetteHemiFactor`     | `number` | `0.25`  | Factor of target hemi intensity reached during silhouette   |
| `entrance.beats.silhouetteExposureFactor` | `number` | `0.15`  | Factor of target exposure reached during silhouette         |
| `entrance.beats.silhouetteDurationS`      | `number` | `1.4`   | Silhouette beat duration                                    |
| `entrance.beats.keyArc1DurationS`         | `number` | `0.9`   | Key first-arc duration                                      |
| `entrance.beats.keyArc1DelayS`            | `number` | `1.2`   | Key first-arc delay (timeline t)                            |
| `entrance.beats.keyPunchDurationS`        | `number` | `0.6`   | Key punch duration                                          |
| `entrance.beats.keyPunchDelayS`           | `number` | `1.5`   | Key punch delay                                             |
| `entrance.beats.exposureInDurationS`      | `number` | `1.2`   | Exposure in duration                                        |
| `entrance.beats.keyArc2DurationS`         | `number` | `1.0`   | Key second-arc duration                                     |
| `entrance.beats.keyArc2DelayS`            | `number` | `2.1`   | Key second-arc delay                                        |
| `entrance.beats.keySettleDurationS`       | `number` | `1.2`   | Key settle duration                                         |
| `entrance.beats.keySettleDelayS`          | `number` | `2.3`   | Key settle delay                                            |
| `entrance.beats.fillInDurationS`          | `number` | `1.1`   | Fill in duration                                            |
| `entrance.beats.fillInDelayS`             | `number` | `2.6`   | Fill in delay                                               |
| `entrance.beats.hemiInDurationS`          | `number` | `1.1`   | Hemi in duration                                            |
| `entrance.beats.hemiInDelayS`             | `number` | `2.8`   | Hemi in delay                                               |

### 13.3 Per-effect tween durations

| Field                    | Type     | Default | Description                                   |
| ------------------------ | -------- | ------- | --------------------------------------------- |
| `animation.fadeS`        | `number` | `0.15`  | `on` / `off` tween duration                   |
| `animation.breatheS`     | `number` | `2.0`   | `breathe` / `breathe50percent` cycle duration |
| `animation.breatheFastS` | `number` | `0.8`   | `breatheFast` cycle duration                  |
| `animation.flickerS`     | `number` | `0.3`   | `flicker` step duration                       |

## 14. Ground disc & game board

[`GroundDiscManager`](../src/3d/GroundDiscManager.ts) owns a `THREE.Mesh` with `THREE.CylinderGeometry` and a 3-element material array `[sideMat, topMat, bottomMat]`. Built lazily on first `setVisible(true)` so initial setup does not pay for it if the disc is never shown. Positioned at `modelBottomY - modelRadius × 0.002 - h/2` (where `h = max(modelRadius × thicknessFactor, 1e-4)`) so the top face sits at the same world-Y as the original flat disc, `receiveShadow: true`. The same mesh is also the **shadow-catcher** for the key light, so its size (`groundDisc.radiusFactor`) determines how much of the cast shadow is visible.

| Field                       | Type                      | Default    | Description                                                                                                                                                                               |
| --------------------------- | ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groundDisc.color`          | `HexColor`                | `0x050505` | Disc color (no board overlay)                                                                                                                                                             |
| `groundDisc.roughness`      | `number`                  | `0.92`     | Material roughness                                                                                                                                                                        |
| `groundDisc.metalness`      | `number`                  | `0`        | Material metalness                                                                                                                                                                        |
| `groundDisc.radiusFactor`           | `number`                  | `3`        | Disc radius as factor of `modelRadius`. Doubles as the board's size since the board texture fills the disc geometry. Shrinking too far clips the tower's cast shadow at the edges         |
| `groundDisc.undersideLightIntensity` | `number`                  | `0.15`     | `emissiveIntensity` applied to the disc's side wall and bottom cap (warm `0xffe8c8` tint). Makes the edge ring and underside glow when the camera dips below. Set to `0` to disable      |
| `boardDisc.enabled`         | `boolean`                 | `true`     | Render the game board texture on the disc                                                                                                                                                 |
| `boardDisc.opacity`         | `number`                  | `0.9`      | Material opacity when board overlay is active                                                                                                                                             |
| `boardDisc.source`          | `'image' \| 'procedural'` | `'image'`  | Texture source — see "Image vs procedural" below                                                                                                                                          |
| `boardDisc.northKingdom`    | `0 \| 1 \| 2 \| 3`        | `0`        | Which of the four kingdoms faces the +Z direction. Rotates the image texture in 90° steps. No effect on `'procedural'`                                                                    |
| `boardDisc.brightness`      | `number`                  | `1`        | Per-board diffuse-color multiplier on top of scene lighting. `0` = black, `1` = native texture brightness, up to `2` for over-bright. Stacks with `scene.exposure` and key/hemi intensity |
| `boardDisc.thicknessFactor` | `number`                  | `0.06`     | Cylinder height as a fraction of `modelRadius`. Values `0.01`–`0.04` look natural; clamped to a minimum of `1e-4` to avoid degenerate geometry                                            |
| `boardDisc.edgeColor`       | `HexColor`                | `0x5c3318` | Color of the board's side-wall. Two common presets: `0x5c3318` (medium warm wood/cardboard), `0x0e0e0e` (near-black neoprene mat)                                                         |
| `boardDisc.bottomCap`       | `boolean`                 | `true`     | Render the underside face of the board cylinder. Normally invisible unless the camera dips below the board; set `false` to skip that draw call                                            |

### Image vs procedural

The board texture can be sourced two ways:

- **`'image'` (default)** — loads `src/3d/assets/board.png` (the real game-board art) via `THREE.TextureLoader` ([GameBoardImageTexture.ts](../src/3d/GameBoardImageTexture.ts)). The texture is configured with `colorSpace = SRGBColorSpace`, the renderer's max anisotropy, `ClampToEdgeWrapping`, and a calibrated `texture.rotation` so kingdom-0 faces +Z. **Async load** — `GroundDiscManager` kicks off the load on first use and falls back to the procedural texture as a temporary stand-in until the image resolves, then swaps `material.map` in place. If the load fails (asset missing or fetch error) the manager logs a warning and permanently falls back to procedural for the session.
- **`'procedural'`** — uses the stylized canvas-drawn fallback in [GameBoardTexture.ts](../src/3d/GameBoardTexture.ts) (12 sectors × 4 kingdoms, skull motifs at the rim).

Both paths produce a texture set as `material.map` on a `MeshStandardMaterial` with `roughness: 0.95`, `metalness: 0`. When `boardDisc.enabled` is `false` the disc reverts to the flat `groundDisc.color`.

### Texture rotation calibration

The orientation calibration for `board.png` lives in [`GameBoardImageTexture.ts`](../src/3d/GameBoardImageTexture.ts) as `BASE_NORTH_OFFSET = Math.PI / 1.35`. This is specific to the shipped asset — if `board.png` is re-exported with a different orientation, retune this constant once and the per-kingdom 90° steps from `northKingdom` continue to work.

Runtime control:

```ts
display.setGroundDiscVisible(true); // toggle visibility (no config field — method only)
display.setBoardDiscEnabled(false); // toggle board overlay; writes to lighting.boardDisc.enabled
display.applyLightingConfig({
  // resize the disc (and the board texture with it)
  groundDisc: { radiusFactor: 4 },
});
display.applyLightingConfig({
  // dim or brighten the board independently
  boardDisc: { brightness: 0.6 },
});
display.applyLightingConfig({
  // rotate to a different north kingdom
  boardDisc: { northKingdom: 2 },
});
```

## 15. Spatial layout reference

Every spatial parameter that drives lighting placement is expressed as a **fraction of `modelRadius`** (the half-size of the loaded GLB's bounding sphere). This is deliberate — swapping the GLB for a different-sized model rescales every light and disc automatically.

| Constant                                   | Default | Source                                                   | Purpose                                                                     |
| ------------------------------------------ | ------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `LED_LAYOUT.topY`                          | `0.83`  | [constants.ts](../src/3d/constants.ts#L79)               | Top ring Y                                                                  |
| `LED_LAYOUT.middleY`                       | `0.53`  | [constants.ts](../src/3d/constants.ts#L80)               | Middle ring Y                                                               |
| `LED_LAYOUT.bottomY`                       | `0.23`  | [constants.ts](../src/3d/constants.ts#L81)               | Bottom ring Y                                                               |
| `LED_LAYOUT.ledgeY`                        | `-0.36` | [constants.ts](../src/3d/constants.ts#L82)               | Ledge Y                                                                     |
| `LED_LAYOUT.base1Y`                        | `-0.26` | [constants.ts](../src/3d/constants.ts#L83)               | Base 1 Y                                                                    |
| `LED_LAYOUT.base2Y`                        | `0.02`  | [constants.ts](../src/3d/constants.ts#L84)               | Base 2 Y                                                                    |
| `RED_LIGHT_LAYOUT.ringInsetRadius`         | `0.35`  | [constants.ts](../src/3d/constants.ts#L94)               | Ring layers (0–2) red light radial inset                                    |
| `RED_LIGHT_LAYOUT.cornerNearSurfaceRadius` | `0.52`  | [constants.ts](../src/3d/constants.ts#L95)               | Ledge/base layers (3–5) red light radial position                           |
| `SEAL_LED_RADIUS_FACTOR`                   | `0.15`  | [constants.ts](../src/3d/constants.ts#L76)               | Hard-coded constant; mirrored in `leds.sealBacklights.radiusFactor` default |
| `leds.sealBacklights.radiusFactor`         | `0.15`  | [LightingResolver.ts](../src/3d/LightingResolver.ts) | Seal proxy/halo radial position                                            |
| `leds.sealBacklights.proxy.sizeFactor`     | `0.025` | [LightingResolver.ts](../src/3d/LightingResolver.ts) | Proxy sphere radius                                                         |
| `leds.sealBacklights.halo.sizeFactor`      | `0.14`  | [LightingResolver.ts](../src/3d/LightingResolver.ts#L61) | Halo sprite scale                                                           |
| `groundDisc.radiusFactor`                  | `3`     | [LightingResolver.ts](../src/3d/LightingResolver.ts#L98) | Ground disc radius                                                          |
| `groundDisc.undersideLightIntensity`       | `0.15`  | [LightingResolver.ts](../src/3d/LightingResolver.ts#L120) | Disc edge/underside emissive intensity                                     |
| `key.shadow.frustumRadiusFactor`           | `1.3`   | [LightingResolver.ts](../src/3d/LightingResolver.ts#L16) | Shadow ortho half-size                                                      |
| `key.shadow.farFactor`                     | `10`    | [LightingResolver.ts](../src/3d/LightingResolver.ts#L17) | Shadow camera far plane                                                     |

Azimuth tables ([constants.ts:29, 57-62](../src/3d/constants.ts#L29-L62)):

```ts
RING_AZIMUTH   = [0, π/2, π, -π/2]            // N, E, S, W
CORNER_AZIMUTH = [π/4, 3π/4, 5π/4, 7π/4]      // NE, SE, SW, NW
```

Polar→Cartesian ([utils.ts](../src/3d/utils.ts)):

```ts
x = sin(azimuth) * r;
z = cos(azimuth) * r;
```

Coordinate axes used throughout: X east-positive, Y up-positive, Z toward-camera-positive.

## 16. Render pipeline

Per-frame in `startRenderLoop()` ([Tower3DView.ts:623-650](../src/3d/Tower3DView.ts#L623-L650)):

1. `controls?.update()` — `OrbitControls` damping
2. `sceneLighting?.fill.lookAt(0, 0, 0)` — `RectAreaLight` stays facing model centre as the camera orbits
3. If `bloomComposer && finalComposer`:
   - `darkenNonBloom()` — non-`BLOOM_LAYER` meshes swapped to black material
   - `bloomComposer.render()` — renders only bloom-layer pixels into the bloom render target (at `scene.bloom.resolutionScale` of canvas, default ½; see [§8](#8-bloom-post-processing))
   - `restoreMaterials()` — restores original materials
   - `finalComposer.render()` — composites base scene + bloom render target via shader pass (at full canvas resolution)
4. Else: `renderer.render(scene, camera)` — direct render with no post

`bloomLayer` is a single `THREE.Layers` instance ([Tower3DView.ts:128](../src/3d/Tower3DView.ts#L128)) with `BLOOM_LAYER (1)` set in `initScene` ([Tower3DView.ts:418](../src/3d/Tower3DView.ts#L418)). The `darkMaterial` is a shared `MeshBasicMaterial({ color: 0x000000 })` used to mask non-bloom meshes during the bloom pass.

## 17. Full default config

Verbatim copy of `DEFAULT_LIGHTING` from [LightingResolver.ts](../src/3d/LightingResolver.ts). Use this as the canonical starting point when overriding lighting.

One value that drives the LED look lives outside this config object: `HDR_PROXY_SCALE = 3.0` ([constants.ts](../src/3d/constants.ts)). LED proxy/halo colors are multiplied by it (via `applyHdrColor`) so that, paired with `scene.bloom.threshold: 1.0`, only the HDR-bright LED pixels bloom. It is a compile-time constant, not a runtime config field.

```ts
const DEFAULT_LIGHTING = {
  scene: {
    background: 0x000000,
    skyboxUrl: '',
    hemisphere: { color: 0xffffff, ground: 0x000000, intensity: 0.04 },
    key: {
      color: 0xffffff,
      intensity: 1.6,
      position: [3, 4.5, -1],
      shadow: {
        mapSize: 2048,
        bias: -0.0003,
        normalBias: 0.02,
        frustumRadiusFactor: 1.3,
        farFactor: 10,
      },
    },
    fill: {
      color: 0xffffff,
      intensity: 5.0,
      width: 1.5,
      height: 2.5,
      position: [-4, 1.5, -8],
    },
    exposure: 0.7,
    bloom: {
      enabled: true,
      strength: 1.5,
      radius: 0.5,
      threshold: 1.0,
      resolutionScale: 0.5,
    },
  },
  leds: {
    sealBacklights: {
      enabled: true,
      color: 0xff2020,
      radiusFactor: 0.15,
      backlightWhenBroken: true,
      proxy: {
        enabled: true,
        sizeFactor: 0.025,
        geometry: 'sphere',
      },
      halo: {
        enabled: true,
        sizeFactor: 0.14,
        opacity: 0.75,
      },
    },
  },
  animation: {
    fadeS: 0.15,
    breatheS: 2.0,
    breatheFastS: 0.8,
    flickerS: 0.3,
    idleBreathe: { peakFactor: 1.08, durationS: 4 },
  },
  entrance: {
    peakKeyFactor: 2.5,
    beats: {
      silhouetteHemiFactor: 0.25,
      silhouetteExposureFactor: 0.15,
      silhouetteDurationS: 1.4,
      keyArc1DurationS: 0.9,
      keyArc1DelayS: 1.2,
      keyPunchDurationS: 0.6,
      keyPunchDelayS: 1.5,
      exposureInDurationS: 1.2,
      keyArc2DurationS: 1.0,
      keyArc2DelayS: 2.1,
      keySettleDurationS: 1.2,
      keySettleDelayS: 2.3,
      fillInDurationS: 1.1,
      fillInDelayS: 2.6,
      hemiInDurationS: 1.1,
      hemiInDelayS: 2.8,
    },
  },
  groundDisc: {
    color: 0x050505,
    roughness: 0.92,
    metalness: 0,
    radiusFactor: 3,
  },
  boardDisc: {
    enabled: true,
    opacity: 0.9,
    source: 'image',
    northKingdom: 0,
    brightness: 1,
    thicknessFactor: 0.06,
    edgeColor: 0x5c3318,
    bottomCap: true,
  },
};
```

## 18. Tuning recipes

Short worked examples. Each one is self-contained.

### Board thickness and edge color

```ts
// Thicker board with a neoprene/rubber mat look
display.applyLightingConfig({
  boardDisc: { thicknessFactor: 0.025, edgeColor: 0x0e0e0e },
});

// Thinner board with a warm cardboard edge
display.applyLightingConfig({
  boardDisc: { thicknessFactor: 0.012, edgeColor: 0x7a4520 },
});

// Hide the underside face (useful when the camera never dips below the board)
display.applyLightingConfig({ boardDisc: { bottomCap: false } });
```

### Brighter scene overall

```ts
display.applyLightingConfig({
  scene: {
    exposure: 0.9,
    hemisphere: { intensity: 0.08 },
  },
});
```

Bumps tone-mapping exposure and lifts the ambient floor.

### Change LED color to blue

```ts
display.applyLightingConfig({
  leds: {
    sealBacklights: { color: 0x2020ff },
    ledgeLeds: { color: 0x2020ff },
    baseLeds: { color: 0x2020ff },
  },
});
```

`sealBacklights.color` recolors the ring + seal LEDs; `ledgeLeds.color` / `baseLeds.color` recolor the ledge and base LEDs. All default to `0xff2020`. The color is HDR-scaled (× `HDR_PROXY_SCALE`) before it reaches the proxy/halo materials.

### Disable bloom completely

```ts
new TowerDisplay({
  container,
  lighting: { scene: { bloom: { enabled: false } } },
});
```

`enabled: false` skips constructing the bloom pipeline entirely; the render loop falls back to a plain `renderer.render(scene, camera)`. Setting `strength: 0` works visually as well but still pays the two-composer cost.

### Add an HDR skybox

```ts
display.setSkyboxUrl('https://example.com/studio.hdr');
display.applyLightingConfig({
  scene: { hemisphere: { intensity: 0.02 } },
});
```

Lower `hemisphere.intensity` so the HDR does not double-illuminate via both background and ambient.

### Hide the ground disc

```ts
display.setGroundDiscVisible(false);
```

There is no `groundDisc.enabled` field — visibility is a method, not config. The disc is built lazily on first enable, so calling `setGroundDiscVisible(false)` before it is built is a no-op.

### Resize the board

```ts
display.applyLightingConfig({ groundDisc: { radiusFactor: 4 } });
```

The board texture fills the disc, so `groundDisc.radiusFactor` is also the effective board size. The example app exposes this as the **Board Size** slider under "3D Options → Board". The disc is also the shadow-catcher for the key light, so going much below `~2` will start clipping the tower's cast shadow at the edges.

### Dim or brighten the board independently

```ts
display.applyLightingConfig({ boardDisc: { brightness: 0.6 } });
```

`boardDisc.brightness` multiplies the disc material's diffuse color, so it stacks on top of `scene.exposure` and key/hemi intensity. Useful when the board is reading too bright or too washed-out at a given scene lighting without wanting to change every other surface. Range `0`–`2`; exposed as the **Brightness** slider in the example app.

### Rotate the board to a different "north"

```ts
display.applyLightingConfig({ boardDisc: { northKingdom: 2 } });
```

Rotates the image texture in 90° steps so a different kingdom faces +Z. The rotation is applied live without reloading the texture. No effect when `source === 'procedural'`.

### Use the procedural board instead of the image

```ts
display.applyLightingConfig({ boardDisc: { source: 'procedural' } });
```

Useful as an offline/dev fallback or for A/B comparison. Cheaper to render (no PNG load) and decouples the look from the shipped asset.

### Make the entrance cinematic shorter

```ts
display.applyLightingConfig({
  entrance: {
    beats: {
      silhouetteDurationS: 0.7,
      keyArc1DelayS: 0.6,
      keyPunchDelayS: 0.8,
      keyArc2DelayS: 1.0,
      keySettleDelayS: 1.2,
      fillInDelayS: 1.4,
      hemiInDelayS: 1.5,
    },
  },
});
```

`entrance.beats` uses spread merge ([LightingResolver.ts:213](../src/3d/LightingResolver.ts#L213)) so partial overrides are safe — unset keys keep their defaults.

### Reach a specific seal exterior with extra glow

There is no code path for this today. Every seal-related light source is positioned inside the drum at `radius × 0.15` ([Section 11](#11-seal-backlight-leds)). Implementing it would mean adding a new ring of lights at `radius > 1.0` (outside the drum, in the model frame) aimed at each seal face, with their own driver coupling. See [Section 20](#20-known-gaps--discrepancies).

## 19. Debug & inspection

Pass `debug3D: true` at construction ([Tower3DView.ts:84](../src/3d/Tower3DView.ts#L84)) to enable:

- `THREE.AxesHelper` at origin (sized to ~35% of `modelRadius`)
- Console logs: `init`, `modelLoaded`, `renderHeartbeat` (every 120 frames), `resize`
- `SealManager.setDebug(true, parent)` ([SealManager.ts:265-287](../src/3d/SealManager.ts#L265-L287)) — small yellow spheres at every seal proxy position, useful for validating alignment against the real GLB

Unit-test access: `Tower3DView.__testables` ([Tower3DView.ts:42-71](../src/3d/Tower3DView.ts#L42-L71)) exposes positioning utilities (`computeRedLightPosition`, `computeSealLedPose`) and `LedRef` / `SealBacklightRef` accessors so tests can inspect internal state without touching private fields directly.

## 20. Known gaps & discrepancies

Recorded so contributors do not chase apparent bugs.

- **`LightingConfig` / `DEFAULT_LIGHTING` / `resolveLighting` not in package barrel.** They are not re-exported from [src/index.ts](../src/index.ts), so consumers cannot import them by name from the published package. TypeScript inference at the option site works, but explicit type annotations and access to the default object require deep imports.
- **No exterior light aimed at seal faces, and no interior wash.** All seal-related emitters live inside the drum at `radiusFactor × modelRadius`, and there is no accent `PointLight`. The apparent exterior glow is entirely bloom-amplified inside-the-drum proxy/halo — see [Section 11.4](#114-why-the-user-perceives-an-exterior-glow). The drum interior between seals reads dark. If a true exterior fill on seal faces (or an interior wash) is wanted, it is a new feature.
- **`entrance.beats` resolver inconsistency.** That branch uses spread merge (`{ ...base, ...user }`, [LightingResolver.ts:213](../src/3d/LightingResolver.ts#L213)) while every other branch uses leaf-level nullish-coalesce. Consumer-visible behavior is the same for partial overrides; the inconsistency only matters if someone is reasoning about the resolver in the abstract.

## See also

- [API §Tower3DView](API.md#tower3dview) — the lighting and camera methods that consume this config.
- [RENDERERS §Tower3DView](RENDERERS.md#tower3dview) — when to pick the 3D renderer.
- [EXAMPLE §3D Options](EXAMPLE.md#panel-3d-options-lighting-and-scene) — the demo's live lighting editor.
- [ARCHITECTURE §subsystem map](ARCHITECTURE.md#subsystem-map) — file-by-file orientation in `src/3d/`.
- [lighting-alternatives.md](lighting-alternatives.md) — research survey of alternative approaches to the previous 36-PointLight design (the bake-off that led to the current HDR-proxy LEDs), with a comparison table and recommended experiment order.
