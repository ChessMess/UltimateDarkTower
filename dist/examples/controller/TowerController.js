"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/udtConstants.ts
  var UART_SERVICE_UUID, UART_TX_CHARACTERISTIC_UUID, UART_RX_CHARACTERISTIC_UUID, TOWER_DEVICE_NAME, DIS_SERVICE_UUID, DIS_MANUFACTURER_NAME_UUID, DIS_MODEL_NUMBER_UUID, DIS_SERIAL_NUMBER_UUID, DIS_HARDWARE_REVISION_UUID, DIS_FIRMWARE_REVISION_UUID, DIS_SOFTWARE_REVISION_UUID, DIS_SYSTEM_ID_UUID, DIS_IEEE_REGULATORY_UUID, DIS_PNP_ID_UUID, TOWER_COMMAND_PACKET_SIZE, TOWER_STATE_DATA_SIZE, TOWER_STATE_RESPONSE_MIN_LENGTH, TOWER_STATE_DATA_OFFSET, TOWER_COMMAND_TYPE_TOWER_STATE, DEFAULT_CONNECTION_MONITORING_FREQUENCY, DEFAULT_CONNECTION_MONITORING_TIMEOUT, DEFAULT_BATTERY_HEARTBEAT_TIMEOUT, DEFAULT_RETRY_SEND_COMMAND_MAX, TOWER_SIDES_COUNT, TOWER_COMMANDS, TC, DRUM_PACKETS, GLYPHS, AUDIO_COMMAND_POS, SKULL_DROP_COUNT_POS, drumPositionCmds, LIGHT_EFFECTS, TOWER_LIGHT_SEQUENCES, TOWER_MESSAGES, VOLTAGE_LEVELS, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION, STATE_DATA_LENGTH, TOWER_AUDIO_LIBRARY, VOLUME_DESCRIPTIONS, VOLUME_ICONS;
  var init_udtConstants = __esm({
    "src/udtConstants.ts"() {
      "use strict";
      UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
      UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
      UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
      TOWER_DEVICE_NAME = "ReturnToDarkTower";
      DIS_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
      DIS_MANUFACTURER_NAME_UUID = "00002a29-0000-1000-8000-00805f9b34fb";
      DIS_MODEL_NUMBER_UUID = "00002a24-0000-1000-8000-00805f9b34fb";
      DIS_SERIAL_NUMBER_UUID = "00002a25-0000-1000-8000-00805f9b34fb";
      DIS_HARDWARE_REVISION_UUID = "00002a27-0000-1000-8000-00805f9b34fb";
      DIS_FIRMWARE_REVISION_UUID = "00002a26-0000-1000-8000-00805f9b34fb";
      DIS_SOFTWARE_REVISION_UUID = "00002a28-0000-1000-8000-00805f9b34fb";
      DIS_SYSTEM_ID_UUID = "00002a23-0000-1000-8000-00805f9b34fb";
      DIS_IEEE_REGULATORY_UUID = "00002a2a-0000-1000-8000-00805f9b34fb";
      DIS_PNP_ID_UUID = "00002a50-0000-1000-8000-00805f9b34fb";
      TOWER_COMMAND_PACKET_SIZE = 20;
      TOWER_STATE_DATA_SIZE = 19;
      TOWER_STATE_RESPONSE_MIN_LENGTH = 20;
      TOWER_STATE_DATA_OFFSET = 1;
      TOWER_COMMAND_TYPE_TOWER_STATE = 0;
      DEFAULT_CONNECTION_MONITORING_FREQUENCY = 2e3;
      DEFAULT_CONNECTION_MONITORING_TIMEOUT = 3e4;
      DEFAULT_BATTERY_HEARTBEAT_TIMEOUT = 3e3;
      DEFAULT_RETRY_SEND_COMMAND_MAX = 5;
      TOWER_SIDES_COUNT = 4;
      TOWER_COMMANDS = {
        towerState: 0,
        // not a sendable command
        doorReset: 1,
        unjamDrums: 2,
        resetCounter: 3,
        calibration: 4,
        overwriteDrumStates: 5
        // go no further!
      };
      TC = {
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
      DRUM_PACKETS = {
        topMiddle: 1,
        bottom: 2
      };
      GLYPHS = {
        cleanse: { name: "Cleanse", level: "top", side: "north" },
        quest: { name: "Quest", level: "top", side: "south" },
        battle: { name: "Battle", level: "middle", side: "north" },
        banner: { name: "Banner", level: "bottom", side: "north" },
        reinforce: { name: "Reinforce", level: "bottom", side: "south" }
      };
      AUDIO_COMMAND_POS = 15;
      SKULL_DROP_COUNT_POS = 17;
      drumPositionCmds = {
        top: { north: 16, east: 2, south: 20, west: 22 },
        // bits 1-8
        middle: { north: 16, east: 64, south: 144, west: 208 },
        // bits 1-4
        bottom: { north: 66, east: 74, south: 82, west: 90 }
      };
      LIGHT_EFFECTS = {
        off: 0,
        on: 1,
        breathe: 2,
        breatheFast: 3,
        breathe50percent: 4,
        flicker: 5
      };
      TOWER_LIGHT_SEQUENCES = {
        twinkle: 1,
        flareThenFade: 2,
        flareThenFadeBase: 3,
        flareThenFlicker: 4,
        angryStrobe01: 5,
        angryStrobe02: 6,
        angryStrobe03: 7,
        gloat01: 8,
        gloat02: 9,
        gloat03: 10,
        defeat: 11,
        victory: 12,
        dungeonIdle: 13,
        sealReveal: 14,
        rotationAllDrums: 15,
        rotationDrumTop: 16,
        rotationDrumMiddle: 17,
        rotationDrumBottom: 18,
        monthStarted: 19,
        wholeTowerBreathing: 20,
        slowFlareThenFade: 21
      };
      TOWER_MESSAGES = {
        TOWER_STATE: { name: "Tower State", value: 0, critical: false },
        INVALID_STATE: { name: "Invalid State", value: 1, critical: true },
        HARDWARE_FAILURE: { name: "Hardware Failure", value: 2, critical: true },
        MECH_JIGGLE_TRIGGERED: { name: "Unjam Jiggle Triggered", value: 3, critical: true },
        MECH_DURATION: { name: "Rotation Duration", value: 4, critical: false },
        MECH_UNEXPECTED_TRIGGER: { name: "Unexpected Trigger", value: 5, critical: true },
        DIFFERENTIAL_READINGS: { name: "Diff Voltage Readings", value: 6, critical: false },
        BATTERY_READING: { name: "Battery Level", value: 7, critical: false },
        CALIBRATION_FINISHED: { name: "Calibration Finished", value: 8, critical: false }
      };
      VOLTAGE_LEVELS = [
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
      TOWER_LAYERS = {
        TOP_RING: 0,
        MIDDLE_RING: 1,
        BOTTOM_RING: 2,
        LEDGE: 3,
        BASE1: 4,
        BASE2: 5
      };
      RING_LIGHT_POSITIONS = {
        NORTH: 0,
        EAST: 1,
        SOUTH: 2,
        WEST: 3
      };
      LEDGE_BASE_LIGHT_POSITIONS = {
        NORTH_EAST: 0,
        SOUTH_EAST: 1,
        SOUTH_WEST: 2,
        NORTH_WEST: 3
      };
      LAYER_TO_POSITION = {
        [TOWER_LAYERS.TOP_RING]: "TOP_RING",
        [TOWER_LAYERS.MIDDLE_RING]: "MIDDLE_RING",
        [TOWER_LAYERS.BOTTOM_RING]: "BOTTOM_RING",
        [TOWER_LAYERS.LEDGE]: "LEDGE",
        [TOWER_LAYERS.BASE1]: "BASE1",
        [TOWER_LAYERS.BASE2]: "BASE2"
      };
      LIGHT_INDEX_TO_DIRECTION = {
        [RING_LIGHT_POSITIONS.NORTH]: "NORTH",
        [RING_LIGHT_POSITIONS.EAST]: "EAST",
        [RING_LIGHT_POSITIONS.SOUTH]: "SOUTH",
        [RING_LIGHT_POSITIONS.WEST]: "WEST"
      };
      STATE_DATA_LENGTH = 19;
      TOWER_AUDIO_LIBRARY = {
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
      VOLUME_DESCRIPTIONS = {
        0: "Loud",
        1: "Medium",
        2: "Quiet",
        3: "Mute"
      };
      VOLUME_ICONS = {
        0: "\u{1F50A}",
        // Loud - biggest speaker
        1: "\u{1F509}",
        // Medium - medium speaker
        2: "\u{1F508}",
        // Quiet - small speaker
        3: "\u{1F507}"
        // Mute - muted speaker
      };
    }
  });

  // src/udtBluetoothAdapter.ts
  var BluetoothError, BluetoothConnectionError, BluetoothDeviceNotFoundError, BluetoothUserCancelledError, BluetoothTimeoutError;
  var init_udtBluetoothAdapter = __esm({
    "src/udtBluetoothAdapter.ts"() {
      "use strict";
      BluetoothError = class extends Error {
        constructor(message, originalError) {
          super(message);
          this.originalError = originalError;
          this.name = "BluetoothError";
        }
      };
      BluetoothConnectionError = class extends BluetoothError {
        constructor(message, originalError) {
          super(message, originalError);
          this.name = "BluetoothConnectionError";
        }
      };
      BluetoothDeviceNotFoundError = class extends BluetoothError {
        constructor(message, originalError) {
          super(message, originalError);
          this.name = "BluetoothDeviceNotFoundError";
        }
      };
      BluetoothUserCancelledError = class extends BluetoothError {
        constructor(message, originalError) {
          super(message, originalError);
          this.name = "BluetoothUserCancelledError";
        }
      };
      BluetoothTimeoutError = class extends BluetoothError {
        constructor(message, originalError) {
          super(message, originalError);
          this.name = "BluetoothTimeoutError";
        }
      };
    }
  });

  // src/adapters/WebBluetoothAdapter.ts
  var WebBluetoothAdapter_exports = {};
  __export(WebBluetoothAdapter_exports, {
    WebBluetoothAdapter: () => WebBluetoothAdapter
  });
  var WebBluetoothAdapter;
  var init_WebBluetoothAdapter = __esm({
    "src/adapters/WebBluetoothAdapter.ts"() {
      "use strict";
      init_udtConstants();
      init_udtBluetoothAdapter();
      WebBluetoothAdapter = class {
        constructor() {
          this.device = null;
          this.txCharacteristic = null;
          this.rxCharacteristic = null;
          // Bound event handlers for cleanup
          this.boundOnCharacteristicValueChanged = null;
          this.boundOnDeviceDisconnected = null;
          this.boundOnAvailabilityChanged = null;
        }
        async connect(deviceName, serviceUuids) {
          try {
            this.device = await navigator.bluetooth.requestDevice({
              filters: [{ namePrefix: deviceName }],
              optionalServices: serviceUuids
            });
            if (this.device === null) {
              throw new BluetoothDeviceNotFoundError("Tower not found");
            }
            this.boundOnDeviceDisconnected = () => {
              if (this.disconnectCallback) {
                this.disconnectCallback();
              }
            };
            this.device.addEventListener("gattserverdisconnected", this.boundOnDeviceDisconnected);
            this.boundOnAvailabilityChanged = (event) => {
              if (this.availabilityCallback) {
                this.availabilityCallback(event.value);
              }
            };
            if (navigator.bluetooth) {
              navigator.bluetooth.addEventListener("availabilitychanged", this.boundOnAvailabilityChanged);
            }
            const server = await this.device.gatt.connect();
            const service = await server.getPrimaryService(UART_SERVICE_UUID);
            this.txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
            await this.rxCharacteristic.startNotifications();
            this.boundOnCharacteristicValueChanged = (event) => {
              const target = event.target;
              const dataView = target.value;
              const receivedData = new Uint8Array(dataView.byteLength);
              for (let i = 0; i < dataView.byteLength; i++) {
                receivedData[i] = dataView.getUint8(i);
              }
              if (this.characteristicCallback) {
                this.characteristicCallback(receivedData);
              }
            };
            await this.rxCharacteristic.addEventListener(
              "characteristicvaluechanged",
              this.boundOnCharacteristicValueChanged
            );
          } catch (error) {
            if (error instanceof BluetoothDeviceNotFoundError || error instanceof BluetoothUserCancelledError || error instanceof BluetoothConnectionError) {
              throw error;
            }
            const errorMsg = error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : "";
            if (errorMsg.includes("User cancelled")) {
              throw new BluetoothUserCancelledError("User cancelled device selection", error);
            }
            if (errorMsg.includes("not found") || errorName === "NotFoundError") {
              throw new BluetoothDeviceNotFoundError("Device not found", error);
            }
            throw new BluetoothConnectionError(`Failed to connect: ${errorMsg}`, error);
          }
        }
        async disconnect() {
          var _a2, _b;
          if (!this.device) {
            return;
          }
          if ((_a2 = this.device.gatt) == null ? void 0 : _a2.connected) {
            if (this.boundOnDeviceDisconnected) {
              this.device.removeEventListener("gattserverdisconnected", this.boundOnDeviceDisconnected);
            }
            await ((_b = this.device.gatt) == null ? void 0 : _b.disconnect());
          }
          this.device = null;
          this.txCharacteristic = null;
          this.rxCharacteristic = null;
        }
        isConnected() {
          return !!this.device;
        }
        isGattConnected() {
          var _a2, _b, _c;
          return (_c = (_b = (_a2 = this.device) == null ? void 0 : _a2.gatt) == null ? void 0 : _b.connected) != null ? _c : false;
        }
        async writeCharacteristic(data) {
          if (!this.txCharacteristic) {
            throw new BluetoothConnectionError("TX characteristic not available");
          }
          await this.txCharacteristic.writeValue(data);
        }
        onCharacteristicValueChanged(callback) {
          this.characteristicCallback = callback;
        }
        onDisconnect(callback) {
          this.disconnectCallback = callback;
        }
        onBluetoothAvailabilityChanged(callback) {
          this.availabilityCallback = callback;
        }
        async readDeviceInformation() {
          var _a2, _b;
          const info = {};
          if (!((_b = (_a2 = this.device) == null ? void 0 : _a2.gatt) == null ? void 0 : _b.connected)) {
            return info;
          }
          try {
            const disService = await this.device.gatt.getPrimaryService(DIS_SERVICE_UUID);
            const characteristicMap = [
              { uuid: DIS_MANUFACTURER_NAME_UUID, key: "manufacturerName", binary: false },
              { uuid: DIS_MODEL_NUMBER_UUID, key: "modelNumber", binary: false },
              { uuid: DIS_SERIAL_NUMBER_UUID, key: "serialNumber", binary: false },
              { uuid: DIS_HARDWARE_REVISION_UUID, key: "hardwareRevision", binary: false },
              { uuid: DIS_FIRMWARE_REVISION_UUID, key: "firmwareRevision", binary: false },
              { uuid: DIS_SOFTWARE_REVISION_UUID, key: "softwareRevision", binary: false },
              { uuid: DIS_SYSTEM_ID_UUID, key: "systemId", binary: true },
              { uuid: DIS_IEEE_REGULATORY_UUID, key: "ieeeRegulatory", binary: false },
              { uuid: DIS_PNP_ID_UUID, key: "pnpId", binary: true }
            ];
            for (const { uuid, key, binary } of characteristicMap) {
              try {
                const characteristic = await disService.getCharacteristic(uuid);
                const value = await characteristic.readValue();
                if (binary) {
                  const hexValue = Array.from(new Uint8Array(value.buffer)).map((b) => b.toString(16).padStart(2, "0")).join(":");
                  info[key] = hexValue;
                } else {
                  info[key] = new TextDecoder().decode(value);
                }
              } catch (e) {
              }
            }
            info.lastUpdated = /* @__PURE__ */ new Date();
          } catch (e) {
          }
          return info;
        }
        async cleanup() {
          if (navigator.bluetooth && this.boundOnAvailabilityChanged) {
            navigator.bluetooth.removeEventListener("availabilitychanged", this.boundOnAvailabilityChanged);
          }
          if (this.device && this.boundOnDeviceDisconnected) {
            this.device.removeEventListener("gattserverdisconnected", this.boundOnDeviceDisconnected);
          }
          if (this.isConnected()) {
            await this.disconnect();
          }
        }
      };
    }
  });

  // src/adapters/NodeBluetoothAdapter.ts
  var NodeBluetoothAdapter_exports = {};
  __export(NodeBluetoothAdapter_exports, {
    NodeBluetoothAdapter: () => NodeBluetoothAdapter
  });
  var noble, _a, NodeBluetoothAdapter;
  var init_NodeBluetoothAdapter = __esm({
    "src/adapters/NodeBluetoothAdapter.ts"() {
      "use strict";
      init_udtBluetoothAdapter();
      init_udtConstants();
      try {
        if (typeof process !== "undefined" && ((_a = process.versions) == null ? void 0 : _a.node)) {
          noble = __require("@stoprocent/noble");
        }
      } catch (e) {
      }
      NodeBluetoothAdapter = class {
        constructor() {
          this.peripheral = null;
          this.txCharacteristic = null;
          this.rxCharacteristic = null;
          this.allCharacteristics = [];
          this.isConnectedFlag = false;
        }
        /**
         * Waits for Noble's BLE adapter to reach 'poweredOn' state.
         * Uses @stoprocent/noble's built-in waitForPoweredOnAsync().
         */
        async ensureNobleReady() {
          if (!noble) {
            throw new BluetoothConnectionError(
              "@stoprocent/noble not found. Install with: npm install @stoprocent/noble"
            );
          }
          try {
            await noble.waitForPoweredOnAsync();
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new BluetoothConnectionError(
              `Bluetooth adapter not ready: ${msg}`,
              error
            );
          }
        }
        async connect(deviceName, serviceUuids) {
          var _a2, _b;
          try {
            await this.ensureNobleReady();
            if (this.availabilityCallback) {
              this.availabilityCallback(true);
              this.boundStateChangeHandler = (state) => {
                if (this.availabilityCallback) {
                  this.availabilityCallback(state === "poweredOn");
                }
              };
              noble.on("stateChange", this.boundStateChangeHandler);
            }
            const normalizedUuids = serviceUuids.map((u) => this.normalizeUuid(u));
            const peripheral = await this.scanForDevice(deviceName, normalizedUuids, 1e4);
            this.peripheral = peripheral;
            this.boundDisconnectHandler = () => {
              this.isConnectedFlag = false;
              if (this.disconnectCallback) {
                this.disconnectCallback();
              }
            };
            this.peripheral.once("disconnect", this.boundDisconnectHandler);
            await this.peripheral.connectAsync();
            this.isConnectedFlag = true;
            const txUuid = this.normalizeUuid(UART_TX_CHARACTERISTIC_UUID);
            const rxUuid = this.normalizeUuid(UART_RX_CHARACTERISTIC_UUID);
            const { characteristics } = await this.peripheral.discoverAllServicesAndCharacteristicsAsync();
            this.allCharacteristics = characteristics;
            this.txCharacteristic = (_a2 = characteristics.find(
              (c) => this.normalizeUuid(c.uuid) === txUuid
            )) != null ? _a2 : null;
            this.rxCharacteristic = (_b = characteristics.find(
              (c) => this.normalizeUuid(c.uuid) === rxUuid
            )) != null ? _b : null;
            if (!this.txCharacteristic || !this.rxCharacteristic) {
              throw new BluetoothConnectionError(
                "TX or RX characteristic not found on device"
              );
            }
            await this.rxCharacteristic.subscribeAsync();
            this.boundDataHandler = (data) => {
              if (this.characteristicCallback) {
                this.characteristicCallback(new Uint8Array(data));
              }
            };
            this.rxCharacteristic.on("data", this.boundDataHandler);
          } catch (error) {
            await this.cleanup();
            if (error instanceof BluetoothDeviceNotFoundError || error instanceof BluetoothConnectionError || error instanceof BluetoothTimeoutError) {
              throw error;
            }
            const msg = error instanceof Error ? error.message : String(error);
            throw new BluetoothConnectionError(
              `Connection failed: ${msg}`,
              error
            );
          }
        }
        async disconnect() {
          if (!this.peripheral) return;
          try {
            if (this.rxCharacteristic) {
              if (this.boundDataHandler) {
                this.rxCharacteristic.removeListener("data", this.boundDataHandler);
              }
              await this.rxCharacteristic.unsubscribeAsync();
            }
            await this.peripheral.disconnectAsync();
          } catch (e) {
          } finally {
            this.peripheral = null;
            this.txCharacteristic = null;
            this.rxCharacteristic = null;
            this.allCharacteristics = [];
            this.isConnectedFlag = false;
          }
        }
        isConnected() {
          return this.isConnectedFlag && !!this.peripheral;
        }
        isGattConnected() {
          return this.isConnectedFlag && !!this.peripheral && this.peripheral.state === "connected";
        }
        async writeCharacteristic(data) {
          if (!this.txCharacteristic) {
            throw new BluetoothConnectionError("TX characteristic not available");
          }
          try {
            const buffer = Buffer.from(data);
            await this.txCharacteristic.writeAsync(buffer, false);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            throw new BluetoothConnectionError(
              `Write failed: ${msg}`,
              error
            );
          }
        }
        onCharacteristicValueChanged(callback) {
          this.characteristicCallback = callback;
        }
        onDisconnect(callback) {
          this.disconnectCallback = callback;
        }
        onBluetoothAvailabilityChanged(callback) {
          this.availabilityCallback = callback;
        }
        async readDeviceInformation() {
          const info = {};
          if (!this.peripheral || !this.isConnectedFlag) {
            return info;
          }
          try {
            const characteristics = this.allCharacteristics;
            const characteristicMap = [
              {
                uuid: DIS_MANUFACTURER_NAME_UUID,
                key: "manufacturerName",
                binary: false
              },
              {
                uuid: DIS_MODEL_NUMBER_UUID,
                key: "modelNumber",
                binary: false
              },
              {
                uuid: DIS_SERIAL_NUMBER_UUID,
                key: "serialNumber",
                binary: false
              },
              {
                uuid: DIS_HARDWARE_REVISION_UUID,
                key: "hardwareRevision",
                binary: false
              },
              {
                uuid: DIS_FIRMWARE_REVISION_UUID,
                key: "firmwareRevision",
                binary: false
              },
              {
                uuid: DIS_SOFTWARE_REVISION_UUID,
                key: "softwareRevision",
                binary: false
              },
              { uuid: DIS_SYSTEM_ID_UUID, key: "systemId", binary: true },
              {
                uuid: DIS_IEEE_REGULATORY_UUID,
                key: "ieeeRegulatory",
                binary: false
              },
              { uuid: DIS_PNP_ID_UUID, key: "pnpId", binary: true }
            ];
            for (const { uuid, key, binary } of characteristicMap) {
              const normalizedUuid = this.normalizeUuid(uuid);
              const shortUuid = this.toShortUuid(uuid);
              const char = characteristics.find(
                (c) => {
                  const cUuid = this.normalizeUuid(c.uuid);
                  return cUuid === normalizedUuid || cUuid === shortUuid;
                }
              );
              if (!char) continue;
              try {
                const buffer = await char.readAsync();
                if (binary) {
                  const hexValue = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join(":");
                  info[key] = hexValue;
                } else {
                  info[key] = buffer.toString("utf-8");
                }
              } catch (e) {
              }
            }
            info.lastUpdated = /* @__PURE__ */ new Date();
          } catch (e) {
          }
          return info;
        }
        async cleanup() {
          if (noble) {
            if (this.boundStateChangeHandler) {
              noble.removeListener(
                "stateChange",
                this.boundStateChangeHandler
              );
            }
          }
          if (this.peripheral && this.boundDisconnectHandler) {
            this.peripheral.removeListener(
              "disconnect",
              this.boundDisconnectHandler
            );
          }
          await this.disconnect();
          this.characteristicCallback = void 0;
          this.disconnectCallback = void 0;
          this.availabilityCallback = void 0;
        }
        /**
         * Scans for a BLE device by name using Noble's event-driven discovery
         */
        async scanForDevice(deviceName, serviceUuids, timeoutMs) {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              noble.stopScanning();
              noble.removeListener("discover", onDiscover);
              reject(
                new BluetoothTimeoutError(
                  `Device scan timeout after ${timeoutMs}ms`
                )
              );
            }, timeoutMs);
            const onDiscover = (peripheral) => {
              var _a2;
              const name = (_a2 = peripheral.advertisement) == null ? void 0 : _a2.localName;
              if (name && name.startsWith(deviceName)) {
                clearTimeout(timeout);
                noble.stopScanning();
                noble.removeListener("discover", onDiscover);
                resolve(peripheral);
              }
            };
            noble.on("discover", onDiscover);
            noble.startScanning(serviceUuids, false);
          });
        }
        /**
         * Normalizes UUID to Noble's format (lowercase, no dashes)
         */
        normalizeUuid(uuid) {
          return uuid.toLowerCase().replace(/-/g, "");
        }
        /**
         * Extracts the short 4-character UUID from a standard 128-bit BLE UUID.
         * Standard BLE UUIDs follow the pattern 0000XXXX-0000-1000-8000-00805f9b34fb
         * where XXXX is the short UUID. Noble uses this short form for standard characteristics.
         */
        toShortUuid(uuid) {
          const normalized = this.normalizeUuid(uuid);
          const baseSuffix = "00001000800000805f9b34fb";
          if (normalized.startsWith("0000") && normalized.endsWith(baseSuffix)) {
            return normalized.substring(4, 8);
          }
          return normalized;
        }
      };
    }
  });

  // src/adapters/NoopBluetoothAdapter.ts
  var NoopBluetoothAdapter_exports = {};
  __export(NoopBluetoothAdapter_exports, {
    NoopBluetoothAdapter: () => NoopBluetoothAdapter
  });
  var NoopBluetoothAdapter;
  var init_NoopBluetoothAdapter = __esm({
    "src/adapters/NoopBluetoothAdapter.ts"() {
      "use strict";
      init_udtBluetoothAdapter();
      NoopBluetoothAdapter = class {
        async connect(_deviceName, _serviceUuids) {
          void _deviceName;
          void _serviceUuids;
          throw new BluetoothError("Bluetooth is disabled (platform: none)");
        }
        async disconnect() {
        }
        isConnected() {
          return false;
        }
        isGattConnected() {
          return false;
        }
        async writeCharacteristic(_data) {
          void _data;
          throw new BluetoothError("Bluetooth is disabled (platform: none)");
        }
        onCharacteristicValueChanged(callback) {
          this.characteristicCallback = callback;
        }
        onDisconnect(callback) {
          this.disconnectCallback = callback;
        }
        onBluetoothAvailabilityChanged(callback) {
          this.availabilityCallback = callback;
        }
        async readDeviceInformation() {
          return {};
        }
        async cleanup() {
        }
      };
    }
  });

  // examples/controller/TowerEmulatorAdapter.ts
  var EMULATED_BATTERY_MV = 3600;
  var BATTERY_HEARTBEAT_INTERVAL_MS = 200;
  var INITIAL_STATE_RESPONSE_DELAY_MS = 0;
  var COMMAND_RESPONSE_DELAY_MS = 50;
  var CALIBRATION_FALLBACK_MS = 3e4;
  var TOWER_STATE_RESPONSE = 0;
  var BATTERY_RESPONSE = 7;
  var CMD_CALIBRATE = 4;
  var TowerEmulatorAdapter = class {
    constructor(options = {}) {
      this.options = options;
      this.connected = false;
      // Set while a calibration command is awaiting its completion reply. The reply
      // fires from completeCalibration() (popup-driven) or the fallback timer.
      this.calibrationPending = false;
      // Tracks the last 20-byte stateful command so non-stateful responses preserve current state
      this.lastStatePacket = new Uint8Array(20);
    }
    async connect(_deviceName, _serviceUuids) {
      this.connected = true;
      setTimeout(() => {
        var _a2;
        (_a2 = this.rxCallback) == null ? void 0 : _a2.call(this, new Uint8Array(this.lastStatePacket));
      }, INITIAL_STATE_RESPONSE_DELAY_MS);
      this.batteryInterval = setInterval(() => {
        var _a2;
        (_a2 = this.rxCallback) == null ? void 0 : _a2.call(this, this.createBatteryResponse());
      }, BATTERY_HEARTBEAT_INTERVAL_MS);
    }
    async disconnect() {
      this.connected = false;
      this.stopBatteryHeartbeat();
      this.cancelCalibration();
    }
    /**
     * Emit the calibrated TOWER_STATE response that signals calibration is
     * complete. Called by the controller when the emulator popup reports its
     * visual sweep has finished (or by the fallback timer). No-op unless a
     * calibration command is currently pending, so stray calls can't inject a
     * spurious state.
     */
    completeCalibration() {
      var _a2;
      if (!this.calibrationPending) return;
      this.cancelCalibration();
      const calibratedResponse = this.createCalibratedStateResponse();
      this.lastStatePacket = new Uint8Array(calibratedResponse);
      (_a2 = this.rxCallback) == null ? void 0 : _a2.call(this, calibratedResponse);
    }
    cancelCalibration() {
      this.calibrationPending = false;
      if (this.calibrationFallbackTimer) {
        clearTimeout(this.calibrationFallbackTimer);
        this.calibrationFallbackTimer = void 0;
      }
    }
    isConnected() {
      return this.connected;
    }
    isGattConnected() {
      return this.connected;
    }
    async writeCharacteristic(data) {
      var _a2, _b, _c, _d;
      const commandType = data[0];
      if (data.length >= 20 && commandType === TOWER_STATE_RESPONSE) {
        this.lastStatePacket = new Uint8Array(data);
        setTimeout(() => {
          var _a3;
          return (_a3 = this.rxCallback) == null ? void 0 : _a3.call(this, new Uint8Array(data));
        }, COMMAND_RESPONSE_DELAY_MS);
        const sample = data[15] & 127;
        if (sample !== 0) {
          const loop = !!(data[15] & 128);
          const volume = (data[18] & 240) >> 4;
          (_b = (_a2 = this.options).onAudioCommand) == null ? void 0 : _b.call(_a2, sample, loop, volume);
        }
        const sequenceId = data[19];
        if (sequenceId !== 0) {
          (_d = (_c = this.options).onLightSequenceCommand) == null ? void 0 : _d.call(_c, sequenceId);
        }
      } else if (data.length === 1 && commandType === CMD_CALIBRATE) {
        this.calibrationPending = true;
        if (this.calibrationFallbackTimer) clearTimeout(this.calibrationFallbackTimer);
        this.calibrationFallbackTimer = setTimeout(() => this.completeCalibration(), CALIBRATION_FALLBACK_MS);
        setTimeout(() => {
          var _a3;
          return (_a3 = this.rxCallback) == null ? void 0 : _a3.call(this, new Uint8Array(this.lastStatePacket));
        }, COMMAND_RESPONSE_DELAY_MS);
      } else {
        setTimeout(
          () => {
            var _a3;
            return (_a3 = this.rxCallback) == null ? void 0 : _a3.call(this, new Uint8Array(this.lastStatePacket));
          },
          COMMAND_RESPONSE_DELAY_MS
        );
      }
    }
    onCharacteristicValueChanged(callback) {
      this.rxCallback = callback;
    }
    onDisconnect(callback) {
      this.disconnectCallback = callback;
    }
    onBluetoothAvailabilityChanged(callback) {
      this.availabilityCallback = callback;
    }
    async readDeviceInformation() {
      return {
        modelNumber: "Tower Emulator",
        firmwareRevision: "0.0.0"
      };
    }
    async cleanup() {
      this.connected = false;
      this.stopBatteryHeartbeat();
      this.cancelCalibration();
      this.lastStatePacket = new Uint8Array(20);
      this.rxCallback = void 0;
      this.disconnectCallback = void 0;
      this.availabilityCallback = void 0;
    }
    stopBatteryHeartbeat() {
      if (this.batteryInterval) {
        clearInterval(this.batteryInterval);
        this.batteryInterval = void 0;
      }
    }
    createBatteryResponse() {
      const response = new Uint8Array(5);
      response[0] = BATTERY_RESPONSE;
      response[3] = EMULATED_BATTERY_MV >> 8 & 255;
      response[4] = EMULATED_BATTERY_MV & 255;
      return response;
    }
    createCalibratedStateResponse() {
      const response = new Uint8Array(20);
      response[0] = TOWER_STATE_RESPONSE;
      response[1] = 16;
      response[2] = 66;
      return response;
    }
  };

  // src/UltimateDarkTower.ts
  init_udtConstants();

  // src/udtTowerState.ts
  init_udtConstants();
  function rtdt_unpack_state(data) {
    const state = {
      drum: [
        { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
        { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
        { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
      ],
      layer: [
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
      ],
      audio: { sample: 0, loop: false, volume: 0 },
      beam: { count: 0, fault: false },
      led_sequence: 0
    };
    state.drum[0].jammed = !!(data[0] & 8);
    state.drum[0].calibrated = !!(data[0] & 16);
    state.drum[1].jammed = !!(data[1] & 1);
    state.drum[1].calibrated = !!(data[1] & 2);
    state.drum[2].jammed = !!(data[1] & 32);
    state.drum[2].calibrated = !!(data[1] & 64);
    state.drum[0].position = (data[0] & 6) >> 1;
    state.drum[1].position = (data[0] & 192) >> 6;
    state.drum[2].position = (data[1] & 24) >> 3;
    state.drum[0].playSound = !!(data[0] & 1);
    state.drum[1].playSound = !!(data[0] & 32);
    state.drum[2].playSound = !!(data[1] & 4);
    state.layer[0].light[0].effect = (data[2] & 224) >> 5;
    state.layer[0].light[0].loop = !!(data[2] & 16);
    state.layer[0].light[1].effect = (data[2] & 14) >> 1;
    state.layer[0].light[1].loop = !!(data[2] & 1);
    state.layer[0].light[2].effect = (data[3] & 224) >> 5;
    state.layer[0].light[2].loop = !!(data[3] & 16);
    state.layer[0].light[3].effect = (data[3] & 14) >> 1;
    state.layer[0].light[3].loop = !!(data[3] & 1);
    state.layer[1].light[0].effect = (data[4] & 224) >> 5;
    state.layer[1].light[0].loop = !!(data[4] & 16);
    state.layer[1].light[1].effect = (data[4] & 14) >> 1;
    state.layer[1].light[1].loop = !!(data[4] & 1);
    state.layer[1].light[2].effect = (data[5] & 224) >> 5;
    state.layer[1].light[2].loop = !!(data[5] & 16);
    state.layer[1].light[3].effect = (data[5] & 14) >> 1;
    state.layer[1].light[3].loop = !!(data[5] & 1);
    state.layer[2].light[0].effect = (data[6] & 224) >> 5;
    state.layer[2].light[0].loop = !!(data[6] & 16);
    state.layer[2].light[1].effect = (data[6] & 14) >> 1;
    state.layer[2].light[1].loop = !!(data[6] & 1);
    state.layer[2].light[2].effect = (data[7] & 224) >> 5;
    state.layer[2].light[2].loop = !!(data[7] & 16);
    state.layer[2].light[3].effect = (data[7] & 14) >> 1;
    state.layer[2].light[3].loop = !!(data[7] & 1);
    state.layer[3].light[0].effect = (data[8] & 224) >> 5;
    state.layer[3].light[0].loop = !!(data[8] & 16);
    state.layer[3].light[1].effect = (data[8] & 14) >> 1;
    state.layer[3].light[1].loop = !!(data[8] & 1);
    state.layer[3].light[2].effect = (data[9] & 224) >> 5;
    state.layer[3].light[2].loop = !!(data[9] & 16);
    state.layer[3].light[3].effect = (data[9] & 14) >> 1;
    state.layer[3].light[3].loop = !!(data[9] & 1);
    state.layer[4].light[0].effect = (data[10] & 224) >> 5;
    state.layer[4].light[0].loop = !!(data[10] & 16);
    state.layer[4].light[1].effect = (data[10] & 14) >> 1;
    state.layer[4].light[1].loop = !!(data[10] & 1);
    state.layer[4].light[2].effect = (data[11] & 224) >> 5;
    state.layer[4].light[2].loop = !!(data[11] & 16);
    state.layer[4].light[3].effect = (data[11] & 14) >> 1;
    state.layer[4].light[3].loop = !!(data[11] & 1);
    state.layer[5].light[0].effect = (data[12] & 224) >> 5;
    state.layer[5].light[0].loop = !!(data[12] & 16);
    state.layer[5].light[1].effect = (data[12] & 14) >> 1;
    state.layer[5].light[1].loop = !!(data[12] & 1);
    state.layer[5].light[2].effect = (data[13] & 224) >> 5;
    state.layer[5].light[2].loop = !!(data[13] & 16);
    state.layer[5].light[3].effect = (data[13] & 14) >> 1;
    state.layer[5].light[3].loop = !!(data[13] & 1);
    state.audio.sample = data[14] & 127;
    state.audio.loop = !!(data[14] & 128);
    state.beam.count = data[15] << 8 | data[16];
    state.beam.fault = !!(data[17] & 1);
    state.drum[0].reverse = !!(data[17] & 2);
    state.drum[1].reverse = !!(data[17] & 4);
    state.drum[2].reverse = !!(data[17] & 8);
    state.audio.volume = (data[17] & 240) >> 4;
    state.led_sequence = data[18];
    return state;
  }
  function rtdt_pack_state(data, len, state) {
    if (!data || len < STATE_DATA_LENGTH)
      return false;
    data.fill(0, 0, STATE_DATA_LENGTH);
    data[0] |= (state.drum[0].playSound ? 1 : 0) | (state.drum[0].position & 3) << 1 | (state.drum[0].jammed ? 1 : 0) << 3 | (state.drum[0].calibrated ? 1 : 0) << 4 | (state.drum[1].playSound ? 1 : 0) << 5 | (state.drum[1].position & 3) << 6;
    data[1] |= (state.drum[1].jammed ? 1 : 0) | (state.drum[1].calibrated ? 1 : 0) << 1 | (state.drum[2].playSound ? 1 : 0) << 2 | (state.drum[2].position & 3) << 3 | (state.drum[2].jammed ? 1 : 0) << 5 | (state.drum[2].calibrated ? 1 : 0) << 6;
    data[2] |= state.layer[0].light[0].effect << 5 | (state.layer[0].light[0].loop ? 1 : 0) << 4;
    data[2] |= state.layer[0].light[1].effect << 1 | (state.layer[0].light[1].loop ? 1 : 0);
    data[3] |= state.layer[0].light[2].effect << 5 | (state.layer[0].light[2].loop ? 1 : 0) << 4;
    data[3] |= state.layer[0].light[3].effect << 1 | (state.layer[0].light[3].loop ? 1 : 0);
    data[4] |= state.layer[1].light[0].effect << 5 | (state.layer[1].light[0].loop ? 1 : 0) << 4;
    data[4] |= state.layer[1].light[1].effect << 1 | (state.layer[1].light[1].loop ? 1 : 0);
    data[5] |= state.layer[1].light[2].effect << 5 | (state.layer[1].light[2].loop ? 1 : 0) << 4;
    data[5] |= state.layer[1].light[3].effect << 1 | (state.layer[1].light[3].loop ? 1 : 0);
    data[6] |= state.layer[2].light[0].effect << 5 | (state.layer[2].light[0].loop ? 1 : 0) << 4;
    data[6] |= state.layer[2].light[1].effect << 1 | (state.layer[2].light[1].loop ? 1 : 0);
    data[7] |= state.layer[2].light[2].effect << 5 | (state.layer[2].light[2].loop ? 1 : 0) << 4;
    data[7] |= state.layer[2].light[3].effect << 1 | (state.layer[2].light[3].loop ? 1 : 0);
    data[8] |= state.layer[3].light[0].effect << 5 | (state.layer[3].light[0].loop ? 1 : 0) << 4;
    data[8] |= state.layer[3].light[1].effect << 1 | (state.layer[3].light[1].loop ? 1 : 0);
    data[9] |= state.layer[3].light[2].effect << 5 | (state.layer[3].light[2].loop ? 1 : 0) << 4;
    data[9] |= state.layer[3].light[3].effect << 1 | (state.layer[3].light[3].loop ? 1 : 0);
    data[10] |= state.layer[4].light[0].effect << 5 | (state.layer[4].light[0].loop ? 1 : 0) << 4;
    data[10] |= state.layer[4].light[1].effect << 1 | (state.layer[4].light[1].loop ? 1 : 0);
    data[11] |= state.layer[4].light[2].effect << 5 | (state.layer[4].light[2].loop ? 1 : 0) << 4;
    data[11] |= state.layer[4].light[3].effect << 1 | (state.layer[4].light[3].loop ? 1 : 0);
    data[12] |= state.layer[5].light[0].effect << 5 | (state.layer[5].light[0].loop ? 1 : 0) << 4;
    data[12] |= state.layer[5].light[1].effect << 1 | (state.layer[5].light[1].loop ? 1 : 0);
    data[13] |= state.layer[5].light[2].effect << 5 | (state.layer[5].light[2].loop ? 1 : 0) << 4;
    data[13] |= state.layer[5].light[3].effect << 1 | (state.layer[5].light[3].loop ? 1 : 0);
    data[14] = state.audio.sample | (state.audio.loop ? 1 : 0) << 7;
    data[15] = state.beam.count >> 8;
    data[16] = state.beam.count & 255;
    data[17] = state.audio.volume << 4 | (state.beam.fault ? 1 : 0) | (state.drum[0].reverse ? 1 : 0) << 1 | (state.drum[1].reverse ? 1 : 0) << 2 | (state.drum[2].reverse ? 1 : 0) << 3;
    data[18] = state.led_sequence;
    return true;
  }
  function isCalibrated(state) {
    return state.drum.every((drum) => drum.calibrated);
  }

  // src/udtHelpers.ts
  init_udtConstants();
  function calculateBatteryPercentage(mv) {
    const batLevel = mv ? mv / 3 : 0;
    const levels = VOLTAGE_LEVELS.filter((v) => batLevel >= v);
    return levels.length * 5;
  }
  function milliVoltsToPercentageNumber(mv) {
    return calculateBatteryPercentage(mv);
  }
  function milliVoltsToPercentage(mv) {
    return `${calculateBatteryPercentage(mv)}%`;
  }
  function getMilliVoltsFromTowerResponse(command) {
    const mv = new Uint8Array(4);
    mv[0] = command[4];
    mv[1] = command[3];
    mv[2] = 0;
    mv[3] = 0;
    const view = new DataView(mv.buffer, 0);
    return view.getUint32(0, true);
  }
  function commandToPacketString(command) {
    if (command.length === 0) {
      return "[]";
    }
    let cmdStr = "[";
    command.forEach((n) => cmdStr += n.toString(16) + ",");
    cmdStr = cmdStr.slice(0, -1) + "]";
    return cmdStr;
  }
  function parseDifferentialReadings(response) {
    if (response.length < 5 || response[0] !== 6) {
      return null;
    }
    const drum1 = response[2];
    const drum2 = response[3];
    const drum3 = response[4];
    const irBeam = response[1];
    return {
      irBeam,
      drum1,
      drum2,
      drum3,
      timestamp: Date.now(),
      rawData: new Uint8Array(response)
    };
  }
  function createDefaultTowerState() {
    return {
      drum: [
        { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
        { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
        { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
      ],
      layer: [
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
        { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
      ],
      audio: { sample: 0, loop: false, volume: 0 },
      beam: { count: 0, fault: false },
      led_sequence: 0
    };
  }

  // src/udtLogger.ts
  var ConsoleOutput = class {
    write(level, message) {
      switch (level) {
        case "debug":
          console.debug(message);
          break;
        case "info":
          console.info(message);
          break;
        case "warn":
          console.warn(message);
          break;
        case "error":
          console.error(message);
          break;
      }
    }
  };
  var DOMOutput = class {
    constructor(containerId, maxLines = 100) {
      this.container = null;
      this.maxLines = 100;
      this.allEntries = [];
      this.container = typeof document !== "undefined" ? document.getElementById(containerId) : null;
      this.maxLines = maxLines;
    }
    write(level, message, timestamp) {
      if (!this.container) return;
      this.allEntries.push({ level, message, timestamp });
      let removedEntries = false;
      while (this.allEntries.length > this.maxLines) {
        this.allEntries.shift();
        removedEntries = true;
      }
      if (removedEntries) {
        this.refreshDisplay();
        return;
      }
      const enabledLevels = this.getEnabledLevelsFromCheckboxes();
      if (enabledLevels.has(level)) {
        const textFilter = this.getTextFilter();
        if (!textFilter || message.toLowerCase().includes(textFilter.toLowerCase())) {
          const timeStr = timestamp.toLocaleTimeString();
          const logLine = document.createElement("div");
          logLine.className = `log-line log-${level}`;
          logLine.textContent = `[${timeStr}] ${message}`;
          this.container.appendChild(logLine);
          this.container.scrollTop = this.container.scrollHeight;
          this.updateBufferSizeDisplay();
        }
      }
    }
    refreshDisplay() {
      if (!this.container) return;
      this.container.innerHTML = "";
      const enabledLevels = this.getEnabledLevelsFromCheckboxes();
      const textFilter = this.getTextFilter();
      this.allEntries.forEach((entry) => {
        if (enabledLevels.has(entry.level)) {
          if (textFilter && !entry.message.toLowerCase().includes(textFilter.toLowerCase())) {
            return;
          }
          const timeStr = entry.timestamp.toLocaleTimeString();
          const logLine = document.createElement("div");
          logLine.className = `log-line log-${entry.level}`;
          logLine.textContent = `[${timeStr}] ${entry.message}`;
          this.container.appendChild(logLine);
        }
      });
      this.container.scrollTop = this.container.scrollHeight;
      this.updateBufferSizeDisplay();
    }
    getEnabledLevelsFromCheckboxes() {
      const enabledLevels = /* @__PURE__ */ new Set();
      if (typeof document === "undefined") {
        return enabledLevels;
      }
      const checkboxes = ["debug", "info", "warn", "error"];
      checkboxes.forEach((level) => {
        const checkbox = document.getElementById(`logLevel-${level}`);
        if (checkbox && checkbox.checked) {
          enabledLevels.add(level);
        }
      });
      return enabledLevels;
    }
    getTextFilter() {
      var _a2;
      if (typeof document === "undefined") {
        return "";
      }
      const textFilterInput = document.getElementById("logTextFilter");
      return ((_a2 = textFilterInput == null ? void 0 : textFilterInput.value) == null ? void 0 : _a2.trim()) || "";
    }
    updateBufferSizeDisplay() {
      var _a2, _b;
      if (typeof document === "undefined") {
        return;
      }
      const bufferSizeElement = document.getElementById("logBufferSize");
      if (!bufferSizeElement) {
        return;
      }
      const displayedCount = ((_b = (_a2 = this.container) == null ? void 0 : _a2.children) == null ? void 0 : _b.length) || 0;
      const totalCount = this.allEntries.length;
      bufferSizeElement.textContent = `${displayedCount} / ${totalCount}`;
    }
    // Public method to refresh display when filter checkboxes change
    refreshFilter() {
      this.refreshDisplay();
    }
    // Public method to clear all entries
    clearAll() {
      this.allEntries = [];
      if (this.container) {
        this.container.innerHTML = "";
      }
      this.updateBufferSizeDisplay();
    }
    // Debug methods to help diagnose filtering issues
    getEntryCount() {
      return this.allEntries.length;
    }
    getEnabledLevels() {
      return Array.from(this.getEnabledLevelsFromCheckboxes());
    }
    debugEntries() {
      console.log("DOMOutput Debug:");
      console.log("- Container exists:", !!this.container);
      console.log("- Entry count:", this.allEntries.length);
      console.log("- Enabled levels:", this.getEnabledLevels());
      console.log("- Entries:", this.allEntries);
    }
  };
  var _Logger = class _Logger {
    constructor() {
      this.outputs = [];
      this.enabledLevels = /* @__PURE__ */ new Set(["all"]);
      this.diagnosticsTarget = null;
      this.outputs.push(new ConsoleOutput());
    }
    /**
     * Bridge warn/error log lines into a diagnostics recorder so they appear
     * in the disconnect incident ring buffer in correct chronological order.
     */
    setDiagnosticsTarget(target) {
      this.diagnosticsTarget = target;
    }
    static getInstance() {
      if (!_Logger.instance) {
        _Logger.instance = new _Logger();
      }
      return _Logger.instance;
    }
    addOutput(output) {
      this.outputs.push(output);
    }
    clearOutputs() {
      this.outputs = [];
    }
    setMinLevel(level) {
      this.enabledLevels = /* @__PURE__ */ new Set([level]);
    }
    setEnabledLevels(levels) {
      this.enabledLevels = new Set(levels);
    }
    enableLevel(level) {
      this.enabledLevels.add(level);
    }
    disableLevel(level) {
      this.enabledLevels.delete(level);
    }
    getEnabledLevels() {
      return Array.from(this.enabledLevels);
    }
    shouldLog(level) {
      if (this.enabledLevels.has("all")) return true;
      if (level === "all") return true;
      if (this.enabledLevels.has(level)) return true;
      if (this.enabledLevels.size === 1) {
        const singleLevel = Array.from(this.enabledLevels)[0];
        if (singleLevel !== "all") {
          const levels = ["debug", "info", "warn", "error"];
          const minIndex = levels.indexOf(singleLevel);
          const currentIndex = levels.indexOf(level);
          return currentIndex >= minIndex;
        }
      }
      return false;
    }
    log(level, message, context) {
      var _a2;
      if (!this.shouldLog(level)) return;
      const contextPrefix = context ? `${context} ` : "";
      const finalMessage = `${contextPrefix}${message}`;
      const timestamp = /* @__PURE__ */ new Date();
      this.outputs.forEach((output) => {
        try {
          output.write(level, finalMessage, timestamp);
        } catch (error) {
          console.error("Logger output error:", error);
        }
      });
      if ((level === "warn" || level === "error") && ((_a2 = this.diagnosticsTarget) == null ? void 0 : _a2.enabled)) {
        try {
          this.diagnosticsTarget.recordLog(level, message, context);
        } catch (error) {
          console.error("Diagnostics log bridge error:", error);
        }
      }
    }
    debug(message, context) {
      this.log("debug", message, context);
    }
    info(message, context) {
      this.log("info", message, context);
    }
    warn(message, context) {
      this.log("warn", message, context);
    }
    error(message, context) {
      this.log("error", message, context);
    }
    /**
     * Logs tower state changes with detailed information about what changed.
     * @param oldState - The previous tower state
     * @param newState - The new tower state
     * @param source - Source identifier for the update (e.g., "sendTowerState", "tower response")
     * @param enableDetailedLogging - Whether to include detailed change descriptions
     */
    logTowerStateChange(oldState, newState, source, enableDetailedLogging = false) {
      this.info(`Tower state updated from ${source}`, "[UDT]");
      if (enableDetailedLogging) {
        const changes = this.computeStateChanges(oldState, newState);
        if (changes.length > 0) {
          this.info(`State changes: ${changes.join(", ")}`, "[UDT]");
        } else {
          this.info("No changes detected in state update", "[UDT]");
        }
      }
    }
    /**
     * Computes the differences between two tower states for logging purposes.
     * @param oldState - The previous tower state
     * @param newState - The new tower state
     * @returns Array of human-readable change descriptions
     */
    computeStateChanges(oldState, newState) {
      const changes = [];
      for (let i = 0; i < 3; i++) {
        const drumNames = ["top", "middle", "bottom"];
        const oldDrum = oldState.drum[i];
        const newDrum = newState.drum[i];
        if (oldDrum.position !== newDrum.position) {
          const positions = ["north", "east", "south", "west"];
          changes.push(`${drumNames[i]} drum: ${positions[oldDrum.position]} \u2192 ${positions[newDrum.position]}`);
        }
        if (oldDrum.calibrated !== newDrum.calibrated) {
          changes.push(`${drumNames[i]} drum calibrated: ${oldDrum.calibrated} \u2192 ${newDrum.calibrated}`);
        }
        if (oldDrum.jammed !== newDrum.jammed) {
          changes.push(`${drumNames[i]} drum jammed: ${oldDrum.jammed} \u2192 ${newDrum.jammed}`);
        }
        if (oldDrum.playSound !== newDrum.playSound) {
          changes.push(`${drumNames[i]} drum playSound: ${oldDrum.playSound} \u2192 ${newDrum.playSound}`);
        }
      }
      const layerNames = ["top ring", "middle ring", "bottom ring", "ledge", "base1", "base2"];
      for (let layerIndex = 0; layerIndex < 6; layerIndex++) {
        for (let lightIndex = 0; lightIndex < 4; lightIndex++) {
          const oldLight = oldState.layer[layerIndex].light[lightIndex];
          const newLight = newState.layer[layerIndex].light[lightIndex];
          const lightChanges = [];
          if (oldLight.effect !== newLight.effect) {
            lightChanges.push(`effect ${oldLight.effect} \u2192 ${newLight.effect}`);
          }
          if (oldLight.loop !== newLight.loop) {
            lightChanges.push(`loop ${oldLight.loop} \u2192 ${newLight.loop}`);
          }
          if (lightChanges.length > 0) {
            changes.push(`${layerNames[layerIndex]} light ${lightIndex}: ${lightChanges.join(", ")}`);
          }
        }
      }
      if (oldState.audio.sample !== newState.audio.sample) {
        changes.push(`audio sample: ${oldState.audio.sample} \u2192 ${newState.audio.sample}`);
      }
      if (oldState.audio.loop !== newState.audio.loop) {
        changes.push(`audio loop: ${oldState.audio.loop} \u2192 ${newState.audio.loop}`);
      }
      if (oldState.audio.volume !== newState.audio.volume) {
        changes.push(`audio volume: ${oldState.audio.volume} \u2192 ${newState.audio.volume}`);
      }
      if (oldState.beam.count !== newState.beam.count) {
        changes.push(`beam count: ${oldState.beam.count} \u2192 ${newState.beam.count}`);
      }
      if (oldState.beam.fault !== newState.beam.fault) {
        changes.push(`beam fault: ${oldState.beam.fault} \u2192 ${newState.beam.fault}`);
      }
      if (oldState.led_sequence !== newState.led_sequence) {
        changes.push(`LED sequence: ${oldState.led_sequence} \u2192 ${newState.led_sequence}`);
      }
      return changes;
    }
  };
  _Logger.instance = null;
  var Logger = _Logger;
  var logger = Logger.getInstance();

  // src/udtBleConnection.ts
  init_udtConstants();

  // src/udtTowerResponse.ts
  init_udtConstants();
  var TowerResponseProcessor = class {
    constructor(logDetail = false) {
      this.logDetail = false;
      this.logDetail = logDetail;
    }
    /**
     * Sets whether to include detailed information in command string conversion
     * @param {boolean} enabled - Whether to enable detailed logging
     */
    setDetailedLogging(enabled) {
      this.logDetail = enabled;
    }
    /**
     * Maps a command value to its corresponding tower message definition.
     * @param {number} cmdValue - Command value received from tower
     * @returns {Object} Object containing command key and command definition
     */
    getTowerCommand(cmdValue) {
      const cmdKeys = Object.keys(TOWER_MESSAGES);
      const cmdKey = cmdKeys.find((key) => TOWER_MESSAGES[key].value === cmdValue);
      if (!cmdKey) {
        logger.warn(`Unknown command received from tower: ${cmdValue} (0x${cmdValue.toString(16)})`, "TowerResponseProcessor");
        return { cmdKey: void 0, command: { name: "Unknown Command", value: cmdValue, critical: false } };
      }
      const command = TOWER_MESSAGES[cmdKey];
      return { cmdKey, command };
    }
    /**
     * Converts a command packet to a human-readable string array for logging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {Array<string>} Human-readable representation of the command
     */
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
          return [towerCommand.name, commandToPacketString(command)];
        case TC.BATTERY: {
          const millivolts = getMilliVoltsFromTowerResponse(command);
          const retval = [towerCommand.name, milliVoltsToPercentage(millivolts)];
          if (this.logDetail) {
            retval.push(`${millivolts}mv`);
            retval.push(commandToPacketString(command));
          }
          return retval;
        }
        default:
          return ["Unmapped Response!", commandToPacketString(command)];
      }
    }
    /**
     * Determines if a response should be logged based on command type and configuration.
     * @param {string} cmdKey - Command key from tower message
     * @param {any} logConfig - Logging configuration object
     * @returns {boolean} Whether this response should be logged
     */
    shouldLogResponse(cmdKey, logConfig) {
      if (!cmdKey) {
        return true;
      }
      const logAll = logConfig["LOG_ALL"];
      return logConfig[cmdKey] || logAll;
    }
    /**
     * Checks if a command is a battery response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a battery response
     */
    isBatteryResponse(cmdKey) {
      return cmdKey === TC.BATTERY;
    }
    /**
     * Checks if a command is a tower state response type.
     * @param {string} cmdKey - Command key from tower message
     * @returns {boolean} True if this is a tower state response
     */
    isTowerStateResponse(cmdKey) {
      return cmdKey === TC.STATE;
    }
  };

  // src/udtBluetoothAdapterFactory.ts
  var BluetoothAdapterFactory = class {
    /**
     * Creates a Bluetooth adapter for the specified platform
     * @param platform - Target platform (web, node, or auto-detect)
     * @returns Platform-specific Bluetooth adapter instance
     */
    static create(platform = "auto" /* AUTO */) {
      const detectedPlatform = platform === "auto" /* AUTO */ ? this.detectPlatform() : platform;
      switch (detectedPlatform) {
        case "web" /* WEB */: {
          const { WebBluetoothAdapter: WebBluetoothAdapter2 } = (init_WebBluetoothAdapter(), __toCommonJS(WebBluetoothAdapter_exports));
          return new WebBluetoothAdapter2();
        }
        case "node" /* NODE */: {
          const { NodeBluetoothAdapter: NodeBluetoothAdapter2 } = (init_NodeBluetoothAdapter(), __toCommonJS(NodeBluetoothAdapter_exports));
          return new NodeBluetoothAdapter2();
        }
        case "none" /* NONE */: {
          const { NoopBluetoothAdapter: NoopBluetoothAdapter2 } = (init_NoopBluetoothAdapter(), __toCommonJS(NoopBluetoothAdapter_exports));
          return new NoopBluetoothAdapter2();
        }
        default:
          throw new Error(`Unsupported Bluetooth platform: ${detectedPlatform}`);
      }
    }
    /**
     * Detects the current runtime environment
     * @returns Detected platform (web or node)
     */
    static detectPlatform() {
      var _a2;
      if (typeof navigator !== "undefined" && ((_a2 = navigator.userAgent) == null ? void 0 : _a2.includes("React Native"))) {
        throw new Error(
          "React Native detected. Auto-detection is not supported. Please provide a custom adapter implementing IBluetoothAdapter. See documentation for react-native-ble-plx adapter example."
        );
      }
      if (typeof window !== "undefined" && typeof navigator !== "undefined") {
        if ("bluetooth" in navigator) {
          return "web" /* WEB */;
        }
      }
      if (typeof process !== "undefined" && process.versions && process.versions.node) {
        return "node" /* NODE */;
      }
      throw new Error(
        "Unable to detect Bluetooth platform. Environment is neither browser with Web Bluetooth nor Node.js. Please explicitly specify platform or provide a custom adapter."
      );
    }
  };

  // src/udtBleConnection.ts
  var UdtBleConnection = class {
    constructor(logger2, callbacks, adapter, recorder) {
      this.recorder = null;
      // Snapshot providers wired by UltimateDarkTower so the recorder can capture
      // higher-level state (command queue, tower state, broken seals) at the
      // moment a disconnect cause fires.
      this.snapshotProviders = null;
      // Bluetooth adapter (platform-agnostic).
      // Null until an adapter is provided or lazily created on first connect() —
      // construction never triggers platform detection, so creating an
      // UltimateDarkTower in a non-Bluetooth environment (e.g. iOS Safari) does
      // not throw. The detection error, if any, surfaces at connect() time.
      this.bluetoothAdapter = null;
      // Connection state
      this.isConnected = false;
      this.isDisposed = false;
      this.performingCalibration = false;
      this.performingLongCommand = false;
      // Connection monitoring
      this.connectionMonitorInterval = null;
      this.connectionMonitorFrequency = 2 * 1e3;
      this.lastSuccessfulCommand = 0;
      this.connectionTimeoutThreshold = 30 * 1e3;
      this.enableConnectionMonitoring = true;
      // Battery heartbeat monitoring
      this.lastBatteryHeartbeat = 0;
      this.batteryHeartbeatTimeout = 3 * 1e3;
      this.longTowerCommandTimeout = 30 * 1e3;
      this.enableBatteryHeartbeatMonitoring = true;
      this.batteryHeartbeatVerifyConnection = true;
      // When true, verifies connection before triggering disconnection on heartbeat timeout
      // Tower state
      this.towerSkullDropCount = -1;
      this.lastBatteryLog = 0;
      this.lastBatteryPercentage = "";
      this.batteryLogFrequency = 15 * 1e3;
      this.batteryLogOnChangeOnly = false;
      this.batteryLogEnabled = true;
      // Device information
      this.deviceInformation = {};
      // Logging configuration
      this.logTowerResponses = true;
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
      };
      this.logger = logger2;
      this.callbacks = callbacks;
      this.responseProcessor = new TowerResponseProcessor();
      this.recorder = recorder != null ? recorder : null;
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
    wireAdapterCallbacks(adapter) {
      adapter.onCharacteristicValueChanged((data) => {
        this.onRxData(data);
      });
      adapter.onDisconnect(() => {
        this.onTowerDeviceDisconnected();
      });
      adapter.onBluetoothAvailabilityChanged((available) => {
        this.bleAvailabilityChange(available);
      });
    }
    /**
     * Returns the Bluetooth adapter, lazily creating one via platform
     * auto-detection on first use. Platform-detection errors (e.g. no Web
     * Bluetooth on iOS) surface here, at connect time, rather than at
     * construction.
     */
    ensureAdapter() {
      if (!this.bluetoothAdapter) {
        const adapter = BluetoothAdapterFactory.create("auto" /* AUTO */);
        this.bluetoothAdapter = adapter;
        this.wireAdapterCallbacks(adapter);
      }
      return this.bluetoothAdapter;
    }
    setDiagnosticsSnapshotProviders(providers) {
      this.snapshotProviders = providers;
    }
    /**
     * Record a disconnect incident with the recorder. Public so higher layers
     * (e.g. UltimateDarkTower's beforeunload handler) can synthesize causes
     * like 'page_unload' that aren't tied to a specific BLE detection path.
     */
    recordIncidentPublic(cause) {
      return this.recordIncident(cause);
    }
    recordIncident(cause) {
      var _a2, _b, _c, _d, _e, _f;
      if (!this.recorder || !this.recorder.enabled) return null;
      const queueSnapshot = (_b = (_a2 = this.snapshotProviders) == null ? void 0 : _a2.commandQueue()) != null ? _b : {
        queueLength: 0,
        isProcessing: false,
        currentCommand: null
      };
      const towerState = (_d = (_c = this.snapshotProviders) == null ? void 0 : _c.towerState()) != null ? _d : null;
      const brokenSeals = (_f = (_e = this.snapshotProviders) == null ? void 0 : _e.brokenSeals()) != null ? _f : [];
      return this.recorder.recordIncident({
        cause,
        connectionStatus: this.getConnectionStatus(),
        deviceInformation: this.getDeviceInformation(),
        commandQueue: queueSnapshot,
        towerState,
        brokenSeals
      });
    }
    async connect() {
      var _a2;
      if (this.isDisposed) {
        throw new Error("UdtBleConnection instance has been disposed and cannot reconnect");
      }
      this.logger.info("Looking for Tower...", "[UDT]");
      try {
        const adapter = this.ensureAdapter();
        await adapter.connect(
          TOWER_DEVICE_NAME,
          [UART_SERVICE_UUID, DIS_SERVICE_UUID]
        );
        this.logger.info("Tower connection complete", "[UDT][BLE]");
        this.isConnected = true;
        this.lastSuccessfulCommand = Date.now();
        this.lastBatteryHeartbeat = Date.now();
        (_a2 = this.recorder) == null ? void 0 : _a2.beginSession();
        await this.readDeviceInformation();
        if (this.enableConnectionMonitoring) {
          this.startConnectionMonitoring();
        }
        this.callbacks.onTowerConnect();
      } catch (error) {
        this.logger.error(`Tower Connection Error: ${error}`, "[UDT][BLE]");
        this.isConnected = false;
        throw error;
      }
    }
    async disconnect() {
      this.stopConnectionMonitoring();
      if (this.isConnected) {
        this.recordIncident("user_initiated");
      }
      const adapter = this.bluetoothAdapter;
      if (adapter == null ? void 0 : adapter.isConnected()) {
        await adapter.disconnect();
        this.logger.info("Tower disconnected", "[UDT]");
      }
      this.handleDisconnection();
    }
    /**
     * Writes a command to the tower via the Bluetooth adapter.
     * Used by UdtTowerCommands instead of direct characteristic access.
     */
    async writeCommand(command) {
      var _a2;
      const adapter = this.bluetoothAdapter;
      if (!adapter) {
        throw new Error("Cannot write command: not connected (no Bluetooth adapter)");
      }
      (_a2 = this.recorder) == null ? void 0 : _a2.recordCommandPayload("cmd_sent", command, { len: command.length });
      return await adapter.writeCharacteristic(command);
    }
    /**
     * Processes received data from the RX characteristic (platform-agnostic).
     * Called by the adapter's onCharacteristicValueChanged callback.
     */
    onRxData(receivedData) {
      var _a2, _b;
      this.lastSuccessfulCommand = Date.now();
      const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
      const isBattery = this.responseProcessor.isBatteryResponse(cmdKey);
      if (((_a2 = this.recorder) == null ? void 0 : _a2.enabled) && !isBattery) {
        this.recorder.recordCommandPayload("cmd_response", receivedData, { cmdKey, len: receivedData.length });
      }
      const shouldLogCommand = this.logTowerResponses && this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) && !isBattery;
      if (shouldLogCommand) {
        this.logger.info(`${cmdKey}`, "[UDT][BLE][RCVD]");
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
        (_b = this.recorder) == null ? void 0 : _b.recordBattery(millivolts, milliVoltsToPercentageNumber(millivolts));
        const didBatteryLevelChange = this.lastBatteryPercentage !== "" && this.lastBatteryPercentage !== batteryPercentage;
        const batteryLogFrequencyPassed = Date.now() - this.lastBatteryLog >= this.batteryLogFrequency;
        const shouldLog = this.batteryLogEnabled && (this.batteryLogOnChangeOnly ? didBatteryLevelChange || this.lastBatteryPercentage === "" : batteryLogFrequencyPassed);
        if (shouldLog) {
          this.logger.info(`${this.responseProcessor.commandToString(receivedData).join(" ")}`, "[UDT][BLE]");
          this.lastBatteryLog = Date.now();
          this.lastBatteryPercentage = batteryPercentage;
        }
        this.callbacks.onBatteryLevelNotify(millivolts);
      } else {
        if (this.callbacks.onTowerResponse) {
          this.callbacks.onTowerResponse(receivedData);
        }
      }
    }
    handleTowerStateResponse(receivedData) {
      var _a2, _b, _c;
      const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];
      const state = rtdt_unpack_state(receivedData.slice(TOWER_STATE_DATA_OFFSET, TOWER_STATE_RESPONSE_MIN_LENGTH));
      this.logger.debug(`Tower State: ${JSON.stringify(state)} `, "[UDT][BLE]");
      (_a2 = this.recorder) == null ? void 0 : _a2.recordEvent("tower_state_response");
      if (this.performingCalibration) {
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.lastBatteryHeartbeat = Date.now();
        this.callbacks.onCalibrationComplete();
        this.logger.info("Tower calibration complete", "[UDT]");
        (_b = this.recorder) == null ? void 0 : _b.recordEvent("calibration_complete");
      }
      if (dataSkullDropCount !== this.towerSkullDropCount) {
        if (dataSkullDropCount) {
          this.callbacks.onSkullDrop(dataSkullDropCount);
          this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? "empty" : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, "[UDT]");
          (_c = this.recorder) == null ? void 0 : _c.recordEvent("skull_drop", { count: dataSkullDropCount });
        } else {
          this.logger.info(`Skull count reset to ${dataSkullDropCount}`, "[UDT]");
        }
        this.towerSkullDropCount = dataSkullDropCount;
      }
    }
    logTowerResponse(receivedData) {
      const { cmdKey, command } = this.responseProcessor.getTowerCommand(receivedData[0]);
      if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
        return;
      }
      if (this.responseProcessor.isBatteryResponse(cmdKey)) {
        return;
      }
      const logMessage = `${this.responseProcessor.commandToString(receivedData).join(" ")}`;
      if (command.critical) {
        this.logger.error(logMessage, "[UDT][BLE]");
      } else {
        this.logger.info(logMessage, "[UDT][BLE]");
      }
    }
    bleAvailabilityChange(available) {
      this.logger.info("Bluetooth availability changed", "[UDT][BLE]");
      if (!available && this.isConnected) {
        this.logger.warn("Bluetooth became unavailable - handling disconnection", "[UDT][BLE]");
        this.recordIncident("bt_unavailable");
        this.handleDisconnection();
      }
    }
    onTowerDeviceDisconnected() {
      this.logger.warn("Tower device disconnected unexpectedly", "[UDT][BLE]");
      if (this.isConnected) {
        this.recordIncident("adapter_event");
      }
      this.handleDisconnection();
    }
    handleDisconnection() {
      this.isConnected = false;
      this.performingCalibration = false;
      this.performingLongCommand = false;
      this.stopConnectionMonitoring();
      this.lastBatteryHeartbeat = 0;
      this.lastSuccessfulCommand = 0;
      this.deviceInformation = {};
      this.callbacks.onTowerDisconnect();
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
      var _a2, _b, _c, _d, _e;
      if (!this.isConnected) {
        return;
      }
      if (!((_b = (_a2 = this.bluetoothAdapter) == null ? void 0 : _a2.isGattConnected()) != null ? _b : false)) {
        this.logger.warn("GATT connection lost detected during health check", "[UDT][BLE]");
        this.recordIncident("gatt_health_check");
        this.handleDisconnection();
        return;
      }
      if (this.enableBatteryHeartbeatMonitoring) {
        const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
        const timeoutThreshold = this.performingLongCommand ? this.longTowerCommandTimeout : this.batteryHeartbeatTimeout;
        if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
          const operationContext = this.performingLongCommand ? " during long command operation" : "";
          this.logger.warn(`Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`, "[UDT][BLE]");
          if (this.performingLongCommand) {
            this.logger.info("Ignoring battery heartbeat timeout during long command - this is expected behavior", "[UDT][BLE]");
            return;
          }
          if (this.batteryHeartbeatVerifyConnection) {
            this.logger.info("Verifying tower connection status before triggering disconnection...", "[UDT][BLE]");
            if ((_d = (_c = this.bluetoothAdapter) == null ? void 0 : _c.isGattConnected()) != null ? _d : false) {
              this.logger.info("GATT connection still available - heartbeat timeout may be temporary", "[UDT][BLE]");
              (_e = this.recorder) == null ? void 0 : _e.recordEvent("heartbeat_late", {
                sinceMs: timeSinceLastBatteryHeartbeat,
                threshold: timeoutThreshold
              });
              this.lastBatteryHeartbeat = Date.now();
              this.logger.info("Reset battery heartbeat timer - will monitor for another timeout period", "[UDT][BLE]");
              return;
            }
          }
          this.logger.warn("Tower possibly disconnected due to battery depletion or power loss", "[UDT][BLE]");
          this.recordIncident("heartbeat_timeout");
          this.handleDisconnection();
          return;
        }
      }
      const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
      if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
        this.logger.warn("General connection timeout detected - no responses received", "[UDT][BLE]");
        this.recordIncident("response_timeout");
        this.handleDisconnection();
      }
    }
    setConnectionMonitoring(enabled) {
      this.enableConnectionMonitoring = enabled;
      if (enabled && this.isConnected) {
        this.startConnectionMonitoring();
      } else {
        this.stopConnectionMonitoring();
      }
    }
    configureConnectionMonitoring(frequency = 2e3, timeout = 3e4) {
      this.connectionMonitorFrequency = frequency;
      this.connectionTimeoutThreshold = timeout;
      if (this.enableConnectionMonitoring && this.isConnected) {
        this.startConnectionMonitoring();
      }
    }
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3e3, verifyConnection = true) {
      this.enableBatteryHeartbeatMonitoring = enabled;
      this.batteryHeartbeatTimeout = timeout;
      this.batteryHeartbeatVerifyConnection = verifyConnection;
    }
    async isConnectedAndResponsive() {
      var _a2, _b;
      if (!this.isConnected) {
        return false;
      }
      return (_b = (_a2 = this.bluetoothAdapter) == null ? void 0 : _a2.isGattConnected()) != null ? _b : false;
    }
    getConnectionStatus() {
      var _a2, _b;
      const now = Date.now();
      const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
      const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
      return {
        isConnected: this.isConnected,
        isGattConnected: (_b = (_a2 = this.bluetoothAdapter) == null ? void 0 : _a2.isGattConnected()) != null ? _b : false,
        lastBatteryHeartbeatMs: timeSinceLastBattery,
        lastCommandResponseMs: timeSinceLastCommand,
        batteryHeartbeatHealthy: timeSinceLastBattery >= 0 && timeSinceLastBattery < this.batteryHeartbeatTimeout,
        connectionMonitoringEnabled: this.enableConnectionMonitoring,
        batteryHeartbeatMonitoringEnabled: this.enableBatteryHeartbeatMonitoring,
        batteryHeartbeatTimeoutMs: this.batteryHeartbeatTimeout,
        batteryHeartbeatVerifyConnection: this.batteryHeartbeatVerifyConnection,
        connectionTimeoutMs: this.connectionTimeoutThreshold
      };
    }
    getDeviceInformation() {
      return __spreadValues({}, this.deviceInformation);
    }
    async readDeviceInformation() {
      const adapter = this.bluetoothAdapter;
      if (!adapter) return;
      try {
        this.logger.info("Reading device information service...", "[UDT][BLE]");
        this.deviceInformation = await adapter.readDeviceInformation();
        for (const [key, value] of Object.entries(this.deviceInformation)) {
          if (key !== "lastUpdated" && value) {
            this.logger.info(`Device ${key}: ${value}`, "[UDT][BLE]");
          }
        }
      } catch (e) {
        this.logger.debug("Device Information Service not available", "[UDT][BLE]");
      }
    }
    async cleanup() {
      var _a2;
      if (this.isDisposed) return;
      this.isDisposed = true;
      this.logger.info("Cleaning up UdtBleConnection instance", "[UDT][BLE]");
      this.stopConnectionMonitoring();
      if (this.isConnected) {
        await this.disconnect();
      }
      await ((_a2 = this.bluetoothAdapter) == null ? void 0 : _a2.cleanup());
    }
  };

  // src/udtCommandFactory.ts
  init_udtConstants();
  var UdtCommandFactory = class {
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top, middle, bottom) {
      const rotateCmd = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
      rotateCmd[DRUM_PACKETS.topMiddle] = drumPositionCmds.top[top] | drumPositionCmds.middle[middle];
      rotateCmd[DRUM_PACKETS.bottom] = drumPositionCmds.bottom[bottom];
      return rotateCmd;
    }
    /**
     * Creates a sound command packet for playing tower audio.
     * @param soundIndex - Index of the sound to play from the audio library
     * @returns Command packet for playing sound
     */
    createSoundCommand(soundIndex) {
      const soundCommand = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
      soundCommand[AUDIO_COMMAND_POS] = soundIndex & 255;
      return soundCommand;
    }
    /**
     * Creates a basic tower command packet with the specified command value.
     * @param commandValue - The command value to send
     * @returns Basic command packet
     */
    createBasicCommand(commandValue) {
      return new Uint8Array([commandValue]);
    }
    //#region Stateful Command Methods
    /**
     * Creates a stateful tower command by modifying only specific fields while preserving the rest.
     * This is the proper way to send commands that only change certain aspects of the tower state.
     * @param currentState - The current complete tower state (or null to create default state)
     * @param modifications - Partial tower state with only the fields to modify
     * @returns 20-byte command packet (command type + 19-byte state data)
     */
    createStatefulCommand(currentState, modifications) {
      const newState = currentState ? this.deepCopyTowerState(currentState) : this.createEmptyTowerState();
      if (modifications.drum) {
        modifications.drum.forEach((drum, index) => {
          if (drum && newState.drum[index]) {
            Object.assign(newState.drum[index], drum);
          }
        });
      }
      if (modifications.layer) {
        modifications.layer.forEach((layer, layerIndex) => {
          if (layer && newState.layer[layerIndex]) {
            if (layer.light) {
              layer.light.forEach((light, lightIndex) => {
                if (light && newState.layer[layerIndex].light[lightIndex]) {
                  Object.assign(newState.layer[layerIndex].light[lightIndex], light);
                }
              });
            }
          }
        });
      }
      if (modifications.audio) {
        Object.assign(newState.audio, modifications.audio);
      }
      if (modifications.beam) {
        Object.assign(newState.beam, modifications.beam);
      }
      if (modifications.led_sequence !== void 0) {
        newState.led_sequence = modifications.led_sequence;
      }
      return this.packTowerStateCommand(newState);
    }
    /**
     * Creates a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param currentState - The current complete tower state
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns 20-byte command packet
     */
    createStatefulLEDCommand(currentState, layerIndex, lightIndex, effect, loop = false) {
      const layer = [];
      layer[layerIndex] = { light: [] };
      layer[layerIndex].light[lightIndex] = { effect, loop };
      const modifications = { layer };
      modifications.audio = { sample: 0, loop: false, volume: 0 };
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
    * Creates a stateful audio command that preserves all current tower state while adding audio.
    * @param currentState - The current complete tower state
    * @param sample - Audio sample index to play (0-127)
    * @param loop - Whether to loop the audio
    * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
    * @returns 20-byte command packet
    */
    createStatefulAudioCommand(currentState, sample, loop = false, volume) {
      const audioMods = { sample, loop, volume: volume != null ? volume : 0 };
      const modifications = {
        audio: audioMods
      };
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Creates a transient audio command that includes current tower state but doesn't persist audio state.
     * This prevents audio from being included in subsequent commands.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index to play
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
     * @returns Object containing the command packet and the state without audio for local tracking
     */
    createTransientAudioCommand(currentState, sample, loop = false, volume) {
      const audioMods = { sample, loop, volume: volume != null ? volume : 0 };
      const modifications = {
        audio: audioMods
      };
      const command = this.createStatefulCommand(currentState, modifications);
      const stateWithoutAudio = currentState ? __spreadValues({}, currentState) : this.createEmptyTowerState();
      stateWithoutAudio.audio = { sample: 0, loop: false, volume: 0 };
      return { command, stateWithoutAudio };
    }
    /**
     * Creates a transient audio command with additional modifications that includes current tower state
     * but doesn't persist audio state. This prevents audio from being included in subsequent commands.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index to play
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
     * @param otherModifications - Other tower state modifications to include
     * @returns Object containing the command packet and the state with modifications but without audio
     */
    createTransientAudioCommandWithModifications(currentState, sample, loop = false, volume = void 0, otherModifications = {}) {
      const audioMods = { sample, loop, volume: volume != null ? volume : 0 };
      const modifications = __spreadProps(__spreadValues({}, otherModifications), {
        audio: audioMods
      });
      const command = this.createStatefulCommand(currentState, modifications);
      const stateWithoutAudio = currentState ? __spreadValues({}, currentState) : this.createEmptyTowerState();
      if (otherModifications.drum) {
        otherModifications.drum.forEach((drum, index) => {
          if (drum && stateWithoutAudio.drum[index]) {
            Object.assign(stateWithoutAudio.drum[index], drum);
          }
        });
      }
      if (otherModifications.layer) {
        otherModifications.layer.forEach((layer, layerIndex) => {
          if (layer && stateWithoutAudio.layer[layerIndex]) {
            if (layer.light) {
              layer.light.forEach((light, lightIndex) => {
                if (light && stateWithoutAudio.layer[layerIndex].light[lightIndex]) {
                  Object.assign(stateWithoutAudio.layer[layerIndex].light[lightIndex], light);
                }
              });
            }
          }
        });
      }
      if (otherModifications.beam) {
        Object.assign(stateWithoutAudio.beam, otherModifications.beam);
      }
      if (otherModifications.led_sequence !== void 0) {
        stateWithoutAudio.led_sequence = otherModifications.led_sequence;
      }
      stateWithoutAudio.audio = { sample: 0, loop: false, volume: 0 };
      return { command, stateWithoutAudio };
    }
    /**
     * Creates a stateful drum rotation command that only changes drum positions while preserving all other state.
     * @param currentState - The current complete tower state
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns 20-byte command packet
     */
    createStatefulDrumCommand(currentState, drumIndex, position, playSound2 = false) {
      const drum = [];
      drum[drumIndex] = {
        jammed: false,
        calibrated: true,
        position,
        playSound: playSound2,
        reverse: false
      };
      const modifications = { drum };
      modifications.audio = { sample: 0, loop: false, volume: 0 };
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Packs a complete tower state into a 20-byte command packet.
     * @param state - Complete tower state to pack
     * @returns 20-byte command packet (0x00 + 19 bytes state data)
     */
    packTowerStateCommand(state) {
      const stateData = new Uint8Array(TOWER_STATE_DATA_SIZE);
      const success = rtdt_pack_state(stateData, TOWER_STATE_DATA_SIZE, state);
      if (!success) {
        throw new Error("Failed to pack tower state data");
      }
      const command = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
      command[0] = TOWER_COMMAND_TYPE_TOWER_STATE;
      command.set(stateData, TOWER_STATE_DATA_OFFSET);
      return command;
    }
    /**
     * Creates a default tower state with all systems off/neutral.
     * @returns Default TowerState object
     */
    createEmptyTowerState() {
      return {
        drum: [
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false },
          { jammed: false, calibrated: false, position: 0, playSound: false, reverse: false }
        ],
        layer: [
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] },
          { light: [{ effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }, { effect: 0, loop: false }] }
        ],
        audio: { sample: 0, loop: false, volume: 0 },
        beam: { count: 0, fault: false },
        led_sequence: 0
      };
    }
    /**
     * Creates a deep copy of a TowerState to avoid mutating the original.
     * @param state - The tower state to copy
     * @returns A new TowerState with all nested objects copied
     */
    deepCopyTowerState(state) {
      return {
        drum: state.drum.map((d) => __spreadValues({}, d)),
        layer: state.layer.map((l) => ({
          light: l.light.map((lt) => __spreadValues({}, lt))
        })),
        audio: __spreadValues({}, state.audio),
        beam: __spreadValues({}, state.beam),
        led_sequence: state.led_sequence
      };
    }
    //#endregion
  };

  // src/udtTowerCommands.ts
  init_udtConstants();

  // src/udtCommandQueue.ts
  var CommandQueue = class {
    constructor(logger2, sendCommandFn, recorder) {
      this.logger = logger2;
      this.sendCommandFn = sendCommandFn;
      this.queue = [];
      this.currentCommand = null;
      this.timeoutHandle = null;
      this.isProcessing = false;
      this.timeoutMs = 3e4;
      // 30 seconds
      this.recorder = null;
      this.recorder = recorder != null ? recorder : null;
    }
    setRecorder(recorder) {
      this.recorder = recorder;
    }
    /**
     * Enqueue a command for processing
     */
    async enqueue(command, description) {
      return new Promise((resolve, reject) => {
        var _a2;
        const queuedCommand = {
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          command,
          timestamp: Date.now(),
          resolve,
          reject,
          description
        };
        this.queue.push(queuedCommand);
        this.logger.debug(`Command queued: ${description || "unnamed"} (queue size: ${this.queue.length})`, "[UDT]");
        (_a2 = this.recorder) == null ? void 0 : _a2.recordEvent("cmd_enqueued", {
          id: queuedCommand.id,
          description,
          queueDepth: this.queue.length
        });
        if (!this.isProcessing) {
          this.processNext();
        }
      });
    }
    /**
     * Process the next command in the queue
     */
    async processNext() {
      var _a2, _b;
      if (this.isProcessing || this.queue.length === 0) {
        return;
      }
      this.isProcessing = true;
      this.currentCommand = this.queue.shift();
      const { id, command, description, reject } = this.currentCommand;
      this.logger.debug(`Processing command: ${description || id}`, "[UDT]");
      try {
        this.timeoutHandle = setTimeout(() => {
          this.onTimeout();
        }, this.timeoutMs);
        await this.sendCommandFn(command);
      } catch (error) {
        this.clearTimeout();
        (_b = this.recorder) == null ? void 0 : _b.recordEvent("cmd_failed", {
          id,
          description,
          error: (_a2 = error == null ? void 0 : error.message) != null ? _a2 : String(error)
        });
        this.currentCommand = null;
        this.isProcessing = false;
        reject(error);
        this.processNext();
      }
    }
    /**
     * Called when a tower response is received
     */
    onResponse() {
      if (this.currentCommand) {
        this.clearTimeout();
        const { resolve, description, id } = this.currentCommand;
        this.logger.debug(`Command completed: ${description || id}`, "[UDT]");
        this.currentCommand = null;
        this.isProcessing = false;
        resolve();
        this.processNext();
      }
    }
    /**
     * Handle command timeout
     */
    onTimeout() {
      var _a2;
      if (this.currentCommand) {
        const { description, id, timestamp } = this.currentCommand;
        this.logger.warn(`Command timeout after ${this.timeoutMs}ms: ${description || id}`, "[UDT]");
        (_a2 = this.recorder) == null ? void 0 : _a2.recordEvent("cmd_timeout", {
          id,
          description,
          ageMs: Date.now() - timestamp,
          queueDepth: this.queue.length
        });
        const reject = this.currentCommand.reject;
        this.currentCommand = null;
        this.isProcessing = false;
        reject(new Error(`Command timeout after ${this.timeoutMs}ms: ${description || id}`));
        this.processNext();
      }
    }
    /**
     * Clear the current timeout
     */
    clearTimeout() {
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = null;
      }
    }
    /**
     * Clear all pending commands
     */
    clear() {
      this.clearTimeout();
      this.queue.forEach((cmd) => {
        cmd.reject(new Error("Command queue cleared"));
      });
      this.queue = [];
      if (this.currentCommand) {
        this.currentCommand.reject(new Error("Command queue cleared"));
      }
      this.currentCommand = null;
      this.isProcessing = false;
      this.logger.debug("Command queue cleared", "[UDT]");
    }
    /**
     * Get queue status for debugging
     */
    getStatus() {
      return {
        queueLength: this.queue.length,
        isProcessing: this.isProcessing,
        currentCommand: this.currentCommand ? {
          id: this.currentCommand.id,
          description: this.currentCommand.description,
          timestamp: this.currentCommand.timestamp
        } : null
      };
    }
  };

  // src/udtTowerCommands.ts
  var UdtTowerCommands = class {
    constructor(dependencies) {
      this.deps = dependencies;
      this.commandQueue = new CommandQueue(
        this.deps.logger,
        (command) => this.sendTowerCommandDirect(command),
        this.deps.recorder
      );
    }
    /**
     * Sends a command packet to the tower via the command queue
     * @param command - The command packet to send to the tower
     * @param description - Optional description for logging
     * @returns Promise that resolves when command is completed
     */
    async sendTowerCommand(command, description) {
      return await this.commandQueue.enqueue(command, description);
    }
    /**
     * Directly sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * This method is used internally by the command queue.
     * @param command - The command packet to send to the tower
     * @returns Promise that resolves when command is sent successfully
     */
    async sendTowerCommandDirect(command) {
      var _a2;
      try {
        const cmdStr = commandToPacketString(command);
        this.deps.logDetail && this.deps.logger.debug(`${cmdStr}`, "[UDT][CMD]");
        if (!this.deps.bleConnection.isConnected) {
          this.deps.logger.warn("Tower is not connected", "[UDT][CMD]");
          return;
        }
        await this.deps.bleConnection.writeCommand(command);
        this.deps.retrySendCommandCount.value = 0;
        this.deps.bleConnection.lastSuccessfulCommand = Date.now();
      } catch (error) {
        this.deps.logger.error(`command send error: ${error}`, "[UDT][CMD]");
        const errorMsg = (_a2 = error == null ? void 0 : error.message) != null ? _a2 : String(error);
        const wasCancelled = errorMsg.includes("User cancelled");
        const maxRetriesReached = this.deps.retrySendCommandCount.value >= this.deps.retrySendCommandMax;
        const isDisconnected = errorMsg.includes("Cannot read properties of null") || errorMsg.includes("GATT Server is disconnected") || errorMsg.includes("Device is not connected") || errorMsg.includes("BluetoothConnectionError") || !this.deps.bleConnection.isConnected;
        if (isDisconnected) {
          this.deps.logger.warn("Disconnect detected during command send", "[UDT][CMD]");
          await this.deps.bleConnection.disconnect();
          return;
        }
        if (!maxRetriesReached && this.deps.bleConnection.isConnected && !wasCancelled) {
          this.deps.logger.info(`retrying tower command attempt ${this.deps.retrySendCommandCount.value + 1}`, "[UDT][CMD]");
          this.deps.retrySendCommandCount.value++;
          const delay = 250 * this.deps.retrySendCommandCount.value;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return await this.sendTowerCommandDirect(command);
        } else {
          this.deps.retrySendCommandCount.value = 0;
        }
      }
    }
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    async calibrate() {
      var _a2;
      if (!this.deps.bleConnection.performingCalibration) {
        this.deps.logger.info("Performing Tower Calibration", "[UDT][CMD]");
        (_a2 = this.deps.recorder) == null ? void 0 : _a2.recordEvent("calibration_started");
        await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]), "calibrate");
        this.deps.bleConnection.performingCalibration = true;
        this.deps.bleConnection.performingLongCommand = true;
        return;
      }
      this.deps.logger.warn("Tower calibration requested when tower is already performing calibration", "[UDT][CMD]");
      return;
    }
    /**
     * Plays a sound from the tower's audio library using stateful commands that preserve existing tower state.
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, "[UDT][CMD]");
        return;
      }
      const currentState = this.deps.getCurrentTowerState();
      const { command } = this.deps.commandFactory.createTransientAudioCommand(currentState, soundIndex, false);
      this.deps.logger.info("Sending sound command (stateful)", "[UDT][CMD]");
      await this.sendTowerCommand(command, `playSound(${soundIndex})`);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights2) {
      this.deps.logDetail && this.deps.logger.debug(`Light Parameter ${JSON.stringify(lights2)}`, "[UDT][CMD]");
      this.deps.logger.info("Sending light commands", "[UDT][CMD]");
      const layerCommands = this.mapLightsToLayerCommands(lights2);
      const currentState = this.deps.getCurrentTowerState();
      for (const { layerIndex, lightIndex, effect, loop } of layerCommands) {
        currentState.layer[layerIndex].light[lightIndex] = { effect, loop };
      }
      const command = this.deps.commandFactory.createStatefulCommand(currentState, {});
      this.deps.setTowerState(currentState, "lights");
      await this.sendTowerCommand(command, "lights");
    }
    /**
     * Maps the Lights object to layer/light index commands for setLEDStateful.
     * @param lights - Light configuration object
     * @returns Array of layer commands
     */
    mapLightsToLayerCommands(lights2) {
      const commands = [];
      if (lights2.doorway) {
        for (const doorwayLight of lights2.doorway) {
          const layerIndex = this.getTowerLayerForLevel(doorwayLight.level);
          const lightIndex = this.getLightIndexForSide(doorwayLight.position);
          const effect = LIGHT_EFFECTS[doorwayLight.style] || LIGHT_EFFECTS.off;
          commands.push({ layerIndex, lightIndex, effect, loop: effect !== LIGHT_EFFECTS.off });
        }
      }
      if (lights2.ledge) {
        for (const ledgeLight of lights2.ledge) {
          const layerIndex = TOWER_LAYERS.LEDGE;
          const lightIndex = this.getLedgeLightIndexForSide(ledgeLight.position);
          const effect = LIGHT_EFFECTS[ledgeLight.style] || LIGHT_EFFECTS.off;
          commands.push({ layerIndex, lightIndex, effect, loop: effect !== LIGHT_EFFECTS.off });
        }
      }
      if (lights2.base) {
        for (const baseLight of lights2.base) {
          const layerIndex = baseLight.position.level === "top" || baseLight.position.level === "b" ? TOWER_LAYERS.BASE2 : TOWER_LAYERS.BASE1;
          const lightIndex = this.getBaseLightIndexForSide(baseLight.position.side);
          const effect = LIGHT_EFFECTS[baseLight.style] || LIGHT_EFFECTS.off;
          commands.push({ layerIndex, lightIndex, effect, loop: effect !== LIGHT_EFFECTS.off });
        }
      }
      return commands;
    }
    /**
     * Gets the tower layer index for a doorway light level.
     * @param level - Tower level (top, middle, bottom)
     * @returns Layer index
     */
    getTowerLayerForLevel(level) {
      switch (level) {
        case "top":
          return TOWER_LAYERS.TOP_RING;
        case "middle":
          return TOWER_LAYERS.MIDDLE_RING;
        case "bottom":
          return TOWER_LAYERS.BOTTOM_RING;
        default:
          return TOWER_LAYERS.TOP_RING;
      }
    }
    /**
     * Gets the light index for a cardinal direction (ring lights).
     * @param side - Tower side (north, east, south, west)
     * @returns Light index
     */
    getLightIndexForSide(side) {
      switch (side) {
        case "north":
          return RING_LIGHT_POSITIONS.NORTH;
        case "east":
          return RING_LIGHT_POSITIONS.EAST;
        case "south":
          return RING_LIGHT_POSITIONS.SOUTH;
        case "west":
          return RING_LIGHT_POSITIONS.WEST;
        default:
          return RING_LIGHT_POSITIONS.NORTH;
      }
    }
    /**
     * Maps cardinal directions to their closest corner positions for ledge lights.
     * @param side - Tower side (north, east, south, west)
     * @returns Tower corner (northeast, southeast, southwest, northwest)
     */
    mapSideToCorner(side) {
      switch (side) {
        case "north":
          return "northeast";
        case "east":
          return "southeast";
        case "south":
          return "southwest";
        case "west":
          return "northwest";
        default:
          return "northeast";
      }
    }
    /**
     * Gets the light index for ledge lights (ordinal directions).
     * @param corner - Tower corner (northeast, southeast, southwest, northwest)
     * @returns Light index
     */
    getLedgeLightIndexForSide(corner) {
      switch (corner) {
        case "northeast":
          return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
        case "southeast":
          return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
        case "southwest":
          return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
        case "northwest":
          return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
        default:
          return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
      }
    }
    /**
     * Gets the light index for base lights (ordinal directions).
     * @param side - Tower side (north, east, south, west)
     * @returns Light index
     */
    getBaseLightIndexForSide(side) {
      return this.getLedgeLightIndexForSide(this.mapSideToCorner(side));
    }
    /**
     * Sends a light override command to control specific light patterns using stateful commands.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
      if (typeof light !== "number" || isNaN(light)) {
        this.deps.logger.error(`Invalid light parameter: ${light}. Must be a valid number.`, "[UDT][CMD]");
        return;
      }
      if (soundIndex !== void 0 && (typeof soundIndex !== "number" || isNaN(soundIndex) || soundIndex <= 0)) {
        this.deps.logger.error(`Invalid soundIndex parameter: ${soundIndex}. Must be a valid positive number.`, "[UDT][CMD]");
        return;
      }
      const currentState = this.deps.getCurrentTowerState();
      if (soundIndex) {
        const { command, stateWithoutAudio } = this.deps.commandFactory.createTransientAudioCommandWithModifications(
          currentState,
          soundIndex,
          false,
          void 0,
          { led_sequence: light }
        );
        this.deps.logger.info("Sending stateful light override with sound", "[UDT][CMD]");
        this.deps.setTowerState(stateWithoutAudio, "lightOverrides");
        await this.sendTowerCommand(command, `lightOverrides(${light}, ${soundIndex})`);
      } else {
        const modifications = {
          led_sequence: light
        };
        const command = this.deps.commandFactory.createStatefulCommand(currentState, modifications);
        this.deps.logger.info("Sending stateful light override", "[UDT][CMD]");
        await this.sendTowerCommand(command, `lightOverrides(${light})`);
      }
    }
    /**
     * Rotates tower drums to specified positions.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    async rotate(top, middle, bottom, soundIndex) {
      this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, "[UDT][CMD]");
      const rotateCommand = this.deps.commandFactory.createRotateCommand(top, middle, bottom);
      if (soundIndex) {
        rotateCommand[AUDIO_COMMAND_POS] = soundIndex;
      }
      this.deps.logger.info("Sending rotate command" + (soundIndex ? " with sound" : ""), "[UDT]");
      this.deps.bleConnection.performingLongCommand = true;
      await this.sendTowerCommand(rotateCommand, `rotate(${top}, ${middle}, ${bottom}${soundIndex ? `, ${soundIndex}` : ""})`);
      setTimeout(() => {
        this.deps.bleConnection.performingLongCommand = false;
        this.deps.bleConnection.lastBatteryHeartbeat = Date.now();
      }, this.deps.bleConnection.longTowerCommandTimeout);
      const towerState = this.deps.getCurrentTowerState();
      if (towerState) {
        const topMiddleRaw = rotateCommand[DRUM_PACKETS.topMiddle];
        const bottomRaw = rotateCommand[DRUM_PACKETS.bottom];
        const topPosition = this.decodeDrumPositionFromRaw("top", topMiddleRaw);
        const middlePosition = this.decodeDrumPositionFromRaw("middle", topMiddleRaw);
        const bottomPosition = this.decodeDrumPositionFromRaw("bottom", bottomRaw);
        towerState.drum[0].position = topPosition;
        towerState.drum[1].position = middlePosition;
        towerState.drum[2].position = bottomPosition;
      }
    }
    /**
    * Rotates tower drums to specified positions.
    * @param top - Position for the top drum ('north', 'east', 'south', 'west')
    * @param middle - Position for the middle drum
    * @param bottom - Position for the bottom drum
    * @param soundIndex - Optional sound to play during rotation
    * @returns Promise that resolves when rotate command is sent
    */
    async rotateWithState(top, middle, bottom, soundIndex) {
      this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, "[UDT][CMD]");
      const positionMap = {
        "north": 0,
        "east": 1,
        "south": 2,
        "west": 3
      };
      this.deps.logger.info("Sending stateful rotate commands" + (soundIndex ? " with sound" : ""), "[UDT][CMD]");
      this.deps.bleConnection.performingLongCommand = true;
      try {
        await this.rotateDrumStateful(0, positionMap[top], false);
        await this.rotateDrumStateful(1, positionMap[middle], false);
        await this.rotateDrumStateful(2, positionMap[bottom], false);
        if (soundIndex) {
          await this.playSound(soundIndex);
        }
      } finally {
        setTimeout(() => {
          this.deps.bleConnection.performingLongCommand = false;
          this.deps.bleConnection.lastBatteryHeartbeat = Date.now();
        }, this.deps.bleConnection.longTowerCommandTimeout);
        const towerState = this.deps.getCurrentTowerState();
        if (towerState) {
          towerState.drum[0].position = positionMap[top];
          towerState.drum[1].position = positionMap[middle];
          towerState.drum[2].position = positionMap[bottom];
        }
      }
    }
    /**
     * Resets the tower's internal skull drop counter to zero using stateful commands.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
      this.deps.logger.info("Tower skull count reset requested", "[UDT][CMD]");
      const currentState = this.deps.getCurrentTowerState();
      const modifications = {
        beam: { count: 0, fault: false }
      };
      const command = this.deps.commandFactory.createStatefulCommand(currentState, modifications);
      await this.sendTowerCommand(command, "resetTowerSkullCount");
      const updatedState = __spreadProps(__spreadValues({}, currentState), { beam: __spreadProps(__spreadValues({}, currentState.beam), { count: 0 }) });
      this.deps.setTowerState(updatedState, "resetTowerSkullCount");
    }
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @param volume - Optional volume override (0=loud, 1=medium, 2=quiet, 3=mute). Uses current tower state if not provided.
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal, volume) {
      const actualVolume = volume !== void 0 ? volume : this.deps.getCurrentTowerState().audio.volume;
      if (actualVolume > 0) {
        const currentState = this.deps.getCurrentTowerState();
        const stateWithVolume = __spreadValues({}, currentState);
        stateWithVolume.audio = { sample: 0, loop: false, volume: actualVolume };
        await this.sendTowerStateStateful(stateWithVolume);
      }
      this.deps.logger.info(`Breaking seal ${seal.level}-${seal.side} - triggering firmware sealReveal animation`, "[UDT]");
      await this.lightOverrides(TOWER_LIGHT_SEQUENCES.sealReveal, TOWER_AUDIO_LIBRARY.TowerSeal.value);
    }
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    async randomRotateLevels(level = 0) {
      const sides = ["north", "east", "south", "west"];
      const getRandomSide = () => sides[Math.floor(Math.random() * sides.length)];
      const currentTop = this.getCurrentDrumPosition("top");
      const currentMiddle = this.getCurrentDrumPosition("middle");
      const currentBottom = this.getCurrentDrumPosition("bottom");
      let topSide, middleSide, bottomSide;
      switch (level) {
        case 0:
          topSide = getRandomSide();
          middleSide = getRandomSide();
          bottomSide = getRandomSide();
          break;
        case 1:
          topSide = getRandomSide();
          middleSide = currentMiddle;
          bottomSide = currentBottom;
          break;
        case 2:
          topSide = currentTop;
          middleSide = getRandomSide();
          bottomSide = currentBottom;
          break;
        case 3:
          topSide = currentTop;
          middleSide = currentMiddle;
          bottomSide = getRandomSide();
          break;
        case 4:
          topSide = getRandomSide();
          middleSide = getRandomSide();
          bottomSide = currentBottom;
          break;
        case 5:
          topSide = getRandomSide();
          middleSide = currentMiddle;
          bottomSide = getRandomSide();
          break;
        case 6:
          topSide = currentTop;
          middleSide = getRandomSide();
          bottomSide = getRandomSide();
          break;
        default:
          this.deps.logger.error("Invalid level parameter for randomRotateLevels. Must be 0-6.", "[UDT][CMD]");
          return;
      }
      this.deps.logger.info(`Random rotating levels to: top:${topSide}, middle:${middleSide}, bottom:${bottomSide}`, "[UDT][CMD]");
      await this.rotate(topSide, middleSide, bottomSide);
    }
    /**
     * Decodes drum position from raw command byte value.
     * @param level - The drum level ('top', 'middle', 'bottom')
     * @param rawValue - The raw byte value from the command
     * @returns The position as a number (0=north, 1=east, 2=south, 3=west)
     */
    decodeDrumPositionFromRaw(level, rawValue) {
      const drumPositions = drumPositionCmds[level];
      for (const [side, value] of Object.entries(drumPositions)) {
        if (level === "middle") {
          if ((value & 192) === (rawValue & 192)) {
            return ["north", "east", "south", "west"].indexOf(side);
          }
        } else if (level === "top") {
          if ((value & 22) === (rawValue & 22)) {
            return ["north", "east", "south", "west"].indexOf(side);
          }
        } else {
          if (value === rawValue) {
            return ["north", "east", "south", "west"].indexOf(side);
          }
        }
      }
      return 0;
    }
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level) {
      const towerState = this.deps.getCurrentTowerState();
      if (!towerState) {
        return "north";
      }
      const drumIndex = level === "top" ? 0 : level === "middle" ? 1 : 2;
      const position = towerState.drum[drumIndex].position;
      const sides = ["north", "east", "south", "west"];
      return sides[position] || "north";
    }
    //#region Stateful Command Methods
    /**
     * Sends a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect, defaults to true
     * @returns Promise that resolves when command is sent
     */
    async setLEDStateful(layerIndex, lightIndex, effect, loop = true) {
      const currentState = this.deps.getCurrentTowerState();
      const command = this.deps.commandFactory.createStatefulLEDCommand(currentState, layerIndex, lightIndex, effect, loop);
      if (currentState) {
        currentState.layer[layerIndex].light[lightIndex] = { effect, loop };
        this.deps.setTowerState(currentState, "setLEDStateful");
      }
      this.deps.logger.info(`Setting LED layer ${layerIndex} light ${lightIndex} to effect ${effect}${loop ? " (looped)" : ""}`, "[UDT][CMD]");
      await this.sendTowerCommand(command, `setLEDStateful(${layerIndex}, ${lightIndex}, ${effect}, ${loop})`);
    }
    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
     * @param soundIndex - Index of the sound to play (1-based)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-3, 0=loudest, 3=softest), optional. Out-of-range values are clamped.
     * @returns Promise that resolves when command is sent
     */
    async playSoundStateful(soundIndex, loop = false, volume) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, "[UDT][CMD]");
        return;
      }
      const clampedVolume = volume === void 0 ? void 0 : Math.min(3, Math.max(0, Math.round(volume)));
      const currentState = this.deps.getCurrentTowerState();
      const { command } = this.deps.commandFactory.createTransientAudioCommand(currentState, soundIndex, loop, clampedVolume);
      this.deps.logger.info(`Playing sound ${soundIndex}${loop ? " (looped)" : ""}${clampedVolume !== void 0 ? ` at volume ${clampedVolume}` : ""}`, "[UDT][CMD]");
      await this.sendTowerCommand(command, `playSoundStateful(${soundIndex}, ${loop}${clampedVolume !== void 0 ? `, ${clampedVolume}` : ""})`);
    }
    /**
     * Rotates a single drum using stateful commands that preserve existing tower state.
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns Promise that resolves when command is sent
     */
    async rotateDrumStateful(drumIndex, position, playSound2 = false) {
      const currentState = this.deps.getCurrentTowerState();
      const command = this.deps.commandFactory.createStatefulDrumCommand(currentState, drumIndex, position, playSound2);
      if (currentState) {
        currentState.drum[drumIndex].position = position;
        this.deps.setTowerState(currentState, "rotateDrumStateful");
      }
      const drumNames = ["top", "middle", "bottom"];
      const positionNames = ["north", "east", "south", "west"];
      this.deps.logger.info(`Rotating ${drumNames[drumIndex]} drum to ${positionNames[position]}${playSound2 ? " with sound" : ""}`, "[UDT][CMD]");
      this.deps.bleConnection.performingLongCommand = true;
      await this.sendTowerCommand(command, `rotateDrumStateful(${drumIndex}, ${position}, ${playSound2})`);
      setTimeout(() => {
        this.deps.bleConnection.performingLongCommand = false;
        this.deps.bleConnection.lastBatteryHeartbeat = Date.now();
      }, this.deps.bleConnection.longTowerCommandTimeout);
    }
    /**
     * Sends a complete tower state using stateful commands.
     * Audio state is automatically cleared to prevent sounds from persisting across commands.
     * @param state - Complete tower state to send
     * @returns Promise that resolves when command is sent
     */
    async sendTowerStateStateful(state) {
      const stateToSend = __spreadValues({}, state);
      stateToSend.audio = { sample: 0, loop: false, volume: 0 };
      const command = this.deps.commandFactory.packTowerStateCommand(stateToSend);
      this.deps.logger.info("Sending complete tower state", "[UDT][CMD]");
      this.deps.setTowerState(stateToSend, "sendTowerStateStateful");
      await this.sendTowerCommand(command, "sendTowerStateStateful");
    }
    //#endregion
    /**
     * Public access to sendTowerCommandDirect for testing purposes.
     * This bypasses the command queue and sends commands directly.
     * @param command - The command packet to send directly to the tower
     * @returns Promise that resolves when command is sent
     */
    async sendTowerCommandDirectPublic(command) {
      return await this.sendTowerCommandDirect(command);
    }
    /**
     * Called when a tower response is received to notify the command queue
     * This should be called from the BLE connection response handler
     */
    onTowerResponse() {
      this.commandQueue.onResponse();
    }
    /**
     * Get command queue status for debugging
     */
    getQueueStatus() {
      return this.commandQueue.getStatus();
    }
    /**
     * Clear the command queue (for cleanup or error recovery)
     */
    clearQueue() {
      this.commandQueue.clear();
    }
  };

  // src/udtDiagnostics.ts
  var RING_BUFFER_SIZE = 500;
  var RING_BUFFER_DRAIN = 50;
  var BATTERY_HISTORY_SIZE = 60;
  var PAYLOAD_MAX_BYTES = 32;
  var LIBRARY_VERSION = "3.0.0";
  function detectPlatform() {
    var _a2;
    if (typeof window !== "undefined" && typeof window.navigator !== "undefined") {
      return "web";
    }
    if (typeof process !== "undefined" && ((_a2 = process.versions) == null ? void 0 : _a2.node)) {
      return "node";
    }
    return "custom";
  }
  function makeId() {
    const g = globalThis;
    if (g.crypto && typeof g.crypto.randomUUID === "function") {
      try {
        return g.crypto.randomUUID();
      } catch (e) {
      }
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }
  function bytesToHex(data, maxBytes = PAYLOAD_MAX_BYTES) {
    const slice = data.length > maxBytes ? data.subarray(0, maxBytes) : data;
    let out = "";
    for (let i = 0; i < slice.length; i++) {
      out += slice[i].toString(16).padStart(2, "0");
    }
    if (data.length > maxBytes) {
      out += `..(+${data.length - maxBytes})`;
    }
    return out;
  }
  var InMemorySink = class {
    constructor(maxIncidents = 50) {
      this.incidents = [];
      this.maxIncidents = maxIncidents;
    }
    onIncident(report) {
      this.incidents.push(report);
      if (this.incidents.length > this.maxIncidents) {
        this.incidents.splice(0, this.incidents.length - this.maxIncidents);
      }
    }
    list() {
      return [...this.incidents];
    }
    get(incidentId) {
      return this.incidents.find((r) => r.incidentId === incidentId);
    }
    clear() {
      this.incidents = [];
    }
  };
  var UdtDiagnosticsRecorder = class {
    constructor(config) {
      this.events = [];
      this.batteryHistory = [];
      this.sessionId = "";
      this.connectedAt = null;
      this.lastIncident = null;
      var _a2, _b;
      this.enabled = config.enabled;
      this.capturePayloads = (_a2 = config.capturePayloads) != null ? _a2 : false;
      this.sinks = (_b = config.sinks) != null ? _b : [];
    }
    setSinks(sinks) {
      this.sinks = sinks;
    }
    getSinks() {
      return [...this.sinks];
    }
    addSink(sink) {
      this.sinks.push(sink);
    }
    /** Mark the start of a connected session. Called from BLE connect path. */
    beginSession() {
      if (!this.enabled) return;
      this.sessionId = makeId();
      this.connectedAt = Date.now();
      this.events = [];
      this.batteryHistory = [];
      this.recordEvent("connect");
    }
    recordEvent(kind, data) {
      if (!this.enabled) return;
      const event = { t: Date.now(), kind };
      if (data) event.data = data;
      this.events.push(event);
      if (this.events.length > RING_BUFFER_SIZE) {
        this.events.splice(0, RING_BUFFER_DRAIN);
      }
      for (const sink of this.sinks) {
        if (sink.onEvent) {
          try {
            sink.onEvent(event);
          } catch (e) {
            console.error("Diagnostics sink onEvent error:", e);
          }
        }
      }
    }
    recordCommandPayload(kind, data, extra) {
      if (!this.enabled) return;
      const payload = __spreadValues({}, extra);
      if (this.capturePayloads) {
        payload.payloadHex = bytesToHex(data);
        payload.payloadLen = data.length;
      }
      this.recordEvent(kind, payload);
    }
    recordBattery(mv, pct) {
      if (!this.enabled) return;
      this.batteryHistory.push({ t: Date.now(), mv, pct });
      if (this.batteryHistory.length > BATTERY_HISTORY_SIZE) {
        this.batteryHistory.splice(0, this.batteryHistory.length - BATTERY_HISTORY_SIZE);
      }
    }
    /** Forwards a log line into the events ring (called by Logger when bridged). */
    recordLog(level, message, context) {
      if (!this.enabled) return;
      this.recordEvent("log", { level, message, context });
    }
    /**
     * Capture an incident snapshot and dispatch to sinks.
     * Must be called BEFORE the BLE layer clears state.
     */
    recordIncident(inputs) {
      if (!this.enabled) return null;
      const triggeredAt = Date.now();
      const inFlightCommandAgeMs = inputs.commandQueue.currentCommand ? triggeredAt - inputs.commandQueue.currentCommand.timestamp : null;
      const report = {
        schemaVersion: 1,
        incidentId: makeId(),
        sessionId: this.sessionId || makeId(),
        cause: inputs.cause,
        triggeredAt,
        connectedAt: this.connectedAt,
        sessionDurationMs: this.connectedAt ? triggeredAt - this.connectedAt : 0,
        connectionStatus: __spreadValues({}, inputs.connectionStatus),
        deviceInformation: __spreadValues({}, inputs.deviceInformation),
        commandQueue: {
          queueLength: inputs.commandQueue.queueLength,
          isProcessing: inputs.commandQueue.isProcessing,
          currentCommand: inputs.commandQueue.currentCommand ? __spreadValues({}, inputs.commandQueue.currentCommand) : null
        },
        inFlightCommandAgeMs,
        towerState: inputs.towerState ? JSON.parse(JSON.stringify(inputs.towerState)) : null,
        brokenSeals: [...inputs.brokenSeals],
        recentEvents: [...this.events],
        batteryHistory: [...this.batteryHistory],
        library: { version: LIBRARY_VERSION, platform: detectPlatform() },
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : void 0
      };
      this.lastIncident = report;
      this.recordEvent("disconnect", { cause: inputs.cause });
      for (const sink of this.sinks) {
        try {
          const result = sink.onIncident(report);
          if (result && typeof result.then === "function") {
            result.catch((e) => console.error("Diagnostics sink onIncident error:", e));
          }
        } catch (e) {
          console.error("Diagnostics sink onIncident error:", e);
        }
      }
      return report;
    }
    getRingBuffer() {
      return [...this.events];
    }
    getBatteryHistory() {
      return [...this.batteryHistory];
    }
    getSessionId() {
      return this.sessionId;
    }
    getConnectedAt() {
      return this.connectedAt;
    }
    getLastIncident() {
      return this.lastIncident;
    }
    clearRingBuffer() {
      this.events = [];
      this.batteryHistory = [];
    }
  };

  // src/UltimateDarkTower.ts
  var UltimateDarkTower = class {
    constructor(config) {
      this.beforeUnloadHandler = null;
      // tower configuration
      this.retrySendCommandCountRef = { value: 0 };
      this.retrySendCommandMax = DEFAULT_RETRY_SEND_COMMAND_MAX;
      // tower state
      this.currentBatteryValue = 0;
      this.previousBatteryValue = 0;
      this.currentBatteryPercentage = 0;
      this.previousBatteryPercentage = 0;
      this.brokenSeals = /* @__PURE__ */ new Set();
      // Complete tower state tracking for stateful commands
      this.currentTowerState = createDefaultTowerState();
      // glyph position tracking
      this.glyphPositions = {
        cleanse: null,
        quest: null,
        battle: null,
        banner: null,
        reinforce: null
      };
      // Event callback functions
      // Override these with your own functions to handle events in your app
      this.onTowerConnect = () => {
      };
      this.onTowerDisconnect = () => {
      };
      this.onCalibrationComplete = () => {
      };
      this.onSkullDrop = (towerSkullCount) => {
        void towerSkullCount;
      };
      this.onBatteryLevelNotify = (millivolts) => {
        void millivolts;
      };
      this.onTowerStateUpdate = (newState, oldState, source) => {
        void newState;
        void oldState;
        void source;
      };
      // utility
      this._logDetail = false;
      this.initializeLogger();
      this.initializeDiagnostics(config == null ? void 0 : config.diagnostics);
      this.initializeComponents(config);
      this.setupTowerResponseCallback();
      this.installBeforeUnloadHandler();
    }
    /**
     * Initialize the logger with default console output
     */
    initializeLogger() {
      this.logger = new Logger();
      this.logger.addOutput(new ConsoleOutput());
    }
    /**
     * Initialize the diagnostics recorder. Always constructed; `enabled` defaults
     * to false, so when no config is supplied the recorder is a no-op aside from
     * a single boolean check at each hook site.
     */
    initializeDiagnostics(config) {
      var _a2, _b;
      const sinks = (_a2 = config == null ? void 0 : config.sinks) != null ? _a2 : (config == null ? void 0 : config.enabled) ? [new InMemorySink()] : [];
      this.diagnosticsRecorder = new UdtDiagnosticsRecorder({
        enabled: (_b = config == null ? void 0 : config.enabled) != null ? _b : false,
        capturePayloads: config == null ? void 0 : config.capturePayloads,
        sinks
      });
      this.logger.setDiagnosticsTarget(this.diagnosticsRecorder);
    }
    /**
     * Initialize all tower components and their dependencies
     */
    initializeComponents(config) {
      let adapter;
      if (config == null ? void 0 : config.adapter) {
        adapter = config.adapter;
      } else if ((config == null ? void 0 : config.platform) && config.platform !== "auto" /* AUTO */) {
        adapter = BluetoothAdapterFactory.create(config.platform);
      }
      this.towerEventCallbacks = this.createTowerEventCallbacks();
      this.bleConnection = new UdtBleConnection(this.logger, this.towerEventCallbacks, adapter, this.diagnosticsRecorder);
      this.responseProcessor = new TowerResponseProcessor(this.logDetail);
      this.commandFactory = new UdtCommandFactory();
      const commandDependencies = this.createCommandDependencies();
      this.towerCommands = new UdtTowerCommands(commandDependencies);
      this.bleConnection.setDiagnosticsSnapshotProviders({
        commandQueue: () => this.towerCommands.getQueueStatus(),
        towerState: () => this.currentTowerState,
        brokenSeals: () => Array.from(this.brokenSeals)
      });
      if (config == null ? void 0 : config.brokenSeals) {
        for (const seal of config.brokenSeals) {
          const sealKey = `${seal.level}-${seal.side}`;
          this.brokenSeals.add(sealKey);
        }
      }
    }
    /**
     * Browser-only: synthesize a `page_unload` incident if the page closes while
     * connected. Without this, refreshing the page during a hang loses the
     * lead-up context. IndexedDB writes during unload are best-effort.
     */
    installBeforeUnloadHandler() {
      if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
      this.beforeUnloadHandler = () => {
        var _a2;
        if (this.diagnosticsRecorder.enabled && ((_a2 = this.bleConnection) == null ? void 0 : _a2.isConnected)) {
          try {
            this.bleConnection.recordIncidentPublic("page_unload");
          } catch (e) {
          }
        }
      };
      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }
    /**
     * Set up the tower response callback after all components are initialized
     */
    setupTowerResponseCallback() {
      this.towerEventCallbacks.onTowerResponse = (response) => {
        this.towerCommands.onTowerResponse();
        if (response.length >= TOWER_STATE_RESPONSE_MIN_LENGTH) {
          const { cmdKey } = this.responseProcessor.getTowerCommand(response[0]);
          if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
            const stateData = response.slice(TOWER_STATE_DATA_OFFSET, TOWER_STATE_RESPONSE_MIN_LENGTH);
            this.updateTowerStateFromResponse(stateData);
          }
        }
      };
    }
    /**
    * Create tower event callbacks for BLE connection
    */
    createTowerEventCallbacks() {
      return {
        onTowerConnect: () => this.onTowerConnect(),
        onTowerDisconnect: () => {
          this.onTowerDisconnect();
          if (this.towerCommands) {
            this.towerCommands.clearQueue();
          }
        },
        onBatteryLevelNotify: (millivolts) => {
          this.updateBatteryState(millivolts);
          this.onBatteryLevelNotify(millivolts);
        },
        onCalibrationComplete: () => {
          this.setGlyphPositionsFromCalibration();
          this.onCalibrationComplete();
        },
        onSkullDrop: (towerSkullCount) => this.onSkullDrop(towerSkullCount),
        // onTowerResponse will be set up after tower commands are initialized
        onTowerResponse: () => {
        }
      };
    }
    /**
     * Create command dependencies object for tower commands
     */
    createCommandDependencies() {
      return {
        logger: this.logger,
        commandFactory: this.commandFactory,
        bleConnection: this.bleConnection,
        responseProcessor: this.responseProcessor,
        logDetail: this.logDetail,
        retrySendCommandCount: this.retrySendCommandCountRef,
        retrySendCommandMax: this.retrySendCommandMax,
        getCurrentTowerState: () => this.currentTowerState,
        setTowerState: (newState, source) => this.setTowerState(newState, source),
        recorder: this.diagnosticsRecorder
      };
    }
    /**
     * Update battery state values
     */
    updateBatteryState(millivolts) {
      this.previousBatteryValue = this.currentBatteryValue;
      this.currentBatteryValue = millivolts;
      this.previousBatteryPercentage = this.currentBatteryPercentage;
      this.currentBatteryPercentage = milliVoltsToPercentageNumber(millivolts);
    }
    get logDetail() {
      return this._logDetail;
    }
    set logDetail(value) {
      this._logDetail = value;
      this.responseProcessor.setDetailedLogging(value);
      if (this.towerCommands) {
        this.updateTowerCommandDependencies();
      }
    }
    /**
     * Update tower command dependencies when configuration changes
     */
    updateTowerCommandDependencies() {
      const commandDependencies = this.createCommandDependencies();
      this.towerCommands = new UdtTowerCommands(commandDependencies);
    }
    // Getter methods for connection state
    get isConnected() {
      return this.bleConnection.isConnected;
    }
    get isCalibrated() {
      return isCalibrated(this.currentTowerState);
    }
    get performingCalibration() {
      return this.bleConnection.performingCalibration;
    }
    get performingLongCommand() {
      return this.bleConnection.performingLongCommand;
    }
    get towerSkullDropCount() {
      return this.bleConnection.towerSkullDropCount;
    }
    // Getter methods for battery state
    get currentBattery() {
      return this.currentBatteryValue;
    }
    get previousBattery() {
      return this.previousBatteryValue;
    }
    get currentBatteryPercent() {
      return this.currentBatteryPercentage;
    }
    get previousBatteryPercent() {
      return this.previousBatteryPercentage;
    }
    // Getter/setter methods for connection configuration
    get batteryLogFrequency() {
      return this.bleConnection.batteryLogFrequency;
    }
    set batteryLogFrequency(value) {
      this.bleConnection.batteryLogFrequency = value;
    }
    get batteryLogOnChangeOnly() {
      return this.bleConnection.batteryLogOnChangeOnly;
    }
    set batteryLogOnChangeOnly(value) {
      this.bleConnection.batteryLogOnChangeOnly = value;
    }
    get batteryLogEnabled() {
      return this.bleConnection.batteryLogEnabled;
    }
    set batteryLogEnabled(value) {
      this.bleConnection.batteryLogEnabled = value;
    }
    get logTowerResponses() {
      return this.bleConnection.logTowerResponses;
    }
    set logTowerResponses(value) {
      this.bleConnection.logTowerResponses = value;
    }
    get logTowerResponseConfig() {
      return this.bleConnection.logTowerResponseConfig;
    }
    set logTowerResponseConfig(value) {
      this.bleConnection.logTowerResponseConfig = value;
    }
    //#region Tower Commands 
    /**
     * Initiates tower calibration to determine the current position of all tower drums.
     * This must be performed after connection before other tower operations.
     * @returns Promise that resolves when calibration command is sent
     */
    async calibrate() {
      return this.towerCommands.calibrate();
    }
    /**
     * Plays a sound from the tower's audio library.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
      return this.towerCommands.playSound(soundIndex);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights2) {
      return this.towerCommands.lights(lights2);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @deprecated Use `lights()` instead. This method will be removed in a future version.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async Lights(lights2) {
      return this.lights(lights2);
    }
    /**
     * Sends a raw command packet directly to the tower (for testing purposes).
     * @param command - The raw command packet to send
     * @returns Promise that resolves when command is sent
     */
    async sendTowerCommandDirect(command) {
      return this.towerCommands.sendTowerCommandDirectPublic(command);
    }
    /**
     * Sends a light override command to control specific light patterns.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
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
    async Rotate(top, middle, bottom, soundIndex) {
      const oldTopPosition = this.getCurrentDrumPosition("top");
      const oldMiddlePosition = this.getCurrentDrumPosition("middle");
      const oldBottomPosition = this.getCurrentDrumPosition("bottom");
      const result = await this.towerCommands.rotate(top, middle, bottom, soundIndex);
      this.calculateAndUpdateGlyphPositions("top", oldTopPosition, top);
      this.calculateAndUpdateGlyphPositions("middle", oldMiddlePosition, middle);
      this.calculateAndUpdateGlyphPositions("bottom", oldBottomPosition, bottom);
      return result;
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
      return await this.towerCommands.resetTowerSkullCount();
    }
    //#endregion
    //#region Stateful Tower Commands
    /**
     * Sets a specific LED using stateful commands that preserve all other tower state.
     * This is the recommended way to control individual LEDs.
     * @param layerIndex - Layer index (0-5: TopRing, MiddleRing, BottomRing, Ledge, Base1, Base2)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, 3=fast pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns Promise that resolves when command is sent
     */
    async setLED(layerIndex, lightIndex, effect, loop = false) {
      return await this.towerCommands.setLEDStateful(layerIndex, lightIndex, effect, loop);
    }
    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * @param soundIndex - Index of the sound to play (1-based)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-3, 0=loudest, 3=softest), optional. Out-of-range values are clamped.
     * @returns Promise that resolves when command is sent
     */
    async playSoundStateful(soundIndex, loop = false, volume) {
      return await this.towerCommands.playSoundStateful(soundIndex, loop, volume);
    }
    /**
     * Rotates a single drum using stateful commands that preserve existing tower state.
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns Promise that resolves when command is sent
     */
    async rotateDrumStateful(drumIndex, position, playSound2 = false) {
      return await this.towerCommands.rotateDrumStateful(drumIndex, position, playSound2);
    }
    /**
     * Rotates tower drums to specified positions using stateful commands that preserve existing tower state.
     * This is the recommended way to rotate drums as it preserves LEDs and other tower state.
     * @param top - Position for the top drum ('north', 'east', 'south', 'west')
     * @param middle - Position for the middle drum
     * @param bottom - Position for the bottom drum
     * @param soundIndex - Optional sound to play during rotation
     * @returns Promise that resolves when rotate command is sent
     */
    async rotateWithState(top, middle, bottom, soundIndex) {
      const oldTopPosition = this.getCurrentDrumPosition("top");
      const oldMiddlePosition = this.getCurrentDrumPosition("middle");
      const oldBottomPosition = this.getCurrentDrumPosition("bottom");
      const result = await this.towerCommands.rotateWithState(top, middle, bottom, soundIndex);
      this.calculateAndUpdateGlyphPositions("top", oldTopPosition, top);
      this.calculateAndUpdateGlyphPositions("middle", oldMiddlePosition, middle);
      this.calculateAndUpdateGlyphPositions("bottom", oldBottomPosition, bottom);
      return result;
    }
    /**
     * Turns all tower LEDs on with the specified light effect, sending a single command packet.
     * Preserves current drum, beam, and audio state while overriding all 6 layers of lights.
     * @param effect - Light effect to apply (default: LIGHT_EFFECTS.on). Use LIGHT_EFFECTS constants for named values.
     * @returns Promise that resolves when the command is sent
     */
    async allLightsOn(effect = LIGHT_EFFECTS.on) {
      const currentState = this.getCurrentTowerState();
      const loop = effect !== LIGHT_EFFECTS.off;
      const newState = __spreadProps(__spreadValues({}, currentState), {
        layer: currentState.layer.map((layer) => ({
          light: layer.light.map(() => ({ effect, loop }))
        }))
      });
      return this.sendTowerState(newState);
    }
    /**
     * Turns all tower LEDs off, sending a single command packet.
     * Convenience wrapper around allLightsOn(LIGHT_EFFECTS.off).
     * @returns Promise that resolves when the command is sent
     */
    async allLightsOff() {
      return this.allLightsOn(LIGHT_EFFECTS.off);
    }
    //#endregion
    //#region Tower State Management
    /**
     * Gets the current complete tower state if available.
     * @returns The current tower state object
     */
    getCurrentTowerState() {
      return __spreadValues({}, this.currentTowerState);
    }
    /**
     * Sends a complete tower state to the tower, preserving existing state.
     * Audio state is automatically cleared to prevent sounds from persisting across commands.
     * @param towerState - The tower state to send
     * @returns Promise that resolves when the command is sent
     */
    async sendTowerState(towerState) {
      const stateToSend = __spreadValues({}, towerState);
      stateToSend.audio = { sample: 0, loop: false, volume: 0 };
      const stateData = new Uint8Array(TOWER_STATE_DATA_SIZE);
      const success = rtdt_pack_state(stateData, TOWER_STATE_DATA_SIZE, stateToSend);
      if (!success) {
        throw new Error("Failed to pack tower state data");
      }
      const command = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
      command[0] = TOWER_COMMAND_TYPE_TOWER_STATE;
      command.set(stateData, TOWER_STATE_DATA_OFFSET);
      this.setTowerState(__spreadValues({}, stateToSend), "sendTowerState");
      return await this.sendTowerCommandDirect(command);
    }
    /**
     * Sets the tower state with comprehensive logging of changes.
     * @param newState - The new tower state to set
     * @param source - Source identifier for logging (e.g., "sendTowerState", "tower response")
     */
    setTowerState(newState, source) {
      const oldState = this.currentTowerState;
      this.currentTowerState = newState;
      this.logger.logTowerStateChange(oldState, newState, source, this.logDetail);
      this.onTowerStateUpdate(newState, oldState, source);
    }
    /**
     * Updates the current tower state from a tower response.
     * Called internally when tower state responses are received.
     * Audio state is reset to prevent sounds from persisting across commands.
     * @param stateData - The 19-byte state data from tower response
     */
    updateTowerStateFromResponse(stateData) {
      const newState = rtdt_unpack_state(stateData);
      newState.audio = { sample: 0, loop: false, volume: this.currentTowerState.audio.volume };
      newState.led_sequence = 0;
      this.setTowerState(newState, "tower response");
    }
    //#endregion
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @param volume - Optional volume override (0=loud, 1=medium, 2=quiet, 3=mute). Uses current tower state if not provided.
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal, volume) {
      const result = await this.towerCommands.breakSeal(seal, volume);
      const sealKey = `${seal.level}-${seal.side}`;
      this.brokenSeals.add(sealKey);
      return result;
    }
    /**
     * Randomly rotates specified tower levels to random positions.
     * @param level - Level configuration: 0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom
     * @returns Promise that resolves when rotation command is sent
     */
    async randomRotateLevels(level = 0) {
      const beforeTop = this.getCurrentDrumPosition("top");
      const beforeMiddle = this.getCurrentDrumPosition("middle");
      const beforeBottom = this.getCurrentDrumPosition("bottom");
      const result = await this.towerCommands.randomRotateLevels(level);
      const afterTop = this.getCurrentDrumPosition("top");
      const afterMiddle = this.getCurrentDrumPosition("middle");
      const afterBottom = this.getCurrentDrumPosition("bottom");
      if (beforeTop !== afterTop) {
        this.calculateAndUpdateGlyphPositions("top", beforeTop, afterTop);
      }
      if (beforeMiddle !== afterMiddle) {
        this.calculateAndUpdateGlyphPositions("middle", beforeMiddle, afterMiddle);
      }
      if (beforeBottom !== afterBottom) {
        this.calculateAndUpdateGlyphPositions("bottom", beforeBottom, afterBottom);
      }
      return result;
    }
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level) {
      return this.towerCommands.getCurrentDrumPosition(level);
    }
    /**
     * Sets the initial glyph positions from calibration.
     * Called automatically when calibration completes.
     */
    setGlyphPositionsFromCalibration() {
      for (const glyphKey in GLYPHS) {
        const glyph = glyphKey;
        this.glyphPositions[glyph] = GLYPHS[glyph].side;
      }
    }
    /**
     * Gets the current position of a specific glyph.
     * @param glyph - The glyph to get position for
     * @returns The current position of the glyph, or null if not calibrated
     */
    getGlyphPosition(glyph) {
      return this.glyphPositions[glyph];
    }
    /**
     * Gets all current glyph positions.
     * @returns Object mapping each glyph to its current position (or null if not calibrated)
     */
    getAllGlyphPositions() {
      return __spreadValues({}, this.glyphPositions);
    }
    /**
     * Gets all glyphs currently facing a specific direction.
     * @param direction - The direction to check for (north, east, south, west)
     * @returns Array of glyph names that are currently facing the specified direction
     */
    getGlyphsFacingDirection(direction) {
      const glyphsFacing = [];
      for (const glyphKey in this.glyphPositions) {
        const glyph = glyphKey;
        const position = this.glyphPositions[glyph];
        if (position && position.toLowerCase() === direction.toLowerCase()) {
          glyphsFacing.push(glyph);
        }
      }
      return glyphsFacing;
    }
    /**
     * Updates glyph positions after a drum rotation.
     * @param level - The drum level that was rotated
     * @param rotationSteps - Number of steps rotated (1 = 90 degrees clockwise)
     */
    updateGlyphPositionsAfterRotation(level, rotationSteps) {
      const sides = ["north", "east", "south", "west"];
      for (const glyphKey in GLYPHS) {
        const glyph = glyphKey;
        const glyphData = GLYPHS[glyph];
        if (glyphData.level === level && this.glyphPositions[glyph] !== null) {
          const currentPosition = this.glyphPositions[glyph];
          const currentIndex = sides.indexOf(currentPosition);
          const newIndex = (currentIndex + rotationSteps) % sides.length;
          this.glyphPositions[glyph] = sides[newIndex];
        }
      }
    }
    /**
     * Calculates rotation steps and updates glyph positions for a specific level.
     * @param level - The drum level that was rotated
     * @param oldPosition - The position before rotation
     * @param newPosition - The position after rotation
     */
    calculateAndUpdateGlyphPositions(level, oldPosition, newPosition) {
      const sides = ["north", "east", "south", "west"];
      const oldIndex = sides.indexOf(oldPosition);
      const newIndex = sides.indexOf(newPosition);
      let rotationSteps = newIndex - oldIndex;
      if (rotationSteps < 0) {
        rotationSteps += TOWER_SIDES_COUNT;
      }
      if (rotationSteps > 0) {
        this.updateGlyphPositionsAfterRotation(level, rotationSteps);
      }
    }
    /**
     * Updates glyph positions for a specific level rotation.
     * @param level - The drum level that was rotated
     * @param newPosition - The new position the drum was rotated to
     * @deprecated Use calculateAndUpdateGlyphPositions instead
     */
    updateGlyphPositionsForRotation(level, newPosition) {
      const currentPosition = this.getCurrentDrumPosition(level);
      const sides = ["north", "east", "south", "west"];
      const currentIndex = sides.indexOf(currentPosition);
      const newIndex = sides.indexOf(newPosition);
      let rotationSteps = newIndex - currentIndex;
      if (rotationSteps < 0) {
        rotationSteps += TOWER_SIDES_COUNT;
      }
      this.updateGlyphPositionsAfterRotation(level, rotationSteps);
    }
    /**
     * Checks if a specific seal is broken.
     * @param seal - The seal identifier to check
     * @returns True if the seal is broken, false otherwise
     */
    isSealBroken(seal) {
      const sealKey = `${seal.level}-${seal.side}`;
      return this.brokenSeals.has(sealKey);
    }
    /**
     * Gets a list of all broken seals.
     * @returns Array of SealIdentifier objects representing all broken seals
     */
    getBrokenSeals() {
      return Array.from(this.brokenSeals).map((sealKey) => {
        const [level, side] = sealKey.split("-");
        return { level, side };
      });
    }
    /**
     * Marks a seal as broken in software tracking without sending any commands to the tower.
     * Use this to restore game state (e.g., resuming a game where seals were already broken).
     * Unlike breakSeal(), this does NOT trigger sound or light effects on the tower.
     * @param seal - Seal identifier to mark as broken
     */
    markSealBroken(seal) {
      const sealKey = `${seal.level}-${seal.side}`;
      this.brokenSeals.add(sealKey);
    }
    /**
     * Marks a seal as unbroken in software tracking without sending any commands to the tower.
     * Use this to undo a seal break or restore individual seals for game state management.
     * @param seal - Seal identifier to mark as unbroken
     */
    markSealRestored(seal) {
      const sealKey = `${seal.level}-${seal.side}`;
      this.brokenSeals.delete(sealKey);
    }
    /**
     * Resets the broken seals tracking (clears all broken seals).
     */
    resetBrokenSeals() {
      this.brokenSeals.clear();
    }
    /**
     * Gets a random unbroken seal that can be passed to breakSeal().
     * @returns A random SealIdentifier that is not currently broken, or null if all seals are broken
     */
    getRandomUnbrokenSeal() {
      const allSeals = [];
      const levels = ["top", "middle", "bottom"];
      const sides = ["north", "east", "south", "west"];
      for (const level of levels) {
        for (const side of sides) {
          allSeals.push({ level, side });
        }
      }
      const unbrokenSeals = allSeals.filter((seal) => !this.isSealBroken(seal));
      if (unbrokenSeals.length === 0) {
        return null;
      }
      const randomIndex = Math.floor(Math.random() * unbrokenSeals.length);
      return unbrokenSeals[randomIndex];
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
    setLoggerOutputs(outputs) {
      this.logger.clearOutputs();
      outputs.forEach((output) => this.logger.addOutput(output));
    }
    /**
     * Sends a command packet to the tower via Bluetooth with error handling and retry logic.
     * @param {Uint8Array} command - The command packet to send to the tower
     * @returns {Promise<void>} Promise that resolves when command is sent successfully
     */
    async sendTowerCommand(command) {
      return await this.towerCommands.sendTowerCommand(command);
    }
    /**
     * Converts a command packet to a hex string representation for debugging.
     * @param {Uint8Array} command - Command packet to convert
     * @returns {string} Hex string representation of the command packet
     */
    commandToPacketString(command) {
      return commandToPacketString(command);
    }
    /**
     * Converts battery voltage in millivolts to percentage.
     * @param {number} mv - Battery voltage in millivolts
     * @returns {string} Battery percentage as formatted string (e.g., "75%")
     */
    milliVoltsToPercentage(mv) {
      return milliVoltsToPercentage(mv);
    }
    //#endregion
    //#region Connection Management
    /**
     * Enable or disable connection monitoring
     * @param {boolean} enabled - Whether to enable connection monitoring
     */
    setConnectionMonitoring(enabled) {
      this.bleConnection.setConnectionMonitoring(enabled);
    }
    /**
     * Configure connection monitoring parameters
     * @param {number} [frequency=2000] - How often to check connection (milliseconds)
     * @param {number} [timeout=30000] - How long to wait for responses before considering connection lost (milliseconds)
     */
    configureConnectionMonitoring(frequency = DEFAULT_CONNECTION_MONITORING_FREQUENCY, timeout = DEFAULT_CONNECTION_MONITORING_TIMEOUT) {
      this.bleConnection.configureConnectionMonitoring(frequency, timeout);
    }
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
     * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
     * @param {boolean} [verifyConnection=true] - Whether to verify connection status before triggering disconnection on heartbeat timeout
     */
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = DEFAULT_BATTERY_HEARTBEAT_TIMEOUT, verifyConnection = true) {
      this.bleConnection.configureBatteryHeartbeatMonitoring(enabled, timeout, verifyConnection);
    }
    /**
     * Check if the tower is currently connected
     * @returns {Promise<boolean>} True if connected and responsive
     */
    async isConnectedAndResponsive() {
      return await this.bleConnection.isConnectedAndResponsive();
    }
    /**
     * Get detailed connection status including heartbeat information
     * @returns {Object} Object with connection details
     */
    getConnectionStatus() {
      return this.bleConnection.getConnectionStatus();
    }
    /**
     * Get device information read from the tower's Device Information Service (DIS)
     * @returns {DeviceInformation} Object with manufacturer, model, serial, firmware, etc.
     */
    getDeviceInformation() {
      return this.bleConnection.getDeviceInformation();
    }
    //#endregion
    //#region cleanup
    /**
     * Permanently release all resources and disconnect.
     *
     * This method is **final and idempotent**: calling it more than once is safe,
     * but after the first call the instance is disposed and `connect()` will throw.
     * Use `disconnect()` instead if you intend to reconnect later.
     *
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    async cleanup() {
      this.logger.info("Cleaning up UltimateDarkTower instance", "[UDT]");
      this.towerCommands.clearQueue();
      if (this.beforeUnloadHandler && typeof window !== "undefined") {
        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
        this.beforeUnloadHandler = null;
      }
      this.logger.setDiagnosticsTarget(null);
      await this.bleConnection.cleanup();
    }
    //#endregion
    //#region Diagnostics (BLE flight recorder)
    /**
     * Get the diagnostics recorder for direct access (live ring buffer, sinks,
     * runtime enable/disable). Always returns a recorder; check `.enabled` to
     * see whether capture is active.
     */
    getDiagnosticsRecorder() {
      return this.diagnosticsRecorder;
    }
    /**
     * Toggle diagnostics capture at runtime without reconstructing the tower.
     * When enabled mid-session, the next BLE event begins populating the buffer.
     */
    setDiagnosticsEnabled(enabled) {
      this.diagnosticsRecorder.enabled = enabled;
    }
    /**
     * Whether diagnostics capture is currently active.
     */
    isDiagnosticsEnabled() {
      return this.diagnosticsRecorder.enabled;
    }
    /**
     * Get the most recent disconnect incident report, or null if none captured
     * since this instance was created.
     */
    getLastIncident() {
      return this.diagnosticsRecorder.getLastIncident();
    }
    /**
     * Export current ring buffer + last incident as JSON for sharing/analysis.
     * Useful as a one-liner in a "copy diagnostic info" button.
     */
    exportDiagnosticsJSON() {
      return JSON.stringify({
        schemaVersion: 1,
        capturedAt: Date.now(),
        sessionId: this.diagnosticsRecorder.getSessionId(),
        ringBuffer: this.diagnosticsRecorder.getRingBuffer(),
        batteryHistory: this.diagnosticsRecorder.getBatteryHistory(),
        lastIncident: this.diagnosticsRecorder.getLastIncident()
      }, null, 2);
    }
    //#endregion
  };
  var UltimateDarkTower_default = UltimateDarkTower;

  // src/index.ts
  init_udtConstants();

  // src/sinks/IndexedDBSink.ts
  var DB_NAME = "udt-diagnostics";
  var DB_VERSION = 1;
  var STORE_NAME = "incidents";
  function indexedDBAvailable() {
    try {
      return typeof indexedDB !== "undefined";
    } catch (e) {
      return false;
    }
  }
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "incidentId" });
          store.createIndex("triggeredAt", "triggeredAt", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  var IndexedDBSink = class {
    constructor(maxIncidents = 50) {
      this.dbPromise = null;
      this.maxIncidents = maxIncidents;
      this.available = indexedDBAvailable();
    }
    async getDb() {
      if (!this.available) return null;
      if (!this.dbPromise) {
        this.dbPromise = openDb().catch((err) => {
          this.available = false;
          this.dbPromise = null;
          throw err;
        });
      }
      try {
        return await this.dbPromise;
      } catch (e) {
        return null;
      }
    }
    async onIncident(report) {
      const db = await this.getDb();
      if (!db) return;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(report);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }).catch((e) => console.error("IndexedDBSink put failed:", e));
      await this.evictOld();
    }
    async list() {
      const db = await this.getDb();
      if (!db) return [];
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result.slice();
          all.sort((a, b) => b.triggeredAt - a.triggeredAt);
          resolve(all);
        };
        req.onerror = () => reject(req.error);
      });
    }
    async get(incidentId) {
      const db = await this.getDb();
      if (!db) return void 0;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(incidentId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    async delete(incidentId) {
      const db = await this.getDb();
      if (!db) return;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(incidentId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((e) => console.error("IndexedDBSink delete failed:", e));
    }
    async clear() {
      const db = await this.getDb();
      if (!db) return;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch((e) => console.error("IndexedDBSink clear failed:", e));
    }
    /** Insert an externally-supplied report (e.g. from a JSON import). */
    async put(report) {
      return this.onIncident(report);
    }
    async evictOld() {
      const db = await this.getDb();
      if (!db) return;
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const countReq = store.count();
        countReq.onsuccess = () => {
          const total = countReq.result;
          if (total <= this.maxIncidents) {
            resolve();
            return;
          }
          const toRemove = total - this.maxIncidents;
          const idx = store.index("triggeredAt");
          const cursorReq = idx.openCursor();
          let removed = 0;
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor || removed >= toRemove) {
              resolve();
              return;
            }
            cursor.delete();
            removed++;
            cursor.continue();
          };
          cursorReq.onerror = () => resolve();
        };
        countReq.onerror = () => resolve();
      });
    }
  };

  // src/index.ts
  var src_default = UltimateDarkTower_default;

  // examples/controller/TowerController.ts
  var DIAG_ENABLED_KEY = "udt:diagnostics:enabled";
  var DIAG_PAYLOADS_KEY = "udt:diagnostics:capturePayloads";
  var incidentSink = new IndexedDBSink();
  var memorySink = new InMemorySink();
  function readBoolStorage(key, fallback) {
    try {
      return localStorage.getItem(key) === "true" || localStorage.getItem(key) === null && fallback;
    } catch (e) {
      return fallback;
    }
  }
  function buildDiagnosticsConfig() {
    return {
      enabled: readBoolStorage(DIAG_ENABLED_KEY, false),
      capturePayloads: readBoolStorage(DIAG_PAYLOADS_KEY, false),
      sinks: [memorySink, incidentSink]
    };
  }
  var Tower = new src_default({ diagnostics: buildDiagnosticsConfig() });
  var emulatorAdapter = null;
  var towerEmulatorWindow = null;
  var currentConnectionMode = null;
  var towerEmulatorConnectInFlight = false;
  var towerEmulatorWindowDisconnectInFlight = false;
  function hasOpenTowerEmulatorWindow() {
    return !!towerEmulatorWindow && !towerEmulatorWindow.closed;
  }
  var postStateToTowerEmulatorWindow = (state) => {
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.postMessage({ type: "applyState", state }, "*");
  };
  var postAudioEventToEmulatorWindow = (sample, loop, volume) => {
    var _a2, _b;
    const name = (_b = (_a2 = Object.values(TOWER_AUDIO_LIBRARY).find((s) => s.value === sample)) == null ? void 0 : _a2.name) != null ? _b : `#${sample}`;
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.postMessage({ type: "playAudio", name, sample, loop, volume }, "*");
  };
  var postLightSequenceEventToEmulatorWindow = (sequenceId) => {
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.postMessage({ type: "playSequence", sequenceId }, "*");
  };
  var postCalibrateToTowerEmulatorWindow = () => {
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.postMessage({ type: "calibrate" }, "*");
  };
  var syncTowerEmulatorWindow = () => {
    if (!towerEmulatorWindow) {
      return;
    }
    if (Tower.isConnected) {
      postStateToTowerEmulatorWindow(Tower.getCurrentTowerState());
      postSealsToTowerEmulatorWindow();
      return;
    }
    towerEmulatorWindow.postMessage({ type: "showIdle" }, "*");
  };
  async function handleTowerEmulatorWindowClosed() {
    if (!towerEmulatorWindow) {
      return;
    }
    towerEmulatorWindow = null;
    if (currentConnectionMode !== "emulator" || !Tower.isConnected || towerEmulatorWindowDisconnectInFlight) {
      updateEmulatorSealTabVisibility();
      return;
    }
    towerEmulatorWindowDisconnectInFlight = true;
    logger.warn("Tower Emulator window closed - disconnecting emulator session", "[TC]");
    try {
      await Tower.disconnect();
    } catch (error) {
      logger.error(`Failed to disconnect after Tower Emulator window closed: ${error}`, "[TC]");
    } finally {
      towerEmulatorWindowDisconnectInFlight = false;
    }
  }
  var sharedDOMOutput;
  var differentialChart = null;
  var differentialReadings = [];
  var chartDisplayConfig = {
    showIrBeam: true,
    // Default to showing IR beam
    showDrum1: false,
    showDrum2: false,
    showDrum3: false
  };
  var isCollectingData = false;
  var chartTimeWindow = 30;
  var lastChartUpdate = 0;
  var CHART_UPDATE_THROTTLE = 200;
  var MAX_DATA_POINTS = 1e3;
  var initializeLogger = () => {
    sharedDOMOutput = new DOMOutput("log-container", 1e3);
    Tower.setLoggerOutputs([new ConsoleOutput(), sharedDOMOutput]);
    Tower.logDetail = true;
    logger.addOutput(sharedDOMOutput);
    logger.info("Logger initialized with DOM output", "[TC]");
    window.sharedDOMOutput = sharedDOMOutput;
    window.towerDOMOutput = sharedDOMOutput;
    window.loggerDOMOutput = sharedDOMOutput;
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLogger);
  } else {
    initializeLogger();
  }
  window.TOWER_AUDIO_LIBRARY = TOWER_AUDIO_LIBRARY;
  window.TOWER_LIGHT_SEQUENCES = TOWER_LIGHT_SEQUENCES;
  window.LIGHT_EFFECTS = LIGHT_EFFECTS;
  window.GLYPHS = GLYPHS;
  window.rtdt_pack_state = rtdt_pack_state;
  window.rtdt_unpack_state = rtdt_unpack_state;
  window.createDefaultTowerState = createDefaultTowerState;
  window.Tower = Tower;
  window.Tower = Tower;
  window.logger = logger;
  var updateSkullDropCount = (count) => {
    const el = document.getElementById("skull-count");
    if (el) {
      el.innerText = count.toString();
    }
  };
  Tower.onSkullDrop = updateSkullDropCount;
  async function connectToTower() {
    var _a2;
    const mode = (_a2 = document.getElementById("towerTypeSelect")) == null ? void 0 : _a2.value;
    if (mode === "emulator") {
      await connectToTowerEmulator();
      return;
    }
    if (currentConnectionMode !== "ble") {
      try {
        await Tower.cleanup();
      } catch (e) {
      }
      emulatorAdapter = null;
      Tower = new src_default({ diagnostics: buildDiagnosticsConfig() });
      Tower.onSkullDrop = updateSkullDropCount;
      Tower.onTowerConnect = onTowerConnected;
      Tower.onTowerDisconnect = onTowerDisconnected;
      Tower.onCalibrationComplete = onCalibrationComplete;
      Tower.onBatteryLevelNotify = onBatteryLevelNotify;
      Tower.onTowerStateUpdate = onTowerStateUpdate;
      window.Tower = Tower;
      currentConnectionMode = "ble";
    }
    logger.info("Attempting to connect to tower...", "[TC]");
    try {
      await Tower.connect();
    } catch (error) {
      logger.error(`Connection failed: ${error}`, "[TC]");
    }
  }
  async function connectToTowerEmulator() {
    if (false) {
      const towerTypeSelect = document.getElementById("towerTypeSelect");
      if (towerTypeSelect) {
        towerTypeSelect.value = "ble";
      }
      showTowerEmulatorMissingPopup();
      return;
    }
    logger.info("Connecting to Tower Emulator...", "[TC]");
    if (towerEmulatorConnectInFlight) {
      if (hasOpenTowerEmulatorWindow()) {
        towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.focus();
      }
      logger.info("Tower Emulator connection already in progress", "[TC]");
      return;
    }
    if (currentConnectionMode === "emulator" && Tower.isConnected) {
      if (!hasOpenTowerEmulatorWindow()) {
        towerEmulatorWindow = window.open(
          "TowerEmulator.html",
          "TowerEmulator",
          "width=1900,height=855,resizable=yes,scrollbars=yes"
        );
      }
      if (!towerEmulatorWindow) {
        logger.error("Failed to open Tower Emulator window", "[TC]");
        return;
      }
      towerEmulatorWindow.focus();
      syncTowerEmulatorWindow();
      logger.info("Tower Emulator already connected", "[TC]");
      return;
    }
    if (!hasOpenTowerEmulatorWindow()) {
      towerEmulatorWindow = window.open(
        "TowerEmulator.html",
        "TowerEmulator",
        "width=900,height=900,resizable=yes,scrollbars=yes"
      );
    }
    if (!towerEmulatorWindow) {
      logger.error("Failed to open Tower Emulator window", "[TC]");
      return;
    }
    towerEmulatorWindow.focus();
    if (currentConnectionMode !== "emulator") {
      try {
        await Tower.cleanup();
      } catch (e) {
      }
      emulatorAdapter = new TowerEmulatorAdapter({
        onAudioCommand: postAudioEventToEmulatorWindow,
        onLightSequenceCommand: postLightSequenceEventToEmulatorWindow
      });
      Tower = new src_default({
        adapter: emulatorAdapter,
        diagnostics: buildDiagnosticsConfig()
      });
      currentConnectionMode = "emulator";
      Tower.onSkullDrop = updateSkullDropCount;
      Tower.onTowerConnect = onTowerConnected;
      Tower.onTowerDisconnect = onTowerDisconnected;
      Tower.onCalibrationComplete = onCalibrationComplete;
      Tower.onBatteryLevelNotify = onBatteryLevelNotify;
      Tower.onTowerStateUpdate = onTowerStateUpdate;
      window.Tower = Tower;
    }
    towerEmulatorConnectInFlight = true;
    try {
      await Tower.connect();
    } catch (error) {
      logger.error(`Tower Emulator connection failed: ${error}`, "[TC]");
    } finally {
      towerEmulatorConnectInFlight = false;
    }
  }
  var onTowerConnected = () => {
    var _a2;
    syncTowerEmulatorWindow();
    updateEmulatorSealTabVisibility();
    const el = document.getElementById("tower-connection-state");
    if (el) {
      el.innerText = "Tower Connected";
      el.style.background = "rgb(2 255 14 / 30%)";
    }
    logger.info("Tower connected successfully", "[TC]");
    Tower.batteryLogFrequency = 1e3;
    const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]');
    const selectedValue = (_a2 = Array.from(batteryFilterRadios).find((radio) => radio.checked)) == null ? void 0 : _a2.value;
    if (selectedValue === "none") {
      Tower.batteryLogEnabled = false;
    } else {
      Tower.batteryLogEnabled = true;
      Tower.batteryLogOnChangeOnly = selectedValue === "changes";
    }
    updateBatteryTrend();
    updateCalibrationStatus();
    updateDrumDropdowns();
    initializeVolumeDisplay();
    initializeChart();
    updateChartStatus("Tower connected - ready to collect data");
    setupDifferentialReadingsHandler();
    setTimeout(() => {
      try {
        if (typeof refreshStatusPacket === "function") {
          refreshStatusPacket();
        }
      } catch (error) {
        logger.debug("Error initializing status packet: " + error, "[TC]");
      }
    }, 500);
  };
  Tower.onTowerConnect = onTowerConnected;
  var onTowerDisconnected = () => {
    var _a2;
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.postMessage({ type: "showIdle" }, "*");
    const el = document.getElementById("tower-connection-state");
    if (el) {
      el.innerText = "Tower Disconnected";
      el.style.background = "rgb(255 1 1 / 30%)";
    }
    logger.warn("Tower disconnected", "[TC]");
    isCollectingData = false;
    updateChartDataCollectionButton();
    updateChartStatus("Tower disconnected - connect to tower to collect data");
    updateCalibrationStatus();
    updateEmulatorSealTabVisibility();
    setCalibrateButtonDisabled(false);
    (_a2 = document.getElementById("calibrating-message")) == null ? void 0 : _a2.classList.add("hidden");
  };
  Tower.onTowerDisconnect = onTowerDisconnected;
  var setCalibrateButtonDisabled = (disabled) => {
    const btn = document.getElementById("calibrate");
    if (btn) btn.disabled = disabled;
  };
  async function calibrate() {
    if (!Tower.isConnected) {
      return;
    }
    setCalibrateButtonDisabled(true);
    if (currentConnectionMode === "emulator") {
      postCalibrateToTowerEmulatorWindow();
    }
    await Tower.calibrate();
    const el = document.getElementById("calibrating-message");
    if (el) {
      el.classList.remove("hidden");
    }
  }
  var onCalibrationComplete = () => {
    setCalibrateButtonDisabled(false);
    const el = document.getElementById("calibrating-message");
    if (el) {
      el.classList.add("hidden");
    }
    logger.info("Calibration complete", "[TC]");
    setTimeout(() => {
      try {
        if (typeof window.refreshGlyphPositions === "function") {
          window.refreshGlyphPositions();
          logger.info("Glyph positions refreshed after calibration", "[TC]");
        } else {
          logger.warn("refreshGlyphPositions function not available", "[TC]");
        }
        updateDrumDropdowns();
      } catch (error) {
        logger.error("Error refreshing glyph positions after calibration: " + error, "[TC]");
      }
    }, 1500);
  };
  Tower.onCalibrationComplete = onCalibrationComplete;
  var updateBatteryTrend = () => {
    const trendElement = document.getElementById("batteryTrend");
    if (!trendElement) return;
    const currentBatteryPercent = Tower.currentBatteryPercent;
    const previousBatteryPercent = Tower.previousBatteryPercent;
    if (previousBatteryPercent === 0) {
      trendElement.innerHTML = '<span style="color: #d1d5db; font-size: 16px;">\u2192</span>';
      return;
    }
    if (currentBatteryPercent > previousBatteryPercent) {
      trendElement.innerHTML = '<span style="color: #10b981; font-size: 16px;">\u2191</span>';
    } else if (currentBatteryPercent < previousBatteryPercent) {
      trendElement.innerHTML = '<span style="color: #fbbf24; font-size: 16px;">\u2193</span>';
    } else {
      trendElement.innerHTML = '<span style="color: #d1d5db; font-size: 16px;">\u2192</span>';
    }
  };
  var onBatteryLevelNotify = (millivolts) => {
    const el = document.getElementById("battery");
    if (el) {
      el.innerText = Tower.milliVoltsToPercentage(millivolts).toString();
    }
    updateBatteryTrend();
  };
  Tower.onBatteryLevelNotify = onBatteryLevelNotify;
  var onTowerStateUpdate = (newState, oldState, source) => {
    postStateToTowerEmulatorWindow(newState);
    logger.debug(`Tower state updated from ${source}`, "[TC]");
    const calibrationChanged = newState.drum[0].calibrated !== oldState.drum[0].calibrated || newState.drum[1].calibrated !== oldState.drum[1].calibrated || newState.drum[2].calibrated !== oldState.drum[2].calibrated;
    if (calibrationChanged) {
      logger.info("Calibration status changed, updating display", "[TC]");
      updateCalibrationStatus();
    }
    const drumPositionsChanged = newState.drum[0].position !== oldState.drum[0].position || newState.drum[1].position !== oldState.drum[1].position || newState.drum[2].position !== oldState.drum[2].position;
    if (drumPositionsChanged) {
      logger.info("Drum positions changed, updating dropdowns", "[TC]");
      updateDrumDropdowns();
    }
    if (newState.audio.volume !== oldState.audio.volume) {
      logger.info(`Volume changed from ${oldState.audio.volume} to ${newState.audio.volume}`, "[TC]");
      logger.debug(`Tower volume: ${newState.audio.volume}, Local volume: ${localVolume}`, "[TC]");
    }
    try {
      if (typeof refreshStatusPacket === "function") {
        refreshStatusPacket();
      }
    } catch (error) {
      logger.debug("Error auto-refreshing status packet: " + error, "[TC]");
    }
  };
  Tower.onTowerStateUpdate = onTowerStateUpdate;
  var handleTowerResponse = (response) => {
    if (!isCollectingData || response.length === 0) return;
    const commandValue = response[0];
    if (commandValue === 6) {
      const parsedReadings = parseDifferentialReadings(response);
      if (parsedReadings) {
        const voltage = parsedReadings.irBeam + parsedReadings.drum1 + parsedReadings.drum2 + parsedReadings.drum3;
        const reading = {
          timestamp: parsedReadings.timestamp,
          voltage,
          irBeam: parsedReadings.irBeam,
          drum1: parsedReadings.drum1,
          drum2: parsedReadings.drum2,
          drum3: parsedReadings.drum3,
          rawData: parsedReadings.rawData
        };
        addDifferentialReading(reading);
        logger.debug(`Diff readings IR: ${parsedReadings.irBeam}, D1: ${parsedReadings.drum1}, D2: ${parsedReadings.drum2}, D3: ${parsedReadings.drum3}`, "[Charts]");
      }
    }
  };
  var addDifferentialReading = (reading) => {
    differentialReadings.push(reading);
    const cutoffTime = Date.now() - chartTimeWindow * 1e3;
    differentialReadings = differentialReadings.filter((r) => r.timestamp > cutoffTime);
    if (differentialReadings.length > MAX_DATA_POINTS) {
      differentialReadings = differentialReadings.slice(-MAX_DATA_POINTS);
    }
    const now = Date.now();
    if (now - lastChartUpdate > CHART_UPDATE_THROTTLE) {
      updateChart();
      updateChartStatistics();
      lastChartUpdate = now;
    }
  };
  var setupDifferentialReadingsHandler = () => {
    if (Tower.bleConnection && Tower.bleConnection.callbacks) {
      const originalCallback = Tower.bleConnection.callbacks.onTowerResponse;
      Tower.bleConnection.callbacks.onTowerResponse = (response) => {
        if (originalCallback) {
          originalCallback(response);
        }
        handleTowerResponse(response);
      };
    }
  };
  var updateCalibrationStatus = () => {
    const topIcon = document.getElementById("calibration-top");
    const middleIcon = document.getElementById("calibration-middle");
    const bottomIcon = document.getElementById("calibration-bottom");
    if (!topIcon || !middleIcon || !bottomIcon) {
      logger.warn("Calibration icon elements not found", "[TC]");
      return;
    }
    if (!Tower.isConnected) {
      topIcon.className = "fas fa-question-circle text-gray-400 text-lg";
      topIcon.title = "Top drum status unknown";
      middleIcon.className = "fas fa-question-circle text-gray-400 text-lg";
      middleIcon.title = "Middle drum status unknown";
      bottomIcon.className = "fas fa-question-circle text-gray-400 text-lg";
      bottomIcon.title = "Bottom drum status unknown";
      return;
    }
    const towerState = Tower.getCurrentTowerState();
    if (towerState.drum[0].calibrated) {
      topIcon.className = "fas fa-check-circle text-green-400 text-lg";
      topIcon.title = "Top drum calibrated";
    } else {
      topIcon.className = "fas fa-times-circle text-red-400 text-lg";
      topIcon.title = "Top drum not calibrated";
    }
    if (towerState.drum[1].calibrated) {
      middleIcon.className = "fas fa-check-circle text-green-400 text-lg";
      middleIcon.title = "Middle drum calibrated";
    } else {
      middleIcon.className = "fas fa-times-circle text-red-400 text-lg";
      middleIcon.title = "Middle drum not calibrated";
    }
    if (towerState.drum[2].calibrated) {
      bottomIcon.className = "fas fa-check-circle text-green-400 text-lg";
      bottomIcon.title = "Bottom drum calibrated";
    } else {
      bottomIcon.className = "fas fa-times-circle text-red-400 text-lg";
      bottomIcon.title = "Bottom drum not calibrated";
    }
  };
  var updateDrumDropdowns = () => {
    const topSelect = document.getElementById("top");
    const middleSelect = document.getElementById("middle");
    const bottomSelect = document.getElementById("bottom");
    if (!topSelect || !middleSelect || !bottomSelect) {
      logger.warn("Drum dropdown elements not found", "[TC]");
      return;
    }
    if (!Tower.isConnected) {
      logger.debug("Tower not connected, cannot update drum positions", "[TC]");
      return;
    }
    try {
      const towerState = Tower.getCurrentTowerState();
      const topPosition = Tower.getCurrentDrumPosition("top");
      const middlePosition = Tower.getCurrentDrumPosition("middle");
      const bottomPosition = Tower.getCurrentDrumPosition("bottom");
      const sides = ["north", "east", "south", "west"];
      const topPositionFromRaw = sides[towerState.drum[0].position] || "north";
      const middlePositionFromRaw = sides[towerState.drum[1].position] || "north";
      const bottomPositionFromRaw = sides[towerState.drum[2].position] || "north";
      if (topPosition !== topPositionFromRaw || middlePosition !== middlePositionFromRaw || bottomPosition !== bottomPositionFromRaw) {
        logger.warn(`Position mismatch detected! Method vs Raw - Top: ${topPosition}!=${topPositionFromRaw}, Middle: ${middlePosition}!=${middlePositionFromRaw}, Bottom: ${bottomPosition}!=${bottomPositionFromRaw}`, "[TC]");
      }
      topSelect.value = topPosition;
      middleSelect.value = middlePosition;
      bottomSelect.value = bottomPosition;
    } catch (error) {
      logger.error(`Failed to update drum dropdowns: ${error}`, "[TC]");
    }
  };
  async function resetSkullCount() {
    if (!Tower.isConnected) {
      return;
    }
    Tower.resetTowerSkullCount();
    updateSkullDropCount(0);
  }
  var playSound = () => {
    const select = document.getElementById("sounds");
    const soundValue = Number(select.value);
    if (soundValue === 0) {
      logger.info("No sound selected", "[Audio]");
      return;
    }
    logger.info(`Playing sound ${soundValue} at volume ${localVolume}`, "[Audio]");
    Tower.playSoundStateful(soundValue, false, localVolume);
  };
  var overrides = () => {
    const select = document.getElementById("lightOverrideDropDown");
    Tower.lightOverrides(Number(select.value));
  };
  var rotate = () => {
    const top = document.getElementById("top");
    const middle = document.getElementById("middle");
    const bottom = document.getElementById("bottom");
    Tower.rotateWithState(
      top.value,
      middle.value,
      bottom.value
    );
  };
  var randomizeLevels = () => {
    const select = document.getElementById("randomLevels");
    const levelValue = parseInt(select.value);
    if (levelValue === -1) {
      logger.warn("No level selected for randomization", "[TC]");
      return;
    }
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[TC]");
      return;
    }
    Tower.randomRotateLevels(levelValue);
  };
  var breakSeal = async () => {
    const select = document.getElementById("sealSelect");
    const sealValue = select.value;
    if (!sealValue) {
      logger.warn("No seal selected", "[TC]");
      return;
    }
    if (breakSealTimeout !== null) {
      logger.warn("Break seal is in progress. Please wait before breaking another seal.", "[TC]");
      return;
    }
    const sealMap = {
      "North Top": { side: "north", level: "top" },
      "East Top": { side: "east", level: "top" },
      "South Top": { side: "south", level: "top" },
      "West Top": { side: "west", level: "top" },
      "North Middle": { side: "north", level: "middle" },
      "East Middle": { side: "east", level: "middle" },
      "South Middle": { side: "south", level: "middle" },
      "West Middle": { side: "west", level: "middle" },
      "North Bottom": { side: "north", level: "bottom" },
      "East Bottom": { side: "east", level: "bottom" },
      "South Bottom": { side: "south", level: "bottom" },
      "West Bottom": { side: "west", level: "bottom" }
    };
    const sealIdentifier = sealMap[sealValue];
    if (sealIdentifier) {
      await Tower.breakSeal(sealIdentifier, localVolume);
      logger.info(`Broke seal at ${sealIdentifier.level}-${sealIdentifier.side}`, "[TC]");
      updateSealGrid(sealIdentifier, true);
      postSealsToTowerEmulatorWindow();
      startBreakSealCooldown();
    }
  };
  var clearAllLightCheckboxes = async () => {
    const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLightCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.setAttribute("data-light-style", "off");
    });
    try {
      await Tower.allLightsOff();
    } catch (error) {
      console.error("Error sending tower state for all lights off:", error);
    }
  };
  var allLightsOn = async () => {
    var _a2;
    const lightStyleSelect = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a2 = lightStyleSelect == null ? void 0 : lightStyleSelect.options[lightStyleSelect.selectedIndex]) == null ? void 0 : _a2.textContent) || "on";
    const effect = LIGHT_EFFECTS[selectedLightStyle] || LIGHT_EFFECTS.on;
    const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLightCheckboxes.forEach((checkbox) => {
      checkbox.checked = true;
      checkbox.setAttribute("data-light-style", selectedLightStyle);
    });
    try {
      await Tower.allLightsOn(effect);
    } catch (error) {
      console.error("Error sending tower state for all lights on:", error);
    }
  };
  var allLightsOff = async () => {
    await clearAllLightCheckboxes();
  };
  var clearAllLights = async () => {
    await clearAllLightCheckboxes();
    logger.info("All lights cleared", "[TC]");
    Tower.resetBrokenSeals();
    resetSealGrid();
    postSealsToTowerEmulatorWindow();
    const sealSelect = document.getElementById("sealSelect");
    if (sealSelect) {
      sealSelect.value = "";
    }
  };
  var singleLight = async (el) => {
    let style = "off";
    if (el.checked) {
      const ls = document.getElementById("lightStyles");
      if (ls && ls.selectedIndex >= 0) {
        style = ls.options[ls.selectedIndex].innerHTML;
      }
    }
    el.setAttribute("data-light-style", style);
    const effect = LIGHT_EFFECTS[style] || LIGHT_EFFECTS.off;
    const currentState = Tower.getCurrentTowerState();
    const lightType = el.getAttribute("data-light-type");
    const lightLocation = el.getAttribute("data-light-location");
    const lightLevel = el.getAttribute("data-light-level");
    const lightBaseLocation = el.getAttribute("data-light-base-location");
    let layerIndex;
    let lightIndex;
    if (lightType === "doorway") {
      layerIndex = getTowerLayerForLevel(lightLevel);
      lightIndex = getLightIndexForSide(lightLocation);
    } else if (lightType === "ledge") {
      layerIndex = TOWER_LAYERS.LEDGE;
      lightIndex = getLedgeLightIndexForSide(lightLocation);
    } else if (lightType === "base") {
      layerIndex = lightBaseLocation === "b" ? TOWER_LAYERS.BASE2 : TOWER_LAYERS.BASE1;
      lightIndex = getBaseLightIndexForSide(lightLocation);
    } else {
      console.error("Unknown light type:", lightType);
      return;
    }
    currentState.layer[layerIndex].light[lightIndex].effect = effect;
    currentState.layer[layerIndex].light[lightIndex].loop = effect !== 0;
    try {
      await Tower.sendTowerState(currentState);
    } catch (error) {
      console.error("Error sending tower state:", error);
    }
  };
  var getTowerLayerForLevel = (level) => {
    switch (level) {
      case "top":
        return TOWER_LAYERS.TOP_RING;
      case "middle":
        return TOWER_LAYERS.MIDDLE_RING;
      case "bottom":
        return TOWER_LAYERS.BOTTOM_RING;
      default:
        return TOWER_LAYERS.TOP_RING;
    }
  };
  var getLightIndexForSide = (side) => {
    switch (side) {
      case "north":
        return RING_LIGHT_POSITIONS.NORTH;
      case "east":
        return RING_LIGHT_POSITIONS.EAST;
      case "south":
        return RING_LIGHT_POSITIONS.SOUTH;
      case "west":
        return RING_LIGHT_POSITIONS.WEST;
      default:
        return RING_LIGHT_POSITIONS.NORTH;
    }
  };
  var getLedgeLightIndexForSide = (side) => {
    switch (side) {
      case "northeast":
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
      case "southeast":
        return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
      case "southwest":
        return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
      case "northwest":
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
      default:
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
    }
  };
  var getBaseLightIndexForSide = (side) => {
    switch (side) {
      case "north":
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
      // Closest to north
      case "east":
        return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
      // Closest to east
      case "south":
        return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
      // Closest to south
      case "west":
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
      // Closest to west
      default:
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
    }
  };
  var lights = () => {
    var _a2;
    const lightStyleSelect = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a2 = lightStyleSelect == null ? void 0 : lightStyleSelect.options[lightStyleSelect.selectedIndex]) == null ? void 0 : _a2.textContent) || "off";
    const allLEDLights = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLEDLights.forEach((checkbox) => {
      if (checkbox.checked) {
        checkbox.setAttribute("data-light-style", selectedLightStyle);
      } else {
        checkbox.setAttribute("data-light-style", "off");
      }
    });
    const doorwayLights = getDoorwayLights();
    const ledgeLights = getLedgeLights();
    const baseLights = getBaseLights();
    const allLights = { doorway: doorwayLights, ledge: ledgeLights, base: baseLights };
    Tower.Lights(allLights);
  };
  var getDoorwayLights = () => {
    var _a2;
    const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked';
    const checked = document.querySelectorAll(qs);
    const ls = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a2 = ls == null ? void 0 : ls.options[ls.selectedIndex]) == null ? void 0 : _a2.textContent) || "off";
    let doorwayCmds = [];
    Array.from(checked).forEach((cb) => {
      let { lightSide, lightStyle, lightLevel } = getDataAttributes(cb);
      if (lightStyle !== selectedLightStyle) {
        lightStyle = selectedLightStyle;
        cb.setAttribute("data-light-style", lightStyle);
      }
      if (lightSide && lightLevel && lightStyle) {
        doorwayCmds.push({ position: lightSide, level: lightLevel, style: lightStyle });
      }
    });
    return doorwayCmds;
  };
  var getLedgeLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="ledge"]:checked';
    const checked = document.querySelectorAll(qs);
    let ledgeCmds = [];
    Array.from(checked).forEach((cb) => {
      const { lightSide, lightStyle } = getDataAttributes(cb);
      if (lightSide && lightStyle) {
        ledgeCmds.push({ position: lightSide, style: lightStyle });
      }
    });
    return ledgeCmds;
  };
  var getBaseLights = () => {
    const qs = 'input[type="checkbox"][data-light-type="base"]:checked';
    const checked = document.querySelectorAll(qs);
    let baseCmds = [];
    Array.from(checked).forEach((cb) => {
      const { lightSide, lightStyle, lightBaseLocation } = getDataAttributes(cb);
      if (lightSide && lightStyle && lightBaseLocation) {
        baseCmds.push({
          position: {
            side: lightSide,
            level: lightBaseLocation
          },
          style: lightStyle
        });
      }
    });
    return baseCmds;
  };
  var getDataAttributes = (el) => {
    const lightType = el.getAttribute("data-light-type");
    const lightSide = el.getAttribute("data-light-location");
    const lightLevel = el.getAttribute("data-light-level");
    const lightBaseLocation = el.getAttribute("data-light-base-location");
    const lightStyle = el.getAttribute("data-light-style");
    return {
      lightSide,
      lightLevel,
      lightBaseLocation,
      lightStyle,
      lightType
    };
  };
  var updateSealGrid = (seal, isBroken) => {
    const sealSquare = document.querySelector(`[data-seal-level="${seal.level}"][data-seal-side="${seal.side}"]`);
    if (sealSquare) {
      if (isBroken) {
        sealSquare.classList.add("broken");
      } else {
        sealSquare.classList.remove("broken");
      }
    }
  };
  var resetSealGrid = () => {
    const allSealSquares = document.querySelectorAll(".seal-square");
    allSealSquares.forEach((square) => {
      square.classList.remove("broken");
    });
  };
  var breakSealTimeout = null;
  var startBreakSealCooldown = () => {
    const breakSealButton = document.getElementById("breakSealButton");
    if (breakSealButton) {
      breakSealButton.disabled = true;
      breakSealButton.style.opacity = "0.5";
    }
    logger.info("Break seal cooldown started (10 seconds)", "[TC]");
    breakSealTimeout = window.setTimeout(() => {
      breakSealTimeout = null;
      if (breakSealButton) {
        breakSealButton.disabled = false;
        breakSealButton.textContent = "Break Seal";
        breakSealButton.style.opacity = "1";
      }
      logger.info("Break seal cooldown ended", "[TC]");
    }, 1e4);
  };
  var postSealsToTowerEmulatorWindow = () => {
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.postMessage({ type: "applySeals", seals: Tower.getBrokenSeals() }, "*");
  };
  var refreshEmulatorSealGrid = () => {
    const brokenSeals = Tower.getBrokenSeals();
    const brokenKeys = new Set(brokenSeals.map((s) => `${s.level}-${s.side}`));
    const buttons = document.querySelectorAll("[data-emulator-seal-level]");
    buttons.forEach((btn) => {
      const level = btn.getAttribute("data-emulator-seal-level");
      const side = btn.getAttribute("data-emulator-seal-side");
      if (level && side) {
        btn.classList.toggle("seal-removed", brokenKeys.has(`${level}-${side}`));
      }
    });
  };
  var updateEmulatorSealTabVisibility = () => {
    const notice = document.getElementById("emulator-seals-notice");
    const controls = document.getElementById("emulator-seals-controls");
    const isEmulatorConnected = currentConnectionMode === "emulator" && Tower.isConnected;
    if (notice) notice.style.display = isEmulatorConnected ? "none" : "block";
    if (controls) controls.style.display = isEmulatorConnected ? "block" : "none";
    if (isEmulatorConnected) refreshEmulatorSealGrid();
  };
  var emulatorToggleSeal = (el) => {
    const level = el.getAttribute("data-emulator-seal-level");
    const side = el.getAttribute("data-emulator-seal-side");
    if (!level || !side) return;
    const seal = { level, side };
    if (Tower.isSealBroken(seal)) {
      Tower.markSealRestored(seal);
    } else {
      Tower.markSealBroken(seal);
    }
    refreshEmulatorSealGrid();
    updateSealGrid(seal, Tower.isSealBroken(seal));
    postSealsToTowerEmulatorWindow();
  };
  var emulatorRemoveAllSeals = () => {
    const levels = ["top", "middle", "bottom"];
    const sides = ["north", "east", "south", "west"];
    for (const level of levels) {
      for (const side of sides) {
        Tower.markSealBroken({ level, side });
      }
    }
    refreshEmulatorSealGrid();
    const allSealSquares = document.querySelectorAll(".seal-square");
    allSealSquares.forEach((sq) => sq.classList.add("broken"));
    postSealsToTowerEmulatorWindow();
  };
  var emulatorReplaceAllSeals = () => {
    Tower.resetBrokenSeals();
    refreshEmulatorSealGrid();
    resetSealGrid();
    postSealsToTowerEmulatorWindow();
  };
  var sealSquareClick = (element) => {
    const level = element.getAttribute("data-seal-level");
    const side = element.getAttribute("data-seal-side");
    if (!level || !side) {
      logger.warn("Invalid seal square data", "[TC]");
      return;
    }
    const sealSelect = document.getElementById("sealSelect");
    const isCurrentlyBroken = element.classList.contains("broken");
    if (isCurrentlyBroken) {
      element.classList.remove("broken");
      const sealKey = `${level}-${side}`;
      Tower.brokenSeals.delete(sealKey);
      postSealsToTowerEmulatorWindow();
      if (sealSelect) {
        sealSelect.value = "";
      }
      logger.info(`Reset seal at ${level}-${side}`, "[TC]");
    } else {
      if (breakSealTimeout !== null) {
        logger.warn("Break seal is on cooldown. Please wait before breaking another seal.", "[TC]");
        return;
      }
      const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
      const dropdownValue = `${capitalizeFirst(side)} ${capitalizeFirst(level)}`;
      if (sealSelect) {
        sealSelect.value = dropdownValue;
      }
      breakSeal();
    }
  };
  var switchTab = (tabName) => {
    if (tabName !== "seals") {
      allLightsOff();
    }
    const allTabContents = document.querySelectorAll(".tower-tab-content");
    allTabContents.forEach((content) => {
      content.classList.remove("tower-tab-content-active");
    });
    const allTabButtons = document.querySelectorAll(".tower-tab-button");
    allTabButtons.forEach((button) => {
      button.classList.remove("tower-tab-active");
    });
    const selectedContent = document.getElementById(`${tabName}-content`);
    if (selectedContent) {
      selectedContent.classList.add("tower-tab-content-active");
    }
    const selectedButton = document.getElementById(`${tabName}-tab`);
    if (selectedButton) {
      selectedButton.classList.add("tower-tab-active");
    }
    if (tabName === "charts") {
      setTimeout(() => {
        initializeChart();
        updateChartDataCollectionButton();
        updateChartStatistics();
        if (Tower.isConnected) {
          updateChartStatus("Tower connected - ready to collect data");
        } else {
          updateChartStatus("Connect to tower to start collecting differential readings");
        }
      }, 100);
    }
    if (tabName === "seals") {
      updateEmulatorSealTabVisibility();
    }
  };
  var moveGlyph = async () => {
    const glyphSelect = document.getElementById("glyph-select");
    const sideSelect = document.getElementById("side-select");
    const selectedGlyph = glyphSelect.value;
    const targetSide = sideSelect.value;
    logger.debug(`UI Selection: glyph=${selectedGlyph}, targetSide=${targetSide}`, "[Glyphs]");
    if (!selectedGlyph || !targetSide) {
      logger.warn("Please select a glyph and target side", "[Glyphs]");
      return;
    }
    try {
      const currentGlyphPosition = Tower.getGlyphPosition(selectedGlyph);
      if (!currentGlyphPosition) {
        logger.error(`Unable to find current position for ${selectedGlyph} glyph, please perform a calibration first.`, "[Glyphs]");
        return;
      }
      const glyphLevel = GLYPHS[selectedGlyph].level;
      const sides = ["north", "east", "south", "west"];
      const currentSideIndex = sides.indexOf(currentGlyphPosition);
      const targetSideIndex = sides.indexOf(targetSide);
      if (currentSideIndex === -1 || targetSideIndex === -1) {
        logger.error("Invalid current or target side", "[Glyphs]");
        return;
      }
      let rotationSteps = (targetSideIndex - currentSideIndex + 4) % 4;
      if (rotationSteps === 0) {
        logger.info(`${selectedGlyph} glyph is already at ${targetSide} position`, "[Glyphs]");
        return;
      }
      let targetDrumPosition;
      if (glyphLevel === "top" || glyphLevel === "middle" || glyphLevel === "bottom") {
        const currentDrumPosition = Tower.getCurrentDrumPosition(glyphLevel);
        const sides2 = ["north", "east", "south", "west"];
        const currentDrumIndex = sides2.indexOf(currentDrumPosition);
        const currentGlyphIndex = sides2.indexOf(currentGlyphPosition);
        const targetGlyphIndex = sides2.indexOf(targetSide);
        logger.debug(`Move calculation: glyph=${selectedGlyph}, currentGlyphPos=${currentGlyphPosition}, targetSide=${targetSide}, currentDrumPos=${currentDrumPosition}`, "[Glyphs]");
        let glyphSteps = (targetGlyphIndex - currentGlyphIndex + 4) % 4;
        const newDrumIndex = (currentDrumIndex + glyphSteps) % 4;
        targetDrumPosition = sides2[newDrumIndex];
        logger.debug(`Move calculation result: glyphSteps=${glyphSteps}, newDrumIndex=${newDrumIndex}, targetDrumPosition=${targetDrumPosition}`, "[Glyphs]");
      }
      const topPosition = glyphLevel === "top" ? targetDrumPosition : Tower.getCurrentDrumPosition("top");
      const middlePosition = glyphLevel === "middle" ? targetDrumPosition : Tower.getCurrentDrumPosition("middle");
      const bottomPosition = glyphLevel === "bottom" ? targetDrumPosition : Tower.getCurrentDrumPosition("bottom");
      logger.info(`Moving ${selectedGlyph} glyph from ${currentGlyphPosition} to ${targetSide} by rotating ${glyphLevel} level (${rotationSteps} steps clockwise)`, "[Glyphs]");
      await Tower.rotateWithState(topPosition, middlePosition, bottomPosition);
      setTimeout(async () => {
        try {
          refreshGlyphPositions();
          const allDoorwayLights = getCurrentDoorwayLights();
          if (allDoorwayLights.length > 0) {
            logger.info(`About to restore ${allDoorwayLights.length} lights: ${JSON.stringify(allDoorwayLights)}`, "[Glyphs]");
            await Tower.Lights({ doorway: allDoorwayLights });
            logger.info(`Successfully restored ${allDoorwayLights.length} lights after glyph movement`, "[Glyphs]");
          } else {
            logger.warn("No lights to restore after glyph movement", "[Glyphs]");
          }
        } catch (error) {
          logger.error("Error restoring lights after glyph move: " + error, "[Glyphs]");
        }
      }, 1e3);
      logger.info(`Successfully moved ${selectedGlyph} glyph to ${targetSide} position`, "[Glyphs]");
    } catch (error) {
      console.error("Error moving glyph:", error);
      logger.error("Error moving glyph: " + error, "[Glyphs]");
    }
  };
  var refreshGlyphPositions = () => {
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[TC]");
      return;
    }
    try {
      const positions = Tower.getAllGlyphPositions();
      const allGlyphCells = document.querySelectorAll(".glyph-cell");
      allGlyphCells.forEach((cell) => {
        cell.innerHTML = "";
        cell.classList.remove("glyph-lit");
      });
      Object.entries(positions).forEach(([glyphName, side]) => {
        if (side) {
          const glyphLevel = GLYPHS[glyphName].level;
          const cellId = `glyph-${glyphLevel}-${side}`;
          const cell = document.getElementById(cellId);
          if (cell) {
            const img = document.createElement("img");
            img.src = `../assets/glyph_${glyphName}.svg`;
            img.alt = glyphName;
            cell.appendChild(img);
          }
        }
      });
      for (const glyphName of glyphLightStates) {
        const currentPosition = Tower.getGlyphPosition(glyphName);
        if (currentPosition) {
          const level = GLYPHS[glyphName].level;
          const cellId = `glyph-${level}-${currentPosition}`;
          const cell = document.getElementById(cellId);
          if (cell && cell.querySelector("img")) {
            cell.classList.add("glyph-lit");
          }
        }
      }
      logger.info("Glyph positions refreshed", "[TC]");
    } catch (error) {
      logger.error(`Failed to refresh glyph positions: ${error}`, "[TC]");
    }
  };
  var filterLogs = () => {
    if (!sharedDOMOutput) {
      logger.warn("DOM output not initialized", "[TC]");
      return;
    }
    const filterSelect = document.getElementById("logFilter");
    const selectedLevel = (filterSelect == null ? void 0 : filterSelect.value) || "all";
    sharedDOMOutput.refreshFilter();
    logger.info(`Log filter set to: ${selectedLevel}`, "[TC]");
  };
  var clearLogs = () => {
    if (!sharedDOMOutput) {
      logger.warn("DOM output not initialized", "[TC]");
      return;
    }
    sharedDOMOutput.clearAll();
    logger.info("Logs cleared", "[TC]");
  };
  var updateBatteryFilter = () => {
    var _a2;
    const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]');
    const selectedValue = (_a2 = Array.from(batteryFilterRadios).find((radio) => radio.checked)) == null ? void 0 : _a2.value;
    if (selectedValue) {
      if (selectedValue === "none") {
        Tower.batteryLogEnabled = false;
      } else {
        Tower.batteryLogEnabled = true;
        Tower.batteryLogOnChangeOnly = selectedValue === "changes";
      }
      logger.info(`Battery logging set to: ${selectedValue}`, "[TC]");
    }
  };
  var saveState = () => {
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[TC]");
      return;
    }
    try {
      const state = Tower.getCurrentTowerState();
      if (!state) {
        logger.warn("No current tower state available", "[TC]");
        return;
      }
      const buffer = new Uint8Array(256);
      const success = rtdt_pack_state(buffer, buffer.length, state);
      if (!success) {
        logger.error("Failed to pack tower state", "[TC]");
        return;
      }
      const packedState = Array.from(buffer);
      localStorage.setItem("towerState", JSON.stringify(packedState));
      const stateDisplay = document.getElementById("currentState");
      if (stateDisplay) {
        stateDisplay.value = JSON.stringify(packedState, null, 2);
      }
      logger.info("Tower state saved", "[TC]");
    } catch (error) {
      logger.error(`Failed to save state: ${error}`, "[TC]");
    }
  };
  var loadState = async () => {
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[TC]");
      return;
    }
    try {
      const savedState = localStorage.getItem("towerState");
      if (!savedState) {
        logger.warn("No saved state found", "[TC]");
        return;
      }
      const packedState = JSON.parse(savedState);
      const buffer = new Uint8Array(packedState);
      const state = rtdt_unpack_state(buffer);
      if (!state) {
        logger.error("Failed to unpack tower state", "[TC]");
        return;
      }
      await Tower.sendTowerState(state);
      logger.info("Tower state loaded", "[TC]");
      if (typeof refreshGlyphPositions === "function") {
        refreshGlyphPositions();
      }
    } catch (error) {
      logger.error(`Failed to load state: ${error}`, "[TC]");
    }
  };
  var resetState = async () => {
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[TC]");
      return;
    }
    try {
      const defaultState = createDefaultTowerState();
      await Tower.sendTowerState(defaultState);
      localStorage.removeItem("towerState");
      const stateDisplay = document.getElementById("currentState");
      if (stateDisplay) {
        stateDisplay.value = "";
      }
      resetSealGrid();
      if (typeof refreshGlyphPositions === "function") {
        refreshGlyphPositions();
      }
      logger.info("Tower state reset", "[TC]");
    } catch (error) {
      logger.error(`Failed to reset state: ${error}`, "[TC]");
    }
  };
  var initializeUI = () => {
    const soundSelect = document.getElementById("sounds");
    if (soundSelect) {
      Object.entries(TOWER_AUDIO_LIBRARY).forEach(([key, value]) => {
        const option = document.createElement("option");
        option.value = value.value.toString();
        option.textContent = value.name;
        soundSelect.appendChild(option);
      });
    }
    const lightStyleSelect = document.getElementById("lightStyles");
    if (lightStyleSelect) {
      Object.entries(LIGHT_EFFECTS).forEach(([key, value]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;
        lightStyleSelect.appendChild(option);
      });
      const onIndex = Array.from(lightStyleSelect.options).findIndex((opt) => opt.value === "on");
      if (onIndex >= 0) {
        lightStyleSelect.selectedIndex = onIndex;
      }
    }
    const lightOverrideSelect = document.getElementById("lightOverrideDropDown");
    if (lightOverrideSelect) {
      Object.entries(TOWER_LIGHT_SEQUENCES).forEach(([key, value]) => {
        const option = document.createElement("option");
        option.value = value.toString();
        option.textContent = key;
        lightOverrideSelect.appendChild(option);
      });
    }
    const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]');
    batteryFilterRadios.forEach((radio) => {
      radio.addEventListener("change", updateBatteryFilter);
    });
    const towerTypeSelect = document.getElementById("towerTypeSelect");
    if (towerTypeSelect && false) {
      towerTypeSelect.addEventListener("change", () => {
        if (towerTypeSelect.value !== "emulator") {
          return;
        }
        towerTypeSelect.value = "ble";
        showTowerEmulatorMissingPopup();
      });
    }
    updateCalibrationStatus();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUI);
  } else {
    initializeUI();
  }
  var updateLogLevel = () => {
    if (window.logger) {
      const checkboxes = document.querySelectorAll('input[id^="logLevel-"]');
      const selectedLevels = Array.from(checkboxes).filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
      if (selectedLevels.length > 0) {
        window.logger.setEnabledLevels(selectedLevels);
      } else {
        window.logger.setEnabledLevels(["all"]);
      }
    }
    if (sharedDOMOutput) {
      sharedDOMOutput.refreshFilter();
    }
  };
  var clearLog = () => {
    if (sharedDOMOutput) {
      sharedDOMOutput.clearAll();
    }
    const container = document.getElementById("log-container");
    if (container) {
      container.innerHTML = "";
    }
    const textFilter = document.getElementById("logTextFilter");
    if (textFilter) {
      textFilter.value = "";
    }
  };
  var copyDisplayedLogs = (event) => {
    const logContainer = document.getElementById("log-container");
    if (!logContainer) return;
    const logLines = logContainer.querySelectorAll(".log-line");
    if (logLines.length === 0) {
      alert("No log entries to copy");
      return;
    }
    const logText = Array.from(logLines).map((line) => line.textContent || "").join("\n");
    navigator.clipboard.writeText(logText).then(() => {
      const button = event.target.closest("button");
      if (button) {
        const originalIcon = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.style.backgroundColor = "#10b981";
        setTimeout(() => {
          button.innerHTML = originalIcon;
          button.style.backgroundColor = "";
        }, 1e3);
      }
    }).catch((err) => {
      console.error("Failed to copy logs: ", err);
      alert("Failed to copy logs to clipboard");
    });
  };
  var downloadDisplayedLogs = (event) => {
    const logContainer = document.getElementById("log-container");
    if (!logContainer) return;
    const logLines = logContainer.querySelectorAll(".log-line");
    if (logLines.length === 0) {
      alert("No log entries to download");
      return;
    }
    const logText = Array.from(logLines).map((line) => line.textContent || "").join("\n");
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    const header = `UltimateDarkTower Log Output - ${dateStr} ${timeStr}
${"-".repeat(60)}
`;
    const fileContent = header + logText;
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TowerLog.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    const button = event.target.closest("button");
    if (button) {
      const originalIcon = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check"></i>';
      button.style.backgroundColor = "#10b981";
      setTimeout(() => {
        button.innerHTML = originalIcon;
        button.style.backgroundColor = "";
      }, 1e3);
    }
  };
  var STATE_BUFFER_SIZE = 19;
  var DISPLAY_BUFFER_SIZE = 20;
  var EMPTY_STATUS_PACKET = new Array(DISPLAY_BUFFER_SIZE).fill(0);
  var refreshStatusPacket = () => {
    if (!Tower.isConnected) {
      logger.warn("Tower is not connected", "[Status Packet]");
      updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
      return;
    }
    try {
      const state = Tower.getCurrentTowerState();
      if (!state) {
        logger.warn("No current tower state available", "[Status Packet]");
        updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
        return;
      }
      const buffer = new Uint8Array(DISPLAY_BUFFER_SIZE);
      const stateBuffer = new Uint8Array(STATE_BUFFER_SIZE);
      const success = rtdt_pack_state(stateBuffer, STATE_BUFFER_SIZE, state);
      if (!success) {
        logger.error("Failed to pack tower state", "[Status Packet]");
        updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
        return;
      }
      buffer[0] = 0;
      for (let i = 0; i < STATE_BUFFER_SIZE; i++) {
        buffer[i + 1] = stateBuffer[i];
      }
      const packedState = Array.from(buffer);
      updateStatusPacketDisplay(packedState);
    } catch (error) {
      logger.error(`Failed to refresh status packet: ${error}`, "[TC]");
      updateStatusPacketDisplay(EMPTY_STATUS_PACKET);
    }
  };
  var updateStatusPacketDisplay = (packetData) => {
    const display = document.getElementById("status-packet-display");
    if (!display) return;
    const byteDescriptions = [
      "Battery Level",
      "Calibration Status",
      "Drum Positions (Top)",
      "Drum Positions (Middle)",
      "Drum Positions (Bottom)",
      "Light States (Doorways)",
      "Light States (Ledges)",
      "Light States (Base)",
      "Glyph Positions",
      "Seal States",
      "Sound Effects",
      "Player Count",
      "Game State",
      "Error Flags",
      "Communication Status",
      "Reserved",
      "Extended Flags",
      "Skull Drop Count",
      "Reserved",
      "Checksum"
    ];
    display.innerHTML = "";
    packetData.forEach((byte, index) => {
      const span = document.createElement("span");
      span.className = "status-byte";
      if (byte !== 0) {
        span.className += " non-zero";
      }
      span.textContent = byte.toString(16).padStart(2, "0").toUpperCase();
      const description = index < byteDescriptions.length ? byteDescriptions[index] : "Unknown";
      span.title = `Byte ${index}: ${byte}D - ${description}`;
      display.appendChild(span);
    });
  };
  var getGlyphsFacingDirection = (direction) => {
    try {
      return Tower.getGlyphsFacingDirection(direction);
    } catch (error) {
      console.error("Error getting glyphs facing direction:", error);
      logger.error("Error getting glyphs facing direction: " + error, "[TC]");
      return [];
    }
  };
  var glyphLightStates = /* @__PURE__ */ new Set();
  var getCurrentDoorwayLights = () => {
    const doorwayLights = [];
    for (const glyphName of glyphLightStates) {
      const currentPosition = Tower.getGlyphPosition(glyphName);
      if (currentPosition) {
        const level = GLYPHS[glyphName].level;
        const lightCommand = {
          position: currentPosition,
          level,
          style: "on"
        };
        doorwayLights.push(lightCommand);
      } else {
        logger.warn(`Could not get position for glyph ${glyphName}`, "[TC]");
      }
    }
    return doorwayLights;
  };
  var toggleGlyphLight = async (element) => {
    const level = element.getAttribute("data-level");
    const side = element.getAttribute("data-side");
    const position = `${level}-${side}`;
    const glyphAtPosition = findGlyphAtPosition(level, side);
    if (!glyphAtPosition) {
      const sideSelect = document.getElementById("side-select");
      if (sideSelect) {
        sideSelect.value = side;
      }
      return;
    }
    const isLit = element.classList.toggle("glyph-lit");
    const glyphSelect = document.getElementById("glyph-select");
    if (glyphSelect) {
      glyphSelect.value = glyphAtPosition;
    }
    const glyphCurrentSide = Tower.getGlyphPosition(glyphAtPosition);
    if (glyphCurrentSide) {
      const sideSelect = document.getElementById("side-select");
      if (sideSelect) {
        sideSelect.value = glyphCurrentSide;
      }
    }
    try {
      const lightEffect = isLit ? "on" : "off";
      if (isLit) {
        glyphLightStates.add(glyphAtPosition);
      } else {
        glyphLightStates.delete(glyphAtPosition);
      }
      const glyphLevel = GLYPHS[glyphAtPosition].level;
      const specificLightCommand = {
        position: side,
        level: glyphLevel,
        style: lightEffect
      };
      if (isLit) {
        const allDoorwayLights = getCurrentDoorwayLights();
        await Tower.Lights({ doorway: allDoorwayLights });
      } else {
        await Tower.Lights({ doorway: [specificLightCommand] });
      }
    } catch (error) {
      logger.error("Error toggling glyph light: " + error, "[TC]");
      element.classList.toggle("glyph-lit");
      if (isLit) {
        glyphLightStates.delete(glyphAtPosition);
      } else {
        glyphLightStates.add(glyphAtPosition);
      }
    }
  };
  var findGlyphAtPosition = (level, side) => {
    const allPositions = Tower.getAllGlyphPositions();
    for (const [glyph, currentSide] of Object.entries(allPositions)) {
      if (GLYPHS[glyph].level === level && currentSide === side) {
        return glyph;
      }
    }
    return null;
  };
  var getGlyphLevel = (glyph) => {
    var _a2;
    return ((_a2 = GLYPHS[glyph]) == null ? void 0 : _a2.level) || "middle";
  };
  var localVolume = 0;
  var volumeUp = async () => {
    try {
      const newVolume = Math.min(localVolume + 1, 3);
      if (newVolume === localVolume) {
        return;
      }
      logger.info(`Setting volume from ${localVolume} to ${newVolume}`, "[TC]");
      localVolume = newVolume;
      const currentState = Tower.getCurrentTowerState();
      const newState = __spreadValues({}, currentState);
      newState.audio = __spreadProps(__spreadValues({}, currentState.audio), { volume: newVolume });
      logger.debug(`Sending tower state with volume: ${newState.audio.volume}`, "[TC]");
      await Tower.sendTowerState(newState);
      await Tower.playSoundStateful(33, false, newVolume);
      updateVolumeDisplay(newVolume);
    } catch (error) {
      logger.error(`Error increasing volume: ${error}`, "[TC]");
    }
  };
  var volumeDown = async () => {
    try {
      const newVolume = Math.max(localVolume - 1, 0);
      if (newVolume === localVolume) {
        return;
      }
      localVolume = newVolume;
      const currentState = Tower.getCurrentTowerState();
      const newState = __spreadValues({}, currentState);
      newState.audio = __spreadProps(__spreadValues({}, currentState.audio), { volume: newVolume });
      await Tower.sendTowerState(newState);
      if (newVolume < 3) {
        await Tower.playSoundStateful(33, false, newVolume);
      }
      updateVolumeDisplay(newVolume);
    } catch (error) {
      logger.error(`Error decreasing volume: ${error}`, "[TC]");
    }
  };
  var updateVolumeDisplay = (volume) => {
    const volumeLevelElement = document.getElementById("volumeLevel");
    const volumeIconElement = document.getElementById("volumeIcon");
    if (volumeLevelElement) {
      const description = VOLUME_DESCRIPTIONS[volume] || "Unknown";
      volumeLevelElement.textContent = description;
    }
    if (volumeIconElement) {
      const icon = VOLUME_ICONS[volume] || "\u{1F50A}";
      volumeIconElement.textContent = icon;
    }
  };
  var initializeVolumeDisplay = () => {
    try {
      const currentState = Tower.getCurrentTowerState();
      localVolume = currentState.audio.volume;
      updateVolumeDisplay(localVolume);
    } catch (error) {
      localVolume = 0;
    }
  };
  var initializeChart = () => {
    if (differentialChart) return;
    const ctx = document.getElementById("differential-chart");
    if (!ctx) return;
    differentialChart = new window.Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "IR Beam",
            data: [],
            borderColor: "#f97316",
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 4,
            hidden: !chartDisplayConfig.showIrBeam
          },
          {
            label: "Drum 1",
            data: [],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 4,
            hidden: !chartDisplayConfig.showDrum1
          },
          {
            label: "Drum 2",
            data: [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 4,
            hidden: !chartDisplayConfig.showDrum2
          },
          {
            label: "Drum 3",
            data: [],
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 4,
            hidden: !chartDisplayConfig.showDrum3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            time: {
              unit: "second",
              displayFormats: {
                second: "mm:ss"
              }
            },
            title: {
              display: true,
              text: "Time"
            }
          },
          y: {
            title: {
              display: true,
              text: "Voltage"
            },
            beginAtZero: false
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              filter: function(legendItem, chartData) {
                const dataset = chartData.datasets[legendItem.datasetIndex];
                return !dataset.hidden;
              }
            }
          },
          tooltip: {
            mode: "nearest",
            intersect: false,
            callbacks: {
              title: function(context) {
                const date = new Date(context[0].parsed.x);
                const minutes = date.getMinutes().toString().padStart(2, "0");
                const seconds = date.getSeconds().toString().padStart(2, "0");
                return `${minutes}:${seconds}`;
              },
              label: function(context) {
                return `Voltage: ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false
        }
      }
    });
  };
  var updateChart = () => {
    if (!differentialChart) return;
    const cutoffTime = Date.now() - chartTimeWindow * 1e3;
    const filteredReadings = differentialReadings.filter((r) => r.timestamp > cutoffTime);
    const irBeamData = filteredReadings.map((reading) => ({
      x: reading.timestamp,
      y: reading.irBeam
    }));
    const drum1Data = filteredReadings.map((reading) => ({
      x: reading.timestamp,
      y: reading.drum1
    }));
    const drum2Data = filteredReadings.map((reading) => ({
      x: reading.timestamp,
      y: reading.drum2
    }));
    const drum3Data = filteredReadings.map((reading) => ({
      x: reading.timestamp,
      y: reading.drum3
    }));
    differentialChart.data.datasets[0].data = irBeamData;
    differentialChart.data.datasets[1].data = drum1Data;
    differentialChart.data.datasets[2].data = drum2Data;
    differentialChart.data.datasets[3].data = drum3Data;
    differentialChart.data.datasets[0].hidden = !chartDisplayConfig.showIrBeam;
    differentialChart.data.datasets[1].hidden = !chartDisplayConfig.showDrum1;
    differentialChart.data.datasets[2].hidden = !chartDisplayConfig.showDrum2;
    differentialChart.data.datasets[3].hidden = !chartDisplayConfig.showDrum3;
    differentialChart.update("none");
  };
  var updateChartStatistics = () => {
    const statsPoints = document.getElementById("chart-stats-points");
    const statsLatest = document.getElementById("chart-stats-latest");
    const statsMin = document.getElementById("chart-stats-min");
    const statsMax = document.getElementById("chart-stats-max");
    if (!statsPoints || !statsLatest || !statsMin || !statsMax) return;
    const cutoffTime = Date.now() - chartTimeWindow * 1e3;
    const filteredReadings = differentialReadings.filter((r) => r.timestamp > cutoffTime);
    statsPoints.textContent = filteredReadings.length.toString();
    if (filteredReadings.length > 0) {
      const latest = filteredReadings[filteredReadings.length - 1];
      const voltages = filteredReadings.map((r) => r.voltage);
      const minVoltage = Math.min(...voltages);
      const maxVoltage = Math.max(...voltages);
      statsLatest.textContent = latest.voltage.toFixed(2);
      statsMin.textContent = minVoltage.toFixed(2);
      statsMax.textContent = maxVoltage.toFixed(2);
    } else {
      statsLatest.textContent = "--";
      statsMin.textContent = "--";
      statsMax.textContent = "--";
    }
  };
  var updateChartStatus = (message) => {
    const statusElement = document.getElementById("chart-status");
    if (statusElement) {
      statusElement.textContent = message;
    }
  };
  var updateChartDataCollectionButton = () => {
    const button = document.getElementById("chart-start-stop");
    if (!button) return;
    if (isCollectingData) {
      button.innerHTML = '<i class="fas fa-stop mr-1"></i>Stop';
      button.classList.remove("tower-button");
      button.classList.add("tower-button");
      button.style.backgroundColor = "#dc2626";
    } else {
      button.innerHTML = '<i class="fas fa-play mr-1"></i>Start';
      button.classList.remove("tower-button");
      button.classList.add("tower-button");
      button.style.backgroundColor = "";
    }
  };
  var toggleDataCollection = () => {
    if (!Tower.isConnected) {
      updateChartStatus("Tower not connected");
      return;
    }
    isCollectingData = !isCollectingData;
    updateChartDataCollectionButton();
    if (isCollectingData) {
      if (Tower.bleConnection && Tower.bleConnection.loggingConfig) {
        Tower.bleConnection.loggingConfig.DIFFERENTIAL_READINGS = true;
      }
      updateChartStatus("Logging differential readings...");
      logger.info("Started differential readings data collection", "[Charts]");
    } else {
      if (Tower.bleConnection && Tower.bleConnection.loggingConfig) {
        Tower.bleConnection.loggingConfig.DIFFERENTIAL_READINGS = false;
      }
      updateChartStatus("Stopped logging differential readings");
      logger.info("Stopped differential readings data collection", "[Charts]");
    }
  };
  var updateTimeWindow = () => {
    const select = document.getElementById("chart-time-window");
    if (!select) return;
    chartTimeWindow = parseInt(select.value);
    if (differentialChart) {
      updateChart();
      updateChartStatistics();
    }
    logger.info(`Chart time window updated to ${chartTimeWindow} seconds`, "[Charts]");
  };
  var clearChartData = () => {
    differentialReadings = [];
    if (differentialChart) {
      differentialChart.data.datasets.forEach((dataset) => {
        dataset.data = [];
      });
      differentialChart.update();
    }
    updateChartStatistics();
    updateChartStatus(Tower.isConnected ? "Data cleared - ready to collect" : "Data cleared - connect to tower");
    logger.info("Chart data cleared", "[Charts]");
  };
  var updateChartDisplayConfig = (type, show) => {
    chartDisplayConfig[type] = show;
    if (differentialChart) {
      const datasetIndex = type === "showIrBeam" ? 0 : type === "showDrum1" ? 1 : type === "showDrum2" ? 2 : 3;
      differentialChart.data.datasets[datasetIndex].hidden = !show;
      differentialChart.update("none");
    }
    logger.info(`Chart display updated: ${type} = ${show}`, "[Charts]");
  };
  var toggleChartDisplay = (elementId, configKey) => {
    const checkbox = document.getElementById(elementId);
    if (!checkbox) return;
    updateChartDisplayConfig(configKey, checkbox.checked);
  };
  var exportChartData = () => {
    if (differentialReadings.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ["Timestamp", "Time", "Combined_Voltage", "IR_Beam", "Drum1_Top", "Drum2_Middle", "Drum3_Bottom", "Raw_Data"];
    const csvRows = [headers.join(",")];
    differentialReadings.forEach((reading) => {
      const timeString = new Date(reading.timestamp).toISOString();
      const rawDataHex = Array.from(reading.rawData).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      const row = [
        reading.timestamp,
        timeString,
        reading.voltage,
        reading.irBeam,
        reading.drum1,
        reading.drum2,
        reading.drum3,
        `"${rawDataHex}"`
      ];
      csvRows.push(row.join(","));
    });
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `differential-readings-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    logger.info(`Exported ${differentialReadings.length} differential readings with individual channel data`, "[Charts]");
  };
  window.connectToTower = connectToTower;
  window.calibrate = calibrate;
  window.resetSkullCount = resetSkullCount;
  window.playSound = playSound;
  window.singleLight = singleLight;
  window.lights = lights;
  window.overrides = overrides;
  window.rotate = rotate;
  window.breakSeal = breakSeal;
  window.clearAllLights = clearAllLights;
  window.clearAllLightCheckboxes = clearAllLightCheckboxes;
  window.allLightsOn = allLightsOn;
  window.allLightsOff = allLightsOff;
  window.randomizeLevels = randomizeLevels;
  window.sealSquareClick = sealSquareClick;
  window.switchTab = switchTab;
  window.emulatorToggleSeal = emulatorToggleSeal;
  window.emulatorRemoveAllSeals = emulatorRemoveAllSeals;
  window.emulatorReplaceAllSeals = emulatorReplaceAllSeals;
  window.moveGlyph = moveGlyph;
  window.toggleGlyphLight = toggleGlyphLight;
  window.refreshGlyphPositions = refreshGlyphPositions;
  window.filterLogs = filterLogs;
  window.clearLogs = clearLogs;
  window.saveState = saveState;
  window.loadState = loadState;
  window.resetState = resetState;
  window.updateLogLevel = updateLogLevel;
  window.clearLog = clearLog;
  window.copyDisplayedLogs = copyDisplayedLogs;
  window.downloadDisplayedLogs = downloadDisplayedLogs;
  window.getGlyphsFacingDirection = getGlyphsFacingDirection;
  window.findGlyphAtPosition = findGlyphAtPosition;
  window.getGlyphLevel = getGlyphLevel;
  window.glyphLightStates = glyphLightStates;
  window.getCurrentDoorwayLights = getCurrentDoorwayLights;
  window.updateBatteryFilter = updateBatteryFilter;
  window.updateDrumDropdowns = updateDrumDropdowns;
  window.refreshStatusPacket = refreshStatusPacket;
  window.volumeUp = volumeUp;
  window.volumeDown = volumeDown;
  window.updateVolumeDisplay = updateVolumeDisplay;
  window.initializeVolumeDisplay = initializeVolumeDisplay;
  window.toggleDataCollection = toggleDataCollection;
  window.updateTimeWindow = updateTimeWindow;
  window.clearChartData = clearChartData;
  window.exportChartData = exportChartData;
  window.initializeChart = initializeChart;
  window.updateChartDisplayConfig = updateChartDisplayConfig;
  window.toggleChartDisplay = toggleChartDisplay;
  var CAUSE_LABEL = {
    adapter_event: "Adapter event (GATT-native disconnect)",
    gatt_health_check: "GATT health check failed",
    heartbeat_timeout: "Battery heartbeat timeout",
    response_timeout: "Command response timeout",
    bt_unavailable: "Bluetooth unavailable",
    user_initiated: "User-initiated disconnect",
    page_unload: "Page unloaded while connected"
  };
  var EVENT_COLOR = {
    cmd_timeout: "text-red-400",
    cmd_failed: "text-red-400",
    disconnect: "text-red-400",
    heartbeat_late: "text-amber-400",
    log: "text-amber-300",
    cmd_sent: "text-blue-300",
    cmd_response: "text-green-300",
    connect: "text-green-400",
    cmd_enqueued: "text-gray-300",
    tower_state_response: "text-gray-400",
    skull_drop: "text-purple-300",
    calibration_started: "text-cyan-300",
    calibration_complete: "text-cyan-300"
  };
  function syncBleDebugCheckboxes() {
    const enabled = readBoolStorage(DIAG_ENABLED_KEY, false);
    const payloads = readBoolStorage(DIAG_PAYLOADS_KEY, false);
    const enabledEl = document.getElementById("ble-debug-enabled");
    const payloadsEl = document.getElementById("ble-debug-capture-payloads");
    if (enabledEl) enabledEl.checked = enabled;
    if (payloadsEl) payloadsEl.checked = payloads;
  }
  function toggleDiagnosticsEnabled() {
    const el = document.getElementById("ble-debug-enabled");
    if (!el) return;
    try {
      localStorage.setItem(DIAG_ENABLED_KEY, String(el.checked));
    } catch (e) {
    }
    Tower.setDiagnosticsEnabled(el.checked);
    refreshBleDebug();
  }
  function toggleCapturePayloads() {
    const el = document.getElementById("ble-debug-capture-payloads");
    if (!el) return;
    try {
      localStorage.setItem(DIAG_PAYLOADS_KEY, String(el.checked));
    } catch (e) {
    }
    Tower.getDiagnosticsRecorder().capturePayloads = el.checked;
  }
  function fmtAge(ms) {
    if (ms < 0) return "-";
    if (ms < 1e3) return `${ms}ms`;
    if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
    return `${(ms / 6e4).toFixed(1)}m`;
  }
  function refreshBleDebug() {
    const recorder = Tower.getDiagnosticsRecorder();
    const status = Tower.getConnectionStatus();
    const events = recorder.getRingBuffer();
    const battery = recorder.getBatteryHistory();
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    set("ble-debug-session", recorder.getSessionId() || "-");
    set("ble-debug-connected", status.isConnected ? "yes" : "no");
    set("ble-debug-ring-fill", `${events.length} / 500`);
    set("ble-debug-batt-fill", `${battery.length} / 60`);
    set("ble-debug-last-hb", fmtAge(status.lastBatteryHeartbeatMs));
    set("ble-debug-gatt", status.isGattConnected ? "connected" : "disconnected");
    const eventsEl = document.getElementById("ble-debug-events");
    if (eventsEl) {
      if (!recorder.enabled) {
        eventsEl.innerHTML = '<div class="text-gray-500">Diagnostics not enabled.</div>';
      } else if (events.length === 0) {
        eventsEl.innerHTML = '<div class="text-gray-500">No events yet. Connect to a tower.</div>';
      } else {
        const recent = events.slice(-100);
        eventsEl.innerHTML = recent.map((e) => {
          var _a2;
          const color = (_a2 = EVENT_COLOR[e.kind]) != null ? _a2 : "text-white";
          const time = new Date(e.t).toLocaleTimeString();
          const data = e.data ? ` ${escapeHtml(JSON.stringify(e.data))}` : "";
          return `<div class="${color} break-all"><span class="text-gray-500">${time}</span> ${e.kind}${data}</div>`;
        }).join("");
        eventsEl.scrollTop = eventsEl.scrollHeight;
      }
    }
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  async function refreshIncidentLog() {
    var _a2;
    const incidents = await incidentSink.list();
    const totalEl = document.getElementById("ble-debug-metric-total");
    const lastEl = document.getElementById("ble-debug-metric-last");
    const causesEl = document.getElementById("ble-debug-metric-causes");
    const listEl = document.getElementById("ble-debug-incidents");
    if (totalEl) totalEl.textContent = String(incidents.length);
    if (lastEl) lastEl.textContent = incidents[0] ? new Date(incidents[0].triggeredAt).toLocaleString() : "-";
    if (causesEl) {
      const counts = {};
      for (const r of incidents) counts[r.cause] = ((_a2 = counts[r.cause]) != null ? _a2 : 0) + 1;
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      causesEl.innerHTML = entries.length === 0 ? '<div class="text-gray-500">none</div>' : entries.map(([cause, n]) => {
        var _a3;
        return `<div><span class="text-yellow-300">${n}\xD7</span> ${escapeHtml((_a3 = CAUSE_LABEL[cause]) != null ? _a3 : cause)}</div>`;
      }).join("");
    }
    if (listEl) {
      if (incidents.length === 0) {
        listEl.innerHTML = '<div class="text-gray-500">No incidents recorded.</div>';
      } else {
        listEl.innerHTML = incidents.map((r) => renderIncidentRow(r)).join("");
      }
    }
  }
  function renderIncidentRow(r) {
    var _a2, _b;
    const when = new Date(r.triggeredAt).toLocaleString();
    const inFlight = r.commandQueue.currentCommand ? `${escapeHtml((_a2 = r.commandQueue.currentCommand.description) != null ? _a2 : r.commandQueue.currentCommand.id)} @ ${r.inFlightCommandAgeMs}ms` : "none";
    return `
    <details class="border border-gray-700 rounded mb-1">
      <summary class="cursor-pointer p-2 hover:bg-gray-800/50">
        <span class="text-yellow-300">${escapeHtml((_b = CAUSE_LABEL[r.cause]) != null ? _b : r.cause)}</span>
        <span class="text-gray-400 ml-2">${when}</span>
        <span class="text-gray-500 ml-2">session ${escapeHtml(r.sessionId.slice(0, 8))} \u2022 ${(r.sessionDurationMs / 1e3).toFixed(1)}s</span>
      </summary>
      <div class="p-2 bg-black/40 space-y-1">
        <div>In-flight: <span class="font-mono">${inFlight}</span></div>
        <div>Queue depth: <span class="font-mono">${r.commandQueue.queueLength}</span></div>
        <div>Last heartbeat: <span class="font-mono">${fmtAge(r.connectionStatus.lastBatteryHeartbeatMs)}</span></div>
        <div>GATT: <span class="font-mono">${r.connectionStatus.isGattConnected ? "connected" : "disconnected"}</span></div>
        <div>Recent events: <span class="font-mono">${r.recentEvents.length}</span> \u2022 Battery samples: <span class="font-mono">${r.batteryHistory.length}</span></div>
        <div>Library: <span class="font-mono">${escapeHtml(r.library.version)} (${r.library.platform})</span></div>
        <div class="pt-2 flex gap-2">
          <button class="tower-button text-xs px-2 py-1" onclick='exportIncident(${JSON.stringify(r.incidentId)})'>Export JSON</button>
          <button class="tower-button text-xs px-2 py-1" onclick='deleteIncident(${JSON.stringify(r.incidentId)})'>Delete</button>
        </div>
      </div>
    </details>`;
  }
  async function exportIncident(incidentId) {
    const incident = await incidentSink.get(incidentId);
    if (!incident) return;
    downloadJSON(`udt-incident-${incidentId.slice(0, 8)}.json`, incident);
  }
  async function exportAllIncidents() {
    const incidents = await incidentSink.list();
    downloadJSON(`udt-incidents-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`, { schemaVersion: 1, exportedAt: Date.now(), incidents });
  }
  async function deleteIncident(incidentId) {
    await incidentSink.delete(incidentId);
    await refreshIncidentLog();
  }
  async function clearIncidents() {
    if (!confirm("Delete all stored incidents? This cannot be undone.")) return;
    await incidentSink.clear();
    await refreshIncidentLog();
  }
  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function initBleDebug() {
    syncBleDebugCheckboxes();
    void refreshIncidentLog();
    setInterval(() => {
      const tab = document.getElementById("ble-debug-content");
      if (tab && tab.classList.contains("tower-tab-content-active")) {
        refreshBleDebug();
      }
    }, 1e3);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBleDebug);
  } else {
    initBleDebug();
  }
  window.toggleDiagnosticsEnabled = toggleDiagnosticsEnabled;
  window.toggleCapturePayloads = toggleCapturePayloads;
  window.refreshBleDebug = refreshBleDebug;
  window.refreshIncidentLog = refreshIncidentLog;
  window.exportIncident = exportIncident;
  window.exportAllIncidents = exportAllIncidents;
  window.deleteIncident = deleteIncident;
  window.clearIncidents = clearIncidents;
  window.addEventListener("beforeunload", () => {
    towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.close();
  });
  window.setInterval(() => {
    if (!(towerEmulatorWindow == null ? void 0 : towerEmulatorWindow.closed)) {
      return;
    }
    void handleTowerEmulatorWindowClosed();
  }, 500);
  window.addEventListener("message", (event) => {
    if (event.source !== towerEmulatorWindow) {
      return;
    }
    const { type } = event.data;
    if (type === "emulatorReady") {
      syncTowerEmulatorWindow();
      return;
    }
    if (type === "calibrationComplete") {
      emulatorAdapter == null ? void 0 : emulatorAdapter.completeCalibration();
      return;
    }
    if (type === "emulatorClosed") {
      void handleTowerEmulatorWindowClosed();
    }
  });
})();
//# sourceMappingURL=TowerController.js.map
