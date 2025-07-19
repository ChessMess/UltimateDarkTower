/**
 * Tests for helper utility functions
 */

import {
  milliVoltsToPercentageNumber,
  milliVoltsToPercentage,
  getMilliVoltsFromTowerResponse,
  commandToPacketString,
  getTowerPosition,
  getActiveLights,
  createDefaultTowerState
} from '../src/udtHelpers';
import { VOLTAGE_LEVELS } from '../src/udtConstants';
import { type TowerState } from '../src/functions';

describe('udtHelpers', () => {
  describe('Battery Voltage Functions', () => {
    describe('milliVoltsToPercentageNumber', () => {
      test('should return 0 for 0 millivolts', () => {
        expect(milliVoltsToPercentageNumber(0)).toBe(0);
      });

      test('should return 0 for very low voltage', () => {
        expect(milliVoltsToPercentageNumber(100)).toBe(0);
      });

      test('should calculate percentage based on VOLTAGE_LEVELS', () => {
        // Test with a voltage that should match several levels
        // VOLTAGE_LEVELS has 20 entries, each representing 5%
        const testVoltage = 1500 * 3; // 4500mV total (1500mV per battery)
        expect(milliVoltsToPercentageNumber(testVoltage)).toBe(100);
      });

      test('should calculate percentage for mid-range voltage', () => {
        // Test with voltage that matches ~10 levels (50%)
        const testVoltage = 1175 * 3; // Should match 10 levels = 50%
        expect(milliVoltsToPercentageNumber(testVoltage)).toBe(50);
      });

      test('should handle single battery voltage correctly', () => {
        // The function divides by 3 to get single battery voltage
        const singleBatteryVoltage = 1200;
        const totalVoltage = singleBatteryVoltage * 3;
        const levelsMatched = VOLTAGE_LEVELS.filter(v => singleBatteryVoltage >= v).length;
        expect(milliVoltsToPercentageNumber(totalVoltage)).toBe(levelsMatched * 5);
      });

      test('should return 100% for maximum voltage', () => {
        const maxVoltage = 2000 * 3; // Well above highest VOLTAGE_LEVEL
        expect(milliVoltsToPercentageNumber(maxVoltage)).toBe(100);
      });
    });

    describe('milliVoltsToPercentage', () => {
      test('should return "0%" for 0 millivolts', () => {
        expect(milliVoltsToPercentage(0)).toBe('0%');
      });

      test('should return percentage string with % symbol', () => {
        const testVoltage = 1175 * 3; // Should be 50%
        expect(milliVoltsToPercentage(testVoltage)).toBe('50%');
      });

      test('should return "100%" for maximum voltage', () => {
        const maxVoltage = 2000 * 3;
        expect(milliVoltsToPercentage(maxVoltage)).toBe('100%');
      });

      test('should match milliVoltsToPercentageNumber but with % suffix', () => {
        const testVoltage = 1200 * 3;
        const numberResult = milliVoltsToPercentageNumber(testVoltage);
        const stringResult = milliVoltsToPercentage(testVoltage);
        expect(stringResult).toBe(`${numberResult}%`);
      });
    });
  });

  describe('getMilliVoltsFromTowerResponse', () => {
    test('should extract voltage from tower response packet', () => {
      // Create a mock response packet with voltage data at positions 3 and 4
      const mockResponse = new Uint8Array([0, 0, 0, 0x10, 0x20, 0, 0, 0]);
      // Function does: mv[0] = command[4], mv[1] = command[3]
      // So mv[0] = 0x20, mv[1] = 0x10 -> little endian 0x1020 = 4128 decimal
      const result = getMilliVoltsFromTowerResponse(mockResponse);
      expect(result).toBe(4128);
    });

    test('should handle zero voltage', () => {
      const mockResponse = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
      const result = getMilliVoltsFromTowerResponse(mockResponse);
      expect(result).toBe(0);
    });

    test('should handle maximum voltage values', () => {
      const mockResponse = new Uint8Array([0, 0, 0, 0xFF, 0xFF, 0, 0, 0]);
      // mv[0] = 0xFF, mv[1] = 0xFF -> 0xFFFF = 65535 decimal
      const result = getMilliVoltsFromTowerResponse(mockResponse);
      expect(result).toBe(65535);
    });

    test('should extract voltage correctly with different byte orders', () => {
      const mockResponse = new Uint8Array([0, 0, 0, 0x34, 0x12, 0, 0, 0]);
      // mv[0] = command[4] = 0x12, mv[1] = command[3] = 0x34
      // Little endian: 0x3412 = 13330 decimal
      const result = getMilliVoltsFromTowerResponse(mockResponse);
      expect(result).toBe(13330);
    });
  });

  describe('commandToPacketString', () => {
    test('should convert single byte to hex string', () => {
      const command = new Uint8Array([15]);
      expect(commandToPacketString(command)).toBe('[f]');
    });

    test('should convert multiple bytes to hex string', () => {
      const command = new Uint8Array([15, 255, 0, 16]);
      expect(commandToPacketString(command)).toBe('[f,ff,0,10]');
    });

    test('should handle empty array', () => {
      const command = new Uint8Array([]);
      // When empty, forEach doesn't execute, so cmdStr stays "[", then slice(0, -1) removes the "[", leaving "]"
      expect(commandToPacketString(command)).toBe(']');
    });

    test('should format hex values correctly', () => {
      const command = new Uint8Array([0, 1, 15, 16, 255]);
      expect(commandToPacketString(command)).toBe('[0,1,f,10,ff]');
    });
  });

  describe('getTowerPosition', () => {
    describe('Ring Layers (0-2)', () => {
      test('should return cardinal directions for top ring (layer 0)', () => {
        expect(getTowerPosition(0, 0)).toEqual({ level: 'TOP_RING', direction: 'NORTH', ledChannel: 0 });
        expect(getTowerPosition(0, 1)).toEqual({ level: 'TOP_RING', direction: 'EAST', ledChannel: 3 });
        expect(getTowerPosition(0, 2)).toEqual({ level: 'TOP_RING', direction: 'SOUTH', ledChannel: 2 });
        expect(getTowerPosition(0, 3)).toEqual({ level: 'TOP_RING', direction: 'WEST', ledChannel: 1 });
      });

      test('should return cardinal directions for middle ring (layer 1)', () => {
        expect(getTowerPosition(1, 0)).toEqual({ level: 'MIDDLE_RING', direction: 'NORTH', ledChannel: 7 });
        expect(getTowerPosition(1, 1)).toEqual({ level: 'MIDDLE_RING', direction: 'EAST', ledChannel: 6 });
        expect(getTowerPosition(1, 2)).toEqual({ level: 'MIDDLE_RING', direction: 'SOUTH', ledChannel: 5 });
        expect(getTowerPosition(1, 3)).toEqual({ level: 'MIDDLE_RING', direction: 'WEST', ledChannel: 4 });
      });

      test('should return cardinal directions for bottom ring (layer 2)', () => {
        expect(getTowerPosition(2, 0)).toEqual({ level: 'BOTTOM_RING', direction: 'NORTH', ledChannel: 10 });
        expect(getTowerPosition(2, 1)).toEqual({ level: 'BOTTOM_RING', direction: 'EAST', ledChannel: 9 });
        expect(getTowerPosition(2, 2)).toEqual({ level: 'BOTTOM_RING', direction: 'SOUTH', ledChannel: 8 });
        expect(getTowerPosition(2, 3)).toEqual({ level: 'BOTTOM_RING', direction: 'WEST', ledChannel: 11 });
      });
    });

    describe('Ledge/Base Layers (3-5)', () => {
      test('should return ordinal directions for ledge (layer 3)', () => {
        expect(getTowerPosition(3, 0)).toEqual({ level: 'LEDGE', direction: 'NORTH_EAST', ledChannel: 12 });
        expect(getTowerPosition(3, 1)).toEqual({ level: 'LEDGE', direction: 'SOUTH_EAST', ledChannel: 13 });
        expect(getTowerPosition(3, 2)).toEqual({ level: 'LEDGE', direction: 'SOUTH_WEST', ledChannel: 14 });
        expect(getTowerPosition(3, 3)).toEqual({ level: 'LEDGE', direction: 'NORTH_WEST', ledChannel: 15 });
      });

      test('should return ordinal directions for base1 (layer 4)', () => {
        expect(getTowerPosition(4, 0)).toEqual({ level: 'BASE1', direction: 'NORTH_EAST', ledChannel: 16 });
        expect(getTowerPosition(4, 1)).toEqual({ level: 'BASE1', direction: 'SOUTH_EAST', ledChannel: 17 });
        expect(getTowerPosition(4, 2)).toEqual({ level: 'BASE1', direction: 'SOUTH_WEST', ledChannel: 18 });
        expect(getTowerPosition(4, 3)).toEqual({ level: 'BASE1', direction: 'NORTH_WEST', ledChannel: 19 });
      });

      test('should return ordinal directions for base2 (layer 5)', () => {
        expect(getTowerPosition(5, 0)).toEqual({ level: 'BASE2', direction: 'NORTH_EAST', ledChannel: 20 });
        expect(getTowerPosition(5, 1)).toEqual({ level: 'BASE2', direction: 'SOUTH_EAST', ledChannel: 21 });
        expect(getTowerPosition(5, 2)).toEqual({ level: 'BASE2', direction: 'SOUTH_WEST', ledChannel: 22 });
        expect(getTowerPosition(5, 3)).toEqual({ level: 'BASE2', direction: 'NORTH_WEST', ledChannel: 23 });
      });
    });
  });

  describe('getActiveLights', () => {
    test('should return empty array for default tower state', () => {
      const defaultState = createDefaultTowerState();
      const activeLights = getActiveLights(defaultState);
      expect(activeLights).toEqual([]);
    });

    test('should return active lights with correct position info', () => {
      const testState: TowerState = {
        drum: [
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
        ],
        layer: [
          { light: [{ effect: 1, loop: true }, { effect: 0, loop: false }, { effect: 2, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 3, loop: true }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 4, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
        ],
        audio: { sample: 0, loop: false, volume: 0 },
        beam: { count: 0, fault: false },
        led_sequence: 0
      };

      const activeLights = getActiveLights(testState);
      expect(activeLights).toHaveLength(4);
      
      expect(activeLights[0]).toEqual({
        level: 'TOP_RING',
        direction: 'NORTH',
        effect: 1,
        loop: true
      });
      
      expect(activeLights[1]).toEqual({
        level: 'TOP_RING',
        direction: 'SOUTH',
        effect: 2,
        loop: false
      });
      
      expect(activeLights[2]).toEqual({
        level: 'MIDDLE_RING',
        direction: 'EAST',
        effect: 3,
        loop: true
      });
      
      expect(activeLights[3]).toEqual({
        level: 'LEDGE',
        direction: 'SOUTH_WEST',
        effect: 4,
        loop: false
      });
    });

    test('should filter out lights with effect 0', () => {
      const testState: TowerState = {
        drum: [
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
        ],
        layer: [
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 5, loop: true }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
        ],
        audio: { sample: 0, loop: false, volume: 0 },
        beam: { count: 0, fault: false },
        led_sequence: 0
      };

      const activeLights = getActiveLights(testState);
      expect(activeLights).toHaveLength(1);
      expect(activeLights[0]).toEqual({
        level: 'BOTTOM_RING',
        direction: 'NORTH',
        effect: 5,
        loop: true
      });
    });
  });

  describe('createDefaultTowerState', () => {
    test('should create state with correct structure', () => {
      const defaultState = createDefaultTowerState();
      
      expect(defaultState).toHaveProperty('drum');
      expect(defaultState).toHaveProperty('layer');
      expect(defaultState).toHaveProperty('audio');
      expect(defaultState).toHaveProperty('beam');
      expect(defaultState).toHaveProperty('led_sequence');
    });

    test('should create state with 3 drums', () => {
      const defaultState = createDefaultTowerState();
      expect(defaultState.drum).toHaveLength(3);
      
      defaultState.drum.forEach(drum => {
        expect(drum).toEqual({
          jammed: false,
          calibrated: false,
          position: 0,
          playSound: false,
          reverse: false
        });
      });
    });

    test('should create state with 6 layers', () => {
      const defaultState = createDefaultTowerState();
      expect(defaultState.layer).toHaveLength(6);
      
      defaultState.layer.forEach(layer => {
        expect(layer.light).toHaveLength(4);
        layer.light.forEach(light => {
          expect(light).toEqual({
            effect: 0,
            loop: false
          });
        });
      });
    });

    test('should create state with default audio settings', () => {
      const defaultState = createDefaultTowerState();
      expect(defaultState.audio).toEqual({
        sample: 0,
        loop: false,
        volume: 0
      });
    });

    test('should create state with default beam settings', () => {
      const defaultState = createDefaultTowerState();
      expect(defaultState.beam).toEqual({
        count: 0,
        fault: false
      });
    });

    test('should create state with default led_sequence', () => {
      const defaultState = createDefaultTowerState();
      expect(defaultState.led_sequence).toBe(0);
    });

    test('should create new instances each time', () => {
      const state1 = createDefaultTowerState();
      const state2 = createDefaultTowerState();
      
      expect(state1).not.toBe(state2);
      expect(state1.drum).not.toBe(state2.drum);
      expect(state1.layer).not.toBe(state2.layer);
    });
  });
});