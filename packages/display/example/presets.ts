import type { TowerState } from 'ultimatedarktower';
import {
  createDefaultTowerState,
  LIGHT_EFFECTS,
  TOWER_AUDIO_LIBRARY,
} from 'ultimatedarktower';
import { DEFAULT_SEQUENCE_AUDIO_MAP } from '../src/index';

const lightEffects = Object.values(LIGHT_EFFECTS).filter(
  (value): value is number => typeof value === 'number'
);
const audioSamples = Object.values(TOWER_AUDIO_LIBRARY).map((entry) => entry.value);

export function createReadmeExampleState(): TowerState {
  const state = createDefaultTowerState();

  state.layer[0].light[0].effect = LIGHT_EFFECTS.on;
  state.layer[0].light[1].effect = LIGHT_EFFECTS.breathe;
  state.drum[0].position = 1;
  state.drum[0].calibrated = true;
  state.beam.count = 2;

  return state;
}

export function createRandomState(): TowerState {
  const state = createDefaultTowerState();

  for (const layer of state.layer) {
    for (const light of layer.light) {
      light.effect = lightEffects[Math.floor(Math.random() * lightEffects.length)];
      light.loop = Math.random() > 0.5;
    }
  }

  for (const drum of state.drum) {
    drum.position = Math.floor(Math.random() * 4);
    drum.calibrated = Math.random() > 0.3;
  }

  state.audio.sample = audioSamples[Math.floor(Math.random() * audioSamples.length)];
  state.audio.loop = Math.random() > 0.5;
  state.audio.volume = Math.floor(Math.random() * 4);

  state.beam.count = Math.floor(Math.random() * 6);
  state.beam.fault = Math.random() > 0.8;

  // Keep LED sequence override empty/off when randomizing.
  state.led_sequence = 0;

  return state;
}

export function createAllOnState(): TowerState {
  const state = createDefaultTowerState();
  for (const layer of state.layer) {
    for (const light of layer.light) {
      light.effect = LIGHT_EFFECTS.on;
    }
  }
  return state;
}

export const SEQUENCE_AUDIO_MAP: Readonly<Record<number, number>> = DEFAULT_SEQUENCE_AUDIO_MAP;

export function createSequenceState(sequenceId: number, base?: TowerState): TowerState {
  const state = base ? structuredClone(base) : createDefaultTowerState();
  state.led_sequence = sequenceId;
  const sample = SEQUENCE_AUDIO_MAP[sequenceId];
  if (sample !== undefined) {
    state.audio.sample = sample;
    state.audio.loop = false;
    state.audio.volume = 0;
  }
  return state;
}

export function createEmptyState(): TowerState {
  return createDefaultTowerState();
}
