"use strict";
/**
 * Tests for UltimateDarkTower main class
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UltimateDarkTower_1 = __importDefault(require("../src/UltimateDarkTower"));
const udtConstants_1 = require("../src/udtConstants");
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
    let darkTower;
    beforeEach(() => {
        darkTower = new UltimateDarkTower_1.default();
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
            const seal = { side: 'west', level: 'middle' };
            expect(darkTower.isSealBroken(seal)).toBe(false);
        });
        test('should return random unbroken seal', () => {
            // Initially all seals are unbroken
            const randomSeal = darkTower.getRandomUnbrokenSeal();
            expect(randomSeal).toBeTruthy();
            expect(randomSeal).toHaveProperty('side');
            expect(randomSeal).toHaveProperty('level');
            expect(['north', 'south', 'east', 'west']).toContain(randomSeal.side);
            expect(['top', 'middle', 'bottom']).toContain(randomSeal.level);
        });
        test('should track broken seals directly via internal state', () => {
            // Access the internal brokenSeals Set directly to test tracking logic
            const brokenSeals = darkTower['brokenSeals'];
            const seal = { side: 'north', level: 'middle' };
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
            const brokenSeals = darkTower['brokenSeals'];
            const seal1 = { side: 'north', level: 'top' };
            const seal2 = { side: 'south', level: 'bottom' };
            const seal3 = { side: 'east', level: 'middle' };
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
            const brokenSeals = darkTower['brokenSeals'];
            const seal = { side: 'east', level: 'top' };
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
            const brokenSeals = darkTower['brokenSeals'];
            const seal1 = { side: 'north', level: 'top' };
            const seal2 = { side: 'south', level: 'bottom' };
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
            const brokenSeals = darkTower['brokenSeals'];
            // Break all possible seals (4 sides × 3 levels = 12 seals)
            for (const side of ['north', 'south', 'east', 'west']) {
                for (const level of ['top', 'middle', 'bottom']) {
                    brokenSeals.add(`${level}-${side}`);
                }
            }
            expect(darkTower.getRandomUnbrokenSeal()).toBeNull();
        });
        test('should return only unbroken seals when some are broken', () => {
            const brokenSeals = darkTower['brokenSeals'];
            // Break some specific seals
            const brokenSealsList = [
                { side: 'north', level: 'top' },
                { side: 'south', level: 'middle' },
                { side: 'east', level: 'bottom' }
            ];
            brokenSealsList.forEach(seal => {
                brokenSeals.add(`${seal.level}-${seal.side}`);
            });
            // Get random unbroken seal multiple times to ensure it's not broken
            for (let i = 0; i < 10; i++) {
                const randomSeal = darkTower.getRandomUnbrokenSeal();
                expect(randomSeal).toBeTruthy();
                expect(darkTower.isSealBroken(randomSeal)).toBe(false);
            }
        });
        test('should maintain seal state consistency', () => {
            const seal = { side: 'west', level: 'top' };
            // Initially unbroken
            expect(darkTower.isSealBroken(seal)).toBe(false);
            expect(darkTower.getBrokenSeals()).not.toContainEqual(seal);
            // Mark as broken
            const brokenSeals = darkTower['brokenSeals'];
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
            const seal = { side: 'north', level: 'middle' };
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
                    { side: 'east', level: 'top' },
                    { side: 'west', level: 'bottom' }
                ];
                // Break each seal individually since arrays are no longer supported
                for (const sealToBreak of seals) {
                    await darkTower.breakSeal(sealToBreak);
                }
                seals.forEach(s => {
                    expect(darkTower.isSealBroken(s)).toBe(true);
                });
                expect(darkTower.getBrokenSeals()).toHaveLength(3); // original + 2 new
            }
            finally {
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
            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Command timeout after 30000ms'), '[UDT]');
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
    describe('Glyph Position Tracking', () => {
        describe('Initialization', () => {
            test('should initialize all glyph positions as null', () => {
                const glyphPositions = darkTower.getAllGlyphPositions();
                expect(glyphPositions.cleanse).toBeNull();
                expect(glyphPositions.quest).toBeNull();
                expect(glyphPositions.battle).toBeNull();
                expect(glyphPositions.banner).toBeNull();
                expect(glyphPositions.reinforce).toBeNull();
            });
            test('should return null for individual glyph positions before calibration', () => {
                expect(darkTower.getGlyphPosition('cleanse')).toBeNull();
                expect(darkTower.getGlyphPosition('quest')).toBeNull();
                expect(darkTower.getGlyphPosition('battle')).toBeNull();
                expect(darkTower.getGlyphPosition('banner')).toBeNull();
                expect(darkTower.getGlyphPosition('reinforce')).toBeNull();
            });
            test('should return a copy of glyph positions object', () => {
                const positions1 = darkTower.getAllGlyphPositions();
                const positions2 = darkTower.getAllGlyphPositions();
                expect(positions1).toEqual(positions2);
                expect(positions1).not.toBe(positions2); // Different objects
            });
        });
        describe('Calibration', () => {
            test('should set initial glyph positions after calibration', () => {
                // Trigger calibration complete callback
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
                const glyphPositions = darkTower.getAllGlyphPositions();
                expect(glyphPositions.cleanse).toBe(udtConstants_1.GLYPHS.cleanse.side);
                expect(glyphPositions.quest).toBe(udtConstants_1.GLYPHS.quest.side);
                expect(glyphPositions.battle).toBe(udtConstants_1.GLYPHS.battle.side);
                expect(glyphPositions.banner).toBe(udtConstants_1.GLYPHS.banner.side);
                expect(glyphPositions.reinforce).toBe(udtConstants_1.GLYPHS.reinforce.side);
            });
            test('should set correct initial positions from GLYPHS constant', () => {
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
                // Test each glyph matches its expected position from constants
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north');
                expect(darkTower.getGlyphPosition('quest')).toBe('south');
                expect(darkTower.getGlyphPosition('battle')).toBe('north');
                expect(darkTower.getGlyphPosition('banner')).toBe('north');
                expect(darkTower.getGlyphPosition('reinforce')).toBe('south');
            });
            test('should trigger calibration callback on onCalibrationComplete', () => {
                const originalCallback = darkTower.onCalibrationComplete;
                const mockCallback = jest.fn();
                darkTower.onCalibrationComplete = mockCallback;
                // Simulate calibration complete from BLE connection
                const bleConnection = darkTower['bleConnection'];
                const callbacks = bleConnection['callbacks'];
                callbacks.onCalibrationComplete();
                // Check glyph positions were set
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north');
                expect(mockCallback).toHaveBeenCalled();
                // Restore original callback
                darkTower.onCalibrationComplete = originalCallback;
            });
        });
        describe('Rotation Updates', () => {
            beforeEach(() => {
                // Set up initial calibrated state
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
            });
            test('should update glyph positions after single level rotation', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate top level from north to east (1 step clockwise)
                updateMethod('top', 'north', 'east');
                // Cleanse starts at north, moves 1 step clockwise to east
                expect(darkTower.getGlyphPosition('cleanse')).toBe('east');
                // Quest starts at south, moves 1 step clockwise to west
                expect(darkTower.getGlyphPosition('quest')).toBe('west');
                // Other glyphs should remain unchanged (not on top level)
                expect(darkTower.getGlyphPosition('battle')).toBe('north');
                expect(darkTower.getGlyphPosition('banner')).toBe('north');
                expect(darkTower.getGlyphPosition('reinforce')).toBe('south');
            });
            test('should handle multiple rotation steps correctly', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate top level from north to south (2 steps clockwise)
                updateMethod('top', 'north', 'south');
                // Cleanse starts at north, moves 2 steps clockwise to south
                expect(darkTower.getGlyphPosition('cleanse')).toBe('south');
                // Quest starts at south, moves 2 steps clockwise to north
                expect(darkTower.getGlyphPosition('quest')).toBe('north');
            });
            test('should handle wrap-around rotation correctly', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate top level from west to north (1 step clockwise with wrap)
                updateMethod('top', 'west', 'north');
                // Cleanse starts at north, drum goes from west to north (1 step clockwise)
                // So cleanse moves 1 step clockwise: north -> east
                expect(darkTower.getGlyphPosition('cleanse')).toBe('east');
                // Quest starts at south, moves 1 step clockwise: south -> west
                expect(darkTower.getGlyphPosition('quest')).toBe('west');
            });
            test('should update only glyphs on the rotated level', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate middle level from north to east
                updateMethod('middle', 'north', 'east');
                // Battle is on middle level, should change
                expect(darkTower.getGlyphPosition('battle')).toBe('east');
                // All other glyphs should remain unchanged
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north'); // top level
                expect(darkTower.getGlyphPosition('quest')).toBe('south'); // top level
                expect(darkTower.getGlyphPosition('banner')).toBe('north'); // bottom level
                expect(darkTower.getGlyphPosition('reinforce')).toBe('south'); // bottom level
            });
            test('should handle bottom level rotation correctly', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate bottom level from north to west (3 steps clockwise)
                updateMethod('bottom', 'north', 'west');
                // Banner starts at north, moves 3 steps clockwise to west
                expect(darkTower.getGlyphPosition('banner')).toBe('west');
                // Reinforce starts at south, moves 3 steps clockwise to east
                expect(darkTower.getGlyphPosition('reinforce')).toBe('east');
                // Other glyphs should remain unchanged
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north');
                expect(darkTower.getGlyphPosition('quest')).toBe('south');
                expect(darkTower.getGlyphPosition('battle')).toBe('north');
            });
        });
        describe('Integration with Rotation Commands', () => {
            beforeEach(async () => {
                await darkTower.connect();
                // Set up initial calibrated state
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
            });
            afterEach(async () => {
                await darkTower.disconnect();
            });
            test('should update glyph positions when Rotate method is called', async () => {
                // Mock the underlying tower commands
                const towerCommands = darkTower['towerCommands'];
                const originalRotate = towerCommands.rotate;
                towerCommands.rotate = jest.fn().mockResolvedValue(undefined);
                // Mock getCurrentDrumPosition to return known positions
                const getCurrentDrumPositionSpy = jest.spyOn(darkTower, 'getCurrentDrumPosition');
                getCurrentDrumPositionSpy.mockReturnValue('north');
                try {
                    // Call the Rotate method - rotate each level 1 step clockwise
                    await darkTower.Rotate('east', 'east', 'east');
                    // Top level glyphs: cleanse (north->east), quest (south->west)
                    expect(darkTower.getGlyphPosition('cleanse')).toBe('east');
                    expect(darkTower.getGlyphPosition('quest')).toBe('west');
                    // Middle level glyph: battle (north->east)
                    expect(darkTower.getGlyphPosition('battle')).toBe('east');
                    // Bottom level glyphs: banner (north->east), reinforce (south->west)
                    expect(darkTower.getGlyphPosition('banner')).toBe('east');
                    expect(darkTower.getGlyphPosition('reinforce')).toBe('west');
                }
                finally {
                    // Restore original methods
                    towerCommands.rotate = originalRotate;
                    getCurrentDrumPositionSpy.mockRestore();
                }
            });
            test('should handle randomRotateLevels correctly', async () => {
                const towerCommands = darkTower['towerCommands'];
                const originalRandomRotate = towerCommands.randomRotateLevels;
                towerCommands.randomRotateLevels = jest.fn().mockResolvedValue(undefined);
                const getCurrentDrumPositionSpy = jest.spyOn(darkTower, 'getCurrentDrumPosition');
                // Mock different return values for before and after
                getCurrentDrumPositionSpy
                    .mockReturnValueOnce('north') // before top
                    .mockReturnValueOnce('north') // before middle
                    .mockReturnValueOnce('north') // before bottom
                    .mockReturnValueOnce('east') // after top (1 step clockwise)
                    .mockReturnValueOnce('south') // after middle (2 steps clockwise)
                    .mockReturnValueOnce('north'); // after bottom (unchanged)
                try {
                    await darkTower.randomRotateLevels(4); // top & middle levels
                    // Top level changed from north to east (1 step clockwise)
                    // cleanse: north->east, quest: south->west
                    expect(darkTower.getGlyphPosition('cleanse')).toBe('east');
                    expect(darkTower.getGlyphPosition('quest')).toBe('west');
                    // Middle level changed from north to south (2 steps clockwise)
                    // battle: north->south
                    expect(darkTower.getGlyphPosition('battle')).toBe('south');
                    // Bottom level unchanged
                    expect(darkTower.getGlyphPosition('banner')).toBe('north');
                    expect(darkTower.getGlyphPosition('reinforce')).toBe('south');
                }
                finally {
                    towerCommands.randomRotateLevels = originalRandomRotate;
                    getCurrentDrumPositionSpy.mockRestore();
                }
            });
        });
        describe('Edge Cases and Error Handling', () => {
            test('should handle null glyph positions gracefully', () => {
                // Before calibration, all positions should be null
                expect(darkTower.getGlyphPosition('cleanse')).toBeNull();
                // Trying to update positions before calibration should not crash
                const updateMethod = darkTower['updateGlyphPositionsAfterRotation'].bind(darkTower);
                expect(() => updateMethod('top', 1)).not.toThrow();
                // Positions should remain null
                expect(darkTower.getGlyphPosition('cleanse')).toBeNull();
            });
            test('should handle rotation calculations with all positions', () => {
                // Set up calibrated state
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
                const sides = ['north', 'east', 'south', 'west'];
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Test all possible rotations
                for (const fromSide of sides) {
                    for (const toSide of sides) {
                        // Reset to known state
                        calibrationCallback();
                        // Perform rotation
                        expect(() => updateMethod('top', fromSide, toSide)).not.toThrow();
                        // Verify the result is valid
                        const newPosition = darkTower.getGlyphPosition('cleanse');
                        expect(sides).toContain(newPosition);
                    }
                }
            });
            test('should maintain consistency with multiple rotations', () => {
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Perform multiple rotations around the circle
                updateMethod('top', 'north', 'east'); // north to east (1 step clockwise)
                updateMethod('top', 'east', 'south'); // east to south (1 step clockwise) 
                updateMethod('top', 'south', 'west'); // south to west (1 step clockwise)
                updateMethod('top', 'west', 'north'); // west to north (1 step clockwise, back to start)
                // Should be back to original position
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north');
            });
            test('should handle no rotation when old and new positions are the same', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Store initial positions
                const initialPositions = darkTower.getAllGlyphPositions();
                // Try to rotate from north to north (no change)
                updateMethod('top', 'north', 'north');
                // Positions should remain unchanged
                expect(darkTower.getAllGlyphPositions()).toEqual(initialPositions);
            });
            test('should correctly calculate rotation steps for all directions', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Test moving drum from initial position (north) to each direction
                // Since cleanse starts at north and quest starts at south on the top drum
                const testCases = [
                    { from: 'north', to: 'east', expectedCleanse: 'east', expectedQuest: 'west' },
                    { from: 'north', to: 'south', expectedCleanse: 'south', expectedQuest: 'north' },
                    { from: 'north', to: 'west', expectedCleanse: 'west', expectedQuest: 'east' },
                    { from: 'north', to: 'north', expectedCleanse: 'north', expectedQuest: 'south' }, // No rotation
                ];
                for (const testCase of testCases) {
                    // Reset to known state (cleanse=north, quest=south)
                    const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                    calibrationCallback();
                    // Perform rotation
                    updateMethod('top', testCase.from, testCase.to);
                    // Verify results
                    expect(darkTower.getGlyphPosition('cleanse')).toBe(testCase.expectedCleanse);
                    expect(darkTower.getGlyphPosition('quest')).toBe(testCase.expectedQuest);
                }
            });
        });
        describe('Glyph Management Features', () => {
            beforeEach(() => {
                // Set up initial calibrated state
                const calibrationCallback = darkTower['setGlyphPositionsFromCalibration'].bind(darkTower);
                calibrationCallback();
            });
            test('should track multi-glyph drum movements correctly', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Move top drum from north to east (affects both cleanse and quest)
                updateMethod('top', 'north', 'east');
                // Both glyphs on top drum should move together
                expect(darkTower.getGlyphPosition('cleanse')).toBe('east'); // was north
                expect(darkTower.getGlyphPosition('quest')).toBe('west'); // was south
                // Other drums unaffected
                expect(darkTower.getGlyphPosition('battle')).toBe('north');
                expect(darkTower.getGlyphPosition('banner')).toBe('north');
                expect(darkTower.getGlyphPosition('reinforce')).toBe('south');
            });
            test('should handle bottom drum multi-glyph movements', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Move bottom drum from north to south (affects both banner and reinforce)
                updateMethod('bottom', 'north', 'south');
                // Both glyphs on bottom drum should move together
                expect(darkTower.getGlyphPosition('banner')).toBe('south'); // was north
                expect(darkTower.getGlyphPosition('reinforce')).toBe('north'); // was south
                // Other drums unaffected
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north');
                expect(darkTower.getGlyphPosition('quest')).toBe('south');
                expect(darkTower.getGlyphPosition('battle')).toBe('north');
            });
            test('should handle single glyph drum movement (middle)', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Move middle drum from north to west (only affects battle)
                updateMethod('middle', 'north', 'west');
                // Only battle should move
                expect(darkTower.getGlyphPosition('battle')).toBe('west'); // was north
                // All other glyphs unaffected
                expect(darkTower.getGlyphPosition('cleanse')).toBe('north');
                expect(darkTower.getGlyphPosition('quest')).toBe('south');
                expect(darkTower.getGlyphPosition('banner')).toBe('north');
                expect(darkTower.getGlyphPosition('reinforce')).toBe('south');
            });
            test('should correctly handle 180-degree rotations', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate top drum 180 degrees: north to south
                updateMethod('top', 'north', 'south');
                // Glyphs should swap positions
                expect(darkTower.getGlyphPosition('cleanse')).toBe('south'); // was north
                expect(darkTower.getGlyphPosition('quest')).toBe('north'); // was south
            });
            test('should correctly handle 270-degree rotations', () => {
                const updateMethod = darkTower['calculateAndUpdateGlyphPositions'].bind(darkTower);
                // Rotate bottom drum 270 degrees: north to west  
                updateMethod('bottom', 'north', 'west');
                // 270-degree clockwise rotation
                expect(darkTower.getGlyphPosition('banner')).toBe('west'); // north + 3 steps = west
                expect(darkTower.getGlyphPosition('reinforce')).toBe('east'); // south + 3 steps = east
            });
        });
    });
});
//# sourceMappingURL=UltimateDarkTower.test.js.map