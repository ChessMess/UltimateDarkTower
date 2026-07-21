/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

// `ultimatedarktower` needs no special handling: since v7.0.0 it ships a `browser`
// export condition (dist/browser/index.mjs) with no `createRequire`/noble banner,
// so Vite/Rollup resolve a browser-safe ESM entry directly — for both the direct
// import and the transitive `ultimatedarktowerrelay-client -> ultimatedarktower`
// path (the `browser` condition wins regardless of import/require syntax). This
// dropped the former CJS-redirect plugin, the `module` esbuild shim, and the
// commonjsOptions core opt-in.

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Production source maps are not deployed to GitHub Pages — they roughly double
    // the artifact size (~34 MB map alongside the bundle) for no end-user benefit.
    sourcemap: false,
    target: 'es2020',
    commonjsOptions: {
      // The relay SDK (ultimatedarktowerrelay-{client,shared}) ships CommonJS.
      // Rollup's commonjs plugin transforms node_modules by default, but in this
      // monorepo the relay packages resolve via pnpm workspace symlinks to
      // packages/relay-*/dist (a realpath outside node_modules), so include those
      // paths too — otherwise the CJS `export *` named exports (e.g.
      // `makeCommandLogEntry`) aren't detected during the production build.
      include: [/node_modules/, /packages\/relay-/],
    },
  },
  resolve: {
    alias: {
      // @stoprocent/noble is a Node-only BLE adapter. core's browser build stubs it
      // internally, so it should never enter the browser graph — but alias it to a
      // local empty stub as a failsafe: the real (Node-only) package is present as
      // core's devDependency, so a stray transitive CJS require must not pull it in.
      '@stoprocent/noble': fileURLToPath(new URL('./noble-stub.js', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    // ClientLogger is pure buffer logic over relay-shared types — no DOM needed.
    // Tests live under tests/, not src/, unlike the other apps in this repo.
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
  },
});
