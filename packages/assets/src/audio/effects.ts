// The two hand-maintained sound effects, kept out of ./index.ts because that file is regenerated
// wholesale by `packages/display/scripts/extract-audio.mjs` and would wipe a hand-added export.
// (`packages/display/src/audio/{calibrationAudio,drumRotationSound}.ts` split for the same reason
// and now just re-export these.)
//
// A new `new URL('../../audio/*.ogg', import.meta.url)` module here must also be added to
// URL_ASSET_HOSTS in `packages/display/vite.config.ts`, or display's library build base64-inlines
// the bytes instead of emitting a file. See packages/display/docs/AUDIO.md → "Adding a bundled
// sound to the library".

/** Bundled calibration-sweep recording. Played only during the calibration command. */
export const calibrationSoundUrl: string = new URL(
  '../../audio/drumCalibration.ogg',
  import.meta.url,
).href;

/**
 * Bundled drum-rotation recording. A finite, complete-rotation clip: played once (no loop) from
 * the start when a drum begins turning and cut to the exact rotation length when the drum settles,
 * so it never plays longer than the drum turns.
 */
export const drumRotationSoundUrl: string = new URL('../../audio/drumRotation.ogg', import.meta.url)
  .href;
