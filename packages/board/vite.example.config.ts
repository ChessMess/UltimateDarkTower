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
  },
  optimizeDeps: {
    include: ['ultimatedarktower'],
  },
  build: {
    outDir: resolve(__dirname, 'example/dist'),
    emptyOutDir: true,
  },
});
