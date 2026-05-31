module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.(test|spec).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/sequenceSnapshots/'],
  setupFiles: ['<rootDir>/tests/setup.js'],
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
  moduleNameMapper: {
    '^ultimatedarktower$': '<rootDir>/node_modules/ultimatedarktower/dist/src/index.js',
    // The real audioLibrary.ts uses `import.meta.url` per asset which Jest's
    // CJS transformer can't parse. Tests don't exercise the bundled samples
    // (TowerSampleAudio.test.ts uses its own inline library), so a stub is
    // sufficient.
    '.*/audio/audioLibrary$': '<rootDir>/tests/__mocks__/audioLibrary.js',
    // Same reason as audioLibrary: calibrationAudio.ts uses `import.meta.url`.
    '.*/audio/calibrationAudio$': '<rootDir>/tests/__mocks__/calibrationAudio.js',
    '\\.svg\\?raw$': '<rootDir>/tests/__mocks__/svgRaw.js',
    '\\.glb\\?url$': '<rootDir>/tests/__mocks__/glbUrl.js',
    '\\.png$': '<rootDir>/tests/__mocks__/pngUrl.js',
    '^three$': '<rootDir>/tests/__mocks__/three.js',
    '^three/examples/jsm/controls/OrbitControls\\.js$':
      '<rootDir>/tests/__mocks__/orbitControls.js',
    '^three/examples/jsm/loaders/DRACOLoader\\.js$': '<rootDir>/tests/__mocks__/dracoLoader.js',
    '^three/examples/jsm/loaders/GLTFLoader\\.js$': '<rootDir>/tests/__mocks__/gltfLoader.js',
    '^three/examples/jsm/loaders/HDRLoader\\.js$': '<rootDir>/tests/__mocks__/hdrLoader.js',
    '^three/examples/jsm/lights/RectAreaLightUniformsLib\\.js$':
      '<rootDir>/tests/__mocks__/rectAreaLightUniformsLib.js',
    '^three/addons/postprocessing/.*$': '<rootDir>/tests/__mocks__/postprocessing.js',
    '^gsap$': '<rootDir>/tests/__mocks__/gsap.js',
  },
};
