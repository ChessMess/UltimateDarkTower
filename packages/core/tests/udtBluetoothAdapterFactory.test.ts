/**
 * Tests for BluetoothAdapterFactory platform detection and adapter creation
 */

import {
  BluetoothAdapterFactory,
  BluetoothPlatform,
  type AdapterConstructorOverrides,
} from '../src/udtBluetoothAdapterFactory';
import type { IBluetoothAdapter } from '../src/udtBluetoothAdapter';
import { NoopBluetoothAdapter } from '../src/adapters/NoopBluetoothAdapter';

// The factory lazily `require()`s each adapter so a browser bundle never pulls in
// the Node BLE stack. That is a runtime call: `vi.mock` cannot intercept it, and it
// cannot resolve a `.ts` source at all. So these tests inject the constructors via
// `create`'s `overrides` parameter instead of mocking the modules.
//
// A real class, not `vi.fn().mockImplementation(...)`: the factory calls
// `new Ctor()`, and an arrow-function mock implementation is not constructible
// ("... is not a constructor"). Jest tolerated this; vitest does not.
function stubAdapter(type: string): new () => IBluetoothAdapter {
  return class StubAdapter {
    readonly _type = type;
    connect = vi.fn();
    disconnect = vi.fn();
    isConnected = vi.fn();
    isGattConnected = vi.fn();
    writeCharacteristic = vi.fn();
    onCharacteristicValueChanged = vi.fn();
    onDisconnect = vi.fn();
    onBluetoothAvailabilityChanged = vi.fn();
    readDeviceInformation = vi.fn();
    cleanup = vi.fn();
  } as unknown as new () => IBluetoothAdapter;
}

// NoopBluetoothAdapter is passed through for real (statically imported here rather
// than lazily required) so the NONE case still exercises the actual adapter.
const adapterOverrides: AdapterConstructorOverrides = {
  WebBluetoothAdapter: stubAdapter('web'),
  NodeBluetoothAdapter: stubAdapter('node'),
  NoopBluetoothAdapter,
};

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
      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.WEB, adapterOverrides);
      expect((adapter as MockAdapterResult)._type).toBe('web');
    });

    test('should create NodeBluetoothAdapter for NODE platform', () => {
      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.NODE, adapterOverrides);
      expect((adapter as MockAdapterResult)._type).toBe('node');
    });

    test('should auto-detect platform when AUTO is specified', () => {
      // In Node.js test environment, should auto-detect NODE
      delete (global as unknown as FactoryTestGlobal).window;
      delete (global as unknown as FactoryTestGlobal).navigator;

      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.AUTO, adapterOverrides);
      expect((adapter as MockAdapterResult)._type).toBe('node');
    });

    test('should create a no-op adapter for NONE platform', () => {
      // NoopBluetoothAdapter is not mocked, so this exercises the real adapter.
      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.NONE, adapterOverrides);
      expect(adapter).toBeDefined();
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.isGattConnected()).toBe(false);
    });

    test('should throw for unsupported platform value', () => {
      expect(() => {
        BluetoothAdapterFactory.create('unsupported' as BluetoothPlatform);
      }).toThrow('Unsupported Bluetooth platform');
    });
  });
});
