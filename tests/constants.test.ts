/**
 * Tests for constants and exported values
 */

import {
  UART_SERVICE_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  UART_RX_CHARACTERISTIC_UUID,
  TOWER_DEVICE_NAME,
  TOWER_COMMANDS,
  TC,
  DRUM_PACKETS,
  LIGHT_PACKETS,
  GLYPHS,
  TOWER_AUDIO_LIBRARY
} from '../src/constants';

describe('Constants', () => {
  describe('Bluetooth UUIDs', () => {
    test('should have correct UART service UUID', () => {
      expect(UART_SERVICE_UUID).toBe("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
    });

    test('should have correct TX characteristic UUID', () => {
      expect(UART_TX_CHARACTERISTIC_UUID).toBe("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
    });

    test('should have correct RX characteristic UUID', () => {
      expect(UART_RX_CHARACTERISTIC_UUID).toBe("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
    });

    test('should have correct tower device name', () => {
      expect(TOWER_DEVICE_NAME).toBe("ReturnToDarkTower");
    });
  });

  describe('Tower Commands', () => {
    test('should have all required tower commands', () => {
      expect(TOWER_COMMANDS).toHaveProperty('towerState');
      expect(TOWER_COMMANDS).toHaveProperty('doorReset');
      expect(TOWER_COMMANDS).toHaveProperty('unjamDrums');
      expect(TOWER_COMMANDS).toHaveProperty('resetCounter');
      expect(TOWER_COMMANDS).toHaveProperty('calibration');
      expect(TOWER_COMMANDS).toHaveProperty('overwriteDrumStates');
    });

    test('should have correct command values', () => {
      expect(TOWER_COMMANDS.towerState).toBe(0);
      expect(TOWER_COMMANDS.doorReset).toBe(1);
      expect(TOWER_COMMANDS.unjamDrums).toBe(2);
      expect(TOWER_COMMANDS.resetCounter).toBe(3);
      expect(TOWER_COMMANDS.calibration).toBe(4);
      expect(TOWER_COMMANDS.overwriteDrumStates).toBe(5);
    });
  });

  describe('Tower Command Types', () => {
    test('should have all required TC constants', () => {
      expect(TC.STATE).toBe("TOWER_STATE");
      expect(TC.INVALID_STATE).toBe("INVALID_STATE");
      expect(TC.FAILURE).toBe("HARDWARE_FAILURE");
      expect(TC.JIGGLE).toBe("MECH_JIGGLE_TRIGGERED");
      expect(TC.UNEXPECTED).toBe("MECH_UNEXPECTED_TRIGGER");
      expect(TC.DURATION).toBe("MECH_DURATION");
      expect(TC.DIFFERENTIAL).toBe("DIFFERENTIAL_READINGS");
      expect(TC.CALIBRATION).toBe("CALIBRATION_FINISHED");
      expect(TC.BATTERY).toBe("BATTERY_READING");
    });
  });

  describe('Drum Packets', () => {
    test('should have correct drum packet values', () => {
      expect(DRUM_PACKETS.topMiddle).toBe(1);
      expect(DRUM_PACKETS.bottom).toBe(2);
    });
  });

  describe('Light Packets', () => {
    test('should have doorway light configuration', () => {
      expect(LIGHT_PACKETS).toHaveProperty('doorway');
      expect(LIGHT_PACKETS.doorway).toHaveProperty('top');
      expect(LIGHT_PACKETS.doorway).toHaveProperty('middle');
      expect(LIGHT_PACKETS.doorway).toHaveProperty('bottom');
    });

    test('should have base light configuration', () => {
      expect(LIGHT_PACKETS).toHaveProperty('base');
      expect(LIGHT_PACKETS.base).toHaveProperty('north');
      expect(LIGHT_PACKETS.base).toHaveProperty('east');
      expect(LIGHT_PACKETS.base).toHaveProperty('south');
      expect(LIGHT_PACKETS.base).toHaveProperty('west');
    });

    test('should have ledge light configuration', () => {
      expect(LIGHT_PACKETS).toHaveProperty('ledge');
      expect(LIGHT_PACKETS.ledge).toHaveProperty('north');
      expect(LIGHT_PACKETS.ledge).toHaveProperty('east');
      expect(LIGHT_PACKETS.ledge).toHaveProperty('south');
      expect(LIGHT_PACKETS.ledge).toHaveProperty('west');
    });
  });

  describe('Glyphs', () => {
    test('should have GLYPHS object defined', () => {
      expect(GLYPHS).toBeDefined();
      expect(typeof GLYPHS).toBe('object');
    });
  });

  describe('Tower Audio Library', () => {
    test('should have TOWER_AUDIO_LIBRARY object defined', () => {
      expect(TOWER_AUDIO_LIBRARY).toBeDefined();
      expect(typeof TOWER_AUDIO_LIBRARY).toBe('object');
    });
  });
});
