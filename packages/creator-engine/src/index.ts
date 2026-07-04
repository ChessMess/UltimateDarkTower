// Public API entry point. Re-exports the stable surface from engine.ts.
// Tests import from ../dist/engine directly to access __internals.
import { init, step, replay, serialize, deserialize, digest, evalCondition, ENGINE_VERSION, SUPPORTED_SCHEMA_RANGE } from './engine';
import { golden as goldenFixture, goldenFull as goldenFullFixture } from './golden-fixture';

// golden/goldenFull stay typed `unknown` at the public boundary (matching the pre-port hand-written
// declaration) rather than exposing golden-fixture.ts's large inferred literal shape — that shape is
// an accident of how the fixture happens to be written today, not a stable contract worth publishing.
const golden: unknown = goldenFixture;
const goldenFull: unknown = goldenFullFixture;

export {
  init,
  step,
  replay,
  serialize,
  deserialize,
  digest,
  evalCondition,
  ENGINE_VERSION,
  SUPPORTED_SCHEMA_RANGE,
  golden,
  goldenFull,
};
export * from './engine/types';
