// Tests run under Jest's CJS transformer, which can't parse `import.meta.url`
// in the real calibrationAudio.ts. No test exercises the actual asset URL, so a
// minimal stub is sufficient.
module.exports = {
  CALIBRATION_SOUND_URL: 'mock://calibration.ogg',
};
