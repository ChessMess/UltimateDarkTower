import { TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES } from 'ultimatedarktower';

/**
 * Default mapping of light-sequence names to audio-sample names, matching the
 * official Restoration Games audio cues. This is the source of truth for
 * `DEFAULT_SEQUENCE_AUDIO_MAP`.
 *
 * Edit a value to change which sample plays for a sequence. Remove an entry to
 * silence that sequence. Both keys and values are statically typed against
 * UDT's `TOWER_LIGHT_SEQUENCES` and `TOWER_AUDIO_LIBRARY`, so typos are caught
 * at compile time.
 */
const DEFAULT_SEQUENCE_AUDIO_CONFIG: Partial<
  Record<keyof typeof TOWER_LIGHT_SEQUENCES, keyof typeof TOWER_AUDIO_LIBRARY>
> = {
  gloat01: 'TowerGloat1',
  gloat02: 'TowerGloat2',
  gloat03: 'TowerGloat3',
  angryStrobe01: 'TowerAngry1',
  angryStrobe02: 'TowerAngry2',
  angryStrobe03: 'TowerAngry3',
  victory: 'BattleVictory',
  defeat: 'MonthEnded',
  dungeonIdle: 'DungeonCaves',
  sealReveal: 'TowerSeal',
  monthStarted: 'MonthStarted',
  flareThenFlicker: 'FoeEvent',
  flareThenFade: 'FoeSpawn',
  flareThenFadeBase: 'FoeSpawn',
  slowFlareThenFade: 'FoeSpawn',
};

/**
 * Resolve a name-keyed sequence/audio config into the numeric `sequence-id →
 * sample-id` map used at runtime. Useful for authoring a custom map in
 * type-safe form rather than handwriting hex IDs.
 *
 * @example
 *   const myMap = buildSequenceAudioMap({
 *     victory: 'TowerGloat1',
 *     defeat:  'ClassicTowerLost',
 *   });
 *   display.applyAudioConfig({ sequenceMap: myMap, bindSequenceToSample: true });
 */
export function buildSequenceAudioMap(
  entries: Partial<Record<keyof typeof TOWER_LIGHT_SEQUENCES, keyof typeof TOWER_AUDIO_LIBRARY>>,
): Record<number, number> {
  const result: Record<number, number> = {};
  for (const [seqName, audioName] of Object.entries(entries) as [
    keyof typeof TOWER_LIGHT_SEQUENCES,
    keyof typeof TOWER_AUDIO_LIBRARY,
  ][]) {
    const seqId = TOWER_LIGHT_SEQUENCES[seqName];
    const sampleId = TOWER_AUDIO_LIBRARY[audioName]?.value;
    if (seqId !== undefined && sampleId !== undefined) {
      result[seqId] = sampleId;
    }
  }
  return result;
}

/**
 * Default sequence-id → sample-id binding for the official pack. Used when
 * `AudioConfig.bindSequenceToSample` is true and neither `AudioConfig.sequenceMap`
 * nor `pack.sequenceMap` overrides it.
 */
export const DEFAULT_SEQUENCE_AUDIO_MAP: Readonly<Record<number, number>> = Object.freeze(
  buildSequenceAudioMap(DEFAULT_SEQUENCE_AUDIO_CONFIG),
);
