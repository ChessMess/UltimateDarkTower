(() => {
  // src/constants.ts
  var UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  var UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  var UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
  var TOWER_DEVICE_NAME = "ReturnToDarkTower";
  var TOWER_COMMANDS = {
    towerState: 0,
    // not a sendable command
    doorReset: 1,
    unjamDrums: 2,
    resetCounter: 3,
    calibration: 4,
    overwriteDrumStates: 5
    // go no further!
  };
  var TC = {
    STATE: "TOWER_STATE",
    INVALID_STATE: "INVALID_STATE",
    FAILURE: "HARDWARE_FAILURE",
    JIGGLE: "MECH_JIGGLE_TRIGGERED",
    UNEXPECTED: "MECH_UNEXPECTED_TRIGGER",
    DURATION: "MECH_DURATION",
    DIFFERENTIAL: "DIFFERENTIAL_READINGS",
    CALIBRATION: "CALIBRATION_FINISHED",
    BATTERY: "BATTERY_READING"
  };
  var DRUM_PACKETS = {
    topMiddle: 1,
    bottom: 2
  };
  var LIGHT_PACKETS = {
    doorway: {
      top: { north: 3, east: 3, south: 4, west: 4 },
      middle: { north: 5, east: 5, south: 6, west: 6 },
      bottom: { north: 7, east: 7, south: 8, west: 8 }
    },
    base: {
      north: { a: 12, b: 14 },
      east: { a: 11, b: 13 },
      south: { a: 11, b: 13 },
      west: { a: 12, b: 14 }
    },
    ledge: { north: 10, west: 10, south: 9, east: 9 },
    overrides: 19
  };
  var AUDIO_COMMAND_POS = 15;
  var SKULL_DROP_COUNT_POS = 17;
  var drumPositionCmds = {
    top: { north: 16, west: 2, south: 20, east: 22 },
    // bits 1-8
    middle: { north: 16, west: 64, south: 144, east: 208 },
    // bits 1-4
    bottom: { north: 66, west: 74, south: 82, east: 90 }
  };
  var BASE_LEDGE_LIGHTS_TO_BIT_SHIFT = ["east", "west"];
  var DOORWAY_LIGHTS_TO_BIT_SHIFT = ["north", "south"];
  var LIGHT_EFFECTS = {
    on: 3,
    off: 0,
    breathe: 5,
    breatheFast: 7,
    breathe50percent: 9,
    flicker: 11
  };
  var TOWER_AUDIO_LIBRARY = {
    Ashstrider: { name: "Ashstrider", value: 1, category: "Adversary" },
    BaneofOmens: { name: "Bane of Omens", value: 2, category: "Adversary" },
    EmpressofShades: { name: "Empress of Shades", value: 3, category: "Adversary" },
    GazeEternal: { name: "Gaze Eternal", value: 4, category: "Adversary" },
    Gravemaw: { name: "Gravemaw", value: 5, category: "Adversary" },
    IsatheHollow: { name: "Isa the Hollow", value: 6, category: "Adversary" },
    LingeringRot: { name: "Lingering Rot", value: 7, category: "Adversary" },
    UtukKu: { name: "Utuk'Ku", value: 8, category: "Adversary" },
    Gleb: { name: "Gleb", value: 9, category: "Ally" },
    Grigor: { name: "Grigor", value: 10, category: "Ally" },
    Hakan: { name: "Hakan", value: 11, category: "Ally" },
    Letha: { name: "Letha", value: 12, category: "Ally" },
    Miras: { name: "Miras", value: 13, category: "Ally" },
    Nimet: { name: "Nimet", value: 14, category: "Ally" },
    Tomas: { name: "Tomas", value: 15, category: "Ally" },
    Vasa: { name: "Vasa", value: 16, category: "Ally" },
    Yana: { name: "Yana", value: 17, category: "Ally" },
    Zaida: { name: "Zaida", value: 18, category: "Ally" },
    ApplyAdvantage01: { name: "Apply Advantage 01", value: 19, category: "Battle" },
    ApplyAdvantage02: { name: "Apply Advantage 02", value: 20, category: "Battle" },
    ApplyAdvantage03: { name: "Apply Advantage 03", value: 21, category: "Battle" },
    ApplyAdvantage04: { name: "Apply Advantage 04", value: 22, category: "Battle" },
    ApplyAdvantage05: { name: "Apply Advantage 05", value: 23, category: "Battle" },
    MaxAdvantages: { name: "Max Advantages", value: 24, category: "Battle" },
    NoAdvantages: { name: "No Advantages", value: 25, category: "Battle" },
    AdversaryEscaped: { name: "Adversary Escaped", value: 26, category: "Battle" },
    BattleButton: { name: "Battle Button", value: 27, category: "Battle" },
    CardFlip01: { name: "Card Flip 01", value: 28, category: "Battle" },
    CardFlip02: { name: "Card Flip 02", value: 29, category: "Battle" },
    CardFlip03: { name: "Card Flip 03", value: 30, category: "Battle" },
    CardFlipPaper01: { name: "Card Flip Paper 01", value: 31, category: "Battle" },
    CardFlipPaper02: { name: "Card Flip Paper 02", value: 32, category: "Battle" },
    CardFlipPaper03: { name: "Card Flip Paper 03", value: 33, category: "Battle" },
    CardSelect01: { name: "Card Select 01", value: 34, category: "Battle" },
    CardSelect02: { name: "Card Select 02", value: 35, category: "Battle" },
    CardSelect03: { name: "Card Select 03", value: 36, category: "Battle" },
    BattleStart: { name: "Battle Start", value: 37, category: "Battle" },
    BattleVictory: { name: "Battle Victory", value: 38, category: "Battle" },
    ButtonHoldPressCombo: { name: "Button Hold Press Combo", value: 39, category: "Battle" },
    ButtonHold: { name: "Button Hold", value: 40, category: "Battle" },
    ButtonPress: { name: "Button Press", value: 41, category: "Battle" },
    ClassicAdvantageApplied: { name: "8-bit Advantage", value: 42, category: "Classic" },
    ClassicAttackTower: { name: "8-bit Attack Tower", value: 43, category: "Classic" },
    ClassicBazaar: { name: "8-bit Bazaar", value: 44, category: "Classic" },
    ClassicConfirmation: { name: "8-bit Confirmation", value: 45, category: "Classic" },
    ClassicDragons: { name: "8-bit Dragons", value: 46, category: "Classic" },
    ClassicQuestFailed: { name: "8-bit Quest Failed", value: 47, category: "Classic" },
    ClassicRetreat: { name: "8-bit Retreat", value: 48, category: "Classic" },
    ClassicStartMonth: { name: "8-bit Start Month", value: 49, category: "Classic" },
    ClassicStartDungeon: { name: "8-bit Start Dungeon", value: 50, category: "Classic" },
    ClassicTowerLost: { name: "8-bit Tower Lost", value: 51, category: "Classic" },
    ClassicUnsure: { name: "8-bit Unsure", value: 52, category: "Classic" },
    DungeonAdvantage01: { name: "Dungeon Advantage 01", value: 53, category: "Dungeon" },
    DungeonAdvantage02: { name: "Dungeon Advantage 02", value: 54, category: "Dungeon" },
    DungeonButton: { name: "Dungeon Button", value: 55, category: "Dungeon" },
    DungeonFootsteps: { name: "Dungeon Footsteps", value: 56, category: "Dungeon" },
    DungeonCaves: { name: "Dungeon Caves", value: 57, category: "Dungeon" },
    DungeonComplete: { name: "Dungeon Complete", value: 58, category: "Dungeon" },
    DungeonEncampment: { name: "Dungeon Encampment", value: 59, category: "Dungeon" },
    DungeonEscape: { name: "Dungeon Escape", value: 60, category: "Dungeon" },
    DungeonFortress: { name: "Dungeon Fortress", value: 61, category: "Dungeon" },
    DungeonRuins: { name: "Dungeon Ruins", value: 62, category: "Dungeon" },
    DungeonShrine: { name: "Dungeon Shrine", value: 63, category: "Dungeon" },
    DungeonTomb: { name: "Dungeon Tomb", value: 64, category: "Dungeon" },
    FoeEvent: { name: "Foe Event", value: 65, category: "Foe" },
    FoeSpawn: { name: "Foe Spawn", value: 66, category: "Foe" },
    Brigands: { name: "Brigands", value: 67, category: "Foe" },
    ClanofNeuri: { name: "Clan of Neuri", value: 68, category: "Foe" },
    Dragons: { name: "Dragons", value: 69, category: "Foe" },
    Lemures: { name: "Lemures", value: 70, category: "Foe" },
    LeveledUp: { name: "Leveled Up", value: 71, category: "Foe" },
    Mormos: { name: "Mormos", value: 72, category: "Foe" },
    Oreks: { name: "Oreks", value: 73, category: "Foe" },
    ShadowWolves: { name: "Shadow Wolves", value: 74, category: "Foe" },
    SpineFiends: { name: "Spine Fiends", value: 75, category: "Foe" },
    Strigas: { name: "Strigas", value: 76, category: "Foe" },
    Titans: { name: "Titans", value: 77, category: "Foe" },
    FrostTrolls: { name: "Frost Trolls", value: 78, category: "Foe" },
    WidowmadeSpiders: { name: "Widowmade Spiders", value: 79, category: "Foe" },
    AshstriderSpawn: { name: "Ashstrider Spawn", value: 80, category: "Spawn" },
    BaneofOmensSpawn: { name: "Bane of Omens Spawn", value: 81, category: "Spawn" },
    EmpressofShadesSpawn: { name: "Empress of Shades Spawn", value: 82, category: "Spawn" },
    GazeEternalSpawn: { name: "Gaze Eternal Spawn", value: 83, category: "Spawn" },
    GravemawSpawn: { name: "Gravemaw Spawn", value: 84, category: "Spawn" },
    IsatheHollowSpawn: { name: "Isa the Hollow Spawn", value: 85, category: "Spawn" },
    LingeringRotSpawn: { name: "Lingering Rot Spawn", value: 86, category: "Spawn" },
    UtukKuSpawn: { name: "Utuk'Ku Spawn", value: 87, category: "Spawn" },
    QuestComplete: { name: "Quest Complete", value: 88, category: "Quest" },
    TowerAllGlyphs: { name: "Tower All Glyphs", value: 89, category: "Glyph" },
    TowerAngry1: { name: "Tower Angry 1", value: 90, category: "Glyph" },
    TowerAngry2: { name: "Tower Angry 2", value: 91, category: "Glyph" },
    TowerAngry3: { name: "Tower Angry 3", value: 92, category: "Glyph" },
    TowerAngry4: { name: "Tower Angry 4", value: 93, category: "Glyph" },
    TowerConnected: { name: "Tower Connected", value: 94, category: "State" },
    GameStart: { name: "Game Start", value: 95, category: "State" },
    TowerGloat1: { name: "Tower Gloat 1", value: 96, category: "State" },
    TowerGloat2: { name: "Tower Gloat 2", value: 97, category: "State" },
    TowerGloat3: { name: "Tower Gloat 3", value: 98, category: "State" },
    TowerGlyph: { name: "Tower Glyph", value: 99, category: "State" },
    TowerIdle1: { name: "Tower Idle 1", value: 100, category: "State" },
    TowerIdle2: { name: "Tower Idle 2", value: 101, category: "State" },
    TowerIdle3: { name: "Tower Idle 3", value: 102, category: "State" },
    TowerIdle4: { name: "Tower Idle 4", value: 103, category: "State" },
    TowerIdle5: { name: "Tower Idle 5", value: 104, category: "Unlisted" },
    TowerDisconnected: { name: "Tower Disconnect", value: 105, category: "State" },
    MonthEnded: { name: "Month Ended", value: 106, category: "State" },
    MonthStarted: { name: "Month Started", value: 107, category: "State" },
    QuestFailed: { name: "Quest Failed", value: 108, category: "Quest" },
    RotateExit: { name: "Rotate Exit", value: 109, category: "Seals" },
    RotateLoop: { name: "Rotate Loop", value: 110, category: "Seals" },
    RotateStart: { name: "Rotate Start", value: 111, category: "Seals" },
    TowerSeal: { name: "Tower Seal", value: 112, category: "Seals" },
    TowerSkullDropped: { name: "Tower Skull Dropped", value: 113, category: "State" }
  };
  var TOWER_MESSAGES = {
    TOWER_STATE: { name: "Tower State", value: 0, critical: false },
    INVALID_STATE: { name: "Invalid State", value: 1, critical: true },
    HARDWARE_FAILURE: { name: "Hardware Failure", value: 2, critical: true },
    MECH_JIGGLE_TRIGGERED: { name: "Unjam Jiggle Triggered", value: 3, critical: false },
    MECH_DURATION: { name: "Rotation Duration", value: 4, critical: false },
    MECH_UNEXPECTED_TRIGGER: { name: "Unexpected Trigger", value: 5, critical: false },
    DIFFERENTIAL_READINGS: { name: "Diff Voltage Readings", value: 6, critical: false },
    BATTERY_READING: { name: "Battery Level", value: 7, critical: false },
    CALIBRATION_FINISHED: { name: "Calibration Finished", value: 8, critical: false }
  };
  var VOLTAGE_LEVELS = [
    1500,
    1390,
    1350,
    1320,
    1295,
    1270,
    1245,
    1225,
    1205,
    1180,
    1175,
    1166,
    1150,
    1133,
    1125,
    1107,
    1095,
    1066,
    1033,
    980
    // There's an additional 5% until 800mV is reached
  ];

  // src/UltimateDarkTower.ts
  var UltimateDarkTower = class {
    constructor() {
      // ble
      this.TowerDevice = null;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      // tower configuration
      this.batteryNotifyFrequency = 15 * 1e3;
      // App notification throttling (Tower sends every ~200ms)
      this.batteryNotifyOnValueChangeOnly = false;
      // overrides frequency setting if true
      this.retrySendCommandCount = 0;
      this.retrySendCommandMax = 5;
      // tower state
      this.currentDrumPositions = { topMiddle: 16, bottom: 66 };
      this.isCalibrated = false;
      this.isConnected = false;
      this.towerSkullDropCount = -1;
      this.performingCalibration = false;
      this.lastBatteryNotification = 0;
      // disconnect detection
      this.connectionMonitorInterval = null;
      this.connectionMonitorFrequency = 2 * 1e3;
      // Check every 2 seconds (more frequent due to battery heartbeat)
      this.lastSuccessfulCommand = 0;
      this.connectionTimeoutThreshold = 30 * 1e3;
      // 30 seconds without response
      this.enableConnectionMonitoring = true;
      // battery-based heartbeat detection
      this.lastBatteryHeartbeat = 0;
      // Last time we received a battery status
      this.batteryHeartbeatTimeout = 3 * 1e3;
      // 3 seconds without battery = likely disconnected (normal is ~200ms)
      this.enableBatteryHeartbeatMonitoring = true;
      // call back functions
      // you overwrite these with your own functions 
      // to handle these events in your app
      this.onCalibrationComplete = () => {
      };
      this.onSkullDrop = (towerSkullCount) => {
      };
      this.onBatteryLevelNotify = (millivolts) => {
      };
      this.onTowerConnect = () => {
      };
      this.onTowerDisconnect = () => {
      };
      // utility
      this.logDetail = false;
      this.logTowerResponses = true;
      // allows you to log specific responses
      // [Differential Readings] & [Battery] are sent continously so
      // setting their defaults to false.
      this.logTowerResponseConfig = {
        TOWER_STATE: true,
        INVALID_STATE: true,
        HARDWARE_FAILURE: true,
        MECH_JIGGLE_TRIGGERED: true,
        MECH_UNEXPECTED_TRIGGER: true,
        MECH_DURATION: true,
        DIFFERENTIAL_READINGS: false,
        BATTERY_READING: true,
        CALIBRATION_FINISHED: true,
        LOG_ALL: false
        // overrides individual
      };
      // handle tower response
      this.onRxCharacteristicValueChanged = (event) => {
        this.lastSuccessfulCommand = Date.now();
        let receivedData = [];
        for (var i = 0; i < event.target.value.byteLength; i++) {
          receivedData[i] = event.target.value.getUint8(i);
        }
        const { cmdKey } = this.getTowerCommand(receivedData[0]);
        if (this.logTowerResponses) {
          this.logTowerResponse(receivedData);
        }
        const isCommandTowerState = cmdKey === TC.STATE;
        if (isCommandTowerState) {
          this.handleTowerStateResponse(receivedData);
        }
        ;
        const isBatteryResponse = cmdKey === TC.BATTERY;
        if (isBatteryResponse) {
          this.lastBatteryHeartbeat = Date.now();
          const millivolts = this.getMilliVoltsFromTowerReponse(receivedData);
          const batteryPercentage = this.millVoltsToPercentage(millivolts);
          const didBatteryLevelChange = this.lastBatteryPercentage !== batteryPercentage;
          const batteryNotifyFrequencyPassed = Date.now() - this.lastBatteryNotification >= this.batteryNotifyFrequency;
          const shouldNotify = this.batteryNotifyOnValueChangeOnly ? didBatteryLevelChange : batteryNotifyFrequencyPassed;
          if (shouldNotify) {
            console.log("[UDT] Tower response: ", ...this.commandToString(receivedData));
            this.lastBatteryNotification = Date.now();
            this.lastBatteryPercentage = batteryPercentage;
            this.onBatteryLevelNotify(millivolts);
          }
        }
      };
      this.bleAvailabilityChange = (event) => {
        console.log("[UDT] Bluetooth availability changed", event);
        const availability = event.value;
        if (!availability && this.isConnected) {
          console.log("[UDT] Bluetooth became unavailable - handling disconnection");
          this.handleDisconnection();
        }
      };
      // Handle device disconnection
      this.onTowerDeviceDisconnected = (event) => {
        console.log("[UDT] Tower device disconnected unexpectedly");
        this.handleDisconnection();
      };
      this.createLightPacketCommand = (lights) => {
        let packetPos = null;
        const command = new Uint8Array(20);
        const doorways = lights == null ? void 0 : lights.doorway;
        const ledges = lights == null ? void 0 : lights.ledge;
        const bases = lights == null ? void 0 : lights.base;
        doorways && doorways.forEach((dlt) => {
          packetPos = LIGHT_PACKETS.doorway[dlt.level][dlt.position];
          const shouldBitShift = DOORWAY_LIGHTS_TO_BIT_SHIFT.includes(dlt.position);
          command[packetPos] += LIGHT_EFFECTS[`${dlt.style}`] * (shouldBitShift ? 16 : 1);
        });
        ledges && ledges.forEach((llt) => {
          packetPos = LIGHT_PACKETS.ledge[llt.position];
          const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(llt.position);
          command[packetPos] += LIGHT_EFFECTS[`${llt.style}`] * (shouldBitShift ? 16 : 1);
        });
        bases && bases.forEach((blt) => {
          packetPos = LIGHT_PACKETS.base[blt.position.side][blt.position.level];
          const shouldBitShift = BASE_LEDGE_LIGHTS_TO_BIT_SHIFT.includes(blt.position.side);
          command[packetPos] += LIGHT_EFFECTS[`${blt.style}`] * (shouldBitShift ? 16 : 1);
        });
        return command;
      };
    }
    //#region Tower Commands 
    async calibrate() {
      if (!this.performingCalibration) {
        console.log("[UDT] Performing Tower Calibration");
        await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]));
        this.performingCalibration = true;
        return;
      }
      console.log("[UDT] Tower calibration requested when tower is already performing calibration");
      return;
    }
    //TODO: currently not working - investigating
    async requestTowerState() {
      console.log("[UDT] Requesting Tower State");
      await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.towerState]));
    }
    async playSound(soundIndex) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        console.log("[UDT] attempt to play invalid sound index", soundIndex);
        return;
      }
      const soundCommand = this.createSoundCommand(soundIndex);
      this.updateCommandWithCurrentDrumPositions(soundCommand);
      console.log("[UDT] Sending sound command");
      await this.sendTowerCommand(soundCommand);
    }
    async Lights(lights) {
      const lightCommand = this.createLightPacketCommand(lights);
      this.updateCommandWithCurrentDrumPositions(lightCommand);
      this.logDetail && console.log("[UDT] Light Parameter", lights);
      console.log("[UDT] Sending light command");
      await this.sendTowerCommand(lightCommand);
    }
    async lightOverrides(light, soundIndex) {
      const lightOverrideCommand = this.createLightOverrideCommand(light);
      this.updateCommandWithCurrentDrumPositions(lightOverrideCommand);
      if (soundIndex) {
        lightOverrideCommand[AUDIO_COMMAND_POS] = soundIndex;
      }
      console.log("[UDT] Sending light override" + (soundIndex ? " with sound" : ""));
      await this.sendTowerCommand(lightOverrideCommand);
    }
    async Rotate(top, middle, bottom, soundIndex) {
      this.logDetail && console.log(`[UDT] Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${middle}] S[${soundIndex}]`);
      const rotateCommand = this.createRotateCommand(top, middle, bottom);
      if (soundIndex) {
        rotateCommand[AUDIO_COMMAND_POS] = soundIndex;
      }
      console.log("[UDT] Sending rotate command" + (soundIndex ? " with sound" : ""));
      await this.sendTowerCommand(rotateCommand);
      this.currentDrumPositions = {
        topMiddle: rotateCommand[DRUM_PACKETS.topMiddle],
        bottom: rotateCommand[DRUM_PACKETS.bottom]
      };
    }
    async MultiCommand(rotate, lights, soundIndex) {
      this.logDetail && console.log("[UDT] MultiCommand Parameters", rotate, lights, soundIndex);
      let multiCmd = new Uint8Array(20);
      const rotateCmd = this.createRotateCommand(rotate.top, rotate.middle, rotate.bottom);
      const lightCmd = this.createLightPacketCommand(lights);
      for (let index = 0; index < 20; index++) {
        multiCmd[index] = rotateCmd[index] | lightCmd[index];
      }
      if (soundIndex) {
        const soundCmd = this.createSoundCommand(soundIndex);
        multiCmd[AUDIO_COMMAND_POS] = multiCmd[AUDIO_COMMAND_POS] | soundCmd[AUDIO_COMMAND_POS];
      }
      this.sendTowerCommand(multiCmd);
      const packetMsg = this.commandToPacketString(multiCmd);
      console.log("[UDT] multiple command sent", packetMsg);
    }
    async resetTowerSkullCount() {
      console.log("[UDT] Tower skull count reset requested");
      await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]));
    }
    //#endregion
    //#region future features 
    // TODO: Implement function
    breakSeals(seal) {
    }
    // TODO: Implement function
    randomizeLevels(level = 0) {
    }
    //#endregion
    //#region bluetooth
    async connect() {
      console.log("[UDT] Looking for Tower...");
      try {
        this.TowerDevice = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: TOWER_DEVICE_NAME }],
          optionalServices: [UART_SERVICE_UUID]
        });
        if (this.TowerDevice === null) {
          console.log("[UDT] Tower not found");
          return;
        }
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
        this.TowerDevice.addEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
        console.log("[UDT] Tower connection complete");
        this.isConnected = true;
        this.lastSuccessfulCommand = Date.now();
        this.lastBatteryHeartbeat = Date.now();
        if (this.enableConnectionMonitoring) {
          this.startConnectionMonitoring();
        }
        this.onTowerConnect();
      } catch (error) {
        console.log("[UDT] Tower Connection Error", error);
        this.isConnected = false;
        this.onTowerDisconnect();
      }
    }
    handleTowerStateResponse(receivedData) {
      const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
      const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];
      if (this.performingCalibration) {
        this.performingCalibration = false;
        this.isCalibrated = true;
        this.onCalibrationComplete();
        console.log("[UDT] Tower calibration complete");
      }
      if (dataSkullDropCount !== this.towerSkullDropCount) {
        if (!!dataSkullDropCount) {
          this.onSkullDrop(dataSkullDropCount);
          console.log(`[UDT] Skull drop detected: app:${this.towerSkullDropCount < 0 ? "empty" : this.towerSkullDropCount}  tower:${dataSkullDropCount}`);
        } else {
          console.log(`[UDT] Skull count reset to ${dataSkullDropCount}`);
        }
        this.towerSkullDropCount = dataSkullDropCount;
      }
    }
    logTowerResponse(receivedData) {
      const { cmdKey, command } = this.getTowerCommand(receivedData[0]);
      const logAll = this.logTowerResponseConfig["LOG_ALL"];
      let canLogThisResponse = this.logTowerResponseConfig[cmdKey] || logAll;
      if (!cmdKey) {
        canLogThisResponse = true;
      }
      if (!canLogThisResponse) {
        return;
      }
      const isBatteryResponse = cmdKey === TC.BATTERY;
      if (isBatteryResponse) {
        return;
      }
      console.log("[UDT] Tower response:", ...this.commandToString(receivedData));
    }
    async disconnect() {
      if (!this.TowerDevice) {
        return;
      }
      this.stopConnectionMonitoring();
      if (this.TowerDevice.gatt.connected) {
        this.TowerDevice.removeEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
        await this.TowerDevice.gatt.disconnect();
        console.log("[UDT] Tower disconnected");
        this.handleDisconnection();
      }
    }
    handleDisconnection() {
      this.isConnected = false;
      this.isCalibrated = false;
      this.performingCalibration = false;
      this.stopConnectionMonitoring();
      this.lastBatteryHeartbeat = 0;
      this.lastSuccessfulCommand = 0;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      this.onTowerDisconnect();
    }
    startConnectionMonitoring() {
      if (this.connectionMonitorInterval) {
        clearInterval(this.connectionMonitorInterval);
      }
      this.connectionMonitorInterval = setInterval(() => {
        this.checkConnectionHealth();
      }, this.connectionMonitorFrequency);
    }
    stopConnectionMonitoring() {
      if (this.connectionMonitorInterval) {
        clearInterval(this.connectionMonitorInterval);
        this.connectionMonitorInterval = null;
      }
    }
    checkConnectionHealth() {
      if (!this.isConnected || !this.TowerDevice) {
        return;
      }
      if (!this.TowerDevice.gatt.connected) {
        console.log("[UDT] GATT connection lost detected during health check");
        this.handleDisconnection();
        return;
      }
      if (this.enableBatteryHeartbeatMonitoring) {
        const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
        if (timeSinceLastBatteryHeartbeat > this.batteryHeartbeatTimeout) {
          console.log(`[UDT] Battery heartbeat timeout detected - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`);
          console.log("[UDT] Tower possibly disconnected due to battery depletion or power loss");
          this.handleDisconnection();
          return;
        }
      }
      const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
      if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
        console.log("[UDT] General connection timeout detected - no responses received");
        this.requestTowerState().catch(() => {
          console.log("[UDT] Heartbeat failed - connection appears lost");
          this.handleDisconnection();
        });
      }
    }
    //#endregion
    //#region utility
    async sendTowerCommand(command) {
      var _a, _b, _c;
      try {
        const cmdStr = this.commandToPacketString(command);
        this.logDetail && console.log("[UDT] packet(s) sent:", cmdStr);
        if (!this.txCharacteristic || !this.isConnected) {
          console.log("[UDT] Tower is not connected");
          return;
        }
        await this.txCharacteristic.writeValue(command);
        this.isConnected = true;
        this.retrySendCommandCount = 0;
        this.lastSuccessfulCommand = Date.now();
      } catch (error) {
        console.log("[UDT] command send error:", error);
        const errorMsg = (_a = error == null ? void 0 : error.message) != null ? _a : new String(error);
        const wasCancelled = errorMsg.includes("User cancelled");
        const alreadyInProgress = errorMsg.includes("already in progress");
        const maxRetriesReached = this.retrySendCommandCount >= this.retrySendCommandMax;
        const isDisconnected = errorMsg.includes("Cannot read properties of null") || errorMsg.includes("GATT Server is disconnected") || errorMsg.includes("Device is not connected") || !((_c = (_b = this.TowerDevice) == null ? void 0 : _b.gatt) == null ? void 0 : _c.connected);
        if (isDisconnected) {
          console.log("[UDT] Disconnect detected during command send");
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
    updateCommandWithCurrentDrumPositions(commandPacket) {
      commandPacket[DRUM_PACKETS.topMiddle] = this.currentDrumPositions.topMiddle;
      commandPacket[DRUM_PACKETS.bottom] = this.currentDrumPositions.bottom;
    }
    createLightOverrideCommand(lightOverride) {
      const lightOverrideCommand = new Uint8Array(20);
      lightOverrideCommand[LIGHT_PACKETS.overrides] = lightOverride;
      return lightOverrideCommand;
    }
    createRotateCommand(top, middle, bottom) {
      const rotateCmd = new Uint8Array(20);
      rotateCmd[DRUM_PACKETS.topMiddle] = drumPositionCmds.top[top] | drumPositionCmds.middle[middle];
      rotateCmd[DRUM_PACKETS.bottom] = drumPositionCmds.bottom[bottom];
      return rotateCmd;
    }
    createSoundCommand(soundIndex) {
      const soundCommand = new Uint8Array(20);
      const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, "0"));
      soundCommand[AUDIO_COMMAND_POS] = sound;
      return soundCommand;
    }
    // TODO: return parsed data values rather than raw packet values
    commandToString(command) {
      const cmdValue = command[0];
      const { cmdKey, command: towerCommand } = this.getTowerCommand(cmdValue);
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
          return ["Unmapped Response!", this.commandToPacketString(command)];
          break;
      }
    }
    commandToPacketString(command) {
      let cmdStr = "[";
      command.forEach((n) => cmdStr += n.toString(16) + ",");
      cmdStr = cmdStr.slice(0, -1) + "]";
      return cmdStr;
    }
    getTowerCommand(cmdValue) {
      const cmdKeys = Object.keys(TOWER_MESSAGES);
      const cmdKey = cmdKeys.find((key) => TOWER_MESSAGES[key].value === cmdValue);
      const command = TOWER_MESSAGES[cmdKey];
      return { cmdKey, command };
    }
    getMilliVoltsFromTowerReponse(command) {
      const mv = new Uint8Array(4);
      mv[0] = command[4];
      mv[1] = command[3];
      mv[3] = 0;
      mv[4] = 0;
      var view = new DataView(mv.buffer, 0);
      return view.getUint32(0, true);
    }
    // Tower returns sum total battery level in millivolts
    millVoltsToPercentage(mv) {
      const batLevel = mv ? mv / 3 : 0;
      const levels = VOLTAGE_LEVELS.filter((v) => batLevel >= v);
      return `${levels.length * 5}%`;
    }
    //#endregion
    //#region Connection Management
    /**
     * Enable or disable connection monitoring
     * @param enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled) {
      this.enableConnectionMonitoring = enabled;
      if (enabled && this.isConnected) {
        this.startConnectionMonitoring();
      } else {
        this.stopConnectionMonitoring();
      }
    }
    /**
     * Configure connection monitoring parameters
     * @param frequency - How often to check connection (milliseconds)
     * @param timeout - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency = 2e3, timeout = 3e4) {
      this.connectionMonitorFrequency = frequency;
      this.connectionTimeoutThreshold = timeout;
      if (this.enableConnectionMonitoring && this.isConnected) {
        this.startConnectionMonitoring();
      }
    }
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param enabled - Whether to enable battery heartbeat monitoring
     * @param timeout - How long to wait for battery status before considering disconnected (milliseconds)
     */
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3e3) {
      this.enableBatteryHeartbeatMonitoring = enabled;
      this.batteryHeartbeatTimeout = timeout;
    }
    /**
     * Check if the tower is currently connected
     * @returns Promise<boolean> - True if connected and responsive
     */
    async isConnectedAndResponsive() {
      var _a, _b;
      if (!this.isConnected || !((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected)) {
        return false;
      }
      try {
        await this.requestTowerState();
        return true;
      } catch (error) {
        console.log("[UDT] Connectivity test failed:", error);
        return false;
      }
    }
    /**
     * Get detailed connection status including heartbeat information
     * @returns Object with connection details
     */
    getConnectionStatus() {
      var _a, _b;
      const now = Date.now();
      const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
      const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
      return {
        isConnected: this.isConnected,
        isGattConnected: ((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected) || false,
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
     */
    async cleanup() {
      console.log("[UDT] Cleaning up UltimateDarkTower instance");
      this.stopConnectionMonitoring();
      if (this.TowerDevice) {
        this.TowerDevice.removeEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
      }
      if (navigator.bluetooth) {
        navigator.bluetooth.removeEventListener("availabilitychanged", this.bleAvailabilityChange);
      }
      if (this.isConnected) {
        await this.disconnect();
      }
    }
    //#endregion
  };
  var UltimateDarkTower_default = UltimateDarkTower;

  // src/index.ts
  var src_default = UltimateDarkTower_default;

  // examples/game/TowerGame.ts
  var DarkTower = new src_default();
  var GAME_STATE = {
    //constants
    WIN_SCORE: 10,
    TOTAL_PICKS: 3,
    END_OF_GAME: 6,
    QUIT_GAME_TEXT: "I Concede Defeat",
    //variables
    CurrentMonth: 0,
    TotalPlayerScore: 0,
    RoundScore: 0,
    HasCalibrated: false,
    GameDifficulty: null,
    TowerPicks: [],
    PlayerPicks: [],
    DoorwayLights: [],
    isGameOver: false
  };
  var GameState = Object.create(GAME_STATE);
})();
//# sourceMappingURL=TowerGame.js.map
