/**
 * Tests for UltimateDarkTower main class
 */

import UltimateDarkTower from '../src/UltimateDarkTower';

// Mock the web bluetooth API since it's not available in Node.js test environment
const mockBluetoothDevice = {
  gatt: {
    connect: jest.fn().mockResolvedValue({
      getPrimaryService: jest.fn().mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue({
          writeValue: jest.fn().mockResolvedValue(undefined),
          addEventListener: jest.fn(),
        }),
      }),
    }),
  },
  addEventListener: jest.fn(),
};

// Mock navigator.bluetooth
Object.defineProperty(global.navigator, 'bluetooth', {
  value: {
    requestDevice: jest.fn().mockResolvedValue(mockBluetoothDevice),
  },
  configurable: true,
});

describe('UltimateDarkTower', () => {
  let darkTower: UltimateDarkTower;

  beforeEach(() => {
    darkTower = new UltimateDarkTower();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create instance with default values', () => {
      expect(darkTower.isConnected).toBe(false);
      expect(darkTower.isCalibrated).toBe(false);
      expect(darkTower.performingCalibration).toBe(false);
      expect(darkTower.towerSkullDropCount).toBe(-1);
      expect(darkTower.batteryNotifyFrequency).toBe(15000);
    });

    test('should have default configuration values', () => {
      expect(darkTower.retrySendCommandMax).toBe(5);
      expect(darkTower.retrySendCommandCount).toBe(0);
      expect(darkTower.logDetail).toBe(false);
      expect(darkTower.logTowerResponses).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('should allow setting battery notification frequency', () => {
      const newFrequency = 10000;
      darkTower.batteryNotifyFrequency = newFrequency;
      expect(darkTower.batteryNotifyFrequency).toBe(newFrequency);
    });

    test('should allow toggling detailed logging', () => {
      darkTower.logDetail = true;
      expect(darkTower.logDetail).toBe(true);
    });
  });

  describe('Callback Functions', () => {
    test('should allow setting custom callback functions', () => {
      const mockCalibrationCallback = jest.fn();
      const mockSkullDropCallback = jest.fn();
      const mockBatteryCallback = jest.fn();
      const mockConnectCallback = jest.fn();
      const mockDisconnectCallback = jest.fn();

      darkTower.onCalibrationComplete = mockCalibrationCallback;
      darkTower.onSkullDrop = mockSkullDropCallback;
      darkTower.onBatteryLevelNotify = mockBatteryCallback;
      darkTower.onTowerConnect = mockConnectCallback;
      darkTower.onTowerDisconnect = mockDisconnectCallback;

      expect(darkTower.onCalibrationComplete).toBe(mockCalibrationCallback);
      expect(darkTower.onSkullDrop).toBe(mockSkullDropCallback);
      expect(darkTower.onBatteryLevelNotify).toBe(mockBatteryCallback);
      expect(darkTower.onTowerConnect).toBe(mockConnectCallback);
      expect(darkTower.onTowerDisconnect).toBe(mockDisconnectCallback);
    });
  });

  describe('State Management', () => {
    test('should track drum positions', () => {
      expect(darkTower.currentDrumPositions).toEqual({
        topMiddle: 0x10,
        bottom: 0x42
      });
    });

    test('should allow updating drum positions', () => {
      const newPositions = { topMiddle: 0x20, bottom: 0x30 };
      darkTower.currentDrumPositions = newPositions;
      expect(darkTower.currentDrumPositions).toEqual(newPositions);
    });
  });
});
