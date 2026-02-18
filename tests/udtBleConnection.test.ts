/**
 * Tests for UdtBleConnection — the platform-agnostic BLE connection layer.
 *
 * Uses MockBluetoothAdapter to test connection lifecycle, health monitoring,
 * data processing, and event forwarding without real Bluetooth hardware.
 */

import { UdtBleConnection, type TowerEventCallbacks } from '../src/udtBleConnection';
import { Logger } from '../src/udtLogger';
import { MockBluetoothAdapter } from './mocks/MockBluetoothAdapter';

// --- Helpers ---

function createMockCallbacks(): TowerEventCallbacks {
  return {
    onTowerConnect: jest.fn(),
    onTowerDisconnect: jest.fn(),
    onBatteryLevelNotify: jest.fn(),
    onCalibrationComplete: jest.fn(),
    onSkullDrop: jest.fn(),
    onTowerResponse: jest.fn(),
  };
}

function createMockLogger(): Logger {
  const logger = new Logger();
  // Suppress actual output during tests by clearing the outputs array
  (logger as any)['outputs'] = [];
  return logger;
}

/**
 * Creates a battery response packet.
 * Command value 7 = BATTERY_READING.
 * Millivolts are encoded in bytes [3] and [4] (little-endian uint16).
 */
function createBatteryResponse(millivolts: number): Uint8Array {
  const data = new Uint8Array(20);
  data[0] = 7; // BATTERY_READING command value
  // getMilliVoltsFromTowerResponse reads: mv[0]=command[4] (low), mv[1]=command[3] (high)
  data[4] = millivolts & 0xFF;         // low byte
  data[3] = (millivolts >> 8) & 0xFF;  // high byte
  return data;
}

/**
 * Creates a tower state response packet (command value 0).
 */
function createTowerStateResponse(skullDropCount: number = 0): Uint8Array {
  const data = new Uint8Array(20);
  data[0] = 0; // TOWER_STATE command value
  data[17] = skullDropCount; // SKULL_DROP_COUNT_POS
  return data;
}

describe('UdtBleConnection', () => {
  let connection: UdtBleConnection;
  let mockAdapter: MockBluetoothAdapter;
  let callbacks: TowerEventCallbacks;
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = new MockBluetoothAdapter();
    callbacks = createMockCallbacks();
    logger = createMockLogger();
    connection = new UdtBleConnection(logger, callbacks, mockAdapter);
  });

  afterEach(() => {
    jest.useRealTimers();
    try {
      connection['stopConnectionMonitoring']();
    } catch {
      // ignore
    }
  });

  describe('connect', () => {
    test('should connect via adapter and set connected state', async () => {
      await connection.connect();

      expect(mockAdapter.connectCalls).toBe(1);
      expect(connection.isConnected).toBe(true);
      expect(callbacks.onTowerConnect).toHaveBeenCalled();
    });

    test('should handle connection failure gracefully', async () => {
      mockAdapter.connectShouldFail = true;

      await connection.connect();

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
      expect(callbacks.onTowerConnect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    test('should disconnect and clear state', async () => {
      await connection.connect();
      await connection.disconnect();

      expect(mockAdapter.disconnectCalls).toBe(1);
      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });
  });

  describe('writeCommand', () => {
    test('should delegate to adapter writeCharacteristic', async () => {
      await connection.connect();
      const data = new Uint8Array([0x04, 0x00]);
      await connection.writeCommand(data);

      expect(mockAdapter.writeCalls).toBe(1);
      expect(mockAdapter.lastWrittenData).toEqual(data);
    });
  });

  describe('Battery heartbeat processing', () => {
    test('should call onBatteryLevelNotify callback', async () => {
      await connection.connect();

      mockAdapter.simulateResponse(createBatteryResponse(1350));

      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledWith(1350);
    });

    test('should respect battery notification frequency', async () => {
      jest.useFakeTimers();
      await connection.connect();

      mockAdapter.simulateResponse(createBatteryResponse(1350));
      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledTimes(1);

      mockAdapter.simulateResponse(createBatteryResponse(1350));
      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(connection.batteryNotifyFrequency + 100);
      mockAdapter.simulateResponse(createBatteryResponse(1350));
      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tower state response processing', () => {
    test('should detect calibration complete on tower state response during calibration', async () => {
      await connection.connect();
      connection.performingCalibration = true;
      connection.performingLongCommand = true;

      mockAdapter.simulateResponse(createTowerStateResponse(0));

      expect(connection.performingCalibration).toBe(false);
      expect(connection.performingLongCommand).toBe(false);
      expect(callbacks.onCalibrationComplete).toHaveBeenCalled();
    });

    test('should detect skull drop count changes', async () => {
      await connection.connect();

      mockAdapter.simulateResponse(createTowerStateResponse(1));
      expect(callbacks.onSkullDrop).toHaveBeenCalledWith(1);
      expect(connection.towerSkullDropCount).toBe(1);

      (callbacks.onSkullDrop as jest.Mock).mockClear();
      mockAdapter.simulateResponse(createTowerStateResponse(1));
      expect(callbacks.onSkullDrop).not.toHaveBeenCalled();

      mockAdapter.simulateResponse(createTowerStateResponse(2));
      expect(callbacks.onSkullDrop).toHaveBeenCalledWith(2);
    });

    test('should call onTowerResponse for non-battery responses', async () => {
      await connection.connect();

      mockAdapter.simulateResponse(createTowerStateResponse(0));

      expect(callbacks.onTowerResponse).toHaveBeenCalled();
    });
  });

  describe('Disconnect detection', () => {
    test('should handle adapter disconnect event', async () => {
      await connection.connect();

      mockAdapter.simulateDisconnect();

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });

    test('should handle Bluetooth availability loss', async () => {
      await connection.connect();

      mockAdapter.simulateAvailabilityChange(false);

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });
  });

  describe('Connection health monitoring', () => {
    test('should detect GATT disconnection via health check', async () => {
      jest.useFakeTimers();
      await connection.connect();

      mockAdapter.isConnectedValue = false;

      jest.advanceTimersByTime(connection.connectionMonitorFrequency + 100);

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });

    test('should detect battery heartbeat timeout', async () => {
      jest.useFakeTimers();
      connection.batteryHeartbeatVerifyConnection = false;
      await connection.connect();

      jest.advanceTimersByTime(connection.batteryHeartbeatTimeout + connection.connectionMonitorFrequency + 100);

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });

    test('should reset heartbeat timer when GATT still connected and verify enabled', async () => {
      jest.useFakeTimers();
      connection.batteryHeartbeatVerifyConnection = true;
      await connection.connect();

      const heartbeatBefore = connection.lastBatteryHeartbeat;

      jest.advanceTimersByTime(connection.batteryHeartbeatTimeout + connection.connectionMonitorFrequency + 100);

      expect(connection.isConnected).toBe(true);
      expect(connection.lastBatteryHeartbeat).toBeGreaterThan(heartbeatBefore);
    });

    test('should use longer timeout during long commands', async () => {
      jest.useFakeTimers();
      connection.batteryHeartbeatVerifyConnection = false;
      await connection.connect();
      connection.performingLongCommand = true;

      jest.advanceTimersByTime(connection.batteryHeartbeatTimeout + connection.connectionMonitorFrequency + 100);

      expect(connection.isConnected).toBe(true);
    });

    test('should detect general command timeout', async () => {
      jest.useFakeTimers();
      connection.enableBatteryHeartbeatMonitoring = false;
      await connection.connect();

      jest.advanceTimersByTime(connection.connectionTimeoutThreshold + connection.connectionMonitorFrequency + 100);

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });
  });

  describe('isConnectedAndResponsive', () => {
    test('should return false when connected but GATT is down', async () => {
      await connection.connect();
      mockAdapter.isConnectedValue = false;
      const result = await connection.isConnectedAndResponsive();
      expect(result).toBe(false);
    });
  });

  describe('getDeviceInformation', () => {
    test('should populate device info after connect', async () => {
      mockAdapter.mockDeviceInfo = {
        manufacturerName: 'Test',
        modelNumber: 'Model1',
      };

      await connection.connect();
      const info = connection.getDeviceInformation();
      expect(info.manufacturerName).toBe('Test');
      expect(info.modelNumber).toBe('Model1');
    });

    test('should clear device info on disconnect', async () => {
      mockAdapter.mockDeviceInfo = { manufacturerName: 'Test' };
      await connection.connect();

      await connection.disconnect();
      const info = connection.getDeviceInformation();
      expect(info).toEqual({});
    });
  });

  describe('cleanup', () => {
    test('should stop monitoring and disconnect', async () => {
      await connection.connect();
      await connection.cleanup();

      expect(connection.isConnected).toBe(false);
      expect(connection['connectionMonitorInterval']).toBeNull();
    });
  });
});
