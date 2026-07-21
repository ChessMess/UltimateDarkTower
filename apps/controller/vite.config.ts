/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

// Deployed to the unified Pages site at /UltimateDarkTower/controller/. The base
// is injected by deploy-pages.yml (--base); '/' keeps local dev/build path-agnostic.
//
// `ultimatedarktower` needs no special handling: since v7.0.0 it ships a `browser`
// export condition (dist/browser/index.mjs) with no `createRequire`/noble banner,
// so Vite/Rollup resolve a browser-safe ESM entry directly. This dropped the
// former CJS-redirect plugin, the `module` esbuild shim, the commonjsOptions
// core opt-in, and the `@stoprocent/noble` external/exclude.
export default defineConfig({
  base: '/',
  root: '.',
  publicDir: 'public',
  // No source .glb import (the model is served from public/ and passed via
  // modelUrl), but keep .glb classified as an asset for robustness. The emulator's
  // .ogg audio is emitted automatically from ultimatedarktowerdisplay's internal
  // `new URL('...ogg', import.meta.url)` refs (.ogg is a default Vite asset type).
  assetsInclude: ['**/*.glb'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      // Two pages: the controller UI and the 3D emulator popup the controller
      // opens via window.open('TowerEmulator.html').
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        emulator: fileURLToPath(new URL('./TowerEmulator.html', import.meta.url)),
      },
    },
  },
  resolve: {
    // One shared copy of the 3D stack across app + display package — multiple
    // copies break instanceof checks in the WebGL scene.
    dedupe: ['three', 'gsap', '@dimforge/rapier3d-compat'],
  },
  optimizeDeps: {
    include: ['ultimatedarktowerdisplay'],
  },
  server: {
    port: 3005,
    open: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
