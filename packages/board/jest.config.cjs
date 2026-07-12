module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.(test|spec).+(ts|tsx|js)'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  // Polyfills the jsdom sandbox (structuredClone) — needed to construct a real
  // Tower3DView in the plugin integration test. Ported from Display's harness.
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  moduleNameMapper: {
    // ultimatedarktower's ESM build uses createRequire (unavailable under Jest's
    // CJS transform); map to its CJS build, the way Display's jest config does.
    '^ultimatedarktower$': '<rootDir>/node_modules/ultimatedarktower/dist/src/index.js',

    // Plugin tests construct a REAL Tower3DView. Display's dist is valid CJS that
    // `require()`s three/addons/gsap as externals, so mock those to run WebGL-free
    // in jsdom (mocks ported from Display's test harness). Pin Display to its CJS
    // build (its package `main` is `.cjs.js`, which Node treats as ESM under
    // `type:module`; Jest's CJS loader needs the explicit CJS path).
    '^ultimatedarktowerdisplay$':
      '<rootDir>/node_modules/ultimatedarktowerdisplay/dist/index.cjs.js',
    // The 3D plugin imports `loadSkullModel` from Display's `/physics` subpath; pin it
    // to the CJS chunk (same reason as the root entry above). GLTF/DRACO it require()s
    // are mocked below; loading this only resolves the module (tests don't call it).
    '^ultimatedarktowerdisplay/physics$':
      '<rootDir>/node_modules/ultimatedarktowerdisplay/dist/physics.cjs.js',
    '^three$': '<rootDir>/__tests__/__mocks__/three.js',
    '^three/examples/jsm/controls/OrbitControls\\.js$':
      '<rootDir>/__tests__/__mocks__/orbitControls.js',
    '^three/examples/jsm/loaders/DRACOLoader\\.js$': '<rootDir>/__tests__/__mocks__/dracoLoader.js',
    '^three/examples/jsm/loaders/GLTFLoader\\.js$': '<rootDir>/__tests__/__mocks__/gltfLoader.js',
    '^three/examples/jsm/loaders/HDRLoader\\.js$': '<rootDir>/__tests__/__mocks__/hdrLoader.js',
    // Pulled in by Display's physics chunk (for `loadSkullModel`); the real module is ESM,
    // which Jest's CJS transform can't parse, so stub it.
    '^three/examples/jsm/utils/BufferGeometryUtils\\.js$':
      '<rootDir>/__tests__/__mocks__/bufferGeometryUtils.js',
    '^three/examples/jsm/lights/RectAreaLightUniformsLib\\.js$':
      '<rootDir>/__tests__/__mocks__/rectAreaLightUniformsLib.js',
    '^three/addons/postprocessing/.*$': '<rootDir>/__tests__/__mocks__/postprocessing.js',
    '^gsap$': '<rootDir>/__tests__/__mocks__/gsap.js',
  },
};
