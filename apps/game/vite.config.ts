import { defineConfig } from 'vite';

// Deployed to the unified Pages site at /UltimateDarkTower/game/. The base is
// injected by deploy-pages.yml (--base); '/' keeps local dev/build path-agnostic.
//
// `ultimatedarktower` needs no special handling: since v7.0.0 it ships a `browser`
// export condition (dist/browser/index.mjs) with no `createRequire`/noble banner,
// so Vite/Rollup resolve a browser-safe ESM entry directly. This dropped the
// former CJS-redirect plugin, the `module` esbuild shim, the commonjsOptions
// core opt-in, and the `@stoprocent/noble` external/exclude.
export default defineConfig({
  base: '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  server: {
    port: 3004,
    open: true,
  },
});
