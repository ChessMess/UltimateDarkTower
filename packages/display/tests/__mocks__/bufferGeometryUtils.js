// Minimal stub of three's BufferGeometryUtils for the Jest suite (Node + jsdom).
// Only `mergeVertices` is used by SkullModelLoader; it is exercised at runtime,
// not unit-tested, so an identity pass-through is sufficient to keep imports from
// crashing the suite.
function mergeVertices(geometry) {
  return geometry;
}

const __mock = { mergeVertices };

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { mergeVertices: __e_mergeVertices } = __mock;
export { __e_mergeVertices as mergeVertices };
