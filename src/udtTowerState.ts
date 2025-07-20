import {
  TOWER_LAYERS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  LED_CHANNEL_LOOKUP,
  LAYER_TO_POSITION,
  LIGHT_INDEX_TO_DIRECTION,
  STATE_DATA_LENGTH
} from './udtConstants';

// TypeScript interfaces for tower state structure
interface Light {
  effect: number;
  loop: boolean;
}

interface Layer {
  light: [Light, Light, Light, Light];
}

interface Drum {
  jammed: boolean;
  calibrated: boolean;
  position: number;
  playSound: boolean;
  reverse: boolean;
}

interface Audio {
  sample: number;
  loop: boolean;
  volume: number;
}

interface Beam {
  count: number;
  fault: boolean;
}

interface TowerState {
  drum: [Drum, Drum, Drum];
  layer: [Layer, Layer, Layer, Layer, Layer, Layer];
  audio: Audio;
  beam: Beam;
  led_sequence: number;
}

/**
 * Unpacks binary data from the tower into a structured TowerState object.
 * Extracts drum states, LED configurations, audio settings, beam counter, and LED sequences.
 * 
 * @param data - The raw binary data received from the tower (must be at least STATE_DATA_LENGTH bytes)
 * @returns A TowerState object containing all the parsed tower state information
 */
function rtdt_unpack_state(data: Uint8Array): TowerState {

  // Padding is aligns the different sections on byte boundaries
  const state: TowerState = {
    drum: [
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
      { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
    ],
    layer: [
      { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
      { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
      { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
      { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
      { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
      { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
    ],
    audio: { sample: 0, loop: false, volume: 0 },
    beam: { count: 0, fault: false },
    led_sequence: 0
  };

  // Bytes 0-1: Drum states
  state.drum[0].jammed = !!(data[0] & 0b00001000);
  state.drum[0].calibrated = !!(data[0] & 0b00010000);
  state.drum[1].jammed = !!(data[1] & 0b00000001);
  state.drum[1].calibrated = !!(data[1] & 0b00000010);
  state.drum[2].jammed = !!(data[1] & 0b00100000);
  state.drum[2].calibrated = !!(data[1] & 0b01000000);

  // 4 stopping locations, low bit defines whether or not 
  // to play a sound during rotation
  // not recommended to play sound during rotation due to battery draw
  state.drum[0].position = (data[0] & 0b00000110) >> 1;
  state.drum[1].position = (data[0] & 0b11000000) >> 6;
  state.drum[2].position = (data[1] & 0b00011000) >> 3;
  state.drum[0].playSound = !!(data[0] & 0b00000001);
  state.drum[1].playSound = !!(data[0] & 0b00100000);
  state.drum[2].playSound = !!(data[1] & 0b00000100);

  // Bytes 2-13: LED states
  state.layer[0].light[0].effect = (data[2] & 0b11100000) >> 5;
  state.layer[0].light[0].loop = !!(data[2] & 0b00010000);
  state.layer[0].light[1].effect = (data[2] & 0b00001110) >> 1;
  state.layer[0].light[1].loop = !!(data[2] & 0b00000001);
  state.layer[0].light[2].effect = (data[3] & 0b11100000) >> 5;
  state.layer[0].light[2].loop = !!(data[3] & 0b00010000);
  state.layer[0].light[3].effect = (data[3] & 0b00001110) >> 1;
  state.layer[0].light[3].loop = !!(data[3] & 0b00000001);

  state.layer[1].light[0].effect = (data[4] & 0b11100000) >> 5;
  state.layer[1].light[0].loop = !!(data[4] & 0b00010000);
  state.layer[1].light[1].effect = (data[4] & 0b00001110) >> 1;
  state.layer[1].light[1].loop = !!(data[4] & 0b00000001);
  state.layer[1].light[2].effect = (data[5] & 0b11100000) >> 5;
  state.layer[1].light[2].loop = !!(data[5] & 0b00010000);
  state.layer[1].light[3].effect = (data[5] & 0b00001110) >> 1;
  state.layer[1].light[3].loop = !!(data[5] & 0b00000001);

  state.layer[2].light[0].effect = (data[6] & 0b11100000) >> 5;
  state.layer[2].light[0].loop = !!(data[6] & 0b00010000);
  state.layer[2].light[1].effect = (data[6] & 0b00001110) >> 1;
  state.layer[2].light[1].loop = !!(data[6] & 0b00000001);
  state.layer[2].light[2].effect = (data[7] & 0b11100000) >> 5;
  state.layer[2].light[2].loop = !!(data[7] & 0b00010000);
  state.layer[2].light[3].effect = (data[7] & 0b00001110) >> 1;
  state.layer[2].light[3].loop = !!(data[7] & 0b00000001);

  state.layer[3].light[0].effect = (data[8] & 0b11100000) >> 5;
  state.layer[3].light[0].loop = !!(data[8] & 0b00010000);
  state.layer[3].light[1].effect = (data[8] & 0b00001110) >> 1;
  state.layer[3].light[1].loop = !!(data[8] & 0b00000001);
  state.layer[3].light[2].effect = (data[9] & 0b11100000) >> 5;
  state.layer[3].light[2].loop = !!(data[9] & 0b00010000);
  state.layer[3].light[3].effect = (data[9] & 0b00001110) >> 1;
  state.layer[3].light[3].loop = !!(data[9] & 0b00000001);

  state.layer[4].light[0].effect = (data[10] & 0b11100000) >> 5;
  state.layer[4].light[0].loop = !!(data[10] & 0b00010000);
  state.layer[4].light[1].effect = (data[10] & 0b00001110) >> 1;
  state.layer[4].light[1].loop = !!(data[10] & 0b00000001);
  state.layer[4].light[2].effect = (data[11] & 0b11100000) >> 5;
  state.layer[4].light[2].loop = !!(data[11] & 0b00010000);
  state.layer[4].light[3].effect = (data[11] & 0b00001110) >> 1;
  state.layer[4].light[3].loop = !!(data[11] & 0b00000001);

  state.layer[5].light[0].effect = (data[12] & 0b11100000) >> 5;
  state.layer[5].light[0].loop = !!(data[12] & 0b00010000);
  state.layer[5].light[1].effect = (data[12] & 0b00001110) >> 1;
  state.layer[5].light[1].loop = !!(data[12] & 0b00000001);
  state.layer[5].light[2].effect = (data[13] & 0b11100000) >> 5;
  state.layer[5].light[2].loop = !!(data[13] & 0b00010000);
  state.layer[5].light[3].effect = (data[13] & 0b00001110) >> 1;
  state.layer[5].light[3].loop = !!(data[13] & 0b00000001);

  // Byte 14: Audio
  state.audio.sample = data[14] & 0b01111111;
  state.audio.loop = !!(data[14] & 0b10000000);

  // Bytes 15-17: Beam, drum-reversing, volume
  // DO NOT run the drums in reverse!
  state.beam.count = (data[15] << 8) | data[16];
  state.beam.fault = !!(data[17] & 0b00000001);
  state.drum[0].reverse = !!(data[17] & 0b00000010); // DON'T
  state.drum[1].reverse = !!(data[17] & 0b00000100); // USE
  state.drum[2].reverse = !!(data[17] & 0b00001000); // THESE
  state.audio.volume = (data[17] & 0b11110000) >> 4;

  // Byte 18: LED sequences
  state.led_sequence = data[18];

  return state;
}

/**
 * Packs a TowerState object into binary data format for transmission to the tower.
 * Serializes drum states, LED configurations, audio settings, beam counter, and LED sequences.
 * 
 * @param data - The output buffer to write the packed data to
 * @param len - The length of the output buffer (must be at least STATE_DATA_LENGTH)
 * @param state - The TowerState object to pack into binary format
 * @returns True if packing was successful, false if the buffer is too small or invalid
 */
function rtdt_pack_state(data: Uint8Array, len: number, state: TowerState): boolean {
  if (!data || len < STATE_DATA_LENGTH)
    return false;

  // Clear the data array
  data.fill(0, 0, STATE_DATA_LENGTH);

  // Pack drum states
  data[0] |= (state.drum[0].playSound ? 1 : 0) |
    (((state.drum[0].position) & 0b11) << 1) |
    ((state.drum[0].jammed ? 1 : 0) << 3) |
    ((state.drum[0].calibrated ? 1 : 0) << 4) |
    ((state.drum[1].playSound ? 1 : 0) << 5) |
    (((state.drum[1].position) & 0b11) << 6);

  data[1] |= (state.drum[1].jammed ? 1 : 0) |
    ((state.drum[1].calibrated ? 1 : 0) << 1) |
    ((state.drum[2].playSound ? 1 : 0) << 2) |
    (((state.drum[2].position) & 0b11) << 3) |
    ((state.drum[2].jammed ? 1 : 0) << 5) |
    ((state.drum[2].calibrated ? 1 : 0) << 6);

  // Pack LED states
  data[2] |= (state.layer[0].light[0].effect << 5) | ((state.layer[0].light[0].loop ? 1 : 0) << 4);
  data[2] |= (state.layer[0].light[1].effect << 1) | (state.layer[0].light[1].loop ? 1 : 0);
  data[3] |= (state.layer[0].light[2].effect << 5) | ((state.layer[0].light[2].loop ? 1 : 0) << 4);
  data[3] |= (state.layer[0].light[3].effect << 1) | (state.layer[0].light[3].loop ? 1 : 0);

  data[4] |= (state.layer[1].light[0].effect << 5) | ((state.layer[1].light[0].loop ? 1 : 0) << 4);
  data[4] |= (state.layer[1].light[1].effect << 1) | (state.layer[1].light[1].loop ? 1 : 0);
  data[5] |= (state.layer[1].light[2].effect << 5) | ((state.layer[1].light[2].loop ? 1 : 0) << 4);
  data[5] |= (state.layer[1].light[3].effect << 1) | (state.layer[1].light[3].loop ? 1 : 0);

  data[6] |= (state.layer[2].light[0].effect << 5) | ((state.layer[2].light[0].loop ? 1 : 0) << 4);
  data[6] |= (state.layer[2].light[1].effect << 1) | (state.layer[2].light[1].loop ? 1 : 0);
  data[7] |= (state.layer[2].light[2].effect << 5) | ((state.layer[2].light[2].loop ? 1 : 0) << 4);
  data[7] |= (state.layer[2].light[3].effect << 1) | (state.layer[2].light[3].loop ? 1 : 0);

  data[8] |= (state.layer[3].light[0].effect << 5) | ((state.layer[3].light[0].loop ? 1 : 0) << 4);
  data[8] |= (state.layer[3].light[1].effect << 1) | (state.layer[3].light[1].loop ? 1 : 0);
  data[9] |= (state.layer[3].light[2].effect << 5) | ((state.layer[3].light[2].loop ? 1 : 0) << 4);
  data[9] |= (state.layer[3].light[3].effect << 1) | (state.layer[3].light[3].loop ? 1 : 0);

  data[10] |= (state.layer[4].light[0].effect << 5) | ((state.layer[4].light[0].loop ? 1 : 0) << 4);
  data[10] |= (state.layer[4].light[1].effect << 1) | (state.layer[4].light[1].loop ? 1 : 0);
  data[11] |= (state.layer[4].light[2].effect << 5) | ((state.layer[4].light[2].loop ? 1 : 0) << 4);
  data[11] |= (state.layer[4].light[3].effect << 1) | (state.layer[4].light[3].loop ? 1 : 0);

  data[12] |= (state.layer[5].light[0].effect << 5) | ((state.layer[5].light[0].loop ? 1 : 0) << 4);
  data[12] |= (state.layer[5].light[1].effect << 1) | (state.layer[5].light[1].loop ? 1 : 0);
  data[13] |= (state.layer[5].light[2].effect << 5) | ((state.layer[5].light[2].loop ? 1 : 0) << 4);
  data[13] |= (state.layer[5].light[3].effect << 1) | (state.layer[5].light[3].loop ? 1 : 0);

  // Pack audio state
  data[14] = (state.audio.sample | ((state.audio.loop ? 1 : 0) << 7));

  // Pack beam-break counter state, and drum reversal
  data[15] = (state.beam.count >> 8);
  data[16] = (state.beam.count & 0xFF);
  data[17] = (state.audio.volume << 4) |
    ((state.beam.fault ? 1 : 0)) |
    ((state.drum[0].reverse ? 1 : 0) << 1) |
    ((state.drum[1].reverse ? 1 : 0) << 2) |
    ((state.drum[2].reverse ? 1 : 0) << 3);

  // Pack LED override state
  data[18] = state.led_sequence;

  return true;
}

/**
 * Checks if all drums in the tower are calibrated.
 * A tower is considered fully calibrated only when all three drums have completed their calibration process.
 * 
 * @param state - The TowerState object to check
 * @returns True if all drums are calibrated, false if any drum is not calibrated
 */
function isCalibrated(state: TowerState): boolean {
  return state.drum.every(drum => drum.calibrated);
}


// Export the functions and types for use elsewhere
export type { TowerState, Light, Layer, Drum, Audio, Beam };
export {
  rtdt_unpack_state,
  rtdt_pack_state,
  isCalibrated,
  STATE_DATA_LENGTH,
  TOWER_LAYERS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  LED_CHANNEL_LOOKUP,
  LAYER_TO_POSITION,
  LIGHT_INDEX_TO_DIRECTION
};