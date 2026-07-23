/**
 * Node 22+ defines a global `localStorage` accessor gated behind `--localstorage-file`
 * (returns `undefined` without it). Vitest's jsdom environment only overrides globals it
 * already knows about, and `localStorage`/`sessionStorage` aren't on that allowlist — so
 * Node's inert getter shadows jsdom's real, working `Storage` before any test runs. Redirect
 * the global accessors to the jsdom window's actual storage, which vitest exposes at
 * `globalThis.jsdom.window` once the environment is set up.
 */
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (jsdomWindow) {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => jsdomWindow.localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    get: () => jsdomWindow.sessionStorage,
    configurable: true,
  });
}
