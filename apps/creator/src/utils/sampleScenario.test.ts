import { describe, expect, it } from 'vitest';
import { SAMPLE_SCENARIO } from './sampleScenario';
import { CURRENT_SCHEMA_VERSION, isSupportedSchemaVersion } from './schemaVersion';

// Regression guard: the sample scenario ("Load Sample Scenario" in ScenarioBar) funnels through
// store.loadScenario like any other document, which refuses (not migrates) anything whose
// schemaVersion doesn't exactly match CURRENT_SCHEMA_VERSION. If @udtc/engine's goldenFull fixture
// falls behind a schema bump, the sample becomes permanently unloadable — the dialog fires, "OK"
// dismisses it, and the user is left with nothing (this exact bug happened when 0.5.0 shipped).
describe('SAMPLE_SCENARIO schema version', () => {
  it('matches CURRENT_SCHEMA_VERSION so it never trips the refuse-guard', () => {
    expect(SAMPLE_SCENARIO.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(isSupportedSchemaVersion(SAMPLE_SCENARIO.schemaVersion)).toBe(true);
  });
});
