// Browser-build stub for @stoprocent/noble (the Node-only native BLE peer dep).
//
// The browser esbuild bundle (`dist/browser/index.mjs`, wired in package.json's
// build script via `--alias:@stoprocent/noble=./src/adapters/noble-browser-stub.cjs`)
// aliases noble to this file so its `require()` in NodeBluetoothAdapter.ts is
// inlined rather than left as a literal external `require(...)`. That removes the
// last surviving require, so the browser build needs no `createRequire` banner —
// which is the whole reason the ESM bundle can't load in a browser.
//
// This is CJS on purpose: `require()` of a CJS module stays a lazy call at the
// call site (never hoisted to module top), and NodeBluetoothAdapter's require is
// already guarded by a `process.versions.node` check, so in a browser this stub
// is never actually evaluated. The Proxy exists only as a loud failsafe if the
// browser build is ever mis-resolved into a Node context.
// eslint-disable-next-line no-undef
module.exports = new Proxy(
  {},
  {
    get() {
      throw new Error(
        '@stoprocent/noble is unavailable in the browser build of ultimatedarktower; use the Node entry (import/require condition) for native BLE.',
      );
    },
  },
);
