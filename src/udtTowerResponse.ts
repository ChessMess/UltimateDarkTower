import {
    TC,
    TOWER_MESSAGES
} from './udtConstants';
import { logger } from './udtLogger';
import { milliVoltsToPercentage, getMilliVoltsFromTowerResponse, commandToPacketString } from './udtHelpers';

export class TowerResponseProcessor {
    private logDetail: boolean = false;

    constructor(logDetail: boolean = false) {
        this.logDetail = logDetail;
    }

    /**
     * Sets whether to include detailed information in command string conversion
     * @param {boolean} enabled - Whether to enable detailed logging
     */
    setDetailedLogging(enabled: boolean) {
        this.logDetail = enabled;
    }

    /**
     * Maps a command value to its corresponding tower message definition.
     * @param {number} cmdValue - Command value received from tower
     * @returns {Object} Object containing command key and command definition
     */
    getTowerCommand(cmdValue: number) {
        const cmdKeys = Object.keys(TOWER_MESSAGES);
        const cmdKey = cmdKeys.find(key => TOWER_MESSAGES[key].value === cmdValue);
        if (!cmdKey) {
            logger.warn(`Unknown command received from tower: ${cmdValue} (0x${cmdValue.toString(16)})`, 'TowerResponseProcessor');
            return { cmdKey: undefined, command: { name: "Unknown Command", value: cmdValue } };
        }
        const command = TOWER_MESSAGES[cmdKey];
        return { cmdKey, command };
    }

    /**
     * Converts a command packet to a human-readable string array for logging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
    commandToString(command: Uint8Array): Array<string> {
        const cmdValue = command[0];
        const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue);

        switch (cmdKey) {
            case TC.STATE:
            case TC.INVALID_STATE:
            case TC.FAILURE:
            case TC.JIGGLE:
            case TC.UNEXPECTED:
            case TC.DURATION:
            case TC.DIFFERENTIAL:
            case TC.CALIBRATION:
                return [towerCommand.name, commandToPacketString(command)];
            case TC.BATTERY: {
                const millivolts = getMilliVoltsFromTowerResponse(command);
                const retval = [towerCommand.name, milliVoltsToPercentage(millivolts)];
                if (this.logDetail) {
                    retval.push(`${millivolts}mv`);
                    retval.push(commandToPacketString(command));
                }
                return retval;
            }
            default:
                return ["Unmapped Response!", commandToPacketString(command)];
        }
    }


    /**
     * Determines if a response should be logged based on command type and configuration.
     * @param {string} cmdKey - Command key from tower message
     * @param {any} logConfig - Logging configuration object
     * @returns {boolean} Whether this response should be logged
     */
    shouldLogResponse(cmdKey: string, logConfig: any): boolean {
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
    isBatteryResponse(cmdKey: string): boolean {
        return cmdKey === TC.BATTERY;
    }

    /**
     * Checks if a command is a tower state response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a tower state response
     */
    isTowerStateResponse(cmdKey: string): boolean {
        return cmdKey === TC.STATE;
    }
}