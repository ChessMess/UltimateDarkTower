// The L1→L2→L3 pipeline now lives in @udtc/adapters (shared with Player, which adds L4).
// Re-exported under the historical `runValidation` name so the store and its tests keep their
// import path and mock seam.
export { runScenarioValidation as runValidation } from '@udtc/adapters';
