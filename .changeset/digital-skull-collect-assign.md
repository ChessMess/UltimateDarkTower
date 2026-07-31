---
'ultimatedarktowerdigital': minor
---

Skulls that fall out of the tower can now be collected and placed on buildings, closing the
loop `packages/display`'s physics sim started (skulls dropping in) but nothing finished
(skulls piling up on the floor forever, uncollected).

- **Collecting**: a three-way switch on the Tower panel — **Auto** sweeps skulls off the board
  floor every 500ms, **Click** lets you click one to collect it (a click elsewhere still
  shakes/orbits as before), **Off** disables both. Collected skulls join a pending pool
  (`BoardState.meta.skullsPending`), which survives session save/export/import and a 3D
  pop-out/pop-in (collected skulls never reappear on the floor).
- **Assigning**: a banner appears whenever the pool is non-zero, offering both **Place on
  board** (arm the existing click-a-building flow, one skull per click, re-arms until the pool
  empties) and **Place all…** (a modal listing every building grouped by kingdom, with a
  per-building `+`/`−` bounded by the remaining pool, a warning on any building the assignment
  would destroy, and a manual pool `+`/`−` to correct for skulls the physics sim occasionally
  loses uncounted — an OOB despawn, or a drop refused past `skull.maxCount`).
- **A new kingdom summary panel** shows skulls-on-buildings and destroyed-building counts per
  kingdom (`ultimatedarktowerboard`'s new `skullsInKingdom`/`destroyedInKingdom` selectors).
- **Destruction is now one-way**: a building destroyed at its 4th skull returns those skulls to
  supply (the stack zeroes) instead of the old auto-restore-below-threshold behavior. The
  inspector's destroyed-building view gains an explicit **Rebuild** button as the replacement
  undo. A session saved under the old rule (a destroyed building still holding 4 skulls) is
  normalized on load.
- The destroyed-building placeholder is now the `wasteland` marker token in both 2D and 3D
  (`ultimatedarktowerboard`'s renderer change), not a red X.
