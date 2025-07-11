"use strict";
/**
 * Tests for constants and exported values
 */
Object.defineProperty(exports, "__esModule", { value: true });
const udtConstants_1 = require("../src/udtConstants");
describe('Constants', () => {
    describe('Bluetooth UUIDs', () => {
        test('should have correct UART service UUID', () => {
            expect(udtConstants_1.UART_SERVICE_UUID).toBe("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
        });
        test('should have correct TX characteristic UUID', () => {
            expect(udtConstants_1.UART_TX_CHARACTERISTIC_UUID).toBe("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
        });
        test('should have correct RX characteristic UUID', () => {
            expect(udtConstants_1.UART_RX_CHARACTERISTIC_UUID).toBe("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
        });
        test('should have correct tower device name', () => {
            expect(udtConstants_1.TOWER_DEVICE_NAME).toBe("ReturnToDarkTower");
        });
    });
    describe('Tower Commands', () => {
        test('should have all required tower commands', () => {
            expect(udtConstants_1.TOWER_COMMANDS).toHaveProperty('towerState');
            expect(udtConstants_1.TOWER_COMMANDS).toHaveProperty('doorReset');
            expect(udtConstants_1.TOWER_COMMANDS).toHaveProperty('unjamDrums');
            expect(udtConstants_1.TOWER_COMMANDS).toHaveProperty('resetCounter');
            expect(udtConstants_1.TOWER_COMMANDS).toHaveProperty('calibration');
            expect(udtConstants_1.TOWER_COMMANDS).toHaveProperty('overwriteDrumStates');
        });
        test('should have correct command values', () => {
            expect(udtConstants_1.TOWER_COMMANDS.towerState).toBe(0);
            expect(udtConstants_1.TOWER_COMMANDS.doorReset).toBe(1);
            expect(udtConstants_1.TOWER_COMMANDS.unjamDrums).toBe(2);
            expect(udtConstants_1.TOWER_COMMANDS.resetCounter).toBe(3);
            expect(udtConstants_1.TOWER_COMMANDS.calibration).toBe(4);
            expect(udtConstants_1.TOWER_COMMANDS.overwriteDrumStates).toBe(5);
        });
    });
    describe('Tower Command Types', () => {
        test('should have all required TC constants', () => {
            expect(udtConstants_1.TC.STATE).toBe("TOWER_STATE");
            expect(udtConstants_1.TC.INVALID_STATE).toBe("INVALID_STATE");
            expect(udtConstants_1.TC.FAILURE).toBe("HARDWARE_FAILURE");
            expect(udtConstants_1.TC.JIGGLE).toBe("MECH_JIGGLE_TRIGGERED");
            expect(udtConstants_1.TC.UNEXPECTED).toBe("MECH_UNEXPECTED_TRIGGER");
            expect(udtConstants_1.TC.DURATION).toBe("MECH_DURATION");
            expect(udtConstants_1.TC.DIFFERENTIAL).toBe("DIFFERENTIAL_READINGS");
            expect(udtConstants_1.TC.CALIBRATION).toBe("CALIBRATION_FINISHED");
            expect(udtConstants_1.TC.BATTERY).toBe("BATTERY_READING");
        });
    });
    describe('Drum Packets', () => {
        test('should have correct drum packet values', () => {
            expect(udtConstants_1.DRUM_PACKETS.topMiddle).toBe(1);
            expect(udtConstants_1.DRUM_PACKETS.bottom).toBe(2);
        });
    });
    describe('Light Packets', () => {
        test('should have doorway light configuration', () => {
            expect(udtConstants_1.LIGHT_PACKETS).toHaveProperty('doorway');
            expect(udtConstants_1.LIGHT_PACKETS.doorway).toHaveProperty('top');
            expect(udtConstants_1.LIGHT_PACKETS.doorway).toHaveProperty('middle');
            expect(udtConstants_1.LIGHT_PACKETS.doorway).toHaveProperty('bottom');
        });
        test('should have base light configuration', () => {
            expect(udtConstants_1.LIGHT_PACKETS).toHaveProperty('base');
            expect(udtConstants_1.LIGHT_PACKETS.base).toHaveProperty('north');
            expect(udtConstants_1.LIGHT_PACKETS.base).toHaveProperty('east');
            expect(udtConstants_1.LIGHT_PACKETS.base).toHaveProperty('south');
            expect(udtConstants_1.LIGHT_PACKETS.base).toHaveProperty('west');
        });
        test('should have ledge light configuration', () => {
            expect(udtConstants_1.LIGHT_PACKETS).toHaveProperty('ledge');
            expect(udtConstants_1.LIGHT_PACKETS.ledge).toHaveProperty('north');
            expect(udtConstants_1.LIGHT_PACKETS.ledge).toHaveProperty('east');
            expect(udtConstants_1.LIGHT_PACKETS.ledge).toHaveProperty('south');
            expect(udtConstants_1.LIGHT_PACKETS.ledge).toHaveProperty('west');
        });
    });
    describe('Glyphs', () => {
        test('should have GLYPHS object defined', () => {
            expect(udtConstants_1.GLYPHS).toBeDefined();
            expect(typeof udtConstants_1.GLYPHS).toBe('object');
        });
    });
    describe('Tower Audio Library', () => {
        test('should have TOWER_AUDIO_LIBRARY object defined', () => {
            expect(udtConstants_1.TOWER_AUDIO_LIBRARY).toBeDefined();
            expect(typeof udtConstants_1.TOWER_AUDIO_LIBRARY).toBe('object');
        });
    });
});
//# sourceMappingURL=constants.test.js.map