// Jest 29 ships jsdom 20, which predates the global `structuredClone`. Node's
// own structuredClone lives on the outer global and is not visible inside the
// jsdom sandbox, so polyfill it here using V8 serialization — same semantics
// (Maps, Sets, Dates, cycles) as the browser implementation.
if (typeof globalThis.structuredClone !== 'function') {
  const { serialize, deserialize } = require('node:v8');
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}

// jsdom 20 has no ResizeObserver; Tower3DView observes its container on init.
// A no-op stub is enough — the plugin integration test never resizes.
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// NOTE: deliberately NOT stubbing HTMLCanvasElement.getContext. jsdom returns null,
// so Display's SealManager gradient build logs a benign (caught) warning during the
// real Tower3DView model load — the SAME noise Display's own suite emits. Providing
// a 2D context makes Display reach a deeper bloom/post-processing path the ported
// mocks don't cover, which crashes; the null short-circuit is the safer baseline.
