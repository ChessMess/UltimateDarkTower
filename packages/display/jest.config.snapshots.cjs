/**
 * Jest config for sequence snapshot tests.
 *
 * The main config (`jest.config.cjs`) maps `gsap` to a recording-only mock
 * that doesn't actually evaluate timelines. Snapshot tests need real GSAP so
 * `tl.totalTime(t)` actually advances tweens and fires `tl.call` callbacks.
 *
 * Run modes:
 *   npm test                   — verifies committed snapshots (read mode)
 *   npm run record-sequence-snapshots — overwrites snapshots (write mode)
 */
const base = require('./jest.config.cjs');

const moduleNameMapper = Object.fromEntries(
  Object.entries(base.moduleNameMapper).filter(([key]) => key !== '^gsap$'),
);

module.exports = {
  ...base,
  testMatch: ['<rootDir>/tests/sequenceSnapshots/**/*.(test|spec).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper,
};
