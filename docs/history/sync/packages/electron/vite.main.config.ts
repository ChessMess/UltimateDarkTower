import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        // Native modules — must not be bundled; loaded at runtime from node_modules.
        '@stoprocent/bleno',
        '@stoprocent/noble',
        // Workspace packages — loaded at runtime via npm workspace symlinks.
        // Build them first with: npm run build:shared && npm run build:host
        '@dark-tower-sync/host',
        '@dark-tower-sync/shared',
        // Large CJS/ESM package that resolves cleanly at runtime.
        'ultimatedarktower',
        // Works better unbundled in Electron main.
        'ws',
      ],
    },
  },
});
