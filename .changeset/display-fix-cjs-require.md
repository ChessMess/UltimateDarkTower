---
'ultimatedarktowerdisplay': patch
---

Fix the published CJS build: the `require()` entry points (`.`, `./physics`) were emitted as `dist/index.cjs.js` / `dist/physics.cjs.js`. Under this package's `"type": "module"`, a plain `.js` file is treated as an ES module regardless of its actual CommonJS content, so `require('ultimatedarktowerdisplay')` threw `ReferenceError: exports is not defined in ES module scope` — the CJS entry point has never actually worked. Renamed the emitted files to `dist/index.cjs` / `dist/physics.cjs` (matching `packages/board`'s existing convention), which Node always resolves as CommonJS regardless of the package's `type` field.

No change to the public import specifier (`require('ultimatedarktowerdisplay')` / `import 'ultimatedarktowerdisplay'`) or the ESM path — only the internal filename behind the `exports` map's `require` condition changed.
