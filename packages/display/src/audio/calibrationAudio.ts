// The bytes and the `new URL(...)` expression live in `@udtc/assets/audio-effects`; this module
// stays as the stable internal specifier (tests alias it — see vitest.config.ts) and as the
// package's own name for the sound.
//
// Kept separate from audioLibrary.ts because scripts/extract-audio.mjs regenerates that file
// wholesale and would wipe a hand-added export.

/** Bundled calibration-sweep recording. Played only during the calibration command. */
export { calibrationSoundUrl as CALIBRATION_SOUND_URL } from '@udtc/assets/audio-effects';
