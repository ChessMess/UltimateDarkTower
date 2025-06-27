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
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command: Uint8Array): string;
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
     * Determines if a response should be logged based on command type and configuration.
     * @param {string} cmdKey - Command key from tower message
     * @param {any} logConfig - Logging configuration object
     * @returns {boolean} Whether this response should be logged
     */
    shouldLogResponse(cmdKey: string, logConfig: any): boolean;
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
