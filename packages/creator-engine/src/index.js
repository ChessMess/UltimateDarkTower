// Public API entry point. Re-exports the stable surface from engine.js.
// Tests import from ../src/engine directly to access __internals.
const engine = require('./engine');
const { golden } = require('./golden-fixture');

module.exports = {
  init: engine.init,
  step: engine.step,
  replay: engine.replay,
  serialize: engine.serialize,
  deserialize: engine.deserialize,
  digest: engine.digest,
  evalCondition: engine.evalCondition,
  ENGINE_VERSION: engine.ENGINE_VERSION,
  SUPPORTED_SCHEMA_RANGE: engine.SUPPORTED_SCHEMA_RANGE,
  golden,
};
