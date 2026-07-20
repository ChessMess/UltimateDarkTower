const __mock = {
  RectAreaLightUniformsLib: {
    init() {},
  },
};

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { RectAreaLightUniformsLib: __e_RectAreaLightUniformsLib } = __mock;
export { __e_RectAreaLightUniformsLib as RectAreaLightUniformsLib };
