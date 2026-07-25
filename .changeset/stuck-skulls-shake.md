---
'ultimatedarktowerdisplay': minor
---

Add manually-triggered ways to dislodge a skull stuck in the tower's interior
trimesh geometry, without touching the tower model:

- `SkullPhysicsHandle.shakeSkulls(options?)` — impulse-nudges every skull
  currently classified `inTower` (see `getSkullCounts()`), waking sleeping
  bodies. Skulls `onBoard` or `inTransit` are untouched.
- `SkullPhysicsHandle.shakeSelectedSkull(id, options?)` — impulse-nudges one
  skull by id, in any zone. `dropSkull()` now returns the new skull's stable
  id (`number | null`, widened from `void`) for this purpose.
- `skull.clickToShake` config flag — clicking a skull in the 3D view calls
  `shakeSelectedSkull` for it, via the existing pointer-target seam (no
  camera/raycaster exposed). `getSkullIdForObject(obj)` is the underlying
  lookup, also exposed on the handle for custom picking.
- `Tower3DView.shakeTower(options?)` — oscillates the drum rings; the
  existing kinematic-collider sync jostles skulls resting on/near the drums
  loose. Independent of `shakeSkulls()` (physics is a separate plugin the
  view doesn't own) — use either, both, or neither.
- Prevention-tuning config: `skull.canSleep` (default `true`) and
  `skull.additionalSolverIterations` (default `0`) reduce how often a skull
  sticks in the first place.

The example app's Physics panel gains a "Shake Skulls" button, a "Shake
Tower" button, and toggles for click-to-shake and can-sleep. See
[PHYSICS.md §Unsticking skulls](../packages/display/docs/PHYSICS.md#unsticking-skulls)
for the full picture.
