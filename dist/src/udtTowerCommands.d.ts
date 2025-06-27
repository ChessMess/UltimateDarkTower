import { type Lights, type TowerSide, type RotateCommand } from './constants';
import { Logger } from './Logger';
import { UdtCommandFactory } from './udtCommandFactory';
import { UdtBleConnection } from './udtBleConnection';
import { TowerResponseProcessor } from './udtTowerResponse';
export interface TowerCommandDependencies {
    logger: Logger;
    commandFactory: UdtCommandFactory;
    bleConnection: UdtBleConnection;
    responseProcessor: TowerResponseProcessor;
    currentDrumPositions: {
        topMiddle: number;
        bottom: number;
    };
    logDetail: boolean;
    retrySendCommandCount: {
        value: number;
    };
    retrySendCommandMax: number;
}
export declare class UdtTowerCommands {
    private deps;
    constructor(dependencies: TowerCommandDependencies);
    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    sendTowerCommand(command: Uint8Array): Promise<void>;
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    calibrate(): Promise<void>;
    /**
     * Plays a sound from the tower's audio library.
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
     * Sends a light override command to control specific light patterns.
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
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param rotate - Rotation configuration for tower drums
     * @param lights - Light configuration object
     * @param soundIndex - Optional sound to play with the multi-command
     * @returns Promise that resolves when multi-command is sent
     */
    multiCommand(rotate?: RotateCommand, lights?: Lights, soundIndex?: number): Promise<void>;
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    resetTowerSkullCount(): Promise<void>;
    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns Promise that resolves when seal break sequence is complete
     */
    breakSeal(seal: Array<number> | number): Promise<void>;
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    randomRotateLevels(level?: number): Promise<void>;
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide;
}
