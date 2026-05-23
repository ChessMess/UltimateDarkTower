# Plan: 3D Light Source Markers

Use the existing `debug3D` recreation path to add small debug-only sphere markers at every 3D light position. Implement this in the scene-building code inside the 3D view so marker creation, visibility, and teardown stay co-located with the point lights they represent, while leaving lighting resolution and runtime effect logic unchanged unless a ref-shape adjustment becomes necessary.

## Steps

1. Confirm the implementation anchor in `src/3d/Tower3DView.ts`: extend `buildLeds()` where both amber proxy meshes and red `PointLight` instances are created so debug markers are positioned from the same `computeLedPosition()` and `computeRedLightPosition()` calls. This step blocks all later coding.

2. Add a debug-only marker strategy in `src/3d/Tower3DView.ts`: when `debug3D` is true, create 48 small sphere meshes (24 amber-position + 24 red-position) using `MeshBasicMaterial` (unlit, always visible regardless of scene lighting). Use two distinct colors so both sets are readable. Use one shared `SphereGeometry` instance and two shared material instances to minimise allocations. Add all markers as children of `this.model`. Show all 48 markers regardless of whether `showLedProxies` is also enabled; the markers and proxy spheres serve different purposes and coexist cleanly.

3. Decide ownership of marker meshes in the same file: keep a dedicated `private debugMarkerDisposables: { geom: THREE.SphereGeometry; amberMat: THREE.MeshBasicMaterial; redMat: THREE.MeshBasicMaterial } | null = null` field on `Tower3DView`. This avoids changing `LedRef` or `LedEffectAnimator`. This can run directly after step 2.

4. Extend disposal in `src/3d/Tower3DView.ts`: `disposeObject(this.model)` (in `src/3d/utils.ts`) already traverses and disposes all mesh geometry and materials recursively, so no extra removal loop is needed. The only disposal task is nulling out the `debugMarkerDisposables` field and calling `.dispose()` on the shared instances once (before or after `disposeObject(this.model)` — after is fine since the field is a separate reference). This depends on steps 2–3.

5. Review `src/3d/LedEffectAnimator.ts` only if marker ownership is pushed into `LedRef`; otherwise leave animator logic untouched because the request is about static debug placement rather than animated light behavior. This is conditional on step 3.

6. Validate via targeted unit coverage or small test updates around `Tower3DView` test helpers, especially the existing `__testables` accessors in `src/3d/Tower3DView.ts`. Add or extend tests to assert that `debug3D` creates marker objects and non-debug mode does not. Expose a `getDebugMarkerCount` accessor on `__testables` following the `getSealNodeCount` pattern rather than exposing raw scene internals. This depends on steps 2–4.

7. Run focused verification for the touched slice: narrow Jest coverage for `Tower3DView`, then a quick manual example check in the demo toolbar with `Debug` enabled and `LED Proxies` both on and off to verify marker readability and cleanup. This depends on step 6.

## Relevant Files

- `src/3d/Tower3DView.ts` — owns `Tower3DViewOptions`, scene initialization, `buildLeds()`, `dispose()`, and `__testables`; this is the primary implementation and cleanup surface.
- `src/3d/LedEffectAnimator.ts` — only relevant if marker ownership is folded into `LedRef`; otherwise should remain unchanged.
- `tests/unit/Tower3DView.test.ts` — add or extend assertions around debug marker creation and teardown.
- `example/rendererController.ts` — reference only; confirms `debug3D` already rebuilds the display from the existing checkbox, so no new wiring is required.
- `example/index.html` — reference only; existing `chk-debug3d` checkbox is the intended trigger.

## Verification

1. Run the narrow Jest test file covering the 3D view, preferably the `Tower3DView` unit suite only.
2. Manually open the example UI, enable `Debug`, and confirm small marker spheres appear at both amber and red light positions without requiring the separate `LED Proxies` checkbox.
3. Toggle `Debug` off and recreate the view to confirm marker spheres disappear and no stale debug geometry remains.
4. Repeat with `LED Proxies` enabled to ensure the new debug markers coexist cleanly with the existing amber proxy spheres and axes helpers.

## Decisions

- **Included scope:** marker spheres appear when the existing `Debug` checkbox is enabled, covering all 48 light-source positions (24 amber + 24 red).
- **Excluded scope:** no new toolbar checkbox, no changes to `LightingResolver`, no animation changes unless a minimal ref-shape update becomes necessary.
- **Marker material:** `MeshBasicMaterial` (unlit) — not `MeshStandardMaterial` — so markers are always full-color visible regardless of scene lighting.
- **Overlap behaviour:** both `debug3D` and `showLedProxies` can be on simultaneously; amber markers coexist alongside existing animated LED proxy spheres.
- **Scene-level lights excluded:** `HemisphereLight`, `DirectionalLight`, `RectAreaLight` (in `SceneLighting`) are directional/camera-parented and have no meaningful fixed world-space position — they are out of scope.

## Further Considerations

1. Marker appearance: use a very small radius relative to `modelRadius` so markers remain legible without overwhelming the scene; use distinct colors (e.g. orange/amber for amber-position, red for red-position).
2. Test shape: extend `__testables` with `getDebugMarkerCount` rather than exposing raw scene internals broadly.
3. UI behavior: because `debug3D` already triggers full view recreation, prefer build-time marker creation (inside `buildLeds()`) over any runtime toggling logic.
