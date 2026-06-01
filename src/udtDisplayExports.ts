// Barrel of the cycle-free public surface that the UltimateDarkTowerDisplay
// package consumes via the bundled `ultimatedarktower` alias. It must NOT import
// (directly or transitively) UltimateDarkTower.ts — pulling that in re-creates the
// circular dependency that makes esbuild lazily wrap modules and breaks the Display
// package's module-level constant initialization (see build-examples.js).
export * from './udtConstants';
export { createDefaultTowerState } from './udtHelpers';
