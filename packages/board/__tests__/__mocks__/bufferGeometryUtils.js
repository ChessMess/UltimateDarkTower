// Minimal stub of `three/examples/jsm/utils/BufferGeometryUtils.js` for Jest.
//
// Display's physics chunk (which the 3D plugin imports for `loadSkullModel`) `require()`s
// the real module, but that ships as ESM and Jest's CJS transform can't parse it. The plugin
// tests only need the module to RESOLVE — they never call `loadSkullModel` — so provide a
// pass-through `mergeVertices` for the off chance it's ever invoked.
const __mock = {
  mergeVertices: (geometry) => geometry,
};

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { mergeVertices: __e_mergeVertices } = __mock;
export { __e_mergeVertices as mergeVertices };
