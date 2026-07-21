---
'ultimatedarktower': minor
---

Add a `browser` export condition so the package loads in browser bundlers without per-app workarounds.

The published ESM bundle (`dist/esm/index.mjs`) begins with an esbuild-injected `import{createRequire}from'module'` banner — a Node builtin that a browser cannot resolve, so the entry died on line 1 before any library code ran. The banner exists only because the guarded `require('@stoprocent/noble')` in `NodeBluetoothAdapter` survives into the ESM output as a literal external `require`.

This adds a second, browser-targeted esbuild bundle (`dist/browser/index.mjs`) that aliases `@stoprocent/noble` to a throwing stub so the require is inlined rather than left external — no surviving `require`, so no `createRequire` banner. A new `browser` export condition (ordered before `import`/`require`) points bundlers at it; Vite, webpack, and Rollup honour it automatically, so browser consumers need no alias/pre-bundle configuration. Node consumers are unaffected: the `import` (Node ESM, banner intact) and `require` (CJS) conditions are unchanged, and `BluetoothPlatform.NODE` still resolves the real `NodeBluetoothAdapter` with native BLE.

No API change — purely additive.
