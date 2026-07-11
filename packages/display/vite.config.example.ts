import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';

// UDT's ESM build starts with `import {createRequire} from 'module'; const
// require = createRequire(import.meta.url);` so it can dynamically load
// `@stoprocent/noble` (Node-only BLE adapter) in `__require("@stoprocent/noble")`.
// In the browser example we never hit that code path (noble is externalized;
// the example uses Web Bluetooth), but Vite's browser bundler can't resolve
// the `module` built-in, so the import alone fails the build. Strip the
// prelude — `require` becomes undefined, and `__require`'s `typeof require`
// guard falls through to its Proxy fallback (never called in the browser).
function stripUdtCreateRequirePrelude(): Plugin {
  return {
    name: 'strip-udt-createrequire-prelude',
    enforce: 'pre',
    transform(code, id) {
      // Matches the aliased core ESM entry; in the monorepo it resolves to
      // packages/core/dist/esm/index.mjs (was ../UltimateDarkTower/... pre-merge).
      if (!id.endsWith('/core/dist/esm/index.mjs')) return null;
      return code.replace(
        /^import\s*\{\s*createRequire\s*\}\s*from\s*['"]module['"]\s*;\s*const\s+require\s*=\s*createRequire\(import\.meta\.url\)\s*;\s*/,
        '',
      );
    },
  };
}

export default defineConfig({
  root: 'example',
  base: '/UltimateDarkTowerDisplay/',
  plugins: [stripUdtCreateRequirePrelude()],
  // .ogg files referenced from the library's audioLibrary.ts (which uses
  // new URL('./assets/...', import.meta.url)) live in ../src/audio/assets/.
  // Vite's default fs.allow already permits sibling directories under the
  // workspace root (package.json), but assetsInclude must enumerate the
  // formats Vite is willing to serve as static assets.
  //
  // Preprocessed skull GLBs live in `example/public/skulls/` (gitignored) —
  // Vite's default publicDir serves them at the site root automatically; no
  // custom middleware needed.
  assetsInclude: ['**/*.glb', '**/*.ogg'],
  resolve: {
    alias: {
      // Use UDT's ESM build (its CJS barrel re-exports constants via tsc's
      // `__exportStar` runtime helper, which Rollup's static analyzer can't
      // see through — `import { LIGHT_EFFECTS } from 'ultimatedarktower'`
      // would fail at build time). The createRequire prelude is stripped
      // by the plugin above.
      ultimatedarktower: resolve(__dirname, 'node_modules/ultimatedarktower/dist/esm/index.mjs'),
    },
  },
  build: {
    outDir: '../dist-example',
    emptyOutDir: true,
    rollupOptions: {
      // Exclude the optional noble BLE dependency (Node-only)
      external: ['@stoprocent/noble'],
    },
  },
});
