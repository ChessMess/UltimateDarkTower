module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/*.(test|spec).+(ts|tsx|js)'],
  // Explicit ts-jest config: always compile to CommonJS for Jest, regardless
  // of what individual package tsconfigs specify (some use ESNext/bundler).
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          resolveJsonModule: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    // The relay SDK (ultimatedarktowerrelay-*) resolves via node_modules (file: deps → built dist).
    // ultimatedarktower's CJS entry is mapped so the relay shared dist can require it under jest.
    '^ultimatedarktower$': '<rootDir>/node_modules/ultimatedarktower/dist/src/index.js',
  },
  collectCoverageFrom: [
    // Only the logic modules covered by the remaining unit tests. The browser/UI
    // entrypoints (app.ts, ui.ts) pull in three/rapier/Display and can't be
    // instrumented under the node test environment, so they're not collected.
    'packages/client/src/clientLogger.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
