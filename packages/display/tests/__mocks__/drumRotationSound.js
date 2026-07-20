// Tests run under Jest's CJS transformer, which can't parse `import.meta.url`
// in the real drumRotationSound.ts. No test exercises the actual asset URL, so a
// minimal stub is sufficient.
const __mock = {
  DRUM_ROTATION_SOUND_URL: 'mock://drumRotation.ogg',
};

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const { DRUM_ROTATION_SOUND_URL: __e_DRUM_ROTATION_SOUND_URL } = __mock;
export { __e_DRUM_ROTATION_SOUND_URL as DRUM_ROTATION_SOUND_URL };
