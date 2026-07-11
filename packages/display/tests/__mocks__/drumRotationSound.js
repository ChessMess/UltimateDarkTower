// Tests run under Jest's CJS transformer, which can't parse `import.meta.url`
// in the real drumRotationSound.ts. No test exercises the actual asset URL, so a
// minimal stub is sufficient.
module.exports = {
  DRUM_ROTATION_SOUND_URL: 'mock://drumRotation.ogg',
};
