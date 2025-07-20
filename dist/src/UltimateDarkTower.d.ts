import { type Lights, type TowerSide, type SealIdentifier, type Glyphs } from './udtConstants';
import { type TowerState } from './udtTowerState';
import { type LogOutput } from './udtLogger';
import { type ConnectionStatus } from './udtBleConnection';
/**
 * @title UltimateDarkTower
 * @description
 * The UltimateDarkTower class is the main control interface for the Return To Dark Tower board game device.
 * It provides a comprehensive API for interacting with the tower through Bluetooth Low Energy (BLE).
 *
 * Usage:
 * 1. Create instance: const tower = new UltimateDarkTower()
 * 2. Connect to tower: await tower.connect()
 * 3. Calibrate tower: await tower.calibrate()
 * 4. Use tower commands: await tower.playSound(1), await tower.Lights({...}), etc.
 * 5. Clean up: await tower.cleanup()
 *
 * Event Callbacks:
 * - onTowerConnect: Called when tower connects
 * - onTowerDisconnect: Called when tower disconnects
 * - onCalibrationComplete: Called when calibration finishes
 * - onSkullDrop: Called when skulls are dropped into the tower
 * - onBatteryLevelNotify: Called when battery level updates
 */
declare class UltimateDarkTower {
    private logger;
    private bleConnection;
    private responseProcessor;
    private commandFactory;
    private towerCommands;
    private retrySendCommandCountRef;
    retrySendCommandMax: number;
    currentDrumPositions: {
        topMiddle: number;
        bottom: number;
    };
    currentBatteryValue: number;
    previousBatteryValue: number;
    currentBatteryPercentage: number;
    previousBatteryPercentage: number;
    private brokenSeals;
    private currentTowerState;
    private glyphPositions;
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    onCalibrationComplete: () => void;
    onSkullDrop: (_towerSkullCount: number) => void;
    onBatteryLevelNotify: (_millivolts: number) => void;
    constructor();
    private _logDetail;
    get logDetail(): boolean;
    set logDetail(value: boolean);
    get isConnected(): boolean;
    get isCalibrated(): boolean;
    get performingCalibration(): boolean;
    get performingLongCommand(): boolean;
    get towerSkullDropCount(): number;
    get txCharacteristic(): any;
    get currentBattery(): number;
    get previousBattery(): number;
    get currentBatteryPercent(): number;
    get previousBatteryPercent(): number;
    get batteryNotifyFrequency(): number;
    set batteryNotifyFrequency(value: number);
    get batteryNotifyOnValueChangeOnly(): boolean;
    set batteryNotifyOnValueChangeOnly(value: boolean);
    get logTowerResponses(): boolean;
    set logTowerResponses(value: boolean);
    get logTowerResponseConfig(): any;
    set logTowerResponseConfig(value: any);
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns {Promise<void>} Promise that resolves when calibration command is sent
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
    Lights(lights: Lights): Promise<void>;
    /**
     * Sends a raw command packet directly to the tower (for testing purposes).
     * @param command - The raw command packet to send
     * @returns Promise that resolves when command is sent
     */
    sendTowerCommandDirect(command: Uint8Array): Promise<void>;
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
    Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void>;
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    resetTowerSkullCount(): Promise<void>;
    /**
     * Sets a specific LED using stateful commands that preserve all other tower state.
     * This is the recommended way to control individual LEDs.
     * @param layerIndex - Layer index (0-5: TopRing, MiddleRing, BottomRing, Ledge, Base1, Base2)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, 3=fast pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns Promise that resolves when command is sent
     */
    setLED(layerIndex: number, lightIndex: number, effect: number, loop?: boolean): Promise<void>;
    /**
     * Plays a sound using stateful commands that preserve existing tower state.
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
     * Gets the current complete tower state if available.
     * @returns The current tower state object
     */
    getCurrentTowerState(): TowerState;
    /**
     * Sends a complete tower state to the tower, preserving existing state.
     * This creates a stateful command that only changes the specified fields.
     * @param towerState - The tower state to send
     * @returns Promise that resolves when the command is sent
     */
    sendTowerState(towerState: TowerState): Promise<void>;
    /**
     * Sets the tower state with comprehensive logging of changes.
     * @param newState - The new tower state to set
     * @param source - Source identifier for logging (e.g., "sendTowerState", "tower response")
     */
    private setTowerState;
    /**
     * Updates the current tower state from a tower response.
     * Called internally when tower state responses are received.
     * @param stateData - The 19-byte state data from tower response
     */
    private updateTowerStateFromResponse;
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @returns Promise that resolves when seal break sequence is complete
     */
    breakSeal(seal: SealIdentifier): Promise<void>;
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
    /**
     * Sets the initial glyph positions from calibration.
     * Called automatically when calibration completes.
     */
    private setGlyphPositionsFromCalibration;
    /**
     * Gets the current position of a specific glyph.
     * @param glyph - The glyph to get position for
     * @returns The current position of the glyph, or null if not calibrated
     */
    getGlyphPosition(glyph: Glyphs): TowerSide | null;
    /**
     * Gets all current glyph positions.
     * @returns Object mapping each glyph to its current position (or null if not calibrated)
     */
    getAllGlyphPositions(): {
        [key in Glyphs]: TowerSide | null;
    };
    /**
     * Gets all glyphs currently facing a specific direction.
     * @param direction - The direction to check for (north, east, south, west)
     * @returns Array of glyph names that are currently facing the specified direction
     */
    getGlyphsFacingDirection(direction: TowerSide): Glyphs[];
    /**
     * Updates glyph positions after a drum rotation.
     * @param level - The drum level that was rotated
     * @param rotationSteps - Number of steps rotated (1 = 90 degrees clockwise)
     */
    private updateGlyphPositionsAfterRotation;
    /**
     * Calculates rotation steps and updates glyph positions for a specific level.
     * @param level - The drum level that was rotated
     * @param oldPosition - The position before rotation
     * @param newPosition - The position after rotation
     */
    private calculateAndUpdateGlyphPositions;
    /**
     * Updates glyph positions for a specific level rotation.
     * @param level - The drum level that was rotated
     * @param newPosition - The new position the drum was rotated to
     * @deprecated Use calculateAndUpdateGlyphPositions instead
     */
    private updateGlyphPositionsForRotation;
    /**
     * Checks if a specific seal is broken.
     * @param seal - The seal identifier to check
     * @returns True if the seal is broken, false otherwise
     */
    isSealBroken(seal: SealIdentifier): boolean;
    /**
     * Gets a list of all broken seals.
     * @returns Array of SealIdentifier objects representing all broken seals
     */
    getBrokenSeals(): SealIdentifier[];
    /**
     * Resets the broken seals tracking (clears all broken seals).
     */
    resetBrokenSeals(): void;
    /**
     * Gets a random unbroken seal that can be passed to breakSeal().
     * @returns A random SealIdentifier that is not currently broken, or null if all seals are broken
     */
    getRandomUnbrokenSeal(): SealIdentifier | null;
    /**
     * Establishes a Bluetooth connection to the Dark Tower device.
     * Initializes GATT services, characteristics, and starts connection monitoring.
     * @returns {Promise<void>} Promise that resolves when connection is established
     */
    connect(): Promise<void>;
    /**
     * Disconnects from the tower device and cleans up resources.
     * @returns {Promise<void>} Promise that resolves when disconnection is complete
     */
    disconnect(): Promise<void>;
    /**
     * Configure logger outputs for this UltimateDarkTower instance
     * @param {LogOutput[]} outputs - Array of log outputs to use (e.g., ConsoleOutput, DOMOutput)
     */
    setLoggerOutputs(outputs: LogOutput[]): void;
    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param {Uint8Array} command - The command packet to send to the tower
     * @returns {Promise<void>} Promise that resolves when command is sent successfully
     */
    sendTowerCommand(command: Uint8Array): Promise<void>;
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command: Uint8Array): string;
    /**
     * Converts battery voltage in millivolts to percentage.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    milliVoltsToPercentage(mv: number): string;
    /**
     * Enable or disable connection monitoring
     * @param {boolean} enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled: boolean): void;
    /**
     * Configure connection monitoring parameters
     * @param {number} [frequency=2000] - How often to check connection (milliseconds)
     * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency?: number, timeout?: number): void;
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
     * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
     * @param {boolean} [verifyConnection=true] - Whether to verify connection status before triggering disconnection on heartbeat timeout
     */
    configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number, verifyConnection?: boolean): void;
    /**
     * Check if the tower is currently connected
     * @returns {Promise<boolean>} True if connected and responsive
     */
    isConnectedAndResponsive(): Promise<boolean>;
    /**
     * Get detailed connection status including heartbeat information
     * @returns {Object} Object with connection details
     */
    getConnectionStatus(): ConnectionStatus;
    /**
     * Clean up resources and disconnect properly
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    cleanup(): Promise<void>;
}
export default UltimateDarkTower;
