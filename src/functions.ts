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

// Constants for mapping tower layers to physical locations
const TOWER_LAYERS = {
  TOP_RING: 0,
  MIDDLE_RING: 1,
  BOTTOM_RING: 2,
  LEDGE: 3,
  BASE1: 4,
  BASE2: 5,
} as const;

// Ring layers use cardinal directions (position 0 = North)
const RING_LIGHT_POSITIONS = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
} as const;

// Ledge and Base layers use ordinal directions (position 0 = North-East)
const LEDGE_BASE_LIGHT_POSITIONS = {
  NORTH_EAST: 0,
  SOUTH_EAST: 1,
  SOUTH_WEST: 2,
  NORTH_WEST: 3,
} as const;

// LED Channel Lookup (matches firmware implementation)
// Convert from (layer * 4) + position to LED driver channel (0-23)
const LED_CHANNEL_LOOKUP = [
  // Layer 0: Top Ring (C0 R0, C0 R3, C0 R2, C0 R1)
  0, 3, 2, 1,
  // Layer 1: Middle Ring (C1 R3, C1 R2, C1 R1, C1 R0) 
  7, 6, 5, 4,
  // Layer 2: Bottom Ring (C2 R2, C2 R1, C2 R0, C2 R3)
  10, 9, 8, 11,
  // Layer 3: Ledge (LEDGE R4, LEDGE R5, LEDGE R6, LEDGE R7)
  12, 13, 14, 15,
  // Layer 4: Base1 (BASE1 R4, BASE1 R5, BASE1 R6, BASE1 R7)
  16, 17, 18, 19,
  // Layer 5: Base2 (BASE2 R4, BASE2 R5, BASE2 R6, BASE2 R7) 
  20, 21, 22, 23,
];

// Legacy constants for backwards compatibility (deprecated)
const TOWER_LIGHT_POSITIONS = RING_LIGHT_POSITIONS;

// Updated reverse mapping for the corrected layer architecture
const LAYER_TO_POSITION = {
  [TOWER_LAYERS.TOP_RING]: 'TOP_RING',
  [TOWER_LAYERS.MIDDLE_RING]: 'MIDDLE_RING',
  [TOWER_LAYERS.BOTTOM_RING]: 'BOTTOM_RING',
  [TOWER_LAYERS.LEDGE]: 'LEDGE',
  [TOWER_LAYERS.BASE1]: 'BASE1',
  [TOWER_LAYERS.BASE2]: 'BASE2'
} as const;

const LIGHT_INDEX_TO_DIRECTION = {
  [RING_LIGHT_POSITIONS.NORTH]: 'NORTH',
  [RING_LIGHT_POSITIONS.EAST]: 'EAST',
  [RING_LIGHT_POSITIONS.SOUTH]: 'SOUTH',
  [RING_LIGHT_POSITIONS.WEST]: 'WEST'
} as const;

const STATE_DATA_LENGTH = 19;

function rtdt_unpack_state(data: Uint8Array): TowerState {
  // Padding is used to align the different sections on byte boundaries

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

  // Early prototypes allowed us to stop at any one of 8 locations (45 degree increments)
  // Later prototypes/production units only have 4 stopping locations
  // We repurpose the low bit to define whether or not we play a sound during rotation
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
  // Don't run the drums in reverse, trust me
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

function rtdt_pack_state(data: Uint8Array, len: number, state: TowerState): boolean {
  if (len < STATE_DATA_LENGTH)
    return false;

  // Clear the data array
  data.fill(0, 0, STATE_DATA_LENGTH);

  // Pack drum states
  // Later prototypes/production units removed the half-way markers
  // We repurpose the low bit for whether or not we need to play a rotation sound
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
 * Utility function to get the tower position and direction for a given layer and light index
 * Updated based on LED channel lookup table and corrected architecture:
 * - Layers 0-2: Ring LEDs with cardinal directions (N,E,S,W)
 * - Layers 3-5: Ledge/Base LEDs with ordinal directions (NE,SE,SW,NW)
 * @param layerIndex - The layer index (0-5)
 * @param lightIndex - The light index within the layer (0-3)
 * @returns Object containing the tower level, direction, and LED channel
 */
function getTowerPosition(layerIndex: number, lightIndex: number): { level: string, direction: string, ledChannel?: number } {
  const isRingLayer = layerIndex <= 2;
  const ledChannel = LED_CHANNEL_LOOKUP[layerIndex * 4 + lightIndex];

  if (isRingLayer) {
    // Ring layers: cardinal directions (position 0 = North)
    const directions = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
    const layerNames = ['TOP_RING', 'MIDDLE_RING', 'BOTTOM_RING'];
    return {
      level: layerNames[layerIndex],
      direction: directions[lightIndex],
      ledChannel
    };
  } else {
    // Ledge/Base layers: ordinal directions (position 0 = North-East)
    const directions = ['NORTH_EAST', 'SOUTH_EAST', 'SOUTH_WEST', 'NORTH_WEST'];
    const layerNames = ['LEDGE', 'BASE1', 'BASE2'];
    return {
      level: layerNames[layerIndex - 3],
      direction: directions[lightIndex],
      ledChannel
    };
  }
}

/**
 * Utility function to get all active lights in a tower state
 * @param state - The tower state object
 * @returns Array of objects describing each active light
 */
function getActiveLights(state: TowerState): Array<{ level: string, direction: string, effect: number, loop: boolean }> {
  const activeLights: Array<{ level: string, direction: string, effect: number, loop: boolean }> = [];

  state.layer.forEach((layer, layerIndex) => {
    layer.light.forEach((light, lightIndex) => {
      if (light.effect > 0) {
        const position = getTowerPosition(layerIndex, lightIndex);
        activeLights.push({
          level: position.level,
          direction: position.direction,
          effect: light.effect,
          loop: light.loop
        });
      }
    });
  });

  return activeLights;
}

/**
 * Creates a default/empty tower state with all settings reset to defaults
 * @returns A default TowerState object with all lights off, no audio, etc.
 */
function createDefaultTowerState(): TowerState {
  return {
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
}

// Export the functions and types for use elsewhere
export type { TowerState, Light, Layer, Drum, Audio, Beam };
export {
  rtdt_unpack_state,
  rtdt_pack_state,
  createDefaultTowerState,
  STATE_DATA_LENGTH,
  TOWER_LAYERS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  LED_CHANNEL_LOOKUP,
  TOWER_LIGHT_POSITIONS,  // Legacy - deprecated
  LAYER_TO_POSITION,
  LIGHT_INDEX_TO_DIRECTION,
  getTowerPosition,
  getActiveLights
};