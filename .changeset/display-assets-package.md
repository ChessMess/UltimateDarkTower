---
'ultimatedarktowerdisplay': patch
---

Internal: the bundled art and audio bytes now live in `@udtc/assets` (private, a devDependency)
rather than in this package's `src/`. All 115 `.ogg`, `board.png` and `tower.glb` moved.

**The published tarball is unchanged** — same 153 files, same `dist/audio/assets/<name>.ogg`
paths, same `dist/3d/assets/{board.png,tower.glb}`, same `new URL(…, import.meta.url)` shape in
both bundles. Nothing about consuming this package changes, including `buildOfficialSoundPack`
self-hosting paths.

`audioLibrary.ts` is now one half of a split: it keeps the sample-id → filename map, and
`@udtc/assets/audio` owns filename → URL. `scripts/extract-audio.mjs` regenerates both halves in
one run.

Also adds `scripts/check-dist-size.mjs` to `build`. Vite's library mode base64-inlines
`new URL(literal, import.meta.url)` assets, and the plugin that prevents it fails **silently** —
verified by removing an entry from `URL_ASSET_HOSTS`: the build stayed green while emitting 11 MB
bundles and 2 `.ogg` instead of 115. The script asserts bundle sizes, the `.ogg` count and the two
static assets, so that failure is now a build error.
