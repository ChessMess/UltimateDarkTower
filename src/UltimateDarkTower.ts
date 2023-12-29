
/**
 * @title UltimateDarkTower
 * @notes
 * The UltimateDarkTower class represents a control interface for the Return To Dark Tower device.
 * It provides methods for calibrating the tower, playing sounds, controlling lights, 
 * rotating the tower, and more.
 * The class also handles the Bluetooth connection to the tower device.
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
  batteryNotifyFrequency: number = 15 * 1000; // Tower sends these every ~200ms
  batteryNotifyOnValueChangeOnly = true; // overrides frequency setting if true
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

  //TODO: currently not working - investigating
  async requestTowerState() {
    console.log('[UDT] Requesting Tower State');
    await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.towerState]));
  }

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

  async Lights(lights: Lights) {
    const lightCommand = this.createLightPacketCommand(lights);
    this.updateCommandWithCurrentDrumPositions(lightCommand);

    this.logDetail && console.log('[UDT] Light Parameter', lights);
    console.log('[UDT] Sending light command');
    await this.sendTowerCommand(lightCommand);
  }

  async lightOverrides(light: number, soundIndex?: number) {
    const lightOverrideCommand = this.createLightOverrideCommand(light);
    this.updateCommandWithCurrentDrumPositions(lightOverrideCommand);
    if (soundIndex) {
      lightOverrideCommand[AUDIO_COMMAND_POS] = soundIndex;
    }

    console.log('[UDT] Sending light override' + (soundIndex ? ' with sound' : ''));
    await this.sendTowerCommand(lightOverrideCommand);
  }

  async Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number) {
    this.logDetail && console.log(`[UDT] Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${middle}] S[${soundIndex}]`);

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

  async resetTowerSkullCount() {
    console.log('[UDT] Tower skull count reset requested');
    await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]));
  }

  //#endregion

  //#region future features 
  // TODO: Implement function
  breakSeals(seal: Array<number> | number) {
    // seals are numbered 1 - 12 with 1/5/8 representing north positions
    // Top: 1-4, Middle: 5-8, Bottom: 9-12
  }

  // TODO: Implement function
  randomizeLevels(level: number = 0) {
    // 0 = all, 1 = top, 2 = middle, 3 = bottom
    // 4 = top & middle, 5 = top & bottom, 6 = middle & bottom
  }
  //#endregion

  //#region bluetooth

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
      navigator.bluetooth.addEventListener("availabilitychanged", (event) => {
        const availability = event.value;
        console.log('[UDT] ble availability changed', availability);
      });

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

      console.log('[UDT] Tower connection complete');
      this.isConnected = true;
      this.onTowerConnect();
    } catch (error) {
      console.log('[UDT] Tower Connection Error', error);
      this.isConnected = false;
      this.onTowerDisconnect();
    }
  }

  // handle tower response
  onRxCharacteristicValueChanged = (event) => {
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

  private handleTowerStateResponse(receivedData: Uint8Array) {
    const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
    const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];

    // check to see if the response for a calibration request
    if (this.performingCalibration) {
      this.performingCalibration = false;
      this.isCalibrated = true;
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

  async disconnect() {
    if (!this.TowerDevice) {
      return;
    }

    if (this.TowerDevice.gatt.connected) {
      await this.TowerDevice.gatt.disconnect();
      console.log("[UDT] Tower disconnected");
      this.isConnected = false;
      this.onTowerDisconnect();
    }
  }

  bleAvailabilityChange(event) {
    console.log('[UDT] Bluetooth availability changed', event);
    this.isConnected = !!this.txCharacteristic;
    this.isConnected && this.onTowerConnect();
    !this.isConnected && this.onTowerDisconnect();
  }

  //#endregion

  //#region utility

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
    } catch (error) {
      console.log('[UDT] command send error:', error);
      const errorMsg = error?.message ?? new String(error);
      const wasCancelled = errorMsg.includes('User cancelled');
      const alreadyInProgress = errorMsg.includes('already in progress');
      const maxRetriesReached = this.retrySendCommandCount < this.retrySendCommandMax;

      if (!maxRetriesReached && this.isConnected) {
        console.log(`[UDT] retrying tower command attempt ${this.retrySendCommandCount}`);
        this.retrySendCommandCount++;
        setTimeout(() => {
          this.sendTowerCommand(command);
        }, 250 * this.retrySendCommandCount);
      }

      const isDisconnected = errorMsg.includes('Cannot read properties of null');
      this.isConnected = !isDisconnected;
    }
  }

  updateCommandWithCurrentDrumPositions(commandPacket: CommandPacket) {
    commandPacket[DRUM_PACKETS.topMiddle] = this.currentDrumPositions.topMiddle;
    commandPacket[DRUM_PACKETS.bottom] = this.currentDrumPositions.bottom;
  }

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

  createLightOverrideCommand(lightOverride: number) {
    const lightOverrideCommand = new Uint8Array(20);
    lightOverrideCommand[LIGHT_PACKETS.overrides] = lightOverride;
    return lightOverrideCommand;
  }

  createRotateCommand(top: TowerSide, middle: TowerSide, bottom: TowerSide) {
    const rotateCmd = new Uint8Array(20);
    rotateCmd[DRUM_PACKETS.topMiddle] =
      drumPositionCmds.top[top] | drumPositionCmds.middle[middle];
    rotateCmd[DRUM_PACKETS.bottom] = drumPositionCmds.bottom[bottom];
    return rotateCmd;
  }

  createSoundCommand(soundIndex: number) {
    const soundCommand = new Uint8Array(20);
    const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, '0'));
    soundCommand[AUDIO_COMMAND_POS] = sound;
    return soundCommand;
  }

  // TODO: return parsed data values rather than raw packet values
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
        break;
      case TC.BATTERY:
        const millivolts = this.getMilliVoltsFromTowerReponse(command);
        const retval = [towerCommand.name, this.millVoltsToPercentage(millivolts)];
        if (this.logDetail) {
          retval.push(`${millivolts}mv`);
          retval.push(this.commandToPacketString(command));
        }
        return retval;
        break;
      default:
        return ["Unmapped Response!", this.commandToPacketString(command)]
        break;
    }
  }

  commandToPacketString(command: Uint8Array) {
    let cmdStr = "[";
    command.forEach(n => cmdStr += n.toString(16) + ",");
    cmdStr = cmdStr.slice(0, -1) + "]";
    return cmdStr
  }

  getTowerCommand(cmdValue: number) {
    const cmdKeys = Object.keys(TOWER_MESSAGES);
    const cmdKey = cmdKeys.find(key => TOWER_MESSAGES[key].value === cmdValue);
    const command = TOWER_MESSAGES[cmdKey]
    return { cmdKey, command };
  }

  getMilliVoltsFromTowerReponse(command: Uint8Array): number {
    const mv = new Uint8Array(4);
    mv[0] = command[4];
    mv[1] = command[3];
    mv[3] = 0;
    mv[4] = 0;
    var view = new DataView(mv.buffer, 0);
    return view.getUint32(0, true);
  }

  // Tower returns sum total battery level in millivolts
  millVoltsToPercentage(mv: number) {
    const batLevel = mv ? mv / 3 : 0; // lookup is based on sinlge AA
    const levels = VOLTAGE_LEVELS.filter(v => batLevel >= v);
    return `${levels.length * 5}%`;
  };

  //#endregion

}
