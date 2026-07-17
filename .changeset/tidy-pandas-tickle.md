---
'ultimatedarktower': minor
---

Fix `rotateDrumStateful` glyph desync, and export the light and drum mappings consumers were
copying.

- **Fix:** `rotateDrumStateful` now updates glyph positions, as `Rotate`, `rotateWithState` and
  `randomRotateLevels` already did — it was the only rotate method that didn't. Callers rotating a
  single drum (e.g. an MCP `tower_rotate_drum` tool) then read stale positions from
  `getGlyphPosition` / `getAllGlyphPositions`, while the same rotation through `rotateWithState`
  tracked correctly.
- **Fix:** `rotateDrumStateful` now throws `RangeError` on an out-of-range `drumIndex` or
  `position` instead of sending a command to the tower and silently skipping glyph tracking.
- Exports `TOWER_SIDES` and `TOWER_LEVELS` — the name↔index correspondence the drum APIs run on.
  `rotateWithState` takes side names while `rotateDrumStateful` and `TowerState.drum[n].position`
  take indices into these arrays, a mapping previously documented only in a JSDoc comment, leaving
  consumers to hardcode their own copy.
- Exports `getTowerLayerForLevel`, `getLightIndexForSide`, `mapSideToCorner`,
  `getLedgeLightIndexForSide` and `getBaseLightIndexForSide` from a new `udtLightMapping` module.
  These were private methods, so consumers driving light UIs had to duplicate them to build a
  `Lights` payload.

Additive and back-compatible: no existing signature changed. The `RangeError` is the one behaviour
change, and it replaces a call that could not have worked (an out-of-range index produced an
undefined position).
