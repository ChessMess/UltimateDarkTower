---
'ultimatedarktowerboard': patch
'ultimatedarktowerdisplay': patch
---

Bump the `vite` devDependency from `^5.4.0` to `^8.0.0` to clear the Dependabot
advisories affecting `vite@5.4.x` and its bundled `esbuild@0.21.x` (dev-server
path-traversal / fs.deny bypass / launch-editor and the esbuild dev-server CORS
issue).

For `ultimatedarktowerdisplay`, the vite 8 (rolldown) lib build rendered
`import.meta.url` as `undefined` in the **CJS** output, so the emitted
`new URL('audio/assets/…', undefined)` for the bundled audio assets threw
`Invalid URL` the moment the `.cjs.js` build was `require()`d. A `renderChunk`
step in `vite.config.ts` now rewrites those CJS asset URLs to a require-safe,
module-relative file URL (the ESM build is unchanged). This restores `require()`
of the CJS bundle; no public API or behavior change.
