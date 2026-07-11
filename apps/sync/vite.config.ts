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
    // Production source maps are not deployed to GitHub Pages — they roughly double
    // the artifact size (~34 MB map alongside the bundle) for no end-user benefit.
    sourcemap: false,
    target: 'es2020',
    commonjsOptions: {
      // The relay SDK (ultimatedarktowerrelay-{client,shared}) ships CommonJS under
      // node_modules; Rollup's commonjs plugin transforms node_modules by default, so its
      // named exports (e.g. `makeCommandLogEntry`) resolve without any extra include.
      include: [/node_modules/],
    },
  },
  resolve: {
    alias: {
      // @stoprocent/noble is a Node-only BLE adapter, required both directly by
      // ultimatedarktower's CJS entry and transitively via
      // ultimatedarktowerrelay-client -> ultimatedarktower (CJS). It's never
      // installed and never loaded in the browser (the require is Node-guarded
      // and wrapped in a try/catch). Aliasing it to a local empty stub gives the
      // esbuild dev pre-bundler and the Rollup production build a real module to
      // resolve, instead of externalizing a package that doesn't exist.
      '@stoprocent/noble': fileURLToPath(new URL('./noble-stub.js', import.meta.url)),
      // The relay SDK (ultimatedarktowerrelay-{client,shared}) is a published npm dep,
      // so no source alias is needed here.
      // For local development against a sibling checkout via npm link, e.g.:
      // 'ultimatedarktowerdisplay': fileURLToPath(new URL('../../UltimateDarkTowerDisplay/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
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
