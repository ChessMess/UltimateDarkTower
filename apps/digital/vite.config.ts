/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Deployed to the unified Pages site at /UltimateDarkTower/digital/. The base is
// injected by deploy-pages.yml (--base); '/' keeps local dev/build path-agnostic.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  preview: {
    port: process.env.PORT ? Number(process.env.PORT) : 4173,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // The UDT libraries externalize these peers; a duplicate copy breaks the
    // single shared 3D scene. Force one instance. See PRD-00 FR-00.3.
    dedupe: ['three', 'gsap', '@dimforge/rapier3d-compat', 'react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle the linked libs so file: links resolve cleanly in dev. `ultimatedarktower`
    // no longer needs listing here: since v7.0.0 it ships a `browser` export condition
    // (dist/browser/index.mjs) with no `createRequire`/noble banner, so Vite resolves a
    // browser-safe entry directly.
    include: ['ultimatedarktowerdisplay', 'ultimatedarktowerboard'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
