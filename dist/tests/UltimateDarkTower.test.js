"use strict";
/**
 * Tests for UltimateDarkTower main class
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UltimateDarkTower_1 = __importDefault(require("../src/UltimateDarkTower"));
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
});
//# sourceMappingURL=UltimateDarkTower.test.js.map