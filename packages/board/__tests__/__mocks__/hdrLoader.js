class HDRLoader {
  load(_url, onLoad, _onProgress, _onError) {
    if (onLoad) onLoad({ mapping: 0, dispose() {} });
  }
}

const __mock = { HDRLoader };

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { HDRLoader: __e_HDRLoader } = __mock;
export { __e_HDRLoader as HDRLoader };
