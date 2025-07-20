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
declare function rtdt_unpack_state(data: Uint8Array): TowerState;
declare function rtdt_pack_state(data: Uint8Array, len: number, state: TowerState): boolean;
export type { TowerState, Light, Layer, Drum, Audio, Beam };
export { rtdt_unpack_state, rtdt_pack_state, STATE_DATA_LENGTH, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION };
