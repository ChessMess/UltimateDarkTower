"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultTowerState = exports.getActiveLights = exports.getTowerPosition = exports.commandToPacketString = exports.getMilliVoltsFromTowerResponse = exports.milliVoltsToPercentage = exports.milliVoltsToPercentageNumber = void 0;
const udtConstants_1 = require("./udtConstants");
/**
 * Converts battery voltage in millivolts to percentage number (0-100).
 * @param mv - Battery voltage in millivolts
 * @returns Battery percentage as number (0-100)
 */
function milliVoltsToPercentageNumber(mv) {
    const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
    const levels = udtConstants_1.VOLTAGE_LEVELS.filter(v => batLevel >= v);
    return levels.length * 5;
}
exports.milliVoltsToPercentageNumber = milliVoltsToPercentageNumber;
/**
 * Converts battery voltage in millivolts to percentage.
 * Tower returns sum total battery level in millivolts for all batteries.
 * @param {number} mv - Battery voltage in millivolts
 * @returns {string} Battery percentage as formatted string (e.g., "75%")
 */
function milliVoltsToPercentage(mv) {
    const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
    const levels = udtConstants_1.VOLTAGE_LEVELS.filter(v => batLevel >= v);
    return `${levels.length * 5}%`;
}
exports.milliVoltsToPercentage = milliVoltsToPercentage;
/**
 * Extracts battery voltage in millivolts from a tower battery response.
 * @param {Uint8Array} command - Battery response packet from tower
 * @returns {number} Battery voltage in millivolts
 */
function getMilliVoltsFromTowerResponse(command) {
    const mv = new Uint8Array(4);
    mv[0] = command[4];
    mv[1] = command[3];
    mv[2] = 0;
    mv[3] = 0;
    const view = new DataView(mv.buffer, 0);
    return view.getUint32(0, true);
}
exports.getMilliVoltsFromTowerResponse = getMilliVoltsFromTowerResponse;
/**
 * Converts a command packet to a hex string representation for debugging.
 * @param {Uint8Array} command - Command packet to convert
 * @returns {string} Hex string representation of the command packet
 */
function commandToPacketString(command) {
    let cmdStr = "[";
    command.forEach(n => cmdStr += n.toString(16) + ",");
    cmdStr = cmdStr.slice(0, -1) + "]";
    return cmdStr;
}
exports.commandToPacketString = commandToPacketString;
/**
 * Utility function to get the tower position and direction for a given layer and light index
 * Updated based on LED channel lookup table and corrected architecture:
 * - Layers 0-2: Ring LEDs with cardinal directions (N,E,S,W)
 * - Layers 3-5: Ledge/Base LEDs with ordinal directions (NE,SE,SW,NW)
 * @param layerIndex - The layer index (0-5)
 * @param lightIndex - The light index within the layer (0-3)
 * @returns Object containing the tower level, direction, and LED channel
 */
function getTowerPosition(layerIndex, lightIndex) {
    const isRingLayer = layerIndex <= 2;
    const ledChannel = udtConstants_1.LED_CHANNEL_LOOKUP[layerIndex * 4 + lightIndex];
    if (isRingLayer) {
        // Ring layers: cardinal directions (position 0 = North)
        const directions = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
        const layerNames = ['TOP_RING', 'MIDDLE_RING', 'BOTTOM_RING'];
        return {
            level: layerNames[layerIndex],
            direction: directions[lightIndex],
            ledChannel
        };
    }
    else {
        // Ledge/Base layers: ordinal directions (position 0 = North-East)
        const directions = ['NORTH_EAST', 'SOUTH_EAST', 'SOUTH_WEST', 'NORTH_WEST'];
        const layerNames = ['LEDGE', 'BASE1', 'BASE2'];
        return {
            level: layerNames[layerIndex - 3],
            direction: directions[lightIndex],
            ledChannel
        };
    }
}
exports.getTowerPosition = getTowerPosition;
/**
 * Utility function to get all active lights in a tower state
 * @param state - The tower state object
 * @returns Array of objects describing each active light
 */
function getActiveLights(state) {
    const activeLights = [];
    state.layer.forEach((layer, layerIndex) => {
        layer.light.forEach((light, lightIndex) => {
            if (light.effect > 0) {
                const position = getTowerPosition(layerIndex, lightIndex);
                activeLights.push({
                    level: position.level,
                    direction: position.direction,
                    effect: light.effect,
                    loop: light.loop
                });
            }
        });
    });
    return activeLights;
}
exports.getActiveLights = getActiveLights;
/**
 * Creates a default/empty tower state with all settings reset to defaults
 * @returns A default TowerState object with all lights off, no audio, etc.
 */
function createDefaultTowerState() {
    return {
        drum: [
            { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
            { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
            { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
        ],
        layer: [
            { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
            { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
            { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
            { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
            { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
            { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
        ],
        audio: { sample: 0, loop: false, volume: 0 },
        beam: { count: 0, fault: false },
        led_sequence: 0
    };
}
exports.createDefaultTowerState = createDefaultTowerState;
//# sourceMappingURL=udtHelpers.js.map