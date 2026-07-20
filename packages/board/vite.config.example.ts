import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tokenArtDevPlugin } from './example/tokenArtDevPlugin';

const exampleDir = resolve(__dirname, 'example');

// Standalone app build for the GitHub Pages demo. Output goes to example/dist.
//
// v6.0.0: the core barrel's re-exported data now comes from `ultimatedarktowerdata` — a
// plain zero-dependency CJS/ESM package with no browser-hostile `createRequire` banner —
// so none of the alias/pre-bundle/commonjsOptions workarounds `ultimatedarktower` needed
// are required here anymore.
//
// The demo composes the full board: the 3D board (TowerRenderView + Board3DPlugin via
// Display 0.9's `anchorToWorld`) alongside the 2D map, the text readout, the shared focus
// controls, and the dockable editing UI — all over one shared state/selection/focus.
//
// `base: './'` keeps the built asset URLs relative so the bundle and the runtime-loaded
// `./board.png` / `./tokens/` / `./tower.glb` resolve under the GitHub Pages project subpath
// (`/UltimateDarkTowerBoard/`). Set an absolute `base` if you fork under a different repo name.
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
    outDir: resolve(__dirname, 'example/dist'),
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
