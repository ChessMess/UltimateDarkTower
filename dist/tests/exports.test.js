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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    describe('Game Board Exports', () => {
        test('BOARD_LOCATIONS contains 60 entries', () => {
            expect(src_1.BOARD_LOCATIONS).toHaveLength(60);
        });
        test('every location has required fields', () => {
            for (const loc of src_1.BOARD_LOCATIONS) {
                expect(typeof loc.name).toBe('string');
                expect(loc.name.length).toBeGreaterThan(0);
                expect(['Hills', 'Lake', 'Desert', 'Mountains', 'Grasslands', 'Forest']).toContain(loc.terrain);
                expect(['north', 'east', 'west', 'south']).toContain(loc.kingdom);
                if (loc.building !== undefined) {
                    expect(['Bazaar', 'Village', 'Sanctuary', 'Citadel']).toContain(loc.building);
                }
                if (loc.grouping !== undefined) {
                    expect(Object.values(src_1.BOARD_GROUPINGS)).toContain(loc.grouping);
                }
            }
        });
        test('BOARD_LOCATION_BY_NAME has 60 entries', () => {
            expect(Object.keys(src_1.BOARD_LOCATION_BY_NAME)).toHaveLength(60);
        });
        test('BOARD_LOCATION_BY_NAME lookup returns correct location', () => {
            const dayside = src_1.BOARD_LOCATION_BY_NAME['Dayside'];
            expect(dayside).toBeDefined();
            expect(dayside.terrain).toBe('Lake');
            expect(dayside.building).toBe('Bazaar');
            expect(dayside.kingdom).toBe('north');
            expect(dayside.grouping).toBe(src_1.BOARD_GROUPINGS.LONG_WATER);
        });
        test('grouping members are correct', () => {
            const longWater = src_1.BOARD_LOCATIONS.filter((l) => l.grouping === src_1.BOARD_GROUPINGS.LONG_WATER);
            expect(longWater.map((l) => l.name).sort()).toEqual(['Dayside', 'Fivepint']);
            const greatWoods = src_1.BOARD_LOCATIONS.filter((l) => l.grouping === src_1.BOARD_GROUPINGS.THE_GREAT_WOODS);
            expect(greatWoods.map((l) => l.name).sort()).toEqual(['Arkartus', 'Delmsmire', 'Yellowpike']);
            const regalRun = src_1.BOARD_LOCATIONS.filter((l) => l.grouping === src_1.BOARD_GROUPINGS.REGAL_RUN);
            expect(regalRun.map((l) => l.name).sort()).toEqual(['Archmont', 'The Cloister', 'The Throne']);
        });
        test('each kingdom has 15 locations', () => {
            const kingdoms = ['north', 'east', 'west', 'south'];
            for (const k of kingdoms) {
                expect(src_1.BOARD_LOCATIONS.filter((l) => l.kingdom === k)).toHaveLength(15);
            }
        });
        test('BOARD_GROUPINGS has expected values', () => {
            expect(src_1.BOARD_GROUPINGS.LONG_WATER).toBe('Long Water');
            expect(src_1.BOARD_GROUPINGS.THE_GREAT_WOODS).toBe('The Great Woods');
            expect(src_1.BOARD_GROUPINGS.REGAL_RUN).toBe('Regal Run');
        });
        test('type aliases are usable', () => {
            const terrain = 'Forest';
            const building = 'Citadel';
            const kingdom = 'west';
            const grouping = src_1.BOARD_GROUPINGS.LONG_WATER;
            const loc = src_1.BOARD_LOCATIONS[0];
            expect(terrain).toBe('Forest');
            expect(building).toBe('Citadel');
            expect(kingdom).toBe('west');
            expect(grouping).toBe('Long Water');
            expect(loc).toBeDefined();
        });
    });
    describe('Seed Decoder Exports', () => {
        test('decodeSeed is a function', () => {
            expect(typeof src_1.decodeSeed).toBe('function');
        });
        test('validateSeed is a function', () => {
            expect(typeof src_1.validateSeed).toBe('function');
        });
        test('compareSeedsRaw is a function', () => {
            expect(typeof src_1.compareSeedsRaw).toBe('function');
        });
        test('dumpSeedBits is a function', () => {
            expect(typeof src_1.dumpSeedBits).toBe('function');
        });
        test('DecodedSeed type is usable', () => {
            const result = (0, src_1.decodeSeed)('TL7A-AAUA-N43A');
            expect(result).toBeDefined();
            expect(result.raw.seed).toBe('TL7A-AAUA-N43A');
            expect(result.raw.groups).toHaveLength(3);
        });
        test('DecodedField type is usable', () => {
            const field = {
                value: 'test',
                confidence: 'unknown',
                rawBits: 0,
                bitOffset: 0,
                bitLength: 1,
            };
            expect(field.value).toBe('test');
            expect(field.confidence).toBe('unknown');
        });
        test('extractBits is a function', () => {
            expect(typeof src_1.extractBits).toBe('function');
        });
        test('seedGroupToNumber is a function', () => {
            expect(typeof src_1.seedGroupToNumber).toBe('function');
        });
        test('SeedComparison type is usable', () => {
            const comp = (0, src_1.compareSeedsRaw)('TL7A-AAUA-N43A', '0000-0000-0000');
            expect(comp.seed1).toBe('TL7A-AAUA-N43A');
            expect(comp.diffs.length).toBeGreaterThan(0);
        });
        test('BitDiff type is usable', () => {
            const diff = { bitOffset: 0, value1: 0, value2: 1 };
            expect(diff.bitOffset).toBe(0);
        });
        test('BitDump type is usable', () => {
            const dump = (0, src_1.dumpSeedBits)('0000-0000-0000');
            expect(dump.bits).toHaveLength(62);
        });
        test('Confidence type is usable', () => {
            const c = 'confirmed';
            expect(c).toBe('confirmed');
        });
    });
});
//# sourceMappingURL=exports.test.js.map