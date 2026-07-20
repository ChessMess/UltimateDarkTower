import { defineConfig, coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Explicit include, for two reasons:
    //  - tests/integration/*.integration.ts need a real powered-on tower and are
    //    run separately via `test:integration`; jest excluded them the same way.
    //  - `build` emits compiled tests to dist/ (this package's tsconfig has no
    //    rootDir and does not exclude tests/), so a positive glob keeps the
    //    runner away from them.
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // coverage.exclude REPLACES the defaults rather than merging, so spread
      // them or node_modules ends up instrumented.
      exclude: [...coverageConfigDefaults.exclude, 'src/**/*.d.ts', 'src/index.ts'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
