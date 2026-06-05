# Scene plugins

The **scene-plugin seam** is the documented, reusable way for an external package to inject and own 3D content inside the `Tower3DView` scene — hero pawns, foe tokens, an adversary, monuments, blight overlays, particle effects, falling glyphs — with a clean lifecycle and access to the scene, camera, renderer, model bounds, the render loop, side changes, and pointer hit-testing.

It generalizes the one-off `getPhysicsHooks()` seam. The bundled skull-physics add-on is now implemented on top of it (it dogfoods the seam), which is the proof the seam is sufficient for a real, non-trivial plugin.

This is an advanced extension point. If you only want skulls, use [PHYSICS](PHYSICS.md). If you only want to style the scene, use [LIGHTING](LIGHTING.md). Reach for scene plugins when you need to **own 3D content** in the scene from a separate package.

## Quick start

```ts
import { TowerRenderView, attachScenePlugin } from 'ultimatedarktowerdisplay';
import type { ScenePlugin, ScenePluginContext } from 'ultimatedarktowerdisplay';

const view = new TowerRenderView({ container, modelUrl });

const plugin: ScenePlugin = {
  id: 'hello-cube',
  attach(ctx: ScenePluginContext) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xff4080 }),
    );
    const { topY } = view.view3D!.getDiscMetrics();
    cube.position.set(0, topY + 0.1, 0);
    ctx.scene.add(cube);
    this._cube = cube;
  },
  dispose() {
    this._cube?.removeFromParent();
    this._cube?.geometry.dispose();
    (this._cube?.material as THREE.Material | undefined)?.dispose();
  },
} as ScenePlugin & { _cube?: THREE.Mesh };

const handle = attachScenePlugin(view.view3D!, plugin);
// …later
handle.detach();
```

`attachScenePlugin(view, plugin)` is a thin wrapper over the public `view.registerScenePlugin(plugin)`; either works. It calls `plugin.attach(ctx)` once, synchronously, and returns a `ScenePluginHandle` whose `detach()` removes the plugin and frees its subscriptions (idempotent).

> `three` is an optional peer dependency. A scene plugin necessarily uses Three.js, so your package should declare `three` (and depend on the same major version this library uses). Build your `Object3D`s with the same `three` instance the view renders with.

## The lifecycle

A `ScenePlugin` is a plain object:

```ts
interface ScenePlugin {
  readonly id: string;                                  // diagnostics / de-dup
  attach(ctx: ScenePluginContext): void;                // build your content here
  onStateApplied?(state: TowerState): void;             // after every applyState
  onSealsApplied?(brokenSeals: SealIdentifier[]): void; // when seals change
  onModelLoaded?(info: ScenePluginModelInfo): void;     // GLB loaded (or already loaded)
  update?(dtSeconds: number): void;                      // per-frame, dt in seconds
  dispose(): void;                                       // free everything you added
}
```

- **`attach(ctx)`** runs once, synchronously, when you call `attachScenePlugin`. Build your `Object3D`s and add them to `ctx.scene`. The scene/camera/renderer are live. If the model has not loaded yet, `ctx.isModelLoaded()` is `false` and the model bounds are defaults (radius 1) — defer model-dependent setup to `onModelLoaded`.
- **`onModelLoaded(info)`** fires once the GLB is in the scene with finalized bounds (`{ root, modelRadius, modelBottomY, modelTopY }`). If the model is already loaded when you attach, it fires immediately. This is the right place to size/position content against the real model.
- **`onStateApplied(state)`** fires on every `Tower3DView.applyState`, **after** the view's own update, with the same state object. React to game-state deltas (skull-count increases, broken-seal counts, …).
- **`onSealsApplied(brokenSeals)`** fires on every `applySeals`.
- **`update(dt)`** runs once per rendered frame with `dt` in seconds (the same single per-frame clock read the physics seam uses). Equivalent to `ctx.registerFrameCallback`.
- **`dispose()`** runs on `handle.detach()` and on `Tower3DView.dispose()`. Remove every `Object3D` you added and free geometries, materials, and textures.

All plugin callbacks are wrapped in try/catch by the view, so a throw in one plugin will not break the render loop or other plugins (it is logged to the console).

## The context

```ts
interface ScenePluginContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  readonly modelRadius: number;     // live; defaults to 1 before load
  readonly modelBottomY: number;    // live
  readonly modelTopY: number;       // live
  drumNode(level: 'top' | 'middle' | 'bottom'): THREE.Object3D | null;
  registerFrameCallback(cb: (dtSeconds: number) => void): () => void;
  onStateApplied(cb: (state: TowerState) => void): () => void;
  onSealsApplied(cb: (broken: SealIdentifier[]) => void): () => void;
  onModelLoaded(cb: (info: ScenePluginModelInfo) => void): () => void;
  registerPointerTarget(target: PointerTarget): () => void;
  getSide(): TowerSide;                                   // 'north' before camera ready
  onSideChange(cb: (side: TowerSide) => void): () => void;
  isModelLoaded(): boolean;
}
```

Every subscription returns an unsubscribe function, but you usually do not need to call them — subscriptions registered through `ctx` are torn down automatically when the plugin detaches. The convenience plugin methods (`onStateApplied?`, `update?`, …) and the `ctx` subscriptions are equivalent; use whichever reads better.

The `modelRadius` / `modelBottomY` / `modelTopY` getters are **live** — they reflect post-load values even if you read them after attaching pre-load.

## Positioning content on the disc

The tower renders on a circular **ground disc**. To align tokens or a board on it, read `Tower3DView.getDiscMetrics()`:

```ts
const { center, radius, topY } = view.view3D!.getDiscMetrics();
// center: disc geometric center on the Y axis (x = z = 0)
// radius: disc radius (model radius × groundDisc.radiusFactor)
// topY:   the top surface — place on-disc content at y = topY
token.position.set(center.x + dx, topY, center.z + dz);
```

`getDiscMetrics()` is derived from the model bounds + lighting config, so it is valid even before the disc mesh is lazily built. Call it inside `onModelLoaded` (or after `isModelLoaded()` is true) for finalized values.

### Placing content at board-image anchors

When content is authored as **normalized `[0,1]` coordinates on the board image** (the layout the printed board art uses), `anchorToWorld` converts an anchor straight to a disc-top world position that matches where the art is rendered — no manual trig:

```ts
import { anchorToWorld } from 'ultimatedarktowerdisplay';

// `anchor` is { x, y } in [0,1]; the result already sits at y = topY.
const pos = anchorToWorld(anchor, view.view3D!);
token.position.copy(pos);

// Fan several tokens around one slot anchor:
const base = anchorToWorld(anchor, view.view3D!);
const { radius } = view.view3D!.getDiscMetrics();
tokens.forEach((t, i) => {
  const a = (i / tokens.length) * Math.PI * 2;
  t.position.set(base.x + Math.cos(a) * radius * 0.03, base.y, base.z + Math.sin(a) * radius * 0.03);
});
```

The view overload reads the disc geometry **and** the current `boardDisc.northKingdom` for you, so tokens stay aligned with the art if the north kingdom changes. (The forthcoming board package will ship the actual `BOARD_ANCHORS`; until then a consumer supplies its own normalized anchors.)

## Board-surface hand-off

If your plugin paints the disc surface itself, stand the built-in placeholder board image down:

```ts
view.view3D!.setBoardDiscEnabled(false); // hides only the board image
```

This removes **only** the placeholder board texture from the disc's top cap. The disc **mesh** stays (toggle that separately with `setGroundDiscVisible`), and the physics floor is unaffected (skull physics rests on its own collider, not the visual disc). Pass `true` to restore the placeholder.

## Claiming pointer events

By default, pointer drags orbit the camera. To make clicking your objects select them instead of orbiting, register a `PointerTarget`:

```ts
ctx.registerPointerTarget({
  objects: () => myTokenMeshes,   // array, or a getter for dynamic sets
  priority: 10,                   // higher is tested first; outrank camera controls
  onPointerDown(hit, ev) {
    selectToken(hit.object);
    return true;                  // consume → camera does not orbit this gesture
  },
  onPointerMove(hit, ev) { /* hit is the nearest intersection or null */ },
  onPointerUp(hit, ev) { return true; },
});
```

How it works: the view intercepts pointer events in the **capture phase on the canvas's parent**, before they reach the canvas where OrbitControls listens. On `pointerdown` it raycasts the registered targets in priority order (a single shared raycaster, only against your objects — not the whole scene). The first target whose `onPointerDown` returns `true` consumes the gesture: the event is stopped, OrbitControls never starts, and `onPointerMove` / `onPointerUp` are delivered to that target for the rest of the drag. Side selection is derived from the camera azimuth (not from pointer events), so a consumed drag never produces a spurious side change.

If no target consumes the event (no hit, or every handler returns falsy), camera orbit/zoom/side-select behave exactly as before.

## Mounting UI

Use the `TowerRenderView` docking helpers for framework-agnostic DOM controls. Both return a plain `HTMLElement` you mount into; the library imposes no framework.

```ts
const view = new TowerRenderView({ container, modelUrl, overlay: true });

// HUD over the canvas — the layer ignores pointer events so empty areas still
// orbit/zoom; mounted children opt back in automatically. Good for floating panels.
view.getOverlayContainer().appendChild(buildPalette());

// Fixed editor panel that reflows the canvas without overlapping it.
view.getPanelSlot('right').appendChild(buildInspector());
```

Both are created on demand and removed on `view.dispose()`. The docking CSS ships in the exported `TOWER_DISPLAY_CSS`, so it works under `injectStyles: false` (CSP) too — apply that constant yourself.

## Teardown

Call `handle.detach()` to remove a single plugin, or `view.dispose()` to tear the whole view down (which detaches every attached plugin). `detach()` calls your `dispose()`, removes all subscriptions and pointer targets the plugin registered, and is safe to call twice. Always free geometries, materials, and textures in `dispose()` — Three.js does not garbage-collect GPU resources for you.

## Testing

The seam is contract-based, so it tests cleanly without WebGL. Assert registration, fan-out, ordering, unsubscribe, and dispose against a headless `Tower3DView` (the repo's Jest suite mocks `three`, the GLTF loader, and the raycaster). See `tests/unit/ScenePlugin.test.ts` and `tests/unit/pointerTargets.test.ts` for patterns.

## See also

- [ARCHITECTURE §scene plugins](ARCHITECTURE.md#scene-plugins-the-generalized-seam) — where the seam sits in the system.
- [API §Scene plugins](API.md#scene-plugins) — type-level reference for `ScenePlugin`, `ScenePluginContext`, `PointerTarget`, and the new methods.
- [PHYSICS](PHYSICS.md) — the precedent add-on, now built on this seam.
