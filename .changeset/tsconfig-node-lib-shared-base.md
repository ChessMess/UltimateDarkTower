---
'ultimatedarktower': patch
'ultimatedarktowerdata': patch
'ultimatedarktowerrelay-shared': patch
'ultimatedarktowerrelay-core': patch
'ultimatedarktowerrelay-client': patch
'mcp-server-return-to-dark-tower': patch
---

Internal-only: factor the CJS/Node16 `tsconfig.json` family (this package plus `game-data`, the relay family, and `mcp-server`) into a shared root `tsconfig.node-lib.json`, mirroring the existing `tsconfig.browser-lib.json` pattern for `board`/`display`. Each package keeps only its own path options (`outDir`/`rootDir`/`composite`/`include`/`exclude`); the repeated compiler-options block and its explanatory comment move to the shared file.

No public API or emitted-JS change for `ultimatedarktower`, `ultimatedarktowerdata`, `ultimatedarktowerrelay-shared`, `ultimatedarktowerrelay-core`, or `ultimatedarktowerrelay-client` — verified byte-for-byte identical `dist/` output before/after.

`mcp-server-return-to-dark-tower` additionally gains the `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` strictness its five siblings already had (it was missed by an earlier alignment pass), which surfaced two genuinely dead write-only fields (`TowerController`'s `connected`/`calibrated`) — removed; the public `connected`/`calibrated` snapshot fields are unaffected, since they already read from the `isConnected`/`isCalibrated` getters, not these fields.
