"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtCommandFactory = void 0;
const udtConstants_1 = require("./udtConstants");
const udtTowerState_1 = require("./udtTowerState");
class UdtCommandFactory {
    /**
     * Creates a light command packet from a lights configuration object.
     * @param lights - Light configuration specifying doorway, ledge, and base lights
     * @returns Command packet for controlling tower lights
     */
    createLightPacketCommand(lights) {
        let packetPos = null;
        const command = new Uint8Array(20);
        const doorways = lights === null || lights === void 0 ? void 0 : lights.doorway;
        const ledges = lights === null || lights === void 0 ? void 0 : lights.ledge;
        const bases = lights === null || lights === void 0 ? void 0 : lights.base;
        doorways && doorways.forEach(dlt => {
            packetPos = udtConstants_1.LIGHT_PACKETS.doorway[dlt.level][dlt.position];
            const shouldBitShift = udtConstants_1.DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
            command[packetPos] += udtConstants_1.LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });
        ledges && ledges.forEach(llt => {
            packetPos = udtConstants_1.LIGHT_PACKETS.ledge[llt.position];
            const shouldBitShift = udtConstants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
            command[packetPos] += udtConstants_1.LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });
        bases && bases.forEach(blt => {
            packetPos = udtConstants_1.LIGHT_PACKETS.base[blt.position.side][blt.position.level];
            const shouldBitShift = udtConstants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
            command[packetPos] += udtConstants_1.LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });
        return command;
    }
    /**
     * Creates a light override command packet.
     * @param lightOverride - Light override value to send
     * @returns Command packet for light override
     */
    createLightOverrideCommand(lightOverride) {
        const lightOverrideCommand = new Uint8Array(20);
        lightOverrideCommand[udtConstants_1.LIGHT_PACKETS.overrides] = lightOverride;
        return lightOverrideCommand;
    }
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top, middle, bottom) {
        const rotateCmd = new Uint8Array(20);
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
        const soundCommand = new Uint8Array(20);
        const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
        soundCommand[udtConstants_1.AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }
    /**
     * Updates a command packet with the current drum positions.
     * @param commandPacket - The command packet to update with current drum positions
     * @param currentPositions - Current drum positions to apply
     */
    updateCommandWithCurrentDrumPositions(commandPacket, currentPositions) {
        commandPacket[udtConstants_1.DRUM_PACKETS.topMiddle] = currentPositions.topMiddle;
        commandPacket[udtConstants_1.DRUM_PACKETS.bottom] = currentPositions.bottom;
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
        // Create a partial layer array with only the layer we want to modify
        if (!modifications.layer) {
            modifications.layer = [];
        }
        modifications.layer[layerIndex] = {
            light: [
                { effect: 0, loop: false },
                { effect: 0, loop: false },
                { effect: 0, loop: false },
                { effect: 0, loop: false }
            ]
        };
        modifications.layer[layerIndex].light[lightIndex] = { effect, loop };
        return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Creates a stateful audio command that only changes audio while preserving all other state.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index (0-127)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns 20-byte command packet
     */
    createStatefulAudioCommand(currentState, sample, loop = false, volume) {
        const audioMods = { sample, loop };
        if (volume !== undefined) {
            audioMods.volume = volume;
        }
        const modifications = {
            audio: audioMods
        };
        return this.createStatefulCommand(currentState, modifications);
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
        return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Packs a complete tower state into a 20-byte command packet.
     * @param state - Complete tower state to pack
     * @returns 20-byte command packet (0x00 + 19 bytes state data)
     */
    packTowerStateCommand(state) {
        const stateData = new Uint8Array(19);
        const success = (0, udtTowerState_1.rtdt_pack_state)(stateData, 19, state);
        if (!success) {
            throw new Error('Failed to pack tower state data');
        }
        // Create 20-byte command packet (command type 0x00 + 19 bytes state)
        const command = new Uint8Array(20);
        command[0] = 0x00; // Command type for tower state
        command.set(stateData, 1);
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