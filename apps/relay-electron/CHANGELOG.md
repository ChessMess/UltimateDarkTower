# ultimatedarktowerrelay-electron

## 0.1.3

### Patch Changes

- 6f38636: Rename the native-rebuild script `rebuild` → `rebuild:native`, so the documented
  command actually runs it.

  `rebuild` is a **pnpm builtin** (`pnpm rebuild`, alias `rb`). Every doc in the
  repo said to run `pnpm --filter ultimatedarktowerrelay-electron rebuild`, which
  dispatched to pnpm's own command and never reached
  `electron-rebuild -f -w @stoprocent/bleno,@stoprocent/noble`. The builtin then
  failed with `ERR_PNPM_MISSING_HOISTED_LOCATIONS`, which reads like a broken
  install but is unrelated — under `nodeLinker: hoisted` it resolves packages by
  exact peer-suffixed depPath, while the hoisted linker records only one
  `hoistedLocations` key per physical directory, so a package with two peer
  variants in one directory can only be found under one of them.

  That left the only verification for the native BLE modules unavailable: this app
  has no `build` script, so `pnpm run ci` never exercises the electron toolchain,
  and `pnpm-workspace.yaml` names this command as the way to verify a `tar`/
  electron override.

  `rebuild:native` is not a builtin, so it works with or without `run`.

- Updated dependencies [bdaa339]
  - ultimatedarktowerrelay-shared@1.0.2
  - ultimatedarktower@7.1.2
  - ultimatedarktowerrelay-core@1.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerrelay-shared@1.0.0
  - ultimatedarktowerrelay-core@1.0.0

## 0.1.1

### Patch Changes

- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktower@6.0.0
  - ultimatedarktowerrelay-core@0.3.0
