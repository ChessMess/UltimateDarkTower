import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tokenArtDevPlugin } from './example/tokenArtDevPlugin.ts';

const exampleDir = resolve(import.meta.dirname, 'example');

// Standalone app build for the GitHub Pages demo. Output goes to example/dist.
//
// v6.0.0: the core barrel's re-exported data now comes from `ultimatedarktowerdata` — a
// plain zero-dependency package with no browser-hostile `createRequire` banner — so none of
// the alias/commonjsOptions workarounds `ultimatedarktower` needed are required here anymore.
// `ultimatedarktowerdata` used to also need `optimizeDeps.include` (it shipped CJS-only, and
// Vite dev's CJS-interop transform doesn't run on a linked workspace package served raw via
// /@fs/, so `export * from` re-exports like `GLYPHS`/`BOARD_LOCATIONS` came back missing).
// That's fixed at the source now — the package ships a real `import` condition
// (`dist/esm/index.mjs`, an esbuild ESM bundle with genuine named exports, same pattern as
// core's `browser` condition fix) — so no per-consumer workaround is needed here either.
//
// The demo composes the full board: the 3D board (TowerRenderView + Board3DPlugin via
// Display 0.9's `anchorToWorld`) alongside the 2D map, the text readout, the shared focus
// controls, and the dockable editing UI — all over one shared state/selection/focus.
//
// `base: './'` keeps the built asset URLs relative so they resolve under the GitHub Pages
// project subpath (`/UltimateDarkTowerBoard/`). Set an absolute `base` if you fork under a
// different repo name.
//
// The art itself is no longer runtime-loaded from `example/public/` — board art, token art and
// the tower GLB all come from `@udtc/assets` and are emitted by this build with content hashes.
// `base` still matters for those emitted URLs, and for the example's own HTML/JS.
export default defineConfig({
  root: exampleDir,
  base: './',
  // Dev-only: backs the Token Art Forge tool (`/tokens.html`) with read/list/save endpoints.
  plugins: [tokenArtDevPlugin({ exampleDir })],
  resolve: {
    // Single `three` instance shared with the file-linked Display package — the
    // 3D plugin builds Object3Ds with the consumer's `three`, so a duplicate
    // copy would silently fail to render (see ROADMAP §2 "single three").
    dedupe: ['three'],
  },
  build: {
    outDir: resolve(import.meta.dirname, 'example/dist'),
    emptyOutDir: true,
    // Multi-page: the demo (index.html) + the Token Art Forge (tokens.html) + the Token Designer +
    // the Location Marker & Adjacency tool.
    rollupOptions: {
      input: {
        main: resolve(exampleDir, 'index.html'),
        tokens: resolve(exampleDir, 'tokens.html'),
        designer: resolve(exampleDir, 'token-designer.html'),
        locationMarker: resolve(exampleDir, 'location-marker.html'),
      },
    },
  },
});
