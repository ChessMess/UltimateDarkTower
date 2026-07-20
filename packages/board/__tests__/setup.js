import { serialize, deserialize } from 'node:v8';

// Polyfill structuredClone if the jsdom sandbox lacks it — Node's own lives on the
// outer global and is not visible inside the sandbox. V8 serialization gives the
// same semantics (Maps, Sets, Dates, cycles) as the browser implementation.
// Needed to construct a real Tower3DView in the plugin integration test.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}

// jsdom has no ResizeObserver; Tower3DView observes its container on init.
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
//
// This is why board's setup and display's setup must NOT be merged into a shared
// helper, despite otherwise overlapping heavily.
