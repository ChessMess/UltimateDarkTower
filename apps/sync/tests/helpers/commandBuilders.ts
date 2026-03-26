import {
  createDefaultTowerState,
  rtdt_pack_state,
  type TowerState,
} from 'ultimatedarktower';

// TOWER_COMMAND_TYPE_TOWER_STATE = 0 (from udtConstants.ts)
const TOWER_STATE_COMMAND_TYPE = 0;

/**
 * Pack a TowerState into a properly-formatted 20-byte command packet.
 * Byte 0 = command type header, bytes 1–19 = state data.
 */
function packState(state: TowerState): Buffer {
  const buf = new Uint8Array(20);
  buf[0] = TOWER_STATE_COMMAND_TYPE;
  const ok = rtdt_pack_state(buf.subarray(1), 19, state);
  if (!ok) throw new Error('rtdt_pack_state returned false — invalid state');
  return Buffer.from(buf);
}

/** Build a 20-byte command with all LEDs set to the given effect. */
export function buildAllLightsCommand(effect: number): Buffer {
  const state = createDefaultTowerState();
  for (const layer of state.layer) {
    for (const light of layer.light) {
      light.effect = effect;
    }
  }
  return packState(state);
}

/** Build a 20-byte command with a single LED set to the given effect. */
export function buildSingleLightCommand(
  layerIndex: number,
  lightIndex: number,
  effect: number,
): Buffer {
  const state = createDefaultTowerState();
  state.layer[layerIndex].light[lightIndex].effect = effect;
  return packState(state);
}

/** Build a 20-byte command with drums at the given positions (0=N,1=E,2=S,3=W). */
export function buildRotateCommand(top: number, middle: number, bottom: number): Buffer {
  const state = createDefaultTowerState();
  state.drum[0].position = top;
  state.drum[1].position = middle;
  state.drum[2].position = bottom;
  return packState(state);
}

/** Build a 20-byte command with the given audio sample playing. */
export function buildSoundCommand(sample: number): Buffer {
  const state = createDefaultTowerState();
  state.audio.sample = sample;
  return packState(state);
}

/** Build a 20-byte command from a custom state mutation. */
export function buildCustomCommand(mutate: (state: TowerState) => void): Buffer {
  const state = createDefaultTowerState();
  mutate(state);
  return packState(state);
}
