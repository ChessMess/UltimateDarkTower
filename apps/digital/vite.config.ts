/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// UTDD is deployed to GitHub Pages under /UltimateDarkTowerDigital/.
// Use a relative base in production so assets resolve regardless of the repo path.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/UltimateDarkTowerDigital/' : '/',
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
      // (Alias boundary matching leaves ...display / ...board untouched.)
      ultimatedarktower: fileURLToPath(
        new URL('../UltimateDarkTower/dist/src/index.js', import.meta.url),
      ),
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
