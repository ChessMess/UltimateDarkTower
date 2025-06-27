"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtCommandFactory = void 0;
const constants_1 = require("./constants");
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
            packetPos = constants_1.LIGHT_PACKETS.doorway[dlt.level][dlt.position];
            const shouldBitShift = constants_1.DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
            command[packetPos] += constants_1.LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });
        ledges && ledges.forEach(llt => {
            packetPos = constants_1.LIGHT_PACKETS.ledge[llt.position];
            const shouldBitShift = constants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
            command[packetPos] += constants_1.LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });
        bases && bases.forEach(blt => {
            packetPos = constants_1.LIGHT_PACKETS.base[blt.position.side][blt.position.level];
            const shouldBitShift = constants_1.BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
            command[packetPos] += constants_1.LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 0x10 : 0x1);
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
        lightOverrideCommand[constants_1.LIGHT_PACKETS.overrides] = lightOverride;
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
        rotateCmd[constants_1.DRUM_PACKETS.topMiddle] =
            constants_1.drumPositionCmds.top[top] | constants_1.drumPositionCmds.middle[middle];
        rotateCmd[constants_1.DRUM_PACKETS.bottom] = constants_1.drumPositionCmds.bottom[bottom];
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
        soundCommand[constants_1.AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }
    /**
     * Updates a command packet with the current drum positions.
     * @param commandPacket - The command packet to update with current drum positions
     * @param currentPositions - Current drum positions to apply
     */
    updateCommandWithCurrentDrumPositions(commandPacket, currentPositions) {
        commandPacket[constants_1.DRUM_PACKETS.topMiddle] = currentPositions.topMiddle;
        commandPacket[constants_1.DRUM_PACKETS.bottom] = currentPositions.bottom;
    }
    /**
     * Creates a combined command packet by merging rotation, light, and sound commands.
     * @param rotateCommand - Rotation command packet
     * @param lightCommand - Light command packet
     * @param soundCommand - Optional sound command packet
     * @returns Combined command packet
     */
    createMultiCommand(rotateCommand, lightCommand, soundCommand) {
        const multiCmd = new Uint8Array(20);
        // Combine rotate and light commands with bitwise OR
        for (let index = 0; index < 20; index++) {
            multiCmd[index] = rotateCommand[index] | lightCommand[index];
        }
        // Add sound if provided
        if (soundCommand) {
            multiCmd[constants_1.AUDIO_COMMAND_POS] = multiCmd[constants_1.AUDIO_COMMAND_POS] | soundCommand[constants_1.AUDIO_COMMAND_POS];
        }
        return multiCmd;
    }
    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue) {
        return new Uint8Array([commandValue]);
    }
}
exports.UdtCommandFactory = UdtCommandFactory;
//# sourceMappingURL=udtCommandFactory.js.map