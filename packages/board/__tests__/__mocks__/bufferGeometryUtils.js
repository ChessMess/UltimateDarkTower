// Minimal stub of `three/examples/jsm/utils/BufferGeometryUtils.js` for Jest.
//
// Display's physics chunk (which the 3D plugin imports for `loadSkullModel`) `require()`s
// the real module, but that ships as ESM and Jest's CJS transform can't parse it. The plugin
// tests only need the module to RESOLVE — they never call `loadSkullModel` — so provide a
// pass-through `mergeVertices` for the off chance it's ever invoked.
module.exports = {
  mergeVertices: (geometry) => geometry,
};
