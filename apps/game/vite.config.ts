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

// Deployed to the unified Pages site at /UltimateDarkTower/game/. The base is
// injected by deploy-pages.yml (--base); '/' keeps local dev/build path-agnostic.
export default defineConfig({
  base: '/',
  root: '.',
  publicDir: 'public',
  plugins: [udtCjsForBuild()],
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
    },
  },
  optimizeDeps: {
    include: ['ultimatedarktower'],
    exclude: ['@stoprocent/noble'],
    esbuildOptions: {
      plugins: [esbuildNodeModuleShim()],
    },
  },
  server: {
    port: 3004,
    open: true,
  },
});
