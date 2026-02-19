/**
 * Configuration interface for controlling which tower responses should be logged
 */
export interface TowerResponseConfig {
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
}
export declare class TowerResponseProcessor {
    private logDetail;
    constructor(logDetail?: boolean);
    /**
     * Sets whether to include detailed information in command string conversion
     * @param {boolean} enabled - Whether to enable detailed logging
     */
    setDetailedLogging(enabled: boolean): void;
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
     * Converts a command packet to a human-readable string array for logging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
    commandToString(command: Uint8Array): Array<string>;
    /**
     * Determines if a response should be logged based on command type and configuration.
     * @param {string} cmdKey - Command key from tower message
     * @param {any} logConfig - Logging configuration object
     * @returns {boolean} Whether this response should be logged
     */
    shouldLogResponse(cmdKey: string, logConfig: TowerResponseConfig): boolean;
    /**
     * Checks if a command is a battery response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a battery response
     */
    isBatteryResponse(cmdKey: string): boolean;
    /**
     * Checks if a command is a tower state response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a tower state response
     */
    isTowerStateResponse(cmdKey: string): boolean;
}
