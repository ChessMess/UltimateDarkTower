---
'@udtc/assets': minor
'ultimatedarktowercontroller': patch
---

New private package **`@udtc/assets`** — the single source of truth for Return to Dark Tower
game art and audio, delivered as bundler-resolved URLs instead of per-app `public/` copies.

`apps/controller` is the first consumer: `tower.glb` and the six glyph SVGs now come from the
package and are emitted by the app's own Vite build, so `public/assets/` keeps only the chrome
that isn't game art (webfonts, background, logo).

The glyph lookup is the notable change. It was:

```ts
img.src = `${import.meta.env.BASE_URL}assets/glyph_${glyphName}.svg`;
```

a runtime string concat that failed silently — a renamed or missing glyph produced a broken
image with no error. It is now an index into a typed record (`glyphSvg[glyphName]`), so the same
mistake is a compile error.
