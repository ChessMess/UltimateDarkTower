"use strict";
/**
 * Comprehensive tests for rtdt_pack_state and rtdt_unpack_state functions
 * These functions handle binary serialization/deserialization of tower state
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const udtTowerState_1 = require("../src/udtTowerState");
const udtConstants_1 = require("../src/udtConstants");
const udtHelpers_1 = require("../src/udtHelpers");
const tower_state_test_data_json_1 = __importDefault(require("./tower-state-test-data.json"));
describe('Pack/Unpack Functions', () => {
    // Helper function to compare tower states deeply
    function compareTowerStates(actual, expected) {
        // Compare drums
        for (let i = 0; i < 3; i++) {
            expect(actual.drum[i].jammed).toBe(expected.drum[i].jammed);
            expect(actual.drum[i].calibrated).toBe(expected.drum[i].calibrated);
            expect(actual.drum[i].position).toBe(expected.drum[i].position);
            expect(actual.drum[i].playSound).toBe(expected.drum[i].playSound);
            expect(actual.drum[i].reverse).toBe(expected.drum[i].reverse);
        }
        // Compare layers
        for (let layer = 0; layer < 6; layer++) {
            for (let light = 0; light < 4; light++) {
                expect(actual.layer[layer].light[light].effect).toBe(expected.layer[layer].light[light].effect);
                expect(actual.layer[layer].light[light].loop).toBe(expected.layer[layer].light[light].loop);
            }
        }
        // Compare audio
        expect(actual.audio.sample).toBe(expected.audio.sample);
        expect(actual.audio.loop).toBe(expected.audio.loop);
        expect(actual.audio.volume).toBe(expected.audio.volume);
        // Compare beam (note: beam testing excluded per user request)
        expect(actual.beam.count).toBe(expected.beam.count);
        expect(actual.beam.fault).toBe(expected.beam.fault);
        // Compare LED sequence
        expect(actual.led_sequence).toBe(expected.led_sequence);
    }
    // Helper function to create a buffer with proper size
    function createBuffer() {
        return new Uint8Array(udtConstants_1.STATE_DATA_LENGTH);
    }
    describe('Round-trip Testing', () => {
        test.each(tower_state_test_data_json_1.default)('$id: $description', (testCase) => {
            const buffer = createBuffer();
            // Pack the state
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, testCase.tower_state_test);
            expect(packResult).toBe(true);
            // Unpack the state
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            // Compare with expected result (use tower_state_expected if provided, otherwise use original)
            const expectedState = testCase.tower_state_expected || testCase.tower_state_test;
            compareTowerStates(unpackedState, expectedState);
        });
    });
    describe('Default State Handling', () => {
        test('should handle default tower state correctly', () => {
            const defaultState = (0, udtHelpers_1.createDefaultTowerState)();
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, defaultState);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            compareTowerStates(unpackedState, defaultState);
        });
        test('should create buffer with all zeros for default state', () => {
            const defaultState = (0, udtHelpers_1.createDefaultTowerState)();
            const buffer = createBuffer();
            (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, defaultState);
            // All bytes should be zero for default state
            for (let i = 0; i < udtConstants_1.STATE_DATA_LENGTH; i++) {
                expect(buffer[i]).toBe(0);
            }
        });
    });
    describe('Drum Position Testing', () => {
        test.each([
            { drumIndex: 0, position: 0 },
            { drumIndex: 0, position: 1 },
            { drumIndex: 0, position: 2 },
            { drumIndex: 0, position: 3 },
            { drumIndex: 1, position: 0 },
            { drumIndex: 1, position: 1 },
            { drumIndex: 1, position: 2 },
            { drumIndex: 1, position: 3 },
            { drumIndex: 2, position: 0 },
            { drumIndex: 2, position: 1 },
            { drumIndex: 2, position: 2 },
            { drumIndex: 2, position: 3 },
        ])('should handle drum $drumIndex at position $position', ({ drumIndex, position }) => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.drum[drumIndex].position = position;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.drum[drumIndex].position).toBe(position);
        });
    });
    describe('Drum Boolean Properties Testing', () => {
        test.each([
            { drumIndex: 0, property: 'jammed' },
            { drumIndex: 0, property: 'calibrated' },
            { drumIndex: 0, property: 'playSound' },
            { drumIndex: 1, property: 'jammed' },
            { drumIndex: 1, property: 'calibrated' },
            { drumIndex: 1, property: 'playSound' },
            { drumIndex: 2, property: 'jammed' },
            { drumIndex: 2, property: 'calibrated' },
            { drumIndex: 2, property: 'playSound' },
        ])('should handle drum $drumIndex $property = true', ({ drumIndex, property }) => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.drum[drumIndex][property] = true;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.drum[drumIndex][property]).toBe(true);
        });
    });
    describe('LED Layer and Effect Testing', () => {
        test.each([
            { layer: 0, light: 0, effect: 1 },
            { layer: 0, light: 1, effect: 2 },
            { layer: 0, light: 2, effect: 3 },
            { layer: 0, light: 3, effect: 4 },
            { layer: 1, light: 0, effect: 5 },
            { layer: 1, light: 1, effect: 6 },
            { layer: 1, light: 2, effect: 7 },
            { layer: 1, light: 3, effect: 1 },
            { layer: 2, light: 0, effect: 2 },
            { layer: 2, light: 1, effect: 3 },
            { layer: 2, light: 2, effect: 4 },
            { layer: 2, light: 3, effect: 5 },
            { layer: 3, light: 0, effect: 6 },
            { layer: 3, light: 1, effect: 7 },
            { layer: 3, light: 2, effect: 1 },
            { layer: 3, light: 3, effect: 2 },
            { layer: 4, light: 0, effect: 3 },
            { layer: 4, light: 1, effect: 4 },
            { layer: 4, light: 2, effect: 5 },
            { layer: 4, light: 3, effect: 6 },
            { layer: 5, light: 0, effect: 7 },
            { layer: 5, light: 1, effect: 1 },
            { layer: 5, light: 2, effect: 2 },
            { layer: 5, light: 3, effect: 3 }, // Base2 NW
        ])('should handle layer $layer light $light effect $effect', ({ layer, light, effect }) => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.layer[layer].light[light].effect = effect;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.layer[layer].light[light].effect).toBe(effect);
        });
    });
    describe('LED Loop Testing', () => {
        test.each([
            { layer: 0, light: 0 },
            { layer: 0, light: 1 },
            { layer: 0, light: 2 },
            { layer: 0, light: 3 },
            { layer: 1, light: 0 },
            { layer: 1, light: 1 },
            { layer: 1, light: 2 },
            { layer: 1, light: 3 },
            { layer: 2, light: 0 },
            { layer: 2, light: 1 },
            { layer: 2, light: 2 },
            { layer: 2, light: 3 },
            { layer: 3, light: 0 },
            { layer: 3, light: 1 },
            { layer: 3, light: 2 },
            { layer: 3, light: 3 },
            { layer: 4, light: 0 },
            { layer: 4, light: 1 },
            { layer: 4, light: 2 },
            { layer: 4, light: 3 },
            { layer: 5, light: 0 },
            { layer: 5, light: 1 },
            { layer: 5, light: 2 },
            { layer: 5, light: 3 }, // Base2 NW
        ])('should handle layer $layer light $light loop = true', ({ layer, light }) => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.layer[layer].light[light].effect = 3; // Set a non-zero effect
            state.layer[layer].light[light].loop = true;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.layer[layer].light[light].loop).toBe(true);
            expect(unpackedState.layer[layer].light[light].effect).toBe(3);
        });
    });
    describe('Audio Testing', () => {
        test.each([
            { property: 'sample', value: 0 },
            { property: 'sample', value: 1 },
            { property: 'sample', value: 50 },
            { property: 'sample', value: 100 },
            { property: 'sample', value: 127 },
            { property: 'volume', value: 0 },
            { property: 'volume', value: 1 },
            { property: 'volume', value: 8 },
            { property: 'volume', value: 15 },
        ])('should handle audio $property = $value', ({ property, value }) => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.audio[property] = value;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.audio[property]).toBe(value);
        });
        test('should handle audio loop = true', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.audio.loop = true;
            state.audio.sample = 50; // Set a sample to make it meaningful
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.audio.loop).toBe(true);
            expect(unpackedState.audio.sample).toBe(50);
        });
    });
    describe('LED Sequence Testing', () => {
        test.each([
            0, 1, 50, 100, 128, 200, 255
        ])('should handle led_sequence = %i', (sequenceValue) => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.led_sequence = sequenceValue;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            expect(unpackedState.led_sequence).toBe(sequenceValue);
        });
    });
    describe('Error Condition Testing', () => {
        test('should return false when buffer is too small', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            const smallBuffer = new Uint8Array(udtConstants_1.STATE_DATA_LENGTH - 1);
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(smallBuffer, smallBuffer.length, state);
            expect(packResult).toBe(false);
        });
        test('should return false when length parameter is too small', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH - 1, state);
            expect(packResult).toBe(false);
        });
        test('should handle empty buffer correctly', () => {
            const emptyBuffer = new Uint8Array(udtConstants_1.STATE_DATA_LENGTH);
            emptyBuffer.fill(0);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(emptyBuffer);
            const expectedState = (0, udtHelpers_1.createDefaultTowerState)();
            compareTowerStates(unpackedState, expectedState);
        });
    });
    describe('Boundary Value Testing', () => {
        test('should handle all maximum values correctly', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            // Set all drums to maximum values
            for (let i = 0; i < 3; i++) {
                state.drum[i].position = 3;
                state.drum[i].jammed = true;
                state.drum[i].calibrated = true;
                state.drum[i].playSound = true;
                // Note: reverse excluded per user request
            }
            // Set all lights to maximum effect with loop
            for (let layer = 0; layer < 6; layer++) {
                for (let light = 0; light < 4; light++) {
                    state.layer[layer].light[light].effect = 7;
                    state.layer[layer].light[light].loop = true;
                }
            }
            // Set audio to maximum values
            state.audio.sample = 127;
            state.audio.loop = true;
            state.audio.volume = 15;
            // Set LED sequence to maximum
            state.led_sequence = 255;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            compareTowerStates(unpackedState, state);
        });
        test('should handle mixed maximum and minimum values', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            // Mix of max and min values
            state.drum[0].position = 3;
            state.drum[0].jammed = true;
            state.drum[1].position = 0;
            state.drum[1].calibrated = true;
            state.drum[2].position = 2;
            state.drum[2].playSound = true;
            // Some lights at max, some at zero
            state.layer[0].light[0].effect = 7;
            state.layer[0].light[0].loop = true;
            state.layer[1].light[1].effect = 0;
            state.layer[1].light[1].loop = false;
            state.layer[2].light[2].effect = 4;
            state.layer[2].light[2].loop = true;
            state.audio.sample = 127;
            state.audio.volume = 0;
            state.audio.loop = true;
            state.led_sequence = 128;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            compareTowerStates(unpackedState, state);
        });
    });
    describe('Bit Precision Testing', () => {
        test('should preserve exact bit patterns for drum positions', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            // Test all possible 2-bit position values
            state.drum[0].position = 0b00; // 0
            state.drum[1].position = 0b01; // 1
            state.drum[2].position = 0b10; // 2
            const buffer = createBuffer();
            (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            // Check actual bit patterns in buffer
            // Drum 0 position is bits 1-2 of byte 0
            expect((buffer[0] & 0b00000110) >> 1).toBe(0);
            // Drum 1 position is bits 6-7 of byte 0
            expect((buffer[0] & 0b11000000) >> 6).toBe(1);
            // Drum 2 position is bits 3-4 of byte 1
            expect((buffer[1] & 0b00011000) >> 3).toBe(2);
        });
        test('should preserve exact bit patterns for light effects', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            // Test 3-bit effect values
            state.layer[0].light[0].effect = 0b101; // 5
            state.layer[0].light[1].effect = 0b011; // 3
            const buffer = createBuffer();
            (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            // Check actual bit patterns in buffer
            // Layer 0 light 0 effect is bits 5-7 of byte 2
            expect((buffer[2] & 0b11100000) >> 5).toBe(5);
            // Layer 0 light 1 effect is bits 1-3 of byte 2
            expect((buffer[2] & 0b00001110) >> 1).toBe(3);
        });
        test('should preserve exact bit patterns for audio fields', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            state.audio.sample = 0b1010101; // 85
            state.audio.loop = true;
            state.audio.volume = 0b1100; // 12
            const buffer = createBuffer();
            (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            // Check actual bit patterns in buffer
            // Audio sample is bits 0-6 of byte 14, loop is bit 7
            expect(buffer[14] & 0b01111111).toBe(85);
            expect(!!(buffer[14] & 0b10000000)).toBe(true);
            // Audio volume is bits 4-7 of byte 17
            expect((buffer[17] & 0b11110000) >> 4).toBe(12);
        });
    });
    describe('Complex State Integration Testing', () => {
        test('should handle complex multi-element states correctly', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            // Complex drum configuration
            state.drum[0].position = 2;
            state.drum[0].jammed = true;
            state.drum[0].calibrated = true;
            state.drum[1].position = 1;
            state.drum[1].playSound = true;
            state.drum[2].position = 3;
            state.drum[2].calibrated = true;
            // Complex light configuration
            state.layer[0].light[0].effect = 3;
            state.layer[0].light[0].loop = true;
            state.layer[1].light[2].effect = 5;
            state.layer[2].light[1].effect = 7;
            state.layer[2].light[1].loop = true;
            state.layer[3].light[3].effect = 2;
            state.layer[4].light[0].effect = 4;
            state.layer[4].light[0].loop = true;
            state.layer[5].light[2].effect = 6;
            // Complex audio configuration
            state.audio.sample = 99;
            state.audio.loop = true;
            state.audio.volume = 11;
            // LED sequence
            state.led_sequence = 177;
            const buffer = createBuffer();
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            const unpackedState = (0, udtTowerState_1.rtdt_unpack_state)(buffer);
            compareTowerStates(unpackedState, state);
        });
    });
    describe('Buffer State Verification', () => {
        test('should clear buffer before packing', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            const buffer = createBuffer();
            // Fill buffer with non-zero values
            buffer.fill(0xFF);
            // Pack default state (should clear buffer)
            (0, udtTowerState_1.rtdt_pack_state)(buffer, udtConstants_1.STATE_DATA_LENGTH, state);
            // All bytes should be zero for default state
            for (let i = 0; i < udtConstants_1.STATE_DATA_LENGTH; i++) {
                expect(buffer[i]).toBe(0);
            }
        });
        test('should respect buffer length parameter', () => {
            const state = (0, udtHelpers_1.createDefaultTowerState)();
            const largerBuffer = new Uint8Array(udtConstants_1.STATE_DATA_LENGTH + 10);
            largerBuffer.fill(0xFF);
            // Pack with exact length
            const packResult = (0, udtTowerState_1.rtdt_pack_state)(largerBuffer, udtConstants_1.STATE_DATA_LENGTH, state);
            expect(packResult).toBe(true);
            // Only the first STATE_DATA_LENGTH bytes should be cleared
            for (let i = 0; i < udtConstants_1.STATE_DATA_LENGTH; i++) {
                expect(largerBuffer[i]).toBe(0);
            }
            // Remaining bytes should be unchanged
            for (let i = udtConstants_1.STATE_DATA_LENGTH; i < largerBuffer.length; i++) {
                expect(largerBuffer[i]).toBe(0xFF);
            }
        });
    });
});
//# sourceMappingURL=udtTowerState.test.js.map