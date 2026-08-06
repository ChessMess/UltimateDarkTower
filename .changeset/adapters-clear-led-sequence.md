---
'@udtc/adapters': patch
---

Fix: `createDisplayAdapter` no longer re-fires a light sequence on every subsequent op.

`light.named` stamped `current.led_sequence = numId` onto the adapter's long-lived
`TowerState` and never cleared it — unlike `current.audio`, which was already reset in
both places. Since `packFullState()` packs byte 18 into every snapshot pushed to the
relay, the **physical tower** re-ran the light sequence on each later drum rotation,
sound, or seal op in the same program.

`led_sequence` is now cleared alongside `current.audio`, at the `wait` boundary and at
the end of `program()`.
