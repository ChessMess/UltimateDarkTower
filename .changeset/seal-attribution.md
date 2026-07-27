---
'ultimatedarktowerdisplay': minor
---

Add `SkullPhysicsHandle.getSkullsBySeal()` to the physics API — a breakdown of
in-tower skulls by which of the 12 seal openings each is resting behind, plus
an `unattributed` bucket for skulls not near any opening (funnel, central
axis). Answers two things `getSkullCounts()` couldn't: how many skulls a
still-intact seal is holding back, and whether a skull is stuck in a doorway
that's already broken and should have let it fall through.

- Uses the model's authored `pocket_<side>_<level>` volumes for exact
  attribution when all 12 are present (`mode: 'pocket'`); otherwise falls back
  to nearest-seal-anchor attribution within the new `seal.attributionRadiusFactor`
  config leaf (`mode: 'nearest'`, default `0.25`). See
  [POCKET_AUTHORING.md](../packages/display/docs/POCKET_AUTHORING.md) for
  adding the pocket volumes to a custom model.
- Each bucket carries the resting skulls' stable ids, so `shakeSelectedSkull`
  can target exactly them. `shakeSelectedSkull` is widened from `id: number`
  to `id: number | number[]` to accept a whole bucket at once — existing
  single-id calls are unaffected.
- The example app's Physics panel gains a "Behind seals" readout and a
  "Shake Stuck Skulls" button (unlike "Shake Skulls", it only nudges skulls
  behind an already-broken seal or unattributed ones, leaving skulls behind
  intact seals untouched).

See [PHYSICS.md §Counting skulls by seal](../packages/display/docs/PHYSICS.md#counting-skulls-by-seal)
for the full picture.
