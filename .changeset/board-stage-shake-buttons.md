---
'ultimatedarktowerboard': minor
---

`BoardStageView` gains an opt-in `shakeButtons` toolbar option (default off, matching
`towerToggle`'s convention): "Shake Skulls" and "Shake Tower" buttons next to Pop Out / Tower
3D. Both are disabled until the 3D tower is enabled; "Shake Skulls" additionally needs a
`SkullPhysicsHandle` handed in via the new `setSkullPhysicsHandle(handle | null)` method, since
`packages/board` doesn't attach skull physics itself — the host app does, and now hands the
stage a reference so its own toolbar button can trigger it.

Also: Tower 3D / Shake Skulls / Shake Tower / Swap / Pop Out now share the mode-switcher
pills' visual style (gold border, panel-fill background, gradient fill when active) instead of
the plain bordered "action" look, so the whole toolbar reads as one consistent style.
