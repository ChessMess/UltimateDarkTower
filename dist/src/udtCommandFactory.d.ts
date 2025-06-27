import { type Lights, type TowerSide, type CommandPacket } from './constants';
export interface DrumPositions {
    topMiddle: number;
    bottom: number;
}
export declare class UdtCommandFactory {
    /**
     * Creates a light command packet from a lights configuration object.
     * @param lights - Light configuration specifying doorway, ledge, and base lights
     * @returns Command packet for controlling tower lights
     */
    createLightPacketCommand(lights: Lights): Uint8Array;
    /**
     * Creates a light override command packet.
     * @param lightOverride - Light override value to send
     * @returns Command packet for light override
     */
    createLightOverrideCommand(lightOverride: number): Uint8Array;
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide): Uint8Array;
    /**
     * Creates a sound command packet for playing tower audio.
     * @param soundIndex - Index of the sound to play from the audio library
     * @returns Command packet for playing sound
     */
    createSoundCommand(soundIndex: number): Uint8Array;
    /**
     * Updates a command packet with the current drum positions.
     * @param commandPacket - The command packet to update with current drum positions
     * @param currentPositions - Current drum positions to apply
     */
    updateCommandWithCurrentDrumPositions(commandPacket: CommandPacket, currentPositions: DrumPositions): void;
    /**
     * Creates a combined command packet by merging rotation, light, and sound commands.
     * @param rotateCommand - Rotation command packet
     * @param lightCommand - Light command packet
     * @param soundCommand - Optional sound command packet
     * @returns Combined command packet
     */
    createMultiCommand(rotateCommand: Uint8Array, lightCommand: Uint8Array, soundCommand?: Uint8Array): Uint8Array;
    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue: number): Uint8Array;
}
