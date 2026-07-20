// Tests run under Jest's CJS transformer, which can't parse `import.meta.url`
// in the real audioLibrary.ts. None of the tests actually exercise the sample
// URLs (TowerSampleAudio.test.ts builds its own inline library), so a minimal
// stub is sufficient.
const __mock = {
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

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const {
  DEFAULT_TOWER_SOUND_PACK: __e_DEFAULT_TOWER_SOUND_PACK,
  buildOfficialSoundPack: __e_buildOfficialSoundPack,
  hasDefaultAudioAsset: __e_hasDefaultAudioAsset,
} = __mock;
export {
  __e_DEFAULT_TOWER_SOUND_PACK as DEFAULT_TOWER_SOUND_PACK,
  __e_buildOfficialSoundPack as buildOfficialSoundPack,
  __e_hasDefaultAudioAsset as hasDefaultAudioAsset,
};
