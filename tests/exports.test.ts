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
});
