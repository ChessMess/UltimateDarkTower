import { defineConfig } from 'vitest/config';

// See packages/relay-core/vitest.config.ts — same rationale: these tests rely on
// ambient globals, so `globals` belongs in config rather than a CLI flag.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
