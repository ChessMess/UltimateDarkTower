import {
  type Lights,
  type TowerSide,
  type RotateCommand,
  VOLTAGE_LEVELS
} from './constants';
import { Logger, ConsoleOutput, type LogOutput } from './Logger';
import { UdtBleConnection, type ConnectionCallbacks, type ConnectionStatus } from './udtBleConnection';
import { TowerResponseProcessor } from './udtTowerResponse';
import { UdtCommandFactory } from './udtCommandFactory';
import { UdtTowerCommands, type TowerCommandDependencies } from './udtTowerCommands';

/**
 * @title UltimateDarkTower
 * @description
 * The UltimateDarkTower class is the main control interface for the Return To Dark Tower board game device.
 * It provides a comprehensive API for interacting with the tower through Bluetooth Low Energy (BLE).
 * 
 * Key Features:
 * - Bluetooth connection management with automatic monitoring and reconnection
 * - Tower calibration and drum position tracking
 * - Audio playback from the tower's built-in sound library
 * - LED light control (doorway, ledge, and base lights)
 * - Drum rotation commands with precise positioning
 * - Multi-command support for synchronized operations
 * - Seal breaking animations and effects
 * - Battery level monitoring with customizable notifications
 * - Comprehensive logging system with multiple output options
 * - Connection heartbeat monitoring for reliable disconnect detection
 * 
  * Known Issues:
 *    Tower command complete response is not being considered. Async Await is working
 *    only on the fact that a command was sent, which is pretty much immediate, so we need
 *    to rework this a bit to take into account when a command is complete. This is all
 *    part of work still to be done.
 * 
 * Usage:
 * 1. Create instance: const tower = new UltimateDarkTower()
 * 2. Connect to tower: await tower.connect()
 * 3. Calibrate tower: await tower.calibrate()
 * 4. Use tower commands: await tower.playSound(1), await tower.Lights({...}), etc.
 * 5. Clean up: await tower.cleanup()
 * 
 * Event Callbacks:
 * - onTowerConnect: Called when tower connects
 * - onTowerDisconnect: Called when tower disconnects
 * - onCalibrationComplete: Called when calibration finishes
 * - onSkullDrop: Called when skulls are dropped from the tower
 * - onBatteryLevelNotify: Called when battery level updates
 */

class UltimateDarkTower {
  // logging
  private logger: Logger;

  // connection management
  private bleConnection: UdtBleConnection;

  // response processing
  private responseProcessor: TowerResponseProcessor;

  // command creation
  private commandFactory: UdtCommandFactory;

  // tower commands
  private towerCommands: UdtTowerCommands;

  // tower configuration
  private retrySendCommandCountRef = { value: 0 };
  retrySendCommandMax: number = 5;

  // tower state
  currentDrumPositions = { topMiddle: 0x10, bottom: 0x42 };
  currentBatteryValue: number = 0;
  previousBatteryValue: number = 0;
  currentBatteryPercentage: number = 0;
  previousBatteryPercentage: number = 0;

  // call back functions
  // you overwrite these with your own functions 
  // to handle these events in your app
  onCalibrationComplete = () => { };
  onSkullDrop = (_towerSkullCount: number) => { };
  onBatteryLevelNotify = (_millivolts: number) => { };
  onTowerConnect = () => { };
  onTowerDisconnect = () => { };

  constructor() {
    // Initialize logger with console output by default
    this.logger = new Logger();
    this.logger.addOutput(new ConsoleOutput());

    // Initialize BLE connection with callback handlers
    const callbacks: ConnectionCallbacks = {
      onTowerConnect: () => this.onTowerConnect(),
      onTowerDisconnect: () => {
        this.onTowerDisconnect();
        // Clear the command queue on disconnection to prevent hanging commands
        if (this.towerCommands) {
          this.towerCommands.clearQueue();
        }
      },
      onBatteryLevelNotify: (millivolts: number) => {
        this.previousBatteryValue = this.currentBatteryValue;
        this.currentBatteryValue = millivolts;
        this.previousBatteryPercentage = this.currentBatteryPercentage;
        this.currentBatteryPercentage = this.milliVoltsToPercentageNumber(millivolts);
        this.onBatteryLevelNotify(millivolts);
      },
      onCalibrationComplete: () => this.onCalibrationComplete(),
      onSkullDrop: (towerSkullCount: number) => this.onSkullDrop(towerSkullCount)
    };
    this.bleConnection = new UdtBleConnection(this.logger, callbacks);

    // Initialize response processor
    this.responseProcessor = new TowerResponseProcessor(this.logDetail);

    // Initialize command factory
    this.commandFactory = new UdtCommandFactory();

    // Initialize tower commands with dependencies
    const commandDependencies: TowerCommandDependencies = {
      logger: this.logger,
      commandFactory: this.commandFactory,
      bleConnection: this.bleConnection,
      responseProcessor: this.responseProcessor,
      currentDrumPositions: this.currentDrumPositions,
      logDetail: this.logDetail,
      retrySendCommandCount: this.retrySendCommandCountRef,
      retrySendCommandMax: this.retrySendCommandMax
    };
    this.towerCommands = new UdtTowerCommands(commandDependencies);
    
    // Set up command queue response callback now that tower commands are initialized
    callbacks.onTowerResponse = () => this.towerCommands.onTowerResponse();
  }

  // utility
  private _logDetail = false;

  get logDetail(): boolean { return this._logDetail; }
  set logDetail(value: boolean) {
    this._logDetail = value;
    this.responseProcessor.setDetailedLogging(value);
    // Update dependencies if towerCommands is already initialized
    if (this.towerCommands) {
      const commandDependencies: TowerCommandDependencies = {
        logger: this.logger,
        commandFactory: this.commandFactory,
        bleConnection: this.bleConnection,
        responseProcessor: this.responseProcessor,
        currentDrumPositions: this.currentDrumPositions,
        logDetail: this.logDetail,
        retrySendCommandCount: this.retrySendCommandCountRef,
        retrySendCommandMax: this.retrySendCommandMax
      };
      this.towerCommands = new UdtTowerCommands(commandDependencies);
    }
  }

  // Getter methods for connection state
  get isConnected(): boolean { return this.bleConnection.isConnected; }
  get isCalibrated(): boolean { return this.bleConnection.isCalibrated; }
  get performingCalibration(): boolean { return this.bleConnection.performingCalibration; }
  get performingLongCommand(): boolean { return this.bleConnection.performingLongCommand; }
  get towerSkullDropCount(): number { return this.bleConnection.towerSkullDropCount; }
  get txCharacteristic() { return this.bleConnection.txCharacteristic; }

  // Getter methods for battery state
  get currentBattery(): number { return this.currentBatteryValue; }
  get previousBattery(): number { return this.previousBatteryValue; }
  get currentBatteryPercent(): number { return this.currentBatteryPercentage; }
  get previousBatteryPercent(): number { return this.previousBatteryPercentage; }

  // Getter/setter methods for connection configuration
  get batteryNotifyFrequency(): number { return this.bleConnection.batteryNotifyFrequency; }
  set batteryNotifyFrequency(value: number) { this.bleConnection.batteryNotifyFrequency = value; }

  get batteryNotifyOnValueChangeOnly(): boolean { return this.bleConnection.batteryNotifyOnValueChangeOnly; }
  set batteryNotifyOnValueChangeOnly(value: boolean) { this.bleConnection.batteryNotifyOnValueChangeOnly = value; }

  get logTowerResponses(): boolean { return this.bleConnection.logTowerResponses; }
  set logTowerResponses(value: boolean) { this.bleConnection.logTowerResponses = value; }

  get logTowerResponseConfig(): any { return this.bleConnection.logTowerResponseConfig; }
  set logTowerResponseConfig(value: any) { this.bleConnection.logTowerResponseConfig = value; }

  //#region Tower Commands 
  /**
   * Initiates tower calibration to determine the current position of all tower drums.
   * This must be performed after connection before other tower operations.
   * @returns {Promise<void>} Promise that resolves when calibration command is sent
   */
  async calibrate() {
    return await this.towerCommands.calibrate();
  }


  /**
   * Plays a sound from the tower's audio library.
   * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
   * @returns Promise that resolves when sound command is sent
   */
  async playSound(soundIndex: number) {
    return await this.towerCommands.playSound(soundIndex);
  }

  /**
   * Controls the tower's LED lights including doorway, ledge, and base lights.
   * @param lights - Light configuration object specifying which lights to control and their effects
   * @returns Promise that resolves when light command is sent
   */
  async Lights(lights: Lights) {
    return await this.towerCommands.lights(lights);
  }

  /**
   * Sends a light override command to control specific light patterns.
   * @param light - Light override value to send
   * @param soundIndex - Optional sound to play with the light override
   * @returns Promise that resolves when light override command is sent
   */
  async lightOverrides(light: number, soundIndex?: number) {
    return await this.towerCommands.lightOverrides(light, soundIndex);
  }

  /**
   * Rotates tower drums to specified positions.
   * @param top - Position for the top drum ('north', 'east', 'south', 'west')
   * @param middle - Position for the middle drum
   * @param bottom - Position for the bottom drum
   * @param soundIndex - Optional sound to play during rotation
   * @returns Promise that resolves when rotate command is sent
   */
  async Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number) {
    return await this.towerCommands.rotate(top, middle, bottom, soundIndex);
  }

  /**
   * DO NOT USE THIS FUNCTION - MULTIPLE SIMULTANEOUS ACTIONS CAN CAUSE TOWER DISCONNECTION
   * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
   * @param rotate - Rotation configuration for tower drums
   * @param lights - Light configuration object
   * @param soundIndex - Optional sound to play with the multi-command
   * @returns Promise that resolves when multi-command is sent
   * @deprecated SPECIAL USE ONLY - CAN CAUSE DISCONNECTS
   */
  async MultiCommand(rotate?: RotateCommand, lights?: Lights, soundIndex?: number) {
    return await this.towerCommands.multiCommand(rotate, lights, soundIndex);
  }

  /**
   * Resets the tower's internal skull drop counter to zero.
   * @returns Promise that resolves when reset command is sent
   */
  async resetTowerSkullCount() {
    return await this.towerCommands.resetTowerSkullCount();
  }

  //#endregion

  /**
   * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
   * @param seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
   * @returns Promise that resolves when seal break sequence is complete
   */
  async breakSeal(seal: Array<number> | number) {
    return await this.towerCommands.breakSeal(seal);
  }

  /**
   * Randomly rotates specified tower levels to random positions.
   * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
   * @returns Promise that resolves when rotation command is sent
   */
  async randomRotateLevels(level: number = 0) {
    return await this.towerCommands.randomRotateLevels(level);
  }

  /**
   * Gets the current position of a specific drum level.
   * @param level - The drum level to get position for
   * @returns The current position of the specified drum level
   */
  getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide {
    return this.towerCommands.getCurrentDrumPosition(level);
  }

  //#region bluetooth

  /**
   * Establishes a Bluetooth connection to the Dark Tower device.
   * Initializes GATT services, characteristics, and starts connection monitoring.
   * @returns {Promise<void>} Promise that resolves when connection is established
   */
  async connect() {
    await this.bleConnection.connect();
  }

  /**
   * Disconnects from the tower device and cleans up resources.
   * @returns {Promise<void>} Promise that resolves when disconnection is complete
   */
  async disconnect() {
    await this.bleConnection.disconnect();
  }

  //#endregion

  //#region utility

  /**
   * Configure logger outputs for this UltimateDarkTower instance
   * @param {LogOutput[]} outputs - Array of log outputs to use (e.g., ConsoleOutput, DOMOutput)
   */
  setLoggerOutputs(outputs: LogOutput[]) {
    // Clear existing outputs and add new ones to maintain logger instance references
    (this.logger as any).outputs = [];
    outputs.forEach(output => this.logger.addOutput(output));
  }

  /**
   * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
   * @param {Uint8Array} command - The command packet to send to the tower
   * @returns {Promise<void>} Promise that resolves when command is sent successfully
   */
  async sendTowerCommand(command: Uint8Array) {
    return await this.towerCommands.sendTowerCommand(command);
  }

  /**
   * Converts a command packet to a hex string representation for debugging.
   * @param {Uint8Array} command - Command packet to convert
   * @returns {string} Hex string representation of the command packet
   */
  commandToPacketString(command: Uint8Array): string {
    return this.responseProcessor.commandToPacketString(command);
  }

  /**
   * Converts battery voltage in millivolts to percentage.
   * @param {number} mv - Battery voltage in millivolts
   * @returns {string} Battery percentage as formatted string (e.g., "75%")
   */
  milliVoltsToPercentage(mv: number): string {
    return this.responseProcessor.milliVoltsToPercentage(mv);
  }

  //#endregion

  //#region Connection Management

  /**
   * Enable or disable connection monitoring
   * @param {boolean} enabled - Whether to enable connection monitoring
   */
  setConnectionMonitoring(enabled: boolean) {
    this.bleConnection.setConnectionMonitoring(enabled);
  }

  /**
   * Configure connection monitoring parameters
   * @param {number} [frequency=2000] - How often to check connection (milliseconds)
   * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
   */
  configureConnectionMonitoring(frequency: number = 2000, timeout: number = 30000) {
    this.bleConnection.configureConnectionMonitoring(frequency, timeout);
  }

  /**
   * Configure battery heartbeat monitoring parameters
   * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
   * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
   * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
   * @param {boolean} [verifyConnection=true] - Whether to verify connection status before triggering disconnection on heartbeat timeout
   */
  configureBatteryHeartbeatMonitoring(enabled: boolean = true, timeout: number = 3000, verifyConnection: boolean = true) {
    this.bleConnection.configureBatteryHeartbeatMonitoring(enabled, timeout, verifyConnection);
  }

  /**
   * Check if the tower is currently connected
   * @returns {Promise<boolean>} True if connected and responsive
   */
  async isConnectedAndResponsive(): Promise<boolean> {
    return await this.bleConnection.isConnectedAndResponsive();
  }

  /**
   * Get detailed connection status including heartbeat information
   * @returns {Object} Object with connection details
   */
  getConnectionStatus(): ConnectionStatus {
    return this.bleConnection.getConnectionStatus();
  }
  //#endregion

  /**
   * Converts millivolts to percentage number (0-100).
   * @param mv - Battery voltage in millivolts
   * @returns Battery percentage as number (0-100)
   */
  private milliVoltsToPercentageNumber(mv: number): number {
    const batLevel = mv ? mv / 3 : 0; // lookup is based on single AA
    const levels = VOLTAGE_LEVELS.filter(v => batLevel >= v);
    return levels.length * 5;
  }

  //#region cleanup

  /**
   * Clean up resources and disconnect properly
   * @returns {Promise<void>} Promise that resolves when cleanup is complete
   */
  async cleanup() {
    this.logger.info('Cleaning up UltimateDarkTower instance', '[UDT]');
    // Clear any pending commands in the queue
    this.towerCommands.clearQueue();
    await this.bleConnection.cleanup();
  }

  //#endregion
}

export default UltimateDarkTower;
