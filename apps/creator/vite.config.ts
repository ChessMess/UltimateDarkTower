/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/', // Pages base is set via --base in deploy-pages.yml
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'three', 'gsap', '@dimforge/rapier3d-compat'],
  },
  optimizeDeps: {
    // Pre-bundle the linked @udtc/* workspace libs so their file: links resolve cleanly in dev.
    // `ultimatedarktower` no longer needs listing here: since v7.0.0 it ships a `browser` export
    // condition (dist/browser/index.mjs) with no `createRequire`/noble banner, so Vite resolves a
    // browser-safe entry directly — no CJS alias, and no eager-noble `os.platform` crash on cold cache.
    include: ['@udtc/engine', '@udtc/schema', '@udtc/adapters'],
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
