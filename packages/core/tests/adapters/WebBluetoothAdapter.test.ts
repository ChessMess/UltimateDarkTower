/**
 * Tests for WebBluetoothAdapter
 *
 * Mocks navigator.bluetooth and the full GATT chain (device → server → service → characteristic)
 * since Jest runs in Node.js without Web Bluetooth APIs.
 */

import { WebBluetoothAdapter } from '../../src/adapters/WebBluetoothAdapter';
import {
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothUserCancelledError,
} from '../../src/udtBluetoothAdapter';
import {
  UART_SERVICE_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  UART_RX_CHARACTERISTIC_UUID,
  DIS_SERVICE_UUID,
} from '../../src/udtConstants';

// GATT/bluetooth event handlers are invoked as `handler(event)`.
type Listener = (...args: unknown[]) => void;

// --- Mock Factories ---

function createMockCharacteristic(
  uuid: string,
  options: { readValue?: DataView; binary?: boolean } = {},
) {
  const listeners: Record<string, Listener[]> = {};
  return {
    uuid,
    startNotifications: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn((event: string, handler: Listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    writeValue: vi.fn().mockResolvedValue(undefined),
    readValue: vi.fn().mockResolvedValue(options.readValue ?? new DataView(new ArrayBuffer(0))),
    _listeners: listeners,
    _fireEvent: (event: string, data: unknown) => {
      (listeners[event] || []).forEach((fn) => fn(data));
    },
  };
}

function createMockService(
  characteristics: Record<string, ReturnType<typeof createMockCharacteristic>>,
) {
  return {
    getCharacteristic: vi.fn((uuid: string) => {
      const char = characteristics[uuid];
      if (!char) return Promise.reject(new Error(`Characteristic ${uuid} not found`));
      return Promise.resolve(char);
    }),
  };
}

function createMockDevice(
  options: {
    gattConnected?: boolean;
    services?: Record<string, ReturnType<typeof createMockService>>;
  } = {},
) {
  const deviceListeners: Record<string, Listener[]> = {};
  const server = {
    connected: options.gattConnected ?? true,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    getPrimaryService: vi.fn((uuid: string) => {
      const svc = options.services?.[uuid];
      if (!svc) return Promise.reject(new Error(`Service ${uuid} not found`));
      return Promise.resolve(svc);
    }),
  };
  // Make server.connect return the server itself
  server.connect.mockResolvedValue(server);

  const device = {
    gatt: server,
    addEventListener: vi.fn((event: string, handler: Listener) => {
      if (!deviceListeners[event]) deviceListeners[event] = [];
      deviceListeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    _listeners: deviceListeners,
    _fireEvent: (event: string, data?: unknown) => {
      (deviceListeners[event] || []).forEach((fn) => fn(data));
    },
  };

  return device;
}

function setupMockNavigatorBluetooth(device: ReturnType<typeof createMockDevice> | null) {
  const btListeners: Record<string, Listener[]> = {};
  const bluetooth = {
    requestDevice: vi.fn().mockResolvedValue(device),
    addEventListener: vi.fn((event: string, handler: Listener) => {
      if (!btListeners[event]) btListeners[event] = [];
      btListeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    _listeners: btListeners,
    _fireEvent: (event: string, data?: unknown) => {
      (btListeners[event] || []).forEach((fn) => fn(data));
    },
  };

  // Node 21+ defines a real `navigator` global as an accessor with no setter, so a
  // plain assignment throws "Cannot set property navigator ... which has only a
  // getter". (Jest's node environment replaced the global object wholesale, which
  // is why this used to work.) vi.stubGlobal goes through defineProperty and is
  // undone by vi.unstubAllGlobals in afterEach.
  vi.stubGlobal('navigator', { bluetooth });

  return bluetooth;
}

function createFullMockSetup() {
  const txChar = createMockCharacteristic(UART_TX_CHARACTERISTIC_UUID);
  const rxChar = createMockCharacteristic(UART_RX_CHARACTERISTIC_UUID);

  const uartService = createMockService({
    [UART_TX_CHARACTERISTIC_UUID]: txChar,
    [UART_RX_CHARACTERISTIC_UUID]: rxChar,
  });

  const device = createMockDevice({
    gattConnected: true,
    services: {
      [UART_SERVICE_UUID]: uartService,
    },
  });

  const bluetooth = setupMockNavigatorBluetooth(device);

  return { txChar, rxChar, uartService, device, bluetooth };
}

type MockNavigatorBluetooth = ReturnType<typeof setupMockNavigatorBluetooth>;
type WebTestGlobal = { navigator?: { bluetooth: MockNavigatorBluetooth } };

describe('WebBluetoothAdapter', () => {
  let adapter: WebBluetoothAdapter;

  beforeEach(() => {
    adapter = new WebBluetoothAdapter();
  });

  afterEach(() => {
    // Restores whatever `navigator` was before the stub — including restoring the
    // real Node global, which the previous save/reassign dance could not do.
    vi.unstubAllGlobals();
  });

  describe('connect', () => {
    test('should connect successfully through full GATT chain', async () => {
      const { device, bluetooth, rxChar } = createFullMockSetup();

      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID, DIS_SERVICE_UUID]);

      expect(bluetooth.requestDevice).toHaveBeenCalledWith({
        filters: [{ namePrefix: 'ReturnToDarkTower' }],
        optionalServices: [UART_SERVICE_UUID, DIS_SERVICE_UUID],
      });
      expect(device.gatt.connect).toHaveBeenCalled();
      expect(device.gatt.getPrimaryService).toHaveBeenCalledWith(UART_SERVICE_UUID);
      expect(rxChar.startNotifications).toHaveBeenCalled();
      expect(rxChar.addEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function),
      );
      expect(device.addEventListener).toHaveBeenCalledWith(
        'gattserverdisconnected',
        expect.any(Function),
      );
      expect(bluetooth.addEventListener).toHaveBeenCalledWith(
        'availabilitychanged',
        expect.any(Function),
      );
    });

    test('should throw BluetoothDeviceNotFoundError when requestDevice returns null', async () => {
      setupMockNavigatorBluetooth(null);
      (global as unknown as WebTestGlobal).navigator!.bluetooth.requestDevice.mockResolvedValue(
        null,
      );

      await expect(
        adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]),
      ).rejects.toBeInstanceOf(BluetoothDeviceNotFoundError);
    });

    test('should throw BluetoothUserCancelledError when user cancels dialog', async () => {
      const bluetooth = setupMockNavigatorBluetooth(null);
      bluetooth.requestDevice.mockRejectedValue(
        new Error('User cancelled the requestDevice() chooser.'),
      );

      await expect(
        adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]),
      ).rejects.toBeInstanceOf(BluetoothUserCancelledError);
    });

    test('should throw BluetoothDeviceNotFoundError for NotFoundError name', async () => {
      const bluetooth = setupMockNavigatorBluetooth(null);
      const err = new Error('some error');
      err.name = 'NotFoundError';
      bluetooth.requestDevice.mockRejectedValue(err);

      await expect(
        adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]),
      ).rejects.toBeInstanceOf(BluetoothDeviceNotFoundError);
    });

    test('should re-throw our own error types without wrapping', async () => {
      const bluetooth = setupMockNavigatorBluetooth(null);
      const original = new BluetoothConnectionError('already our error');
      bluetooth.requestDevice.mockRejectedValue(original);

      await expect(adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID])).rejects.toBe(
        original,
      );
    });
  });

  describe('disconnect', () => {
    test('should disconnect and clear state', async () => {
      const { device } = createFullMockSetup();
      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]);

      await adapter.disconnect();

      expect(device.gatt.disconnect).toHaveBeenCalled();
      expect(device.removeEventListener).toHaveBeenCalledWith(
        'gattserverdisconnected',
        expect.any(Function),
      );
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.isGattConnected()).toBe(false);
    });
  });

  describe('writeCharacteristic', () => {
    test('should write data to TX characteristic', async () => {
      const { txChar } = createFullMockSetup();
      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]);

      const data = new Uint8Array([0x01, 0x02, 0x03]);
      await adapter.writeCharacteristic(data);

      expect(txChar.writeValue).toHaveBeenCalledWith(data);
    });
  });

  describe('onCharacteristicValueChanged', () => {
    test('should invoke callback when RX data arrives', async () => {
      const { rxChar } = createFullMockSetup();
      const callback = vi.fn();
      adapter.onCharacteristicValueChanged(callback);

      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]);

      const mockValue = {
        byteLength: 3,
        getUint8: (i: number) => [0xaa, 0xbb, 0xcc][i],
      };
      const mockEvent = { target: { value: mockValue } };

      const handler = rxChar.addEventListener.mock.calls.find(
        (call) => call[0] === 'characteristicvaluechanged',
      )?.[1];
      expect(handler).toBeDefined();
      handler!(mockEvent);

      expect(callback).toHaveBeenCalledWith(new Uint8Array([0xaa, 0xbb, 0xcc]));
    });
  });

  describe('onDisconnect', () => {
    test('should invoke callback on gattserverdisconnected event', async () => {
      const { device } = createFullMockSetup();
      const callback = vi.fn();
      adapter.onDisconnect(callback);

      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]);

      const handler = device.addEventListener.mock.calls.find(
        (call) => call[0] === 'gattserverdisconnected',
      )?.[1];
      expect(handler).toBeDefined();
      handler!();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('onBluetoothAvailabilityChanged', () => {
    test('should invoke callback on availabilitychanged event', async () => {
      const { bluetooth } = createFullMockSetup();
      const callback = vi.fn();
      adapter.onBluetoothAvailabilityChanged(callback);

      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]);

      const handler = bluetooth.addEventListener.mock.calls.find(
        (call) => call[0] === 'availabilitychanged',
      )?.[1];
      expect(handler).toBeDefined();
      handler!({ value: false });

      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe('readDeviceInformation', () => {
    test('should read text characteristics correctly', async () => {
      const encoder = new TextEncoder();

      const manufacturerChar = createMockCharacteristic('mfr', {
        readValue: new DataView(encoder.encode('TestManufacturer').buffer),
      });

      const disService = {
        getCharacteristic: vi.fn((uuid: string) => {
          if (uuid === '00002a29-0000-1000-8000-00805f9b34fb') {
            return Promise.resolve(manufacturerChar);
          }
          return Promise.reject(new Error('not found'));
        }),
      };

      const device = createMockDevice({
        gattConnected: true,
        services: {
          [UART_SERVICE_UUID]: createMockService({
            [UART_TX_CHARACTERISTIC_UUID]: createMockCharacteristic(UART_TX_CHARACTERISTIC_UUID),
            [UART_RX_CHARACTERISTIC_UUID]: createMockCharacteristic(UART_RX_CHARACTERISTIC_UUID),
          }),
          [DIS_SERVICE_UUID]: disService,
        },
      });

      setupMockNavigatorBluetooth(device);
      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID, DIS_SERVICE_UUID]);

      const info = await adapter.readDeviceInformation();
      expect(info.manufacturerName).toBe('TestManufacturer');
      expect(info.lastUpdated).toBeInstanceOf(Date);
    });

    test('should read binary characteristics as hex', async () => {
      const binaryData = new Uint8Array([0x01, 0x02, 0xff]);
      const binaryChar = createMockCharacteristic('sys', {
        readValue: new DataView(binaryData.buffer),
      });

      const disService = {
        getCharacteristic: vi.fn((uuid: string) => {
          if (uuid === '00002a23-0000-1000-8000-00805f9b34fb') {
            return Promise.resolve(binaryChar);
          }
          return Promise.reject(new Error('not found'));
        }),
      };

      const device = createMockDevice({
        gattConnected: true,
        services: {
          [UART_SERVICE_UUID]: createMockService({
            [UART_TX_CHARACTERISTIC_UUID]: createMockCharacteristic(UART_TX_CHARACTERISTIC_UUID),
            [UART_RX_CHARACTERISTIC_UUID]: createMockCharacteristic(UART_RX_CHARACTERISTIC_UUID),
          }),
          [DIS_SERVICE_UUID]: disService,
        },
      });

      setupMockNavigatorBluetooth(device);
      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID, DIS_SERVICE_UUID]);

      const info = await adapter.readDeviceInformation();
      expect(info.systemId).toBe('01:02:ff');
    });
  });

  describe('cleanup', () => {
    test('should remove all event listeners and disconnect', async () => {
      const { device, bluetooth } = createFullMockSetup();
      await adapter.connect('ReturnToDarkTower', [UART_SERVICE_UUID]);

      await adapter.cleanup();

      expect(bluetooth.removeEventListener).toHaveBeenCalledWith(
        'availabilitychanged',
        expect.any(Function),
      );
      expect(device.removeEventListener).toHaveBeenCalledWith(
        'gattserverdisconnected',
        expect.any(Function),
      );
      expect(adapter.isConnected()).toBe(false);
    });
  });
});
