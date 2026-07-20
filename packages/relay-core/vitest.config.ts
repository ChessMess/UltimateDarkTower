import { defineConfig } from 'vitest/config';

// Tests here use bare `describe`/`it`/`expect` with no `from 'vitest'` imports.
// That used to work via a `--globals` flag on the `test` script, which meant a
// bare `vitest run` in this directory failed with `describe is not defined`.
// Declaring it in config keeps the runner invocation-independent.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
