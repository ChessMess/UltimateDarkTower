---
'ultimatedarktowerdisplay': minor
---

Change the physics shake impulse (`shakeSkulls()` / `shakeSelectedSkull()`) so
its horizontal push always points radially outward, away from the tower's
central axis through the skull's current position, instead of a random
direction — a shake now nudges a stuck skull toward the nearest opening
rather than an arbitrary one.

The direction/lift split is centralized in two new `PhysicsConfig` leaves so
every shake call site (`shakeSkulls()`, `shakeSelectedSkull()`, and the demo's
Shake Stuck Skulls button, which is built on `shakeSelectedSkull()`) shares one
tunable definition instead of a hardcoded constant:

- `skull.shakeHorizontalFactor` (default `0.5`) — outward-push fraction.
- `skull.shakeUpwardFactor` (default `0.45`) — upward-lift fraction, kept
  below `shakeHorizontalFactor` so the outward push dominates the lift.

Both are Live via `applyPhysicsConfig`. The example app's Physics panel gains
sliders for both ("Shake horiz." / "Shake up"), alongside the existing shake
strength slider. See
[PHYSICS.md §Unsticking skulls](../packages/display/docs/PHYSICS.md#unsticking-skulls).
