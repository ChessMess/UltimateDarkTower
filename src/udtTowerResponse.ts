import {
    TC,
    TOWER_MESSAGES,
    VOLTAGE_LEVELS
} from './constants';
import { logger } from './Logger';

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
                return [towerCommand.name, this.commandToPacketString(command)];
            case TC.BATTERY: {
                const millivolts = this.getMilliVoltsFromTowerResponse(command);
                const retval = [towerCommand.name, this.milliVoltsToPercentage(millivolts)];
                if (this.logDetail) {
                    retval.push(`${millivolts}mv`);
                    retval.push(this.commandToPacketString(command));
                }
                return retval;
            }
            default:
                return ["Unmapped Response!", this.commandToPacketString(command)];
        }
    }

    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command: Uint8Array): string {
        let cmdStr = "[";
        command.forEach(n => cmdStr += n.toString(16) + ",");
        cmdStr = cmdStr.slice(0, -1) + "]";
        return cmdStr;
    }

    /**
     * Extracts battery voltage in millivolts from a tower battery response.
     * @param {Uint8Array} command - Battery response packet from tower
     * @returns {number} Battery voltage in millivolts
     */
    getMilliVoltsFromTowerResponse(command: Uint8Array): number {
        const mv = new Uint8Array(4);
        mv[0] = command[4];
        mv[1] = command[3];
        mv[2] = 0;
        mv[3] = 0;
        const view = new DataView(mv.buffer, 0);
        return view.getUint32(0, true);
    }

    /**
     * Converts battery voltage in millivolts to percentage.
     * Tower returns sum total battery level in millivolts for all batteries.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    milliVoltsToPercentage(mv: number): string {
        const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
        const levels = VOLTAGE_LEVELS.filter(v => batLevel >= v);
        return `${levels.length * 5}%`;
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