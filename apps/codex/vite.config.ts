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
    // REQUIRED, not tidiness. `@udtc/theme` is source-only with react as a *peer*, so pnpm gives
    // it its own react under packages/creator-theme/node_modules while the app resolves the root
    // copy. Without dedupe both get bundled, `useTheme`'s useSyncExternalStore runs against the
    // copy whose dispatcher was never set, and the app dies on mount with
    // "Cannot read properties of null (reading 'useSyncExternalStore')" — a blank page.
    // Every other React app here does the same (creator, player, digital).
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3006,
    open: true,
  },
  preview: {
    port: 4006,
  },
  test: {
    // jsdom, because one suite actually mounts the app. A registry that passes every data check
    // while the app fails to render is exactly the gap that shipped a blank page once.
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
