import { defineConfig } from 'vite';

// v6.0.0: this app only ever used the seed subsystem, now `ultimatedarktowerdata` — a
// zero-dependency, Bluetooth-free package with no browser-hostile build step. It no longer
// depends on `ultimatedarktower` at all, so none of the CJS-alias / commonjsOptions /
// esbuild-shim workarounds that package needed in the browser are required here.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  server: {
    port: 3002,
    open: true,
  },
});
