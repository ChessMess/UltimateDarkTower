import { type Lights, type TowerSide, type SealIdentifier } from './udtConstants';
import { type TowerState } from './udtTowerState';
import { Logger } from './udtLogger';
import { UdtCommandFactory } from './udtCommandFactory';
import { UdtBleConnection } from './udtBleConnection';
import { TowerResponseProcessor } from './udtTowerResponse';
export interface TowerCommandDependencies {
    logger: Logger;
    commandFactory: UdtCommandFactory;
    bleConnection: UdtBleConnection;
    responseProcessor: TowerResponseProcessor;
    logDetail: boolean;
    retrySendCommandCount: {
        value: number;
    };
    retrySendCommandMax: number;
    getCurrentTowerState: () => TowerState;
    setTowerState: (newState: TowerState, source: string) => void;
}
export declare class UdtTowerCommands {
    private deps;
    private commandQueue;
    constructor(dependencies: TowerCommandDependencies);
    /**
     * Sends a command packet to the tower via the command queue
     * @param command - The command packet to send to the tower
     * @param description - Optional description for logging
     * @returns Promise that resolves when command is completed
     */
    sendTowerCommand(command: Uint8Array, description?: string): Promise<void>;
    /**
     * Directly sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * This method is used internally by the command queue.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    private sendTowerCommandDirect;
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    calibrate(): Promise<void>;
    /**
     * Plays a sound from the tower's audio library using stateful commands that preserve existing tower state.
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    playSound(soundIndex: number): Promise<void>;
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    lights(lights: Lights): Promise<void>;
    /**
     * Maps the Lights object to layer/light index commands for setLEDStateful.
     * @param lights - Light configuration object
     * @returns Array of layer commands
     */
    private mapLightsToLayerCommands;
    /**
     * Gets the tower layer index for a doorway light level.
     * @param level - Tower level (top, middle, bottom)
     * @returns Layer index
     */
    private getTowerLayerForLevel;
    /**
     * Gets the light index for a cardinal direction (ring lights).
     * @param side - Tower side (north, east, south, west)
     * @returns Light index
     */
    private getLightIndexForSide;
    /**
     * Maps cardinal directions to their closest corner positions for ledge lights.
     * @param side - Tower side (north, east, south, west)
     * @returns Tower corner (northeast, southeast, southwest, northwest)
     */
    private mapSideToCorner;
    /**
     * Gets the light index for ledge lights (ordinal directions).
     * @param corner - Tower corner (northeast, southeast, southwest, northwest)
     * @returns Light index
     */
    private getLedgeLightIndexForSide;
    /**
     * Gets the light index for base lights (ordinal directions).
     * @param side - Tower side (north, east, south, west)
     * @returns Light index
     */
    private getBaseLightIndexForSide;
    /**
     * Sends a light override command to control specific light patterns using stateful commands.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    lightOverrides(light: number, soundIndex?: number): Promise<void>;
    /**
     * Rotates tower drums to specified positions.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void>;
    /**
   * Rotates tower drums to specified positions.
   * @param top - Position for the top drum ('north', 'east', 'south', 'west')
   * @param middle - Position for the middle drum
   * @param bottom - Position for the bottom drum
   * @param soundIndex - Optional sound to play during rotation
   * @returns Promise that resolves when rotate command is sent
   */
    rotateWithState(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void>;
    /**
     * Resets the tower's internal skull drop counter to zero using stateful commands.
     * @returns Promise that resolves when reset command is sent
     */
    resetTowerSkullCount(): Promise<void>;
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @param volume - Optional volume override (0=loud, 1=medium, 2=quiet, 3=mute). Uses current tower state if not provided.
     * @returns Promise that resolves when seal break sequence is complete
     */
    breakSeal(seal: SealIdentifier, volume?: number): Promise<void>;
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    randomRotateLevels(level?: number): Promise<void>;
    /**
     * Decodes drum position from raw command byte value.
     * @param level - The drum level ('top', 'middle', 'bottom')
     * @param rawValue - The raw byte value from the command
     * @returns The position as a number (0=north, 1=east, 2=south, 3=west)
     */
    private decodeDrumPositionFromRaw;
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide;
    /**
     * Sends a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect, defaults to true
     * @returns Promise that resolves when command is sent
     */
    setLEDStateful(layerIndex: number, lightIndex: number, effect: number, loop?: boolean): Promise<void>;
    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
     * @param soundIndex - Index of the sound to play (1-based)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns Promise that resolves when command is sent
     */
    playSoundStateful(soundIndex: number, loop?: boolean, volume?: number): Promise<void>;
    /**
     * Rotates a single drum using stateful commands that preserve existing tower state.
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns Promise that resolves when command is sent
     */
    rotateDrumStateful(drumIndex: number, position: number, playSound?: boolean): Promise<void>;
    /**
     * Sends a complete tower state using stateful commands.
     * Audio state is automatically cleared to prevent sounds from persisting across commands.
     * @param state - Complete tower state to send
     * @returns Promise that resolves when command is sent
     */
    sendTowerStateStateful(state: TowerState): Promise<void>;
    /**
     * Public access to sendTowerCommandDirect for testing purposes.
     * This bypasses the command queue and sends commands directly.
     * @param command - The command packet to send directly to the tower
     * @returns Promise that resolves when command is sent
     */
    sendTowerCommandDirectPublic(command: Uint8Array): Promise<void>;
    /**
     * Called when a tower response is received to notify the command queue
     * This should be called from the BLE connection response handler
     */
    onTowerResponse(): void;
    /**
     * Get command queue status for debugging
     */
    getQueueStatus(): {
        queueLength: number;
        isProcessing: boolean;
        currentCommand: {
            id: string;
            description: string;
            timestamp: number;
        };
    };
    /**
     * Clear the command queue (for cleanup or error recovery)
     */
    clearQueue(): void;
}
