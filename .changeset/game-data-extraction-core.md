---
'ultimatedarktower': major
---

Move all Return to Dark Tower reference data — board locations, foes, heroes, monuments, box
inventory, seed encode/decode, and the glyph/light-sequence/audio-library name catalogs — out of
this package into the new `ultimatedarktowerdata` package.

**Why:** this library is a Bluetooth driver. The reference data was never read by the BLE path, but
because it could only be reached through the driver's single export, every consumer of it —
including browser apps that only wanted a list of board locations — had to load the Node-only
`@stoprocent/noble` BLE stack. Splitting it out drops ~31% of this package's published bundle and
lets non-Bluetooth consumers (Board, content tools) depend on the data without the driver.

**Breaking changes:**

- `data` and `seed` (the grouped namespace exports introduced in v5) are removed. Import the same
  data from `ultimatedarktowerdata` instead — flat, not namespaced (e.g.
  `import { BOARD_LOCATIONS, decodeSeed } from 'ultimatedarktowerdata'`).
- `GLYPHS`, `TOWER_LIGHT_SEQUENCES`, `TOWER_AUDIO_LIBRARY`, and the `Glyphs` / `SoundCategory` /
  `AudioLibrary` types are removed from this package's exports. Import them from
  `ultimatedarktowerdata` instead (same names).
- In `TOWER_AUDIO_LIBRARY`, the adversary previously keyed `IsatheHollow` (and its spawn cue
  `IsatheHollowSpawn`) is renamed `IsatheExile` / `IsatheExileSpawn`, and the foe keyed `Strigas` is
  renamed `Striga`. Both were spelling errors with no firmware basis — the tower's own audio assets
  are named `Adversary_Isa_01.ogg` and `Foe_Striga_01.ogg`. Byte values are unchanged; only the key
  names and display labels are corrected.

Everything else — the BLE driver, connection lifecycle, commands, state tracking, diagnostics — is
unchanged. This package now depends on `ultimatedarktowerdata` for the three lookup tables it reads
internally.
