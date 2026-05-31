// Per-file `new URL('./assets/<literal>', import.meta.url)` is the canonical
// bundler-detected asset pattern (see audioLibrary.ts for the rationale). Kept
// in its own module rather than audioLibrary.ts because scripts/extract-audio.mjs
// regenerates that file wholesale and would wipe a hand-added export.
//
// NOTE: a new hand-maintained `new URL('./assets/*.ogg')` module like this one
// must also be added to OGG_URL_HOSTS in vite.config.ts, or the library build
// base64-inlines the bytes instead of emitting a separate file. See
// docs/AUDIO.md → "Adding a bundled sound to the library".

/**
 * Bundled drum-rotation recording. Default sound for individual drum rotations
 * in the 3D view. A finite, complete-rotation clip: played once (no loop) from
 * the start when a drum begins turning and cut to the exact rotation length when
 * the drum settles, so it never plays longer than the drum turns.
 */
export const DRUM_ROTATION_SOUND_URL =
  new URL('./assets/drumRotation.ogg', import.meta.url).href;
