---
'ultimatedarktowerdisplay': minor
---

Add `SkullPhysicsHandle.getSkullIds(zone)` and `removeSkulls(ids)` to the physics API, plus a
new `skull.onSkullClick` config leaf — the pieces needed to collect skulls off the board floor
instead of just watching them pile up.

- `getSkullIds(zone)` lists the ids of every live skull currently classified in a zone (see
  `getSkullCounts()`); `removeSkulls(ids)` despawns a batch of them (same path as the OOB
  safety net) and returns how many actually went.
- `skull.onSkullClick(id, zone)` fires on a skull click before `clickToShake` — return `true`
  to consume the click (skip the shake); shares `clickToShake`'s pointer-target registration,
  so setting either one registers it, and it's live-swappable via `applyPhysicsConfig`.
