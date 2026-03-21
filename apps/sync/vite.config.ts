import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'url';
import type { Plugin as EsbuildPlugin } from 'esbuild';

// Absolute path to the CJS entry of ultimatedarktower.  The ESM bundle
// (dist/esm/index.mjs) includes a `createRequire` shim that fails in
// browsers.  The CJS individual files use require() which Rollup's
// commonjs plugin can convert to ESM automatically.
const udtCjsEntry = fileURLToPath(
  new URL('../../node_modules/ultimatedarktower/dist/src/index.js', import.meta.url)
);

/**
 * esbuild plugin that shims Node's `module` built-in during dep pre-bundling.
 *
 * ultimatedarktower's ESM bundle starts with:
 *   import{createRequire}from'module'; const require=createRequire(…);
 *
 * esbuild externalizes `module` as a Node built-in, so the pre-bundled
 * output still contains the raw import — which the browser can't resolve.
 *
 * This plugin intercepts the `module` import and inlines a stub
 * `createRequire` that returns a `require` function which throws.
 * The only call site (`require('@stoprocent/noble')`) is inside a
 * try/catch, so the throw is harmless — the Node BLE adapter is never
 * used in the browser.
 */
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

/**
 * Vite plugin: redirects `ultimatedarktower` to CJS entry in production builds.
 *
 * In production (Rollup), the CJS entry is used so Rollup's commonjs plugin
 * converts require() → import.  In dev, the ESM entry is pre-bundled by
 * esbuild with the `module` shim above, so no redirect is needed.
 */
function udtCjsForBuild(): Plugin {
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

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [udtCjsForBuild()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      // @stoprocent/noble is a Node-only BLE adapter — never loaded in the browser.
      external: ['@stoprocent/noble'],
    },
  },
  resolve: {
    alias: {
      // Point to shared source during dev so the package doesn't need to be
      // built first. After `npm install` the workspace symlink is in place but
      // the shared dist/ may not exist yet — this alias bypasses that.
      '@dark-tower-sync/shared': fileURLToPath(
        new URL('../shared/src/index.ts', import.meta.url)
      ),
    },
  },
  optimizeDeps: {
    // Exclude Node-only BLE adapter from pre-bundling.
    exclude: ['@stoprocent/noble'],
    esbuildOptions: {
      // Shim Node's `module` built-in during pre-bundling so the ESM
      // bundle's `createRequire` call works harmlessly in the browser.
      plugins: [esbuildNodeModuleShim()],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
