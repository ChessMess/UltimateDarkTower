import { type TowerSide } from './udtConstants';
import { type TowerState } from './udtTowerState';
export declare class UdtCommandFactory {
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
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue: number): Uint8Array;
    /**
     * Creates a stateful tower command by modifying only specific fields while preserving the rest.
     * This is the proper way to send commands that only change certain aspects of the tower state.
     * @param currentState - The current complete tower state (or null to create default state)
     * @param modifications - Partial tower state with only the fields to modify
     * @returns 20-byte command packet (command type + 19-byte state data)
     */
    createStatefulCommand(currentState: TowerState | null, modifications: Partial<TowerState>): Uint8Array;
    /**
     * Creates a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param currentState - The current complete tower state
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns 20-byte command packet
     */
    createStatefulLEDCommand(currentState: TowerState | null, layerIndex: number, lightIndex: number, effect: number, loop?: boolean): Uint8Array;
    /**
 * Creates a stateful audio command that preserves all current tower state while adding audio.
 * @param currentState - The current complete tower state
 * @param sample - Audio sample index to play (0-127)
 * @param loop - Whether to loop the audio
 * @param volume - Audio volume (0-15), optional
 * @returns 20-byte command packet
 */
    createStatefulAudioCommand(currentState: TowerState | null, sample: number, loop?: boolean, volume?: number): Uint8Array;
    /**
     * Creates a transient audio command that includes current tower state but doesn't persist audio state.
     * This prevents audio from being included in subsequent commands.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index to play
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns Object containing the command packet and the state without audio for local tracking
     */
    createTransientAudioCommand(currentState: TowerState | null, sample: number, loop?: boolean, volume?: number): {
        command: Uint8Array;
        stateWithoutAudio: TowerState;
    };
    /**
     * Creates a transient audio command with additional modifications that includes current tower state
     * but doesn't persist audio state. This prevents audio from being included in subsequent commands.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index to play
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @param otherModifications - Other tower state modifications to include
     * @returns Object containing the command packet and the state with modifications but without audio
     */
    createTransientAudioCommandWithModifications(currentState: TowerState | null, sample: number, loop?: boolean, volume?: number | undefined, otherModifications?: Partial<TowerState>): {
        command: Uint8Array;
        stateWithoutAudio: TowerState;
    };
    /**
     * Creates a stateful drum rotation command that only changes drum positions while preserving all other state.
     * @param currentState - The current complete tower state
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns 20-byte command packet
     */
    createStatefulDrumCommand(currentState: TowerState | null, drumIndex: number, position: number, playSound?: boolean): Uint8Array;
    /**
     * Packs a complete tower state into a 20-byte command packet.
     * @param state - Complete tower state to pack
     * @returns 20-byte command packet (0x00 + 19 bytes state data)
     */
    packTowerStateCommand(state: TowerState): Uint8Array;
    /**
     * Creates a default tower state with all systems off/neutral.
     * @returns Default TowerState object
     */
    private createEmptyTowerState;
}
