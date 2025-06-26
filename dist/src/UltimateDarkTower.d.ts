/// <reference types="node" />
import { type Lights, type TowerSide, type RotateCommand, type CommandPacket } from './constants';
import { type LogOutput } from './Logger';
/**
 * @title UltimateDarkTower
 * @notes
 * The UltimateDarkTower class represents a control interface for the Return To Dark Tower device.
 * It provides methods for calibrating the tower, playing sounds, controlling lights,
 * rotating the tower, and more.
 * The class also handles the Bluetooth connection to the tower device.
 *
 * Disconnect Detection Features:
 *    - Listens for GATT server disconnect events
 *    - Monitors connection health with configurable heartbeat checks
 *    - Uses battery status (sent every ~200ms) as primary heartbeat for disconnect detection
 *    - Detects timeouts when no responses are received
 *    - Handles Bluetooth availability changes
 *    - Provides callback notifications for all disconnect scenarios
 *    - Battery heartbeat monitoring is ideal for detecting power loss/battery depletion
 *
 * Known Issues:
 *    Tower command complete response is not being considered. Async Await is working
 *    only on the fact that a command was sent, which is pretty much immediate, so we need
 *    to rework this a bit to take into account when a command is complete. This is all
 *    part of work still to be done.
 */
declare class UltimateDarkTower {
    private logger;
    TowerDevice: any;
    txCharacteristic: any;
    rxCharacteristic: any;
    batteryNotifyFrequency: number;
    batteryNotifyOnValueChangeOnly: boolean;
    retrySendCommandCount: number;
    retrySendCommandMax: number;
    currentDrumPositions: {
        topMiddle: number;
        bottom: number;
    };
    isCalibrated: boolean;
    isConnected: boolean;
    towerSkullDropCount: number;
    performingCalibration: boolean;
    lastBatteryNotification: number;
    lastBatteryPercentage: string;
    connectionMonitorInterval: NodeJS.Timeout | null;
    connectionMonitorFrequency: number;
    lastSuccessfulCommand: number;
    connectionTimeoutThreshold: number;
    enableConnectionMonitoring: boolean;
    lastBatteryHeartbeat: number;
    batteryHeartbeatTimeout: number;
    calibrationHeartbeatTimeout: number;
    enableBatteryHeartbeatMonitoring: boolean;
    onCalibrationComplete: () => void;
    onSkullDrop: (towerSkullCount: number) => void;
    onBatteryLevelNotify: (millivolts: number) => void;
    onTowerConnect: () => void;
    onTowerDisconnect: () => void;
    constructor();
    logDetail: boolean;
    logTowerResponses: boolean;
    logTowerResponseConfig: {
        TOWER_STATE: boolean;
        INVALID_STATE: boolean;
        HARDWARE_FAILURE: boolean;
        MECH_JIGGLE_TRIGGERED: boolean;
        MECH_UNEXPECTED_TRIGGER: boolean;
        MECH_DURATION: boolean;
        DIFFERENTIAL_READINGS: boolean;
        BATTERY_READING: boolean;
        CALIBRATION_FINISHED: boolean;
        LOG_ALL: boolean;
    };
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns {Promise<void>} Promise that resolves when calibration command is sent
     */
    calibrate(): Promise<void>;
    /**
     * Plays a sound from the tower's audio library.
     * @param {number} soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns {Promise<void>} Promise that resolves when sound command is sent
     */
    playSound(soundIndex: number): Promise<void>;
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param {Lights} lights - Light configuration object specifying which lights to control and their effects
     * @returns {Promise<void>} Promise that resolves when light command is sent
     */
    Lights(lights: Lights): Promise<void>;
    /**
     * Sends a light override command to control specific light patterns.
     * @param {number} light - Light override value to send
     * @param {number} [soundIndex] - Optional sound to play with the light override
     * @returns {Promise<void>} Promise that resolves when light override command is sent
     */
    lightOverrides(light: number, soundIndex?: number): Promise<void>;
    /**
     * Rotates tower drums to specified positions.
     * @param {TowerSide} top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param {TowerSide} middle - Position for the middle drum
     * @param {TowerSide} bottom - Position for the bottom drum
     * @param {number} [soundIndex] - Optional sound to play during rotation
     * @returns {Promise<void>} Promise that resolves when rotate command is sent
     */
    Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void>;
    /**
     * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
     * @param {RotateCommand} [rotate] - Rotation configuration for tower drums
     * @param {Lights} [lights] - Light configuration object
     * @param {number} [soundIndex] - Optional sound to play with the multi-command
     * @returns {Promise<void>} Promise that resolves when multi-command is sent
     */
    MultiCommand(rotate?: RotateCommand, lights?: Lights, soundIndex?: number): Promise<void>;
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns {Promise<void>} Promise that resolves when reset command is sent
     */
    resetTowerSkullCount(): Promise<void>;
    /**
     * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
     * @param {Array<number> | number} seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
     * @returns {Promise<void>} Promise that resolves when seal break sequence is complete
     */
    breakSeal(seal: Array<number> | number): Promise<void>;
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param {number} [level=0] - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns {Promise<void>} Promise that resolves when rotation command is sent
     */
    randomRotateLevels(level?: number): Promise<void>;
    /**
     * Gets the current position of a specific drum level.
     * @param {('top' | 'middle' | 'bottom')} level - The drum level to get position for
     * @returns {TowerSide} The current position of the specified drum level
     * @private
     */
    private getCurrentDrumPosition;
    /**
     * Establishes a Bluetooth connection to the Dark Tower device.
     * Initializes GATT services, characteristics, and starts connection monitoring.
     * @returns {Promise<void>} Promise that resolves when connection is established
     */
    connect(): Promise<void>;
    /**
     * Handles incoming data from the tower via Bluetooth characteristic notifications.
     * Processes battery status, tower state responses, and other tower communications.
     * @param {Event} event - Bluetooth characteristic value changed event
     */
    onRxCharacteristicValueChanged: (event: any) => void;
    /**
     * Processes tower state response data including calibration completion and skull drop detection.
     * @param {Uint8Array} receivedData - Raw data received from the tower
     * @private
     */
    private handleTowerStateResponse;
    /**
     * Logs tower response data based on configured logging settings.
     * @param {Uint8Array} receivedData - Raw data received from the tower
     * @private
     */
    private logTowerResponse;
    /**
     * Disconnects from the tower device and cleans up resources.
     * @returns {Promise<void>} Promise that resolves when disconnection is complete
     */
    disconnect(): Promise<void>;
    /**
     * Handles Bluetooth availability changes and manages disconnection if Bluetooth becomes unavailable.
     * @param {Event} event - Bluetooth availability change event
     */
    bleAvailabilityChange: (event: any) => void;
    /**
     * Handles unexpected tower device disconnection events.
     * @param {Event} event - GATT server disconnected event
     */
    onTowerDeviceDisconnected: (event: any) => void;
    /**
     * Centralizes disconnection handling, cleaning up state and notifying callbacks.
     * @private
     */
    private handleDisconnection;
    /**
     * Starts the connection monitoring interval to periodically check connection health.
     * @private
     */
    private startConnectionMonitoring;
    /**
     * Stops the connection monitoring interval.
     * @private
     */
    private stopConnectionMonitoring;
    /**
     * Performs connection health checks including battery heartbeat and GATT connection status.
     * @private
     */
    private checkConnectionHealth;
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
     * Updates a command packet with the current drum positions.
     * @param {CommandPacket} commandPacket - The command packet to update with current drum positions
     */
    updateCommandWithCurrentDrumPositions(commandPacket: CommandPacket): void;
    /**
     * Creates a light command packet from a lights configuration object.
     * @param {Lights} lights - Light configuration specifying doorway, ledge, and base lights
     * @returns {Uint8Array} Command packet for controlling tower lights
     */
    createLightPacketCommand: (lights: Lights) => Uint8Array;
    /**
     * Creates a light override command packet.
     * @param {number} lightOverride - Light override value to send
     * @returns {Uint8Array} Command packet for light override
     */
    createLightOverrideCommand(lightOverride: number): Uint8Array;
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param {TowerSide} top - Target position for top drum
     * @param {TowerSide} middle - Target position for middle drum
     * @param {TowerSide} bottom - Target position for bottom drum
     * @returns {Uint8Array} Command packet for rotating tower drums
     */
    createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide): Uint8Array;
    /**
     * Creates a sound command packet for playing tower audio.
     * @param {number} soundIndex - Index of the sound to play from the audio library
     * @returns {Uint8Array} Command packet for playing sound
     */
    createSoundCommand(soundIndex: number): Uint8Array;
    /**
     * Converts a command packet to a human-readable string array for logging.
     * TODO: return parsed data values rather than raw packet values
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
    commandToString(command: Uint8Array): Array<string>;
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command: Uint8Array): string;
    /**
     * Maps a command value to its corresponding tower message definition.
     * @param {number} cmdValue - Command value received from tower
     * @returns {Object} Object containing command key and command definition
     */
    getTowerCommand(cmdValue: number): {
        cmdKey: string;
        command: any;
    };
    /**
     * Extracts battery voltage in millivolts from a tower battery response.
     * @param {Uint8Array} command - Battery response packet from tower
     * @returns {number} Battery voltage in millivolts
     */
    getMilliVoltsFromTowerReponse(command: Uint8Array): number;
    /**
     * Converts battery voltage in millivolts to percentage.
     * Tower returns sum total battery level in millivolts for all batteries.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    millVoltsToPercentage(mv: number): string;
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
     */
    configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number): void;
    /**
     * Check if the tower is currently connected
     * @returns {Promise<boolean>} True if connected and responsive
     */
    isConnectedAndResponsive(): Promise<boolean>;
    /**
     * Get detailed connection status including heartbeat information
     * @returns {Object} Object with connection details
     */
    getConnectionStatus(): {
        isConnected: boolean;
        isGattConnected: any;
        isCalibrated: boolean;
        lastBatteryHeartbeatMs: number;
        lastCommandResponseMs: number;
        batteryHeartbeatHealthy: boolean;
        connectionMonitoringEnabled: boolean;
        batteryHeartbeatMonitoringEnabled: boolean;
        batteryHeartbeatTimeoutMs: number;
        connectionTimeoutMs: number;
    };
    /**
     * Clean up resources and disconnect properly
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    cleanup(): Promise<void>;
}
export default UltimateDarkTower;
