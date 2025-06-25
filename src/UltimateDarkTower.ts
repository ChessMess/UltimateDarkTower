import {
  TOWER_COMMANDS,
  TOWER_AUDIO_LIBRARY,
  AUDIO_COMMAND_POS,
  SKULL_DROP_COUNT_POS,
  DRUM_PACKETS,
  LIGHT_PACKETS,
  DOORWAY_LIGHTS_TO_BIT_SHIFT,
  BASE_LEDGE_LIGHTS_TO_BIT_SHIFT,
  LIGHT_EFFECTS,
  TOWER_LIGHT_SEQUENCES,
  drumPositionCmds,
  TOWER_DEVICE_NAME,
  UART_SERVICE_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  UART_RX_CHARACTERISTIC_UUID,
  TC,
  TOWER_MESSAGES,
  VOLTAGE_LEVELS,
  type Lights,
  type TowerSide,
  type TowerLevels,
  type LedgeLight,
  type DoorwayLight,
  type RotateCommand,
  type CommandPacket
} from './constants';

/**
 * @title UltimateDarkTower
 * @notes
 * The UltimateDarkTower class represents a control interface for the Return To Dark Tower device.
 * It provides methods for calibrating the tower, playing sounds, controlling lights, 
 * rotating the tower, and more.
 * The class also handles the Bluetooth connection to the tower device.
 * 
 * Disconnect Detection Features:
 *    - Listens for GATT server disconnect events
 *    - Monitors connection health with configurable heartbeat checks
 *    - Uses battery status (sent every ~200ms) as primary heartbeat for disconnect detection
 *    - Detects timeouts when no responses are received
 *    - Handles Bluetooth availability changes
 *    - Provides callback notifications for all disconnect scenarios
 *    - Battery heartbeat monitoring is ideal for detecting power loss/battery depletion
 * 
 * Known Issues:
 *    Tower command complete response is not being considered. Async Await is working
 *    only on the fact that a command was sent, which is pretty much immediate, so we need
 *    to rework this a bit to take into account when a command is complete. This is all
 *    part of work still to be done.
 */

class UltimateDarkTower {
  // ble
  TowerDevice = null;
  txCharacteristic = null;
  rxCharacteristic = null;

  // tower configuration
  batteryNotifyFrequency: number = 15 * 1000; // App notification throttling (Tower sends every ~200ms)
  batteryNotifyOnValueChangeOnly = false; // overrides frequency setting if true
  retrySendCommandCount: number = 0;
  retrySendCommandMax: number = 5;

  // tower state
  currentDrumPositions = { topMiddle: 0x10, bottom: 0x42 };
  isCalibrated: boolean = false;
  isConnected: boolean = false;
  towerSkullDropCount: number = -1;
  performingCalibration: boolean = false;
  lastBatteryNotification: number = 0;
  lastBatteryPercentage: string;

  // disconnect detection
  connectionMonitorInterval: NodeJS.Timeout | null = null;
  connectionMonitorFrequency: number = 2 * 1000; // Check every 2 seconds (more frequent due to battery heartbeat)
  lastSuccessfulCommand: number = 0;
  connectionTimeoutThreshold: number = 30 * 1000; // 30 seconds without response
  enableConnectionMonitoring: boolean = true;

  // battery-based heartbeat detection
  lastBatteryHeartbeat: number = 0; // Last time we received a battery status
  batteryHeartbeatTimeout: number = 3 * 1000; // 3 seconds without battery = likely disconnected (normal is ~200ms)
  calibrationHeartbeatTimeout: number = 30 * 1000; // 30 seconds during calibration (calibration blocks battery responses)
  enableBatteryHeartbeatMonitoring: boolean = true;

  // call back functions
  // you overwrite these with your own functions 
  // to handle these events in your app
  onCalibrationComplete = () => { };
  onSkullDrop = (towerSkullCount: number) => { };
  onBatteryLevelNotify = (millivolts: number) => { };
  onTowerConnect = () => { };
  onTowerDisconnect = () => { };

  // utility
  logDetail = false;
  logTowerResponses = true;

  // allows you to log specific responses
  // [Differential Readings] & [Battery] are sent continously so
  // setting their defaults to false.
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
    LOG_ALL: false, // overrides individual
  }

  //#region Tower Commands 
  /**
   * Initiates tower calibration to determine the current position of all tower drums.
   * This must be performed after connection before other tower operations.
   * @returns {Promise<void>} Promise that resolves when calibration command is sent
   */
  async calibrate() {
    if (!this.performingCalibration) {
      console.log('[UDT] Performing Tower Calibration');
      await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]));

      // flag to look for calibration complete tower response
      this.performingCalibration = true;
      return;
    }

    console.log('[UDT] Tower calibration requested when tower is already performing calibration');
    return;
  }


  /**
   * Plays a sound from the tower's audio library.
   * @param {number} soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
   * @returns {Promise<void>} Promise that resolves when sound command is sent
   */
  async playSound(soundIndex: number) {
    const invalidIndex = soundIndex === null || soundIndex > (Object.keys(TOWER_AUDIO_LIBRARY).length) || soundIndex <= 0
    if (invalidIndex) {
      console.log('[UDT] attempt to play invalid sound index', soundIndex)
      return;
    }

    const soundCommand = this.createSoundCommand(soundIndex);
    this.updateCommandWithCurrentDrumPositions(soundCommand);

    console.log('[UDT] Sending sound command');
    await this.sendTowerCommand(soundCommand);
  }

  /**
   * Controls the tower's LED lights including doorway, ledge, and base lights.
   * @param {Lights} lights - Light configuration object specifying which lights to control and their effects
   * @returns {Promise<void>} Promise that resolves when light command is sent
   */
  async Lights(lights: Lights) {
    const lightCommand = this.createLightPacketCommand(lights);
    this.updateCommandWithCurrentDrumPositions(lightCommand);

    this.logDetail && console.log('[UDT] Light Parameter', lights);
    console.log('[UDT] Sending light command');
    await this.sendTowerCommand(lightCommand);
  }

  /**
   * Sends a light override command to control specific light patterns.
   * @param {number} light - Light override value to send
   * @param {number} [soundIndex] - Optional sound to play with the light override
   * @returns {Promise<void>} Promise that resolves when light override command is sent
   */
  async lightOverrides(light: number, soundIndex?: number) {
    const lightOverrideCommand = this.createLightOverrideCommand(light);
    this.updateCommandWithCurrentDrumPositions(lightOverrideCommand);
    if (soundIndex) {
      lightOverrideCommand[AUDIO_COMMAND_POS] = soundIndex;
    }

    console.log('[UDT] Sending light override' + (soundIndex ? ' with sound' : ''));
    await this.sendTowerCommand(lightOverrideCommand);
  }

  /**
   * Rotates tower drums to specified positions.
   * @param {TowerSide} top - Position for the top drum ('north', 'east', 'south', 'west')
   * @param {TowerSide} middle - Position for the middle drum
   * @param {TowerSide} bottom - Position for the bottom drum
   * @param {number} [soundIndex] - Optional sound to play during rotation
   * @returns {Promise<void>} Promise that resolves when rotate command is sent
   */
  async Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number) {
    this.logDetail && console.log(`[UDT] Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`);

    const rotateCommand = this.createRotateCommand(top, middle, bottom);

    if (soundIndex) {
      rotateCommand[AUDIO_COMMAND_POS] = soundIndex;
    }

    console.log('[UDT] Sending rotate command' + (soundIndex ? ' with sound' : ''));
    await this.sendTowerCommand(rotateCommand);

    // saving drum positions
    this.currentDrumPositions = {
      topMiddle: rotateCommand[DRUM_PACKETS.topMiddle],
      bottom: rotateCommand[DRUM_PACKETS.bottom]
    };
  }

  /**
   * Sends a combined command to rotate drums, control lights, and play sound simultaneously.
   * @param {RotateCommand} [rotate] - Rotation configuration for tower drums
   * @param {Lights} [lights] - Light configuration object
   * @param {number} [soundIndex] - Optional sound to play with the multi-command
   * @returns {Promise<void>} Promise that resolves when multi-command is sent
   */
  async MultiCommand(rotate?: RotateCommand, lights?: Lights, soundIndex?: number) {
    this.logDetail && console.log('[UDT] MultiCommand Parameters', rotate, lights, soundIndex);
    let multiCmd = new Uint8Array(20);
    const rotateCmd = this.createRotateCommand(rotate.top, rotate.middle, rotate.bottom);
    const lightCmd = this.createLightPacketCommand(lights);

    // combine commands into single command packet
    for (let index = 0; index < 20; index++) {
      multiCmd[index] = rotateCmd[index] | lightCmd[index];
    }

    // add sound
    if (soundIndex) {
      const soundCmd = this.createSoundCommand(soundIndex);
      multiCmd[AUDIO_COMMAND_POS] = multiCmd[AUDIO_COMMAND_POS] | soundCmd[AUDIO_COMMAND_POS];
    }

    this.sendTowerCommand(multiCmd);

    const packetMsg = this.commandToPacketString(multiCmd);
    console.log('[UDT] multiple command sent', packetMsg);
  }

  /**
   * Resets the tower's internal skull drop counter to zero.
   * @returns {Promise<void>} Promise that resolves when reset command is sent
   */
  async resetTowerSkullCount() {
    console.log('[UDT] Tower skull count reset requested');
    await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]));
  }

  //#endregion

  /**
   * Breaks one or more seals on the tower, playing appropriate sound and lighting effects.
   * @param {Array<number> | number} seal - Seal number(s) to break (1-12, where 1/5/8 are north positions)
   * @returns {Promise<void>} Promise that resolves when seal break sequence is complete
   */
  async breakSeal(seal: Array<number> | number) {
    // seals are numbered 1 - 12 with 1/5/8 representing north positions
    // Top: 1-4, Middle: 5-8, Bottom: 9-12

    const sealNumbers = Array.isArray(seal) ? seal : [seal];

    // Define seal to side mapping based on 1/5/8 being north positions
    const SEAL_TO_SIDE: { [key: number]: TowerSide } = {
      1: 'north', 2: 'east', 3: 'south', 4: 'west',    // Top level
      5: 'north', 6: 'east', 7: 'south', 8: 'west',    // Middle level  
      9: 'north', 10: 'east', 11: 'south', 12: 'west'  // Bottom level
    };

    const SEAL_TO_LEVEL: { [key: number]: TowerLevels } = {
      1: 'top', 2: 'top', 3: 'top', 4: 'top',
      5: 'middle', 6: 'middle', 7: 'middle', 8: 'middle',
      9: 'bottom', 10: 'bottom', 11: 'bottom', 12: 'bottom'
    };

    // Validate seal numbers
    for (const sealNum of sealNumbers) {
      if (sealNum < 1 || sealNum > 12) {
        console.log(`[UDT] Invalid seal number: ${sealNum}. Seals must be 1-12.`);
        return;
      }
    }

    // Play tower seal sound
    console.log('[UDT] Playing tower seal sound');
    await this.playSound(TOWER_AUDIO_LIBRARY.TowerSeal.value);

    // Get unique sides that need ledge lighting
    const sidesWithBrokenSeals = [...new Set(sealNumbers.map(sealNum => SEAL_TO_SIDE[sealNum]))];

    // Light both the primary ledge and adjacent ledge for each side with broken seals
    // This ensures both left and right ledge lights are activated for each side
    const ledgeLights: LedgeLight[] = [];
    const adjacentSides: { [key in TowerSide]: TowerSide } = {
      north: 'east',
      east: 'south',
      south: 'west',
      west: 'north'
    };

    sidesWithBrokenSeals.forEach(side => {
      ledgeLights.push({ position: side, style: 'on' });
      ledgeLights.push({ position: adjacentSides[side], style: 'on' });
    });

    // Remove duplicates if any
    const uniqueLedgeLights = ledgeLights.filter((light, index, self) =>
      index === self.findIndex(l => l.position === light.position)
    );

    // Create doorway lights with light effect for each broken seal
    const doorwayLights: DoorwayLight[] = sealNumbers.map(sealNum => ({
      level: SEAL_TO_LEVEL[sealNum],
      position: SEAL_TO_SIDE[sealNum],
      style: 'breatheFast'
    }));

    const lights: Lights = {
      ledge: uniqueLedgeLights,
      doorway: doorwayLights
    };

    console.log(`[UDT] Breaking seal(s) ${sealNumbers.join(', ')} - lighting ledges and doorways with breath effect`);
    await this.Lights(lights);
  }

  /**
   * Randomly rotates specified tower levels to random positions.
   * @param {number} [level=0] - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
   * @returns {Promise<void>} Promise that resolves when rotation command is sent
   */
  async randomRotateLevels(level: number = 0) {
    // 0 = all, 1 = top, 2 = middle, 3 = bottom
    // 4 = top & middle, 5 = top & bottom, 6 = middle & bottom
    
    const sides: TowerSide[] = ['north', 'east', 'south', 'west'];
    const getRandomSide = (): TowerSide => sides[Math.floor(Math.random() * sides.length)];
    
    // Current positions to preserve unchanged levels
    const currentTop = this.getCurrentDrumPosition('top');
    const currentMiddle = this.getCurrentDrumPosition('middle');
    const currentBottom = this.getCurrentDrumPosition('bottom');
    
    let topSide: TowerSide, middleSide: TowerSide, bottomSide: TowerSide;
    
    switch (level) {
      case 0: // all levels
        topSide = getRandomSide();
        middleSide = getRandomSide();
        bottomSide = getRandomSide();
        break;
      case 1: // top only
        topSide = getRandomSide();
        middleSide = currentMiddle;
        bottomSide = currentBottom;
        break;
      case 2: // middle only
        topSide = currentTop;
        middleSide = getRandomSide();
        bottomSide = currentBottom;
        break;
      case 3: // bottom only
        topSide = currentTop;
        middleSide = currentMiddle;
        bottomSide = getRandomSide();
        break;
      case 4: // top & middle
        topSide = getRandomSide();
        middleSide = getRandomSide();
        bottomSide = currentBottom;
        break;
      case 5: // top & bottom
        topSide = getRandomSide();
        middleSide = currentMiddle;
        bottomSide = getRandomSide();
        break;
      case 6: // middle & bottom
        topSide = currentTop;
        middleSide = getRandomSide();
        bottomSide = getRandomSide();
        break;
      default:
        console.log('[UDT] Invalid level parameter for randomRotateLevels. Must be 0-6.');
        return;
    }
    
    console.log('[UDT] Random rotating levels to:', { top: topSide, middle: middleSide, bottom: bottomSide });
    await this.Rotate(topSide, middleSide, bottomSide);
  }
  
  /**
   * Gets the current position of a specific drum level.
   * @param {('top' | 'middle' | 'bottom')} level - The drum level to get position for
   * @returns {TowerSide} The current position of the specified drum level
   * @private
   */
  private getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide {
    const drumPositions = drumPositionCmds[level];
    const currentValue = level === 'bottom' 
      ? this.currentDrumPositions.bottom
      : (level === 'top' 
        ? (this.currentDrumPositions.topMiddle & 0b00010110) // top bits
        : (this.currentDrumPositions.topMiddle & 0b11000000)); // middle bits
    
    // Find matching side for current drum position
    for (const [side, value] of Object.entries(drumPositions)) {
      if (level === 'middle') {
        // For middle, we need to mask and compare properly
        if ((value & 0b11000000) === (currentValue & 0b11000000)) {
          return side as TowerSide;
        }
      } else if (level === 'top') {
        // For top, compare the lower bits
        if ((value & 0b00010110) === (currentValue & 0b00010110)) {
          return side as TowerSide;
        }
      } else {
        // For bottom, direct comparison
        if (value === currentValue) {
          return side as TowerSide;
        }
      }
    }
    
    // Default to north if no match found
    return 'north';
  }

  //#region bluetooth

  /**
   * Establishes a Bluetooth connection to the Dark Tower device.
   * Initializes GATT services, characteristics, and starts connection monitoring.
   * @returns {Promise<void>} Promise that resolves when connection is established
   */
  async connect() {
    console.log("[UDT] Looking for Tower...");
    try {
      // @ts-ignore
      this.TowerDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: TOWER_DEVICE_NAME }],
        optionalServices: [UART_SERVICE_UUID]
      });

      if (this.TowerDevice === null) {
        console.log("[UDT] Tower not found");
        return
      }

      // @ts-ignore
      navigator.bluetooth.addEventListener("availabilitychanged", this.bleAvailabilityChange);

      console.log("[UDT] Connecting to Tower GATT Server...");
      const server = await this.TowerDevice.gatt.connect();

      console.log("[UDT] Getting Tower Primary Service...");
      const service = await server.getPrimaryService(UART_SERVICE_UUID);

      console.log("[UDT] Getting Tower Characteristics...");
      this.txCharacteristic = await service.getCharacteristic(
        UART_TX_CHARACTERISTIC_UUID
      );

      this.rxCharacteristic = await service.getCharacteristic(
        UART_RX_CHARACTERISTIC_UUID
      );

      console.log("[UDT] Subscribing to Tower...");
      await this.rxCharacteristic.startNotifications();
      await this.rxCharacteristic.addEventListener(
        "characteristicvaluechanged",
        this.onRxCharacteristicValueChanged
      );

      // Add disconnect detection
      this.TowerDevice.addEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);

      console.log('[UDT] Tower connection complete');
      this.isConnected = true;
      this.lastSuccessfulCommand = Date.now();
      this.lastBatteryHeartbeat = Date.now(); // Initialize battery heartbeat

      // Start connection monitoring
      if (this.enableConnectionMonitoring) {
        this.startConnectionMonitoring();
      }

      this.onTowerConnect();
    } catch (error) {
      console.log('[UDT] Tower Connection Error', error);
      this.isConnected = false;
      this.onTowerDisconnect();
    }
  }

  /**
   * Handles incoming data from the tower via Bluetooth characteristic notifications.
   * Processes battery status, tower state responses, and other tower communications.
   * @param {Event} event - Bluetooth characteristic value changed event
   */
  onRxCharacteristicValueChanged = (event) => {
    // Update last successful command timestamp
    this.lastSuccessfulCommand = Date.now();

    // convert data to byte array
    // @ts-ignore-next-line
    let receivedData = <Uint8Array>[];
    for (var i = 0; i < event.target.value.byteLength; i++) {
      receivedData[i] = event.target.value.getUint8(i);
    }
    const { cmdKey } = this.getTowerCommand(receivedData[0]);

    // log response
    if (this.logTowerResponses) {
      this.logTowerResponse(receivedData);
    }

    // tower state response check
    const isCommandTowerState = cmdKey === TC.STATE;
    if (isCommandTowerState) {
      this.handleTowerStateResponse(receivedData);
    };

    // battery 
    const isBatteryResponse = cmdKey === TC.BATTERY;
    if (isBatteryResponse) {
      // Update battery heartbeat - this is our most reliable connection indicator
      this.lastBatteryHeartbeat = Date.now();

      const millivolts = this.getMilliVoltsFromTowerReponse(receivedData);
      const batteryPercentage = this.millVoltsToPercentage(millivolts);
      const didBatteryLevelChange = this.lastBatteryPercentage !== batteryPercentage;
      const batteryNotifyFrequencyPassed = ((Date.now() - this.lastBatteryNotification) >= this.batteryNotifyFrequency);

      const shouldNotify = this.batteryNotifyOnValueChangeOnly ?
        didBatteryLevelChange :
        batteryNotifyFrequencyPassed;

      if (shouldNotify) {
        console.log('[UDT] Tower response: ', ...this.commandToString(receivedData));
        this.lastBatteryNotification = Date.now();
        this.lastBatteryPercentage = batteryPercentage;
        this.onBatteryLevelNotify(millivolts);
      }
    }
  }

  /**
   * Processes tower state response data including calibration completion and skull drop detection.
   * @param {Uint8Array} receivedData - Raw data received from the tower
   * @private
   */
  private handleTowerStateResponse(receivedData: Uint8Array) {
    const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
    const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];

    // check to see if the response for a calibration request
    if (this.performingCalibration) {
      this.performingCalibration = false;
      this.isCalibrated = true;
      // Reset battery heartbeat timer since calibration blocks battery updates
      // and it may take time for them to resume
      this.lastBatteryHeartbeat = Date.now();
      this.onCalibrationComplete();
      console.log('[UDT] Tower calibration complete');
    }

    // skull drop check
    // Note: If IR triggers when tower is disconnected it will result in tower sending
    // skull count when tower is reconnected.
    if (dataSkullDropCount !== this.towerSkullDropCount) {
      // don't trigger if skull count is zero, this can happen if the tower is power cycled
      // or when a 'reset' command is sent.
      if (!!dataSkullDropCount) {
        this.onSkullDrop(dataSkullDropCount);
        console.log(`[UDT] Skull drop detected: app:${this.towerSkullDropCount < 0 ? 'empty' : this.towerSkullDropCount}  tower:${dataSkullDropCount}`);
      } else {
        console.log(`[UDT] Skull count reset to ${dataSkullDropCount}`);
      }
      this.towerSkullDropCount = dataSkullDropCount;
    }
  }

  /**
   * Logs tower response data based on configured logging settings.
   * @param {Uint8Array} receivedData - Raw data received from the tower
   * @private
   */
  private logTowerResponse(receivedData: Uint8Array) {
    const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
    const logAll = this.logTowerResponseConfig["LOG_ALL"];
    let canLogThisResponse = this.logTowerResponseConfig[cmdKey] || logAll;

    // in case a command is not known we want to capture its occurance
    if (!cmdKey) {
      canLogThisResponse = true;
    }

    if (!canLogThisResponse) {
      return;
    }

    const isBatteryResponse = cmdKey === TC.BATTERY;
    if (isBatteryResponse) {
      return; // logged elsewhere
    }

    console.log('[UDT] Tower response:', ...this.commandToString(receivedData));
  }

  /**
   * Disconnects from the tower device and cleans up resources.
   * @returns {Promise<void>} Promise that resolves when disconnection is complete
   */
  async disconnect() {
    if (!this.TowerDevice) {
      return;
    }

    // Stop monitoring before disconnecting
    this.stopConnectionMonitoring();

    if (this.TowerDevice.gatt.connected) {
      // Remove event listener before disconnecting
      this.TowerDevice.removeEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);

      await this.TowerDevice.gatt.disconnect();
      console.log("[UDT] Tower disconnected");
      this.handleDisconnection();
    }
  }

  /**
   * Handles Bluetooth availability changes and manages disconnection if Bluetooth becomes unavailable.
   * @param {Event} event - Bluetooth availability change event
   */
  bleAvailabilityChange = (event) => {
    console.log('[UDT] Bluetooth availability changed', event);
    const availability = event.value;

    if (!availability && this.isConnected) {
      console.log('[UDT] Bluetooth became unavailable - handling disconnection');
      this.handleDisconnection();
    }
  }

  /**
   * Handles unexpected tower device disconnection events.
   * @param {Event} event - GATT server disconnected event
   */
  onTowerDeviceDisconnected = (event) => {
    console.log('[UDT] Tower device disconnected unexpectedly');
    this.handleDisconnection();
  }

  /**
   * Centralizes disconnection handling, cleaning up state and notifying callbacks.
   * @private
   */
  private handleDisconnection() {
    this.isConnected = false;
    this.isCalibrated = false;
    this.performingCalibration = false;
    this.stopConnectionMonitoring();

    // Reset heartbeat tracking
    this.lastBatteryHeartbeat = 0;
    this.lastSuccessfulCommand = 0;

    // Clean up characteristics
    this.txCharacteristic = null;
    this.rxCharacteristic = null;

    this.onTowerDisconnect();
  }

  /**
   * Starts the connection monitoring interval to periodically check connection health.
   * @private
   */
  private startConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.connectionMonitorFrequency);
  }

  /**
   * Stops the connection monitoring interval.
   * @private
   */
  private stopConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }

  /**
   * Performs connection health checks including battery heartbeat and GATT connection status.
   * @private
   */
  private checkConnectionHealth() {
    if (!this.isConnected || !this.TowerDevice) {
      return;
    }

    // Check if device is still connected at GATT level
    if (!this.TowerDevice.gatt.connected) {
      console.log('[UDT] GATT connection lost detected during health check');
      this.handleDisconnection();
      return;
    }

    // PRIMARY CHECK: Battery heartbeat monitoring (most reliable)
    // Tower sends battery status every ~200ms, so if we haven't received one in 3+ seconds,
    // the tower is likely disconnected (probably due to battery depletion)
    // Exception: During calibration, use longer timeout as tower doesn't send battery updates
    if (this.enableBatteryHeartbeatMonitoring) {
      const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
      const timeoutThreshold = this.performingCalibration ? this.calibrationHeartbeatTimeout : this.batteryHeartbeatTimeout;

      if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
        const operationContext = this.performingCalibration ? ' during calibration' : '';
        console.log(`[UDT] Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`);

        // During calibration, battery heartbeat timeouts are expected behavior, not actual disconnects
        if (this.performingCalibration) {
          console.log('[UDT] Ignoring battery heartbeat timeout during calibration - this is expected behavior');
          return;
        }

        console.log('[UDT] Tower possibly disconnected due to battery depletion or power loss');
        this.handleDisconnection();
        return;
      }
    }

    // SECONDARY CHECK: General command response timeout
    // Check if we haven't received any response in a while
    const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
    if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
      console.log('[UDT] General connection timeout detected - no responses received');
      // Connection timeout detected - handle disconnection
      console.log('[UDT] Heartbeat timeout - connection appears lost');
      this.handleDisconnection();
    }
  }
  //#endregion

  //#region utility

  /**
   * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
   * @param {Uint8Array} command - The command packet to send to the tower
   * @returns {Promise<void>} Promise that resolves when command is sent successfully
   */
  async sendTowerCommand(command: Uint8Array) {
    try {
      const cmdStr = this.commandToPacketString(command);
      this.logDetail && console.log('[UDT] packet(s) sent:', cmdStr);
      if (!this.txCharacteristic || !this.isConnected) {
        console.log('[UDT] Tower is not connected')
        return;
      }
      await this.txCharacteristic.writeValue(command);
      this.isConnected = true;
      this.retrySendCommandCount = 0;
      this.lastSuccessfulCommand = Date.now();
    } catch (error) {
      console.log('[UDT] command send error:', error);
      const errorMsg = error?.message ?? new String(error);
      const wasCancelled = errorMsg.includes('User cancelled');
      const maxRetriesReached = this.retrySendCommandCount >= this.retrySendCommandMax;

      // Check for disconnect indicators
      const isDisconnected = errorMsg.includes('Cannot read properties of null') ||
        errorMsg.includes('GATT Server is disconnected') ||
        errorMsg.includes('Device is not connected') ||
        !this.TowerDevice?.gatt?.connected;

      if (isDisconnected) {
        console.log('[UDT] Disconnect detected during command send');
        this.handleDisconnection();
        return;
      }

      if (!maxRetriesReached && this.isConnected && !wasCancelled) {
        console.log(`[UDT] retrying tower command attempt ${this.retrySendCommandCount + 1}`);
        this.retrySendCommandCount++;
        setTimeout(() => {
          this.sendTowerCommand(command);
        }, 250 * this.retrySendCommandCount);
      } else {
        this.retrySendCommandCount = 0;
      }
    }
  }

  /**
   * Updates a command packet with the current drum positions.
   * @param {CommandPacket} commandPacket - The command packet to update with current drum positions
   */
  updateCommandWithCurrentDrumPositions(commandPacket: CommandPacket) {
    commandPacket[DRUM_PACKETS.topMiddle] = this.currentDrumPositions.topMiddle;
    commandPacket[DRUM_PACKETS.bottom] = this.currentDrumPositions.bottom;
  }

  /**
   * Creates a light command packet from a lights configuration object.
   * @param {Lights} lights - Light configuration specifying doorway, ledge, and base lights
   * @returns {Uint8Array} Command packet for controlling tower lights
   */
  createLightPacketCommand = (lights: Lights) => {
    let packetPos = null;
    const command = new Uint8Array(20);
    const doorways = lights?.doorway;
    const ledges = lights?.ledge;
    const bases = lights?.base;

    doorways && doorways.forEach(dlt => {
      packetPos = LIGHT_PACKETS.doorway[dlt.level][dlt.position];
      const shouldBitShift = DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
      command[packetPos] += LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 0x10 : 0x1)
    })

    ledges && ledges.forEach(llt => {
      packetPos = LIGHT_PACKETS.ledge[llt.position];
      const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
      command[packetPos] += LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 0x10 : 0x1)
    })

    bases && bases.forEach(blt => {
      packetPos = LIGHT_PACKETS.base[blt.position.side][blt.position.level]
      const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
      command[packetPos] += LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 0x10 : 0x1)
    })

    return command;
  }

  /**
   * Creates a light override command packet.
   * @param {number} lightOverride - Light override value to send
   * @returns {Uint8Array} Command packet for light override
   */
  createLightOverrideCommand(lightOverride: number) {
    const lightOverrideCommand = new Uint8Array(20);
    lightOverrideCommand[LIGHT_PACKETS.overrides] = lightOverride;
    return lightOverrideCommand;
  }

  /**
   * Creates a rotation command packet for positioning tower drums.
   * @param {TowerSide} top - Target position for top drum
   * @param {TowerSide} middle - Target position for middle drum
   * @param {TowerSide} bottom - Target position for bottom drum
   * @returns {Uint8Array} Command packet for rotating tower drums
   */
  createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide) {
    const rotateCmd = new Uint8Array(20);
    rotateCmd[DRUM_PACKETS.topMiddle] =
      drumPositionCmds.top[top] | drumPositionCmds.middle[middle];
    rotateCmd[DRUM_PACKETS.bottom] = drumPositionCmds.bottom[bottom];
    return rotateCmd;
  }

  /**
   * Creates a sound command packet for playing tower audio.
   * @param {number} soundIndex - Index of the sound to play from the audio library
   * @returns {Uint8Array} Command packet for playing sound
   */
  createSoundCommand(soundIndex: number) {
    const soundCommand = new Uint8Array(20);
    const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
    soundCommand[AUDIO_COMMAND_POS] = sound;
    return soundCommand;
  }

  /**
   * Converts a command packet to a human-readable string array for logging.
   * TODO: return parsed data values rather than raw packet values
   * @param {Uint8Array} command - Command packet to convert
   * @returns {Array<string>} Human-readable representation of the command
   */
  commandToString(command: Uint8Array): Array<string> {
    const cmdValue = command[0];

    const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue)
    switch (cmdKey) {
      case TC.STATE:
      case TC.INVALID_STATE:
      case TC.FAILURE:
      case TC.JIGGLE:
      case TC.UNEXPECTED:
      case TC.DURATION:
      case TC.DIFFERENTIAL:
      case TC.CALIBRATION:
        return [towerCommand.name, this.commandToPacketString(command)];
      case TC.BATTERY:
        const millivolts = this.getMilliVoltsFromTowerReponse(command);
        const retval = [towerCommand.name, this.millVoltsToPercentage(millivolts)];
        if (this.logDetail) {
          retval.push(`${millivolts}mv`);
          retval.push(this.commandToPacketString(command));
        }
        return retval;
      default:
        return ["Unmapped Response!", this.commandToPacketString(command)]
    }
  }

  /**
   * Converts a command packet to a hex string representation for debugging.
   * @param {Uint8Array} command - Command packet to convert
   * @returns {string} Hex string representation of the command packet
   */
  commandToPacketString(command: Uint8Array) {
    let cmdStr = "[";
    command.forEach(n => cmdStr += n.toString(16) + ",");
    cmdStr = cmdStr.slice(0, -1) + "]";
    return cmdStr
  }

  /**
   * Maps a command value to its corresponding tower message definition.
   * @param {number} cmdValue - Command value received from tower
   * @returns {Object} Object containing command key and command definition
   */
  getTowerCommand(cmdValue: number) {
    const cmdKeys = Object.keys(TOWER_MESSAGES);
    const cmdKey = cmdKeys.find(key => TOWER_MESSAGES[key].value === cmdValue);
    const command = TOWER_MESSAGES[cmdKey]
    return { cmdKey, command };
  }

  /**
   * Extracts battery voltage in millivolts from a tower battery response.
   * @param {Uint8Array} command - Battery response packet from tower
   * @returns {number} Battery voltage in millivolts
   */
  getMilliVoltsFromTowerReponse(command: Uint8Array): number {
    const mv = new Uint8Array(4);
    mv[0] = command[4];
    mv[1] = command[3];
    mv[3] = 0;
    mv[4] = 0;
    var view = new DataView(mv.buffer, 0);
    return view.getUint32(0, true);
  }

  /**
   * Converts battery voltage in millivolts to percentage.
   * Tower returns sum total battery level in millivolts for all batteries.
   * @param {number} mv - Battery voltage in millivolts
   * @returns {string} Battery percentage as formatted string (e.g., "75%")
   */
  millVoltsToPercentage(mv: number) {
    const batLevel = mv ? mv / 3 : 0; // lookup is based on sinlge AA
    const levels = VOLTAGE_LEVELS.filter(v => batLevel >= v);
    return `${levels.length * 5}%`;
  };

  //#endregion

  //#region Connection Management

  /**
   * Enable or disable connection monitoring
   * @param {boolean} enabled - Whether to enable connection monitoring
   */
  setConnectionMonitoring(enabled: boolean) {
    this.enableConnectionMonitoring = enabled;
    if (enabled && this.isConnected) {
      this.startConnectionMonitoring();
    } else {
      this.stopConnectionMonitoring();
    }
  }

  /**
   * Configure connection monitoring parameters
   * @param {number} [frequency=2000] - How often to check connection (milliseconds)
   * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
   */
  configureConnectionMonitoring(frequency: number = 2000, timeout: number = 30000) {
    this.connectionMonitorFrequency = frequency;
    this.connectionTimeoutThreshold = timeout;

    // Restart monitoring with new settings if currently enabled
    if (this.enableConnectionMonitoring && this.isConnected) {
      this.startConnectionMonitoring();
    }
  }

  /**
   * Configure battery heartbeat monitoring parameters
   * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
   * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
   * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
   */
  configureBatteryHeartbeatMonitoring(enabled: boolean = true, timeout: number = 3000) {
    this.enableBatteryHeartbeatMonitoring = enabled;
    this.batteryHeartbeatTimeout = timeout;
  }

  /**
   * Check if the tower is currently connected
   * @returns {Promise<boolean>} True if connected and responsive
   */
  async isConnectedAndResponsive(): Promise<boolean> {
    if (!this.isConnected || !this.TowerDevice?.gatt?.connected) {
      return false;
    }

    // Simple connectivity check - if we have a valid characteristic, assume connected
    return true;
  }

  /**
   * Get detailed connection status including heartbeat information
   * @returns {Object} Object with connection details
   */
  getConnectionStatus() {
    const now = Date.now();
    const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
    const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;

    return {
      isConnected: this.isConnected,
      isGattConnected: this.TowerDevice?.gatt?.connected || false,
      isCalibrated: this.isCalibrated,
      lastBatteryHeartbeatMs: timeSinceLastBattery,
      lastCommandResponseMs: timeSinceLastCommand,
      batteryHeartbeatHealthy: timeSinceLastBattery >= 0 && timeSinceLastBattery < this.batteryHeartbeatTimeout,
      connectionMonitoringEnabled: this.enableConnectionMonitoring,
      batteryHeartbeatMonitoringEnabled: this.enableBatteryHeartbeatMonitoring,
      batteryHeartbeatTimeoutMs: this.batteryHeartbeatTimeout,
      connectionTimeoutMs: this.connectionTimeoutThreshold
    };
  }
  //#endregion

  //#region cleanup

  /**
   * Clean up resources and disconnect properly
   * @returns {Promise<void>} Promise that resolves when cleanup is complete
   */
  async cleanup() {
    console.log('[UDT] Cleaning up UltimateDarkTower instance');

    // Stop connection monitoring
    this.stopConnectionMonitoring();

    // Remove event listeners
    if (this.TowerDevice) {
      this.TowerDevice.removeEventListener('gattserverdisconnected', this.onTowerDeviceDisconnected);
    }

    // @ts-ignore
    if (navigator.bluetooth) {
      // @ts-ignore
      navigator.bluetooth.removeEventListener("availabilitychanged", this.bleAvailabilityChange);
    }

    // Disconnect if connected
    if (this.isConnected) {
      await this.disconnect();
    }
  }

  //#endregion
}

export default UltimateDarkTower;
