class DRACOLoader {
  setDecoderPath(_path) {
    return this;
  }

  dispose() {}
}

const __mock = { DRACOLoader };

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { DRACOLoader: __e_DRACOLoader } = __mock;
export { __e_DRACOLoader as DRACOLoader };
