// The bytes and the `new URL(...)` expression live in `@udtc/assets/audio-effects`; this module
// stays as the stable internal specifier (tests alias it — see vitest.config.ts) and as the
// package's own name for the sound.
//
// Kept separate from audioLibrary.ts because scripts/extract-audio.mjs regenerates that file
// wholesale and would wipe a hand-added export.
//
// NOTE: a new hand-maintained `new URL('../../audio/*.ogg')` entry in
// `@udtc/assets/src/audio/effects.ts` must also be reachable from URL_ASSET_HOSTS in
// vite.config.ts, or the library build base64-inlines the bytes instead of emitting a separate
// file. See docs/AUDIO.md → "Adding a bundled sound to the library".

/**
 * Bundled drum-rotation recording. Default sound for individual drum rotations
 * in the 3D view. A finite, complete-rotation clip: played once (no loop) from
 * the start when a drum begins turning and cut to the exact rotation length when
 * the drum settles, so it never plays longer than the drum turns.
 */
export { drumRotationSoundUrl as DRUM_ROTATION_SOUND_URL } from '@udtc/assets/audio-effects';
