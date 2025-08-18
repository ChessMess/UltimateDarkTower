(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
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
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/udtConstants.ts
  var UART_SERVICE_UUID, UART_TX_CHARACTERISTIC_UUID, UART_RX_CHARACTERISTIC_UUID, TOWER_DEVICE_NAME, DIS_SERVICE_UUID, DIS_MANUFACTURER_NAME_UUID, DIS_MODEL_NUMBER_UUID, DIS_SERIAL_NUMBER_UUID, DIS_HARDWARE_REVISION_UUID, DIS_FIRMWARE_REVISION_UUID, DIS_SOFTWARE_REVISION_UUID, DIS_SYSTEM_ID_UUID, DIS_IEEE_REGULATORY_UUID, DIS_PNP_ID_UUID, TOWER_COMMAND_PACKET_SIZE, TOWER_STATE_DATA_SIZE, TOWER_STATE_RESPONSE_MIN_LENGTH, TOWER_STATE_DATA_OFFSET, TOWER_COMMAND_TYPE_TOWER_STATE, DEFAULT_CONNECTION_MONITORING_FREQUENCY, DEFAULT_CONNECTION_MONITORING_TIMEOUT, DEFAULT_BATTERY_HEARTBEAT_TIMEOUT, DEFAULT_RETRY_SEND_COMMAND_MAX, TOWER_SIDES_COUNT, TOWER_COMMANDS, TC, DRUM_PACKETS, GLYPHS, AUDIO_COMMAND_POS, SKULL_DROP_COUNT_POS, drumPositionCmds, LIGHT_EFFECTS, TOWER_LIGHT_SEQUENCES, TOWER_MESSAGES, VOLTAGE_LEVELS, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION, STATE_DATA_LENGTH, TOWER_AUDIO_LIBRARY, VOLUME_DESCRIPTIONS, VOLUME_ICONS;
  var init_udtConstants = __esm({
    "src/udtConstants.ts"() {
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
        monthStarted: 19
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
      LED_CHANNEL_LOOKUP = [
        // Layer 0: Top Ring (C0 R0, C0 R3, C0 R2, C0 R1)
        0,
        3,
        2,
        1,
        // Layer 1: Middle Ring (C1 R3, C1 R2, C1 R1, C1 R0) 
        7,
        6,
        5,
        4,
        // Layer 2: Bottom Ring (C2 R2, C2 R1, C2 R0, C2 R3)
        10,
        9,
        8,
        11,
        // Layer 3: Ledge (LEDGE R4, LEDGE R5, LEDGE R6, LEDGE R7)
        12,
        13,
        14,
        15,
        // Layer 4: Base1 (BASE1 R4, BASE1 R5, BASE1 R6, BASE1 R7)
        16,
        17,
        18,
        19,
        // Layer 5: Base2 (BASE2 R4, BASE2 R5, BASE2 R6, BASE2 R7) 
        20,
        21,
        22,
        23
      ];
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

  // src/udtTowerState.ts
  var udtTowerState_exports = {};
  __export(udtTowerState_exports, {
    LAYER_TO_POSITION: () => LAYER_TO_POSITION,
    LEDGE_BASE_LIGHT_POSITIONS: () => LEDGE_BASE_LIGHT_POSITIONS,
    LED_CHANNEL_LOOKUP: () => LED_CHANNEL_LOOKUP,
    LIGHT_INDEX_TO_DIRECTION: () => LIGHT_INDEX_TO_DIRECTION,
    RING_LIGHT_POSITIONS: () => RING_LIGHT_POSITIONS,
    STATE_DATA_LENGTH: () => STATE_DATA_LENGTH,
    TOWER_LAYERS: () => TOWER_LAYERS,
    isCalibrated: () => isCalibrated,
    rtdt_pack_state: () => rtdt_pack_state,
    rtdt_unpack_state: () => rtdt_unpack_state
  });
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
  var init_udtTowerState = __esm({
    "src/udtTowerState.ts"() {
      init_udtConstants();
    }
  });

  // src/UltimateDarkTower.ts
  init_udtConstants();
  init_udtTowerState();

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
      if (!this.container)
        return;
      this.allEntries.push({ level, message, timestamp });
      while (this.allEntries.length > this.maxLines) {
        this.allEntries.shift();
      }
      this.refreshDisplay();
    }
    refreshDisplay() {
      if (!this.container)
        return;
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
      var _a;
      if (typeof document === "undefined") {
        return "";
      }
      const textFilterInput = document.getElementById("logTextFilter");
      return ((_a = textFilterInput == null ? void 0 : textFilterInput.value) == null ? void 0 : _a.trim()) || "";
    }
    updateBufferSizeDisplay() {
      var _a, _b;
      if (typeof document === "undefined") {
        return;
      }
      const bufferSizeElement = document.getElementById("logBufferSize");
      if (!bufferSizeElement) {
        return;
      }
      const displayedCount = ((_b = (_a = this.container) == null ? void 0 : _a.children) == null ? void 0 : _b.length) || 0;
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
      this.outputs.push(new ConsoleOutput());
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
      if (this.enabledLevels.has("all"))
        return true;
      if (level === "all")
        return true;
      if (this.enabledLevels.has(level))
        return true;
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
      if (!this.shouldLog(level))
        return;
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
        return { cmdKey: void 0, command: { name: "Unknown Command", value: cmdValue } };
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
      const logAll = logConfig["LOG_ALL"];
      let canLogThisResponse = logConfig[cmdKey] || logAll;
      if (!cmdKey) {
        canLogThisResponse = true;
      }
      return canLogThisResponse;
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

  // src/udtBleConnection.ts
  init_udtTowerState();
  var UdtBleConnection = class {
    constructor(logger2, callbacks) {
      // BLE connection objects
      this.TowerDevice = null;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      // Connection state
      this.isConnected = false;
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
      this.lastBatteryNotification = 0;
      this.lastBatteryPercentage = "";
      this.batteryNotifyFrequency = 15 * 1e3;
      this.batteryNotifyOnValueChangeOnly = false;
      this.batteryNotifyEnabled = true;
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
      this.onRxCharacteristicValueChanged = (event) => {
        this.lastSuccessfulCommand = Date.now();
        const target = event.target;
        let receivedData = new Uint8Array(target.value.byteLength);
        for (var i = 0; i < target.value.byteLength; i++) {
          receivedData[i] = target.value.getUint8(i);
        }
        const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
        const shouldLogCommand = this.logTowerResponses && this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) && (!this.responseProcessor.isBatteryResponse(cmdKey) || this.batteryNotifyEnabled);
        if (shouldLogCommand) {
          this.logger.info(`${cmdKey}`, "[UDT][BLE][RCVD]");
        }
        if (this.logTowerResponses) {
          this.logTowerResponse(receivedData);
        }
        if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
          this.handleTowerStateResponse(receivedData);
        }
        if (this.responseProcessor.isBatteryResponse(cmdKey)) {
          this.lastBatteryHeartbeat = Date.now();
          const millivolts = getMilliVoltsFromTowerResponse(receivedData);
          const batteryPercentage = milliVoltsToPercentage(millivolts);
          const didBatteryLevelChange = this.lastBatteryPercentage !== "" && this.lastBatteryPercentage !== batteryPercentage;
          const batteryNotifyFrequencyPassed = Date.now() - this.lastBatteryNotification >= this.batteryNotifyFrequency;
          const shouldNotify = this.batteryNotifyEnabled && (this.batteryNotifyOnValueChangeOnly ? didBatteryLevelChange || this.lastBatteryPercentage === "" : batteryNotifyFrequencyPassed);
          if (shouldNotify) {
            this.logger.info(`${this.responseProcessor.commandToString(receivedData).join(" ")}`, "[UDT][BLE]");
            this.lastBatteryNotification = Date.now();
            this.lastBatteryPercentage = batteryPercentage;
            this.callbacks.onBatteryLevelNotify(millivolts);
          }
        } else {
          if (this.callbacks.onTowerResponse) {
            this.callbacks.onTowerResponse(receivedData);
          }
        }
      };
      this.bleAvailabilityChange = (event) => {
        this.logger.info("Bluetooth availability changed", "[UDT][BLE]");
        const availability = event.value;
        if (!availability && this.isConnected) {
          this.logger.warn("Bluetooth became unavailable - handling disconnection", "[UDT][BLE]");
          this.handleDisconnection();
        }
      };
      this.onTowerDeviceDisconnected = (event) => {
        this.logger.warn(`Tower device disconnected unexpectedly: ${event.type}`, "[UDT][BLE]");
        this.handleDisconnection();
      };
      this.logger = logger2;
      this.callbacks = callbacks;
      this.responseProcessor = new TowerResponseProcessor();
    }
    async connect() {
      this.logger.info("Looking for Tower...", "[UDT]");
      try {
        this.TowerDevice = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: TOWER_DEVICE_NAME }],
          optionalServices: [UART_SERVICE_UUID, DIS_SERVICE_UUID]
        });
        if (this.TowerDevice === null) {
          this.logger.warn("Tower not found", "[UDT]");
          return;
        }
        navigator.bluetooth.addEventListener("availabilitychanged", this.bleAvailabilityChange);
        this.logger.info("Connecting to Tower GATT Server...", "[UDT]");
        const server = await this.TowerDevice.gatt.connect();
        this.logger.info("Getting Tower Primary Service...", "[UDT]");
        const service = await server.getPrimaryService(UART_SERVICE_UUID);
        this.logger.info("Getting Tower Characteristics...", "[UDT]");
        this.txCharacteristic = await service.getCharacteristic(
          UART_TX_CHARACTERISTIC_UUID
        );
        this.rxCharacteristic = await service.getCharacteristic(
          UART_RX_CHARACTERISTIC_UUID
        );
        this.logger.info("Subscribing to Tower...", "[UDT]");
        await this.rxCharacteristic.startNotifications();
        await this.rxCharacteristic.addEventListener(
          "characteristicvaluechanged",
          this.onRxCharacteristicValueChanged
        );
        this.TowerDevice.addEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
        this.logger.info("Tower connection complete", "[UDT][BLE]");
        this.isConnected = true;
        this.lastSuccessfulCommand = Date.now();
        this.lastBatteryHeartbeat = Date.now();
        await this.readDeviceInformation();
        if (this.enableConnectionMonitoring) {
          this.startConnectionMonitoring();
        }
        this.callbacks.onTowerConnect();
      } catch (error) {
        this.logger.error(`Tower Connection Error: ${error}`, "[UDT][BLE]");
        this.isConnected = false;
        this.callbacks.onTowerDisconnect();
      }
    }
    async disconnect() {
      if (!this.TowerDevice) {
        return;
      }
      this.stopConnectionMonitoring();
      if (this.TowerDevice.gatt.connected) {
        this.TowerDevice.removeEventListener("gattserverdisconnected", this.onTowerDeviceDisconnected);
        await this.TowerDevice.gatt.disconnect();
        this.logger.info("Tower disconnected", "[UDT]");
        this.handleDisconnection();
      }
    }
    handleTowerStateResponse(receivedData) {
      const dataSkullDropCount = receivedData[SKULL_DROP_COUNT_POS];
      const state = rtdt_unpack_state(receivedData);
      this.logger.debug(`Tower State: ${JSON.stringify(state)} `, "[UDT][BLE]");
      if (this.performingCalibration) {
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.lastBatteryHeartbeat = Date.now();
        this.callbacks.onCalibrationComplete();
        this.logger.info("Tower calibration complete", "[UDT]");
      }
      if (dataSkullDropCount !== this.towerSkullDropCount) {
        if (dataSkullDropCount) {
          this.callbacks.onSkullDrop(dataSkullDropCount);
          this.logger.info(`Skull drop detected: app:${this.towerSkullDropCount < 0 ? "empty" : this.towerSkullDropCount}  tower:${dataSkullDropCount}`, "[UDT]");
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
    handleDisconnection() {
      this.isConnected = false;
      this.performingCalibration = false;
      this.performingLongCommand = false;
      this.stopConnectionMonitoring();
      this.lastBatteryHeartbeat = 0;
      this.lastSuccessfulCommand = 0;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
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
      var _a, _b;
      if (!this.isConnected || !this.TowerDevice) {
        return;
      }
      if (!this.TowerDevice.gatt.connected) {
        this.logger.warn("GATT connection lost detected during health check", "[UDT][BLE]");
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
            if (((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected) && this.rxCharacteristic) {
              this.logger.info("GATT connection and characteristics still available - heartbeat timeout may be temporary", "[UDT][BLE]");
              this.lastBatteryHeartbeat = Date.now();
              this.logger.info("Reset battery heartbeat timer - will monitor for another timeout period", "[UDT][BLE]");
              return;
            }
          }
          this.logger.warn("Tower possibly disconnected due to battery depletion or power loss", "[UDT][BLE]");
          this.handleDisconnection();
          return;
        }
      }
      const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
      if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
        this.logger.warn("General connection timeout detected - no responses received", "[UDT][BLE]");
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
      var _a, _b;
      if (!this.isConnected || !((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected)) {
        return false;
      }
      if (!this.txCharacteristic || !this.rxCharacteristic) {
        return false;
      }
      try {
        if (this.txCharacteristic.service && this.rxCharacteristic.service) {
          return true;
        }
      } catch (error) {
        this.logger.warn("GATT characteristics or services no longer accessible", "[UDT][BLE]");
        return false;
      }
      return true;
    }
    getConnectionStatus() {
      var _a, _b;
      const now = Date.now();
      const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
      const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
      return {
        isConnected: this.isConnected,
        isGattConnected: ((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected) || false,
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
      var _a, _b;
      if (!((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected)) {
        this.logger.warn("Cannot read device information - not connected", "[UDT][BLE]");
        return;
      }
      try {
        this.logger.info("Reading device information service...", "[UDT][BLE]");
        const disService = await this.TowerDevice.gatt.getPrimaryService(DIS_SERVICE_UUID);
        this.deviceInformation = {};
        const characteristicMap = [
          { uuid: DIS_MANUFACTURER_NAME_UUID, name: "Manufacturer Name", key: "manufacturerName", logIfMissing: true },
          { uuid: DIS_MODEL_NUMBER_UUID, name: "Model Number", key: "modelNumber", logIfMissing: true },
          { uuid: DIS_SERIAL_NUMBER_UUID, name: "Serial Number", key: "serialNumber", logIfMissing: false },
          { uuid: DIS_HARDWARE_REVISION_UUID, name: "Hardware Revision", key: "hardwareRevision", logIfMissing: true },
          { uuid: DIS_FIRMWARE_REVISION_UUID, name: "Firmware Revision", key: "firmwareRevision", logIfMissing: true },
          { uuid: DIS_SOFTWARE_REVISION_UUID, name: "Software Revision", key: "softwareRevision", logIfMissing: true },
          { uuid: DIS_SYSTEM_ID_UUID, name: "System ID", key: "systemId", logIfMissing: false },
          { uuid: DIS_IEEE_REGULATORY_UUID, name: "IEEE Regulatory", key: "ieeeRegulatory", logIfMissing: false },
          { uuid: DIS_PNP_ID_UUID, name: "PnP ID", key: "pnpId", logIfMissing: false }
        ];
        for (const { uuid, name, key, logIfMissing } of characteristicMap) {
          try {
            const characteristic = await disService.getCharacteristic(uuid);
            const value = await characteristic.readValue();
            if (uuid === DIS_SYSTEM_ID_UUID || uuid === DIS_PNP_ID_UUID) {
              const hexValue = Array.from(new Uint8Array(value.buffer)).map((b) => b.toString(16).padStart(2, "0")).join(":");
              this.logger.info(`Device ${name}: ${hexValue}`, "[UDT][BLE]");
              this.deviceInformation[key] = hexValue;
            } else {
              const textValue = new TextDecoder().decode(value);
              this.logger.info(`Device ${name}: ${textValue}`, "[UDT][BLE]");
              this.deviceInformation[key] = textValue;
            }
          } catch (error) {
            if (logIfMissing) {
              this.logger.debug(`Device ${name} characteristic not available`, "[UDT][BLE]");
            }
          }
        }
        this.deviceInformation.lastUpdated = /* @__PURE__ */ new Date();
      } catch (error) {
        this.logger.debug("Device Information Service not available", "[UDT][BLE]");
      }
    }
    async cleanup() {
      this.logger.info("Cleaning up UdtBleConnection instance", "[UDT][BLE]");
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
  };

  // src/udtCommandFactory.ts
  init_udtConstants();
  init_udtTowerState();
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
      const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, "0"));
      soundCommand[AUDIO_COMMAND_POS] = sound;
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
      const newState = currentState ? __spreadValues({}, currentState) : this.createEmptyTowerState();
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
      const modifications = {};
      if (!modifications.layer) {
        modifications.layer = [];
      }
      if (!modifications.layer[layerIndex]) {
        modifications.layer[layerIndex] = { light: [] };
      }
      if (!modifications.layer[layerIndex].light) {
        modifications.layer[layerIndex].light = [];
      }
      modifications.layer[layerIndex].light[lightIndex] = { effect, loop };
      modifications.audio = { sample: 0, loop: false, volume: 0 };
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
    * Creates a stateful audio command that preserves all current tower state while adding audio.
    * @param currentState - The current complete tower state
    * @param sample - Audio sample index to play (0-127)
    * @param loop - Whether to loop the audio
    * @param volume - Audio volume (0-15), optional
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
     * @param volume - Audio volume (0-15), optional
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
     * @param volume - Audio volume (0-15), optional
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
      const modifications = {};
      if (!modifications.drum) {
        modifications.drum = [];
      }
      modifications.drum[drumIndex] = {
        jammed: false,
        calibrated: true,
        position,
        playSound: playSound2,
        reverse: false
      };
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
    //#endregion
  };

  // src/udtTowerCommands.ts
  init_udtConstants();

  // src/udtCommandQueue.ts
  var CommandQueue = class {
    // 30 seconds
    constructor(logger2, sendCommandFn) {
      this.logger = logger2;
      this.sendCommandFn = sendCommandFn;
      this.queue = [];
      this.currentCommand = null;
      this.timeoutHandle = null;
      this.isProcessing = false;
      this.timeoutMs = 3e4;
    }
    /**
     * Enqueue a command for processing
     */
    async enqueue(command, description) {
      return new Promise((resolve, reject) => {
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
        if (!this.isProcessing) {
          this.processNext();
        }
      });
    }
    /**
     * Process the next command in the queue
     */
    async processNext() {
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
      if (this.currentCommand) {
        const { description, id } = this.currentCommand;
        this.logger.warn(`Command timeout after ${this.timeoutMs}ms: ${description || id}`, "[UDT]");
        this.currentCommand.resolve();
        this.currentCommand = null;
        this.isProcessing = false;
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
        (command) => this.sendTowerCommandDirect(command)
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
      var _a, _b, _c;
      try {
        const cmdStr = commandToPacketString(command);
        this.deps.logDetail && this.deps.logger.debug(`${cmdStr}`, "[UDT][CMD]");
        if (!this.deps.bleConnection.txCharacteristic || !this.deps.bleConnection.isConnected) {
          this.deps.logger.warn("Tower is not connected", "[UDT][CMD]");
          return;
        }
        await this.deps.bleConnection.txCharacteristic.writeValue(command);
        this.deps.retrySendCommandCount.value = 0;
        this.deps.bleConnection.lastSuccessfulCommand = Date.now();
      } catch (error) {
        this.deps.logger.error(`command send error: ${error}`, "[UDT][CMD]");
        const errorMsg = (_a = error == null ? void 0 : error.message) != null ? _a : new String(error);
        const wasCancelled = errorMsg.includes("User cancelled");
        const maxRetriesReached = this.deps.retrySendCommandCount.value >= this.deps.retrySendCommandMax;
        const isDisconnected = errorMsg.includes("Cannot read properties of null") || errorMsg.includes("GATT Server is disconnected") || errorMsg.includes("Device is not connected") || !((_c = (_b = this.deps.bleConnection.TowerDevice) == null ? void 0 : _b.gatt) == null ? void 0 : _c.connected);
        if (isDisconnected) {
          this.deps.logger.warn("Disconnect detected during command send", "[UDT][CMD]");
          await this.deps.bleConnection.disconnect();
          return;
        }
        if (!maxRetriesReached && this.deps.bleConnection.isConnected && !wasCancelled) {
          this.deps.logger.info(`retrying tower command attempt ${this.deps.retrySendCommandCount.value + 1}`, "[UDT][CMD]");
          this.deps.retrySendCommandCount.value++;
          setTimeout(() => {
            this.sendTowerCommandDirect(command);
          }, 250 * this.deps.retrySendCommandCount.value);
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
      if (!this.deps.bleConnection.performingCalibration) {
        this.deps.logger.info("Performing Tower Calibration", "[UDT][CMD]");
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
      for (const { layerIndex, lightIndex, effect } of layerCommands) {
        await this.setLEDStateful(layerIndex, lightIndex, effect);
      }
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
          console.log("[cek] effect", doorwayLight.style, effect);
          commands.push({ layerIndex, lightIndex, effect, loop: true });
        }
      }
      if (lights2.ledge) {
        for (const ledgeLight of lights2.ledge) {
          const layerIndex = TOWER_LAYERS.LEDGE;
          const lightIndex = this.getLedgeLightIndexForSide(ledgeLight.position);
          const effect = LIGHT_EFFECTS[ledgeLight.style] || LIGHT_EFFECTS.off;
          commands.push({ layerIndex, lightIndex, effect, loop: false });
        }
      }
      if (lights2.base) {
        for (const baseLight of lights2.base) {
          const layerIndex = baseLight.position.level === "top" || baseLight.position.level === "b" ? TOWER_LAYERS.BASE2 : TOWER_LAYERS.BASE1;
          const lightIndex = this.getBaseLightIndexForSide(baseLight.position.side);
          const effect = LIGHT_EFFECTS[baseLight.style] || LIGHT_EFFECTS.off;
          commands.push({ layerIndex, lightIndex, effect, loop: false });
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
      const updatedState = __spreadValues({}, currentState);
      updatedState.beam.count = 0;
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
      this.deps.logger.info("Playing tower seal sound", "[UDT]");
      await this.playSoundStateful(TOWER_AUDIO_LIBRARY.TowerSeal.value, false, actualVolume);
      const sideCorners = {
        north: ["northeast", "northwest"],
        east: ["northeast", "southeast"],
        south: ["southeast", "southwest"],
        west: ["southwest", "northwest"]
      };
      const ledgeLights = sideCorners[seal.side].map((corner) => ({
        position: corner,
        style: "on"
      }));
      const doorwayLights = [{
        level: seal.level,
        position: seal.side,
        style: "breatheFast"
      }];
      const lights2 = {
        ledge: ledgeLights,
        doorway: doorwayLights
      };
      this.deps.logger.info(`Breaking seal ${seal.level}-${seal.side} - lighting ledges and doorways with breath effect`, "[UDT]");
      await this.lights(lights2);
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
      this.deps.logger.info(`Setting LED layer ${layerIndex} light ${lightIndex} to effect ${effect}${loop ? " (looped)" : ""}`, "[UDT][CMD]");
      await this.sendTowerCommand(command, `setLEDStateful(${layerIndex}, ${lightIndex}, ${effect}, ${loop})`);
    }
    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * Audio state is not persisted to prevent sounds from replaying on subsequent commands.
     * @param soundIndex - Index of the sound to play (1-based)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns Promise that resolves when command is sent
     */
    async playSoundStateful(soundIndex, loop = false, volume) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, "[UDT][CMD]");
        return;
      }
      const currentState = this.deps.getCurrentTowerState();
      const { command } = this.deps.commandFactory.createTransientAudioCommand(currentState, soundIndex, loop, volume);
      this.deps.logger.info(`Playing sound ${soundIndex}${loop ? " (looped)" : ""}${volume !== void 0 ? ` at volume ${volume}` : ""}`, "[UDT][CMD]");
      await this.sendTowerCommand(command, `playSoundStateful(${soundIndex}, ${loop}${volume !== void 0 ? `, ${volume}` : ""})`);
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

  // src/UltimateDarkTower.ts
  var UltimateDarkTower = class {
    constructor() {
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
      };
      this.onBatteryLevelNotify = (millivolts) => {
      };
      this.onTowerStateUpdate = (newState, oldState, source) => {
      };
      // utility
      this._logDetail = false;
      this.initializeLogger();
      this.initializeComponents();
      this.setupTowerResponseCallback();
    }
    /**
     * Initialize the logger with default console output
     */
    initializeLogger() {
      this.logger = new Logger();
      this.logger.addOutput(new ConsoleOutput());
    }
    /**
     * Initialize all tower components and their dependencies
     */
    initializeComponents() {
      this.towerEventCallbacks = this.createTowerEventCallbacks();
      this.bleConnection = new UdtBleConnection(this.logger, this.towerEventCallbacks);
      this.responseProcessor = new TowerResponseProcessor(this.logDetail);
      this.commandFactory = new UdtCommandFactory();
      const commandDependencies = this.createCommandDependencies();
      this.towerCommands = new UdtTowerCommands(commandDependencies);
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
        setTowerState: (newState, source) => this.setTowerState(newState, source)
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
    get txCharacteristic() {
      return this.bleConnection.txCharacteristic;
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
    get batteryNotifyFrequency() {
      return this.bleConnection.batteryNotifyFrequency;
    }
    set batteryNotifyFrequency(value) {
      this.bleConnection.batteryNotifyFrequency = value;
    }
    get batteryNotifyOnValueChangeOnly() {
      return this.bleConnection.batteryNotifyOnValueChangeOnly;
    }
    set batteryNotifyOnValueChangeOnly(value) {
      this.bleConnection.batteryNotifyOnValueChangeOnly = value;
    }
    get batteryNotifyEnabled() {
      return this.bleConnection.batteryNotifyEnabled;
    }
    set batteryNotifyEnabled(value) {
      this.bleConnection.batteryNotifyEnabled = value;
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
     * @param volume - Audio volume (0-15), optional
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
      const { rtdt_pack_state: rtdt_pack_state2 } = await Promise.resolve().then(() => (init_udtTowerState(), udtTowerState_exports));
      const stateToSend = __spreadValues({}, towerState);
      stateToSend.audio = { sample: 0, loop: false, volume: 0 };
      const stateData = new Uint8Array(TOWER_STATE_DATA_SIZE);
      const success = rtdt_pack_state2(stateData, TOWER_STATE_DATA_SIZE, stateToSend);
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
      Promise.resolve().then(() => (init_udtTowerState(), udtTowerState_exports)).then(({ rtdt_unpack_state: rtdt_unpack_state2 }) => {
        const newState = rtdt_unpack_state2(stateData);
        newState.audio = { sample: 0, loop: false, volume: this.currentTowerState.audio.volume };
        this.setTowerState(newState, "tower response");
      });
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
      this.logger.outputs = [];
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
    //#endregion
    //#region cleanup
    /**
     * Clean up resources and disconnect properly
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    async cleanup() {
      this.logger.info("Cleaning up UltimateDarkTower instance", "[UDT]");
      this.towerCommands.clearQueue();
      await this.bleConnection.cleanup();
    }
    //#endregion
  };
  var UltimateDarkTower_default = UltimateDarkTower;

  // src/index.ts
  init_udtConstants();
  var src_default = UltimateDarkTower_default;

  // examples/controller/TowerController.ts
  init_udtTowerState();
  var Tower = new src_default();
  var sharedDOMOutput;
  var differentialChart = null;
  var differentialReadings = [];
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
    logger.info("Attempting to connect to tower...", "[TC]");
    try {
      await Tower.connect();
    } catch (error) {
      logger.error(`Connection failed: ${error}`, "[TC]");
    }
  }
  var onTowerConnected = () => {
    var _a;
    const el = document.getElementById("tower-connection-state");
    if (el) {
      el.innerText = "Tower Connected";
      el.style.background = "rgb(2 255 14 / 30%)";
    }
    logger.info("Tower connected successfully", "[TC]");
    Tower.batteryNotifyFrequency = 1e3;
    const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]');
    const selectedValue = (_a = Array.from(batteryFilterRadios).find((radio) => radio.checked)) == null ? void 0 : _a.value;
    if (selectedValue === "none") {
      Tower.batteryNotifyEnabled = false;
    } else {
      Tower.batteryNotifyEnabled = true;
      Tower.batteryNotifyOnValueChangeOnly = selectedValue === "changes";
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
  };
  Tower.onTowerDisconnect = onTowerDisconnected;
  async function calibrate() {
    if (!Tower.isConnected) {
      return;
    }
    await Tower.calibrate();
    const el = document.getElementById("calibrating-message");
    if (el) {
      el.classList.remove("hidden");
    }
  }
  var onCalibrationComplete = () => {
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
    if (!trendElement)
      return;
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
    if (!isCollectingData || response.length === 0)
      return;
    const commandValue = response[0];
    if (commandValue === 6) {
      const timestamp = Date.now();
      let voltage = 0;
      if (response.length >= 3) {
        voltage = response[1] << 8 | response[2];
      }
      const reading = {
        timestamp,
        voltage,
        rawData: new Uint8Array(response)
      };
      addDifferentialReading(reading);
      logger.debug(`Differential reading: ${voltage} at ${new Date(timestamp).toLocaleTimeString()}`, "[Charts]");
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
      startBreakSealCooldown();
    }
  };
  var clearAllLightCheckboxes = async () => {
    const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLightCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.setAttribute("data-light-style", "off");
    });
    const currentState = Tower.getCurrentTowerState();
    for (let layerIndex = 0; layerIndex < currentState.layer.length; layerIndex++) {
      for (let lightIndex = 0; lightIndex < currentState.layer[layerIndex].light.length; lightIndex++) {
        currentState.layer[layerIndex].light[lightIndex].effect = LIGHT_EFFECTS.off;
        currentState.layer[layerIndex].light[lightIndex].loop = false;
      }
    }
    try {
      await Tower.sendTowerState(currentState);
    } catch (error) {
      console.error("Error sending tower state for all lights off:", error);
    }
  };
  var allLightsOn = async () => {
    var _a;
    const lightStyleSelect = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a = lightStyleSelect == null ? void 0 : lightStyleSelect.options[lightStyleSelect.selectedIndex]) == null ? void 0 : _a.textContent) || "on";
    const effect = LIGHT_EFFECTS[selectedLightStyle] || LIGHT_EFFECTS.on;
    const allLightCheckboxes = document.querySelectorAll('input[type="checkbox"][data-light-type]');
    allLightCheckboxes.forEach((checkbox) => {
      checkbox.checked = true;
      checkbox.setAttribute("data-light-style", selectedLightStyle);
    });
    const currentState = Tower.getCurrentTowerState();
    for (let layerIndex = 0; layerIndex <= 2; layerIndex++) {
      for (let lightIndex = 0; lightIndex < currentState.layer[layerIndex].light.length; lightIndex++) {
        currentState.layer[layerIndex].light[lightIndex].effect = effect;
        currentState.layer[layerIndex].light[lightIndex].loop = effect !== 0;
      }
    }
    for (let lightIndex = 0; lightIndex < currentState.layer[3].light.length; lightIndex++) {
      currentState.layer[3].light[lightIndex].effect = effect;
      currentState.layer[3].light[lightIndex].loop = effect !== 0;
    }
    for (let layerIndex = 4; layerIndex <= 5; layerIndex++) {
      for (let lightIndex = 0; lightIndex < currentState.layer[layerIndex].light.length; lightIndex++) {
        currentState.layer[layerIndex].light[lightIndex].effect = effect;
        currentState.layer[layerIndex].light[lightIndex].loop = effect !== 0;
      }
    }
    try {
      await Tower.sendTowerState(currentState);
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
    console.log("[cek] style =", style, "effect =", effect);
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
      case "east":
        return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST;
      case "south":
        return LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST;
      case "west":
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST;
      default:
        return LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST;
    }
  };
  var lights = () => {
    var _a;
    const lightStyleSelect = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a = lightStyleSelect == null ? void 0 : lightStyleSelect.options[lightStyleSelect.selectedIndex]) == null ? void 0 : _a.textContent) || "off";
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
    var _a;
    const qs = 'input[type="checkbox"][data-light-type="doorway"]:checked';
    const checked = document.querySelectorAll(qs);
    const ls = document.getElementById("lightStyles");
    const selectedLightStyle = ((_a = ls == null ? void 0 : ls.options[ls.selectedIndex]) == null ? void 0 : _a.textContent) || "off";
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
    allLightsOff();
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
    var _a;
    const batteryFilterRadios = document.querySelectorAll('input[name="batteryFilter"]');
    const selectedValue = (_a = Array.from(batteryFilterRadios).find((radio) => radio.checked)) == null ? void 0 : _a.value;
    if (selectedValue) {
      if (selectedValue === "none") {
        Tower.batteryNotifyEnabled = false;
      } else {
        Tower.batteryNotifyEnabled = true;
        Tower.batteryNotifyOnValueChangeOnly = selectedValue === "changes";
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
    if (!logContainer)
      return;
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
    if (!logContainer)
      return;
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
    if (!display)
      return;
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
    var _a;
    return ((_a = GLYPHS[glyph]) == null ? void 0 : _a.level) || "middle";
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
    if (differentialChart)
      return;
    const ctx = document.getElementById("differential-chart");
    if (!ctx)
      return;
    differentialChart = new window.Chart(ctx, {
      type: "line",
      data: {
        datasets: [{
          label: "Differential Voltage",
          data: [],
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 1,
          pointHoverRadius: 4
        }]
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
            position: "top"
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
    if (!differentialChart)
      return;
    const cutoffTime = Date.now() - chartTimeWindow * 1e3;
    const filteredReadings = differentialReadings.filter((r) => r.timestamp > cutoffTime);
    const chartData = filteredReadings.map((reading) => ({
      x: reading.timestamp,
      y: reading.voltage
    }));
    differentialChart.data.datasets[0].data = chartData;
    differentialChart.update("none");
  };
  var updateChartStatistics = () => {
    const statsPoints = document.getElementById("chart-stats-points");
    const statsLatest = document.getElementById("chart-stats-latest");
    const statsMin = document.getElementById("chart-stats-min");
    const statsMax = document.getElementById("chart-stats-max");
    if (!statsPoints || !statsLatest || !statsMin || !statsMax)
      return;
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
    if (!button)
      return;
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
      Tower.bleConnection.loggingConfig.DIFFERENTIAL_READINGS = true;
      updateChartStatus("Logging differential readings...");
      logger.info("Started differential readings data collection", "[Charts]");
    } else {
      Tower.bleConnection.loggingConfig.DIFFERENTIAL_READINGS = false;
      updateChartStatus("Stopped logging differential readings");
      logger.info("Stopped differential readings data collection", "[Charts]");
    }
  };
  var updateTimeWindow = () => {
    const select = document.getElementById("chart-time-window");
    if (!select)
      return;
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
      differentialChart.data.datasets[0].data = [];
      differentialChart.update();
    }
    updateChartStatistics();
    updateChartStatus(Tower.isConnected ? "Data cleared - ready to collect" : "Data cleared - connect to tower");
    logger.info("Chart data cleared", "[Charts]");
  };
  var exportChartData = () => {
    if (differentialReadings.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ["Timestamp", "Time", "Voltage", "Raw Data"];
    const csvRows = [headers.join(",")];
    differentialReadings.forEach((reading) => {
      const timeString = new Date(reading.timestamp).toISOString();
      const rawDataHex = Array.from(reading.rawData).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      const row = [
        reading.timestamp,
        timeString,
        reading.voltage,
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
    logger.info(`Exported ${differentialReadings.length} differential readings`, "[Charts]");
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
})();
//# sourceMappingURL=TowerController.js.map
