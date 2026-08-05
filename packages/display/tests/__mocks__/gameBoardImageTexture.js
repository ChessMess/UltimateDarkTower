// No test exercises real image-texture loading (three's TextureLoader is mocked
// and the ground disc falls back to the procedural texture), so a stub whose
// loader resolves `null` is sufficient. The stub is deliberately variadic —
// `buildBoardTextureFromImage(url, maxAnisotropy, northKingdom)` takes a
// consumer-supplied URL since the board art stopped being bundled.
//
// The pure `getBoardTextureRotation` math lives in `boardTextureRotation.ts` and
// is imported directly by production code and tests, so it is NOT stubbed here.
const __mock = {
  buildBoardTextureFromImage: async () => null,
};

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { buildBoardTextureFromImage: __e_buildBoardTextureFromImage } = __mock;
export { __e_buildBoardTextureFromImage as buildBoardTextureFromImage };
