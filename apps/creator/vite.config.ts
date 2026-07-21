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
  base: '/', // Pages base is set via --base in deploy-pages.yml
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ultimatedarktower: udtCjsPath,
    },
    dedupe: ['react', 'react-dom', 'three', 'gsap', '@dimforge/rapier3d-compat'],
  },
  optimizeDeps: {
    // `ultimatedarktower` must be pre-bundled explicitly (as apps/digital does). Without it, the
    // CJS entry the alias above points at is processed by Vite's ESM pipeline, which hoists UDT's
    // optional `require('@stoprocent/noble')` (Node-only BLE, guarded by a try/catch in
    // NodeBluetoothAdapter) into an eager import — noble then runs `os.platform()` at module init
    // and takes the whole app down with "os.platform is not a function". esbuild's dep optimizer
    // keeps that require lazy. Pre-existing on a cold `.vite` cache; see PR notes.
    include: ['@udtc/engine', '@udtc/schema', '@udtc/adapters', 'ultimatedarktower'],
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
