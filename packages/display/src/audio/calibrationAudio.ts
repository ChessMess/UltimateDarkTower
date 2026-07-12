// Per-file `new URL('./assets/<literal>', import.meta.url)` is the canonical
// bundler-detected asset pattern (see audioLibrary.ts for the rationale). Kept
// in its own module rather than audioLibrary.ts because scripts/extract-audio.mjs
// regenerates that file wholesale and would wipe a hand-added export.

/** Bundled calibration-sweep recording. Played only during the calibration command. */
export const CALIBRATION_SOUND_URL = new URL('./assets/drumCalibration.ogg', import.meta.url).href;
