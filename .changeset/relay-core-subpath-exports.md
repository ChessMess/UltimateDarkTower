---
'ultimatedarktowerrelay-core': minor
---

Add a package `exports` map with first-class, bleno-free subpaths.

`./logAnalysis` and `./eventLog` are now real subpath exports, so log-reading tools (the relay CLI's `analyze`/`replay`) can import the pure helpers without pulling in the barrel — which re-exports `TowerEmulator` and would initialize `@stoprocent/bleno`. Previously this relied on a reach-through into `dist/` that only worked because the package had no `exports` field.

Note: defining `exports` means only `.`, `./logAnalysis`, and `./eventLog` are importable — deep `ultimatedarktowerrelay-core/dist/*` paths are no longer part of the public surface. Import the barrel (`ultimatedarktowerrelay-core`) or one of the named subpaths instead.
