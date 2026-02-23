import{createRequire}from'module';const require=createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
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
var UART_SERVICE_UUID, UART_TX_CHARACTERISTIC_UUID, UART_RX_CHARACTERISTIC_UUID, TOWER_DEVICE_NAME, DIS_SERVICE_UUID, DIS_MANUFACTURER_NAME_UUID, DIS_MODEL_NUMBER_UUID, DIS_SERIAL_NUMBER_UUID, DIS_HARDWARE_REVISION_UUID, DIS_FIRMWARE_REVISION_UUID, DIS_SOFTWARE_REVISION_UUID, DIS_SYSTEM_ID_UUID, DIS_IEEE_REGULATORY_UUID, DIS_PNP_ID_UUID, TOWER_COMMAND_PACKET_SIZE, TOWER_STATE_DATA_SIZE, TOWER_COMMAND_HEADER_SIZE, TOWER_STATE_RESPONSE_MIN_LENGTH, TOWER_STATE_DATA_OFFSET, TOWER_COMMAND_TYPE_TOWER_STATE, DEFAULT_CONNECTION_MONITORING_FREQUENCY, DEFAULT_CONNECTION_MONITORING_TIMEOUT, DEFAULT_BATTERY_HEARTBEAT_TIMEOUT, BATTERY_STATUS_FREQUENCY, DEFAULT_RETRY_SEND_COMMAND_MAX, TOWER_SIDES_COUNT, TOWER_COMMANDS, TC, DRUM_PACKETS, GLYPHS, AUDIO_COMMAND_POS, SKULL_DROP_COUNT_POS, drumPositionCmds, LIGHT_EFFECTS, TOWER_LIGHT_SEQUENCES, TOWER_MESSAGES, VOLTAGE_LEVELS, TOWER_LAYERS, RING_LIGHT_POSITIONS, LEDGE_BASE_LIGHT_POSITIONS, LED_CHANNEL_LOOKUP, LAYER_TO_POSITION, LIGHT_INDEX_TO_DIRECTION, STATE_DATA_LENGTH, TOWER_AUDIO_LIBRARY, VOLUME_DESCRIPTIONS, VOLUME_ICONS;
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
    TOWER_COMMAND_HEADER_SIZE = 1;
    TOWER_STATE_RESPONSE_MIN_LENGTH = 20;
    TOWER_STATE_DATA_OFFSET = 1;
    TOWER_COMMAND_TYPE_TOWER_STATE = 0;
    DEFAULT_CONNECTION_MONITORING_FREQUENCY = 2e3;
    DEFAULT_CONNECTION_MONITORING_TIMEOUT = 3e4;
    DEFAULT_BATTERY_HEARTBEAT_TIMEOUT = 3e3;
    BATTERY_STATUS_FREQUENCY = 200;
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

// src/udtBluetoothAdapter.ts
var BluetoothError, BluetoothConnectionError, BluetoothDeviceNotFoundError, BluetoothUserCancelledError, BluetoothTimeoutError;
var init_udtBluetoothAdapter = __esm({
  "src/udtBluetoothAdapter.ts"() {
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
            const receivedData = new Uint8Array(target.value.byteLength);
            for (let i = 0; i < target.value.byteLength; i++) {
              receivedData[i] = target.value.getUint8(i);
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
          const errorMsg = error?.message ?? String(error);
          if (errorMsg.includes("User cancelled")) {
            throw new BluetoothUserCancelledError("User cancelled device selection", error);
          }
          if (errorMsg.includes("not found") || error?.name === "NotFoundError") {
            throw new BluetoothDeviceNotFoundError("Device not found", error);
          }
          throw new BluetoothConnectionError(`Failed to connect: ${errorMsg}`, error);
        }
      }
      async disconnect() {
        if (!this.device) {
          return;
        }
        if (this.device.gatt.connected) {
          if (this.boundOnDeviceDisconnected) {
            this.device.removeEventListener("gattserverdisconnected", this.boundOnDeviceDisconnected);
          }
          await this.device.gatt.disconnect();
        }
        this.device = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
      }
      isConnected() {
        return !!this.device;
      }
      isGattConnected() {
        return this.device?.gatt?.connected ?? false;
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
        const info = {};
        if (!this.device?.gatt?.connected) {
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
            } catch {
            }
          }
          info.lastUpdated = /* @__PURE__ */ new Date();
        } catch {
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
var noble, NodeBluetoothAdapter;
var init_NodeBluetoothAdapter = __esm({
  "src/adapters/NodeBluetoothAdapter.ts"() {
    init_udtBluetoothAdapter();
    init_udtConstants();
    try {
      if (typeof process !== "undefined" && process.versions?.node) {
        noble = __require("@stoprocent/noble");
      }
    } catch {
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
          throw new BluetoothConnectionError(
            `Bluetooth adapter not ready: ${error.message}`,
            error
          );
        }
      }
      async connect(deviceName, serviceUuids) {
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
          this.txCharacteristic = characteristics.find(
            (c) => this.normalizeUuid(c.uuid) === txUuid
          );
          this.rxCharacteristic = characteristics.find(
            (c) => this.normalizeUuid(c.uuid) === rxUuid
          );
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
          throw new BluetoothConnectionError(
            `Connection failed: ${error.message}`,
            error
          );
        }
      }
      async disconnect() {
        if (!this.peripheral)
          return;
        try {
          if (this.rxCharacteristic) {
            if (this.boundDataHandler) {
              this.rxCharacteristic.removeListener("data", this.boundDataHandler);
            }
            await this.rxCharacteristic.unsubscribeAsync();
          }
          await this.peripheral.disconnectAsync();
        } catch {
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
          throw new BluetoothConnectionError(
            `Write failed: ${error.message}`,
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
            if (!char)
              continue;
            try {
              const buffer = await char.readAsync();
              if (binary) {
                const hexValue = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join(":");
                info[key] = hexValue;
              } else {
                info[key] = buffer.toString("utf-8");
              }
            } catch {
            }
          }
          info.lastUpdated = /* @__PURE__ */ new Date();
        } catch {
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
            const name = peripheral.advertisement?.localName;
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
var BufferOutput = class {
  constructor(maxEntries = 1e3, clearCount = 100) {
    this.buffer = [];
    this.maxEntries = 1e3;
    this.clearCount = 100;
    this.maxEntries = maxEntries;
    this.clearCount = clearCount;
  }
  write(level, message, timestamp) {
    this.buffer.push({ level, message, timestamp });
    if (this.buffer.length > this.maxEntries) {
      this.buffer.splice(0, this.clearCount);
    }
  }
  getBuffer() {
    return [...this.buffer];
  }
  getBufferSize() {
    return this.buffer.length;
  }
  clearBuffer() {
    this.buffer = [];
  }
  getEntriesByLevel(level) {
    return this.buffer.filter((entry) => entry.level === level);
  }
  getEntriesSince(timestamp) {
    return this.buffer.filter((entry) => entry.timestamp >= timestamp);
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
    if (typeof document === "undefined") {
      return "";
    }
    const textFilterInput = document.getElementById("logTextFilter");
    return textFilterInput?.value?.trim() || "";
  }
  updateBufferSizeDisplay() {
    if (typeof document === "undefined") {
      return;
    }
    const bufferSizeElement = document.getElementById("logBufferSize");
    if (!bufferSizeElement) {
      return;
    }
    const displayedCount = this.container?.children?.length || 0;
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
var Logger = class _Logger {
  constructor() {
    this.outputs = [];
    this.enabledLevels = /* @__PURE__ */ new Set(["all"]);
    this.outputs.push(new ConsoleOutput());
  }
  static {
    this.instance = null;
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

// src/udtBluetoothAdapterFactory.ts
var BluetoothPlatform = /* @__PURE__ */ ((BluetoothPlatform3) => {
  BluetoothPlatform3["WEB"] = "web";
  BluetoothPlatform3["NODE"] = "node";
  BluetoothPlatform3["AUTO"] = "auto";
  return BluetoothPlatform3;
})(BluetoothPlatform || {});
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
      default:
        throw new Error(`Unsupported Bluetooth platform: ${detectedPlatform}`);
    }
  }
  /**
   * Detects the current runtime environment
   * @returns Detected platform (web or node)
   */
  static detectPlatform() {
    if (typeof navigator !== "undefined" && navigator.userAgent?.includes("React Native")) {
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
  constructor(logger2, callbacks, adapter) {
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
    this.logger = logger2;
    this.callbacks = callbacks;
    this.responseProcessor = new TowerResponseProcessor();
    this.bluetoothAdapter = adapter || BluetoothAdapterFactory.create("auto" /* AUTO */);
    this.bluetoothAdapter.onCharacteristicValueChanged((data) => {
      this.onRxData(data);
    });
    this.bluetoothAdapter.onDisconnect(() => {
      this.onTowerDeviceDisconnected();
    });
    this.bluetoothAdapter.onBluetoothAvailabilityChanged((available) => {
      this.bleAvailabilityChange(available);
    });
  }
  async connect() {
    if (this.isDisposed) {
      throw new Error("UdtBleConnection instance has been disposed and cannot reconnect");
    }
    this.logger.info("Looking for Tower...", "[UDT]");
    try {
      await this.bluetoothAdapter.connect(
        TOWER_DEVICE_NAME,
        [UART_SERVICE_UUID, DIS_SERVICE_UUID]
      );
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
    this.stopConnectionMonitoring();
    if (this.bluetoothAdapter.isConnected()) {
      await this.bluetoothAdapter.disconnect();
      this.logger.info("Tower disconnected", "[UDT]");
    }
    this.handleDisconnection();
  }
  /**
   * Writes a command to the tower via the Bluetooth adapter.
   * Used by UdtTowerCommands instead of direct characteristic access.
   */
  async writeCommand(command) {
    return await this.bluetoothAdapter.writeCharacteristic(command);
  }
  /**
   * Processes received data from the RX characteristic (platform-agnostic).
   * Called by the adapter's onCharacteristicValueChanged callback.
   */
  onRxData(receivedData) {
    this.lastSuccessfulCommand = Date.now();
    const { cmdKey } = this.responseProcessor.getTowerCommand(receivedData[0]);
    const isBattery = this.responseProcessor.isBatteryResponse(cmdKey);
    const shouldLogCommand = this.logTowerResponses && this.responseProcessor.shouldLogResponse(cmdKey, this.logTowerResponseConfig) && (!isBattery || this.batteryNotifyEnabled);
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
  bleAvailabilityChange(available) {
    this.logger.info("Bluetooth availability changed", "[UDT][BLE]");
    if (!available && this.isConnected) {
      this.logger.warn("Bluetooth became unavailable - handling disconnection", "[UDT][BLE]");
      this.handleDisconnection();
    }
  }
  onTowerDeviceDisconnected() {
    this.logger.warn("Tower device disconnected unexpectedly", "[UDT][BLE]");
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
    if (!this.isConnected) {
      return;
    }
    if (!this.bluetoothAdapter.isGattConnected()) {
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
          if (this.bluetoothAdapter.isGattConnected()) {
            this.logger.info("GATT connection still available - heartbeat timeout may be temporary", "[UDT][BLE]");
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
    if (!this.isConnected) {
      return false;
    }
    return this.bluetoothAdapter.isGattConnected();
  }
  getConnectionStatus() {
    const now = Date.now();
    const timeSinceLastBattery = this.lastBatteryHeartbeat ? now - this.lastBatteryHeartbeat : -1;
    const timeSinceLastCommand = this.lastSuccessfulCommand ? now - this.lastSuccessfulCommand : -1;
    return {
      isConnected: this.isConnected,
      isGattConnected: this.bluetoothAdapter.isGattConnected(),
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
    return { ...this.deviceInformation };
  }
  async readDeviceInformation() {
    try {
      this.logger.info("Reading device information service...", "[UDT][BLE]");
      this.deviceInformation = await this.bluetoothAdapter.readDeviceInformation();
      for (const [key, value] of Object.entries(this.deviceInformation)) {
        if (key !== "lastUpdated" && value) {
          this.logger.info(`Device ${key}: ${value}`, "[UDT][BLE]");
        }
      }
    } catch (error) {
      this.logger.debug("Device Information Service not available", "[UDT][BLE]");
    }
  }
  async cleanup() {
    if (this.isDisposed)
      return;
    this.isDisposed = true;
    this.logger.info("Cleaning up UdtBleConnection instance", "[UDT][BLE]");
    this.stopConnectionMonitoring();
    if (this.isConnected) {
      await this.disconnect();
    }
    await this.bluetoothAdapter.cleanup();
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
    const newState = currentState ? { ...currentState } : this.createEmptyTowerState();
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
  * @param volume - Audio volume (0-3, 0=loudest, 3=softest). Public API clamps inputs to this range before reaching here.
  * @returns 20-byte command packet
  */
  createStatefulAudioCommand(currentState, sample, loop = false, volume) {
    const audioMods = { sample, loop, volume: volume ?? 0 };
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
    const audioMods = { sample, loop, volume: volume ?? 0 };
    const modifications = {
      audio: audioMods
    };
    const command = this.createStatefulCommand(currentState, modifications);
    const stateWithoutAudio = currentState ? { ...currentState } : this.createEmptyTowerState();
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
    const audioMods = { sample, loop, volume: volume ?? 0 };
    const modifications = {
      ...otherModifications,
      audio: audioMods
    };
    const command = this.createStatefulCommand(currentState, modifications);
    const stateWithoutAudio = currentState ? { ...currentState } : this.createEmptyTowerState();
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
      const errorMsg = error?.message ?? new String(error);
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
  async lights(lights) {
    this.deps.logDetail && this.deps.logger.debug(`Light Parameter ${JSON.stringify(lights)}`, "[UDT][CMD]");
    this.deps.logger.info("Sending light commands", "[UDT][CMD]");
    const layerCommands = this.mapLightsToLayerCommands(lights);
    for (const { layerIndex, lightIndex, effect } of layerCommands) {
      await this.setLEDStateful(layerIndex, lightIndex, effect);
    }
  }
  /**
   * Maps the Lights object to layer/light index commands for setLEDStateful.
   * @param lights - Light configuration object
   * @returns Array of layer commands
   */
  mapLightsToLayerCommands(lights) {
    const commands = [];
    if (lights.doorway) {
      for (const doorwayLight of lights.doorway) {
        const layerIndex = this.getTowerLayerForLevel(doorwayLight.level);
        const lightIndex = this.getLightIndexForSide(doorwayLight.position);
        const effect = LIGHT_EFFECTS[doorwayLight.style] || LIGHT_EFFECTS.off;
        commands.push({ layerIndex, lightIndex, effect, loop: true });
      }
    }
    if (lights.ledge) {
      for (const ledgeLight of lights.ledge) {
        const layerIndex = TOWER_LAYERS.LEDGE;
        const lightIndex = this.getLedgeLightIndexForSide(ledgeLight.position);
        const effect = LIGHT_EFFECTS[ledgeLight.style] || LIGHT_EFFECTS.off;
        commands.push({ layerIndex, lightIndex, effect, loop: false });
      }
    }
    if (lights.base) {
      for (const baseLight of lights.base) {
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
    const updatedState = { ...currentState };
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
      const stateWithVolume = { ...currentState };
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
    const lights = {
      ledge: ledgeLights,
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
  async rotateDrumStateful(drumIndex, position, playSound = false) {
    const currentState = this.deps.getCurrentTowerState();
    const command = this.deps.commandFactory.createStatefulDrumCommand(currentState, drumIndex, position, playSound);
    const drumNames = ["top", "middle", "bottom"];
    const positionNames = ["north", "east", "south", "west"];
    this.deps.logger.info(`Rotating ${drumNames[drumIndex]} drum to ${positionNames[position]}${playSound ? " with sound" : ""}`, "[UDT][CMD]");
    this.deps.bleConnection.performingLongCommand = true;
    await this.sendTowerCommand(command, `rotateDrumStateful(${drumIndex}, ${position}, ${playSound})`);
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
    const stateToSend = { ...state };
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
  constructor(config) {
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
    this.initializeComponents(config);
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
  initializeComponents(config) {
    let adapter;
    if (config?.adapter) {
      adapter = config.adapter;
    } else if (config?.platform) {
      adapter = BluetoothAdapterFactory.create(config.platform);
    }
    this.towerEventCallbacks = this.createTowerEventCallbacks();
    this.bleConnection = new UdtBleConnection(this.logger, this.towerEventCallbacks, adapter);
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
  async lights(lights) {
    return this.towerCommands.lights(lights);
  }
  /**
   * Controls the tower's LED lights including doorway, ledge, and base lights.
   * @deprecated Use `lights()` instead. This method will be removed in a future version.
   * @param lights - Light configuration object specifying which lights to control and their effects
   * @returns Promise that resolves when light command is sent
   */
  async Lights(lights) {
    return this.lights(lights);
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
  async rotateDrumStateful(drumIndex, position, playSound = false) {
    return await this.towerCommands.rotateDrumStateful(drumIndex, position, playSound);
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
    const newState = {
      ...currentState,
      layer: currentState.layer.map((layer) => ({
        light: layer.light.map(() => ({ effect, loop }))
      }))
    };
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
    return { ...this.currentTowerState };
  }
  /**
   * Sends a complete tower state to the tower, preserving existing state.
   * Audio state is automatically cleared to prevent sounds from persisting across commands.
   * @param towerState - The tower state to send
   * @returns Promise that resolves when the command is sent
   */
  async sendTowerState(towerState) {
    const { rtdt_pack_state: rtdt_pack_state2 } = await Promise.resolve().then(() => (init_udtTowerState(), udtTowerState_exports));
    const stateToSend = { ...towerState };
    stateToSend.audio = { sample: 0, loop: false, volume: 0 };
    const stateData = new Uint8Array(TOWER_STATE_DATA_SIZE);
    const success = rtdt_pack_state2(stateData, TOWER_STATE_DATA_SIZE, stateToSend);
    if (!success) {
      throw new Error("Failed to pack tower state data");
    }
    const command = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
    command[0] = TOWER_COMMAND_TYPE_TOWER_STATE;
    command.set(stateData, TOWER_STATE_DATA_OFFSET);
    this.setTowerState({ ...stateToSend }, "sendTowerState");
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
    return { ...this.glyphPositions };
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
    await this.bleConnection.cleanup();
  }
  //#endregion
};
var UltimateDarkTower_default = UltimateDarkTower;

// src/index.ts
init_udtConstants();
init_udtBluetoothAdapter();
init_udtTowerState();
var src_default = UltimateDarkTower_default;
export {
  AUDIO_COMMAND_POS,
  BATTERY_STATUS_FREQUENCY,
  BluetoothAdapterFactory,
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothError,
  BluetoothPlatform,
  BluetoothTimeoutError,
  BluetoothUserCancelledError,
  BufferOutput,
  ConsoleOutput,
  DEFAULT_BATTERY_HEARTBEAT_TIMEOUT,
  DEFAULT_CONNECTION_MONITORING_FREQUENCY,
  DEFAULT_CONNECTION_MONITORING_TIMEOUT,
  DEFAULT_RETRY_SEND_COMMAND_MAX,
  DIS_FIRMWARE_REVISION_UUID,
  DIS_HARDWARE_REVISION_UUID,
  DIS_IEEE_REGULATORY_UUID,
  DIS_MANUFACTURER_NAME_UUID,
  DIS_MODEL_NUMBER_UUID,
  DIS_PNP_ID_UUID,
  DIS_SERIAL_NUMBER_UUID,
  DIS_SERVICE_UUID,
  DIS_SOFTWARE_REVISION_UUID,
  DIS_SYSTEM_ID_UUID,
  DOMOutput,
  DRUM_PACKETS,
  GLYPHS,
  LAYER_TO_POSITION,
  LEDGE_BASE_LIGHT_POSITIONS,
  LED_CHANNEL_LOOKUP,
  LIGHT_EFFECTS,
  LIGHT_INDEX_TO_DIRECTION,
  Logger,
  RING_LIGHT_POSITIONS,
  SKULL_DROP_COUNT_POS,
  STATE_DATA_LENGTH,
  TC,
  TOWER_AUDIO_LIBRARY,
  TOWER_COMMANDS,
  TOWER_COMMAND_HEADER_SIZE,
  TOWER_COMMAND_PACKET_SIZE,
  TOWER_COMMAND_TYPE_TOWER_STATE,
  TOWER_DEVICE_NAME,
  TOWER_LAYERS,
  TOWER_LIGHT_SEQUENCES,
  TOWER_MESSAGES,
  TOWER_SIDES_COUNT,
  TOWER_STATE_DATA_OFFSET,
  TOWER_STATE_DATA_SIZE,
  TOWER_STATE_RESPONSE_MIN_LENGTH,
  UART_RX_CHARACTERISTIC_UUID,
  UART_SERVICE_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  UltimateDarkTower_default as UltimateDarkTower,
  VOLTAGE_LEVELS,
  VOLUME_DESCRIPTIONS,
  VOLUME_ICONS,
  createDefaultTowerState,
  src_default as default,
  drumPositionCmds,
  isCalibrated,
  logger,
  milliVoltsToPercentage,
  milliVoltsToPercentageNumber,
  parseDifferentialReadings,
  rtdt_pack_state,
  rtdt_unpack_state
};
