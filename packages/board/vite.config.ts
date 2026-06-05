import { defineConfig } from 'vite';
import { resolve } from 'path';

// Library build. Two entries:
//  - `index`  -> the headless core + readout/2D renderers + UDT data re-exports (three-free)
//  - `plugin` -> the Board3DPlugin (imports three + ultimatedarktowerdisplay)
// Each emits its own ESM + CJS bundle. fileName matches the §2 package.json
// `exports` map: dist/index.{esm,cjs}.js and dist/plugin.{esm,cjs}.js.
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        plugin: resolve(__dirname, 'src/plugin/index.ts'),
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
        'ultimatedarktower',
        'ultimatedarktowerdisplay',
        'three',
        /^three\/.*/,
        'gsap',
      ],
    },
    sourcemap: true,
  },
});
