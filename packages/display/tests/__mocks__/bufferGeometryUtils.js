// Minimal stub of three's BufferGeometryUtils for the Jest suite (Node + jsdom).
// Only `mergeVertices` is used by SkullModelLoader; it is exercised at runtime,
// not unit-tested, so an identity pass-through is sufficient to keep imports from
// crashing the suite.
function mergeVertices(geometry) {
  return geometry;
}

module.exports = { mergeVertices };
