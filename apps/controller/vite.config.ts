/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import type { Plugin as EsbuildPlugin } from 'esbuild';

const udtCjsEntry = fileURLToPath(
  new URL('./node_modules/ultimatedarktower/dist/src/index.js', import.meta.url),
);

function esbuildNodeModuleShim(): EsbuildPlugin {
  return {
    name: 'shim-node-module',
    setup(build) {
      build.onResolve({ filter: /^module$/ }, () => ({
        path: 'module',
        namespace: 'node-module-shim',
      }));
      build.onLoad({ filter: /.*/, namespace: 'node-module-shim' }, () => ({
        contents: `
          export function createRequire() {
            return function require(id) {
              throw new Error('[browser] require("' + id + '") is not available');
            };
          }
        `,
        loader: 'js',
      }));
    },
  };
}

function udtCjsForBuild(): import('vite').Plugin {
  let isBuild = false;
  return {
    name: 'ultimatedarktower-cjs-build',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    resolveId(source) {
      if (isBuild && source === 'ultimatedarktower') {
        return { id: udtCjsEntry, external: false };
      }
    },
  };
}

// Deployed to the unified Pages site at /UltimateDarkTower/controller/. The base
// is injected by deploy-pages.yml (--base); '/' keeps local dev/build path-agnostic.
export default defineConfig({
  base: '/',
  root: '.',
  publicDir: 'public',
  plugins: [udtCjsForBuild()],
  // No source .glb import (the model is served from public/ and passed via
  // modelUrl), but keep .glb classified as an asset for robustness. The emulator's
  // .ogg audio is emitted automatically from ultimatedarktowerdisplay's internal
  // `new URL('...ogg', import.meta.url)` refs (.ogg is a default Vite asset type).
  assetsInclude: ['**/*.glb'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    commonjsOptions: {
      // ultimatedarktower's CJS entry resolves via the pnpm workspace symlink to
      // packages/core/dist (a realpath outside node_modules), which Rollup's
      // commonjs plugin skips by default — leaving raw require() calls that throw
      // "require is not defined" in the browser. Opt the workspace core dir in.
      include: [/node_modules/, /packages\/core/],
    },
    rollupOptions: {
      external: ['@stoprocent/noble'],
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
    include: ['ultimatedarktower', 'ultimatedarktowerdisplay'],
    exclude: ['@stoprocent/noble'],
    esbuildOptions: {
      plugins: [esbuildNodeModuleShim()],
    },
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
