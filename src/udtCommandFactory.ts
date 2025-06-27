import {
    AUDIO_COMMAND_POS,
    DRUM_PACKETS,
    LIGHT_PACKETS,
    DOORWAY_LIGHTS_TO_BIT_SHIFT,
    BASE_LEDGE_LIGHTS_TO_BIT_SHIFT,
    LIGHT_EFFECTS,
    drumPositionCmds,
    type Lights,
    type TowerSide,
    type CommandPacket
} from './constants';

export interface DrumPositions {
    topMiddle: number;
    bottom: number;
}

export class UdtCommandFactory {
    /**
     * Creates a light command packet from a lights configuration object.
     * @param lights - Light configuration specifying doorway, ledge, and base lights
     * @returns Command packet for controlling tower lights
     */
    createLightPacketCommand(lights: Lights): Uint8Array {
        let packetPos: number | null = null;
        const command = new Uint8Array(20);
        const doorways = lights?.doorway;
        const ledges = lights?.ledge;
        const bases = lights?.base;

        doorways && doorways.forEach(dlt => {
            packetPos = LIGHT_PACKETS.doorway[dlt.level][dlt.position];
            const shouldBitShift = DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
            command[packetPos] += LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });

        ledges && ledges.forEach(llt => {
            packetPos = LIGHT_PACKETS.ledge[llt.position];
            const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
            command[packetPos] += LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });

        bases && bases.forEach(blt => {
            packetPos = LIGHT_PACKETS.base[blt.position.side][blt.position.level];
            const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
            command[packetPos] += LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 0x10 : 0x1);
        });

        return command;
    }

    /**
     * Creates a light override command packet.
     * @param lightOverride - Light override value to send
     * @returns Command packet for light override
     */
    createLightOverrideCommand(lightOverride: number): Uint8Array {
        const lightOverrideCommand = new Uint8Array(20);
        lightOverrideCommand[LIGHT_PACKETS.overrides] = lightOverride;
        return lightOverrideCommand;
    }

    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide): Uint8Array {
        const rotateCmd = new Uint8Array(20);
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
        const soundCommand = new Uint8Array(20);
        const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
        soundCommand[AUDIO_COMMAND_POS] = sound;
        return soundCommand;
    }

    /**
     * Updates a command packet with the current drum positions.
     * @param commandPacket - The command packet to update with current drum positions
     * @param currentPositions - Current drum positions to apply
     */
    updateCommandWithCurrentDrumPositions(commandPacket: CommandPacket, currentPositions: DrumPositions): void {
        commandPacket[DRUM_PACKETS.topMiddle] = currentPositions.topMiddle;
        commandPacket[DRUM_PACKETS.bottom] = currentPositions.bottom;
    }

    /**
     * Creates a combined command packet by merging rotation, light, and sound commands.
     * @param rotateCommand - Rotation command packet
     * @param lightCommand - Light command packet
     * @param soundCommand - Optional sound command packet
     * @returns Combined command packet
     */
    createMultiCommand(
        rotateCommand: Uint8Array, 
        lightCommand: Uint8Array, 
        soundCommand?: Uint8Array
    ): Uint8Array {
        const multiCmd = new Uint8Array(20);
        
        // Combine rotate and light commands with bitwise OR
        for (let index = 0; index < 20; index++) {
            multiCmd[index] = rotateCommand[index] | lightCommand[index];
        }

        // Add sound if provided
        if (soundCommand) {
            multiCmd[AUDIO_COMMAND_POS] = multiCmd[AUDIO_COMMAND_POS] | soundCommand[AUDIO_COMMAND_POS];
        }

        return multiCmd;
    }

    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue: number): Uint8Array {
        return new Uint8Array([commandValue]);
    }
}