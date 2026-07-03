// Empty stand-in for the Node-only @stoprocent/noble BLE adapter. ultimatedarktower
// require()s this lazily inside a Node-guarded try/catch that never runs in a
// browser; aliasing it here (see vite.config.ts) gives both the dev pre-bundler and
// the production bundler a real module to resolve instead of externalizing a
// package that isn't installed.
export default {};
