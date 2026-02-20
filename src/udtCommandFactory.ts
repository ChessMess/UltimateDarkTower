import {
    AUDIO_COMMAND_POS,
    DRUM_PACKETS,
    drumPositionCmds,
    type TowerSide,
    TOWER_COMMAND_PACKET_SIZE,
    TOWER_STATE_DATA_SIZE,
    TOWER_COMMAND_TYPE_TOWER_STATE,
    TOWER_STATE_DATA_OFFSET
} from './udtConstants';
import { type TowerState, type Audio, rtdt_pack_state } from './udtTowerState';


export class UdtCommandFactory {



    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide): Uint8Array {
        const rotateCmd = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
        rotateCmd[DRUM_PACKETS.topMiddle] =
            drumPositionCmds.top[top] | drumPositionCmds.middle[middle];
        rotateCmd[DRUM_PACKETS.bottom] = drumPositionCmds.bottom[bottom];
        return rotateCmd;
    }

    /**
     * Creates a sound command packet for playing tower audio.
     * @param soundIndex - Index of the sound to play from the audio library
     * @returns Command packet for playing sound
     */
    createSoundCommand(soundIndex: number): Uint8Array {
        const soundCommand = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
        const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
        soundCommand[AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }


    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue: number): Uint8Array {
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
    createStatefulCommand(currentState: TowerState | null, modifications: Partial<TowerState>): Uint8Array {
        // Start with current state or create default state
        const newState: TowerState = currentState ? { ...currentState } : this.createEmptyTowerState();

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
    createStatefulLEDCommand(
        currentState: TowerState | null,
        layerIndex: number,
        lightIndex: number,
        effect: number,
        loop: boolean = false
    ): Uint8Array {
        const modifications: Partial<TowerState> = {};

        // Create a targeted modification for only the specific light
        if (!modifications.layer) {
            modifications.layer = [] as any;
        }
        if (!modifications.layer[layerIndex]) {
            modifications.layer[layerIndex] = { light: [] as any };
        }
        if (!modifications.layer[layerIndex].light) {
            modifications.layer[layerIndex].light = [] as any;
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
    createStatefulAudioCommand(
        currentState: TowerState | null,
        sample: number,
        loop: boolean = false,
        volume?: number
    ): Uint8Array {
        const audioMods: Audio = { sample, loop, volume: volume ?? 0 };

        const modifications: Partial<TowerState> = {
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
    createTransientAudioCommand(
        currentState: TowerState | null,
        sample: number,
        loop: boolean = false,
        volume?: number
    ): { command: Uint8Array; stateWithoutAudio: TowerState } {
        // Create the command with audio
        const audioMods: Audio = { sample, loop, volume: volume ?? 0 };

        const modifications: Partial<TowerState> = {
            audio: audioMods
        };

        const command = this.createStatefulCommand(currentState, modifications);

        // Create state without audio for local tracking
        const stateWithoutAudio: TowerState = currentState ? { ...currentState } : this.createEmptyTowerState();
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
    createTransientAudioCommandWithModifications(
        currentState: TowerState | null,
        sample: number,
        loop: boolean = false,
        volume: number | undefined = undefined,
        otherModifications: Partial<TowerState> = {}
    ): { command: Uint8Array; stateWithoutAudio: TowerState } {
        // Create the command with audio and other modifications
        const audioMods: Audio = { sample, loop, volume: volume ?? 0 };

        const modifications: Partial<TowerState> = {
            ...otherModifications,
            audio: audioMods
        };

        const command = this.createStatefulCommand(currentState, modifications);

        // Create state with other modifications but without audio for local tracking
        const stateWithoutAudio: TowerState = currentState ? { ...currentState } : this.createEmptyTowerState();

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
    createStatefulDrumCommand(
        currentState: TowerState | null,
        drumIndex: number,
        position: number,
        playSound: boolean = false
    ): Uint8Array {
        const modifications: Partial<TowerState> = {};

        // Create a partial drum array with only the drum we want to modify
        if (!modifications.drum) {
            modifications.drum = [] as any;
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
    packTowerStateCommand(state: TowerState): Uint8Array {
        const stateData = new Uint8Array(TOWER_STATE_DATA_SIZE);
        const success = rtdt_pack_state(stateData, TOWER_STATE_DATA_SIZE, state);

        if (!success) {
            throw new Error('Failed to pack tower state data');
        }

        // Create 20-byte command packet (command type 0x00 + 19 bytes state)
        const command = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
        command[0] = TOWER_COMMAND_TYPE_TOWER_STATE; // Command type for tower state
        command.set(stateData, TOWER_STATE_DATA_OFFSET);

        return command;
    }

    /**
     * Creates a default tower state with all systems off/neutral.
     * @returns Default TowerState object
     */
    private createEmptyTowerState(): TowerState {
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

    //#endregion
}