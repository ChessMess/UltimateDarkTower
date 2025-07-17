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
declare const TOWER_LAYERS: {
    readonly TOP_RING: 0;
    readonly MIDDLE_RING: 1;
    readonly BOTTOM_RING: 2;
    readonly LEDGE: 3;
    readonly BASE1: 4;
    readonly BASE2: 5;
};
declare const RING_LIGHT_POSITIONS: {
    readonly NORTH: 0;
    readonly EAST: 1;
    readonly SOUTH: 2;
    readonly WEST: 3;
};
declare const LEDGE_BASE_LIGHT_POSITIONS: {
    readonly NORTH_EAST: 0;
    readonly SOUTH_EAST: 1;
    readonly SOUTH_WEST: 2;
    readonly NORTH_WEST: 3;
};
declare const LED_CHANNEL_LOOKUP: number[];
declare const TOWER_LIGHT_POSITIONS: {
    readonly NORTH: 0;
    readonly EAST: 1;
    readonly SOUTH: 2;
    readonly WEST: 3;
};
declare const LAYER_TO_POSITION: {
    readonly 0: "TOP_RING";
    readonly 1: "MIDDLE_RING";
    readonly 2: "BOTTOM_RING";
    readonly 3: "LEDGE";
    readonly 4: "BASE1";
    readonly 5: "BASE2";
};
declare const LIGHT_INDEX_TO_DIRECTION: {
    readonly 0: "NORTH";
    readonly 1: "EAST";
    readonly 2: "SOUTH";
    readonly 3: "WEST";
};
declare const STATE_DATA_LENGTH = 19;
declare function rtdt_unpack_state(data: Uint8Array): TowerState;
declare function rtdt_pack_state(data: Uint8Array, len: number, state: TowerState): boolean;
/**
 * Utility function to get the tower position and direction for a given layer and light index
 * Updated based on LED channel lookup table and corrected architecture:
 * - Layers 0-2: Ring LEDs with cardinal directions (N,E,S,W)
 * - Layers 3-5: Ledge/Base LEDs with ordinal directions (NE,SE,SW,NW)
 * @param layerIndex - The layer index (0-5)
 * @param lightIndex - The light index within the layer (0-3)
 * @returns Object containing the tower level, direction, and LED channel
 */
declare function getTowerPosition(layerIndex: number, lightIndex: number): {
    level: string;
    direction: string;
    ledChannel?: number;
};
/**
 * Utility function to get all active lights in a tower state
 * @param state - The tower state object
 * @returns Array of objects describing each active light
 */
declare function getActiveLights(state: TowerState): Array<{
    level: string;
    direction: string;
    effect: number;
    loop: boolean;
}>;
/**
 * Creates a default/empty tower state with all settings reset to defaults
 * @returns A default TowerState object with all lights off, no audio, etc.
 */
declare function createDefaultTowerState(): TowerState;
export type { TowerState, Light, Layer, Drum, Audio, Beam };
export { rtdt_unpack_state, rtdt_pack_state, createDefaultTowerState, STATE_DATA_LENGTH, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, TOWER_LIGHT_POSITIONS, // Legacy - deprecated
LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION, getTowerPosition, getActiveLights };
