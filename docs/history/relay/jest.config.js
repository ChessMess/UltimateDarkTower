module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/*.(test|spec).+(ts|tsx|js)'],
  // Explicit ts-jest config: always compile to CommonJS for Jest, regardless
  // of what individual package tsconfigs specify.
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
    '^ultimatedarktowerrelay-shared$': '<rootDir>/packages/shared/src/index.ts',
    '^ultimatedarktowerrelay-shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^ultimatedarktowerrelay-core$': '<rootDir>/packages/core/src/index.ts',
    '^ultimatedarktowerrelay-core/(.*)$': '<rootDir>/packages/core/src/$1',
    '^ultimatedarktowerrelay-client$': '<rootDir>/packages/client/src/index.ts',
    '^ultimatedarktowerrelay-client/(.*)$': '<rootDir>/packages/client/src/$1',
    '^ultimatedarktower$': '<rootDir>/node_modules/ultimatedarktower/dist/src/index.js',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
