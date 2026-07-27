---
'ultimatedarktowerdisplay': minor
---

Add `seal.shakeSkullsOnSealRemoval` to `PhysicsConfig` — when a seal breaks,
wait `seal.shakeSkullsOnSealRemovalDelaySeconds` (default `0.25`) so gravity
gets a chance to clear the opening on its own, then impulse-nudge whichever of
the skulls `getSkullsBySeal()` reports were behind that seal are still there.
A skull that already fell during the wait is left alone; one still wedged
behind the now-open doorway gets a nudge.

- Default `true` (`mode: 'nearest'`, ambient `skull.shakeStrength`). Set to
  `false` to disable.
- Object form overrides `mode` (`'nearest'` — only that seal's skulls, the
  default; or `'all'` — every `inTower` skull, same as `shakeSkulls()`) and/or
  `shake.strength` (falls back to the live `skull.shakeStrength` when the
  delay elapses).
- `shakeSkullsOnSealRemovalDelaySeconds` is its own sibling config leaf
  (default `0.25`), not nested inside the object form, so it has a real
  default in `DEFAULT_PHYSICS` and shows up in `getPhysicsConfig()` like every
  other tunable.
- Both live via `applyPhysicsConfig`. The delay is measured in simulation time
  (the same per-frame `dt` the physics step runs on), not a wall-clock timer.

The example app's Physics panel gains a "Shake skulls when seal removed"
checkbox, checked by default, and a "Seal-break delay" slider for
`shakeSkullsOnSealRemovalDelaySeconds`. See
[PHYSICS.md §Auto-shake on seal removal](../packages/display/docs/PHYSICS.md#auto-shake-on-seal-removal-sealshakeskullsonsealremoval).
