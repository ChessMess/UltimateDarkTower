import { serialize, deserialize } from 'node:v8';

// Polyfill structuredClone if the jsdom sandbox lacks it — Node's own lives on the
// outer global and is not visible inside the sandbox. V8 serialization gives the
// same semantics (Maps, Sets, Dates, cycles) as the browser implementation.
if (typeof globalThis.structuredClone !== 'function') {
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
