import {
  TOWER_DEVICE_NAME,
  UART_SERVICE_UUID,
  SKULL_DROP_COUNT_POS,
  DIS_SERVICE_UUID,
  TOWER_STATE_DATA_OFFSET,
  TOWER_STATE_RESPONSE_MIN_LENGTH,
} from './udtConstants';
import { Logger } from './udtLogger';
import { TowerResponseProcessor } from './udtTowerResponse';
import {
  getMilliVoltsFromTowerResponse,
  milliVoltsToPercentage,
  milliVoltsToPercentageNumber,
} from './udtHelpers';
import { rtdt_unpack_state, type TowerState } from './udtTowerState';
import { type IBluetoothAdapter } from './udtBluetoothAdapter';
import { BluetoothAdapterFactory, BluetoothPlatform } from './udtBluetoothAdapterFactory';
import type { UdtDiagnosticsRecorder, DisconnectCause, IncidentReport } from './udtDiagnostics';

export interface TowerEventCallbacks {
  onTowerConnect: () => void;
  onTowerDisconnect: () => void;
  onBatteryLevelNotify: (millivolts: number) => void;
  onCalibrationComplete: () => void;
  onSkullDrop: (towerSkullCount: number) => void;
  onTowerResponse?: (response: Uint8Array) => void; // Optional callback for command queue response detection with response data
}

export interface DeviceInformation {
  manufacturerName?: string;
  modelNumber?: string;
  serialNumber?: string;
  hardwareRevision?: string;
  firmwareRevision?: string;
  softwareRevision?: string;
  systemId?: string;
  ieeeRegulatory?: string;
  pnpId?: string;
  lastUpdated?: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isGattConnected: boolean;
  lastBatteryHeartbeatMs: number;
  lastCommandResponseMs: number;
  batteryHeartbeatHealthy: boolean;
  connectionMonitoringEnabled: boolean;
  batteryHeartbeatMonitoringEnabled: boolean;
  batteryHeartbeatTimeoutMs: number;
  batteryHeartbeatVerifyConnection: boolean;
  connectionTimeoutMs: number;
}

export class UdtBleConnection {
  private logger: Logger;
  private callbacks: TowerEventCallbacks;
  private responseProcessor: TowerResponseProcessor;
  private recorder: UdtDiagnosticsRecorder | null = null;

  // Snapshot providers wired by UltimateDarkTower so the recorder can capture
  // higher-level state (command queue, tower state, broken seals) at the
  // moment a disconnect cause fires.
  private snapshotProviders: {
    commandQueue: () => {
      queueLength: number;
      isProcessing: boolean;
      currentCommand: { id: string; description?: string; timestamp: number } | null;
    };
    towerState: () => unknown;
    brokenSeals: () => string[];
  } | null = null;

  // Bluetooth adapter (platform-agnostic).
  // Null until an adapter is provided or lazily created on first connect() —
  // construction never triggers platform detection, so creating an
  // UltimateDarkTower in a non-Bluetooth environment (e.g. iOS Safari) does
  // not throw. The detection error, if any, surfaces at connect() time.
  private bluetoothAdapter: IBluetoothAdapter | null = null;

  // Connection state
  isConnected: boolean = false;
  isDisposed: boolean = false;
  performingCalibration: boolean = false;
  performingLongCommand: boolean = false;

  // Connection monitoring
  private connectionMonitorInterval: ReturnType<typeof setInterval> | null = null;
  connectionMonitorFrequency: number = 2 * 1000;
  lastSuccessfulCommand: number = 0;
  connectionTimeoutThreshold: number = 30 * 1000;
  enableConnectionMonitoring: boolean = true;

  // Battery heartbeat monitoring
  lastBatteryHeartbeat: number = 0;
  batteryHeartbeatTimeout: number = 3 * 1000;
  longTowerCommandTimeout: number = 30 * 1000;
  enableBatteryHeartbeatMonitoring: boolean = true;
  batteryHeartbeatVerifyConnection: boolean = true; // When true, verifies connection before triggering disconnection on heartbeat timeout

  // Tower state
  towerSkullDropCount: number = -1;
  lastBatteryLog: number = 0;
  lastBatteryPercentage: string = '';
  batteryLogFrequency: number = 15 * 1000;
  batteryLogOnChangeOnly = false;
  batteryLogEnabled = true;

  // Device information
  private deviceInformation: DeviceInformation = {};

  // Logging configuration
  logTowerResponses = true;
  logTowerResponseConfig = {
    TOWER_STATE: true,
    INVALID_STATE: true,
    HARDWARE_FAILURE: true,
    MECH_JIGGLE_TRIGGERED: true,
    MECH_UNEXPECTED_TRIGGER: true,
    MECH_DURATION: true,
    DIFFERENTIAL_READINGS: false,
    BATTERY_READING: true,
    CALIBRATION_FINISHED: true,
    LOG_ALL: false,
  };

  constructor(
    logger: Logger,
    callbacks: TowerEventCallbacks,
    adapter?: IBluetoothAdapter,
    recorder?: UdtDiagnosticsRecorder,
  ) {
    this.logger = logger;
    this.callbacks = callbacks;
    this.responseProcessor = new TowerResponseProcessor();
    this.recorder = recorder ?? null;

    // If an explicit adapter was provided, wire it up now. Otherwise defer
    // platform detection/creation until connect() so construction never
    // throws in environments without Bluetooth.
    if (adapter) {
      this.bluetoothAdapter = adapter;
      this.wireAdapterCallbacks(adapter);
    }
  }

  /**
   * Wires this connection's internal handlers onto a Bluetooth adapter.
   * Called when an adapter is supplied at construction, or when one is
   * lazily created on first connect().
   */
  private wireAdapterCallbacks(adapter: IBluetoothAdapter): void {
    adapter.onCharacteristicValueChanged((data: Uint8Array) => {
      this.onRxData(data);
    });

    adapter.onDisconnect(() => {
      this.onTowerDeviceDisconnected();
    });

    adapter.onBluetoothAvailabilityChanged((available: boolean) => {
      this.bleAvailabilityChange(available);
    });
  }

  /**
   * Returns the Bluetooth adapter, lazily creating one via platform
   * auto-detection on first use. Platform-detection errors (e.g. no Web
   * Bluetooth on iOS) surface here, at connect time, rather than at
   * construction.
   */
  private ensureAdapter(): IBluetoothAdapter {
    if (!this.bluetoothAdapter) {
      const adapter = BluetoothAdapterFactory.create(BluetoothPlatform.AUTO);
      this.bluetoothAdapter = adapter;
      this.wireAdapterCallbacks(adapter);
    }
    return this.bluetoothAdapter;
  }

  setDiagnosticsSnapshotProviders(providers: {
    commandQueue: () => {
      queueLength: number;
      isProcessing: boolean;
      currentCommand: { id: string; description?: string; timestamp: number } | null;
    };
    towerState: () => unknown;
    brokenSeals: () => string[];
  }): void {
    this.snapshotProviders = providers;
  }

  /**
   * Record a disconnect incident with the recorder. Public so higher layers
   * (e.g. UltimateDarkTower's beforeunload handler) can synthesize causes
   * like 'page_unload' that aren't tied to a specific BLE detection path.
   */
  recordIncidentPublic(cause: DisconnectCause): IncidentReport | null {
    return this.recordIncident(cause);
  }

  private recordIncident(cause: DisconnectCause): IncidentReport | null {
    if (!this.recorder || !this.recorder.enabled) return null;
    const queueSnapshot = this.snapshotProviders?.commandQueue() ?? {
      queueLength: 0,
      isProcessing: false,
      currentCommand: null,
    };
    const towerState = (this.snapshotProviders?.towerState() ?? null) as TowerState | null;
    const brokenSeals = this.snapshotProviders?.brokenSeals() ?? [];
    return this.recorder.recordIncident({
      cause,
      connectionStatus: this.getConnectionStatus(),
      deviceInformation: this.getDeviceInformation(),
      commandQueue: queueSnapshot,
      towerState,
      brokenSeals,
    });
  }

  async connect() {
    if (this.isDisposed) {
      throw new Error('UdtBleConnection instance has been disposed and cannot reconnect');
    }
    this.logger.info('Looking for Tower...', '[UDT]');
    try {
      const adapter = this.ensureAdapter();
      await adapter.connect(TOWER_DEVICE_NAME, [UART_SERVICE_UUID, DIS_SERVICE_UUID]);

      this.logger.info('Tower connection complete', '[UDT][BLE]');
      this.isConnected = true;
      this.lastSuccessfulCommand = Date.now();
      this.lastBatteryHeartbeat = Date.now();
      this.recorder?.beginSession();

      // Read device information after successful connection
      await this.readDeviceInformation();

      if (this.enableConnectionMonitoring) {
        this.startConnectionMonitoring();
      }

      this.callbacks.onTowerConnect();
    } catch (error) {
      this.logger.error(`Tower Connection Error: ${error}`, '[UDT][BLE]');
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    this.stopConnectionMonitoring();

    if (!this.isConnected) {
      return;
    }

    this.recordIncident('user_initiated');

    const adapter = this.bluetoothAdapter;
    if (adapter?.isConnected()) {
      await adapter.disconnect();
      this.logger.info('Tower disconnected', '[UDT]');
    }

    this.handleDisconnection();
  }

  /**
   * Writes a command to the tower via the Bluetooth adapter.
   * Used by UdtTowerCommands instead of direct characteristic access.
   */
  async writeCommand(command: Uint8Array): Promise<void> {
    const adapter = this.bluetoothAdapter;
    if (!adapter) {
      throw new Error('Cannot write command: not connected (no Bluetooth adapter)');
    }
    this.recorder?.recordCommandPayload('cmd_sent', command, { len: command.length });
    return await adapter.writeCharacteristic(command);
  }

  /**
   * Processes received data from the RX characteristic (platform-agnostic).
   * Called by the adapter's onCharacteristicValueChanged callback.
   */
  private onRxData(receivedData: Uint8Array) {
    this.lastSuccessfulCommand = Date.now();

    const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
    const isBattery = this.responseProcessor.isBatteryResponse(cmdKey);

    if (this.recorder?.enabled && !isBattery) {
      this.recorder.recordCommandPayload('cmd_response', receivedData, {
        cmdKey,
        len: receivedData.length,
      });
    }

    const shouldLogCommand =
      this.logTowerResponses &&
      this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) &&
      !isBattery;

    if (shouldLogCommand) {
      this.logger.info(`${cmdKey}`, '[UDT][BLE][RCVD]');
    }

    if (this.logTowerResponses) {
      this.logTowerResponse(receivedData);
    }

    if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
      this.handleTowerStateResponse(receivedData);
    }

    if (isBattery) {
      this.lastBatteryHeartbeat = Date.now();

      const millivolts = getMilliVoltsFromTowerResponse(receivedData);
      const batteryPercentage = milliVoltsToPercentage(millivolts);
      this.recorder?.recordBattery(millivolts, milliVoltsToPercentageNumber(millivolts));
      const didBatteryLevelChange =
        this.lastBatteryPercentage !== '' && this.lastBatteryPercentage !== batteryPercentage;
      const batteryLogFrequencyPassed =
        Date.now() - this.lastBatteryLog >= this.batteryLogFrequency;

      const shouldLog =
        this.batteryLogEnabled &&
        (this.batteryLogOnChangeOnly
          ? didBatteryLevelChange || this.lastBatteryPercentage === ''
          : batteryLogFrequencyPassed);

      if (shouldLog) {
        this.logger.info(
          `${this.responseProcessor.commandToString(receivedData).join(' ')}`,
          '[UDT][BLE]',
        );
        this.lastBatteryLog = Date.now();
        this.lastBatteryPercentage = batteryPercentage;
      }

      // Always notify so internal state and UI stay current
      this.callbacks.onBatteryLevelNotify(millivolts);
    } else {
      // For non-battery responses, notify the command queue
      // This includes tower state responses, command acknowledgments, etc.
      if (this.callbacks.onTowerResponse) {
        this.callbacks.onTowerResponse(receivedData);
      }
    }
  }

  private handleTowerStateResponse(receivedData: Uint8Array) {
    const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];
    // Strip the 1-byte command prefix before unpacking, matching the real
    // state path (UltimateDarkTower.updateTowerStateFromResponse). Unpacking
    // the raw packet here would be off by one and log misaligned drum/LED
    // values. Debug log only — does not affect behaviour.
    const state = rtdt_unpack_state(
      receivedData.slice(TOWER_STATE_DATA_OFFSET, TOWER_STATE_RESPONSE_MIN_LENGTH),
    );
    this.logger.debug(`Tower State: ${JSON.stringify(state)} `, '[UDT][BLE]');

    this.recorder?.recordEvent('tower_state_response');

    if (this.performingCalibration) {
      this.performingCalibration = false;
      this.performingLongCommand = false;
      this.lastBatteryHeartbeat = Date.now();
      this.callbacks.onCalibrationComplete();
      this.logger.info('Tower calibration complete', '[UDT]');
      this.recorder?.recordEvent('calibration_complete');
    }

    if (dataSkullDropCount !== this.towerSkullDropCount) {
      if (dataSkullDropCount) {
        this.callbacks.onSkullDrop(dataSkullDropCount);
        this.logger.info(
          `Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`,
          '[UDT]',
        );
        this.recorder?.recordEvent('skull_drop', { count: dataSkullDropCount });
      } else {
        this.logger.info(`Skull count reset to ${dataSkullDropCount}`, '[UDT]');
      }
      this.towerSkullDropCount = dataSkullDropCount;
    }
  }

  private logTowerResponse(receivedData: Uint8Array) {
    const { cmdKey, command } = this.responseProcessor.getTowerCommand(receivedData[0]);

    if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
      return;
    }

    if (this.responseProcessor.isBatteryResponse(cmdKey)) {
      return; // logged elsewhere
    }

    const logMessage = `${this.responseProcessor.commandToString(receivedData).join(' ')}`;

    if (command.critical) {
      this.logger.error(logMessage, '[UDT][BLE]');
    } else {
      this.logger.info(logMessage, '[UDT][BLE]');
    }
  }

  private bleAvailabilityChange(available: boolean) {
    this.logger.info('Bluetooth availability changed', '[UDT][BLE]');

    if (!available && this.isConnected) {
      this.logger.warn('Bluetooth became unavailable - handling disconnection', '[UDT][BLE]');
      this.recordIncident('bt_unavailable');
      this.handleDisconnection();
    }
  }

  private onTowerDeviceDisconnected() {
    this.logger.warn('Tower device disconnected unexpectedly', '[UDT][BLE]');
    if (this.isConnected) {
      this.recordIncident('adapter_event');
    }
    this.handleDisconnection();
  }

  private handleDisconnection() {
    this.isConnected = false;
    this.performingCalibration = false;
    this.performingLongCommand = false;
    this.stopConnectionMonitoring();

    this.lastBatteryHeartbeat = 0;
    this.lastSuccessfulCommand = 0;

    // Clear device information on disconnect
    this.deviceInformation = {};

    this.callbacks.onTowerDisconnect();
  }

  private startConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.connectionMonitorFrequency);
  }

  private stopConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }

  private checkConnectionHealth() {
    if (!this.isConnected) {
      return;
    }

    if (!(this.bluetoothAdapter?.isGattConnected() ?? false)) {
      this.logger.warn('GATT connection lost detected during health check', '[UDT][BLE]');
      this.recordIncident('gatt_health_check');
      this.handleDisconnection();
      return;
    }

    if (this.enableBatteryHeartbeatMonitoring) {
      const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
      const timeoutThreshold = this.performingLongCommand
        ? this.longTowerCommandTimeout
        : this.batteryHeartbeatTimeout;

      if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
        const operationContext = this.performingLongCommand ? ' during long command operation' : '';
        this.logger.warn(
          `Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`,
          '[UDT][BLE]',
        );

        if (this.performingLongCommand) {
          this.logger.info(
            'Ignoring battery heartbeat timeout during long command - this is expected behavior',
            '[UDT][BLE]',
          );
          return;
        }

        // Before assuming disconnection, verify if the tower is actually still responsive
        if (this.batteryHeartbeatVerifyConnection) {
          this.logger.info(
            'Verifying tower connection status before triggering disconnection...',
            '[UDT][BLE]',
          );

          // Check if GATT is still connected via the adapter
          if (this.bluetoothAdapter?.isGattConnected() ?? false) {
            this.logger.info(
              'GATT connection still available - heartbeat timeout may be temporary',
              '[UDT][BLE]',
            );

            // Near-miss: the heartbeat went late but the GATT is still up. This is a
            // strong signal worth recording for diagnostics — repeated near-misses
            // before a real drop are the smoking gun.
            this.recorder?.recordEvent('heartbeat_late', {
              sinceMs: timeSinceLastBatteryHeartbeat,
              threshold: timeoutThreshold,
            });
            // Reset the last battery heartbeat to current time to give it another chance
            this.lastBatteryHeartbeat = Date.now();
            this.logger.info(
              'Reset battery heartbeat timer - will monitor for another timeout period',
              '[UDT][BLE]',
            );
            return;
          }
        }

        this.logger.warn(
          'Tower possibly disconnected due to battery depletion or power loss',
          '[UDT][BLE]',
        );
        this.recordIncident('heartbeat_timeout');
        this.handleDisconnection();
        return;
      }
    }

    const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
    if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
      this.logger.warn('General connection timeout detected - no responses received', '[UDT][BLE]');
      this.recordIncident('response_timeout');
      this.handleDisconnection();
    }
  }

  setConnectionMonitoring(enabled: boolean) {
    this.enableConnectionMonitoring = enabled;
    if (enabled && this.isConnected) {
      this.startConnectionMonitoring();
    } else {
      this.stopConnectionMonitoring();
    }
  }

  configureConnectionMonitoring(frequency: number = 2000, timeout: number = 30000) {
    this.connectionMonitorFrequency = frequency;
    this.connectionTimeoutThreshold = timeout;

    if (this.enableConnectionMonitoring && this.isConnected) {
      this.startConnectionMonitoring();
    }
  }

  configureBatteryHeartbeatMonitoring(
    enabled: boolean = true,
    timeout: number = 3000,
    verifyConnection: boolean = true,
  ) {
    this.enableBatteryHeartbeatMonitoring = enabled;
    this.batteryHeartbeatTimeout = timeout;
    this.batteryHeartbeatVerifyConnection = verifyConnection;
  }

  async isConnectedAndResponsive(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    return this.bluetoothAdapter?.isGattConnected() ?? false;
  }

  getConnectionStatus(): ConnectionStatus {
    const now = Date.now();
    const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
    const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;

    return {
      isConnected: this.isConnected,
      isGattConnected: this.bluetoothAdapter?.isGattConnected() ?? false,
      lastBatteryHeartbeatMs: timeSinceLastBattery,
      lastCommandResponseMs: timeSinceLastCommand,
      batteryHeartbeatHealthy:
        timeSinceLastBattery >= 0 && timeSinceLastBattery < this.batteryHeartbeatTimeout,
      connectionMonitoringEnabled: this.enableConnectionMonitoring,
      batteryHeartbeatMonitoringEnabled: this.enableBatteryHeartbeatMonitoring,
      batteryHeartbeatTimeoutMs: this.batteryHeartbeatTimeout,
      batteryHeartbeatVerifyConnection: this.batteryHeartbeatVerifyConnection,
      connectionTimeoutMs: this.connectionTimeoutThreshold,
    };
  }

  getDeviceInformation(): DeviceInformation {
    return { ...this.deviceInformation };
  }

  private async readDeviceInformation() {
    const adapter = this.bluetoothAdapter;
    if (!adapter) return;
    try {
      this.logger.info('Reading device information service...', '[UDT][BLE]');
      this.deviceInformation = await adapter.readDeviceInformation();

      // Log device information
      for (const [key, value] of Object.entries(this.deviceInformation)) {
        if (key !== 'lastUpdated' && value) {
          this.logger.info(`Device ${key}: ${value}`, '[UDT][BLE]');
        }
      }
    } catch {
      this.logger.debug('Device Information Service not available', '[UDT][BLE]');
    }
  }

  async cleanup() {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.logger.info('Cleaning up UdtBleConnection instance', '[UDT][BLE]');

    this.stopConnectionMonitoring();

    if (this.isConnected) {
      await this.disconnect();
    }

    await this.bluetoothAdapter?.cleanup();
  }
}
