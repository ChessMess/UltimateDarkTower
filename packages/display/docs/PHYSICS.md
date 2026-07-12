# Physics for the Ultimate Dark Tower Display

_Docs: [Index](README.md) > Physics user > Physics_

**Before reading:** [GETTING_STARTED](GETTING_STARTED.md) covers install and the first `Tower3DView`. [ARCHITECTURE §where physics plugs in](ARCHITECTURE.md#where-physics-plugs-in) explains the `TowerPhysicsHooks` seam.

## Overview

This package adds physics-driven skulls inside the 3D tower view. Drop a skull into the top of the tower; it falls through the drum stack, settles on whichever closed seal is below it, and rides along as the drum rotates. Break that seal and the skull continues downward, eventually landing on the game board.

It does **not** affect game state. Skulls are purely a visual layer driven by the existing `Tower3DView` (drum positions, seal state, model bounds). The host application drops them; the firmware never sees them.

MVP scope:

- Up to `skull.maxCount` simultaneous skulls (default 30). Each `dropSkull()` adds one; the call is a no-op once the cap is reached. `clearSkulls()` removes every active skull.
- User-triggered. No state event or sequence currently spawns skulls automatically.
- No skull-impact audio yet.

## Quick start

Physics ships as an **optional subpath** of `ultimatedarktowerdisplay`.
Same package, separate entry point — consumers who don't import the
subpath never load Rapier and never pay any bundle cost for it.

```bash
npm install ultimatedarktowerdisplay @dimforge/rapier3d-compat three gsap
```

Rapier is declared as an _optional_ peer dependency: leave it out of
the install if you only want the 2D/3D display without physics.

**TypeScript users**: subpath imports require
`"moduleResolution": "bundler"` (or `"node16"` / `"nodenext"`) in your
`tsconfig.json`. Bundler runtime resolution (Vite, Rollup, Webpack,
esbuild) honors the `exports` field regardless.

Minimal wiring:

```ts
import { Tower3DView } from 'ultimatedarktowerdisplay';
import { attachSkullPhysics } from 'ultimatedarktowerdisplay/physics';

const view = new Tower3DView(container, { modelUrl });
const physics = attachSkullPhysics(view);

document.getElementById('drop-skull')!.addEventListener('click', () => {
  physics.dropSkull();
});

// later
physics.dispose();
```

`attachSkullPhysics` returns synchronously. Rapier's WASM loads in the background; any `dropSkull()` calls made before init resolves are queued and replayed once it does.

Pass a partial `PhysicsConfig` to override any subset of the defaults:

```ts
const physics = attachSkullPhysics(view, {
  skull: { radiusFactor: 0.03, restitution: 0.1 },
  drum: { friction: 0.2 },
  debug: { sealColliders: true },
});
```

## How it works

### Parallel-collider model

The GLB tower model remains the visual source of truth, while Rapier owns a separate collider world. The package does **not** rely on render-mesh collision directly; instead, it builds Rapier colliders from mesh geometry (trimeshes) and synchronizes kinematic bodies to visual node transforms each frame.

Current collider layout:

- **Kinematic drum trimeshes**: one collider per drum mesh (`drum_top`, `drum_middle`, `drum_bottom`).
- **Kinematic seal trimeshes**: one collider per seal mesh (`seal_<side>_<level>`), enabled/disabled from seal state.
- **Fixed static GLB trimeshes**: all other tower meshes become fixed colliders.
- **Board floor**: a fixed **cylinder** collider below the tower, independent of visual board visibility (radius defaults to `3 × modelRadius`, matching the visual disc).
- **Board-edge lip**: a fixed trimesh ring around the board perimeter to keep skulls from rolling off.
- **Out-of-bounds fallback**: if a skull drops below a depth threshold, it is despawned as a safety net.

### Driving kinematic colliders from visual transforms

Each frame, the manager reads world transforms from visual drum and seal nodes and writes those poses into Rapier kinematic bodies via `setNextKinematicTranslation` and `setNextKinematicRotation`.

Rapier infers kinematic velocity from successive poses, so rotating drums naturally carry resting skulls through contact friction.

### Seal state ↔ collider state

`Tower3DView.applySeals(brokenSeals)` fires `SealManager.onSealsApplied(broken)` after visual updates. The physics manager subscribes and toggles the corresponding seal collider via `collider.setEnabled(!isBroken)`.

If a skull is resting on a seal when that seal breaks, the collider is disabled in that frame and the skull falls. Restoring the seal re-enables the collider.

### Skull body

The skull is a Rapier dynamic rigid body with:

- A sphere collider by default (radius = `skull.radiusFactor × modelRadius`), or a convex hull derived from `skull.modelUrl` when `skull.colliderShape === 'hull'`.
- **CCD enabled** to reduce tunneling during fast motion.
- Tunable friction/restitution (hull dynamics may need separate tuning).
- Tunable angular/linear damping.

The **visual** mesh is a Three.js sphere by default, or a clone of the `skull.modelUrl` template, or whatever `skull.meshFactory` returns. Visual mesh and physics collider are independent — see the [Skull Appearance](#skull-appearance) cheatsheet below.

Each frame after `world.step()` the mesh position and quaternion are copied from the body.

### Skull Appearance

| Visual            | Collider      | How                                                      |
| ----------------- | ------------- | -------------------------------------------------------- |
| Default sphere    | Ball          | (default — no extra config)                              |
| GLB model         | Ball          | `skull: { modelUrl: '/foo.glb' }`                        |
| GLB model         | Convex hull   | `skull: { modelUrl: '/foo.glb', colliderShape: 'hull' }` |
| Custom `Object3D` | Ball (forced) | `skull: { meshFactory: (r) => myObj }`                   |

`meshFactory` overrides `modelUrl` when both are set. Hull collider requires `modelUrl` — falls back to ball with a console warn otherwise.

### Authoring skull models

The library accepts any Draco-compressed `.glb` via `skull.modelUrl`. The example app discovers files in [`src/3d/assets/`](../src/3d/assets/) matching `skull_*.glb` and populates its dropdown from that glob — drop a new file in, restart the dev server, and it shows up.

**Blender export workflow (recommended):**

1. **File → Import → STL** — pick your source mesh.
2. _(Optional but recommended for high-poly STLs.)_ Add a **Decimate** modifier in the Properties panel → set Ratio between `0.05` and `0.10` → **Apply**. Target ~5–10k triangles for crisp visuals at typical skull sizes.
3. **Edit Mode → A → Mesh → Normals → Recalculate Outside** to fix any flipped triangles.
4. **Object Mode → File → Export → glTF 2.0 (.glb)**.
5. In the export sidebar:
   - **Format**: `glTF Binary (.glb)`
   - **Geometry → Compression**: enable Draco. Compression level `6`, position `14`, normal `10`, generic `12` (Blender defaults).
   - **Transform**: leave at defaults (`+Y up`).
6. Save as `src/3d/assets/skull_<name>.glb` (e.g. `skull_1.glb`).

Expected size: 200 KB – 1 MB for a 5–10k-tri mesh with Draco. The library decodes Draco using the same gstatic decoder URL as the tower model (override via the host's `dracoDecoderPath` if you self-host).

**Hull-point cloud:** automatic — the library samples up to 300 stride-spaced positions from the loaded mesh and feeds them to Rapier's convex-hull builder. No sidecar files needed.

### State-driven triggers

The physics manager subscribes to `TowerPhysicsHooks.onStateApplied`, which fires after every `applyState` on the host `Tower3DView`. When `skull.autoDropOnSkullCountIncrease` is enabled, an increase in `state.beam.count` between two consecutive calls triggers exactly one `dropSkull()` (mirroring the readout's "💀 Skull Drop!" highlight).

The subscription is permanent regardless of the flag; toggling is live and doesn't reset the previous count, so a stale delta won't trigger a spurious drop after re-enabling.

### Where physics runs in the render loop

```
controls.update()
cameraController.tickDerivedSide()
→ physicsFrameListeners(dt)   // ← physics step + kinematic collider sync + skull mesh sync
sceneLighting.tick()
renderer.render(scene, camera)
```

Physics runs **before** lighting and render, so any mesh transforms it writes are reflected the same frame.

## API reference

### `attachSkullPhysics(view, config?)`

```ts
function attachSkullPhysics(view: Tower3DView, config?: PhysicsConfig): SkullPhysicsHandle;
```

Attaches the physics manager to a `Tower3DView`. Returns immediately. Rapier WASM initialization runs in the background; `dropSkull()` calls made before init completes are queued.

### `PhysicsConfig`

A deeply-nested partial. Every field is optional; missing leaves fall back to `DEFAULT_PHYSICS`. Grouped by domain:

| Path                                 | Type                      | Default     | Lifecycle         | Notes                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | ------------------------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `debug.colliders`                    | `boolean`                 | `false`     | Attach time       | `THREE.LineSegments` overlay of every Rapier collider.                                                                                                                                                                                                                                                                                           |
| `debug.sealColliders`                | `boolean`                 | `false`     | Live              | Seal-only wireframes (green=intact, red=broken).                                                                                                                                                                                                                                                                                                 |
| `skull.radiusFactor`                 | `number`                  | `0.025`     | Next drop         | Skull radius as a fraction of `modelRadius`.                                                                                                                                                                                                                                                                                                     |
| `skull.friction`                     | `number`                  | `0.8`       | Next drop         | Friction on the skull collider.                                                                                                                                                                                                                                                                                                                  |
| `skull.restitution`                  | `number`                  | `0.2`       | Next drop         | Bounciness of the skull body. `0` = stick, `1` = perfect bounce.                                                                                                                                                                                                                                                                                 |
| `skull.angularDamping`               | `number`                  | `1.0`       | Live              | Exponential decay on angular velocity (rolling resistance proxy).                                                                                                                                                                                                                                                                                |
| `skull.linearDamping`                | `number`                  | `0.0`       | Live              | Exponential decay on linear velocity. Use sparingly.                                                                                                                                                                                                                                                                                             |
| `skull.maxCount`                     | `number`                  | `30`        | Live              | Maximum simultaneous skulls. Drops past the cap are no-ops; lowering this does not remove existing skulls.                                                                                                                                                                                                                                       |
| `skull.modelUrl`                     | `string`                  | `undefined` | Next drop (async) | URL to a Draco-compressed `.glb` used as the visual mesh. `.stl` is accepted with a warn (heavier, slower); export to Draco GLB from Blender for production. Library caches loaded templates module-globally — repeated attach/detach cycles never re-fetch. See [Authoring skull models](#authoring-skull-models) for the recommended workflow. |
| `skull.colliderShape`                | `'sphere' \| 'hull'`      | `'sphere'`  | Next drop         | Collider shape. `'hull'` derives a convex hull from `modelUrl`'s point cloud; falls back to sphere when `modelUrl` is unset or the hull is degenerate. May need re-tuning of friction/restitution.                                                                                                                                               |
| `skull.meshFactory`                  | `(r: number) => Object3D` | `undefined` | Next drop         | Per-spawn visual override. Forces `colliderShape` to `'sphere'`. The consumer owns asset lifecycle — the manager only calls `removeFromParent()` on despawn. Not JSON-serializable (function).                                                                                                                                                   |
| `skull.density`                      | `number`                  | `undefined` | Next drop         | Density override. Only meaningful for hull colliders, where the template carries an auto-computed density that normalizes hull mass to the equivalent sphere.                                                                                                                                                                                    |
| `skull.autoDropOnSkullCountIncrease` | `boolean`                 | `false`     | Live              | When true, auto-calls `dropSkull()` each time `state.beam.count` increases between consecutive `applyState` calls. Mirrors the readout's "💀 Skull Drop!" highlight. Honors `skull.maxCount` like manual drops.                                                                                                                                  |
| `drum.innerRadiusFactor`             | `number`                  | `0.30`      | World rebuild     | Used for drop-jitter heuristics and (future) parametric drum walls.                                                                                                                                                                                                                                                                              |
| `drum.halfHeightFactor`              | `number`                  | `0.15`      | Unused            | Reserved for future parametric drum walls; currently feeds only the discarded drum-wall spec and has no runtime effect.                                                                                                                                                                                                                          |
| `drum.friction`                      | `number`                  | `0.15`      | Live              | Friction on kinematic drum trimeshes (Min combine rule).                                                                                                                                                                                                                                                                                         |
| `seal.friction`                      | `number`                  | `0.05`      | Live              | Friction on kinematic seal trimeshes (Min combine rule).                                                                                                                                                                                                                                                                                         |
| `static.friction`                    | `number`                  | `0.1`       | Live              | Friction on every static GLB trimesh (Min combine rule).                                                                                                                                                                                                                                                                                         |
| `board.radiusFactor`                 | `number`                  | `3.0`       | Live              | Board cylinder radius as a fraction of `modelRadius`.                                                                                                                                                                                                                                                                                            |
| `board.thicknessFactor`              | `number`                  | `0.3`       | World rebuild     | Board cylinder thickness as a fraction of `modelRadius`.                                                                                                                                                                                                                                                                                         |
| `board.friction`                     | `number`                  | `0.5`       | Live              | Friction on the game-board floor + lip (Average combine rule).                                                                                                                                                                                                                                                                                   |
| `oob.depthFactor`                    | `number`                  | `5.0`       | Live              | Out-of-bounds despawn distance below `modelBottomY`, read every frame.                                                                                                                                                                                                                                                                           |

**Lifecycle semantics:**

- **Live** — `applyPhysicsConfig` updates the running world immediately.
- **Next drop** — stored in config now, applied to the skull body on the next `dropSkull()`.
- **World rebuild** — only honored at `attachSkullPhysics` time (or after `dispose` + re-attach). Silently ignored otherwise.

### `SkullPhysicsHandle`

```ts
interface SkullPhysicsHandle {
  dropSkull(): void;
  clearSkulls(): void;
  getPhysicsConfig(): ResolvedPhysicsConfig;
  applyPhysicsConfig(partial: PhysicsConfig): void;
  dispose(): void;
}
```

- `dropSkull()` — Add one skull just above `modelTopY`. No-op once `skull.maxCount` simultaneous skulls are live; calls made before init resolves are queued and replayed once it does.
- `clearSkulls()` — Remove every active skull immediately and cancel any queued drops. Safe to call before init resolves.
- `getPhysicsConfig()` — Deep-cloned snapshot of the fully-resolved config. Safe to mutate.
- `applyPhysicsConfig(partial)` — Merge a partial config on top of the current one. See lifecycle semantics above.
- `dispose()` — Tear down the Rapier world, remove every skull, and unsubscribe from frame and seal-state callbacks. Safe to call multiple times.

### `DEFAULT_PHYSICS` and `resolvePhysics`

```ts
import { DEFAULT_PHYSICS, resolvePhysics } from 'ultimatedarktowerdisplay/physics';

const cfg = resolvePhysics({ drum: { friction: 0.4 } });
// cfg.drum.friction === 0.4; every other leaf comes from DEFAULT_PHYSICS.
```

Useful for building editors that need to read every default leaf, or for serializing the full config to disk.

### Default JSON blob

Copy-paste into an editor (or the example app's "Physics" config tab) to see every leaf:

```json
{
  "debug": { "colliders": false, "sealColliders": false },
  "skull": {
    "radiusFactor": 0.025,
    "friction": 0.8,
    "restitution": 0.2,
    "angularDamping": 1.0,
    "linearDamping": 0.0,
    "maxCount": 30,
    "modelUrl": null,
    "colliderShape": "sphere",
    "density": null,
    "autoDropOnSkullCountIncrease": false
  },
  "drum": { "innerRadiusFactor": 0.3, "halfHeightFactor": 0.15, "friction": 0.15 },
  "seal": { "friction": 0.05 },
  "static": { "friction": 0.1 },
  "board": { "radiusFactor": 3.0, "thicknessFactor": 0.3, "friction": 0.5 },
  "oob": { "depthFactor": 5.0 }
}
```

## Tuning guide

Turn on `debug.sealColliders` (seal-only) or `debug.colliders` (world) and inspect the wireframes against the visual model.

| Symptom                                                            | Try                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skulls slip off the drum during rotation.                          | Raise `drum.friction` (and, if needed, `skull.friction` on next drop).                                                                                       |
| Skulls bounce wildly after landing.                                | Lower `skull.restitution` (try `0.05`).                                                                                                                      |
| Seal collider debug is hard to inspect.                            | Use `debug.sealColliders` for seal-only wireframes; `debug.colliders` shows the full world.                                                                  |
| Skull is comically large or small.                                 | Adjust `skull.radiusFactor`.                                                                                                                                 |
| Skull tunnels through closed geometry at high rotation speed.      | Verify CCD is still enabled, and avoid teleport-style drum updates where possible.                                                                           |
| Skull falls off the visual board edge.                             | Increase `board.radiusFactor`; floor and lip are intentionally decoupled from board visibility.                                                              |
| Skull rolls for too long after landing.                            | Increase `skull.angularDamping` (and optionally `skull.linearDamping`).                                                                                      |
| Hull-collider skulls feel floaty or settle wrong.                  | Set `skull.density` explicitly (default heuristic normalizes to sphere-equivalent mass; precise tuning needs your hull's true volume).                       |
| Switching to a GLB model wedged a skull in the geometry.           | Set `colliderShape: 'sphere'` for the affected model — visual stays, physics reverts to the proven sphere tuning.                                            |
| Auto-drop triggers on every state apply, not just count increases. | Verify `state.beam.count` is actually increasing — the delta-check uses strict `>`. Snapshot-replay tools that re-feed identical states won't trigger drops. |

## Limitations (MVP)

- **No skull-impact audio.** A future version could feed contact events into the existing `TowerSampleAudio` for clatter sounds.
- **Re-enabling a seal mid-fall can cause penetration.** If you break a seal under a resting skull, then restore the seal before the skull falls clear, the collider may re-enable inside the skull's volume. Rapier resolves this with a snap-out, which can look jumpy.
- **Snap-mode drum updates can fling skulls.** `Tower3DView.applyDrums(state, { animate: false })` writes a teleport into `rotation.y`. The kinematic body infers a single-frame angular velocity from that teleport, which can launch resting skulls. The MVP doesn't filter snap pulses.
- **Gravity is unitless.** Set to `-9.81 × modelRadius` so it feels right at the model's scale. Not adjustable in MVP.
- **`debug.colliders` is attach-time only.** Toggling it on after attach requires a full re-attach (`dispose` + `attachSkullPhysics`); the host application is responsible for that flow.
- **Hull dynamics need re-tuning.** The bundled friction/restitution defaults are tuned for sphere skulls. Convex-hull skulls roll differently — expect to revisit `drum.friction`, `skull.restitution`, and `skull.density` per model.
- **`meshFactory` is not JSON-serializable.** Functions are silently dropped by `JSON.stringify`, so they never appear in the example app's JSON-paste flow. Set programmatically only.
- **Auto-drop uses `>` not `>=`.** A `beam.count` that ticks back down then up to the same value triggers a drop only on the second up-tick. Designed-as-intended (matches the readout highlight).

## Roadmap

Non-goals for this MVP, in rough order of value:

1. **Impact audio** — short clatter samples on collider-vs-skull contacts.
2. **State-event triggers** — wire `dropSkull()` to specific game-state transitions if the host wants automatic skulls.
3. **Snap-mode filtering** — detect teleport-style drum updates and momentarily decouple kinematic colliders so resting skulls don't get flung.
4. **More state-driven triggers** — `autoDropOnSkullCountIncrease` is the first; future versions could expose `autoDropOnBrokenSeal`, `autoSpinDrumsOnPing`, etc., all sharing the `onStateApplied` subscription.
5. **Consumer-overridable `dracoDecoderPath`** — `attachSkullPhysics` currently uses the same gstatic CDN as the tower. A `skull.dracoDecoderPath` config leaf would let self-hosted setups point at their own copy.

## Verification reference

The must-pass manual cases for any change in this area:

1. Skull dropped onto a closed seal collider settles in place.
2. Rotating that drum 90° carries the skull along with the rotating collider geometry.
3. Breaking the seal underneath drops the skull to the next level.
4. Breaking every seal in a vertical column drops the skull cleanly out the bottom onto the game board.
5. Test (4) with the visual board disc hidden via the lighting config — behavior must be identical (proves the physics floor is decoupled from the visual disc).
6. Spinning drums via a state sequence with a skull inside — no tunneling.
7. Calling `handle.dispose()` removes the debug overlay and unsubscribes all listeners.

## See also

- [API §TowerPhysicsHooks](API.md#towerphysicshooks) — the seam this subpath uses to attach to `Tower3DView`.
- [ARCHITECTURE §where physics plugs in](ARCHITECTURE.md#where-physics-plugs-in) — how physics integrates with the render loop.
- [EXAMPLE §panel-physics](EXAMPLE.md#panel-physics) — the demo's live physics tuner.
- [TROUBLESHOOTING §rapier-wasm-not-loading](TROUBLESHOOTING.md#rapier-wasm-not-loading) — bundler config for the subpath.
