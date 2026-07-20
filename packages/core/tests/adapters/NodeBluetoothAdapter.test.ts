/**
 * Tests for NodeBluetoothAdapter
 *
 * Noble is a singleton EventEmitter that the adapter loads with a guarded
 * `require('@stoprocent/noble')` at module scope, so it is never pulled into a
 * browser build. That `require` is a runtime call and is NOT intercepted by
 * `vi.mock`, which only rewrites the ESM module graph — so these tests inject a
 * stand-in through the adapter's constructor instead. `NodeBluetoothAdapter()`
 * with no argument still resolves the real singleton in production.
 */

import { BluetoothConnectionError, BluetoothTimeoutError } from '../../src/udtBluetoothAdapter';
import { UART_TX_CHARACTERISTIC_UUID, UART_RX_CHARACTERISTIC_UUID } from '../../src/udtConstants';
import { NodeBluetoothAdapter, type NobleLike } from '../../src/adapters/NodeBluetoothAdapter';

// Noble/characteristic event handlers are invoked as `handler(...args)`.
type Listener = (...args: unknown[]) => void;

function createMockNoble() {
  const listeners: Record<string, Listener[]> = {};
  return {
    state: 'poweredOn',
    waitForPoweredOnAsync: vi.fn().mockResolvedValue(undefined),
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
    on: vi.fn((event: string, handler: Listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeListener: vi.fn((event: string, handler: Listener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    _listeners: listeners,
    _emit: (event: string, ...args: unknown[]) => {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },
  };
}

const mockNoble = createMockNoble();

// --- Mock Factories ---

function normalizeUuid(uuid: string): string {
  return uuid.toLowerCase().replace(/-/g, '');
}

function createMockCharacteristic(uuid: string, options: { readable?: Buffer } = {}) {
  const listeners: Record<string, Listener[]> = {};
  return {
    uuid: normalizeUuid(uuid),
    subscribeAsync: vi.fn().mockResolvedValue(undefined),
    unsubscribeAsync: vi.fn().mockResolvedValue(undefined),
    readAsync: vi.fn().mockResolvedValue(options.readable ?? Buffer.from('')),
    writeAsync: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: Listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeListener: vi.fn((event: string, handler: Listener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    _listeners: listeners,
    _emit: (event: string, ...args: unknown[]) => {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },
  };
}

function createMockPeripheral(
  options: {
    name?: string;
    characteristics?: ReturnType<typeof createMockCharacteristic>[];
    state?: string;
  } = {},
) {
  const listeners: Record<string, Listener[]> = {};
  return {
    advertisement: { localName: options.name ?? 'ReturnToDarkTower' },
    state: options.state ?? 'connected',
    connectAsync: vi.fn().mockResolvedValue(undefined),
    disconnectAsync: vi.fn().mockResolvedValue(undefined),
    discoverAllServicesAndCharacteristicsAsync: vi.fn().mockResolvedValue({
      characteristics: options.characteristics ?? [],
    }),
    once: vi.fn((event: string, handler: Listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeListener: vi.fn((event: string, handler: Listener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    _listeners: listeners,
    _emit: (event: string, ...args: unknown[]) => {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },
  };
}

function createStandardCharacteristics() {
  const txChar = createMockCharacteristic(UART_TX_CHARACTERISTIC_UUID);
  const rxChar = createMockCharacteristic(UART_RX_CHARACTERISTIC_UUID);
  return { txChar, rxChar, all: [txChar, rxChar] };
}

/**
 * Sets up mockNoble.startScanning to immediately emit 'discover' with the given peripheral
 */
function setupImmediateDiscovery(peripheral: ReturnType<typeof createMockPeripheral>) {
  mockNoble.startScanning.mockImplementation(() => {
    // Simulate async discovery
    setTimeout(() => {
      mockNoble._emit('discover', peripheral);
    }, 0);
  });
}

describe('NodeBluetoothAdapter', () => {
  let adapter: NodeBluetoothAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    // Reset noble mock state
    mockNoble._listeners.discover = [];
    mockNoble._listeners.stateChange = [];
    mockNoble.state = 'poweredOn';
    mockNoble.waitForPoweredOnAsync.mockResolvedValue(undefined);

    adapter = new NodeBluetoothAdapter(mockNoble as unknown as NobleLike);
  });

  afterEach(async () => {
    try {
      await adapter.cleanup();
    } catch {
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
      vi.spyOn(
        adapter as unknown as { scanForDevice: (...args: unknown[]) => Promise<unknown> },
        'scanForDevice',
      ).mockRejectedValue(new BluetoothTimeoutError('Device scan timeout after 10000ms'));

      await expect(
        adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']),
      ).rejects.toBeInstanceOf(BluetoothTimeoutError);
    });

    test('should throw BluetoothConnectionError when TX/RX not found', async () => {
      const peripheral = createMockPeripheral({ characteristics: [] });
      setupImmediateDiscovery(peripheral);

      await expect(
        adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']),
      ).rejects.toBeInstanceOf(BluetoothConnectionError);
    });

    test('should call cleanup on connection failure', async () => {
      const peripheral = createMockPeripheral({ characteristics: [] });
      setupImmediateDiscovery(peripheral);

      const cleanupSpy = vi.spyOn(adapter, 'cleanup');

      try {
        await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);
      } catch {
        // expected
      }

      expect(cleanupSpy).toHaveBeenCalled();
    });

    test('callbacks registered before a failed connect still fire after a successful retry', async () => {
      const dataCallback = vi.fn();
      const disconnectCallback = vi.fn();
      const availabilityCallback = vi.fn();
      adapter.onCharacteristicValueChanged(dataCallback);
      adapter.onDisconnect(disconnectCallback);
      adapter.onBluetoothAvailabilityChanged(availabilityCallback);

      // First connect attempt fails (e.g. scan timeout). The adapter's error-path
      // cleanup() must not wipe the callbacks registered above.
      vi.spyOn(
        adapter as unknown as { scanForDevice: (...args: unknown[]) => Promise<unknown> },
        'scanForDevice',
      ).mockRejectedValueOnce(new BluetoothTimeoutError('Device scan timeout after 10000ms'));

      await expect(
        adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']),
      ).rejects.toBeInstanceOf(BluetoothTimeoutError);

      // Second connect attempt succeeds.
      const { rxChar, all } = createStandardCharacteristics();
      const peripheral = createMockPeripheral({ characteristics: all });
      setupImmediateDiscovery(peripheral);

      await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);

      // The callbacks registered before the failed attempt must still be wired.
      rxChar._emit('data', Buffer.from([0x01, 0x02]));
      expect(dataCallback).toHaveBeenCalled();

      peripheral._emit('disconnect');
      expect(disconnectCallback).toHaveBeenCalled();

      mockNoble._emit('stateChange', 'poweredOff');
      expect(availabilityCallback).toHaveBeenCalledWith(false);
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
      rightDevice.discoverAllServicesAndCharacteristicsAsync.mockResolvedValue({
        characteristics: all,
      });

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
      const { rxChar, all } = createStandardCharacteristics();
      const callback = vi.fn();
      adapter.onCharacteristicValueChanged(callback);

      const peripheral = createMockPeripheral({ characteristics: all });
      setupImmediateDiscovery(peripheral);

      await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);

      const dataHandler = rxChar.on.mock.calls.find((call) => call[0] === 'data')?.[1];
      expect(dataHandler).toBeDefined();

      const testBuffer = Buffer.from([0xaa, 0xbb, 0xcc]);
      dataHandler!(testBuffer);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(Array.from(callback.mock.calls[0][0])).toEqual([0xaa, 0xbb, 0xcc]);
    });
  });

  describe('onDisconnect', () => {
    test('should invoke callback on peripheral disconnect event', async () => {
      const { all } = createStandardCharacteristics();
      const callback = vi.fn();
      adapter.onDisconnect(callback);

      const peripheral = createMockPeripheral({ characteristics: all });
      setupImmediateDiscovery(peripheral);

      await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);

      const disconnectHandler = peripheral.once.mock.calls.find(
        (call) => call[0] === 'disconnect',
      )?.[1];
      expect(disconnectHandler).toBeDefined();
      disconnectHandler!();

      expect(callback).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('onBluetoothAvailabilityChanged', () => {
    test('should relay noble stateChange events', async () => {
      const callback = vi.fn();
      adapter.onBluetoothAvailabilityChanged(callback);

      const { all } = createStandardCharacteristics();
      const peripheral = createMockPeripheral({ characteristics: all });
      setupImmediateDiscovery(peripheral);

      await adapter.connect('ReturnToDarkTower', ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']);

      const stateHandler = mockNoble.on.mock.calls.find((call) => call[0] === 'stateChange')?.[1];
      expect(stateHandler).toBeDefined();

      stateHandler!('poweredOff');
      expect(callback).toHaveBeenCalledWith(false);

      stateHandler!('poweredOn');
      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe('readDeviceInformation', () => {
    test('should read text DIS characteristics', async () => {
      const mfrChar = createMockCharacteristic('00002a29-0000-1000-8000-00805f9b34fb', {
        readable: Buffer.from('Restoration Games'),
      });

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
      const sysIdChar = createMockCharacteristic('00002a23-0000-1000-8000-00805f9b34fb', {
        readable: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
      });

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
      const callback = vi.fn();
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
