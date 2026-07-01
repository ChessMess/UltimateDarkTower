/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

// ultimatedarktower v4.1.0's ESM entry uses `import{createRequire}from'module'` (Node-only).
// Force Vite to bundle the CJS entry instead, which is browser-safe.
const _require = createRequire(import.meta.url);
const udtCjsPath = _require.resolve('ultimatedarktower');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'ultimatedarktower': udtCjsPath,
    },
    dedupe: ['react', 'react-dom', 'three', 'gsap', '@dimforge/rapier3d-compat'],
  },
  optimizeDeps: {
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
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
