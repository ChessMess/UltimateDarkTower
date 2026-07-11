// Jest 29 ships jsdom 20, which predates the global `structuredClone`. Node's
// own structuredClone lives on the outer global and is not visible inside the
// jsdom sandbox, so polyfill it here using V8 serialization — same semantics
// (Maps, Sets, Dates, cycles) as the browser implementation.
if (typeof globalThis.structuredClone !== 'function') {
  const { serialize, deserialize } = require('node:v8');
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}

// jsdom has no native 2D canvas renderer (the optional `canvas` npm package
// isn't installed), so `HTMLCanvasElement.getContext('2d')` logs a "not
// implemented" console.error on every call and returns null. The library's
// procedural canvas textures (board art in GameBoardTexture.ts, LED/seal halo
// gradients in Tower3DView.ts / SealManager.ts) already handle a null context
// gracefully, but the console.error is just test-run noise. Stub `getContext`
// with a no-op 2D context so those code paths run silently under test instead
// of hitting the null fallback.
if (typeof HTMLCanvasElement !== 'undefined') {
  const noop = () => {};
  const stubGradient = { addColorStop: noop };
  const stub2DContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    save: noop,
    restore: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    ellipse: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    createRadialGradient: () => stubGradient,
    createLinearGradient: () => stubGradient,
  };
  HTMLCanvasElement.prototype.getContext = function (contextId) {
    return contextId === '2d' ? stub2DContext : null;
  };
}
