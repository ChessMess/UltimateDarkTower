# Renderers

*Docs: [Index](README.md) > Hobbyist + integrator > Renderers*

**Before reading:** [GETTING_STARTED](GETTING_STARTED.md) covers install and the first render.

This doc compares the three renderers `TowerDisplay` can compose and tells you when to pick which. For the full property and method reference see [API](API.md).

## At a glance

| Capability | `TowerStateReadout` | `TowerSideView` | `Tower3DView` |
|---|---|---|---|
| Rendering tech | DOM text grid | Inline SVG | Three.js + WebGL2 |
| Shows LED layers | Yes (all 6, all 4 sides) | Yes (one side at a time) | Yes (on the 3D model) |
| Shows drum positions | Yes (numeric + glyph) | Yes (rotated SVG) | Yes (rotating meshes) |
| Shows glyphs | Yes (named) | No | Yes (on the drum surface) |
| Shows audio info | Yes (sample name + loop + volume) | No | Plays the sample |
| Shows beam / skull count | Yes (with drop highlight) | No | No |
| Shows seal grid | Yes (3×4 clickable) | Yes (overlay on side) | Yes (mesh visibility) |
| Side-aware | No (shows all sides) | Yes | Yes |
| Clickable seals | Optional (off by default) | Optional (on by default) | No (clicks land in 2D/text) |
| Clickable LEDs | Optional (off by default) | No | No |
| Animations | None | LED tweens | Full (LEDs, drums, bloom, entrance) |
| Custom GLB | N/A | N/A | Yes via `modelUrl` |
| Bundle cost (rough) | <5 KB gzip | <10 KB gzip | ~150 KB gzip + 22 MB GLB |
| Browser requirement | Any modern | Any modern | WebGL2 |

`TowerDisplay` defaults to `['readout', 'side-view']`. Add or replace via the `renderers` option.

## `TowerStateReadout`

The text grid. Renders every drum, every LED layer, the audio sample, beam count, and a 3×4 seal grid into a compact DOM block. No SVG, no canvas, no animation — just labeled rows and toggleable buttons.

Best for:
- Debug panels and tools.
- Embedded info strips next to a larger 3D view.
- Headless / accessibility-friendly contexts (semantic HTML, keyboard reachable, screen reader friendly).
- Snapshot tests of game state (the readout is deterministic; the snapshot suite uses it).

API surface ([API §TowerStateReadout](API.md#towerstatereadout)):
- Construct with `new TowerStateReadout(container)`.
- `applyState`, `applySeals`, `showIdle`, `dispose` — the standard `ITowerDisplay` shape.
- Public properties: `clickToToggleSeals` (default `false`), `clickToToggleLeds` (default `false`), `onSealClick`, `onLedClick`.

Skull-drop highlight: when `beam.count` increases between two consecutive `applyState` calls, the beam row briefly emphasizes. Disposing the readout clears the tracked previous count.

## `TowerSideView`

The SVG view. One rotatable face of the tower with seal overlays, doorway LEDs, and edge lights. North/East/South/West buttons (or a `selectSide` call) switch faces with a brief crossfade. Seal overlays accept clicks.

The visual is built from two assets:
- [`src/2d/TowerSide.svg`](../src/2d/TowerSide.svg) — the tower face template.
- [`src/2d/Seal.svg`](../src/2d/Seal.svg) — the seal overlay graphic.

Best for:
- Hobby companion apps without WebGL bandwidth.
- Side-by-side panels alongside the 3D view (the example app's "View switcher" panel demonstrates this).
- Apps that want a stylized look without the 22 MB model download.

API surface ([API §TowerSideView](API.md#towersideview)):
- Construct with `new TowerSideView(container)`.
- `applyState`, `applySeals`, `selectSide`, `showIdle`, `dispose`.
- Public properties: `onSealClick`, `clickToToggleSeals` (default `true`), `onSideChange`.

When `clickToToggleSeals` is `true` (the default), clicks toggle the underlying seal independent of game state. The toggle persists per side until the user clicks again or `dispose` runs. Set it to `false` and drive seal state from an external store if you need persistence across view switches.

## `Tower3DView`

The Three.js model. Loads a 22 MB GLB, renders 24 LED proxies (six layers × four lights) with red point lights and amber emissive halos, rotates the three named drum meshes (`drum_top`, `drum_middle`, `drum_bottom`) to match drum state, animates LED effects on the bloom layer, and runs a configurable three-point lighting rig.

Out of the box you get:
- Orbit/pan/zoom camera with cursor-targeted zoom (configurable).
- N/E/S/W side-snap buttons with a brief zoom-dip tween.
- An optional entrance cinematic via `playEntrance()`.
- A noir ground disc that doubles as an optional game-board canvas overlay.
- Optional equirectangular skybox (HDR/EXR/PNG/JPG) or solid background color.
- Optional drum-rotation audio (procedural placeholder or a user-supplied URL).
- Hooks for the physics subpath ([PHYSICS](PHYSICS.md)).

Best for:
- Visual centerpiece of a companion app.
- Streamer overlays, tournament displays, kiosks.
- Any context where the rendered tower is the headline feature.

API surface ([API §Tower3DView](API.md#tower3dview)) is the largest of the three. Highlights:
- `applyState`, `applySeals`, `selectSide`, `showIdle`, `dispose`.
- Lighting: `setSceneLights`, `getLightingConfig`, `applyLightingConfig`, `setGroundDiscVisible`, `setBoardDiscEnabled`, `setSkyboxUrl`.
- Camera: `getCameraConfig`, `applyCameraConfig`, `setZoomToCursor`, `setPreserveViewOnSideSelect`.
- Audio: `applyAudioConfig`, `getAudioConfig` (plus legacy shims `setTowerAudioLibrary`, `setTowerAudioEnabled`, `setDrumRotationSoundUrl`, `setDrumRotationSoundEnabled`). Bundled official sound pack — see [AUDIO](AUDIO.md).
- Effects: `setLedOverride`, `playEntrance`.
- Diagnostics: `loadState` getter, `onLoadError` callback, `debug3D` option.
- Extension: `registerScenePlugin` (via `attachScenePlugin`), `registerPointerTarget`, `getDiscMetrics`, `getPhysicsHooks` — own 3D content in the scene from an external package.

For tuning the look see [LIGHTING](LIGHTING.md). For physics add-ons see [PHYSICS](PHYSICS.md). To inject and own your own 3D content (a board, tokens, effects) see [SCENE_PLUGINS](SCENE_PLUGINS.md).

## Prefer `TowerRenderView` for one-call setup

If you don't need to manage `TowerDisplay` directly, reach for [`TowerRenderView`](API.md#towerrenderview). It wraps a `TowerDisplay` with optional header chrome (title, subtitle, status badges, action row), defaults to the `'3d-view'` renderer, and exposes the same state/3D-config surface. Advanced 3D config not forwarded on the facade is reached via `view.display.x(...)`.

```ts
const view = new TowerRenderView({ container, modelUrl });
view.applyState(state);
```

The sections below describe the underlying renderers used by both `TowerRenderView` and `TowerDisplay`.

## Composition rules in `TowerDisplay`

`TowerDisplay` accepts any subset of `['readout', 'side-view', '3d-view']`. Slots render in the order given. The container becomes a flex column by default; override via CSS if you want a different layout.

Cross-slot behavior is automatic:
- **Seal clicks** fan out to every active slot. The `onSealClick` callback fires exactly once per click.
- **`selectSide`** fans out to every side-aware slot (readout is unaffected). Triggered by a side button click in any 2D/3D slot, by a camera orbit past a cardinal heading, or by an explicit `display.selectSide('east')` call.
- **`applySeals`** updates every slot. Pass the full current broken-seal list each time it changes.

When `clickToToggleSeals: false`, `TowerDisplay` does not own the toggle set. Wire your own state store, provide `onSealClick`, and call `display.applySeals(store.getBrokenSeals())` to update.

## Idle states

Every renderer has a defined idle. `display.showIdle()` (or constructing without calling `applyState`) puts every active renderer into its idle state.

- **Readout** — shows `Waiting for tower state…`. Seal grid is blank. Beam tracking resets.
- **Side view** — shows the north face. All four seals on that face render. No LEDs lit.
- **3D view** — loads the GLB and renders it with the configured lighting, but no LEDs animate. Drum meshes stay at their last-known rotation; on first construction they sit at zero. The entrance cinematic does not auto-play unless you call `playEntrance()`.

`applyState` after `showIdle` immediately reanimates everything.

## Side-aware vs. side-blind

The readout is side-blind: it shows every LED on every side at once. Calling `selectSide` on a `TowerDisplay` that includes the readout updates the side-aware slots but leaves the readout alone.

The side view and 3D view are side-aware: only one face is visible at a time. Switch faces with `display.selectSide('north' | 'east' | 'south' | 'west')` or by clicking the cardinal buttons rendered alongside each slot.

`onSideChange` fires from any side change: user button click, programmatic `selectSide`, or 3D camera orbit past a cardinal facing. The 3D view treats the camera as the source of truth — orbiting past north into east immediately fires `onSideChange('east')`.

## Browser and runtime compatibility

- **Readout** — any browser that supports `Map`, `WeakMap`, and ES2018 syntax. Effectively every browser shipped since 2018.
- **Side view** — same, plus inline SVG (universal).
- **3D view** — WebGL2 required. All Chromium, Firefox 51+, Safari 15+, and modern mobile browsers qualify. WebGL1-only browsers fall back to no 3D rendering and surface an `onLoadError` event.
- **Physics subpath** — async WebAssembly. Vite, esbuild, and Rollup work out of the box; Webpack 5 requires `experiments.asyncWebAssembly: true`.
- **Electron** — runs in the renderer process. See [ELECTRON](ELECTRON.md) for the recipe.
- **Node.js / SSR** — not supported. The package mutates `document.head` on construction; use a client-only mount strategy.

## Bundle size and tree-shaking

| Import | Pulls |
|---|---|
| `TowerStateReadout` only | The readout + injected CSS. Tiny. |
| `TowerSideView` only | The readout's CSS plus the two inline SVGs. Small. |
| `Tower3DView` (or any composition with `'3d-view'`) | Three.js, GSAP, and the 22 MB bundled GLB. |
| `ultimatedarktowerdisplay/physics` | Rapier WASM. Only loaded if you import this subpath. |

The 22 MB GLB is the dominant cost. Self-host a smaller model and pass `modelUrl` if you need to shave bytes (the naming contract for drums and seals must still be honored).

## See also

- [API](API.md) — full property/method/type reference for every renderer.
- [ARCHITECTURE](ARCHITECTURE.md) — how the renderers compose and how state flows.
- [LIGHTING](LIGHTING.md) — tuning the 3D scene.
- [EXAMPLE](EXAMPLE.md) — the demo as a reference integration.
- [TROUBLESHOOTING](TROUBLESHOOTING.md) — common rendering failures.
