class EffectComposer {
  constructor() {
    this.passes = [];
    this.renderToScreen = true;
    this.renderTarget2 = { texture: null };
  }
  addPass() {}
  render() {}
  setSize() {}
  dispose() {}
}

class RenderPass {
  constructor() {}
}

class UnrealBloomPass {
  constructor(_resolution, strength, radius, threshold) {
    this.strength = strength ?? 1;
    this.radius = radius ?? 0;
    this.threshold = threshold ?? 0;
  }
}

class OutputPass {
  constructor() {}
}

class ShaderPass {
  constructor() {
    this.needsSwap = false;
    this.enabled = true;
  }
  setSize() {}
}

const __mock = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass };

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const {
  EffectComposer: __e_EffectComposer,
  RenderPass: __e_RenderPass,
  UnrealBloomPass: __e_UnrealBloomPass,
  OutputPass: __e_OutputPass,
  ShaderPass: __e_ShaderPass,
} = __mock;
export {
  __e_EffectComposer as EffectComposer,
  __e_RenderPass as RenderPass,
  __e_UnrealBloomPass as UnrealBloomPass,
  __e_OutputPass as OutputPass,
  __e_ShaderPass as ShaderPass,
};
