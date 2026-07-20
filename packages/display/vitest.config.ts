import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const mock = (f: string) => resolve(__dirname, 'tests/__mocks__', f);

// Every alias except gsap, shared by both projects below. gsap is added back for
// `unit` and left out for `snapshots`, mirroring what jest.config.snapshots.cjs did
// by filtering `^gsap$` out of the base moduleNameMapper.
//
// Every key is a RegExp, not a string: vite's string alias keys match by PREFIX, so
// a bare 'three' would also swallow three/examples/jsm/* and three/addons/*.
//
// Dropped from the old moduleNameMapper: the `^ultimatedarktower$` -> dist/src/index.js
// alias. That existed because jest's CJS transformer needed a CJS-resolvable path;
// core now ships a proper `exports` map with both `import`/`require` conditions, and
// vitest's native ESM resolution reaches dist/esm/index.mjs on its own (verified).
//
// Also dropped: the `\.svg\?raw$` / `\.glb\?url$` / `\.png$` entries. Verified by direct
// repro that Vite's `?raw`/`?url`/asset handling resolves these BEFORE `resolve.alias` is
// consulted (`vite:import-analysis`'s `normalizeUrl` throws "Failed to resolve import"
// even with the alias present) — the mechanism jest's moduleNameMapper used for these
// simply has no equivalent in Vite's pipeline. `vi.mock()` on the exact specifier still
// works (verified) and is what `TowerSideView.test.ts` uses for its two `.svg?raw`
// imports. The `.glb`/`.png` aliases were unreachable dead code anyway — nothing in
// src or tests statically imports either extension (GameBoardImageTexture.ts resolves
// board.png via `new URL(...)`, which is handled by the module-level alias below, not
// by this one).
const sharedAlias = [
  { find: /^.*\/audio\/audioLibrary$/, replacement: mock('audioLibrary.js') },
  { find: /^.*\/audio\/calibrationAudio$/, replacement: mock('calibrationAudio.js') },
  { find: /^.*\/audio\/drumRotationSound$/, replacement: mock('drumRotationSound.js') },
  { find: /^.*\/GameBoardImageTexture$/, replacement: mock('gameBoardImageTexture.js') },
  { find: /^three$/, replacement: mock('three.js') },
  {
    find: /^three\/examples\/jsm\/controls\/OrbitControls\.js$/,
    replacement: mock('orbitControls.js'),
  },
  { find: /^three\/examples\/jsm\/loaders\/DRACOLoader\.js$/, replacement: mock('dracoLoader.js') },
  { find: /^three\/examples\/jsm\/loaders\/GLTFLoader\.js$/, replacement: mock('gltfLoader.js') },
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
];

const gsapAlias = { find: /^gsap$/, replacement: mock('gsap.js') };

// Standalone rather than a `test` block inside vite.config.ts: that file is the
// *library build* config (build.lib, rollupOptions.external including 'three' and
// 'gsap'), and combining that with aliasing those same names to mocks is not
// something worth reasoning about. Keeps `vite build` provably untouched.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.js'],
          include: ['tests/unit/**/*.test.ts'],
          alias: [...sharedAlias, gsapAlias],
        },
      },
      {
        extends: true,
        test: {
          // Needs REAL gsap: `tl.totalTime(t)` must actually advance tweens and
          // fire `tl.call` callbacks for the per-tick per-LED parity assertions
          // to mean anything. If this project's alias set ever picks up gsapAlias
          // by mistake, every assertion here would compare mocked-zero against
          // mocked-zero and pass without checking anything.
          name: 'snapshots',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.js'],
          include: ['tests/sequenceSnapshots/**/*.test.ts'],
          alias: sharedAlias,
        },
      },
    ],
  },
});
