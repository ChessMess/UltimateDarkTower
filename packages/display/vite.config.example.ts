import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'example',
  base: '/UltimateDarkTowerDisplay/',
  // .ogg files referenced from the library's audioLibrary.ts (which uses
  // new URL('./assets/...', import.meta.url)) live in ../src/audio/assets/.
  // Vite's default fs.allow already permits sibling directories under the
  // workspace root (package.json), but assetsInclude must enumerate the
  // formats Vite is willing to serve as static assets.
  //
  // Preprocessed skull GLBs live in `example/public/skulls/` (gitignored) —
  // Vite's default publicDir serves them at the site root automatically; no
  // custom middleware needed.
  assetsInclude: ['**/*.glb', '**/*.ogg'],
  resolve: {
    alias: {
      // The ESM build of ultimatedarktower uses createRequire which is not
      // available in browsers. Alias to the CJS build instead.
      ultimatedarktower: resolve(__dirname, 'node_modules/ultimatedarktower/dist/src/index.js'),
    },
  },
  build: {
    outDir: '../dist-example',
    emptyOutDir: true,
    rollupOptions: {
      // Exclude the optional noble BLE dependency (Node-only)
      external: ['@stoprocent/noble'],
    },
  },
});
