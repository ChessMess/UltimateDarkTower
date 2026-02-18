"use strict";
/**
 * Tests for WebBluetoothAdapter
 *
 * Mocks navigator.bluetooth and the full GATT chain (device → server → service → characteristic)
 * since Jest runs in Node.js without Web Bluetooth APIs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const WebBluetoothAdapter_1 = require("../../src/adapters/WebBluetoothAdapter");
const udtBluetoothAdapter_1 = require("../../src/udtBluetoothAdapter");
const udtConstants_1 = require("../../src/udtConstants");
// --- Mock Factories ---
function createMockCharacteristic(uuid, options = {}) {
    var _a;
    const listeners = {};
    return {
        uuid,
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((event, handler) => {
            if (!listeners[event])
                listeners[event] = [];
            listeners[event].push(handler);
        }),
        removeEventListener: jest.fn(),
        writeValue: jest.fn().mockResolvedValue(undefined),
        readValue: jest.fn().mockResolvedValue((_a = options.readValue) !== null && _a !== void 0 ? _a : new DataView(new ArrayBuffer(0))),
        _listeners: listeners,
        _fireEvent: (event, data) => {
            (listeners[event] || []).forEach(fn => fn(data));
        },
    };
}
function createMockService(characteristics) {
    return {
        getCharacteristic: jest.fn((uuid) => {
            const char = characteristics[uuid];
            if (!char)
                return Promise.reject(new Error(`Characteristic ${uuid} not found`));
            return Promise.resolve(char);
        }),
    };
}
function createMockDevice(options = {}) {
    var _a;
    const deviceListeners = {};
    const server = {
        connected: (_a = options.gattConnected) !== null && _a !== void 0 ? _a : true,
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        getPrimaryService: jest.fn((uuid) => {
            var _a;
            const svc = (_a = options.services) === null || _a === void 0 ? void 0 : _a[uuid];
            if (!svc)
                return Promise.reject(new Error(`Service ${uuid} not found`));
            return Promise.resolve(svc);
        }),
    };
    // Make server.connect return the server itself
    server.connect.mockResolvedValue(server);
    const device = {
        gatt: server,
        addEventListener: jest.fn((event, handler) => {
            if (!deviceListeners[event])
                deviceListeners[event] = [];
            deviceListeners[event].push(handler);
        }),
        removeEventListener: jest.fn(),
        _listeners: deviceListeners,
        _fireEvent: (event, data) => {
            (deviceListeners[event] || []).forEach(fn => fn(data));
        },
    };
    return device;
}
function setupMockNavigatorBluetooth(device) {
    const btListeners = {};
    const bluetooth = {
        requestDevice: jest.fn().mockResolvedValue(device),
        addEventListener: jest.fn((event, handler) => {
            if (!btListeners[event])
                btListeners[event] = [];
            btListeners[event].push(handler);
        }),
        removeEventListener: jest.fn(),
        _listeners: btListeners,
        _fireEvent: (event, data) => {
            (btListeners[event] || []).forEach(fn => fn(data));
        },
    };
    global.navigator = { bluetooth };
    return bluetooth;
}
function createFullMockSetup() {
    const txChar = createMockCharacteristic(udtConstants_1.UART_TX_CHARACTERISTIC_UUID);
    const rxChar = createMockCharacteristic(udtConstants_1.UART_RX_CHARACTERISTIC_UUID);
    const uartService = createMockService({
        [udtConstants_1.UART_TX_CHARACTERISTIC_UUID]: txChar,
        [udtConstants_1.UART_RX_CHARACTERISTIC_UUID]: rxChar,
    });
    const device = createMockDevice({
        gattConnected: true,
        services: {
            [udtConstants_1.UART_SERVICE_UUID]: uartService,
        },
    });
    const bluetooth = setupMockNavigatorBluetooth(device);
    return { txChar, rxChar, uartService, device, bluetooth };
}
describe('WebBluetoothAdapter', () => {
    let adapter;
    const originalNavigator = global.navigator;
    beforeEach(() => {
        adapter = new WebBluetoothAdapter_1.WebBluetoothAdapter();
    });
    afterEach(() => {
        if (originalNavigator === undefined) {
            delete global.navigator;
        }
        else {
            global.navigator = originalNavigator;
        }
    });
    describe('connect', () => {
        test('should connect successfully through full GATT chain', async () => {
            const { device, bluetooth, rxChar } = createFullMockSetup();
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID]);
            expect(bluetooth.requestDevice).toHaveBeenCalledWith({
                filters: [{ namePrefix: 'ReturnToDarkTower' }],
                optionalServices: [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID],
            });
            expect(device.gatt.connect).toHaveBeenCalled();
            expect(device.gatt.getPrimaryService).toHaveBeenCalledWith(udtConstants_1.UART_SERVICE_UUID);
            expect(rxChar.startNotifications).toHaveBeenCalled();
            expect(rxChar.addEventListener).toHaveBeenCalledWith('characteristicvaluechanged', expect.any(Function));
            expect(device.addEventListener).toHaveBeenCalledWith('gattserverdisconnected', expect.any(Function));
            expect(bluetooth.addEventListener).toHaveBeenCalledWith('availabilitychanged', expect.any(Function));
        });
        test('should throw BluetoothDeviceNotFoundError when requestDevice returns null', async () => {
            setupMockNavigatorBluetooth(null);
            global.navigator.bluetooth.requestDevice.mockResolvedValue(null);
            await expect(adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]))
                .rejects.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothDeviceNotFoundError);
        });
        test('should throw BluetoothUserCancelledError when user cancels dialog', async () => {
            const bluetooth = setupMockNavigatorBluetooth(null);
            bluetooth.requestDevice.mockRejectedValue(new Error('User cancelled the requestDevice() chooser.'));
            await expect(adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]))
                .rejects.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothUserCancelledError);
        });
        test('should throw BluetoothDeviceNotFoundError for NotFoundError name', async () => {
            const bluetooth = setupMockNavigatorBluetooth(null);
            const err = new Error('some error');
            err.name = 'NotFoundError';
            bluetooth.requestDevice.mockRejectedValue(err);
            await expect(adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]))
                .rejects.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothDeviceNotFoundError);
        });
        test('should re-throw our own error types without wrapping', async () => {
            const bluetooth = setupMockNavigatorBluetooth(null);
            const original = new udtBluetoothAdapter_1.BluetoothConnectionError('already our error');
            bluetooth.requestDevice.mockRejectedValue(original);
            await expect(adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]))
                .rejects.toBe(original);
        });
    });
    describe('disconnect', () => {
        test('should disconnect and clear state', async () => {
            const { device } = createFullMockSetup();
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]);
            await adapter.disconnect();
            expect(device.gatt.disconnect).toHaveBeenCalled();
            expect(device.removeEventListener).toHaveBeenCalledWith('gattserverdisconnected', expect.any(Function));
            expect(adapter.isConnected()).toBe(false);
            expect(adapter.isGattConnected()).toBe(false);
        });
    });
    describe('writeCharacteristic', () => {
        test('should write data to TX characteristic', async () => {
            const { txChar } = createFullMockSetup();
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]);
            const data = new Uint8Array([0x01, 0x02, 0x03]);
            await adapter.writeCharacteristic(data);
            expect(txChar.writeValue).toHaveBeenCalledWith(data);
        });
    });
    describe('onCharacteristicValueChanged', () => {
        test('should invoke callback when RX data arrives', async () => {
            var _a;
            const { rxChar } = createFullMockSetup();
            const callback = jest.fn();
            adapter.onCharacteristicValueChanged(callback);
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]);
            const mockValue = {
                byteLength: 3,
                getUint8: (i) => [0xAA, 0xBB, 0xCC][i],
            };
            const mockEvent = { target: { value: mockValue } };
            const handler = (_a = rxChar.addEventListener.mock.calls.find((call) => call[0] === 'characteristicvaluechanged')) === null || _a === void 0 ? void 0 : _a[1];
            expect(handler).toBeDefined();
            handler(mockEvent);
            expect(callback).toHaveBeenCalledWith(new Uint8Array([0xAA, 0xBB, 0xCC]));
        });
    });
    describe('onDisconnect', () => {
        test('should invoke callback on gattserverdisconnected event', async () => {
            var _a;
            const { device } = createFullMockSetup();
            const callback = jest.fn();
            adapter.onDisconnect(callback);
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]);
            const handler = (_a = device.addEventListener.mock.calls.find((call) => call[0] === 'gattserverdisconnected')) === null || _a === void 0 ? void 0 : _a[1];
            expect(handler).toBeDefined();
            handler();
            expect(callback).toHaveBeenCalled();
        });
    });
    describe('onBluetoothAvailabilityChanged', () => {
        test('should invoke callback on availabilitychanged event', async () => {
            var _a;
            const { bluetooth } = createFullMockSetup();
            const callback = jest.fn();
            adapter.onBluetoothAvailabilityChanged(callback);
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]);
            const handler = (_a = bluetooth.addEventListener.mock.calls.find((call) => call[0] === 'availabilitychanged')) === null || _a === void 0 ? void 0 : _a[1];
            expect(handler).toBeDefined();
            handler({ value: false });
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
                getCharacteristic: jest.fn((uuid) => {
                    if (uuid === '00002a29-0000-1000-8000-00805f9b34fb') {
                        return Promise.resolve(manufacturerChar);
                    }
                    return Promise.reject(new Error('not found'));
                }),
            };
            const device = createMockDevice({
                gattConnected: true,
                services: {
                    [udtConstants_1.UART_SERVICE_UUID]: createMockService({
                        [udtConstants_1.UART_TX_CHARACTERISTIC_UUID]: createMockCharacteristic(udtConstants_1.UART_TX_CHARACTERISTIC_UUID),
                        [udtConstants_1.UART_RX_CHARACTERISTIC_UUID]: createMockCharacteristic(udtConstants_1.UART_RX_CHARACTERISTIC_UUID),
                    }),
                    [udtConstants_1.DIS_SERVICE_UUID]: disService,
                },
            });
            setupMockNavigatorBluetooth(device);
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID]);
            const info = await adapter.readDeviceInformation();
            expect(info.manufacturerName).toBe('TestManufacturer');
            expect(info.lastUpdated).toBeInstanceOf(Date);
        });
        test('should read binary characteristics as hex', async () => {
            const binaryData = new Uint8Array([0x01, 0x02, 0xFF]);
            const binaryChar = createMockCharacteristic('sys', {
                readValue: new DataView(binaryData.buffer),
            });
            const disService = {
                getCharacteristic: jest.fn((uuid) => {
                    if (uuid === '00002a23-0000-1000-8000-00805f9b34fb') {
                        return Promise.resolve(binaryChar);
                    }
                    return Promise.reject(new Error('not found'));
                }),
            };
            const device = createMockDevice({
                gattConnected: true,
                services: {
                    [udtConstants_1.UART_SERVICE_UUID]: createMockService({
                        [udtConstants_1.UART_TX_CHARACTERISTIC_UUID]: createMockCharacteristic(udtConstants_1.UART_TX_CHARACTERISTIC_UUID),
                        [udtConstants_1.UART_RX_CHARACTERISTIC_UUID]: createMockCharacteristic(udtConstants_1.UART_RX_CHARACTERISTIC_UUID),
                    }),
                    [udtConstants_1.DIS_SERVICE_UUID]: disService,
                },
            });
            setupMockNavigatorBluetooth(device);
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID, udtConstants_1.DIS_SERVICE_UUID]);
            const info = await adapter.readDeviceInformation();
            expect(info.systemId).toBe('01:02:ff');
        });
    });
    describe('cleanup', () => {
        test('should remove all event listeners and disconnect', async () => {
            const { device, bluetooth } = createFullMockSetup();
            await adapter.connect('ReturnToDarkTower', [udtConstants_1.UART_SERVICE_UUID]);
            await adapter.cleanup();
            expect(bluetooth.removeEventListener).toHaveBeenCalledWith('availabilitychanged', expect.any(Function));
            expect(device.removeEventListener).toHaveBeenCalledWith('gattserverdisconnected', expect.any(Function));
            expect(adapter.isConnected()).toBe(false);
        });
    });
});
//# sourceMappingURL=WebBluetoothAdapter.test.js.map