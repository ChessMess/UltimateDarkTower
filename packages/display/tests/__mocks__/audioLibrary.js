// Tests run under Jest's CJS transformer, which can't parse `import.meta.url`
// in the real audioLibrary.ts. None of the tests actually exercise the sample
// URLs (TowerSampleAudio.test.ts builds its own inline library), so a minimal
// stub is sufficient.
module.exports = {
  DEFAULT_TOWER_SOUND_PACK: {
    name: 'mock',
    description: 'mock',
    samples: {},
  },
  buildOfficialSoundPack: (baseUrl) => ({
    name: 'mock',
    description: 'mock',
    samples: {},
  }),
  hasDefaultAudioAsset: (sample) => sample === 0,
};
