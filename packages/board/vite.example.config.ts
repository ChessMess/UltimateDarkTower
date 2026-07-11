import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tokenArtDevPlugin } from './example/tokenArtDevPlugin';

const exampleDir = resolve(__dirname, 'example');

// Standalone app build for the GitHub Pages demo. Output goes to example/dist.
//
// The core barrel re-exports data from `ultimatedarktower`, whose ESM build uses
// `createRequire` (which browsers can't run). Alias it to its CJS build and
// pre-bundle it, exactly as Display's example config does.
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
    alias: {
      ultimatedarktower: resolve(__dirname, 'node_modules/ultimatedarktower/dist/src/index.js'),
    },
    // Single `three` instance shared with the file-linked Display package — the
    // 3D plugin builds Object3Ds with the consumer's `three`, so a duplicate
    // copy would silently fail to render (see ROADMAP §2 "single three").
    dedupe: ['three'],
  },
  optimizeDeps: {
    include: ['ultimatedarktower'],
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
    commonjsOptions: {
      // `ultimatedarktower` is a symlinked sibling that resolves OUTSIDE node_modules,
      // so Rollup's commonjs plugin skips it by default and can't see its CJS named
      // exports (re-exported via Object.defineProperty). Opt it in explicitly so the
      // production example build resolves BOARD_LOCATIONS/BOARD_ANCHORS/etc.
      // In the monorepo the alias resolves to packages/core/dist (a realpath outside
      // node_modules that no longer contains "ultimatedarktower"), so match it too.
      include: [/ultimatedarktower/i, /node_modules/, /packages\/core/],
    },
  },
});
