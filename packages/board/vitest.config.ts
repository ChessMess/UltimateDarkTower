import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const mock = (f: string) => resolve(__dirname, '__tests__/__mocks__', f);

// Standalone rather than a `test` block inside vite.config.ts: that file is the
// *library build* config (build.lib + rollupOptions.external: ['three', /^three\/.*/]),
// and aliasing `three` to a mock alongside that external list is not something you
// want to reason about. Keeping them separate means `vite build` is provably untouched.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['./__tests__/setup.js'],

    // Ported one-to-one from jest's moduleNameMapper. Every key is a RegExp, not a
    // string: vite's string alias keys match by PREFIX, so a bare 'three' would also
    // swallow three/examples/jsm/* and three/addons/*.
    //
    // Plugin tests construct a REAL Tower3DView, and display's dist imports
    // three/gsap as bare specifiers — these mocks are what keep that WebGL-free
    // in jsdom. Deliberately NOT ported: the two `ultimatedarktowerdisplay` ->
    // dist/*.cjs.js aliases. Those existed only because jest's CJS loader could not
    // use display's `.cjs.js` under `type: module`; vitest resolves the package's
    // `exports` map to the ESM build, so the hardcoded dist path is gone.
    alias: [
      { find: /^three$/, replacement: mock('three.js') },
      {
        find: /^three\/examples\/jsm\/controls\/OrbitControls\.js$/,
        replacement: mock('orbitControls.js'),
      },
      {
        find: /^three\/examples\/jsm\/loaders\/DRACOLoader\.js$/,
        replacement: mock('dracoLoader.js'),
      },
      {
        find: /^three\/examples\/jsm\/loaders\/GLTFLoader\.js$/,
        replacement: mock('gltfLoader.js'),
      },
      { find: /^three\/examples\/jsm\/loaders\/HDRLoader\.js$/, replacement: mock('hdrLoader.js') },
      {
        find: /^three\/examples\/jsm\/utils\/BufferGeometryUtils\.js$/,
        replacement: mock('bufferGeometryUtils.js'),
      },
      {
        find: /^three\/examples\/jsm\/lights\/RectAreaLightUniformsLib\.js$/,
        replacement: mock('rectAreaLightUniformsLib.js'),
      },
      { find: /^three\/addons\/postprocessing\/.*$/, replacement: mock('postprocessing.js') },
      { find: /^gsap$/, replacement: mock('gsap.js') },
    ],

    // display's dist is a real directory outside node_modules (pnpm workspace
    // symlink), so vitest should inline it and apply the aliases above. If the
    // plugin integration test ever starts hitting real three/WebGL, that
    // assumption broke and this is the lever.
    server: { deps: { inline: [/ultimatedarktowerdisplay/] } },
  },
});
