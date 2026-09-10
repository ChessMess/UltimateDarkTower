# ultimatedarktowercontroller

## 3.5.4

### Patch Changes

- c4b5e89: New private package **`@udtc/assets`** — the single source of truth for Return to Dark Tower
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

- Updated dependencies [99f396e]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [5f9deec]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [974549e]
- Updated dependencies [9046309]
- Updated dependencies [f41fd0c]
- Updated dependencies [f41fd0c]
- Updated dependencies [a00cf63]
- Updated dependencies [f41fd0c]
- Updated dependencies [6961078]
- Updated dependencies [5c900e4]
- Updated dependencies [af416e7]
  - ultimatedarktowerdisplay@2.0.0
  - @udtc/assets@0.2.0
  - ultimatedarktowerdata@3.0.0
  - ultimatedarktower@7.1.2

## 3.5.3

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerdisplay@1.0.0
  - ultimatedarktowerdata@2.0.0

## 3.5.2

### Patch Changes

- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktower@6.0.0
  - ultimatedarktowerdisplay@0.11.0
  - ultimatedarktowerdata@1.0.0
