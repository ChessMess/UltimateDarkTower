# API reference

_Docs: [Index](README.md) > Integrator > API_

**Before reading:** [GETTING_STARTED](GETTING_STARTED.md) covers prerequisites and the first render. [RENDERERS](RENDERERS.md) compares the three renderers at a glance. **Changelog:** [../CHANGELOG.md](../CHANGELOG.md).

This document covers the public API exported by `ultimatedarktowerdisplay`. It follows the shared [API documentation standard](API_STYLE.md) used across the UDT-family repos.

## Exports

```ts
// Main entry — renderers, controller, scene-plugin seam, audio
import {
  TowerRenderView,
  TowerDisplay,
  TowerStateReadout,
  TowerSideView,
  Tower3DView,
  TowerStateController,
  attachScenePlugin,
  anchorToWorld,
  TOWER_DISPLAY_CSS,
  // audio (see "Audio exports")
  DEFAULT_TOWER_SOUND_PACK,
  buildOfficialSoundPack,
  hasDefaultAudioAsset,
  DEFAULT_SEQUENCE_AUDIO_MAP,
  buildSequenceAudioMap,
  DrumRotationAudio,
  TowerSampleAudio,
  CALIBRATION_SOUND_URL,
  DRUM_ROTATION_SOUND_URL,
} from 'ultimatedarktowerdisplay';
import type {
  TowerRenderViewOptions,
  TowerRenderViewBadge,
  TowerRenderViewBadgeTone,
  TowerRenderViewPanelPosition,
  TowerDisplayOptions,
  Tower3DViewOptions,
  PerfReport,
  PerfStat,
  BloomFrameMetrics,
  TowerStateControllerOptions,
  CameraConfig,
  ApplyCameraConfigOptions,
  AudioConfig,
  SoundPack,
  TowerPhysicsHooks,
  ITowerDisplay,
  RendererType,
  TowerSide,
  SealIdentifier,
  AppliedTowerState,
  ScenePlugin,
  ScenePluginContext,
  ScenePluginHandle,
  ScenePluginModelInfo,
  PointerTarget,
  BoardAnchor,
  DiscMetrics,
} from 'ultimatedarktowerdisplay';

// `./physics` subpath — opt-in skull physics (pulls @dimforge/rapier3d; see "Physics")
import {
  attachSkullPhysics,
  DEFAULT_PHYSICS,
  resolvePhysics,
} from 'ultimatedarktowerdisplay/physics';
import type {
  PhysicsConfig,
  ResolvedPhysicsConfig,
  SkullPhysicsHandle,
  SkullTemplate,
  DeepRequired,
} from 'ultimatedarktowerdisplay/physics';
```

---

## Classes

### `TowerRenderView`

All-in-one render facade. Wraps a `TowerDisplay` with optional polished chrome (title, subtitle, status badges, action row) and forwards the common state and 3D-config API. Recommended entry point for new consumers — advanced 3D config is reached through the `display` / `view3D` escape hatches.

```ts
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';

const view = new TowerRenderView({
  container: document.getElementById('tower')!,
  modelUrl: towerModelUrl,
  title: 'Render',
  badges: [{ id: 'conn', label: 'BLE', value: 'connected', tone: 'good' }],
});
view.applyState(state);
view.updateBadge('conn', { value: 'disconnected', tone: 'warn' });
```

#### Constructor

```ts
new TowerRenderView(options: TowerRenderViewOptions)
```

| Parameter           | Type                             | Default     | Description                                                                              |
| ------------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `options.container` | `HTMLElement`                    | —           | DOM element to render into.                                                              |
| `options.renderers` | `RendererType \| RendererType[]` | `'3d-view'` | Which renderer(s) to show. Defaults to the headline 3D render.                           |
| `options.modelUrl`  | `string`                         | —           | Required when `renderers` includes `'3d-view'`. Forwarded to `TowerDisplay`.             |
| `options.title`     | `string`                         | —           | Optional header title. Header renders only when at least one chrome option is set.       |
| `options.subtitle`  | `string`                         | —           | Optional header subtitle.                                                                |
| `options.badges`    | `TowerRenderViewBadge[]`         | —           | Optional status badge row in the header.                                                 |
| `options.actions`   | `HTMLElement[]`                  | —           | Optional action elements appended to the header's action slot.                           |
| `options.className` | `string`                         | —           | Extra class on `.trv-root` for theming hooks (e.g. consumer-specific palette overrides). |

All other `TowerDisplayOptions` fields (`lighting`, `camera`, `audio`, `dracoDecoderPath`, `debug3D`, `showGroundDisc`, `clickToToggleSeals`, `injectStyles`, `onSealClick`, `onSideChange`, `onLoadError`) are accepted and forwarded to the inner `TowerDisplay` unchanged.

#### Methods

The facade implements `ITowerDisplay` and forwards the common-path API to the inner `TowerDisplay`. See [`TowerDisplay`](#towerdisplay) for behavior details — listed here for discoverability:

- `applyState(state, force?)`, `applySeals(brokenSeals)`, `selectSide(side)`, `setLedOverride(layer, light, effect)`, `clearLedOverrides()`, `showIdle()`
- `applyLightingConfig(config)`, `applyCameraConfig(config)`, `applyAudioConfig(config)`, `setSceneLights(opts)`, `playEntrance()`

Advanced 3D config not forwarded directly (e.g. `setSkyboxUrl`, `setBoardDiscEnabled`, `setGameBoardKingdom`, `setZoomToCursor`, `setPreserveViewOnSideSelect`, `setDrumRotationSoundUrl`, `setTowerAudioEnabled`, `getLightingConfig`, `getCameraConfig`, `getAudioConfig`) is reached via `view.display.x(...)`.

**Chrome mutators:**

##### `setTitle(title: string | null): void`

Set or clear the header title. Passing `null` (or `''`) removes the title; if the header has no other content it collapses entirely.

##### `setSubtitle(subtitle: string | null): void`

Set or clear the header subtitle. Same collapse rules as `setTitle`.

##### `setBadges(badges: TowerRenderViewBadge[]): void`

Replace the badge row. Pass `[]` to remove all badges (and collapse the badge slot).

##### `updateBadge(id: string, patch: Partial<TowerRenderViewBadge>): void`

Update a single badge by its `id`. No-op if no badge has that `id`. Useful for live indicators like connection state without rebuilding the whole row.

##### `setActions(actions: HTMLElement[]): void`

Replace the header action slot. Pass `[]` to clear and collapse the slot.

##### `dispose(): void`

Tear down the inner `TowerDisplay` and remove `.trv-root` from the container.

#### Getters

- **`display: TowerDisplay`** — the wrapped instance. Use for advanced 3D config that isn't forwarded on the facade (e.g. `view.display.setSkyboxUrl(...)`).
- **`view3D: Tower3DView | null`** — shortcut for `display.view3D`. Useful for physics add-ons that need `view3D.getPhysicsHooks()`.
- **`root: HTMLElement`** — the outer `.trv-root` element.
- **`body: HTMLElement`** — the `.trv-body` element where the inner `TowerDisplay` mounts.
- **`loadState: 'pending' | 'ready' | 'error' | undefined`** — current GLB load status. Forwards `display.loadState`.

#### `TowerRenderViewBadge`

```ts
interface TowerRenderViewBadge {
  id?: string; // handle for updateBadge()
  label: string;
  value?: string;
  tone?: 'neutral' | 'accent' | 'warn' | 'good';
}
```

Tones map to `[data-tone]` selectors on `.trv-badge`. Theme via the `--trv-accent` CSS custom property on `.trv-root`.

---

### `TowerDisplay`

Lower-level wrapper that composes one or more renderers into a DOM container. Use this when you don't need the `TowerRenderView` chrome wrapper.

```ts
const display = new TowerDisplay({
  container: document.getElementById('tower')!,
});
```

#### Constructor

```ts
new TowerDisplay(options: TowerDisplayOptions)
```

| Parameter                    | Type                             | Default                             | Description                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options.container`          | `HTMLElement`                    | —                                   | DOM element to render into                                                                                                                                                                                        |
| `options.renderers`          | `RendererType \| RendererType[]` | `['readout', 'side-view']`          | Which renderer(s) to show                                                                                                                                                                                         |
| `options.onSealClick`        | `(seal: SealIdentifier) => void` | —                                   | Callback fired whenever the user clicks a seal in the side view or the readout seal grid                                                                                                                          |
| `options.clickToToggleSeals` | `boolean`                        | `true`                              | When `true`, clicking a seal toggles its visibility across every active renderer (2D hides in 3D, and vice-versa). Set to `false` to disable click-driven toggling entirely.                                      |
| `options.onSideChange`       | `(side: TowerSide) => void`      | —                                   | Callback fired whenever the active side changes on any side-aware renderer — via an explicit `selectSide` call, a side-button click, or (for the 3D view) the user orbiting the camera into a new cardinal facing |
| `options.onLoadError`        | `(details: unknown) => void`     | —                                   | Callback fired if the 3D GLB model fails to load. Only fires when `renderers` includes `'3d-view'`. Check `display.loadState` to poll load status without a callback.                                             |
| `options.modelUrl`           | `string`                         | bundled GLB                         | Forwarded to `Tower3DView` — override the default bundled model URL                                                                                                                                               |
| `options.dracoDecoderPath`   | `string`                         | gstatic CDN                         | Forwarded to `Tower3DView` — override where Draco decoder wasm/js files are loaded from                                                                                                                           |
| `options.debug3D`            | `boolean`                        | `false`                             | Forwarded to `Tower3DView` — enables diagnostic logs, render heartbeats, and axes helpers                                                                                                                         |
| `options.showGroundDisc`     | `boolean`                        | `true`                              | Forwarded to `Tower3DView` — shows the noir ground disc that catches the key-light shadow                                                                                                                         |
| `options.lighting`           | `LightingConfig`                 | `DEFAULT_LIGHTING`                  | Forwarded to `Tower3DView` — see [`LightingConfig`](#lightingconfig)                                                                                                                                              |
| `options.camera`             | `CameraConfig`                   | see [`CameraConfig`](#cameraconfig) | Forwarded to `Tower3DView` — initial camera framing defaults and runtime behavior flags                                                                                                                           |

#### Methods

##### `applyState(state: AppliedTowerState, force?: boolean): void`

Update all renderers with a new decoded tower state. Renders LED grid, drum positions, audio info, skull drops, and LED sequence overrides.

Obtain `TowerState` from the [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) peer dependency. `AppliedTowerState` is a `TowerState` that may additionally carry a `command` (a `TOWER_COMMANDS.*` value mirroring byte 0 of the wire packet); plain `TowerState` is still accepted.

**`force`:** Pass `true` to replay tower-sample audio even when `state.audio.sample` and `state.audio.loop` match the previously-synced values — appropriate for explicit user-initiated triggers (e.g. a "Trigger Sequence" button). The default `false` preserves dedup for BLE state-mirror callers, where identical successive packets must not restart playback.

**Calibration command:** when `state.command === TOWER_COMMANDS.calibration`, the incoming state is rendered as the baseline and then a [calibration sequence](#calibration-command) runs. See that section for the behavior and the `onCalibrationComplete` callback.

**Skull drop detection:** The readout tracks `beam.count` across consecutive calls. When the count increases between two calls, a skull drop animation is shown.

##### `applySeals(brokenSeals: SealIdentifier[]): void`

Update seal visibility across every active renderer. Pass the full current list of broken seals; seals in the list are hidden, and any seals previously hidden but now absent from the list are restored. Call this whenever the set of broken seals changes.

- **Side view (2D):** seals are hidden via CSS opacity for the currently displayed side; switching sides re-evaluates visibility against the same list.
- **3D view:** each of the 12 seal meshes in the GLB model is resolved by name and its `Object3D.visible` flag is flipped. The default bundled model ships with the 12 named seal nodes. If you supply a custom `modelUrl`, the model must contain objects named `seal_<side>_<level>` (lowercase) for every `side ∈ {north, south, east, west}` and `level ∈ {top, middle, bottom}` — e.g. `seal_north_top`, `seal_west_bottom`. Missing names are logged once as a `console.warn` at load time and become silent no-ops for `applySeals`.
- **Click-to-toggle (`clickToToggleSeals`, default `true`):** `TowerDisplay` owns a user-toggle set that is merged with the external `brokenSeals` list before fan-out. Clicking a seal in the 2D view (or the readout seal grid when `TowerStateReadout` is registered as a renderer) flips its user-toggle state and immediately hides/shows it on every renderer. Clearing the external list (`applySeals([])`) does not clear user toggles — they persist until clicked again or until `dispose()`.

**Two patterns for managing seal state:**

1. **Simple (internal merge):** leave `clickToToggleSeals` at its default and let `TowerDisplay` track the user-toggle set itself. Best for short-lived demos or a single persistent `TowerDisplay` instance.
2. **External source of truth:** set `clickToToggleSeals: false`, provide `onSealClick`, and drive seal state from your own store (e.g. an `UltimateDarkTower` instance). Your callback decides what to do, then calls `display.applySeals(store.getBrokenSeals())`. Required if your app recreates the `TowerDisplay` on view switches — `dispose()` wipes the internal set, so the external store is what survives. See [`example/sealController.ts`](../example/sealController.ts) for a worked example.

##### `selectSide(side: TowerSide): void`

Select the facing side on every side-aware renderer (2D SVG + 3D camera). No-op for renderers that don't implement `selectSide` (e.g. the readout). Each view's `selectSide` early-returns if already on the requested side, so cross-view fan-out never loops.

##### `showIdle(): void`

Reset all renderers to their idle state.

##### `dispose(): void`

Remove all rendered DOM content and reset internal state. Also clears any user seal toggle state.

##### `setSceneLights(opts): void`

Live-tweak the 3D scene's light intensities and key-light position. No-op when no 3D view is active. All fields are optional.

```ts
display.setSceneLights({
  hemi?: number;      // hemisphere intensity
  key?: number;       // key light intensity
  fill?: number;      // fill light intensity
  exposure?: number;  // tone-mapping exposure
  keyX?: number;      // key light X position
  keyY?: number;      // key light Y position
  keyZ?: number;      // key light Z position
});
```

##### `getLightingConfig(): ResolvedLightingConfig | undefined`

Return a deep-cloned snapshot of the full resolved lighting configuration currently active in the 3D view. Returns `undefined` when no 3D renderer is active. Useful for reading back the current state after sliders or `setSceneLights` calls.

##### `applyLightingConfig(config: LightingConfig): void`

Resolve a new (partial) lighting config over the defaults and apply it immediately to the 3D scene — updating lights, materials, the ground disc, and LED effects. No-op when no 3D renderer is active.

```ts
display.applyLightingConfig({
  scene: { key: { intensity: 2.0 }, exposure: 0.85 },
  leds: { red: { color: 0xff0000 } },
});
```

##### `setGroundDiscVisible(visible: boolean): void`

Show or hide the noir ground disc that catches the key-light shadow. No-op when no 3D view is active.

##### `playEntrance(): void`

Trigger the cinematic entrance sequence on the 3D view: the tower silhouette fades up from black, the key light sweeps in and overshoots, then settles while the idle breathing pulse starts. Safe to call repeatedly — any in-flight entrance tween is cancelled before the new one begins. No-op when no 3D view is active.

##### `setDrumRotationSoundUrl(url: string | null): void`

Set the URL of the audio asset played in the 3D view while drums rotate. Pass `null` to disable drum-rotation audio (silence — there is no procedural fallback tone). Decode happens in the background; rotations that fire mid-decode stay silent until the buffer is ready. No-op when no 3D view is active.

##### `setDrumRotationSoundEnabled(enabled: boolean): void`

Enable or disable drum rotation audio in the 3D view. Disabled by default — consumers must opt in (which also satisfies browser autoplay-policy gestures, since the toggle is typically wired to a click). No-op when no 3D view is active.

##### `setPreserveViewOnSideSelect(enabled: boolean): void`

Toggle the `preserveViewOnSideSelect` flag on the active 3D camera. When `true`, clicking a side button (or calling `selectSide`) rotates the camera azimuth to the new cardinal while preserving the current orbit target, tilt, pan offset, and zoom distance. When `false` (the default), the camera snaps back to the fitted default framing each time. No-op when no 3D view is active.

##### `setZoomToCursor(enabled: boolean): void`

Toggle whether scroll-wheel zoom-in moves the camera toward the cursor (`true`) or toward the orbit target (`false`). Zoom-out always uses the standard OrbitControls behavior. No-op when no 3D view is active.

##### `getCameraConfig(): Required<CameraConfig> | undefined`

Return a snapshot of the current resolved camera configuration (all five fields guaranteed present) on the 3D view. Returns `undefined` when no 3D renderer is active.

##### `applyCameraConfig(config: CameraConfig, options?: ApplyCameraConfigOptions): void`

Apply a partial camera configuration at runtime. Any fields provided overwrite the corresponding current values; omitted fields are unchanged. By default a framing change snaps the camera back to the fitted north preset; pass `{ preserveView: true }` to instead apply only the changed factor(s) to the **current live view** — keeping the orbit angle, pan, and any dimension not being changed (used by live tuning sliders so dragging one doesn't reset the viewpoint). No-op when no 3D view is active.

##### `setBoardDiscEnabled(enabled: boolean): void`

Show or hide the game board texture on the ground disc. The texture source is governed by `lighting.boardDisc.source` (`'image'` loads `src/3d/assets/board.png`; `'procedural'` uses the canvas-drawn fallback). No-op when no 3D view is active. See [LIGHTING.md §14](LIGHTING.md#14-ground-disc--game-board) for the full board configuration (size, brightness, north-kingdom rotation, source toggle).

##### `setGameBoardKingdom(side: TowerSide): void`

Orient the game board so its north section faces the given cardinal direction (`'north'` | `'east'` | `'south'` | `'west'`) — a friendlier, live alternative to setting `lighting.boardDisc.northKingdom` (`0…3`) directly. `'north'` (the default) aligns the board's north with the tower's north face; each other value rotates the board in a 90° step. Rotates the on-disc art and keeps `anchorToWorld` token placement in sync. No-op when no 3D view is active.

##### `setSkyboxUrl(url: string | null): void`

Set an equirectangular skybox image (or `.hdr`) URL on the 3D view. Pass `null` to clear the skybox. No-op when no 3D view is active.

##### `setLedOverride(layer: number, light: number, effect: number): void`

Programmatically override a single LED's effect on every active renderer. Equivalent to the user clicking the LED in the readout grid — the override is stored in the internal state controller, then re-applied on every subsequent `applyState`. Useful for driving LED state from a custom UI without going through a click event.

##### `loadState` (getter)

Read-only getter returning `'pending' | 'ready' | 'error' | undefined`. Reflects the current GLB load state of the 3D view. Returns `undefined` when no 3D renderer is active.

---

### `TowerSideView`

SVG side-view renderer showing one rotatable face of the tower with seal overlays and LED markers. Can be used standalone or composed via `TowerDisplay`.

```ts
const view = new TowerSideView(document.getElementById('tower')!);
view.onSealClick = (seal) => console.log(seal.side, seal.level);
```

#### Constructor

```ts
new TowerSideView(container: HTMLElement)
```

#### Public properties

| Property             | Type                             | Default | Description                                                                |
| -------------------- | -------------------------------- | ------- | -------------------------------------------------------------------------- |
| `onSealClick`        | `(seal: SealIdentifier) => void` | —       | Callback fired on every seal click regardless of `clickToToggleSeals`      |
| `clickToToggleSeals` | `boolean`                        | `true`  | Enables built-in click-to-toggle visibility on seal overlays               |
| `onSideChange`       | `(side: TowerSide) => void`      | —       | Callback fired when the selected side changes (user click or `selectSide`) |

When `clickToToggleSeals` is `true`:

- Clicking an intact seal hides it.
- Clicking a hidden seal shows it again.
- Toggle state is tracked per `side + level` key and is independent of `applySeals()`.
- A console message is logged on each click with the seal identity and new visibility state.
- Toggle state is cleared on `dispose()`.

#### Methods

`applyState(state, force?)`, `applySeals(brokenSeals)`, `showIdle()`, `dispose()`, plus:

##### `selectSide(side: TowerSide): void`

Programmatically change the active side. Updates the side-button state, re-applies LED mapping for the new face, and fires `onSideChange`. Early-returns when already on `side`.

---

### `TowerStateReadout`

Text-based readout renderer. Same interface as `TowerDisplay` but takes an `HTMLElement` directly. Renders LEDs, drums, audio, skulls, LED sequence overrides, and a 3×4 seal grid.

```ts
const readout = new TowerStateReadout(document.getElementById('tower')!);
readout.clickToToggleSeals = true;
readout.onSealClick = (seal) => console.log(seal);
readout.applyState(state);
readout.applySeals([{ side: 'north', level: 'top' }]);
```

#### Constructor

```ts
new TowerStateReadout(container: HTMLElement)
```

#### Public properties

| Property             | Type                                                     | Default | Description                                                                                                                           |
| -------------------- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `onSealClick`        | `(seal: SealIdentifier) => void`                         | —       | Callback fired when a seal button in the grid is clicked                                                                              |
| `clickToToggleSeals` | `boolean`                                                | `false` | When `true`, enables click interaction on the seal grid. Default is read-only                                                         |
| `onLedClick`         | `(layer: number, light: number, effect: number) => void` | —       | Callback fired when an LED indicator is clicked. Receives the new (cycled) effect value                                               |
| `clickToToggleLeds`  | `boolean`                                                | `false` | When `true`, clicking an LED indicator cycles it through all `LIGHT_EFFECTS` values (off → on → breathe → ...) and fires `onLedClick` |

The seal grid renders 12 buttons (4 sides × 3 levels); filled = present, hollow = broken. `applySeals` updates the grid. When `clickToToggleSeals` is `false` (the default for the readout), the buttons render as disabled — they still reflect state but don't emit events.

When `TowerStateReadout` is composed via `TowerDisplay`, both `clickToToggleSeals` and `clickToToggleLeds` are auto-enabled and the parent fans out the resulting state to every renderer (so a readout LED click also updates the 2D and 3D views).

#### Methods

Same as `TowerDisplay`: `applyState(state, force?)`, `applySeals(brokenSeals)`, `showIdle()`, `dispose()`. `force` is honored on the 3D view's audio path; see `TowerDisplay.applyState` above.

---

### `TowerStateController`

Pure (non-DOM) state controller — holds the latest `TowerState`, a user-toggle set of seal overrides, and a per-LED effect override map. Returns resolved (merged) state and seal lists for renderers. `TowerDisplay` instantiates one internally to fan out clicks; expose it directly when you need the same merge behavior outside the DOM (e.g. driving a custom renderer or running headless).

```ts
import { TowerStateController } from 'ultimatedarktowerdisplay';
const ctrl = new TowerStateController({ togglesEnabled: true });
const resolved = ctrl.applyState(state);
```

#### Constructor

```ts
new TowerStateController(options?: TowerStateControllerOptions)
```

| Option           | Type      | Default | Description                                                                      |
| ---------------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `togglesEnabled` | `boolean` | `true`  | When `false`, `toggleSeal` is a no-op. Mirrors `TowerDisplay.clickToToggleSeals` |

#### Methods

| Method                                      | Returns              | Description                                                                                         |
| ------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `applyState(state: TowerState)`             | `TowerState`         | Store `state`, merge in any active LED overrides, and return the resolved state for renderers       |
| `applySeals(brokenSeals: SealIdentifier[])` | `SealIdentifier[]`   | Store the external broken-seal list and return the deduplicated union with user toggles             |
| `toggleSeal(seal: SealIdentifier)`          | `SealIdentifier[]`   | Flip `seal`'s user-toggle state (when enabled) and return the resolved seal list                    |
| `setLedOverride(layer, light, effect)`      | `TowerState \| null` | Record a per-LED override; returns the resolved state, or `null` when no state has been applied yet |
| `getResolvedState()`                        | `TowerState \| null` | Get the latest applied state with LED overrides merged in                                           |
| `getResolvedSeals()`                        | `SealIdentifier[]`   | Get the deduplicated union of externally-broken seals and user-toggled seals                        |
| `reset()`                                   | `void`               | Clear stored state, all user toggles, and all LED overrides                                         |

---

### `Tower3DView`

Three.js model renderer. Loads the bundled tower GLB (or a custom URL), supports orbit controls, and provides side-snap + reset camera controls.

```ts
const view3d = new Tower3DView(document.getElementById('tower')!, {
  debug3D: true,
});
```

#### Constructor

```ts
new Tower3DView(container: HTMLElement, options?: Tower3DViewOptions)
```

#### Options (`Tower3DViewOptions`)

| Option             | Type             | Default                                                   | Description                                                                   |
| ------------------ | ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `modelUrl`         | `string`         | bundled GLB                                               | Override the default bundled model URL                                        |
| `dracoDecoderPath` | `string`         | `https://www.gstatic.com/draco/versioned/decoders/1.5.7/` | Override where Draco decoder wasm/js files are loaded from                    |
| `debug3D`          | `boolean`        | `false`                                                   | Enables diagnostic console logs, render heartbeats, and an origin axes helper |
| `showGroundDisc`   | `boolean`        | `true`                                                    | Show the noir ground disc that catches the key-light shadow                   |
| `lighting`         | `LightingConfig` | `DEFAULT_LIGHTING`                                        | Deep-merged nested config for every lighting-tunable value — see below        |
| `camera`           | `CameraConfig`   | see [`CameraConfig`](#cameraconfig)                       | Initial camera framing defaults and runtime behavior flags — see below        |

##### `LightingConfig`

> See [LIGHTING.md](LIGHTING.md) for the complete lighting reference — every subsystem (scene rig, bloom, red ring LEDs, seal backlights, ground disc, skybox, animations) with defaults, source links, and tuning recipes.

Every lighting-tunable value consumed by the 3D view lives under a single nested config. All fields are optional — unset fields fall back to the exported `DEFAULT_LIGHTING` constant. User-supplied values are deep-merged over the defaults at construction time.

````ts
interface LightingConfig {
  scene?: {
    background?: number; // 0x000000
    hemisphere?: { color?: number; ground?: number; intensity?: number }; // 0xffffff / 0x000000 / 0.04
    key?: {
      color?: number; // 0xffffff
      intensity?: number; // 1.6
      position?: [number, number, number]; // [3, 4.5, -1] — camera-local
      shadow?: {
        mapSize?: number; // 2048
        bias?: number; // -0.0003
        normalBias?: number; // 0.02
        frustumRadiusFactor?: number; // 1.3 × modelRadius
        farFactor?: number; // 10 × modelRadius
      };
    };
    fill?: {
      color?: number; // 0xffffff
      intensity?: number; // 0.02
      width?: number; // 1.5
      height?: number; // 2.5
      position?: [number, number, number]; // [-4, 1.5, -8] — camera-local
    };
    exposure?: number; // 0.7 (renderer tone-mapping)
    bloom?: {
      enabled?: boolean;     // true — enable post-process bloom (UnrealBloomPass)
      strength?: number;     // 1.5 — glow intensity (0–3)
      radius?: number;       // 0.5 — bloom spread (0–1)
      threshold?: number;    // 1.0 — only HDR-bright LED proxy pixels bloom
    };
  };
  leds?: {
    // On-tower LEDs are HDR-bright emissive proxies (no PointLights). Each
    // group takes a color (+ proxy/halo options); see docs/LIGHTING.md §10–11.
    sealBacklights?: { color?: number; enabled?: boolean /* radiusFactor, proxy, halo, ... */ };
    ledgeLeds?: { color?: number; enabled?: boolean /* proxy, halo */ };
    baseLeds?: { color?: number; enabled?: boolean /* proxy, halo */ };
  };
  animation?: {
    fadeS?: number; // 0.15 — on/off fade
    breatheS?: number; // 2.0  — breathe + breathe50%
    breatheFastS?: number; // 0.8
    flickerS?: number; // 0.3
    idleBreathe?: { peakFactor?: number; durationS?: number }; // 1.08 / 4 — key light pulse
  };
  entrance?: {
    peakKeyFactor?: number; // 2.5 — key overshoot during flash beat
    beats?: {
      /* 16 per-beat durations/delays/factors — see source for full list */
    };
  };
  groundDisc?: {
    color?: number; // 0x050505
    roughness?: number; // 0.92
    metalness?: number; // 0
    radiusFactor?: number; // 3 × modelRadius — also the board size, since the texture fills the disc
    undersideLightIntensity?: number; // 0.15 — emissive glow on the disc edge/underside; 0 = off
  };
  boardDisc?: {
    enabled?: boolean;                       // true — show the board texture
    opacity?: number;                        // 0.9
    source?: 'image' | 'procedural';         // 'image' — load src/3d/assets/board.png; 'procedural' = canvas fallback
    northKingdom?: 0 | 1 | 2 | 3;            // 0 — which kingdom faces +Z (90° steps)
    brightness?: number;                     // 1 — per-board diffuse multiplier, 0–2
    thicknessFactor?: number;                // 0.018 — cylinder height as fraction of modelRadius (visual edge thickness)
    edgeColor?: number;                      // 0x5c3318 — side-wall color (0x5c3318 = wood/cardboard, 0x0e0e0e = neoprene)
    bottomCap?: boolean;                     // true — render the underside face of the board cylinder
  };

```ts
// Examples
new Tower3DView(el, { lighting: { scene: { exposure: 0.9 } } });
new Tower3DView(el, { lighting: { leds: { red: { color: 0x00ff00 } } } }); // green LEDs
new Tower3DView(el, { lighting: { animation: { breatheS: 3 } } }); // slower breathe
````

#### Public properties

| Property       | Type                              | Default     | Description                                                                                                                                                                                                    |
| -------------- | --------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onSideChange` | `(side: TowerSide) => void`       | —           | Callback fired when the active side changes — either via `selectSide`, a side-button click, or the user orbiting the camera into a new cardinal facing (per-frame detection, fires once per quadrant crossing) |
| `onLoadError`  | `(details: unknown) => void`      | —           | Callback fired if the GLB model fails to load. Assign before or immediately after construction.                                                                                                                |
| `loadState`    | `'pending' \| 'ready' \| 'error'` | `'pending'` | Read-only getter reflecting the current GLB load state. Transitions to `'ready'` on success or `'error'` on failure.                                                                                           |

#### Methods

Core display methods: `applyState(state)`, `applySeals(brokenSeals)`, `showIdle()`, `dispose()`.

##### `setSceneLights(opts): void`

Same signature as [`TowerDisplay#setSceneLights`](#setscenelightsopts-void). Live-updates the active scene.

##### `getLightingConfig(): ResolvedLightingConfig`

Return a deep-cloned snapshot of the full resolved lighting config currently active in the scene. Useful for reading back values after `setSceneLights` calls or to seed a lighting editor.

##### `applyLightingConfig(config: LightingConfig): void`

Resolve a partial `LightingConfig` over the defaults and apply it to the live scene — updating lights, ground disc material, LED light colors, and replaying all current LED effects.

##### `setGroundDiscVisible(visible: boolean): void`

Show or hide the noir ground disc.

##### `setGameBoardKingdom(side: TowerSide): void`

Orient the board so its north section faces the given cardinal direction. See [`TowerDisplay#setGameBoardKingdom`](#setgameboardkingdomside-towerside-void).

##### `playEntrance(): void`

Trigger the cinematic entrance sequence. See [`TowerDisplay#playEntrance`](#playentrance-void).

##### `setDrumRotationSoundUrl(url: string | null): void` / `setDrumRotationSoundEnabled(enabled: boolean): void`

Same signatures as the matching [`TowerDisplay`](#setdrumrotationsoundurlurl-string--null-void) methods. See [Drum rotation](#drum-rotation) below.

##### `setPreserveViewOnSideSelect(enabled: boolean): void`

Toggle whether side-button snaps preserve the current orbit state. See [`TowerDisplay#setPreserveViewOnSideSelect`](#setpreserveviewonsideselectenabled-boolean-void).

##### `getCameraConfig(): Required<CameraConfig>`

Return a snapshot of the current resolved camera configuration (all five fields guaranteed present). Reflects values that were last applied via the constructor `camera` option or `applyCameraConfig`. Returns synthesized defaults post-`dispose()`.

##### `applyCameraConfig(config: CameraConfig, options?: ApplyCameraConfigOptions): void`

Apply a partial camera configuration at runtime. Any fields provided overwrite the corresponding current values; omitted fields are unchanged. If the model is loaded, framing changes (`elevationFactor` / `targetHeightFactor` / `distanceFactor`) refit the camera immediately — snapping to the north preset by default, or, with `{ preserveView: true }`, reframing the current live view in place (keeping the orbit angle/zoom). See [`TowerDisplay#applyCameraConfig`](#applycameraconfigconfig-cameraconfig-options-applycameraconfigoptions-void).

> **Setting the initial framing (avoiding a default-camera flash).** The camera is fitted **once when the model loads**, reading whatever `CameraConfig` factors are current at that moment. Configure your framing _before_ load — via the constructor `camera` option, or an `applyCameraConfig(...)` call made before the GLB resolves (factors set pre-load are stored and applied by the on-load fit). Do **not** set the initial framing from a post-load hook such as a scene plugin's `onModelLoaded`: that fires _after_ the fit (and after a shader prewarm that renders a frame or two), so the view briefly shows the default framing and then snaps to yours.

```ts
view3d.applyCameraConfig({ preserveViewOnSideSelect: true });
view3d.applyCameraConfig({ zoomToCursor: false, elevationFactor: -0.3 });
```

##### Drum rotation

`applyState()` rotates the three named drum meshes (`drum_top`, `drum_middle`, `drum_bottom`) around the Y axis to match `state.drum[i].position`. Rotations take the shortest arc; the first state applied after the model loads snaps without animating, as does any rotation whose angle is below a small epsilon (already at target). `calibrated` and `jammed` are intentionally not used to gate the rotation — the visual mirrors whatever the firmware reports.

Drums turn at a **constant angular velocity** with linear easing — duration scales with the angle turned, set by `DRUM_SECONDS_PER_REVOLUTION` (seconds for a full 360°, default ~4s, matching the real tower) in [`src/3d/constants.ts`](../src/3d/constants.ts). A single 90° step takes a quarter of that.

Rotation audio is opt-in via `setDrumRotationSoundEnabled(true)`. While enabled, a sound plays whenever any drum is rotating. It defaults to the bundled `drumRotation.ogg` recording (`DRUM_ROTATION_SOUND_URL`); override it with `setDrumRotationSoundUrl(url)`, or pass `null` to disable it (silence — there is no procedural fallback tone).

##### Calibration command

Applying a state with `command === TOWER_COMMANDS.calibration` (an [`AppliedTowerState`](#appliedtowerstate)) triggers a calibration sequence. `TowerDisplay` first renders the incoming state as a baseline, then, when a 3D view is present, runs the visible sweep: each drum homes to position 0 one level at a time (top → middle → bottom), with a `DRUM_CALIBRATION_BEEP_PAUSE_S` pause held after each (room for the real tower's post-rotation beep). The Game Start sample plays at the end, then `onCalibrationComplete` fires with the fully-calibrated state stamped `CALIBRATION_FINISHED` (0x08). Renderers without a 3D view (readout / side-view) settle on the final state immediately and still fire the callback. Re-entrant calibration commands while one is in flight are ignored.

A bundled recording of the real sweep (`drumCalibration.ogg`, exported as `CALIBRATION_SOUND_URL`) plays once across the sweep via a dedicated audio handle — separate from the normal drum-rotation audio above, so it is heard only during calibration. It does not loop and has no placeholder tone: if the asset fails to load it stays silent rather than buzzing. Audio still requires `applyAudioConfig({ enabled: true })` from a user gesture. Tune the recording-to-visual sync with the two constants in [`src/3d/constants.ts`](../src/3d/constants.ts): `DRUM_SECONDS_PER_REVOLUTION` (spin speed) and `DRUM_CALIBRATION_BEEP_PAUSE_S` (inter-level pause).

The underlying `Tower3DView.runCalibrationSequence()` is public for advanced callers driving the 3D view directly, but the supported entry point is `applyState` with a calibration `command`.

##### Tower sample audio

`applyState()` also drives sample playback from `state.audio` (sample id, loop flag, volume). Sample audio is opt-in — call `applyAudioConfig({ enabled: true })` (or the legacy `setTowerAudioEnabled(true)`) from a user gesture to activate it.

Volume is treated as binary: `state.audio.volume === 3` (the firmware's mute value) silences playback; all other volume values play at full gain. No intermediate gain levels are applied.

Pass `force: true` to replay the current sample even if it matches the previously-synced one (use for explicit user triggers; the default `false` preserves dedup for BLE state-mirror callers).

##### Audio configuration

The full audio surface — sound pack, master enable, sequence-to-sample binding, drum-rotation URL — is exposed as a single `AudioConfig` object that mirrors the `LightingConfig` / `CameraConfig` pattern.

```ts
display.applyAudioConfig({ enabled: true }); // master toggle
display.applyAudioConfig({ pack: myCustomSoundPack }); // swap samples
display.applyAudioConfig({ bindSequenceToSample: true }); // auto-bind sequences
display.applyAudioConfig({ sequenceMap: { 0x12: 0x33 } }); // per-sequence override
const resolved = display.getAudioConfig(); // serialise full state
```

`applyAudioConfig` sparse-merges — fields that are `undefined` are left alone. `getAudioConfig` returns `Required<AudioConfig>` with every field populated (the `sequenceMap` is the resolved effective map after fallback resolution, so the result round-trips through `applyAudioConfig` cleanly).

The legacy fine-grained methods (`setTowerAudioLibrary`, `setTowerAudioEnabled`, `setDrumRotationSoundUrl`, `setDrumRotationSoundEnabled`) remain as thin shims that call `applyAudioConfig` under the hood. `setTowerAudioLibrary()` with no argument installs the bundled default pack.

##### One-shot transient playback (`playSample`)

```ts
playSample(
  sample: number,
  opts?: { loop?: boolean; volume?: number },
): { stop: () => void }
```

Available on `TowerRenderView`, `TowerDisplay`, and `Tower3DView`. Fires a transient sample play independent of `applyState`'s sync pipeline — each call allocates its own `AudioBufferSourceNode`, so subsequent state-driven `sync(0)`/`stop()` calls will not interrupt it. Use this when the audio model is fire-and-forget (e.g. the `ultimatedarktower` framework's `playSoundStateful`, which deliberately does not persist audio in tower state). For state-mirror playback, keep using `applyState(state)`.

Trade-offs:

- **Polyphony**: simultaneous calls play in parallel.
- **Looped one-shots** (`opts.loop = true`) require holding the returned `{ stop }` handle; there is no automatic stop. For unbounded loops, prefer the state-driven path.
- **Master mute/volume still apply** — per-shot gain feeds through the same master gain `applyAudioConfig` controls.
- **No dedup** — two `playSample(N)` calls play twice; the `lastSample` state is untouched.

Requires `applyAudioConfig({ enabled: true })` from a user gesture. Since v0.6.0, `setEnabled(true)` eagerly creates and resumes the AudioContext so subsequent `playSample` calls from non-gesture contexts (postMessage / WebSocket handlers) work correctly. See [AUDIO](AUDIO.md#one-shot-transient-playback-playsample) for the full discussion.

##### One-shot transient LED sequence (`playSequence`) — 0.7.0+

```ts
playSequence(
  sequenceId: number,
  opts?: { onComplete?: () => void },
): boolean
```

Available on `TowerRenderView`, `TowerDisplay`, and `Tower3DView`. Fires an LED sequence (e.g. `TOWER_LIGHT_SEQUENCES.victory`) as a transient command, independent of the `applyState` → `SequenceAnimator.apply(0)` → `stop()` pipeline. Use this when echoing a fire-and-forget light-override command (parallel to `playSample` for audio): the `ultimatedarktower` framework strips `state.led_sequence` on every response, so a state-driven `applyState` arriving immediately after would otherwise kill the sequence mid-playback. The transient animator flag ignores subsequent `apply(0)` calls until the sequence completes; explicit `stop()` or a different-id transient call still cancels it.

If `bindSequenceToSample` is enabled in the audio config and the sequence has a mapped sample, the bound sample also fires via `playSampleOneShot` — matching the state-driven `applyState` behavior and the real tower's firmware (which plays the bound sound automatically on every light-override command). Enable via `applyAudioConfig({ bindSequenceToSample: true })` once at setup.

Returns `true` if the sequence started (or was already running), `false` for an unknown id. State-driven drums, individual LEDs, and seal visibility continue to apply normally during transient playback — only `SequenceAnimator.apply(0)` is suppressed. No-op (returns `false`) when the display has no 3D renderer.

See [AUDIO](AUDIO.md#one-shot-transient-playback-playsample) for the architectural rationale (same model as `playSample`).

The bundled default pack ships in the package — no consumer setup is required for audio to work. See [AUDIO](AUDIO.md) for the full guide, including pack authoring, sequence binding, and bundler-compatibility notes.

##### LED visualization

`applyState()` drives 24 on-tower LEDs (`#ff2020`, matching the physical tower) — each rendered as an HDR-bright emissive proxy mesh + halo on a dedicated bloom layer, **not** a `PointLight`. Ring layers (0–2) light the seals through the drum cutouts (via the seal proxies); ledge/base layers (3–5) sit near the outer corner surface. A raised bloom threshold (`1.0`) selects only the HDR-bright LED pixels to amplify. See [LIGHTING §10–11](LIGHTING.md#10-on-tower-leds-hdr-emissive-proxies).

All six `LIGHT_EFFECTS` values are supported:

| Effect             | Visual                             |
| ------------------ | ---------------------------------- |
| `off`              | Fades to dark (≈0.15s)             |
| `on`               | Steady full emission               |
| `breathe`          | Sine ease 0→1→0 over 2.0s, loops   |
| `breatheFast`      | Sine ease 0→1→0 over 0.8s, loops   |
| `breathe50percent` | Sine ease 0→0.5→0 over 2.0s, loops |
| `flicker`          | Stepped 1↔0.2 at 0.3s, loops       |

Timing parity with [`TowerSideView`](#towersideview) is intentional.

Enable `debug3D: true` to render a tiny axes helper at each LED origin for layout debugging.

---

## Interfaces

### `TowerDisplayOptions`

```ts
interface TowerDisplayOptions {
  /** DOM element to render into. */
  container: HTMLElement;
  /** Which renderer(s) to show. Defaults to ['readout', 'side-view']. */
  renderers?: RendererType | RendererType[];
  /** Called when the user clicks a seal overlay in the side view. */
  onSealClick?: (seal: SealIdentifier) => void;
  /**
   * When true (the default), clicking a seal toggles its visibility
   * independently of game state. Set to false to disable.
   */
  clickToToggleSeals?: boolean;
  /** Called when any side-aware renderer changes its selected side. */
  onSideChange?: (side: TowerSide) => void;
  /** Called if the 3D GLB model fails to load. Only fires when renderers includes '3d-view'. */
  onLoadError?: (details: unknown) => void;
  /**
   * Called when a calibration command finishes. Receives the final calibrated
   * state (all drums calibrated at position 0), stamped CALIBRATION_FINISHED (0x08).
   * See the Calibration command section.
   */
  onCalibrationComplete?: (finalState: TowerState) => void;
  /** Optional override for the 3D view's GLB model URL. */
  modelUrl?: string;
  /** Optional override for where Draco decoder wasm/js files are loaded from. */
  dracoDecoderPath?: string;
  /** Enable verbose 3D diagnostics (logs, render heartbeats, axes helpers). Forwarded to Tower3DView. */
  debug3D?: boolean;
  /** Show the noir ground disc that catches the key-light shadow. Defaults to true. */
  showGroundDisc?: boolean;
  /** Nested lighting configuration forwarded to Tower3DView. See `LightingConfig`. */
  lighting?: LightingConfig;
  /** Initial camera framing defaults forwarded to Tower3DView. See `CameraConfig`. */
  camera?: CameraConfig;
}
```

### `ITowerDisplay`

Common interface implemented by `TowerDisplay`, `TowerSideView`, and `TowerStateReadout`.

```ts
interface ITowerDisplay {
  applyState(state: TowerState): void;
  applySeals(brokenSeals: SealIdentifier[]): void;
  showIdle(): void;
  dispose(): void;
}
```

### `AppliedTowerState`

```ts
type AppliedTowerState = TowerState & { command?: number };
```

A `TowerState` that may additionally carry a `command` — a `TOWER_COMMANDS.*` value mirroring byte 0 of the wire packet. Accepted by `applyState`; when `command` is present (e.g. `TOWER_COMMANDS.calibration`) the display runs the matching command flow. Plain `TowerState` is still accepted. See [Calibration command](#calibration-command).

### `RendererType`

```ts
type RendererType = 'readout' | 'side-view' | '3d-view';
```

### `Tower3DViewOptions`

```ts
interface Tower3DViewOptions {
  modelUrl: string;
  dracoDecoderPath?: string;
  debug3D?: boolean;
  showGroundDisc?: boolean;
  lighting?: LightingConfig;
  camera?: CameraConfig;
}
```

See the [`LightingConfig`](#lightingconfig) section above for the full shape.

### `CameraConfig`

Camera framing and behavior options. All fields are optional — unset fields fall back to their defaults.

```ts
interface CameraConfig {
  elevationFactor?: number; // default: -0.5
  targetHeightFactor?: number; // default: -0.15
  distanceFactor?: number; // default: 1
  zoomToCursor?: boolean; // default: true
  preserveViewOnSideSelect?: boolean; // default: false
}
```

| Field                      | Default | Description                                                                                                                                                                       |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elevationFactor`          | `-0.5`  | Camera eye height as a fraction of `modelRadius`. Negative values place the eye below the model's geometric centre.                                                               |
| `targetHeightFactor`       | `-0.15` | Vertical position of the orbit target (look-at point) as a fraction of `modelRadius`. Negative values aim the camera lower.                                                       |
| `distanceFactor`           | `1`     | Multiplies the auto-fitted camera distance (the "everything in frame" distance). `>1` pulls the camera back (zooms out), `<1` pushes it in — independent of the tilt factors.     |
| `zoomToCursor`             | `true`  | When `true`, scroll-wheel zoom-in moves the camera toward the cursor rather than the orbit target. Zoom-out always uses standard OrbitControls behavior.                          |
| `preserveViewOnSideSelect` | `false` | When `true`, selecting a cardinal side via the side buttons or `selectSide` rotates only the azimuth while keeping the current orbit target, tilt, pan, and zoom distance intact. |

### `ApplyCameraConfigOptions`

Options for the second argument of `applyCameraConfig`.

```ts
interface ApplyCameraConfigOptions {
  preserveView?: boolean; // default: false
}
```

| Field          | Default | Description                                                                                                                                                                                                                                       |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveView` | `false` | When `true`, apply only the changed framing factor(s) to the **current live view** — preserving the orbit angle, pan, and any dimension not being changed — instead of snapping back to the fitted north preset. Used by the live tuning sliders. |

### `TowerSide`

```ts
type TowerSide = 'north' | 'east' | 'south' | 'west';
```

### `SealIdentifier`

```ts
type SealIdentifier = { side: TowerSide; level: TowerLevels };
```

`TowerLevels` is `'top' | 'middle' | 'bottom'` — imported from `ultimatedarktower`.

### `PerfReport` / `PerfStat`

Diagnostic-only perf snapshot returned by `Tower3DView.collectPerfReport(durationMs = 3000)`. `PerfStat` is
`{ median; p95; max }` (milliseconds); `PerfReport` bundles `fps`, `frames`, `durationMs`, `bloomEnabled`,
the per-stage `frameMs` / `bloom*Ms` `PerfStat`s, and `drawCalls` / `triangles`. See
[framerate-issue.md](framerate-issue.md) for interpretation.

---

## Scene plugins

The generalized seam for injecting and owning 3D content in the `Tower3DView` scene. See [SCENE_PLUGINS](SCENE_PLUGINS.md) for the author's guide.

### `attachScenePlugin(view, plugin)`

```ts
function attachScenePlugin(view: Tower3DView, plugin: ScenePlugin): ScenePluginHandle;
```

Attaches a plugin to a `Tower3DView`. Calls `plugin.attach(ctx)` once (synchronously) with a live context, fans state/seal/model-load/side/frame events out to the plugin, and returns a handle. Thin wrapper over the public `view.registerScenePlugin(plugin)`.

### `ScenePlugin`

```ts
interface ScenePlugin {
  readonly id: string;
  attach(ctx: ScenePluginContext): void;
  onStateApplied?(state: TowerState): void; // after every applyState, post-update
  onSealsApplied?(brokenSeals: SealIdentifier[]): void;
  onModelLoaded?(info: ScenePluginModelInfo): void; // fires immediately if already loaded
  update?(dtSeconds: number): void; // per-frame, dt in seconds
  dispose(): void;
}
```

### `ScenePluginContext`

```ts
interface ScenePluginContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  readonly modelRadius: number; // live; defaults to 1 before load
  readonly modelBottomY: number; // live
  readonly modelTopY: number; // live
  drumNode(level: 'top' | 'middle' | 'bottom'): THREE.Object3D | null;
  registerFrameCallback(cb: (dtSeconds: number) => void): () => void;
  onStateApplied(cb: (state: TowerState) => void): () => void;
  onSealsApplied(cb: (broken: SealIdentifier[]) => void): () => void;
  onModelLoaded(cb: (info: ScenePluginModelInfo) => void): () => void;
  registerPointerTarget(target: PointerTarget): () => void;
  getSide(): TowerSide; // 'north' before the camera is ready
  onSideChange(cb: (side: TowerSide) => void): () => void;
  isModelLoaded(): boolean;
}
```

Each subscription returns an unsubscribe function; subscriptions made through `ctx` are also torn down automatically on detach.

### `ScenePluginModelInfo`

```ts
interface ScenePluginModelInfo {
  root: THREE.Object3D;
  modelRadius: number;
  modelBottomY: number;
  modelTopY: number;
}
```

### `ScenePluginHandle`

```ts
interface ScenePluginHandle {
  readonly plugin: ScenePlugin;
  detach(): void; // disposes the plugin + frees its subscriptions; idempotent
}
```

### `PointerTarget`

```ts
interface PointerTarget {
  objects: THREE.Object3D[] | (() => THREE.Object3D[]);
  priority?: number; // higher tested first; default 0
  onPointerDown?(hit: THREE.Intersection, ev: PointerEvent): boolean | void; // return true to consume
  onPointerMove?(hit: THREE.Intersection | null, ev: PointerEvent): void;
  onPointerUp?(hit: THREE.Intersection | null, ev: PointerEvent): boolean | void;
}
```

Registered via `ctx.registerPointerTarget(target)`. On `pointerdown` the view raycasts registered targets in priority order (capture-phase, in front of OrbitControls); the first whose `onPointerDown` returns `true` consumes the gesture (camera does not orbit) and receives `onPointerMove` / `onPointerUp` for the rest of the drag.

### Related `Tower3DView` methods

- `registerScenePlugin(plugin: ScenePlugin): ScenePluginHandle` — the public seam `attachScenePlugin` wraps.
- `registerPointerTarget(target: PointerTarget): () => void` — register a pointer hit-test target directly.
- `setBoardDiscEnabled(enabled: boolean): void` — show/hide **only** the placeholder board image on the disc top (the board-surface stand-down switch). The disc mesh and physics floor are unaffected. Default on.
- `getDiscMetrics(): { center: THREE.Vector3; radius: number; topY: number }` — disc geometry for aligning on-disc content; valid even before the disc mesh is built. `topY` is the top surface; `center` is the disc's geometric center on the Y axis.
- `getPhysicsHooks(): TowerPhysicsHooks` — unchanged; the original narrow physics seam.

### `anchorToWorld(anchor, discMetricsOrView, northKingdom?)`

Maps a normalized `[0,1]` board-image anchor to its world position on the ground disc's top surface, so a plugin can place a token/marker exactly where the printed board art shows it. The returned `THREE.Vector3` already has `y = topY`.

```ts
// Core overload — testable, no live view:
anchorToWorld(anchor: BoardAnchor, discMetrics: DiscMetrics, northKingdom?: 0 | 1 | 2 | 3): THREE.Vector3;
// Convenience overload — pulls discMetrics + northKingdom from the view:
anchorToWorld(anchor: BoardAnchor, view: Tower3DView): THREE.Vector3;
```

- `BoardAnchor` is `{ x: number; y: number }` (normalized image coords; image-y grows downward).
- `DiscMetrics` is `{ center: THREE.Vector3; radius: number; topY: number }` — the shape returned by `getDiscMetrics()`.
- The mapping is derived to match how the board texture is actually rendered (full image on the disc's cylinder top cap, rotated by the board-texture rotation), so it stays aligned with the printed art for any disc size/position.
- **`northKingdom` must match the disc's current setting** — it shifts the board rotation by `nk·π/2`. The view overload reads it from `view.getLightingConfig().boardDisc.northKingdom`; with the core overload, pass the same value you configured on `boardDisc.northKingdom` (default `0`).

```ts
import { anchorToWorld } from 'ultimatedarktowerdisplay';

const pos = anchorToWorld({ x: 0.62, y: 0.41 }, view.view3D!); // -> THREE.Vector3 on the disc
token.position.copy(pos);
```

### Related `TowerRenderView` methods

- `getOverlayContainer(): HTMLElement` — a `pointer-events:none` HUD layer over the canvas (children opt back in). Created on demand; also created eagerly via the `overlay: true` option.
- `getPanelSlot(position: 'left' | 'right' | 'top' | 'bottom'): HTMLElement` — a fixed docking panel that reflows the canvas. Created on demand.

Both are removed on `dispose()`, and their CSS ships in `TOWER_DISPLAY_CSS` (so they work under `injectStyles: false`).

---

## Audio exports

The bundled audio system. The default pack ships in the package — no consumer setup is required for audio
to work; pass these to `AudioConfig` (see [`TowerDisplayOptions`](#towerdisplayoptions)) only to customize.
See [AUDIO](AUDIO.md) for the full guide (pack authoring, sequence binding, bundler-compatibility notes).

| Export                            | Type                               | Purpose                                                                |
| --------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `DEFAULT_TOWER_SOUND_PACK`        | `SoundPack`                        | The bundled official sound pack (the default `AudioConfig.pack`).      |
| `buildOfficialSoundPack(baseUrl)` | `(string) => SoundPack`            | Build the official pack against a custom asset base URL.               |
| `hasDefaultAudioAsset(sample)`    | `(number) => boolean`              | Whether the bundled pack has a sample for an audio index.              |
| `DEFAULT_SEQUENCE_AUDIO_MAP`      | `Readonly<Record<number, number>>` | Default LED-sequence → audio-sample mapping.                           |
| `buildSequenceAudioMap(entries)`  | fn                                 | Build a sequence → audio map from named `{ sequence: audio }` entries. |
| `DrumRotationAudio`               | class                              | Pitch/rate-driven drum-rotation loop player.                           |
| `TowerSampleAudio`                | class                              | One-shot sample player (backs `TowerDisplay.playSample`).              |
| `CALIBRATION_SOUND_URL`           | `string`                           | Bundled calibration-sound asset URL.                                   |
| `DRUM_ROTATION_SOUND_URL`         | `string`                           | Bundled drum-rotation-sound asset URL.                                 |

---

## Physics (`./physics` subpath)

Opt-in skull physics. Imported from `ultimatedarktowerdisplay/physics`, which pulls `@dimforge/rapier3d` —
the main entry never does. See [PHYSICS](PHYSICS.md) for the guide, tuning, and the verification checklist.

### `attachSkullPhysics(view, config?)`

`(view: Tower3DView, config?: PhysicsConfig): SkullPhysicsHandle` — attach physics-driven skulls to a live
`Tower3DView`. Returns immediately; Rapier's WASM init runs in the background and `dropSkull()` calls made
before it resolves are queued. Internally a [`ScenePlugin`](#sceneplugin) attached via `attachScenePlugin`.

```ts
import { attachSkullPhysics } from 'ultimatedarktowerdisplay/physics';

const skulls = attachSkullPhysics(view.view3D!, { skull: { maxCount: 8 } });
skulls.dropSkull();
skulls.applyPhysicsConfig({ skull: { restitution: 0.4 } }); // live tuning
```

`SkullPhysicsHandle` — `{ dropSkull(): void; clearSkulls(): void; getPhysicsConfig():
ResolvedPhysicsConfig; applyPhysicsConfig(partial: PhysicsConfig): void; dispose(): void }`.

Supporting exports:

- `DEFAULT_PHYSICS: ResolvedPhysicsConfig` — the fully-resolved default config.
- `resolvePhysics(user?, base?): ResolvedPhysicsConfig` — merge a partial `PhysicsConfig` over the defaults.
- `PhysicsConfig` — nested, fully-optional config (grouped `skull` / `drum` / `seal` / `static` / `board` /
  `oob`); pass any subset.
- `ResolvedPhysicsConfig` — `PhysicsConfig` with every leaf required (`DeepRequired<PhysicsConfig>`).
- `SkullTemplate` — a preprocessed skull model (decimated mesh + hull points) for `skull.modelUrl`.
- `DeepRequired<T>` — utility type making every nested property required (re-exported from the main types).

---

## Rendered sections

When `applyState()` is called, the display renders three sections:

### LEDs

A 6-layer x 4-light grid. Each light shows its effect as a data attribute:

| Effect       | CSS `data-effect` value |
| ------------ | ----------------------- |
| Off          | `off`                   |
| On           | `on`                    |
| Breathe      | `breathe`               |
| Breathe Fast | `breathe-fast`          |
| Breathe 50%  | `breathe-50`            |
| Flicker      | `flicker`               |

Layers are labeled by position (e.g., `top`, `upper-middle`, `lower-middle`, `bottom`) using `LAYER_TO_POSITION` from `ultimatedarktower`. Lights are labeled by compass direction (N, E, S, W) using `LIGHT_INDEX_TO_DIRECTION`.

### Drums

Three drums (Top, Middle, Bottom) showing:

- **Position** — compass direction (N, E, S, W)
- **Calibration** — checkmark or dash
- **Glyph** — the glyph name visible on the north-facing side (only when calibrated), resolved from `GLYPHS`

### Info

- **Audio** — sample name (resolved from `TOWER_AUDIO_LIBRARY`), loop flag, volume description
- **Skulls** — beam count with skull drop highlight when count increases
- **LED Sequence** — active sequence override label (resolved from `TOWER_LIGHT_SEQUENCES`), shown only when non-zero

---

## CSS Classes

### Readout (`tdr-` prefix)

All readout elements use the `tdr-` prefix:

| Class              | Element                       |
| ------------------ | ----------------------------- |
| `.tdr-idle`        | Idle/waiting message          |
| `.tdr-section`     | Section wrapper               |
| `.tdr-leds`        | LED section                   |
| `.tdr-layer`       | Single LED layer row          |
| `.tdr-layer-label` | Layer position label          |
| `.tdr-led`         | Individual LED indicator      |
| `.tdr-drums`       | Drums section                 |
| `.tdr-drum`        | Single drum row               |
| `.tdr-drum-name`   | Drum name (Top/Middle/Bottom) |
| `.tdr-drum-pos`    | Drum compass position         |
| `.tdr-drum-cal`    | Calibration indicator         |
| `.tdr-glyph`       | Glyph name                    |
| `.tdr-info`        | Info section                  |
| `.tdr-audio`       | Audio display                 |
| `.tdr-audio-name`  | Audio sample name             |
| `.tdr-audio-loop`  | Loop badge                    |
| `.tdr-audio-vol`   | Volume label                  |
| `.tdr-skull-drop`  | Skull drop highlight          |
| `.tdr-beam-count`  | Beam/skull count              |
| `.tdr-led-seq`     | LED sequence override label   |

### Side view (`tsv-` prefix)

| Class                               | Element                                        |
| ----------------------------------- | ---------------------------------------------- |
| `.tsv-wrapper`                      | Outer wrapper div                              |
| `.tsv-side-selector`                | N/E/S/W button bar                             |
| `.tsv-side-btn`                     | Individual side selector button                |
| `.tsv-side-btn[data-active="true"]` | Currently selected side button                 |
| `.tsv-svg`                          | SVG container div                              |
| `.tsv-seal`                         | Seal overlay SVG element (all seals)           |
| `.tsv-seal-top`                     | Top doorway seal                               |
| `.tsv-seal-middle`                  | Middle doorway seal                            |
| `.tsv-seal-bottom`                  | Bottom doorway seal                            |
| `.tsv-seal[data-broken="true"]`     | Hidden seal (opacity 0)                        |
| `.tsv-seal[data-broken="false"]`    | Visible seal                                   |
| `.tsv-led`                          | LED marker element                             |
| `.tsv-led[data-effect="<effect>"]`  | LED with active effect (same values as `tdr-`) |

---

## Peer dependency

This package requires [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) `^4.0.0 || ^5.0.0` as a peer dependency. It provides:

- `TowerState` — the state type passed to `applyState()`
- `GLYPHS`, `TOWER_AUDIO_LIBRARY`, `TOWER_LIGHT_SEQUENCES`, `VOLUME_DESCRIPTIONS`, `LAYER_TO_POSITION`, `LIGHT_INDEX_TO_DIRECTION`, `LIGHT_EFFECTS` — lookup constants used for rendering

## See also

- [RENDERERS](RENDERERS.md) — feature comparison + when to pick which renderer.
- [ARCHITECTURE](ARCHITECTURE.md) — mental model, data flow, composition, lifecycle.
- [LIGHTING](LIGHTING.md) — full `LightingConfig` field reference and tuning recipes.
- [AUDIO](AUDIO.md) — `SoundPack`, `AudioConfig`, custom packs, sequence binding.
- [PHYSICS](PHYSICS.md) — `TowerPhysicsHooks` and the `attachSkullPhysics` API.
- [TROUBLESHOOTING](TROUBLESHOOTING.md) — common failure modes for every callback in this doc.
