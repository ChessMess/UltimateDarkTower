/**
 * Tests for BluetoothAdapterFactory platform detection and adapter creation
 */

import { BluetoothAdapterFactory, BluetoothPlatform } from '../src/udtBluetoothAdapterFactory';

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

type FactoryTestGlobal = {
  window?: object;
  navigator?: { bluetooth?: object; userAgent?: string };
};
type MockAdapterResult = ReturnType<typeof BluetoothAdapterFactory.create> & { _type: string };

describe('BluetoothAdapterFactory', () => {
  // Save originals for restoration
  const originalWindow = (global as unknown as FactoryTestGlobal).window;
  const originalNavigator = (global as unknown as FactoryTestGlobal).navigator;

  afterEach(() => {
    // Restore globals
    if (originalWindow === undefined) {
      delete (global as unknown as FactoryTestGlobal).window;
    } else {
      (global as unknown as FactoryTestGlobal).window = originalWindow;
    }
    if (originalNavigator === undefined) {
      delete (global as unknown as FactoryTestGlobal).navigator;
    } else {
      (global as unknown as FactoryTestGlobal).navigator = originalNavigator;
    }
  });

  describe('detectPlatform', () => {
    test('should detect Node.js environment', () => {
      // In Node.js test runner, process.versions.node is already set
      // Ensure no browser globals interfere
      delete (global as unknown as FactoryTestGlobal).window;
      delete (global as unknown as FactoryTestGlobal).navigator;

      const platform = BluetoothAdapterFactory.detectPlatform();
      expect(platform).toBe(BluetoothPlatform.NODE);
    });

    test('should detect Web Bluetooth environment', () => {
      // Simulate browser with Web Bluetooth
      (global as unknown as FactoryTestGlobal).window = {};
      (global as unknown as FactoryTestGlobal).navigator = {
        bluetooth: {},
        userAgent: 'Mozilla/5.0 Chrome/120',
      };

      const platform = BluetoothAdapterFactory.detectPlatform();
      expect(platform).toBe(BluetoothPlatform.WEB);
    });

    test('should throw for React Native environment', () => {
      (global as unknown as FactoryTestGlobal).navigator = {
        userAgent: 'React Native',
      };

      expect(() => BluetoothAdapterFactory.detectPlatform()).toThrow('React Native detected');
      expect(() => BluetoothAdapterFactory.detectPlatform()).toThrow('custom adapter');
    });

    test('should throw for unknown environment without Node.js or Web Bluetooth', () => {
      // Simulate environment that is neither browser nor Node
      delete (global as unknown as FactoryTestGlobal).window;
      delete (global as unknown as FactoryTestGlobal).navigator;
      const savedProcess = global.process;
      // Temporarily hide process to simulate unknown environment
      Object.defineProperty(global, 'process', { value: undefined, configurable: true });

      try {
        expect(() => BluetoothAdapterFactory.detectPlatform()).toThrow('Unable to detect');
      } finally {
        Object.defineProperty(global, 'process', { value: savedProcess, configurable: true });
      }
    });

  });

  describe('create', () => {
    test('should create WebBluetoothAdapter for WEB platform', () => {
      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.WEB);
      expect((adapter as MockAdapterResult)._type).toBe('web');
    });

    test('should create NodeBluetoothAdapter for NODE platform', () => {
      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.NODE);
      expect((adapter as MockAdapterResult)._type).toBe('node');
    });

    test('should auto-detect platform when AUTO is specified', () => {
      // In Node.js test environment, should auto-detect NODE
      delete (global as unknown as FactoryTestGlobal).window;
      delete (global as unknown as FactoryTestGlobal).navigator;

      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.AUTO);
      expect((adapter as MockAdapterResult)._type).toBe('node');
    });

    test('should throw for unsupported platform value', () => {
      expect(() => {
        BluetoothAdapterFactory.create('unsupported' as BluetoothPlatform);
      }).toThrow('Unsupported Bluetooth platform');
    });
  });
});
