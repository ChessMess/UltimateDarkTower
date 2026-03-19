import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  resolve: {
    alias: {
      // Point to shared source during dev so the package doesn't need to be
      // built first. After `npm install` the workspace symlink is in place but
      // the shared dist/ may not exist yet — this alias bypasses that.
      '@dark-tower-sync/shared': fileURLToPath(
        new URL('../shared/src/index.ts', import.meta.url)
      ),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
