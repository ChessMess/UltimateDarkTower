import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'example',
  base: '/UltimateDarkTowerDisplay/',
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
