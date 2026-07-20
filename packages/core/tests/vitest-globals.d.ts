// Ambient vitest globals (`describe`, `it`, `expect`, `vi`, …) for the test suite.
//
// vitest.config.ts sets `globals: true`, so the tests use them without importing.
// This package's tsconfig has no `types` array on purpose — it relies on tsc
// auto-including every hoisted @types package (node, web-bluetooth, …), and
// adding `"types": [...]` would switch that off and have to enumerate them all.
// A reference file adds the vitest globals without disturbing that.
/// <reference types="vitest/globals" />
