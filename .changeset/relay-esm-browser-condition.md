---
'ultimatedarktowerrelay-shared': patch
'ultimatedarktowerrelay-client': patch
---

Ship an ESM build alongside the CommonJS one so browser bundlers can consume
these packages directly.

Both packages were CJS-only (`tsc --build` against `tsconfig.node-lib.json`),
and `relay-shared`'s barrel uses `export *`, so its emitted `dist/index.js`
carries a `__exportStar` helper. A Vite/Rollup app importing `RelayClient` got
CommonJS interop shims for what should be plain named exports — the same
failure mode `ultimatedarktowerdata` hit before it grew an `import` condition.

Each package now emits `dist/esm/index.mjs` via esbuild (`--packages=external`,
so workspace deps resolve through their own export maps) and declares it under
an `"import"` export condition, with `"require"` still pointing at the existing
CJS entry. `relay-client`'s export map previously used `"default"`; it is now
the explicit `"import"`/`"require"` pair.

Node consumers (`relay-core`, `relay-cli`) are unaffected — they resolve through
`"require"` exactly as before. This is not a dual-package hazard: the CJS copy
only ever loads in a Node relay host, the ESM copy only in a browser client, and
they never share a process.
