import { defineConfig } from 'vite';

export default defineConfig({
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
        // NOTE: @dark-tower-sync/host and @dark-tower-sync/shared are intentionally
        // bundled (not external) so they are included in the packaged .asar.
        // Workspace symlinks are not preserved during electron-forge make.
      ],
    },
  },
});
