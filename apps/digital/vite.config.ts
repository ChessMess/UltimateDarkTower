/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

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
      // The ultimatedarktower ESM build ships an esbuild banner
      // (`createRequire(import.meta.url)`) that throws in the browser. Its CJS
      // entry is clean — point the browser at it and let Vite pre-bundle it.
      // Resolve via the package's `main` (dist/src/index.js) so it follows the
      // pnpm workspace symlink to packages/core.
      // (Alias boundary matching leaves ...display / ...board untouched.)
      ultimatedarktower: createRequire(import.meta.url).resolve('ultimatedarktower'),
    },
    // The UDT libraries externalize these peers; a duplicate copy breaks the
    // single shared 3D scene. Force one instance. See PRD-00 FR-00.3.
    dedupe: ['three', 'gsap', '@dimforge/rapier3d-compat', 'react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle the linked libs so file: links resolve cleanly in dev.
    include: ['ultimatedarktower', 'ultimatedarktowerdisplay', 'ultimatedarktowerboard'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
