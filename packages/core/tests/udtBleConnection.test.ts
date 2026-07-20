/**
 * Tests for UdtBleConnection — the platform-agnostic BLE connection layer.
 *
 * Uses MockBluetoothAdapter to test connection lifecycle, health monitoring,
 * data processing, and event forwarding without real Bluetooth hardware.
 */

import type { Mock } from 'vitest';
import { UdtBleConnection, type TowerEventCallbacks } from '../src/udtBleConnection';
import { Logger } from '../src/udtLogger';
import { MockBluetoothAdapter } from './mocks/MockBluetoothAdapter';

// --- Helpers ---

function createMockCallbacks(): TowerEventCallbacks {
  return {
    onTowerConnect: vi.fn(),
    onTowerDisconnect: vi.fn(),
    onBatteryLevelNotify: vi.fn(),
    onCalibrationComplete: vi.fn(),
    onSkullDrop: vi.fn(),
    onTowerResponse: vi.fn(),
  };
}

function createMockLogger(): Logger {
  const logger = new Logger();
  // Suppress actual output during tests by clearing the outputs array
  logger.clearOutputs();
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
  data[4] = millivolts & 0xff; // low byte
  data[3] = (millivolts >> 8) & 0xff; // high byte
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
    vi.clearAllMocks();
    mockAdapter = new MockBluetoothAdapter();
    callbacks = createMockCallbacks();
    logger = createMockLogger();
    connection = new UdtBleConnection(logger, callbacks, mockAdapter);
  });

  afterEach(() => {
    vi.useRealTimers();
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

      await expect(connection.connect()).rejects.toThrow('Mock connection failed');

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerConnect).not.toHaveBeenCalled();
      expect(callbacks.onTowerDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('deferred adapter (no adapter provided)', () => {
    test('should construct without an adapter and without throwing', () => {
      expect(() => new UdtBleConnection(logger, callbacks)).not.toThrow();
    });

    test('getConnectionStatus reports not connected before connect', () => {
      const deferred = new UdtBleConnection(logger, callbacks);
      const status = deferred.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.isGattConnected).toBe(false);
    });

    test('writeCommand throws a clear error when never connected', async () => {
      const deferred = new UdtBleConnection(logger, callbacks);
      await expect(deferred.writeCommand(new Uint8Array([0x00]))).rejects.toThrow(/not connected/i);
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

    test('should always call onBatteryLevelNotify regardless of notification frequency', async () => {
      vi.useFakeTimers();
      await connection.connect();

      mockAdapter.simulateResponse(createBatteryResponse(1350));
      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledTimes(1);

      mockAdapter.simulateResponse(createBatteryResponse(1350));
      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(connection.batteryLogFrequency + 100);
      mockAdapter.simulateResponse(createBatteryResponse(1350));
      expect(callbacks.onBatteryLevelNotify).toHaveBeenCalledTimes(3);
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

      (callbacks.onSkullDrop as Mock).mockClear();
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
      vi.useFakeTimers();
      await connection.connect();

      mockAdapter.isConnectedValue = false;

      vi.advanceTimersByTime(connection.connectionMonitorFrequency + 100);

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });

    test('should detect battery heartbeat timeout', async () => {
      vi.useFakeTimers();
      connection.batteryHeartbeatVerifyConnection = false;
      await connection.connect();

      vi.advanceTimersByTime(
        connection.batteryHeartbeatTimeout + connection.connectionMonitorFrequency + 100,
      );

      expect(connection.isConnected).toBe(false);
      expect(callbacks.onTowerDisconnect).toHaveBeenCalled();
    });

    test('should reset heartbeat timer when GATT still connected and verify enabled', async () => {
      vi.useFakeTimers();
      connection.batteryHeartbeatVerifyConnection = true;
      await connection.connect();

      const heartbeatBefore = connection.lastBatteryHeartbeat;

      vi.advanceTimersByTime(
        connection.batteryHeartbeatTimeout + connection.connectionMonitorFrequency + 100,
      );

      expect(connection.isConnected).toBe(true);
      expect(connection.lastBatteryHeartbeat).toBeGreaterThan(heartbeatBefore);
    });

    test('should use longer timeout during long commands', async () => {
      vi.useFakeTimers();
      connection.batteryHeartbeatVerifyConnection = false;
      await connection.connect();
      connection.performingLongCommand = true;

      vi.advanceTimersByTime(
        connection.batteryHeartbeatTimeout + connection.connectionMonitorFrequency + 100,
      );

      expect(connection.isConnected).toBe(true);
    });

    test('should detect general command timeout', async () => {
      vi.useFakeTimers();
      connection.enableBatteryHeartbeatMonitoring = false;
      await connection.connect();

      vi.advanceTimersByTime(
        connection.connectionTimeoutThreshold + connection.connectionMonitorFrequency + 100,
      );

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

    test('should set isDisposed to true', async () => {
      expect(connection.isDisposed).toBe(false);
      await connection.cleanup();
      expect(connection.isDisposed).toBe(true);
    });

    test('should be idempotent — calling twice is a no-op', async () => {
      await connection.connect();
      await connection.cleanup();
      // Second call should not throw and adapter cleanup should only run once
      const cleanupSpy = vi.spyOn(mockAdapter, 'cleanup');
      await connection.cleanup();
      expect(cleanupSpy).not.toHaveBeenCalled();
    });

    test('should prevent reconnection after disposal', async () => {
      await connection.cleanup();
      await expect(connection.connect()).rejects.toThrow(
        'UdtBleConnection instance has been disposed and cannot reconnect',
      );
    });
  });
});
