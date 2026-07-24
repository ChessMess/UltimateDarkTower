---
'ultimatedarktowerdata': minor
---

Ship a real ESM build (`dist/esm/{index,board/index,seed/index}.mjs`, an `esbuild --bundle`
pass per entry point) and expose it via the `exports` map's `import` condition — the same
pattern `ultimatedarktower` uses for its `browser` condition. Previously this package was
CJS-only; its `export * from` re-exports compiled to tsc's `__exportStar(require(...),
exports)` runtime helper, which Vite/esbuild's dev-mode CJS-interop can't statically resolve
into named exports. Any bundler-dev-server consumer doing `import { GLYPHS } from
'ultimatedarktowerdata'` (or any other star-re-exported name) against the linked workspace
package would fail with "does not provide an export named ...". `require()` consumers are
unaffected — the `require` condition still points at the existing `tsc` CJS output.
