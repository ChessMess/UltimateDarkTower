import { defineConfig } from 'vite';
import { resolve } from 'path';

// Library build. Three entries:
//  - `index`  -> the headless core + readout/2D renderers + ultimatedarktowerdata re-exports
//               (three-free, and — as of v6 — Bluetooth-free: no ultimatedarktower dep at all)
//  - `plugin` -> the Board3DPlugin (imports three + ultimatedarktowerdisplay)
//  - `stage`  -> BoardStageView, the all-in-one render stage (three-free statically; the
//               3D tower is a dynamic import of `src/plugin/stageTower`, emitted as a
//               shared chunk alongside the plugin entry — never bundled into `stage`).
// Each emits its own ESM + CJS bundle. fileName matches the §2 package.json
// `exports` map: dist/index.{esm,cjs}.js, dist/plugin.{esm,cjs}.js, dist/stage.{esm,cjs}.js.
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        plugin: resolve(__dirname, 'src/plugin/index.ts'),
        stage: resolve(__dirname, 'src/stage/index.ts'),
      },
      formats: ['es', 'cjs'],
      // ESM keeps `.esm.js` (a `.js` under "type":"module" is ESM — correct).
      // CJS MUST be `.cjs`, NOT `.cjs.js`: under "type":"module" a `.cjs.js`
      // file is treated as ESM, so `require()` consumers get an empty module.
      // (Display ships `.cjs.js` and its CJS require is in fact broken — we
      // intentionally diverge here. See spec §5.)
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.esm.js` : `${entryName}.cjs`,
    },
    rollupOptions: {
      // Peers — never bundled. Keeps the `.` entry three-free and ensures a
      // single `three` instance is shared with Display in the host app.
      external: [
        'ultimatedarktowerdata',
        'ultimatedarktowerdisplay',
        // The 3D plugin reuses Display's `loadSkullModel` (which bundles the GLTF/
        // DRACO loaders). Externalize the subpath so those loaders stay in Display's
        // chunk instead of being pulled into the board's plugin bundle.
        'ultimatedarktowerdisplay/physics',
        'three',
        /^three\/.*/,
        'gsap',
      ],
    },
    sourcemap: true,
  },
});
