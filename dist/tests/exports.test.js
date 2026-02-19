"use strict";
/**
 * Tests that all public API symbols are properly exported from the package entry point.
 * This prevents regressions where types or functions used in the public API
 * are accidentally removed from exports.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = __importStar(require("../src"));
describe('Package Exports', () => {
    describe('Tower State Types', () => {
        test('TowerState type is usable', () => {
            const state = (0, src_1.createDefaultTowerState)();
            expect(state).toBeDefined();
            expect(state.drum).toHaveLength(3);
            expect(state.layer).toHaveLength(6);
            expect(state.audio).toBeDefined();
            expect(state.beam).toBeDefined();
        });
        test('sub-types are usable', () => {
            const light = { effect: 0, loop: false };
            const layer = { light: [light, light, light, light] };
            const drum = { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false };
            const audio = { sample: 0, loop: false, volume: 0 };
            const beam = { count: 0, fault: false };
            expect(light).toBeDefined();
            expect(layer).toBeDefined();
            expect(drum).toBeDefined();
            expect(audio).toBeDefined();
            expect(beam).toBeDefined();
        });
    });
    describe('Tower State Utilities', () => {
        test('rtdt_unpack_state is a function', () => {
            expect(typeof src_1.rtdt_unpack_state).toBe('function');
        });
        test('rtdt_pack_state is a function', () => {
            expect(typeof src_1.rtdt_pack_state).toBe('function');
        });
        test('isCalibrated is a function', () => {
            expect(typeof src_1.isCalibrated).toBe('function');
        });
        test('createDefaultTowerState is a function', () => {
            expect(typeof src_1.createDefaultTowerState).toBe('function');
        });
        test('parseDifferentialReadings is a function', () => {
            expect(typeof src_1.parseDifferentialReadings).toBe('function');
        });
        test('round-trip pack/unpack produces consistent state', () => {
            const original = (0, src_1.createDefaultTowerState)();
            original.drum[0].position = 2;
            original.drum[0].calibrated = true;
            original.layer[0].light[0].effect = 3;
            original.layer[0].light[0].loop = true;
            original.audio.sample = 42;
            original.audio.volume = 8;
            const buffer = new Uint8Array(19);
            const packed = (0, src_1.rtdt_pack_state)(buffer, buffer.length, original);
            expect(packed).toBe(true);
            const unpacked = (0, src_1.rtdt_unpack_state)(buffer);
            expect(unpacked.drum[0].position).toBe(original.drum[0].position);
            expect(unpacked.drum[0].calibrated).toBe(original.drum[0].calibrated);
            expect(unpacked.layer[0].light[0].effect).toBe(original.layer[0].light[0].effect);
            expect(unpacked.layer[0].light[0].loop).toBe(original.layer[0].light[0].loop);
            expect(unpacked.audio.sample).toBe(original.audio.sample);
            expect(unpacked.audio.volume).toBe(original.audio.volume);
        });
        test('isCalibrated returns false for default state', () => {
            const state = (0, src_1.createDefaultTowerState)();
            expect((0, src_1.isCalibrated)(state)).toBe(false);
        });
        test('isCalibrated returns true when all drums calibrated', () => {
            const state = (0, src_1.createDefaultTowerState)();
            state.drum[0].calibrated = true;
            state.drum[1].calibrated = true;
            state.drum[2].calibrated = true;
            expect((0, src_1.isCalibrated)(state)).toBe(true);
        });
    });
    describe('TowerResponseConfig type', () => {
        test('TowerResponseConfig is usable as a type', () => {
            const config = {
                TOWER_STATE: true,
                INVALID_STATE: true,
                HARDWARE_FAILURE: true,
                MECH_JIGGLE_TRIGGERED: true,
                MECH_UNEXPECTED_TRIGGER: true,
                MECH_DURATION: true,
                DIFFERENTIAL_READINGS: false,
                BATTERY_READING: true,
                CALIBRATION_FINISHED: true,
                LOG_ALL: false,
            };
            expect(config).toBeDefined();
            expect(config.TOWER_STATE).toBe(true);
            expect(config.DIFFERENTIAL_READINGS).toBe(false);
        });
    });
    describe('Core Exports', () => {
        test('UltimateDarkTower default export is a constructor', () => {
            expect(typeof src_1.default).toBe('function');
        });
        test('UltimateDarkTower named export matches default', () => {
            expect(src_1.UltimateDarkTower).toBe(src_1.default);
        });
        test('Bluetooth error classes are constructable', () => {
            expect(new src_1.BluetoothError('test')).toBeInstanceOf(Error);
            expect(new src_1.BluetoothConnectionError('test')).toBeInstanceOf(src_1.BluetoothError);
            expect(new src_1.BluetoothDeviceNotFoundError('test')).toBeInstanceOf(src_1.BluetoothError);
            expect(new src_1.BluetoothUserCancelledError('test')).toBeInstanceOf(src_1.BluetoothError);
            expect(new src_1.BluetoothTimeoutError('test')).toBeInstanceOf(src_1.BluetoothError);
        });
        test('BluetoothPlatform enum has expected values', () => {
            expect(src_1.BluetoothPlatform.AUTO).toBeDefined();
            expect(src_1.BluetoothPlatform.WEB).toBeDefined();
            expect(src_1.BluetoothPlatform.NODE).toBeDefined();
        });
        test('Logger exports are available', () => {
            expect(src_1.logger).toBeDefined();
            expect(typeof src_1.Logger).toBe('function');
            expect(typeof src_1.ConsoleOutput).toBe('function');
            expect(typeof src_1.DOMOutput).toBe('function');
            expect(typeof src_1.BufferOutput).toBe('function');
        });
        test('Helper functions are available', () => {
            expect(typeof src_1.milliVoltsToPercentage).toBe('function');
            expect(typeof src_1.milliVoltsToPercentageNumber).toBe('function');
        });
    });
});
//# sourceMappingURL=exports.test.js.map