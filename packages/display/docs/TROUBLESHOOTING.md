# Troubleshooting

*Docs: [Index](README.md) > All readers > Troubleshooting*

Predictable failure modes and their fixes. Each section is keyed by symptom. If you do not find your problem here, open an issue on [GitHub](https://github.com/ChessMess/UltimateDarkTowerDisplay/issues).

## Getting-started issues

### `Cannot find module 'ultimatedarktower'`

`ultimatedarktower` is a peer dependency, not a regular dependency. Your app installs it:

```bash
npm install ultimatedarktower
```

The same applies to `three` and `gsap` if you use `Tower3DView`, and to `@dimforge/rapier3d-compat` if you import the physics subpath.

### `engines.node` mismatch warning

This package requires Node.js 18 or newer. Upgrade Node, or set `engine-strict=false` in `.npmrc` to bypass with the understanding that older Node may break the build.

### TypeScript: subpath import `ultimatedarktowerdisplay/physics` not resolved

Set `compilerOptions.moduleResolution` to `"bundler"`, `"node16"`, or `"nodenext"` in `tsconfig.json`. The older `"node"` resolution does not understand the `exports` field that defines the subpath.

Runtime resolution by Vite, Webpack, Rollup, and esbuild works regardless of the `tsconfig` setting — this is a typecheck-only issue.

## Display shows idle and never updates

Most common causes, in order of likelihood:

1. **You never called `applyState`.** The constructor renders an idle placeholder; the placeholder stays until `applyState` is called.
2. **You called `applyState` on a disposed display.** A disposed `TowerDisplay` is not reusable. Construct a new one.
3. **The container is detached from the DOM.** `TowerDisplay` writes into the container element. If the element has been removed from `document.body` since construction, mutations still happen but are invisible.
4. **You constructed `TowerDisplay` before the container existed.** Check the container is in the DOM before `new TowerDisplay({ container })`. In React, build inside `useEffect`, not in the render body.

## GLB load failures

The 3D renderer loads `tower.glb` asynchronously. Failures surface in three places:

- `console.error` from Three.js.
- The `onLoadError` callback (constructor option), called once with the failure details.
- `display.loadState === 'error'` afterwards.

Common causes:

- **MIME type wrong.** The server must serve `.glb` as `model/gltf-binary` (or `application/octet-stream`). Some bundler dev servers default to `text/plain`, which breaks Three.js. Vite handles this correctly.
- **Path is wrong.** The default `modelUrl` is the bundled GLB. If you set `modelUrl` to a custom path, confirm the file is actually served at that URL (open it directly in a browser tab).
- **Draco decoder cannot load.** The Draco decoder defaults to gstatic CDN. If your CSP blocks external scripts, host the decoder yourself and pass `dracoDecoderPath: '/path/to/draco/'`.
- **Custom model is missing named nodes.** Custom models must contain `drum_top`, `drum_middle`, `drum_bottom` for drum rotation, and `seal_<side>_<level>` (lowercase, all 12) for seal visibility. Missing names log one warning and become silent no-ops.

For Electron the most common variant of this is `file://` URLs being blocked — see [ELECTRON](ELECTRON.md) for the `app://` protocol recipe.

## Rapier WASM not loading

The physics subpath loads Rapier's WebAssembly module on first `attachSkullPhysics` call.

- **Vite, esbuild, Rollup:** work out of the box.
- **Webpack 5:** add `experiments.asyncWebAssembly: true` to your webpack config.
- **Webpack 4:** not supported by Rapier's compat package; upgrade to Webpack 5.
- **No bundler (raw `<script type="module">`):** browsers ship WebAssembly natively, but you may need to serve Rapier's `.wasm` file with `Content-Type: application/wasm`.

If you do not import `ultimatedarktowerdisplay/physics`, Rapier is never loaded. The main package entry never references it.

## Skull model not appearing

Symptoms: the skull dropdown is set to a model, but `Drop Skull` produces a default white sphere.

- Confirm a Draco-compressed GLB exists at the URL you passed. The example app discovers GLBs at boot via `import.meta.glob('../src/3d/assets/skull_*.glb')` — if you added a new file, restart `npm run dev:example` (Vite caches glob results until restart).
- Open DevTools Network: the GLB should return 200 with `Content-Type: model/gltf-binary` (or `application/octet-stream`).
- Inspect the console for `skull model load failed` — that path logs the loader error verbatim. The most common failure is a missing/inaccessible Draco decoder: the library defaults to `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`; on networks that block gstatic, self-host the decoder.

## `convex hull degenerate, falling back to ball` warning

The convex-hull builder rejected the supplied point cloud. Causes:

- The mesh has fewer than 4 non-coplanar vertices (extremely flat or degenerate input).
- The mesh's bounding sphere has zero radius (empty geometry).

Fallback is automatic — the dropped skull uses a ball collider with the configured visual. Re-export the model from Blender with normals recalculated and any degenerate triangles removed.

## STL loaded directly instead of the GLB

The lib logs a warning when an `.stl` URL is supplied. STLs work but are large (no compression, no index reuse) and skip the Blender export's silhouette-preserving decimation. Re-export to a Draco-compressed `.glb` (Blender → File → Export → glTF 2.0, enable Geometry Compression) for ~10× smaller downloads.

## Auto-drop checkbox is enabled but no skull falls

`skull.autoDropOnSkullCountIncrease` only triggers on a strict `state.beam.count` *increase*. Verify:

- The state actually has a higher `beam.count` than the previous `applyState` call (DevTools: inspect `getPhysicsConfig()` and the input state).
- `skull.maxCount` isn't already reached — at the cap, both manual and auto-drops are no-ops.
- Physics is attached (`getPhysicsHandle()` non-null). The 2D renderer doesn't run physics; `applyState` deltas are tracked only in the 3D view.

## Web Bluetooth and user-gesture requirements

This package never opens a BLE connection. All BLE belongs to [`ultimatedarktower`](https://github.com/ChessMess/ultimatedarktower). The most common confusion: Web Bluetooth's `navigator.bluetooth.requestDevice` must be called from a user gesture (button click), or it throws.

### Blank screen / crash on iOS

No iOS browser (Safari, Chrome, Edge, Firefox — all WebKit) implements Web Bluetooth. If you construct an `UltimateDarkTower` for software-only state (e.g. broken seals) without specifying a platform, older library versions threw *"Unable to detect Bluetooth platform"* at construction and took down the whole page on iOS. Construct with `new UltimateDarkTower({ platform: BluetoothPlatform.NONE })` for software-only use — see [`example/sealController.ts`](../example/sealController.ts). (Current `ultimatedarktower` also defers detection so the default no longer throws at construction, but `NONE` makes the intent explicit.) Users who want to drive a physical tower on iOS need a Web BLE browser such as [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055).

The audio subsystem in `Tower3DView` has the same constraint. Browsers block audio playback until the user clicks something. Wire `applyAudioConfig({ enabled: true })` to a click handler, not to mount or to a state subscription. (See [AUDIO](AUDIO.md) for the full audio API.)

Volume `3` in `TowerState.audio.volume` is the firmware's mute value. If you build a state by hand and audio is silent, check the volume.

## Electron-specific

Run in the renderer process, not the main process. The package mutates `document.head` on construction and depends on a real browser DOM.

Common Electron failures:
- **Blank rendered output, CSP error in console.** Default CSP forbids inline `<style>`. Pass `injectStyles: false` to `TowerDisplay` and inject the exported `TOWER_DISPLAY_CSS` constant via a hashed `<style>` tag or a `<link>` to a CSS file you control.
- **GLB does not load.** `file://` URLs misbehave. Use the `app://` protocol with a custom protocol handler that serves your packaged assets.
- **BLE picker does not open.** Set `BrowserWindow`'s `webPreferences.webBluetoothEnabled: true`. Then wire the `select-bluetooth-device` event on the session.

See [ELECTRON](ELECTRON.md) for the full walkthrough.

## Bundler resolution for the physics subpath

Symptom: typecheck reports `Cannot find module 'ultimatedarktowerdisplay/physics'` even though runtime works.

Fix: change `tsconfig.json`'s `compilerOptions.moduleResolution` from `"node"` to one of:

- `"bundler"` — newest, recommended for new projects.
- `"node16"` or `"nodenext"` — work, but require `.js` extensions on relative imports in some configurations.

The `package.json` `exports` field that defines the subpath is invisible to legacy `"node"` resolution.

## Idle state quirks

`showIdle()` resets every active renderer to its idle representation, but it does **not**:

- Unload the GLB. The model stays in memory; the next `applyState` is fast.
- Replay the entrance cinematic. Call `playEntrance()` explicitly if you want it.
- Clear user-toggled seals. Those persist until `dispose()` or until clicked again.

`showIdle()` also **pauses the render loop** (hides the canvas and cancels the `requestAnimationFrame`
loop) so an idle view doesn't keep a background tab/popup's main thread busy at ~60fps — this matters
when the view runs in a same-origin popup (e.g. the Controller example's Tower Emulator), where an
always-on loop makes the opener page sluggish. Calling `applyState` after `showIdle` re-shows the
canvas, resumes the loop, and immediately reanimates everything.

## Skull-drop detection edge cases

The readout's skull-drop highlight fires when `state.beam.count` is greater than the previous `applyState`'s `beam.count`.

- **Resets do not fire.** Setting `beam.count` to 0 (or any lower value) does not highlight. Resetting state through `Reset Seals` and `Empty` presets in the example does not trigger the animation.
- **Equal values do not fire.** Two identical `applyState` calls show no highlight even when `force: true` is passed (force only affects audio dedup).
- **`dispose()` clears tracking.** A new `TowerDisplay` starts at `beam.count = -Infinity` for tracking purposes, so the first `applyState` with `beam.count > 0` does fire.

## Bundled audio files do not load (404s on `.ogg` requests)

The library locates the bundled audio with `new URL('./assets/', import.meta.url)`. Modern bundlers (Vite, webpack 5+, Rollup, esbuild, parcel, native Node ESM) emit and serve the referenced assets next to the JS, but some toolchains miss the indirect runtime concatenation.

Quick workaround: copy `node_modules/ultimatedarktowerdisplay/dist/audio/assets/` to a static directory in your app and install a re-hosted pack:

```ts
import { buildOfficialSoundPack } from 'ultimatedarktowerdisplay';
display.applyAudioConfig({ pack: buildOfficialSoundPack('/audio/') });
```

See [AUDIO §Bundler compatibility](AUDIO.md#bundler-compatibility).

## Audio sample does not replay on the same trigger

By design. The audio subsystem deduplicates identical successive packets to prevent retriggers when a BLE state-mirror caller resends a steady state.

To replay deliberately on a user click, pass `force: true`:

```ts
display.applyState(state, true);
```

In the example app, the Trigger button uses `force: true`; the live BLE subscription does not.

## 3D performance is slow

Bloom is the dominant cost. Disable it for low-end hardware:

```ts
display.applyLightingConfig({
  scene: { bloom: { enabled: false } },
});
```

Other levers:
- Lower `scene.shadow.mapSize` (default 2048).
- Skip the 3D renderer entirely if the device is constrained: `renderers: ['readout', 'side-view']`.
- Disable the ground disc: `setGroundDiscVisible(false)` or `lighting.groundDisc.enabled: false`.

The bundle itself is dominated by the 22 MB GLB. If GLB size is the bottleneck, supply your own smaller model via `modelUrl` — drum and seal naming must still match.

## Scene plugin issues

- **Clicking my plugin's object still orbits the camera.** The target's `onPointerDown` must return `true` to consume the gesture; returning `undefined`/`false` lets the camera handle it. Also make sure the object is actually in the target's `objects` (or the getter returns it) and, if it competes with another target, give it a higher `priority`.
- **My content is positioned wrong / floats off the disc.** Read bounds from `getDiscMetrics()` (or `ctx.modelTopY` / `onModelLoaded`), not hardcoded numbers — the model is auto-fit and bounds are only finalized after the GLB loads. Position model-dependent content in `onModelLoaded`, or guard on `ctx.isModelLoaded()`.
- **`onModelLoaded` never fired.** It fires once the GLB is in the scene (synchronously if already loaded when you attach). If the model failed to load, you'll see the GLB-load error above and `view.loadState === 'error'`.
- **The placeholder board is still showing under my content.** Call `setBoardDiscEnabled(false)` to stand the built-in board image down. The disc mesh stays (use `setGroundDiscVisible(false)` to hide that too); the physics floor is independent of both.
- **My plugin's meshes leaked after teardown.** `detach()` / `dispose()` calls your plugin's `dispose()` but cannot free your GPU resources for you — remove your `Object3D`s from the scene and call `.dispose()` on their geometries, materials, and textures there.

## See also

- [GETTING_STARTED](GETTING_STARTED.md) — install and prerequisites.
- [RENDERERS](RENDERERS.md) — capabilities and constraints per renderer.
- [SCENE_PLUGINS](SCENE_PLUGINS.md) — author a scene plugin on the generalized seam.
- [ELECTRON](ELECTRON.md) — deep dive on Electron integration.
- [API](API.md) — option and method reference for every callback mentioned here.
