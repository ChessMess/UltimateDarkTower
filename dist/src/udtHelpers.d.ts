import { type TowerState } from './udtTowerState';
/**
 * Converts battery voltage in millivolts to percentage number (0-100).
 * @param mv - Battery voltage in millivolts
 * @returns Battery percentage as number (0-100)
 */
export declare function milliVoltsToPercentageNumber(mv: number): number;
/**
 * Converts battery voltage in millivolts to percentage.
 * Tower returns sum total battery level in millivolts for all batteries.
 * @param mv - Battery voltage in millivolts
 * @returns Battery percentage as formatted string (e.g., "75%")
 */
export declare function milliVoltsToPercentage(mv: number): string;
/**
 * Extracts battery voltage in millivolts from a tower battery response.
 * @param {Uint8Array} command - Battery response packet from tower
 * @returns {number} Battery voltage in millivolts
 */
export declare function getMilliVoltsFromTowerResponse(command: Uint8Array): number;
/**
 * Converts a command packet to a hex string representation for debugging.
 * @param {Uint8Array} command - Command packet to convert
 * @returns {string} Hex string representation of the command packet
 */
export declare function commandToPacketString(command: Uint8Array): string;
/**
 * Utility function to get the tower position and direction for a given layer and light index
 * Updated based on LED channel lookup table and corrected architecture:
 * - Layers 0-2: Ring LEDs with cardinal directions (N,E,S,W)
 * - Layers 3-5: Ledge/Base LEDs with ordinal directions (NE,SE,SW,NW)
 * @param layerIndex - The layer index (0-5)
 * @param lightIndex - The light index within the layer (0-3)
 * @returns Object containing the tower level, direction, and LED channel
 */
export declare function getTowerPosition(layerIndex: number, lightIndex: number): {
    level: string;
    direction: string;
    ledChannel?: number;
};
/**
 * Utility function to get all active lights in a tower state
 * @param state - The tower state object
 * @returns Array of objects describing each active light
 */
export declare function getActiveLights(state: TowerState): Array<{
    level: string;
    direction: string;
    effect: number;
    loop: boolean;
}>;
/**
 * Interface for parsed differential readings
 */
export interface ParsedDifferentialReadings {
    irBeam: number;
    drum1: number;
    drum2: number;
    drum3: number;
    timestamp: number;
    rawData: Uint8Array;
}
/**
 * Parses a tower response containing differential readings into individual components.
 * The firmware packs 4 differential readings into a 32-bit value and transmits as bytes:
 * - Firmware: (signals_smoothed[0] << 24) | (signals_smoothed[1] << 16) | (signals_smoothed[2] << 8) | signals_smoothed[3]
 * - signals_smoothed[0] = IR beam (drop sensor)
 * - signals_smoothed[1] = Drum 1 (top)
 * - signals_smoothed[2] = Drum 2 (middle)
 * - signals_smoothed[3] = Drum 3 (bottom)
 *
 * Transmitted as: [cmd_byte][IR_beam][drum1][drum2][drum3]
 *
 * @param response - Tower response packet (should be MESSAGE_DIFFERENTIAL_READINGS with command value 6)
 * @returns Parsed differential readings or null if not a valid differential response
 */
export declare function parseDifferentialReadings(response: Uint8Array): ParsedDifferentialReadings | null;
/**
 * Creates a default/empty tower state with all settings reset to defaults
 * @returns A default TowerState object with all lights off, no audio, etc.
 */
export declare function createDefaultTowerState(): TowerState;
