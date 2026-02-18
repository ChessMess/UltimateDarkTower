"use strict";
/**
 * Tests for NodeBluetoothAdapter
 *
 * Mocks @stoprocent/noble at the module level. Noble is a singleton EventEmitter
 * loaded via require() at the top of NodeBluetoothAdapter.ts. The jest.mock()
 * intercepts that require so the adapter gets our mock instead of the real package.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const udtBluetoothAdapter_1 = require("../../src/udtBluetoothAdapter");
const udtConstants_1 = require("../../src/udtConstants");
// --- Build the mock noble singleton BEFORE jest.mock ---
function createMockNoble() {
    const listeners = {};
    return {
        state: 'poweredOn',
        waitForPoweredOnAsync: jest.fn().mockResolvedValue(undefined),
        startScanning: jest.fn(),
        stopScanning: jest.fn(),
        on: jest.fn((event, handler) => {
            if (!listeners[event])
                listeners[event] = [];
            listeners[event].push(handler);
        }),
        removeListener: jest.fn((event, handler) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        }),
        _listeners: listeners,
        _emit: (event, ...args) => {
            (listeners[event] || []).forEach(fn => fn(...args));
        },
    };
}
const mockNoble = createMockNoble();
// Mock the noble module - this intercepts the require() in NodeBluetoothAdapter.ts
jest.mock('@stoprocent/noble', () => mockNoble);
// Import AFTER mocking so the module-level require picks up our mock
const NodeBluetoothAdapter_1 = require("../../src/adapters/NodeBluetoothAdapter");
// --- Mock Factories ---
function normalizeUuid(uuid) {
    return uuid.toLowerCase().replace(/-/g, '');
}
function createMockCharacteristic(uuid, options = {}) {
    var _a;
    const listeners = {};
    return {
        uuid: normalizeUuid(uuid),
        subscribeAsync: jest.fn().mockResolvedValue(undefined),
        unsubscribeAsync: jest.fn().mockResolvedValue(undefined),
        readAsync: jest.fn().mockResolvedValue((_a = options.readable) !== null && _a !== void 0 ? _a : Buffer.from('')),
        writeAsync: jest.fn().mockResolvedValue(undefined),
        on: jest.fn((event, handler) => {
            if (!listeners[event])
                listeners[event] = [];
            listeners[event].push(handler);
        }),
        removeListener: jest.fn((event, handler) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        }),
        _listeners: listeners,
        _emit: (event, ...args) => {
            (listeners[event] || []).forEach(fn => fn(...args));
        },
    };
}
function createMockPeripheral(options = {}) {
    var _a, _b, _c;
    const listeners = {};
    return {
        advertisement: { localName: (_a = options.name) !== null && _a !== void 0 ? _a : 'ReturnToDarkTower' },
        state: (_b = options.state) !== null && _b !== void 0 ? _b : 'connected',
        connectAsync: jest.fn().mockResolvedValue(undefined),
        disconnectAsync: jest.fn().mockResolvedValue(undefined),
        discoverAllServicesAndCharacteristicsAsync: jest.fn().mockResolvedValue({
            characteristics: (_c = options.characteristics) !== null && _c !== void 0 ? _c : [],
        }),
        once: jest.fn((event, handler) => {
            if (!listeners[event])
                listeners[event] = [];
            listeners[event].push(handler);
        }),
        removeListener: jest.fn((event, handler) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        }),
        _listeners: listeners,
        _emit: (event, ...args) => {
            (listeners[event] || []).forEach(fn => fn(...args));
        },
    };
}
function createStandardCharacteristics() {
    const txChar = createMockCharacteristic(udtConstants_1.UART_TX_CHARACTERISTIC_UUID);
    const rxChar = createMockCharacteristic(udtConstants_1.UART_RX_CHARACTERISTIC_UUID);
    return { txChar, rxChar, all: [txChar, rxChar] };
}
/**
 * Sets up mockNoble.startScanning to immediately emit 'discover' with the given peripheral
 */
function setupImmediateDiscovery(peripheral) {
    mockNoble.startScanning.mockImplementation(() => {
        // Simulate async discovery
        setTimeout(() => {
            mockNoble._emit('discover', peripheral);
        }, 0);
    });
}
describe('NodeBluetoothAdapter', () => {
    let adapter;
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        // Reset noble mock state
        mockNoble._listeners.discover = [];
        mockNoble._listeners.stateChange = [];
        mockNoble.state = 'poweredOn';
        mockNoble.waitForPoweredOnAsync.mockResolvedValue(undefined);
        adapter = new NodeBluetoothAdapter_1.NodeBluetoothAdapter();
    });
    afterEach(async () => {
        try {
            await adapter.cleanup();
        }
        catch (_a) {
            // ignore
        }
    });
    describe('connect', () => {
        test('should connect successfully through full noble flow', async () => {
            const { rxChar, all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            expect(mockNoble.waitForPoweredOnAsync).toHaveBeenCalled();
            expect(mockNoble.startScanning).toHaveBeenCalled();
            expect(peripheral.connectAsync).toHaveBeenCalled();
            expect(peripheral.discoverAllServicesAndCharacteristicsAsync).toHaveBeenCalled();
            expect(rxChar.subscribeAsync).toHaveBeenCalled();
            expect(rxChar.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(peripheral.once).toHaveBeenCalledWith('disconnect', expect.any(Function));
            expect(adapter.isConnected()).toBe(true);
            expect(adapter.isGattConnected()).toBe(true);
        });
        test('should throw BluetoothTimeoutError when scan times out', async () => {
            jest.spyOn(adapter, 'scanForDevice').mockRejectedValue(new udtBluetoothAdapter_1.BluetoothTimeoutError('Device scan timeout after 10000ms'));
            await expect(adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']))
                .rejects.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothTimeoutError);
        });
        test('should throw BluetoothConnectionError when TX/RX not found', async () => {
            const peripheral = createMockPeripheral({ characteristics: [] });
            setupImmediateDiscovery(peripheral);
            await expect(adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']))
                .rejects.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothConnectionError);
        });
        test('should call cleanup on connection failure', async () => {
            const peripheral = createMockPeripheral({ characteristics: [] });
            setupImmediateDiscovery(peripheral);
            const cleanupSpy = jest.spyOn(adapter, 'cleanup');
            try {
                await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            }
            catch (_a) {
                // expected
            }
            expect(cleanupSpy).toHaveBeenCalled();
        });
        test('should normalize service UUIDs for noble', async () => {
            const { all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6E400001-B5A3-F393-E0A9-E50E24DCCA9E']);
            const scanArgs = mockNoble.startScanning.mock.calls[0];
            expect(scanArgs[0]).toEqual(['6e400001b5a3f393e0a9e50e24dcca9e']);
        });
        test('should only match devices with matching name prefix', async () => {
            const wrongDevice = createMockPeripheral({ name: 'SomeOtherDevice', characteristics: [] });
            const rightDevice = createMockPeripheral({ name: 'ReturnToDarkTower' });
            const { all } = createStandardCharacteristics();
            rightDevice.discoverAllServicesAndCharacteristicsAsync.mockResolvedValue({ characteristics: all });
            mockNoble.startScanning.mockImplementation(() => {
                setTimeout(() => {
                    mockNoble._emit('discover', wrongDevice);
                    setTimeout(() => {
                        mockNoble._emit('discover', rightDevice);
                    }, 0);
                }, 0);
            });
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            expect(rightDevice.connectAsync).toHaveBeenCalled();
            expect(wrongDevice.connectAsync).not.toHaveBeenCalled();
        });
    });
    describe('disconnect', () => {
        test('should unsubscribe RX, remove listener, and disconnect peripheral', async () => {
            const { rxChar, all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            await adapter.disconnect();
            expect(rxChar.removeListener).toHaveBeenCalledWith('data', expect.any(Function));
            expect(rxChar.unsubscribeAsync).toHaveBeenCalled();
            expect(peripheral.disconnectAsync).toHaveBeenCalled();
            expect(adapter.isConnected()).toBe(false);
            expect(adapter.isGattConnected()).toBe(false);
        });
        test('should handle disconnect errors gracefully', async () => {
            const { all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            peripheral.disconnectAsync.mockRejectedValue(new Error('already disconnected'));
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            await expect(adapter.disconnect()).resolves.toBeUndefined();
            expect(adapter.isConnected()).toBe(false);
        });
    });
    describe('writeCharacteristic', () => {
        test('should convert to Buffer and write with response', async () => {
            const { txChar, all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            const data = new Uint8Array([0x04, 0x00, 0x00]);
            await adapter.writeCharacteristic(data);
            expect(txChar.writeAsync).toHaveBeenCalledTimes(1);
            const writtenBuffer = txChar.writeAsync.mock.calls[0][0];
            expect(Buffer.isBuffer(writtenBuffer)).toBe(true);
            expect(new Uint8Array(writtenBuffer)).toEqual(data);
            expect(txChar.writeAsync.mock.calls[0][1]).toBe(false);
        });
    });
    describe('onCharacteristicValueChanged', () => {
        test('should invoke callback when RX data arrives', async () => {
            var _a;
            const { rxChar, all } = createStandardCharacteristics();
            const callback = jest.fn();
            adapter.onCharacteristicValueChanged(callback);
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            const dataHandler = (_a = rxChar.on.mock.calls.find((call) => call[0] === 'data')) === null || _a === void 0 ? void 0 : _a[1];
            expect(dataHandler).toBeDefined();
            const testBuffer = Buffer.from([0xAA, 0xBB, 0xCC]);
            dataHandler(testBuffer);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(expect.any(Uint8Array));
            expect(Array.from(callback.mock.calls[0][0])).toEqual([0xAA, 0xBB, 0xCC]);
        });
    });
    describe('onDisconnect', () => {
        test('should invoke callback on peripheral disconnect event', async () => {
            var _a;
            const { all } = createStandardCharacteristics();
            const callback = jest.fn();
            adapter.onDisconnect(callback);
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            const disconnectHandler = (_a = peripheral.once.mock.calls.find((call) => call[0] === 'disconnect')) === null || _a === void 0 ? void 0 : _a[1];
            expect(disconnectHandler).toBeDefined();
            disconnectHandler();
            expect(callback).toHaveBeenCalled();
            expect(adapter.isConnected()).toBe(false);
        });
    });
    describe('onBluetoothAvailabilityChanged', () => {
        test('should relay noble stateChange events', async () => {
            var _a;
            const callback = jest.fn();
            adapter.onBluetoothAvailabilityChanged(callback);
            const { all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            const stateHandler = (_a = mockNoble.on.mock.calls.find((call) => call[0] === 'stateChange')) === null || _a === void 0 ? void 0 : _a[1];
            expect(stateHandler).toBeDefined();
            stateHandler('poweredOff');
            expect(callback).toHaveBeenCalledWith(false);
            stateHandler('poweredOn');
            expect(callback).toHaveBeenCalledWith(true);
        });
    });
    describe('readDeviceInformation', () => {
        test('should read text DIS characteristics', async () => {
            const mfrChar = createMockCharacteristic('00002a29-0000-1000-8000-00805f9b34fb', { readable: Buffer.from('Restoration Games') });
            const { txChar, rxChar } = createStandardCharacteristics();
            const allChars = [txChar, rxChar, mfrChar];
            const peripheral = createMockPeripheral({ characteristics: allChars });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            const info = await adapter.readDeviceInformation();
            expect(info.manufacturerName).toBe('Restoration Games');
            expect(info.lastUpdated).toBeInstanceOf(Date);
        });
        test('should read binary DIS characteristics as hex', async () => {
            const sysIdChar = createMockCharacteristic('00002a23-0000-1000-8000-00805f9b34fb', { readable: Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]) });
            const { txChar, rxChar } = createStandardCharacteristics();
            const allChars = [txChar, rxChar, sysIdChar];
            const peripheral = createMockPeripheral({ characteristics: allChars });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            const info = await adapter.readDeviceInformation();
            expect(info.systemId).toBe('de:ad:be:ef');
        });
    });
    describe('cleanup', () => {
        test('should remove noble and peripheral listeners', async () => {
            const callback = jest.fn();
            adapter.onBluetoothAvailabilityChanged(callback);
            const { all } = createStandardCharacteristics();
            const peripheral = createMockPeripheral({ characteristics: all });
            setupImmediateDiscovery(peripheral);
            await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
            await adapter.cleanup();
            expect(mockNoble.removeListener).toHaveBeenCalledWith('stateChange', expect.any(Function));
            expect(peripheral.removeListener).toHaveBeenCalledWith('disconnect', expect.any(Function));
            expect(adapter.isConnected()).toBe(false);
        });
    });
});
//# sourceMappingURL=NodeBluetoothAdapter.test.js.map