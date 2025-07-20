(() => {
  var __defProp = Object.defineProperty;
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
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/udtConstants.ts
  var UART_SERVICE_UUID, UART_TX_CHARACTERISTIC_UUID, UART_RX_CHARACTERISTIC_UUID, TOWER_DEVICE_NAME, DIS_SERVICE_UUID, DIS_MANUFACTURER_NAME_UUID, DIS_MODEL_NUMBER_UUID, DIS_SERIAL_NUMBER_UUID, DIS_HARDWARE_REVISION_UUID, DIS_FIRMWARE_REVISION_UUID, DIS_SOFTWARE_REVISION_UUID, DIS_SYSTEM_ID_UUID, DIS_IEEE_REGULATORY_UUID, DIS_PNP_ID_UUID, TOWER_COMMANDS, TC, DRUM_PACKETS, LIGHT_PACKETS, GLYPHS, AUDIO_COMMAND_POS, SKULL_DROP_COUNT_POS, drumPositionCmds, BASE_LEDGE_LIGHTS_TO_BIT_SHIFT, DOORWAY_LIGHTS_TO_BIT_SHIFT, LIGHT_EFFECTS, TOWER_AUDIO_LIBRARY, TOWER_MESSAGES, VOLTAGE_LEVELS, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION, STATE_DATA_LENGTH;
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
      LIGHT_PACKETS = {
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
        top: { north: 16, west: 2, south: 20, east: 22 },
        // bits 1-8
        middle: { north: 16, west: 64, south: 144, east: 208 },
        // bits 1-4
        bottom: { north: 66, west: 74, south: 82, east: 90 }
      };
      BASE_LEDGE_LIGHTS_TO_BIT_SHIFT = ["east", "west"];
      DOORWAY_LIGHTS_TO_BIT_SHIFT = ["north", "south"];
      LIGHT_EFFECTS = {
        on: 3,
        off: 0,
        breathe: 5,
        breatheFast: 7,
        breathe50percent: 9,
        flicker: 11
      };
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
      TOWER_MESSAGES = {
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
  var init_udtTowerState = __esm({
    "src/udtTowerState.ts"() {
      init_udtConstants();
    }
  });

  // src/UltimateDarkTower.ts
  init_udtConstants();

  // src/udtHelpers.ts
  init_udtConstants();
  function milliVoltsToPercentageNumber(mv) {
    const batLevel = mv ? mv / 3 : 0;
    const levels = VOLTAGE_LEVELS.filter((v) => batLevel >= v);
    return levels.length * 5;
  }
  function milliVoltsToPercentage(mv) {
    const batLevel = mv ? mv / 3 : 0;
    const levels = VOLTAGE_LEVELS.filter((v) => batLevel >= v);
    return `${levels.length * 5}%`;
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
  function getTowerPosition(layerIndex, lightIndex) {
    const isRingLayer = layerIndex <= 2;
    const ledChannel = LED_CHANNEL_LOOKUP[layerIndex * 4 + lightIndex];
    if (isRingLayer) {
      const directions = ["NORTH", "EAST", "SOUTH", "WEST"];
      const layerNames = ["TOP_RING", "MIDDLE_RING", "BOTTOM_RING"];
      return {
        level: layerNames[layerIndex],
        direction: directions[lightIndex],
        ledChannel
      };
    } else {
      const directions = ["NORTH_EAST", "SOUTH_EAST", "SOUTH_WEST", "NORTH_WEST"];
      const layerNames = ["LEDGE", "BASE1", "BASE2"];
      return {
        level: layerNames[layerIndex - 3],
        direction: directions[lightIndex],
        ledChannel
      };
    }
  }
  function getActiveLights(state) {
    const activeLights = [];
    state.layer.forEach((layer, layerIndex) => {
      layer.light.forEach((light, lightIndex) => {
        if (light.effect > 0) {
          const position = getTowerPosition(layerIndex, lightIndex);
          activeLights.push({
            level: position.level,
            direction: position.direction,
            effect: light.effect,
            loop: light.loop
          });
        }
      });
    });
    return activeLights;
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
      this.info(`Tower state updated from ${source}`, "[TowerState]");
      if (enableDetailedLogging) {
        const changes = this.computeStateChanges(oldState, newState);
        if (changes.length > 0) {
          this.debug(`State changes: ${changes.join(", ")}`, "[TowerState]");
        } else {
          this.debug("No changes detected in state update", "[TowerState]");
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
          if (oldLight.effect !== newLight.effect) {
            changes.push(`${layerNames[layerIndex]} light ${lightIndex}: effect ${oldLight.effect} \u2192 ${newLight.effect}`);
          }
          if (oldLight.loop !== newLight.loop) {
            changes.push(`${layerNames[layerIndex]} light ${lightIndex}: loop ${oldLight.loop} \u2192 ${newLight.loop}`);
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
      this.isCalibrated = false;
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
          const shouldNotify = this.batteryNotifyOnValueChangeOnly ? didBatteryLevelChange || this.lastBatteryPercentage === "" : batteryNotifyFrequencyPassed;
          if (shouldNotify) {
            this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(" ")}`, "[UDT]");
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
        this.logger.info("Bluetooth availability changed", "[UDT]");
        const availability = event.value;
        if (!availability && this.isConnected) {
          this.logger.warn("Bluetooth became unavailable - handling disconnection", "[UDT]");
          this.handleDisconnection();
        }
      };
      this.onTowerDeviceDisconnected = (event) => {
        this.logger.warn(`Tower device disconnected unexpectedly: ${event.type}`, "[UDT]");
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
        this.logger.info("Tower connection complete", "[UDT]");
        this.isConnected = true;
        this.lastSuccessfulCommand = Date.now();
        this.lastBatteryHeartbeat = Date.now();
        await this.readDeviceInformation();
        if (this.enableConnectionMonitoring) {
          this.startConnectionMonitoring();
        }
        this.callbacks.onTowerConnect();
      } catch (error) {
        this.logger.error(`Tower Connection Error: ${error}`, "[UDT]");
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
      this.logger.debug("Tower Message Received", "[UDT][BLE]");
      const state = rtdt_unpack_state(receivedData);
      this.logger.debug(`Tower State: ${JSON.stringify(state)} `, "[UDT][BLE]");
      console.log("[CEK] Tower State:", state);
      try {
        const activeLights = getActiveLights(state);
        if (activeLights.length > 0) {
          console.log("[CEK] Active Lights:", activeLights);
        }
      } catch (error) {
      }
      if (this.performingCalibration) {
        this.performingCalibration = false;
        this.performingLongCommand = false;
        this.isCalibrated = true;
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
      const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
      if (!this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig)) {
        return;
      }
      if (this.responseProcessor.isBatteryResponse(cmdKey)) {
        return;
      }
      this.logger.info(`Tower response: ${this.responseProcessor.commandToString(receivedData).join(" ")}`, "[UDT]");
    }
    handleDisconnection() {
      this.isConnected = false;
      this.isCalibrated = false;
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
        this.logger.warn("GATT connection lost detected during health check", "[UDT]");
        this.handleDisconnection();
        return;
      }
      if (this.enableBatteryHeartbeatMonitoring) {
        const timeSinceLastBatteryHeartbeat = Date.now() - this.lastBatteryHeartbeat;
        const timeoutThreshold = this.performingLongCommand ? this.longTowerCommandTimeout : this.batteryHeartbeatTimeout;
        if (timeSinceLastBatteryHeartbeat > timeoutThreshold) {
          const operationContext = this.performingLongCommand ? " during long command operation" : "";
          this.logger.warn(`Battery heartbeat timeout detected${operationContext} - no battery status received in ${timeSinceLastBatteryHeartbeat}ms (expected every ~200ms)`, "[UDT]");
          if (this.performingLongCommand) {
            this.logger.info("Ignoring battery heartbeat timeout during long command - this is expected behavior", "[UDT]");
            return;
          }
          if (this.batteryHeartbeatVerifyConnection) {
            this.logger.info("Verifying tower connection status before triggering disconnection...", "[UDT]");
            if (((_b = (_a = this.TowerDevice) == null ? void 0 : _a.gatt) == null ? void 0 : _b.connected) && this.rxCharacteristic) {
              this.logger.info("GATT connection and characteristics still available - heartbeat timeout may be temporary", "[UDT]");
              this.lastBatteryHeartbeat = Date.now();
              this.logger.info("Reset battery heartbeat timer - will monitor for another timeout period", "[UDT]");
              return;
            }
          }
          this.logger.warn("Tower possibly disconnected due to battery depletion or power loss", "[UDT]");
          this.handleDisconnection();
          return;
        }
      }
      const timeSinceLastResponse = Date.now() - this.lastSuccessfulCommand;
      if (timeSinceLastResponse > this.connectionTimeoutThreshold) {
        this.logger.warn("General connection timeout detected - no responses received", "[UDT]");
        this.logger.warn("Heartbeat timeout - connection appears lost", "[UDT]");
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
        this.logger.warn("GATT characteristics or services no longer accessible", "[UDT]");
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
        isCalibrated: this.isCalibrated,
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
        this.logger.warn("Cannot read device information - not connected", "[UDT]");
        return;
      }
      try {
        this.logger.info("Reading device information service...", "[UDT]");
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
              this.logger.info(`Device ${name}: ${hexValue}`, "[UDT]");
              this.deviceInformation[key] = hexValue;
            } else {
              const textValue = new TextDecoder().decode(value);
              this.logger.info(`Device ${name}: ${textValue}`, "[UDT]");
              this.deviceInformation[key] = textValue;
            }
          } catch (error) {
            if (logIfMissing) {
              this.logger.debug(`Device ${name} characteristic not available`, "[UDT]");
            }
          }
        }
        this.deviceInformation.lastUpdated = /* @__PURE__ */ new Date();
      } catch (error) {
        this.logger.debug("Device Information Service not available", "[UDT]");
      }
    }
    async cleanup() {
      this.logger.info("Cleaning up UdtBleConnection instance", "[UDT]");
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
     * Creates a light command packet from a lights configuration object.
     * @param lights - Light configuration specifying doorway, ledge, and base lights
     * @returns Command packet for controlling tower lights
     */
    createLightPacketCommand(lights) {
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
    }
    /**
     * Creates a light override command packet.
     * @param lightOverride - Light override value to send
     * @returns Command packet for light override
     */
    createLightOverrideCommand(lightOverride) {
      const lightOverrideCommand = new Uint8Array(20);
      lightOverrideCommand[LIGHT_PACKETS.overrides] = lightOverride;
      return lightOverrideCommand;
    }
    /**
     * Creates a rotation command packet for positioning tower drums.
     * @param top - Target position for top drum
     * @param middle - Target position for middle drum
     * @param bottom - Target position for bottom drum
     * @returns Command packet for rotating tower drums
     */
    createRotateCommand(top, middle, bottom) {
      const rotateCmd = new Uint8Array(20);
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
      const soundCommand = new Uint8Array(20);
      const sound = Number("0x" + Number(soundIndex).toString(16).padStart(2, "0"));
      soundCommand[AUDIO_COMMAND_POS] = sound;
      return soundCommand;
    }
    /**
     * Updates a command packet with the current drum positions.
     * @param commandPacket - The command packet to update with current drum positions
     * @param currentPositions - Current drum positions to apply
     */
    updateCommandWithCurrentDrumPositions(commandPacket, currentPositions) {
      commandPacket[DRUM_PACKETS.topMiddle] = currentPositions.topMiddle;
      commandPacket[DRUM_PACKETS.bottom] = currentPositions.bottom;
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
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Creates a stateful audio command that only changes audio while preserving all other state.
     * @param currentState - The current complete tower state
     * @param sample - Audio sample index (0-127)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns 20-byte command packet
     */
    createStatefulAudioCommand(currentState, sample, loop = false, volume) {
      const audioMods = { sample, loop };
      if (volume !== void 0) {
        audioMods.volume = volume;
      }
      const modifications = {
        audio: audioMods
      };
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Creates a stateful drum rotation command that only changes drum positions while preserving all other state.
     * @param currentState - The current complete tower state
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns 20-byte command packet
     */
    createStatefulDrumCommand(currentState, drumIndex, position, playSound = false) {
      const modifications = {};
      if (!modifications.drum) {
        modifications.drum = [];
      }
      modifications.drum[drumIndex] = {
        jammed: false,
        calibrated: true,
        position,
        playSound,
        reverse: false
      };
      return this.createStatefulCommand(currentState, modifications);
    }
    /**
     * Packs a complete tower state into a 20-byte command packet.
     * @param state - Complete tower state to pack
     * @returns 20-byte command packet (0x00 + 19 bytes state data)
     */
    packTowerStateCommand(state) {
      const stateData = new Uint8Array(19);
      const success = rtdt_pack_state(stateData, 19, state);
      if (!success) {
        throw new Error("Failed to pack tower state data");
      }
      const command = new Uint8Array(20);
      command[0] = 0;
      command.set(stateData, 1);
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
        this.deps.logDetail && this.deps.logger.debug(`packet(s) sent: ${cmdStr}`, "[UDT]");
        if (!this.deps.bleConnection.txCharacteristic || !this.deps.bleConnection.isConnected) {
          this.deps.logger.warn("Tower is not connected", "[UDT]");
          return;
        }
        await this.deps.bleConnection.txCharacteristic.writeValue(command);
        this.deps.retrySendCommandCount.value = 0;
        this.deps.bleConnection.lastSuccessfulCommand = Date.now();
      } catch (error) {
        this.deps.logger.error(`command send error: ${error}`, "[UDT]");
        const errorMsg = (_a = error == null ? void 0 : error.message) != null ? _a : new String(error);
        const wasCancelled = errorMsg.includes("User cancelled");
        const maxRetriesReached = this.deps.retrySendCommandCount.value >= this.deps.retrySendCommandMax;
        const isDisconnected = errorMsg.includes("Cannot read properties of null") || errorMsg.includes("GATT Server is disconnected") || errorMsg.includes("Device is not connected") || !((_c = (_b = this.deps.bleConnection.TowerDevice) == null ? void 0 : _b.gatt) == null ? void 0 : _c.connected);
        if (isDisconnected) {
          this.deps.logger.warn("Disconnect detected during command send", "[UDT]");
          await this.deps.bleConnection.disconnect();
          return;
        }
        if (!maxRetriesReached && this.deps.bleConnection.isConnected && !wasCancelled) {
          this.deps.logger.info(`retrying tower command attempt ${this.deps.retrySendCommandCount.value + 1}`, "[UDT]");
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
        this.deps.logger.info("Performing Tower Calibration", "[UDT]");
        await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.calibration]), "calibrate");
        this.deps.bleConnection.performingCalibration = true;
        this.deps.bleConnection.performingLongCommand = true;
        return;
      }
      this.deps.logger.warn("Tower calibration requested when tower is already performing calibration", "[UDT]");
      return;
    }
    /**
     * Plays a sound from the tower's audio library using stateful commands that preserve existing tower state.
     * @param soundIndex - Index of the sound to play (1-based, must be valid in TOWER_AUDIO_LIBRARY)
     * @returns Promise that resolves when sound command is sent
     */
    async playSound(soundIndex) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, "[UDT]");
        return;
      }
      const currentState = this.deps.getCurrentTowerState();
      const command = this.deps.commandFactory.createStatefulAudioCommand(currentState, soundIndex, false);
      this.deps.logger.info("Sending sound command (stateful)", "[UDT]");
      await this.sendTowerCommand(command, `playSound(${soundIndex})`);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async lights(lights) {
      const lightCommand = this.deps.commandFactory.createLightPacketCommand(lights);
      this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightCommand, this.deps.currentDrumPositions);
      this.deps.logDetail && this.deps.logger.debug(`Light Parameter ${JSON.stringify(lights)}`, "[UDT]");
      this.deps.logger.info("Sending light command", "[UDT]");
      await this.sendTowerCommand(lightCommand, "lights");
    }
    /**
     * Sends a light override command to control specific light patterns.
     * @param light - Light override value to send
     * @param soundIndex - Optional sound to play with the light override
     * @returns Promise that resolves when light override command is sent
     */
    async lightOverrides(light, soundIndex) {
      const lightOverrideCommand = this.deps.commandFactory.createLightOverrideCommand(light);
      this.deps.commandFactory.updateCommandWithCurrentDrumPositions(lightOverrideCommand, this.deps.currentDrumPositions);
      if (soundIndex) {
        lightOverrideCommand[AUDIO_COMMAND_POS] = soundIndex;
      }
      this.deps.logger.info("Sending light override" + (soundIndex ? " with sound" : ""), "[UDT]");
      await this.sendTowerCommand(lightOverrideCommand, `lightOverrides(${light}${soundIndex ? `, ${soundIndex}` : ""})`);
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
      this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, "[UDT]");
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
      this.deps.currentDrumPositions.topMiddle = rotateCommand[DRUM_PACKETS.topMiddle];
      this.deps.currentDrumPositions.bottom = rotateCommand[DRUM_PACKETS.bottom];
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
      this.deps.logDetail && this.deps.logger.debug(`Rotate Parameter TMB[${JSON.stringify(top)}|${middle}|${bottom}] S[${soundIndex}]`, "[UDT]");
      const positionMap = {
        "north": 0,
        "east": 1,
        "south": 2,
        "west": 3
      };
      this.deps.logger.info("Sending stateful rotate commands" + (soundIndex ? " with sound" : ""), "[UDT]");
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
        this.deps.currentDrumPositions.topMiddle = positionMap[top] << 2 | positionMap[middle];
        this.deps.currentDrumPositions.bottom = positionMap[bottom];
      }
    }
    /**
     * Resets the tower's internal skull drop counter to zero.
     * @returns Promise that resolves when reset command is sent
     */
    async resetTowerSkullCount() {
      this.deps.logger.info("Tower skull count reset requested", "[UDT]");
      await this.sendTowerCommand(new Uint8Array([TOWER_COMMANDS.resetCounter]), "resetTowerSkullCount");
    }
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
      this.deps.logger.info("Playing tower seal sound", "[UDT]");
      await this.playSound(TOWER_AUDIO_LIBRARY.TowerSeal.value);
      const adjacentSides = {
        north: "east",
        east: "south",
        south: "west",
        west: "north"
      };
      const ledgeLights = [
        { position: seal.side, style: "on" },
        { position: adjacentSides[seal.side], style: "on" }
      ];
      const uniqueLedgeLights = ledgeLights.filter(
        (light, index, self) => index === self.findIndex((l) => l.position === light.position)
      );
      const doorwayLights = [{
        level: seal.level,
        position: seal.side,
        style: "breatheFast"
      }];
      const lights = {
        ledge: uniqueLedgeLights,
        doorway: doorwayLights
      };
      this.deps.logger.info(`Breaking seal ${seal.level}-${seal.side} - lighting ledges and doorways with breath effect`, "[UDT]");
      await this.lights(lights);
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
          this.deps.logger.error("Invalid level parameter for randomRotateLevels. Must be 0-6.", "[UDT]");
          return;
      }
      this.deps.logger.info(`Random rotating levels to: top:${topSide}, middle:${middleSide}, bottom:${bottomSide}`, "[UDT]");
      await this.rotate(topSide, middleSide, bottomSide);
    }
    /**
     * Gets the current position of a specific drum level.
     * @param level - The drum level to get position for
     * @returns The current position of the specified drum level
     */
    getCurrentDrumPosition(level) {
      const drumPositions = drumPositionCmds[level];
      const rawValue = level === "bottom" ? this.deps.currentDrumPositions.bottom : this.deps.currentDrumPositions.topMiddle;
      for (const [side, value] of Object.entries(drumPositions)) {
        if (level === "middle") {
          if ((value & 192) === (rawValue & 192)) {
            return side;
          }
        } else if (level === "top") {
          if ((value & 22) === (rawValue & 22)) {
            return side;
          }
        } else {
          if (value === rawValue) {
            return side;
          }
        }
      }
      return "north";
    }
    //#region Stateful Command Methods
    /**
     * Sends a stateful LED command that only changes specific LEDs while preserving all other state.
     * @param layerIndex - Layer index (0-5)
     * @param lightIndex - Light index within layer (0-3)
     * @param effect - Light effect (0=off, 1=on, 2=slow pulse, etc.)
     * @param loop - Whether to loop the effect
     * @returns Promise that resolves when command is sent
     */
    async setLEDStateful(layerIndex, lightIndex, effect, loop = false) {
      const currentState = this.deps.getCurrentTowerState();
      const command = this.deps.commandFactory.createStatefulLEDCommand(currentState, layerIndex, lightIndex, effect, loop);
      this.deps.logger.info(`Setting LED layer ${layerIndex} light ${lightIndex} to effect ${effect}${loop ? " (looped)" : ""}`, "[UDT]");
      await this.sendTowerCommand(command, `setLEDStateful(${layerIndex}, ${lightIndex}, ${effect}, ${loop})`);
    }
    /**
     * Plays a sound using stateful commands that preserve existing tower state.
     * @param soundIndex - Index of the sound to play (1-based)
     * @param loop - Whether to loop the audio
     * @param volume - Audio volume (0-15), optional
     * @returns Promise that resolves when command is sent
     */
    async playSoundStateful(soundIndex, loop = false, volume) {
      const invalidIndex = soundIndex === null || soundIndex > Object.keys(TOWER_AUDIO_LIBRARY).length || soundIndex <= 0;
      if (invalidIndex) {
        this.deps.logger.error(`attempt to play invalid sound index ${soundIndex}`, "[UDT]");
        return;
      }
      const currentState = this.deps.getCurrentTowerState();
      const command = this.deps.commandFactory.createStatefulAudioCommand(currentState, soundIndex, loop, volume);
      this.deps.logger.info(`Playing sound ${soundIndex}${loop ? " (looped)" : ""}${volume !== void 0 ? ` at volume ${volume}` : ""}`, "[UDT]");
      await this.sendTowerCommand(command, `playSoundStateful(${soundIndex}, ${loop}${volume !== void 0 ? `, ${volume}` : ""})`);
    }
    /**
     * Rotates a single drum using stateful commands that preserve existing tower state.
     * @param drumIndex - Drum index (0=top, 1=middle, 2=bottom)
     * @param position - Target position (0=north, 1=east, 2=south, 3=west)
     * @param playSound - Whether to play sound during rotation
     * @returns Promise that resolves when command is sent
     */
    async rotateDrumStateful(drumIndex, position, playSound = false) {
      const currentState = this.deps.getCurrentTowerState();
      const command = this.deps.commandFactory.createStatefulDrumCommand(currentState, drumIndex, position, playSound);
      const drumNames = ["top", "middle", "bottom"];
      const positionNames = ["north", "east", "south", "west"];
      this.deps.logger.info(`Rotating ${drumNames[drumIndex]} drum to ${positionNames[position]}${playSound ? " with sound" : ""}`, "[UDT]");
      this.deps.bleConnection.performingLongCommand = true;
      await this.sendTowerCommand(command, `rotateDrumStateful(${drumIndex}, ${position}, ${playSound})`);
      setTimeout(() => {
        this.deps.bleConnection.performingLongCommand = false;
        this.deps.bleConnection.lastBatteryHeartbeat = Date.now();
      }, this.deps.bleConnection.longTowerCommandTimeout);
    }
    /**
     * Sends a complete tower state using stateful commands.
     * @param state - Complete tower state to send
     * @returns Promise that resolves when command is sent
     */
    async sendTowerStateStateful(state) {
      const command = this.deps.commandFactory.packTowerStateCommand(state);
      this.deps.logger.info("Sending complete tower state", "[UDT]");
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
      this.retrySendCommandMax = 5;
      // tower state
      this.currentDrumPositions = { topMiddle: 16, bottom: 66 };
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
      // call back functions
      // you overwrite these with your own functions 
      // to handle these events in your app
      this.onTowerConnect = () => {
      };
      this.onTowerDisconnect = () => {
      };
      this.onCalibrationComplete = () => {
      };
      this.onSkullDrop = (_towerSkullCount) => {
        console.log(_towerSkullCount);
      };
      this.onBatteryLevelNotify = (_millivolts) => {
        console.log(_millivolts);
      };
      // utility
      this._logDetail = false;
      this.logger = new Logger();
      this.logger.addOutput(new ConsoleOutput());
      const callbacks = {
        onTowerConnect: () => this.onTowerConnect(),
        onTowerDisconnect: () => {
          this.onTowerDisconnect();
          if (this.towerCommands) {
            this.towerCommands.clearQueue();
          }
        },
        onBatteryLevelNotify: (millivolts) => {
          this.previousBatteryValue = this.currentBatteryValue;
          this.currentBatteryValue = millivolts;
          this.previousBatteryPercentage = this.currentBatteryPercentage;
          this.currentBatteryPercentage = milliVoltsToPercentageNumber(millivolts);
          this.onBatteryLevelNotify(millivolts);
        },
        onCalibrationComplete: () => {
          this.setGlyphPositionsFromCalibration();
          this.onCalibrationComplete();
        },
        onSkullDrop: (towerSkullCount) => this.onSkullDrop(towerSkullCount)
      };
      this.bleConnection = new UdtBleConnection(this.logger, callbacks);
      this.responseProcessor = new TowerResponseProcessor(this.logDetail);
      this.commandFactory = new UdtCommandFactory();
      const commandDependencies = {
        logger: this.logger,
        commandFactory: this.commandFactory,
        bleConnection: this.bleConnection,
        responseProcessor: this.responseProcessor,
        currentDrumPositions: this.currentDrumPositions,
        logDetail: this.logDetail,
        retrySendCommandCount: this.retrySendCommandCountRef,
        retrySendCommandMax: this.retrySendCommandMax,
        getCurrentTowerState: () => this.currentTowerState
      };
      this.towerCommands = new UdtTowerCommands(commandDependencies);
      callbacks.onTowerResponse = (response) => {
        this.towerCommands.onTowerResponse();
        if (response.length >= 20) {
          const { cmdKey } = this.responseProcessor.getTowerCommand(response[0]);
          if (this.responseProcessor.isTowerStateResponse(cmdKey)) {
            const stateData = response.slice(1, 20);
            this.updateTowerStateFromResponse(stateData);
          }
        }
      };
    }
    get logDetail() {
      return this._logDetail;
    }
    set logDetail(value) {
      this._logDetail = value;
      this.responseProcessor.setDetailedLogging(value);
      if (this.towerCommands) {
        const commandDependencies = {
          logger: this.logger,
          commandFactory: this.commandFactory,
          bleConnection: this.bleConnection,
          responseProcessor: this.responseProcessor,
          currentDrumPositions: this.currentDrumPositions,
          logDetail: this.logDetail,
          retrySendCommandCount: this.retrySendCommandCountRef,
          retrySendCommandMax: this.retrySendCommandMax,
          getCurrentTowerState: () => this.currentTowerState
        };
        this.towerCommands = new UdtTowerCommands(commandDependencies);
      }
    }
    // Getter methods for connection state
    get isConnected() {
      return this.bleConnection.isConnected;
    }
    get isCalibrated() {
      return this.bleConnection.isCalibrated;
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
    async playSound(soundIndex) {
      return await this.towerCommands.playSound(soundIndex);
    }
    /**
     * Controls the tower's LED lights including doorway, ledge, and base lights.
     * @param lights - Light configuration object specifying which lights to control and their effects
     * @returns Promise that resolves when light command is sent
     */
    async Lights(lights) {
      return await this.towerCommands.lights(lights);
    }
    /**
     * Sends a raw command packet directly to the tower (for testing purposes).
     * @param command - The raw command packet to send
     * @returns Promise that resolves when command is sent
     */
    async sendTowerCommandDirect(command) {
      return await this.towerCommands.sendTowerCommandDirectPublic(command);
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
    async rotateDrumStateful(drumIndex, position, playSound = false) {
      return await this.towerCommands.rotateDrumStateful(drumIndex, position, playSound);
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
     * This creates a stateful command that only changes the specified fields.
     * @param towerState - The tower state to send
     * @returns Promise that resolves when the command is sent
     */
    async sendTowerState(towerState) {
      const { rtdt_pack_state: rtdt_pack_state2 } = await Promise.resolve().then(() => (init_udtTowerState(), udtTowerState_exports));
      const stateData = new Uint8Array(19);
      const success = rtdt_pack_state2(stateData, 19, towerState);
      if (!success) {
        throw new Error("Failed to pack tower state data");
      }
      const command = new Uint8Array(20);
      command[0] = 0;
      command.set(stateData, 1);
      this.setTowerState(__spreadValues({}, towerState), "sendTowerState");
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
    }
    /**
     * Updates the current tower state from a tower response.
     * Called internally when tower state responses are received.
     * @param stateData - The 19-byte state data from tower response
     */
    updateTowerStateFromResponse(stateData) {
      Promise.resolve().then(() => (init_udtTowerState(), udtTowerState_exports)).then(({ rtdt_unpack_state: rtdt_unpack_state2 }) => {
        const newState = rtdt_unpack_state2(stateData);
        this.setTowerState(newState, "tower response");
      });
    }
    //#endregion
    /**
     * Breaks a single seal on the tower, playing appropriate sound and lighting effects.
     * @param seal - Seal identifier to break (e.g., {side: 'north', level: 'middle'})
     * @returns Promise that resolves when seal break sequence is complete
     */
    async breakSeal(seal) {
      const result = await this.towerCommands.breakSeal(seal);
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
        rotationSteps += 4;
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
        rotationSteps += 4;
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
    configureConnectionMonitoring(frequency = 2e3, timeout = 3e4) {
      this.bleConnection.configureConnectionMonitoring(frequency, timeout);
    }
    /**
     * Configure battery heartbeat monitoring parameters
     * Tower sends battery status every ~200ms, so this is the most reliable disconnect indicator
     * @param {boolean} [enabled=true] - Whether to enable battery heartbeat monitoring
     * @param {number} [timeout=3000] - How long to wait for battery status before considering disconnected (milliseconds)
     * @param {boolean} [verifyConnection=true] - Whether to verify connection status before triggering disconnection on heartbeat timeout
     */
    configureBatteryHeartbeatMonitoring(enabled = true, timeout = 3e3, verifyConnection = true) {
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
