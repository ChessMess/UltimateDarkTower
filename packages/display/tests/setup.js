// Jest 29 ships jsdom 20, which predates the global `structuredClone`. Node's
// own structuredClone lives on the outer global and is not visible inside the
// jsdom sandbox, so polyfill it here using V8 serialization — same semantics
// (Maps, Sets, Dates, cycles) as the browser implementation.
if (typeof globalThis.structuredClone !== 'function') {
  const { serialize, deserialize } = require('node:v8');
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}
