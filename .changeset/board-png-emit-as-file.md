---
'ultimatedarktowerdisplay': patch
---

Stop base64-inlining the 21 MB `board.png` into the JS bundles. It's now emitted
as a standalone file at `dist/3d/assets/board.png` (via `new URL(..., import.meta.url)`
+ the `emitAssetsAsFiles` build plugin), shrinking both `dist/index.esm.js` and
`dist/index.cjs.js` from ~30 MB to ~1.1 MB. No API or behavior change — the default
`boardDisc.source: 'image'` still loads the board art out of the box, and the file
can now be self-hosted directly from the package.
