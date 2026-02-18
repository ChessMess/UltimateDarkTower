"use strict";
/**
 * Tests for BluetoothAdapterFactory platform detection and adapter creation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const udtBluetoothAdapterFactory_1 = require("../src/udtBluetoothAdapterFactory");
// Mock the adapter modules so we don't need real implementations
jest.mock('../src/adapters/WebBluetoothAdapter', () => ({
    WebBluetoothAdapter: jest.fn().mockImplementation(() => ({
        _type: 'web',
        connect: jest.fn(),
        disconnect: jest.fn(),
        isConnected: jest.fn(),
        isGattConnected: jest.fn(),
        writeCharacteristic: jest.fn(),
        onCharacteristicValueChanged: jest.fn(),
        onDisconnect: jest.fn(),
        onBluetoothAvailabilityChanged: jest.fn(),
        readDeviceInformation: jest.fn(),
        cleanup: jest.fn(),
    })),
}));
jest.mock('../src/adapters/NodeBluetoothAdapter', () => ({
    NodeBluetoothAdapter: jest.fn().mockImplementation(() => ({
        _type: 'node',
        connect: jest.fn(),
        disconnect: jest.fn(),
        isConnected: jest.fn(),
        isGattConnected: jest.fn(),
        writeCharacteristic: jest.fn(),
        onCharacteristicValueChanged: jest.fn(),
        onDisconnect: jest.fn(),
        onBluetoothAvailabilityChanged: jest.fn(),
        readDeviceInformation: jest.fn(),
        cleanup: jest.fn(),
    })),
}));
describe('BluetoothAdapterFactory', () => {
    // Save originals for restoration
    const originalWindow = global.window;
    const originalNavigator = global.navigator;
    afterEach(() => {
        // Restore globals
        if (originalWindow === undefined) {
            delete global.window;
        }
        else {
            global.window = originalWindow;
        }
        if (originalNavigator === undefined) {
            delete global.navigator;
        }
        else {
            global.navigator = originalNavigator;
        }
    });
    describe('detectPlatform', () => {
        test('should detect Node.js environment', () => {
            // In Node.js test runner, process.versions.node is already set
            // Ensure no browser globals interfere
            delete global.window;
            delete global.navigator;
            const platform = udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.detectPlatform();
            expect(platform).toBe(udtBluetoothAdapterFactory_1.BluetoothPlatform.NODE);
        });
        test('should detect Web Bluetooth environment', () => {
            // Simulate browser with Web Bluetooth
            global.window = {};
            global.navigator = {
                bluetooth: {},
                userAgent: 'Mozilla/5.0 Chrome/120',
            };
            const platform = udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.detectPlatform();
            expect(platform).toBe(udtBluetoothAdapterFactory_1.BluetoothPlatform.WEB);
        });
        test('should throw for React Native environment', () => {
            global.navigator = {
                userAgent: 'React Native',
            };
            expect(() => udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.detectPlatform()).toThrow('React Native detected');
            expect(() => udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.detectPlatform()).toThrow('custom adapter');
        });
        test('should throw for unknown environment without Node.js or Web Bluetooth', () => {
            // Simulate environment that is neither browser nor Node
            delete global.window;
            delete global.navigator;
            const savedProcess = global.process;
            // Temporarily hide process to simulate unknown environment
            Object.defineProperty(global, 'process', { value: undefined, configurable: true });
            try {
                expect(() => udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.detectPlatform()).toThrow('Unable to detect');
            }
            finally {
                Object.defineProperty(global, 'process', { value: savedProcess, configurable: true });
            }
        });
    });
    describe('create', () => {
        test('should create WebBluetoothAdapter for WEB platform', () => {
            const adapter = udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.create(udtBluetoothAdapterFactory_1.BluetoothPlatform.WEB);
            expect(adapter._type).toBe('web');
        });
        test('should create NodeBluetoothAdapter for NODE platform', () => {
            const adapter = udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.create(udtBluetoothAdapterFactory_1.BluetoothPlatform.NODE);
            expect(adapter._type).toBe('node');
        });
        test('should auto-detect platform when AUTO is specified', () => {
            // In Node.js test environment, should auto-detect NODE
            delete global.window;
            delete global.navigator;
            const adapter = udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.create(udtBluetoothAdapterFactory_1.BluetoothPlatform.AUTO);
            expect(adapter._type).toBe('node');
        });
        test('should throw for unsupported platform value', () => {
            expect(() => {
                udtBluetoothAdapterFactory_1.BluetoothAdapterFactory.create('unsupported');
            }).toThrow('Unsupported Bluetooth platform');
        });
    });
});
//# sourceMappingURL=udtBluetoothAdapterFactory.test.js.map