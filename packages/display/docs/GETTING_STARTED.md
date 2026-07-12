# Getting started

_Docs: [Index](README.md) > Hobbyist + integrator > Getting started_

This guide picks up where the [repo README quick start](../README.md#quick-start) leaves off. By the end you should know what `TowerState` looks like, how to mount a `TowerDisplay`, which renderer to pick, and how to wire it to a live tower via [`ultimatedarktower`](https://github.com/ChessMess/ultimatedarktower) (UDT).

## Prerequisites

- **Node.js 18+** and **npm 7+**. The package's `engines` field enforces this.
- **A modern browser** for runtime. Web Bluetooth (required by UDT, not by this package) is only available in Chromium-based browsers on desktop and Android — Safari and iOS do not ship Web Bluetooth.
- **WebGL2** is required if you use the 3D renderer. Every browser released since 2017 has it.
- **TypeScript users**: `tsconfig.json` should use `"moduleResolution": "bundler"` (or `"node16"` / `"nodenext"`) if you plan to import the optional physics subpath. Other resolution modes work for the main entry point.

## Install in detail

```bash
npm install ultimatedarktowerdisplay ultimatedarktower
```

`ultimatedarktower` is declared as a peer dependency. Your app installs it; this package imports types and helpers from it at runtime.

For the 3D renderer you also need `three` and `gsap`:

```bash
npm install three gsap
```

These are also peer dependencies, so your app controls the version. The package is tested against `three@^0.170` and `gsap@^3.12`.

For optional skull physics:

```bash
npm install @dimforge/rapier3d-compat
```

Rapier is an _optional_ peer dependency — only install it if you import `ultimatedarktowerdisplay/physics`. See [PHYSICS](PHYSICS.md).

## What is `TowerState`?

`TowerState` is the plain-object snapshot of the tower's state at one moment. Every renderer in this package consumes it through `applyState(state)`. You get one from UDT, either by calling `createDefaultTowerState()` for a baseline you mutate yourself, or by subscribing to a live BLE connection.

The shape:

```ts
type TowerState = {
  drum: Array<{
    calibrated: boolean;
    position: number;
  }>;
  layer: Array<{
    light: Array<{
      effect: number;
      loop: boolean;
    }>;
  }>;
  audio: {
    sample: number;
    loop: boolean;
    volume: number;
  };
  beam: {
    count: number;
    fault: boolean;
  };
  led_sequence: number;
};
```

The recommended construction path is always `createDefaultTowerState()` followed by direct field assignment. You do not need to construct a `TowerState` literal by hand.

```ts
import { createDefaultTowerState, LIGHT_EFFECTS, TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';

const state = createDefaultTowerState();

state.layer[0].light[0].effect = LIGHT_EFFECTS.on;
state.layer[0].light[1].effect = LIGHT_EFFECTS.breathe;
state.drum[0].calibrated = true;
state.drum[0].position = 1;
state.audio.sample = TOWER_AUDIO_LIBRARY.Ashstrider.value;
state.audio.loop = true;
state.beam.count = 2;
```

See the [docs/README glossary](README.md#glossary) for definitions of `drum`, `layer`, `light`, `glyph`, `seal`, `beam`, and `skull-drop`.

## Mounting and lifecycle

`TowerRenderView` is the recommended entry point. It owns one DOM container, mounts a `TowerDisplay` inside, and adds optional header chrome (title, subtitle, status badges, action row). The minimal lifecycle is:

```ts
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';
import { createDefaultTowerState } from 'ultimatedarktower';

const container = document.getElementById('tower');
if (!container) {
  throw new Error('Missing #tower container');
}

const view = new TowerRenderView({
  container,
  modelUrl: towerModelUrl,
  title: 'Render',
  badges: [{ id: 'conn', label: 'BLE', value: 'disconnected', tone: 'warn' }],
});
view.applyState(createDefaultTowerState());

// Later, when a new state arrives:
view.applyState(nextState);

// Update the broken-seal set when it changes:
view.applySeals([{ side: 'north', level: 'top' }]);

// Live-update a badge as connection state changes:
view.updateBadge('conn', { value: 'connected', tone: 'good' });

// Tear down when removing the view:
view.dispose();
```

Behavior to know:

- The constructor immediately renders an idle placeholder. `applyState` replaces it.
- Styles are injected into `document.head` automatically on first use. To opt out (e.g. for CSP), pass `injectStyles: false` and apply the `TOWER_DISPLAY_CSS` string yourself.
- A skull-drop highlight appears only when `beam.count` increases between two successive `applyState` calls. `dispose` clears this tracking.
- The 3D renderer loads its GLB model asynchronously. State applied before load is queued and replayed on completion. Hook `onLoadError` (and check `view.loadState`) if you need to surface failures.
- Advanced 3D config that isn't forwarded on the facade (e.g. `setSkyboxUrl`, `setBoardDiscEnabled`) is reached via `view.display.*`; physics hooks via `view.view3D`.
- To **own your own 3D content** in the scene from a separate package (a board, tokens, effects), attach a scene plugin with `attachScenePlugin(view.view3D, plugin)`, hand the disc surface over with `setBoardDiscEnabled(false)`, and dock DOM controls with `view.getOverlayContainer()` / `view.getPanelSlot(...)`. See [SCENE_PLUGINS](SCENE_PLUGINS.md).

If you need composable control without the facade's wrapper div, instantiate `TowerDisplay` directly — same options, same state API, no chrome:

```ts
import { TowerDisplay } from 'ultimatedarktowerdisplay';
const display = new TowerDisplay({ container });
display.applyState(state);
display.dispose();
```

For the full method/option reference see [API](API.md).

## Choosing renderers

Both `TowerRenderView` and `TowerDisplay` accept a `renderers` option. `TowerRenderView` defaults to `'3d-view'`; `TowerDisplay` defaults to `['readout', 'side-view']`. Override with the `renderers` option:

```ts
const view = new TowerRenderView({
  container,
  modelUrl: towerModelUrl,
  renderers: ['readout', '3d-view'],
});
```

Quick guide:

- **`'readout'`** — text DOM grid. Smallest, most information-dense, no animations. Pick when you need a debug panel or a compact info strip.
- **`'side-view'`** — SVG of one tower face with seal overlays. Side-aware. Pick when you want a stylized 2D view without WebGL.
- **`'3d-view'`** — Three.js model with rotating drums, animated LEDs, bloom, and configurable lighting. Pick when you want the visual centerpiece. Pulls Three.js + GSAP + a 22 MB GLB + ~20 MB of bundled audio.

For the full comparison see [RENDERERS](RENDERERS.md).

## Audio

The 3D renderer plays decoded tower-state audio (`state.audio.sample`) using a bundled sound pack of 132 official samples — no consumer setup needed. Audio is silent until you opt in from a user gesture:

```ts
button.addEventListener('click', () => {
  view.applyAudioConfig({ enabled: true });
});
```

To swap in your own samples or rebind sequence-to-sample mappings, see [AUDIO](AUDIO.md).

## Framework integration patterns

### Vanilla HTML/Vite

```ts
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';
import { createDefaultTowerState } from 'ultimatedarktower';

const container = document.querySelector<HTMLDivElement>('#tower')!;
const view = new TowerRenderView({ container, modelUrl: towerModelUrl });
view.applyState(createDefaultTowerState());

window.addEventListener('beforeunload', () => view.dispose());
```

### React

`TowerRenderView` manages its own DOM, so React only provides the container and the cleanup hook.

```tsx
import { useEffect, useRef } from 'react';
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';
import type { TowerState } from 'ultimatedarktower';

export function Tower({ state }: { state: TowerState }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<TowerRenderView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    viewRef.current = new TowerRenderView({
      container: containerRef.current,
      modelUrl: towerModelUrl,
    });
    return () => viewRef.current?.dispose();
  }, []);

  useEffect(() => {
    viewRef.current?.applyState(state);
  }, [state]);

  return <div ref={containerRef} />;
}
```

### Vue 3

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';
import type { TowerState } from 'ultimatedarktower';

const props = defineProps<{ state: TowerState }>();
const container = ref<HTMLDivElement | null>(null);
let view: TowerRenderView | null = null;

onMounted(() => {
  if (!container.value) return;
  view = new TowerRenderView({ container: container.value, modelUrl: towerModelUrl });
  view.applyState(props.state);
});

watch(
  () => props.state,
  (next) => view?.applyState(next),
);
onBeforeUnmount(() => view?.dispose());
</script>

<template>
  <div ref="container" />
</template>
```

## Connecting to a real tower (UDT integration sketch)

```ts
import { UltimateDarkTower } from 'ultimatedarktower';
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';

const view = new TowerRenderView({ container, modelUrl: towerModelUrl });
const udt = new UltimateDarkTower();

udt.onTowerStateUpdate = (state) => view.applyState(state);

document.getElementById('connect')?.addEventListener('click', async () => {
  await udt.connect();
  await udt.calibrate();
  view.updateBadge('conn', { value: 'connected', tone: 'good' });
});
```

This package never opens a BLE connection. All connection management, command sending, and packet decoding live in UDT. This package consumes the decoded `TowerState` UDT emits.

## Where state lives: `TowerStateController`

For a non-DOM source of truth — for example a Vuex/Pinia/Zustand store, or a headless test harness — `TowerStateController` is a public export that merges external state with internal user-toggle state (LED overrides, seal toggles) without rendering anything.

```ts
import { TowerStateController } from 'ultimatedarktowerdisplay';

const controller = new TowerStateController();
controller.applyState(state);
controller.applySeals([{ side: 'north', level: 'top' }]);

const resolved = controller.resolvedState;
// Pass `resolved` into any renderer.
```

See [API §TowerStateController](API.md#towerstatecontroller).

## Production checklist

Before shipping a build that bundles this package:

- **Bundler config.** Vite, Webpack 5, Rollup, and esbuild all work out of the box. Webpack 5 needs `experiments.asyncWebAssembly: true` if you import the physics subpath.
- **GLB asset.** The 3D renderer ships a 22 MB bundled `tower.glb`. Confirm your bundler copies it to the output directory, or pass `modelUrl` to point at your own copy.
- **Draco decoder path.** Defaults to gstatic CDN. If your CSP blocks external scripts, host the decoder yourself and pass `dracoDecoderPath`.
- **CSP.** If your CSP forbids inline styles, set `injectStyles: false` and apply the exported `TOWER_DISPLAY_CSS` constant yourself. See [TROUBLESHOOTING §electron-specific](TROUBLESHOOTING.md#electron-specific) for the standard Electron recipe.
- **Electron.** See [ELECTRON](ELECTRON.md) for a full BrowserWindow + BLE picker walkthrough.
- **Tree-shaking.** The physics subpath is a separate entry; importing only the main entry never pulls Rapier into your bundle.

## See also

- [ARCHITECTURE](ARCHITECTURE.md) — mental model and subsystem map.
- [RENDERERS](RENDERERS.md) — per-renderer feature comparison.
- [API](API.md) — full method/option/type reference.
- [TROUBLESHOOTING](TROUBLESHOOTING.md) — common failure modes.
- [EXAMPLE](EXAMPLE.md) — walkthrough of the interactive demo.
