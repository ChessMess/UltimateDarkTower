import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import type { Plugin as EsbuildPlugin } from 'esbuild';

const udtCjsEntry = fileURLToPath(
  new URL('./node_modules/ultimatedarktower/dist/src/index.js', import.meta.url)
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

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [udtCjsForBuild()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
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
    port: 3002,
    open: true,
  },
});
