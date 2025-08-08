import { TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION, STATE_DATA_LENGTH } from './udtConstants';
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
declare function rtdt_unpack_state(data: Uint8Array): TowerState;
/**
 * Packs a TowerState object into binary data format for transmission to the tower.
 * Serializes drum states, LED configurations, audio settings, beam counter, and LED sequences.
 *
 * @param data - The output buffer to write the packed data to
 * @param len - The length of the output buffer (must be at least STATE_DATA_LENGTH)
 * @param state - The TowerState object to pack into binary format
 * @returns True if packing was successful, false if the buffer is too small or invalid
 */
declare function rtdt_pack_state(data: Uint8Array, len: number, state: TowerState): boolean;
/**
 * Checks if all drums in the tower are calibrated.
 * A tower is considered fully calibrated only when all three drums have completed their calibration process.
 *
 * @param state - The TowerState object to check
 * @returns True if all drums are calibrated, false if any drum is not calibrated
 */
declare function isCalibrated(state: TowerState): boolean;
export type { TowerState, Light, Layer, Drum, Audio, Beam };
export { rtdt_unpack_state, rtdt_pack_state, isCalibrated, STATE_DATA_LENGTH, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION };
