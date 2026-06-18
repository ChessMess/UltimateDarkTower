import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Point at TypeScript source so Vite/esbuild processes it directly,
      // avoiding Rollup's inability to statically analyze CJS dist output.
      'ultimatedarktowerrelay-core': path.resolve(__dirname, '../core/src/index.ts'),
      'ultimatedarktowerrelay-shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Native modules — must not be bundled; loaded at runtime from node_modules.
        '@stoprocent/bleno',
        '@stoprocent/noble',
        // Large CJS/ESM package that resolves cleanly at runtime.
        'ultimatedarktower',
        // Works better unbundled in Electron main.
        'ws',
        // NOTE: ultimatedarktowerrelay-core / -shared are intentionally bundled
        // (not external) so they are included in the packaged .asar. Workspace
        // symlinks are not preserved during electron-forge make.
      ],
    },
  },
});
