"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowerResponseProcessor = void 0;
const udtConstants_1 = require("./udtConstants");
const udtLogger_1 = require("./udtLogger");
const udtHelpers_1 = require("./udtHelpers");
class TowerResponseProcessor {
    constructor(logDetail = false) {
        this.logDetail = false;
        this.logDetail = logDetail;
    }
    /**
     * Sets whether to include detailed information in command string conversion
     * @param {boolean} enabled - Whether to enable detailed logging
     */
    setDetailedLogging(enabled) {
        this.logDetail = enabled;
    }
    /**
     * Maps a command value to its corresponding tower message definition.
     * @param {number} cmdValue - Command value received from tower
     * @returns {Object} Object containing command key and command definition
     */
    getTowerCommand(cmdValue) {
        const cmdKeys = Object.keys(udtConstants_1.TOWER_MESSAGES);
        const cmdKey = cmdKeys.find(key => udtConstants_1.TOWER_MESSAGES[key].value === cmdValue);
        if (!cmdKey) {
            udtLogger_1.logger.warn(`Unknown command received from tower: ${cmdValue} (0x${cmdValue.toString(16)})`, 'TowerResponseProcessor');
            return { cmdKey: undefined, command: { name: "Unknown Command", value: cmdValue } };
        }
        const command = udtConstants_1.TOWER_MESSAGES[cmdKey];
        return { cmdKey, command };
    }
    /**
     * Converts a command packet to a human-readable string array for logging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
    commandToString(command) {
        const cmdValue = command[0];
        const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue);
        switch (cmdKey) {
            case udtConstants_1.TC.STATE:
            case udtConstants_1.TC.INVALID_STATE:
            case udtConstants_1.TC.FAILURE:
            case udtConstants_1.TC.JIGGLE:
            case udtConstants_1.TC.UNEXPECTED:
            case udtConstants_1.TC.DURATION:
            case udtConstants_1.TC.DIFFERENTIAL:
            case udtConstants_1.TC.CALIBRATION:
                return [towerCommand.name, (0, udtHelpers_1.commandToPacketString)(command)];
            case udtConstants_1.TC.BATTERY: {
                const millivolts = (0, udtHelpers_1.getMilliVoltsFromTowerResponse)(command);
                const retval = [towerCommand.name, (0, udtHelpers_1.milliVoltsToPercentage)(millivolts)];
                if (this.logDetail) {
                    retval.push(`${millivolts}mv`);
                    retval.push((0, udtHelpers_1.commandToPacketString)(command));
                }
                return retval;
            }
            default:
                return ["Unmapped Response!", (0, udtHelpers_1.commandToPacketString)(command)];
        }
    }
    /**
     * Determines if a response should be logged based on command type and configuration.
     * @param {string} cmdKey - Command key from tower message
     * @param {any} logConfig - Logging configuration object
     * @returns {boolean} Whether this response should be logged
     */
    shouldLogResponse(cmdKey, logConfig) {
        const logAll = logConfig["LOG_ALL"];
        let canLogThisResponse = logConfig[cmdKey] || logAll;
        // Log unknown commands by default for debugging
        if (!cmdKey) {
            canLogThisResponse = true;
        }
        return canLogThisResponse;
    }
    /**
     * Checks if a command is a battery response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a battery response
     */
    isBatteryResponse(cmdKey) {
        return cmdKey === udtConstants_1.TC.BATTERY;
    }
    /**
     * Checks if a command is a tower state response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a tower state response
     */
    isTowerStateResponse(cmdKey) {
        return cmdKey === udtConstants_1.TC.STATE;
    }
}
exports.TowerResponseProcessor = TowerResponseProcessor;
//# sourceMappingURL=udtTowerResponse.js.map