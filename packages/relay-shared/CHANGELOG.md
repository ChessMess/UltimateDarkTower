# ultimatedarktowerrelay-shared

## 1.0.1

### Patch Changes

- e4e952c: Internal-only: factor the CJS/Node16 `tsconfig.json` family (this package plus `game-data`, the relay family, and `mcp-server`) into a shared root `tsconfig.node-lib.json`, mirroring the existing `tsconfig.browser-lib.json` pattern for `board`/`display`. Each package keeps only its own path options (`outDir`/`rootDir`/`composite`/`include`/`exclude`); the repeated compiler-options block and its explanatory comment move to the shared file.

  No public API or emitted-JS change for `ultimatedarktower`, `ultimatedarktowerdata`, `ultimatedarktowerrelay-shared`, `ultimatedarktowerrelay-core`, or `ultimatedarktowerrelay-client` — verified byte-for-byte identical `dist/` output before/after.

  `mcp-server-return-to-dark-tower` additionally gains the `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` strictness its five siblings already had (it was missed by an earlier alignment pass), which surfaced two genuinely dead write-only fields (`TowerController`'s `connected`/`calibrated`) — removed; the public `connected`/`calibrated` snapshot fields are unaffected, since they already read from the `isConnected`/`isCalibrated` getters, not these fields.

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
