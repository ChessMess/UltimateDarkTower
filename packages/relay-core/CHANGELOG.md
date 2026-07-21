# ultimatedarktowerrelay-core

## 1.1.0

### Minor Changes

- 2964044: Add a package `exports` map with first-class, bleno-free subpaths.

  `./logAnalysis` and `./eventLog` are now real subpath exports, so log-reading tools (the relay CLI's `analyze`/`replay`) can import the pure helpers without pulling in the barrel — which re-exports `TowerEmulator` and would initialize `@stoprocent/bleno`. Previously this relied on a reach-through into `dist/` that only worked because the package had no `exports` field.

  Note: defining `exports` means only `.`, `./logAnalysis`, and `./eventLog` are importable — deep `ultimatedarktowerrelay-core/dist/*` paths are no longer part of the public surface. Import the barrel (`ultimatedarktowerrelay-core`) or one of the named subpaths instead.

## 1.0.0

### Major Changes

- cdf7f37: Raise the declared Node floor to `>=22.13.0`.

  These packages previously declared `engines.node: ">=18.0.0"`, which was never verified —
  the monorepo's own toolchain requires Node >= 22.13 (pnpm 11.9 loads `node:sqlite`) and CI
  only ever exercised Node 22 and 24. The claim is now aligned with what is actually built and
  tested.

  `engines` is advisory by default: npm emits an `EBADENGINE` warning rather than failing the
  install unless the consumer has set `engine-strict`. Node 18 reached end of life, and the
  compiled output itself is unchanged by this release.

  Also corrects `packages/board`'s `three` peer range, which was `^0.170.0` — on a `0.x` line
  that resolves to `>=0.170.0 <0.171.0` and could not be satisfied by the `three` version the
  package is actually built and tested against. It now matches `packages/display` at
  `>=0.185.0`.

  Bundled with this Node-floor bump rather than releasing separately (same set of packages,
  same window): `ultimatedarktower`, `ultimatedarktowerdata`, `ultimatedarktowerrelay-shared`,
  `ultimatedarktowerrelay-core`, and `ultimatedarktowerrelay-client` move their TypeScript
  compile target from `ES2017` to `ES2022`, matching the rest of the workspace, plus enable
  `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`. **Module format is
  unchanged** — these packages still emit CommonJS (`module`/`moduleResolution` stay
  `Node16`/`Node16`, now with `exports`-map-aware resolution rather than the previous
  `commonjs`+implicit-`node10`). Adopting the workspace's `ESNext`/`bundler` module settings
  outright was evaluated and rejected: verified directly that it makes `require()` throw
  `ERR_MODULE_NOT_FOUND` for every consumer of these `require()`-based CJS packages, since
  none of them declare `"type": "module"`. `ES2022` output syntax on a package that already
  requires Node >= 22.13 (this same release) is not a compatibility concern.

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerrelay-shared@1.0.0
  - ultimatedarktowerdata@2.0.0

## 0.3.0

### Minor Changes

- 6a89e0e: Depend on `ultimatedarktowerdata` directly for `TOWER_LIGHT_SEQUENCES` and `TOWER_AUDIO_LIBRARY`,
  used by `logAnalysis`'s reverse-name lookups. These moved out of `ultimatedarktower` in its v6.0.0.

  This makes `logAnalysis`'s "Bluetooth-free" design (documented in its own header) literally true at
  the package level, not just true by tree-shaking — `ultimatedarktowerdata` has zero dependencies
  and no Bluetooth, where `ultimatedarktower` (still a dependency of this package for its other
  modules) is not importable without pulling in the BLE stack's package graph.

### Patch Changes

- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktower@6.0.0
  - ultimatedarktowerdata@1.0.0
