import { defineConfig } from 'vite';
import { resolve } from 'path';

// Standalone app build for the GitHub Pages demo. Output goes to example/dist.
//
// The core barrel re-exports data from `ultimatedarktower`, whose ESM build uses
// `createRequire` (which browsers can't run). Alias it to its CJS build and
// pre-bundle it, exactly as Display's example config does.
//
// The 3D path (TowerRenderView + Board3DPlugin) is wired but commented out in
// example/src/main.ts until a tower modelUrl is supplied and Display ships
// anchorToWorld; the scaffold demo renders the headless board readout.
export default defineConfig({
  root: resolve(__dirname, 'example'),
  base: './',
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
    commonjsOptions: {
      // `ultimatedarktower` is a symlinked sibling that resolves OUTSIDE node_modules,
      // so Rollup's commonjs plugin skips it by default and can't see its CJS named
      // exports (re-exported via Object.defineProperty). Opt it in explicitly so the
      // production example build resolves BOARD_LOCATIONS/BOARD_ANCHORS/etc.
      include: [/ultimatedarktower/i, /node_modules/],
    },
  },
});
