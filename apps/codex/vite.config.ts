/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// No optimizeDeps/alias entry for `ultimatedarktowerdata`: since v2 it ships an `import` export
// condition pointing at a real ESM bundle (dist/esm/index.mjs), so Vite resolves named exports
// directly. Re-adding the old CJS workarounds here is a regression — see packages/game-data/CLAUDE.md.
export default defineConfig({
  base: '/', // Pages base is set via --base in deploy-pages.yml
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3006,
    open: true,
  },
  preview: {
    port: 4006,
  },
  test: {
    // The only suite is a pure data check over the registry — no DOM, so no jsdom dependency.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
