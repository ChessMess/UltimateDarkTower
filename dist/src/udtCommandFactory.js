"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtCommandFactory = void 0;
const udtConstants_1 = require("./udtConstants");
const udtTowerState_1 = require("./udtTowerState");
class UdtCommandFactory {
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top, middle, bottom) {
        const rotateCmd = new Uint8Array(udtConstants_1.TOWER_COMMAND_PACKET_SIZE);
        rotateCmd[udtConstants_1.DRUM_PACKETS.topMiddle] =
            udtConstants_1.drumPositionCmds.top[top] | udtConstants_1.drumPositionCmds.middle[middle];
        rotateCmd[udtConstants_1.DRUM_PACKETS.bottom] = udtConstants_1.drumPositionCmds.bottom[bottom];
        return rotateCmd;
    }
    /**
     * Creates a sound command packet for playing tower audio.
     * @param soundIndex - Index of the sound to play from the audio library
     * @returns Command packet for playing sound
     */
    createSoundCommand(soundIndex) {
        const soundCommand = new Uint8Array(udtConstants_1.TOWER_COMMAND_PACKET_SIZE);
        const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
        soundCommand[udtConstants_1.AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }
    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue) {
        return new Uint8Array([commandValue]);
    }
    //#region Stateful Command Methods
    /**
     * Creates a stateful tower command by modifying only specific fields while preserving the rest.
     * This is the proper way to send commands that only change certain aspects of the tower state.
     * @param currentState - The current complete tower state (or null to create default state)
     * @param modifications - Partial tower state with only the fields to modify
     * @returns 20-byte command packet (command type + 19-byte state data)
     */
    createStatefulCommand(currentState, modifications) {
        // Start with current state or create default state
        const newState = currentState ? Object.assign({}, currentState) : this.createEmptyTowerState();
        // Apply modifications
        if (modifications.drum) {
            modifications.drum.forEach((drum, index) => {
                if (drum && newState.drum[index]) {
                    Object.assign(newState.drum[index], drum);
                }
            });
        }
        if (modifications.layer) {
            modifications.layer.forEach((layer, layerIndex) => {
                if (layer && newState.layer[layerIndex]) {
                    if (layer.light) {
                        layer.light.forEach((light, lightIndex) => {
                            if (light && newState.layer[layerIndex].light[lightIndex]) {
                                Object.assign(newState.layer[layerIndex].light[lightIndex], light);
                            }
                        });
                    }
                }
            });
        }
        if (modifications.audio) {
            Object.assign(newState.audio, modifications.audio);
        }
        if (modifications.beam) {
            Object.assign(newState.beam, modifications.beam);
        }
        if (modifications.led_sequence !== undefined) {
            newState.led_sequence = modifications.led_sequence;
        }
        // Pack the state into a command
        return this.packTowerStateCommand(newState);
    }
    /**
     * Creates a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param currentState - The current complete tower state
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns 20-byte command packet
     */
    createStatefulLEDCommand(currentState, layerIndex, lightIndex, effect, loop = false) {
        const modifications = {};
        // Create a targeted modification for only the specific light
        if (!modifications.layer) {
            modifications.layer = [];
        }
        if (!modifications.layer[layerIndex]) {
            modifications.layer[layerIndex] = { light: [] };
        }
        if (!modifications.layer[layerIndex].light) {
            modifications.layer[layerIndex].light = [];
        }
        modifications.layer[layerIndex].light[lightIndex] = { effect, loop };
        // Always clear audio state for LED commands to prevent audio persistence
        modifications.audio = { sample: 0, loop: false, volume: 0 };
        return this.createStatefulCommand(currentState, modifications);
    }
    /**
 * Creates a stateful audio command that preserves all current tower state while adding audio.
 * @param currentState - The current complete tower state
 * @param sample - Audio sample index to play (0-127)
 * @param loop - Whether to loop the audio
 * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
 * @returns 20-byte command packet
 */
    createStatefulAudioCommand(currentState, sample, loop = false, volume) {
        const audioMods = { sample, loop, volume: volume !== null && volume !== void 0 ? volume : 0 };
        const modifications = {
            audio: audioMods
        };
        return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Creates a transient audio command that includes current tower state but doesn't persist audio state.
     * This prevents audio from being included in subsequent commands.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index to play
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
     * @returns Object containing the command packet and the state without audio for local tracking
     */
    createTransientAudioCommand(currentState, sample, loop = false, volume) {
        // Create the command with audio
        const audioMods = { sample, loop, volume: volume !== null && volume !== void 0 ? volume : 0 };
        const modifications = {
            audio: audioMods
        };
        const command = this.createStatefulCommand(currentState, modifications);
        // Create state without audio for local tracking
        const stateWithoutAudio = currentState ? Object.assign({}, currentState) : this.createEmptyTowerState();
        // Reset audio to neutral state
        stateWithoutAudio.audio = { sample: 0, loop: false, volume: 0 };
        return { command, stateWithoutAudio };
    }
    /**
     * Creates a transient audio command with additional modifications that includes current tower state
     * but doesn't persist audio state. This prevents audio from being included in subsequent commands.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index to play
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
     * @param otherModifications - Other tower state modifications to include
     * @returns Object containing the command packet and the state with modifications but without audio
     */
    createTransientAudioCommandWithModifications(currentState, sample, loop = false, volume = undefined, otherModifications = {}) {
        // Create the command with audio and other modifications
        const audioMods = { sample, loop, volume: volume !== null && volume !== void 0 ? volume : 0 };
        const modifications = Object.assign(Object.assign({}, otherModifications), { audio: audioMods });
        const command = this.createStatefulCommand(currentState, modifications);
        // Create state with other modifications but without audio for local tracking
        const stateWithoutAudio = currentState ? Object.assign({}, currentState) : this.createEmptyTowerState();
        // Apply other modifications
        if (otherModifications.drum) {
            otherModifications.drum.forEach((drum, index) => {
                if (drum && stateWithoutAudio.drum[index]) {
                    Object.assign(stateWithoutAudio.drum[index], drum);
                }
            });
        }
        if (otherModifications.layer) {
            otherModifications.layer.forEach((layer, layerIndex) => {
                if (layer && stateWithoutAudio.layer[layerIndex]) {
                    if (layer.light) {
                        layer.light.forEach((light, lightIndex) => {
                            if (light && stateWithoutAudio.layer[layerIndex].light[lightIndex]) {
                                Object.assign(stateWithoutAudio.layer[layerIndex].light[lightIndex], light);
                            }
                        });
                    }
                }
            });
        }
        if (otherModifications.beam) {
            Object.assign(stateWithoutAudio.beam, otherModifications.beam);
        }
        if (otherModifications.led_sequence !== undefined) {
            stateWithoutAudio.led_sequence = otherModifications.led_sequence;
        }
        // Reset audio to neutral state (don't persist it)
        stateWithoutAudio.audio = { sample: 0, loop: false, volume: 0 };
        return { command, stateWithoutAudio };
    }
    /**
     * Creates a stateful drum rotation command that only changes drum positions while preserving all other state.
     * @param currentState - The current complete tower state
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns 20-byte command packet
     */
    createStatefulDrumCommand(currentState, drumIndex, position, playSound = false) {
        const modifications = {};
        // Create a partial drum array with only the drum we want to modify
        if (!modifications.drum) {
            modifications.drum = [];
        }
        modifications.drum[drumIndex] = {
            jammed: false,
            calibrated: true,
            position,
            playSound,
            reverse: false
        };
        // Always clear audio state for drum commands to prevent audio persistence
        modifications.audio = { sample: 0, loop: false, volume: 0 };
        return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Packs a complete tower state into a 20-byte command packet.
     * @param state - Complete tower state to pack
     * @returns 20-byte command packet (0x00 + 19 bytes state data)
     */
    packTowerStateCommand(state) {
        const stateData = new Uint8Array(udtConstants_1.TOWER_STATE_DATA_SIZE);
        const success = (0, udtTowerState_1.rtdt_pack_state)(stateData, udtConstants_1.TOWER_STATE_DATA_SIZE, state);
        if (!success) {
            throw new Error('Failed to pack tower state data');
        }
        // Create 20-byte command packet (command type 0x00 + 19 bytes state)
        const command = new Uint8Array(udtConstants_1.TOWER_COMMAND_PACKET_SIZE);
        command[0] = udtConstants_1.TOWER_COMMAND_TYPE_TOWER_STATE; // Command type for tower state
        command.set(stateData, udtConstants_1.TOWER_STATE_DATA_OFFSET);
        return command;
    }
    /**
     * Creates a default tower state with all systems off/neutral.
     * @returns Default TowerState object
     */
    createEmptyTowerState() {
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
}
exports.UdtCommandFactory = UdtCommandFactory;
//# sourceMappingURL=udtCommandFactory.js.map