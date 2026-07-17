---
'ultimatedarktowerboard': minor
---

Depend on `ultimatedarktowerdata` directly instead of `ultimatedarktower`, for the board/hero/foe
reference data this package re-exports. `ultimatedarktower` (the BLE driver) no longer ships that
data as of its v6.0.0, and this package never needed the driver for anything else — so the
`ultimatedarktower` peer dependency is dropped entirely.

No API change: `BOARD_LOCATIONS`, `BOARD_ANCHORS`, `BOARD_ADJACENCY`, `HEROES`, `MONUMENTS`,
`FOE_STATUSES`, and the rest of the re-exported surface are unchanged, just sourced from the new
package. `FoeStatus`'s progression values are unchanged.
