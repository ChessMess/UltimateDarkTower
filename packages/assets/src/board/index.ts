// The full-resolution board only.
//
// This module deliberately contains ONE asset. Vite's `emitFile` runs in the `transform` hook,
// *before* tree-shaking, so every asset a module references is written to disk even when the
// export is unused — the module split IS the granularity. Putting both board variants here made
// `apps/creator` emit the 22 MB PNG it explicitly does not want, just for importing the small one.
// Use `@udtc/assets/board-small` for backdrops and 2D maps.

/** The full-resolution Return to Dark Tower board (4096², ~22 MB PNG). */
export const boardFullPng: string = new URL('../../board/board.png', import.meta.url).href;
