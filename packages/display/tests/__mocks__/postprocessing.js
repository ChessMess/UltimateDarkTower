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

module.exports = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass };
