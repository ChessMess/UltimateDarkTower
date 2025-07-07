/**
 * Tests for UltimateDarkTower main class
 */

import UltimateDarkTower from '../src/UltimateDarkTower';

// Mock the web bluetooth API since it's not available in Node.js test environment
const mockCharacteristic = {
  writeValue: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
  startNotifications: jest.fn().mockResolvedValue(undefined),
};

const mockService = {
  getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
};

const mockServer = {
  getPrimaryService: jest.fn().mockResolvedValue(mockService),
};

const mockBluetoothDevice = {
  gatt: {
    connect: jest.fn().mockResolvedValue(mockServer),
    disconnect: jest.fn().mockResolvedValue(undefined),
    connected: true,
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock navigator.bluetooth
Object.defineProperty(global.navigator, 'bluetooth', {
  value: {
    requestDevice: jest.fn().mockResolvedValue(mockBluetoothDevice),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  configurable: true,
});

describe('UltimateDarkTower', () => {
  let darkTower: UltimateDarkTower;

  beforeEach(() => {
    darkTower = new UltimateDarkTower();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any timers/intervals to prevent warnings
    if (darkTower && darkTower.isConnected) {
      darkTower.disconnect();
    }
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

  describe('getCurrentDrumPosition', () => {
    test('should return correct side for bottom level', () => {
      // Set bottom position to north (0x42)
      darkTower.currentDrumPositions.bottom = 0x42;
      expect(darkTower['getCurrentDrumPosition']('bottom')).toBe('north');

      // Set bottom position to west (0x4A)
      darkTower.currentDrumPositions.bottom = 0x4A;
      expect(darkTower['getCurrentDrumPosition']('bottom')).toBe('west');

      // Set bottom position to south (0x52)
      darkTower.currentDrumPositions.bottom = 0x52;
      expect(darkTower['getCurrentDrumPosition']('bottom')).toBe('south');

      // Set bottom position to east (0x5A)
      darkTower.currentDrumPositions.bottom = 0x5A;
      expect(darkTower['getCurrentDrumPosition']('bottom')).toBe('east');
    });

    test('should return correct side for top level', () => {
      // Set topMiddle to include top north position (0x10)
      darkTower.currentDrumPositions.topMiddle = 0x10;
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('north');

      // Set topMiddle to include top west position (0x02)
      darkTower.currentDrumPositions.topMiddle = 0xC2; // includes middle bits + top west
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('west');

      // Set topMiddle to include top south position (0x14)
      darkTower.currentDrumPositions.topMiddle = 0x14;
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('south');

      // Set topMiddle to include top east position (0x16)
      darkTower.currentDrumPositions.topMiddle = 0x16;
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('east');
    });

    test('should return correct side for middle level', () => {
      // Set topMiddle to include middle north position (0x10)
      darkTower.currentDrumPositions.topMiddle = 0x10;
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('north');

      // Set topMiddle to include middle west position (0x40)
      darkTower.currentDrumPositions.topMiddle = 0x40;
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('west');

      // Set topMiddle to include middle south position (0x90)
      darkTower.currentDrumPositions.topMiddle = 0x90;
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('south');

      // Set topMiddle to include middle east position (0xD0)
      darkTower.currentDrumPositions.topMiddle = 0xD0;
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('east');
    });

    test('should return north as default when no match found', () => {
      // Set invalid position values
      darkTower.currentDrumPositions.bottom = 0xFF;
      expect(darkTower['getCurrentDrumPosition']('bottom')).toBe('north');

      // For top and middle, 0xFF will still match some patterns due to masking
      // Use values that won't match any defined positions
      darkTower.currentDrumPositions.topMiddle = 0x08; // Doesn't match any top or middle patterns
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('north');
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('north');
    });

    test('should handle combined top and middle positions correctly', () => {
      // Test with both top east (0x16) and middle west (0x40) combined
      darkTower.currentDrumPositions.topMiddle = 0x56; // 0x40 | 0x16
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('east');
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('west');

      // Test with top north (0x10) and middle south (0x90) combined
      darkTower.currentDrumPositions.topMiddle = 0x90; // 0x90 | 0x10
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('north');
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('south');
    });

    test('should use correct bit masks for each level', () => {
      // Test that top level uses 0b00010110 mask
      darkTower.currentDrumPositions.topMiddle = 0xC2; // Has bits outside top mask
      expect(darkTower['getCurrentDrumPosition']('top')).toBe('west'); // Should match 0x02

      // Test that middle level uses 0b11000000 mask  
      darkTower.currentDrumPositions.topMiddle = 0x46; // Has bits outside middle mask
      expect(darkTower['getCurrentDrumPosition']('middle')).toBe('west'); // Should match 0x40
    });
  });

  describe('Broken Seal Tracking', () => {
    test('should initialize with no broken seals', () => {
      expect(darkTower.getBrokenSeals()).toEqual([]);
    });

    test('should return false for unbroken seals', () => {
      const seal = { side: 'west' as const, level: 'middle' as const };
      expect(darkTower.isSealBroken(seal)).toBe(false);
    });

    test('should return random unbroken seal', () => {
      // Initially all seals are unbroken
      const randomSeal = darkTower.getRandomUnbrokenSeal();
      expect(randomSeal).toBeTruthy();
      expect(randomSeal).toHaveProperty('side');
      expect(randomSeal).toHaveProperty('level');
      expect(['north', 'south', 'east', 'west']).toContain(randomSeal!.side);
      expect(['top', 'middle', 'bottom']).toContain(randomSeal!.level);
    });

    test('should track broken seals directly via internal state', () => {
      // Access the internal brokenSeals Set directly to test tracking logic
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      
      const seal = { side: 'north' as const, level: 'middle' as const };
      const sealKey = `${seal.level}-${seal.side}`;
      
      // Initially should not be broken
      expect(darkTower.isSealBroken(seal)).toBe(false);
      expect(brokenSeals.has(sealKey)).toBe(false);
      
      // Manually add to broken seals to test the tracking logic
      brokenSeals.add(sealKey);
      
      // Now should be considered broken
      expect(darkTower.isSealBroken(seal)).toBe(true);
      expect(darkTower.getBrokenSeals()).toContainEqual(seal);
      expect(darkTower.getBrokenSeals()).toHaveLength(1);
    });

    test('should handle multiple broken seals', () => {
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      
      const seal1 = { side: 'north' as const, level: 'top' as const };
      const seal2 = { side: 'south' as const, level: 'bottom' as const };
      const seal3 = { side: 'east' as const, level: 'middle' as const };
      
      // Add seals to broken state
      brokenSeals.add(`${seal1.level}-${seal1.side}`);
      brokenSeals.add(`${seal2.level}-${seal2.side}`);
      brokenSeals.add(`${seal3.level}-${seal3.side}`);
      
      expect(darkTower.isSealBroken(seal1)).toBe(true);
      expect(darkTower.isSealBroken(seal2)).toBe(true);
      expect(darkTower.isSealBroken(seal3)).toBe(true);
      
      const allBrokenSeals = darkTower.getBrokenSeals();
      expect(allBrokenSeals).toHaveLength(3);
      expect(allBrokenSeals).toContainEqual(seal1);
      expect(allBrokenSeals).toContainEqual(seal2);
      expect(allBrokenSeals).toContainEqual(seal3);
    });

    test('should not duplicate seals in tracking', () => {
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      const seal = { side: 'east' as const, level: 'top' as const };
      const sealKey = `${seal.level}-${seal.side}`;
      
      // Add same seal multiple times
      brokenSeals.add(sealKey);
      brokenSeals.add(sealKey);
      brokenSeals.add(sealKey);
      
      expect(darkTower.isSealBroken(seal)).toBe(true);
      expect(darkTower.getBrokenSeals()).toHaveLength(1);
      expect(darkTower.getBrokenSeals()).toContainEqual(seal);
    });

    test('should reset all broken seals', () => {
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      
      const seal1 = { side: 'north' as const, level: 'top' as const };
      const seal2 = { side: 'south' as const, level: 'bottom' as const };
      
      // Add seals to broken state
      brokenSeals.add(`${seal1.level}-${seal1.side}`);
      brokenSeals.add(`${seal2.level}-${seal2.side}`);
      
      expect(darkTower.getBrokenSeals()).toHaveLength(2);
      
      darkTower.resetBrokenSeals();
      
      expect(darkTower.getBrokenSeals()).toEqual([]);
      expect(darkTower.isSealBroken(seal1)).toBe(false);
      expect(darkTower.isSealBroken(seal2)).toBe(false);
    });

    test('should return null when all seals are broken', () => {
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      
      // Break all possible seals (4 sides × 3 levels = 12 seals)
      for (const side of ['north', 'south', 'east', 'west'] as const) {
        for (const level of ['top', 'middle', 'bottom'] as const) {
          brokenSeals.add(`${level}-${side}`);
        }
      }
      
      expect(darkTower.getRandomUnbrokenSeal()).toBeNull();
    });

    test('should return only unbroken seals when some are broken', () => {
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      
      // Break some specific seals
      const brokenSealsList = [
        { side: 'north' as const, level: 'top' as const },
        { side: 'south' as const, level: 'middle' as const },
        { side: 'east' as const, level: 'bottom' as const }
      ];
      
      brokenSealsList.forEach(seal => {
        brokenSeals.add(`${seal.level}-${seal.side}`);
      });
      
      // Get random unbroken seal multiple times to ensure it's not broken
      for (let i = 0; i < 10; i++) {
        const randomSeal = darkTower.getRandomUnbrokenSeal();
        expect(randomSeal).toBeTruthy();
        expect(darkTower.isSealBroken(randomSeal!)).toBe(false);
      }
    });

    test('should maintain seal state consistency', () => {
      const seal = { side: 'west' as const, level: 'top' as const };
      
      // Initially unbroken
      expect(darkTower.isSealBroken(seal)).toBe(false);
      expect(darkTower.getBrokenSeals()).not.toContainEqual(seal);
      
      // Mark as broken
      const brokenSeals = darkTower['brokenSeals'] as Set<string>;
      brokenSeals.add(`${seal.level}-${seal.side}`);
      
      expect(darkTower.isSealBroken(seal)).toBe(true);
      expect(darkTower.getBrokenSeals()).toContainEqual(seal);
      
      // Reset and verify
      darkTower.resetBrokenSeals();
      expect(darkTower.isSealBroken(seal)).toBe(false);
      expect(darkTower.getBrokenSeals()).not.toContainEqual(seal);
    });

    // Integration test that actually calls breakSeal to verify the full flow
    test('should update broken seal state when breakSeal method is called', async () => {
      await darkTower.connect();
      
      const seal = { side: 'north' as const, level: 'middle' as const };
      
      // Mock the underlying command execution to avoid timing issues
      const towerCommands = darkTower['towerCommands'];
      const originalBreakSeal = towerCommands.breakSeal;
      towerCommands.breakSeal = jest.fn().mockResolvedValue(undefined);
      
      try {
        // Call the actual breakSeal method
        await darkTower.breakSeal(seal);
        
        // Verify the seal tracking was updated
        expect(darkTower.isSealBroken(seal)).toBe(true);
        expect(darkTower.getBrokenSeals()).toContainEqual(seal);
        
        // Test with multiple seals (now calling individually)
        const seals = [
          { side: 'east' as const, level: 'top' as const },
          { side: 'west' as const, level: 'bottom' as const }
        ];
        
        // Break each seal individually since arrays are no longer supported
        for (const sealToBreak of seals) {
          await darkTower.breakSeal(sealToBreak);
        }
        
        seals.forEach(s => {
          expect(darkTower.isSealBroken(s)).toBe(true);
        });
        
        expect(darkTower.getBrokenSeals()).toHaveLength(3); // original + 2 new
        
      } finally {
        // Restore original method
        towerCommands.breakSeal = originalBreakSeal;
        await darkTower.disconnect();
      }
    });
  });

  describe('Command Queue System', () => {
    beforeEach(async () => {
      // Connect to tower for testing
      await darkTower.connect();
      jest.clearAllMocks(); // Clear any connection-related calls
    });

    afterEach(() => {
      // Clean up command queue and timers
      if (darkTower && darkTower.isConnected) {
        const towerCommands = darkTower['towerCommands'];
        towerCommands.clearQueue();
        darkTower.disconnect();
      }
    });

    test('should queue commands sequentially', async () => {
      const writeValueSpy = jest.spyOn(mockCharacteristic, 'writeValue');
      
      // Send multiple commands rapidly
      const promises = [
        darkTower.playSound(1),
        darkTower.playSound(2),
        darkTower.playSound(3)
      ];
      
      // Commands should be queued but only first one executed immediately
      expect(writeValueSpy).toHaveBeenCalledTimes(1);
      
      // Simulate tower responses to progress the queue
      const towerCommands = darkTower['towerCommands'];
      towerCommands.onTowerResponse(); // Complete first command
      towerCommands.onTowerResponse(); // Complete second command
      towerCommands.onTowerResponse(); // Complete third command
      
      // Wait for all commands to complete
      await Promise.all(promises);
      
      // All commands should have been executed
      expect(writeValueSpy).toHaveBeenCalledTimes(3);
    });

    test('should handle command timeout gracefully', async () => {
      const writeValueSpy = jest.spyOn(mockCharacteristic, 'writeValue');
      const loggerSpy = jest.spyOn(darkTower['logger'], 'warn');
      
      // Mock a command that will timeout (don't trigger response)
      jest.useFakeTimers();
      const promise = darkTower.playSound(1);
      
      // Fast-forward time to trigger timeout (30 seconds)
      jest.advanceTimersByTime(30000);
      
      await promise; // Should complete despite timeout
      
      expect(writeValueSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command timeout after 30000ms'),
        '[UDT]'
      );
      
      jest.useRealTimers();
    });

    test('should clear queue on disconnection', async () => {
      // Queue some commands but don't trigger responses
      const promises = [
        darkTower.playSound(1),
        darkTower.playSound(2),
        darkTower.playSound(3)
      ];
      
      // Trigger disconnection - this should clear the queue
      const towerCommands = darkTower['towerCommands'];
      towerCommands.clearQueue();
      
      // All commands should be rejected when queue is cleared
      await expect(promises[0]).rejects.toThrow('Command queue cleared');
      await expect(promises[1]).rejects.toThrow('Command queue cleared');
      await expect(promises[2]).rejects.toThrow('Command queue cleared');
    }, 10000);
  });
});
