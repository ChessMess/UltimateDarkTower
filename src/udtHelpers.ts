import { VOLTAGE_LEVELS } from './udtConstants';
import { type TowerState } from './functions';

/**
 * Converts battery voltage in millivolts to percentage number (0-100).
 * @param mv - Battery voltage in millivolts
 * @returns Battery percentage as number (0-100)
 */
export function milliVoltsToPercentageNumber(mv: number): number {
  const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
  const levels = VOLTAGE_LEVELS.filter(v => batLevel >= v);
  return levels.length * 5;
}

/**
 * Converts battery voltage in millivolts to percentage.
 * Tower returns sum total battery level in millivolts for all batteries.
 * @param {number} mv - Battery voltage in millivolts
 * @returns {string} Battery percentage as formatted string (e.g., "75%")
 */
export function milliVoltsToPercentage(mv: number): string {
  const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
  const levels = VOLTAGE_LEVELS.filter(v => batLevel >= v);
  return `${levels.length * 5}%`;
}

/**
 * Extracts battery voltage in millivolts from a tower battery response.
 * @param {Uint8Array} command - Battery response packet from tower
 * @returns {number} Battery voltage in millivolts
 */
export function getMilliVoltsFromTowerResponse(command: Uint8Array): number {
  const mv = new Uint8Array(4);
  mv[0] = command[4];
  mv[1] = command[3];
  mv[2] = 0;
  mv[3] = 0;
  const view = new DataView(mv.buffer, 0);
  return view.getUint32(0, true);
}

/**
 * Converts a command packet to a hex string representation for debugging.
 * @param {Uint8Array} command - Command packet to convert
 * @returns {string} Hex string representation of the command packet
 */
export function commandToPacketString(command: Uint8Array): string {
  let cmdStr = "[";
  command.forEach(n => cmdStr += n.toString(16) + ",");
  cmdStr = cmdStr.slice(0, -1) + "]";
  return cmdStr;
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
export function getTowerPosition(layerIndex: number, lightIndex: number): { level: string, direction: string, ledChannel?: number } {
  // LED Channel Lookup (matches firmware implementation)
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
export function getActiveLights(state: TowerState): Array<{ level: string, direction: string, effect: number, loop: boolean }> {
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
export function createDefaultTowerState(): TowerState {
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