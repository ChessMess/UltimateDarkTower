/**
 * Tests that all public API symbols are properly exported from the package entry point.
 * This prevents regressions where types or functions used in the public API
 * are accidentally removed from exports.
 */

import UltimateDarkTower, {
  // Main class
  UltimateDarkTower as NamedUltimateDarkTower,

  // Tower state types
  type TowerState,
  type Light,
  type Layer,
  type Drum,
  type Audio,
  type Beam,

  // Tower state utilities
  rtdt_unpack_state,
  rtdt_pack_state,
  isCalibrated,
  createDefaultTowerState,
  parseDifferentialReadings,

  // Tower response config
  type TowerResponseConfig,

  // Bluetooth adapter types
  BluetoothPlatform,
  BluetoothError,
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothUserCancelledError,
  BluetoothTimeoutError,

  // Logger
  logger,
  Logger,
  ConsoleOutput,
  DOMOutput,
  BufferOutput,

  // Helpers
  milliVoltsToPercentage,
  milliVoltsToPercentageNumber,

  // Seed decoder
  decodeSeed,
  validateSeed,
  compareSeedsRaw,
  dumpSeedBits,
  extractBits,
  seedGroupToNumber,
  type DecodedSeed,
  type DecodedField,
  type SeedComparison,
  type BitDiff,
  type BitDump,
  type Confidence,

  // Game board data
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_GROUPINGS,
  type TerrainType,
  type BuildingType,
  type BoardKingdom,
  type BoardGrouping,
  type BoardLocation,
} from '../src';

describe('Package Exports', () => {
  describe('Tower State Types', () => {
    test('TowerState type is usable', () => {
      const state: TowerState = createDefaultTowerState();
      expect(state).toBeDefined();
      expect(state.drum).toHaveLength(3);
      expect(state.layer).toHaveLength(6);
      expect(state.audio).toBeDefined();
      expect(state.beam).toBeDefined();
    });

    test('sub-types are usable', () => {
      const light: Light = { effect: 0, loop: false };
      const layer: Layer = { light: [light, light, light, light] };
      const drum: Drum = { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false };
      const audio: Audio = { sample: 0, loop: false, volume: 0 };
      const beam: Beam = { count: 0, fault: false };

      expect(light).toBeDefined();
      expect(layer).toBeDefined();
      expect(drum).toBeDefined();
      expect(audio).toBeDefined();
      expect(beam).toBeDefined();
    });
  });

  describe('Tower State Utilities', () => {
    test('rtdt_unpack_state is a function', () => {
      expect(typeof rtdt_unpack_state).toBe('function');
    });

    test('rtdt_pack_state is a function', () => {
      expect(typeof rtdt_pack_state).toBe('function');
    });

    test('isCalibrated is a function', () => {
      expect(typeof isCalibrated).toBe('function');
    });

    test('createDefaultTowerState is a function', () => {
      expect(typeof createDefaultTowerState).toBe('function');
    });

    test('parseDifferentialReadings is a function', () => {
      expect(typeof parseDifferentialReadings).toBe('function');
    });

    test('round-trip pack/unpack produces consistent state', () => {
      const original = createDefaultTowerState();
      original.drum[0].position = 2;
      original.drum[0].calibrated = true;
      original.layer[0].light[0].effect = 3;
      original.layer[0].light[0].loop = true;
      original.audio.sample = 42;
      original.audio.volume = 8;

      const buffer = new Uint8Array(19);
      const packed = rtdt_pack_state(buffer, buffer.length, original);
      expect(packed).toBe(true);

      const unpacked = rtdt_unpack_state(buffer);
      expect(unpacked.drum[0].position).toBe(original.drum[0].position);
      expect(unpacked.drum[0].calibrated).toBe(original.drum[0].calibrated);
      expect(unpacked.layer[0].light[0].effect).toBe(original.layer[0].light[0].effect);
      expect(unpacked.layer[0].light[0].loop).toBe(original.layer[0].light[0].loop);
      expect(unpacked.audio.sample).toBe(original.audio.sample);
      expect(unpacked.audio.volume).toBe(original.audio.volume);
    });

    test('isCalibrated returns false for default state', () => {
      const state = createDefaultTowerState();
      expect(isCalibrated(state)).toBe(false);
    });

    test('isCalibrated returns true when all drums calibrated', () => {
      const state = createDefaultTowerState();
      state.drum[0].calibrated = true;
      state.drum[1].calibrated = true;
      state.drum[2].calibrated = true;
      expect(isCalibrated(state)).toBe(true);
    });
  });

  describe('TowerResponseConfig type', () => {
    test('TowerResponseConfig is usable as a type', () => {
      const config: TowerResponseConfig = {
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
      expect(typeof UltimateDarkTower).toBe('function');
    });

    test('UltimateDarkTower named export matches default', () => {
      expect(NamedUltimateDarkTower).toBe(UltimateDarkTower);
    });

    test('Bluetooth error classes are constructable', () => {
      expect(new BluetoothError('test')).toBeInstanceOf(Error);
      expect(new BluetoothConnectionError('test')).toBeInstanceOf(BluetoothError);
      expect(new BluetoothDeviceNotFoundError('test')).toBeInstanceOf(BluetoothError);
      expect(new BluetoothUserCancelledError('test')).toBeInstanceOf(BluetoothError);
      expect(new BluetoothTimeoutError('test')).toBeInstanceOf(BluetoothError);
    });

    test('BluetoothPlatform enum has expected values', () => {
      expect(BluetoothPlatform.AUTO).toBeDefined();
      expect(BluetoothPlatform.WEB).toBeDefined();
      expect(BluetoothPlatform.NODE).toBeDefined();
    });

    test('Logger exports are available', () => {
      expect(logger).toBeDefined();
      expect(typeof Logger).toBe('function');
      expect(typeof ConsoleOutput).toBe('function');
      expect(typeof DOMOutput).toBe('function');
      expect(typeof BufferOutput).toBe('function');
    });

    test('Helper functions are available', () => {
      expect(typeof milliVoltsToPercentage).toBe('function');
      expect(typeof milliVoltsToPercentageNumber).toBe('function');
    });
  });

  describe('Game Board Exports', () => {
    test('BOARD_LOCATIONS contains 60 entries', () => {
      expect(BOARD_LOCATIONS).toHaveLength(60);
    });

    test('every location has required fields', () => {
      for (const loc of BOARD_LOCATIONS) {
        expect(typeof loc.name).toBe('string');
        expect(loc.name.length).toBeGreaterThan(0);
        expect(['Hills', 'Lake', 'Desert', 'Mountains', 'Grasslands', 'Forest']).toContain(loc.terrain);
        expect(['north', 'east', 'west', 'south']).toContain(loc.kingdom);
        if (loc.building !== undefined) {
          expect(['Bazaar', 'Village', 'Sanctuary', 'Citadel']).toContain(loc.building);
        }
        if (loc.grouping !== undefined) {
          expect(Object.values(BOARD_GROUPINGS)).toContain(loc.grouping);
        }
      }
    });

    test('BOARD_LOCATION_BY_NAME has 60 entries', () => {
      expect(Object.keys(BOARD_LOCATION_BY_NAME)).toHaveLength(60);
    });

    test('BOARD_LOCATION_BY_NAME lookup returns correct location', () => {
      const dayside = BOARD_LOCATION_BY_NAME['Dayside'];
      expect(dayside).toBeDefined();
      expect(dayside.terrain).toBe('Lake');
      expect(dayside.building).toBe('Bazaar');
      expect(dayside.kingdom).toBe('north');
      expect(dayside.grouping).toBe(BOARD_GROUPINGS.LONG_WATER);
    });

    test('grouping members are correct', () => {
      const longWater = BOARD_LOCATIONS.filter((l) => l.grouping === BOARD_GROUPINGS.LONG_WATER);
      expect(longWater.map((l) => l.name).sort()).toEqual(['Dayside', 'Fivepint']);

      const greatWoods = BOARD_LOCATIONS.filter((l) => l.grouping === BOARD_GROUPINGS.THE_GREAT_WOODS);
      expect(greatWoods.map((l) => l.name).sort()).toEqual(['Arkartus', 'Delmsmire', 'Yellowpike']);

      const regalRun = BOARD_LOCATIONS.filter((l) => l.grouping === BOARD_GROUPINGS.REGAL_RUN);
      expect(regalRun.map((l) => l.name).sort()).toEqual(['Archmont', 'The Cloister', 'The Throne']);
    });

    test('each kingdom has 15 locations', () => {
      const kingdoms: BoardKingdom[] = ['north', 'east', 'west', 'south'];
      for (const k of kingdoms) {
        expect(BOARD_LOCATIONS.filter((l) => l.kingdom === k)).toHaveLength(15);
      }
    });

    test('BOARD_GROUPINGS has expected values', () => {
      expect(BOARD_GROUPINGS.LONG_WATER).toBe('Long Water');
      expect(BOARD_GROUPINGS.THE_GREAT_WOODS).toBe('The Great Woods');
      expect(BOARD_GROUPINGS.REGAL_RUN).toBe('Regal Run');
    });

    test('type aliases are usable', () => {
      const terrain: TerrainType = 'Forest';
      const building: BuildingType = 'Citadel';
      const kingdom: BoardKingdom = 'west';
      const grouping: BoardGrouping = BOARD_GROUPINGS.LONG_WATER;
      const loc: BoardLocation = BOARD_LOCATIONS[0];
      expect(terrain).toBe('Forest');
      expect(building).toBe('Citadel');
      expect(kingdom).toBe('west');
      expect(grouping).toBe('Long Water');
      expect(loc).toBeDefined();
    });
  });

  describe('Seed Decoder Exports', () => {
    test('decodeSeed is a function', () => {
      expect(typeof decodeSeed).toBe('function');
    });

    test('validateSeed is a function', () => {
      expect(typeof validateSeed).toBe('function');
    });

    test('compareSeedsRaw is a function', () => {
      expect(typeof compareSeedsRaw).toBe('function');
    });

    test('dumpSeedBits is a function', () => {
      expect(typeof dumpSeedBits).toBe('function');
    });

    test('DecodedSeed type is usable', () => {
      const result: DecodedSeed = decodeSeed('TL7A-AAUA-N43A');
      expect(result).toBeDefined();
      expect(result.raw.seed).toBe('TL7A-AAUA-N43A');
      expect(result.raw.groups).toHaveLength(3);
    });

    test('DecodedField type is usable', () => {
      const field: DecodedField<string> = {
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
      expect(typeof extractBits).toBe('function');
    });

    test('seedGroupToNumber is a function', () => {
      expect(typeof seedGroupToNumber).toBe('function');
    });

    test('SeedComparison type is usable', () => {
      const comp: SeedComparison = compareSeedsRaw('TL7A-AAUA-N43A', '0000-0000-0000');
      expect(comp.seed1).toBe('TL7A-AAUA-N43A');
      expect(comp.diffs.length).toBeGreaterThan(0);
    });

    test('BitDiff type is usable', () => {
      const diff: BitDiff = { bitOffset: 0, value1: 0, value2: 1 };
      expect(diff.bitOffset).toBe(0);
    });

    test('BitDump type is usable', () => {
      const dump: BitDump = dumpSeedBits('0000-0000-0000');
      expect(dump.bits).toHaveLength(62);
    });

    test('Confidence type is usable', () => {
      const c: Confidence = 'confirmed';
      expect(c).toBe('confirmed');
    });
  });
});
