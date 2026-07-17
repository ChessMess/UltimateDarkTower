---
'ultimatedarktowerrelay-core': minor
---

Depend on `ultimatedarktowerdata` directly for `TOWER_LIGHT_SEQUENCES` and `TOWER_AUDIO_LIBRARY`,
used by `logAnalysis`'s reverse-name lookups. These moved out of `ultimatedarktower` in its v6.0.0.

This makes `logAnalysis`'s "Bluetooth-free" design (documented in its own header) literally true at
the package level, not just true by tree-shaking — `ultimatedarktowerdata` has zero dependencies
and no Bluetooth, where `ultimatedarktower` (still a dependency of this package for its other
modules) is not importable without pulling in the BLE stack's package graph.
