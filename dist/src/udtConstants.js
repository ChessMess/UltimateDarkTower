"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOLUME_ICONS = exports.VOLUME_DESCRIPTIONS = exports.TOWER_AUDIO_LIBRARY = exports.STATE_DATA_LENGTH = exports.LIGHT_INDEX_TO_DIRECTION = exports.LAYER_TO_POSITION = exports.LED_CHANNEL_LOOKUP = exports.LEDGE_BASE_LIGHT_POSITIONS = exports.RING_LIGHT_POSITIONS = exports.TOWER_LAYERS = exports.VOLTAGE_LEVELS = exports.TOWER_MESSAGES = exports.TOWER_LIGHT_SEQUENCES = exports.LIGHT_EFFECTS = exports.drumPositionCmds = exports.SKULL_DROP_COUNT_POS = exports.AUDIO_COMMAND_POS = exports.GLYPHS = exports.DRUM_PACKETS = exports.TC = exports.TOWER_COMMANDS = exports.DIS_PNP_ID_UUID = exports.DIS_IEEE_REGULATORY_UUID = exports.DIS_SYSTEM_ID_UUID = exports.DIS_SOFTWARE_REVISION_UUID = exports.DIS_FIRMWARE_REVISION_UUID = exports.DIS_HARDWARE_REVISION_UUID = exports.DIS_SERIAL_NUMBER_UUID = exports.DIS_MODEL_NUMBER_UUID = exports.DIS_MANUFACTURER_NAME_UUID = exports.DIS_SERVICE_UUID = exports.TOWER_DEVICE_NAME = exports.UART_RX_CHARACTERISTIC_UUID = exports.UART_TX_CHARACTERISTIC_UUID = exports.UART_SERVICE_UUID = void 0;
// Nordic Semicondutor's UART/Serial IDs for Bluetooth LE
exports.UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
exports.UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
exports.UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
exports.TOWER_DEVICE_NAME = "ReturnToDarkTower";
// Device Information Service (DIS) UUIDs
exports.DIS_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
exports.DIS_MANUFACTURER_NAME_UUID = "00002a29-0000-1000-8000-00805f9b34fb";
exports.DIS_MODEL_NUMBER_UUID = "00002a24-0000-1000-8000-00805f9b34fb";
exports.DIS_SERIAL_NUMBER_UUID = "00002a25-0000-1000-8000-00805f9b34fb";
exports.DIS_HARDWARE_REVISION_UUID = "00002a27-0000-1000-8000-00805f9b34fb";
exports.DIS_FIRMWARE_REVISION_UUID = "00002a26-0000-1000-8000-00805f9b34fb";
exports.DIS_SOFTWARE_REVISION_UUID = "00002a28-0000-1000-8000-00805f9b34fb";
exports.DIS_SYSTEM_ID_UUID = "00002a23-0000-1000-8000-00805f9b34fb";
exports.DIS_IEEE_REGULATORY_UUID = "00002a2a-0000-1000-8000-00805f9b34fb";
exports.DIS_PNP_ID_UUID = "00002a50-0000-1000-8000-00805f9b34fb";
// tower commands 
exports.TOWER_COMMANDS = {
    towerState: 0,
    doorReset: 1,
    unjamDrums: 2,
    resetCounter: 3,
    calibration: 4,
    overwriteDrumStates: 5,
    // go no further!
};
// tower commands enum
exports.TC = {
    STATE: "TOWER_STATE",
    INVALID_STATE: "INVALID_STATE",
    FAILURE: "HARDWARE_FAILURE",
    JIGGLE: "MECH_JIGGLE_TRIGGERED",
    UNEXPECTED: "MECH_UNEXPECTED_TRIGGER",
    DURATION: "MECH_DURATION",
    DIFFERENTIAL: "DIFFERENTIAL_READINGS",
    CALIBRATION: "CALIBRATION_FINISHED",
    BATTERY: "BATTERY_READING",
};
exports.DRUM_PACKETS = {
    topMiddle: 1,
    bottom: 2,
};
// positions based on calibrated drum orientation
exports.GLYPHS = {
    cleanse: { name: "Cleanse", level: "top", side: "north" },
    quest: { name: "Quest", level: "top", side: "south" },
    battle: { name: "Battle", level: "middle", side: "north" },
    banner: { name: "Banner", level: "bottom", side: "north" },
    reinforce: { name: "Reinforce", level: "bottom", side: "south" },
};
exports.AUDIO_COMMAND_POS = 15;
exports.SKULL_DROP_COUNT_POS = 17;
// prettier-ignore
exports.drumPositionCmds = {
    top: { north: 0b00010000, east: 0b00000010, south: 0b00010100, west: 0b00010110 },
    middle: { north: 0b00010000, east: 0b01000000, south: 0b10010000, west: 0b11010000 },
    bottom: { north: 0b01000010, east: 0b01001010, south: 0b01010010, west: 0b01011010 },
};
exports.LIGHT_EFFECTS = {
    off: 0,
    on: 1,
    breathe: 2,
    breatheFast: 3,
    breathe50percent: 4,
    flicker: 5,
};
exports.TOWER_LIGHT_SEQUENCES = {
    twinkle: 0x01,
    flareThenFade: 0x02,
    flareThenFadeBase: 0x03,
    flareThenFlicker: 0x04,
    angryStrobe01: 0x05,
    angryStrobe02: 0x06,
    angryStrobe03: 0x07,
    gloat01: 0x08,
    gloat02: 0x09,
    gloat03: 0x0a,
    defeat: 0x0b,
    victory: 0x0c,
    dungeonIdle: 0x0d,
    sealReveal: 0x0e,
    rotationAllDrums: 0x0f,
    rotationDrumTop: 0x10,
    rotationDrumMiddle: 0x11,
    rotationDrumBottom: 0x12,
    monthStarted: 0x13,
};
// Tower Responses
// prettier-ignore
exports.TOWER_MESSAGES = {
    TOWER_STATE: { name: "Tower State", value: 0, critical: false },
    INVALID_STATE: { name: "Invalid State", value: 1, critical: true },
    HARDWARE_FAILURE: { name: "Hardware Failure", value: 2, critical: true },
    MECH_JIGGLE_TRIGGERED: { name: "Unjam Jiggle Triggered", value: 3, critical: true },
    MECH_DURATION: { name: "Rotation Duration", value: 4, critical: false },
    MECH_UNEXPECTED_TRIGGER: { name: "Unexpected Trigger", value: 5, critical: true },
    DIFFERENTIAL_READINGS: { name: "Diff Voltage Readings", value: 6, critical: false },
    BATTERY_READING: { name: "Battery Level", value: 7, critical: false },
    CALIBRATION_FINISHED: { name: "Calibration Finished", value: 8, critical: false },
};
// 5% increments - voltages are in millivolts and typical for a 250mA discharge 
// at room temperature which roughly matches a single Energizer EN91
// This is a rough approximation as chemical makeup of batteries have differing
// battery performace (Alkaline vs NiMH vs Li etc).
exports.VOLTAGE_LEVELS = [
    1500, 1390, 1350, 1320, 1295, 1270, 1245, 1225, 1205,
    1180, 1175, 1166, 1150, 1133, 1125, 1107, 1095, 1066, 1033,
    980 // There's an additional 5% until 800mV is reached
];
// Tower Layer Mapping Constants (moved from functions.ts)
// Constants for mapping tower layers to physical locations
exports.TOWER_LAYERS = {
    TOP_RING: 0,
    MIDDLE_RING: 1,
    BOTTOM_RING: 2,
    LEDGE: 3,
    BASE1: 4,
    BASE2: 5,
};
// Ring layers use cardinal directions (position 0 = North)
exports.RING_LIGHT_POSITIONS = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
};
// Ledge and Base layers use ordinal directions (position 0 = North-East)
exports.LEDGE_BASE_LIGHT_POSITIONS = {
    NORTH_EAST: 0,
    SOUTH_EAST: 1,
    SOUTH_WEST: 2,
    NORTH_WEST: 3,
};
// LED Channel Lookup (matches firmware implementation)
// Convert from (layer * 4) + position to LED driver channel (0-23)
exports.LED_CHANNEL_LOOKUP = [
    // Layer 0: Top Ring (C0 R0, C0 R3, C0 R2, C0 R1)
    0, 3, 2, 1,
    // Layer 1: Middle Ring (C1 R3, C1 R2, C1 R1, C1 R0) 
    7, 6, 5, 4,
    // Layer 2: Bottom Ring (C2 R2, C2 R1, C2 R0, C2 R3)
    10, 9, 8, 11,
    // Layer 3: Ledge (LEDGE R4, LEDGE R5, LEDGE R6, LEDGE R7)
    12, 13, 14, 15,
    // Layer 4: Base1 (BASE1 R4, BASE1 R5, BASE1 R6, BASE1 R7)
    16, 17, 18, 19,
    // Layer 5: Base2 (BASE2 R4, BASE2 R5, BASE2 R6, BASE2 R7) 
    20, 21, 22, 23,
];
// Updated reverse mapping for the corrected layer architecture
exports.LAYER_TO_POSITION = {
    [exports.TOWER_LAYERS.TOP_RING]: 'TOP_RING',
    [exports.TOWER_LAYERS.MIDDLE_RING]: 'MIDDLE_RING',
    [exports.TOWER_LAYERS.BOTTOM_RING]: 'BOTTOM_RING',
    [exports.TOWER_LAYERS.LEDGE]: 'LEDGE',
    [exports.TOWER_LAYERS.BASE1]: 'BASE1',
    [exports.TOWER_LAYERS.BASE2]: 'BASE2'
};
exports.LIGHT_INDEX_TO_DIRECTION = {
    [exports.RING_LIGHT_POSITIONS.NORTH]: 'NORTH',
    [exports.RING_LIGHT_POSITIONS.EAST]: 'EAST',
    [exports.RING_LIGHT_POSITIONS.SOUTH]: 'SOUTH',
    [exports.RING_LIGHT_POSITIONS.WEST]: 'WEST'
};
exports.STATE_DATA_LENGTH = 19;
// prettier-ignore
exports.TOWER_AUDIO_LIBRARY = {
    Ashstrider: { name: "Ashstrider", value: 0x01, category: "Adversary" },
    BaneofOmens: { name: "Bane of Omens", value: 0x02, category: "Adversary" },
    EmpressofShades: { name: "Empress of Shades", value: 0x03, category: "Adversary" },
    GazeEternal: { name: "Gaze Eternal", value: 0x04, category: "Adversary" },
    Gravemaw: { name: "Gravemaw", value: 0x05, category: "Adversary" },
    IsatheHollow: { name: "Isa the Hollow", value: 0x06, category: "Adversary" },
    LingeringRot: { name: "Lingering Rot", value: 0x07, category: "Adversary" },
    UtukKu: { name: "Utuk'Ku", value: 0x08, category: "Adversary" },
    Gleb: { name: "Gleb", value: 0x09, category: "Ally" },
    Grigor: { name: "Grigor", value: 0x0A, category: "Ally" },
    Hakan: { name: "Hakan", value: 0x0B, category: "Ally" },
    Letha: { name: "Letha", value: 0x0C, category: "Ally" },
    Miras: { name: "Miras", value: 0x0D, category: "Ally" },
    Nimet: { name: "Nimet", value: 0x0E, category: "Ally" },
    Tomas: { name: "Tomas", value: 0x0F, category: "Ally" },
    Vasa: { name: "Vasa", value: 0x10, category: "Ally" },
    Yana: { name: "Yana", value: 0x11, category: "Ally" },
    Zaida: { name: "Zaida", value: 0x12, category: "Ally" },
    ApplyAdvantage01: { name: "Apply Advantage 01", value: 0x13, category: "Battle" },
    ApplyAdvantage02: { name: "Apply Advantage 02", value: 0x14, category: "Battle" },
    ApplyAdvantage03: { name: "Apply Advantage 03", value: 0x15, category: "Battle" },
    ApplyAdvantage04: { name: "Apply Advantage 04", value: 0x16, category: "Battle" },
    ApplyAdvantage05: { name: "Apply Advantage 05", value: 0x17, category: "Battle" },
    MaxAdvantages: { name: "Max Advantages", value: 0x18, category: "Battle" },
    NoAdvantages: { name: "No Advantages", value: 0x19, category: "Battle" },
    AdversaryEscaped: { name: "Adversary Escaped", value: 0x1A, category: "Battle" },
    BattleButton: { name: "Battle Button", value: 0x1B, category: "Battle" },
    CardFlip01: { name: "Card Flip 01", value: 0x1C, category: "Battle" },
    CardFlip02: { name: "Card Flip 02", value: 0x1D, category: "Battle" },
    CardFlip03: { name: "Card Flip 03", value: 0x1E, category: "Battle" },
    CardFlipPaper01: { name: "Card Flip Paper 01", value: 0x1F, category: "Battle" },
    CardFlipPaper02: { name: "Card Flip Paper 02", value: 0x20, category: "Battle" },
    CardFlipPaper03: { name: "Card Flip Paper 03", value: 0x21, category: "Battle" },
    CardSelect01: { name: "Card Select 01", value: 0x22, category: "Battle" },
    CardSelect02: { name: "Card Select 02", value: 0x23, category: "Battle" },
    CardSelect03: { name: "Card Select 03", value: 0x24, category: "Battle" },
    BattleStart: { name: "Battle Start", value: 0x25, category: "Battle" },
    BattleVictory: { name: "Battle Victory", value: 0x26, category: "Battle" },
    ButtonHoldPressCombo: { name: "Button Hold Press Combo", value: 0x27, category: "Battle" },
    ButtonHold: { name: "Button Hold", value: 0x28, category: "Battle" },
    ButtonPress: { name: "Button Press", value: 0x29, category: "Battle" },
    ClassicAdvantageApplied: { name: "8-bit Advantage", value: 0x2A, category: "Classic" },
    ClassicAttackTower: { name: "8-bit Attack Tower", value: 0x2B, category: "Classic" },
    ClassicBazaar: { name: "8-bit Bazaar", value: 0x2C, category: "Classic" },
    ClassicConfirmation: { name: "8-bit Confirmation", value: 0x2D, category: "Classic" },
    ClassicDragons: { name: "8-bit Dragons", value: 0x2E, category: "Classic" },
    ClassicQuestFailed: { name: "8-bit Quest Failed", value: 0x2F, category: "Classic" },
    ClassicRetreat: { name: "8-bit Retreat", value: 0x30, category: "Classic" },
    ClassicStartMonth: { name: "8-bit Start Month", value: 0x31, category: "Classic" },
    ClassicStartDungeon: { name: "8-bit Start Dungeon", value: 0x32, category: "Classic" },
    ClassicTowerLost: { name: "8-bit Tower Lost", value: 0x33, category: "Classic" },
    ClassicUnsure: { name: "8-bit Unsure", value: 0x34, category: "Classic" },
    DungeonAdvantage01: { name: "Dungeon Advantage 01", value: 0x35, category: "Dungeon" },
    DungeonAdvantage02: { name: "Dungeon Advantage 02", value: 0x36, category: "Dungeon" },
    DungeonButton: { name: "Dungeon Button", value: 0x37, category: "Dungeon" },
    DungeonFootsteps: { name: "Dungeon Footsteps", value: 0x38, category: "Dungeon" },
    DungeonCaves: { name: "Dungeon Caves", value: 0x39, category: "Dungeon" },
    DungeonComplete: { name: "Dungeon Complete", value: 0x3A, category: "Dungeon" },
    DungeonEncampment: { name: "Dungeon Encampment", value: 0x3B, category: "Dungeon" },
    DungeonEscape: { name: "Dungeon Escape", value: 0x3C, category: "Dungeon" },
    DungeonFortress: { name: "Dungeon Fortress", value: 0x3D, category: "Dungeon" },
    DungeonRuins: { name: "Dungeon Ruins", value: 0x3E, category: "Dungeon" },
    DungeonShrine: { name: "Dungeon Shrine", value: 0x3F, category: "Dungeon" },
    DungeonTomb: { name: "Dungeon Tomb", value: 0x40, category: "Dungeon" },
    FoeEvent: { name: "Foe Event", value: 0x41, category: "Foe" },
    FoeSpawn: { name: "Foe Spawn", value: 0x42, category: "Foe" },
    Brigands: { name: "Brigands", value: 0x43, category: "Foe" },
    ClanofNeuri: { name: "Clan of Neuri", value: 0x44, category: "Foe" },
    Dragons: { name: "Dragons", value: 0x45, category: "Foe" },
    Lemures: { name: "Lemures", value: 0x46, category: "Foe" },
    LeveledUp: { name: "Leveled Up", value: 0x47, category: "Foe" },
    Mormos: { name: "Mormos", value: 0x48, category: "Foe" },
    Oreks: { name: "Oreks", value: 0x49, category: "Foe" },
    ShadowWolves: { name: "Shadow Wolves", value: 0x4A, category: "Foe" },
    SpineFiends: { name: "Spine Fiends", value: 0x4B, category: "Foe" },
    Strigas: { name: "Strigas", value: 0x4C, category: "Foe" },
    Titans: { name: "Titans", value: 0x4D, category: "Foe" },
    FrostTrolls: { name: "Frost Trolls", value: 0x4E, category: "Foe" },
    WidowmadeSpiders: { name: "Widowmade Spiders", value: 0x4F, category: "Foe" },
    AshstriderSpawn: { name: "Ashstrider Spawn", value: 0x50, category: "Spawn" },
    BaneofOmensSpawn: { name: "Bane of Omens Spawn", value: 0x51, category: "Spawn" },
    EmpressofShadesSpawn: { name: "Empress of Shades Spawn", value: 0x52, category: "Spawn" },
    GazeEternalSpawn: { name: "Gaze Eternal Spawn", value: 0x53, category: "Spawn" },
    GravemawSpawn: { name: "Gravemaw Spawn", value: 0x54, category: "Spawn" },
    IsatheHollowSpawn: { name: "Isa the Hollow Spawn", value: 0x55, category: "Spawn" },
    LingeringRotSpawn: { name: "Lingering Rot Spawn", value: 0x56, category: "Spawn" },
    UtukKuSpawn: { name: "Utuk'Ku Spawn", value: 0x57, category: "Spawn" },
    QuestComplete: { name: "Quest Complete", value: 0x58, category: "Quest" },
    TowerAllGlyphs: { name: "Tower All Glyphs", value: 0x59, category: "Glyph" },
    TowerAngry1: { name: "Tower Angry 1", value: 0x5A, category: "Glyph" },
    TowerAngry2: { name: "Tower Angry 2", value: 0x5B, category: "Glyph" },
    TowerAngry3: { name: "Tower Angry 3", value: 0x5C, category: "Glyph" },
    TowerAngry4: { name: "Tower Angry 4", value: 0x5D, category: "Glyph" },
    TowerConnected: { name: "Tower Connected", value: 0x5E, category: "State" },
    GameStart: { name: "Game Start", value: 0x5F, category: "State" },
    TowerGloat1: { name: "Tower Gloat 1", value: 0x60, category: "State" },
    TowerGloat2: { name: "Tower Gloat 2", value: 0x61, category: "State" },
    TowerGloat3: { name: "Tower Gloat 3", value: 0x62, category: "State" },
    TowerGlyph: { name: "Tower Glyph", value: 0x63, category: "State" },
    TowerIdle1: { name: "Tower Idle 1", value: 0x64, category: "State" },
    TowerIdle2: { name: "Tower Idle 2", value: 0x65, category: "State" },
    TowerIdle3: { name: "Tower Idle 3", value: 0x66, category: "State" },
    TowerIdle4: { name: "Tower Idle 4", value: 0x67, category: "State" },
    TowerIdle5: { name: "Tower Idle 5", value: 0x68, category: "Unlisted" },
    TowerDisconnected: { name: "Tower Disconnect", value: 0x69, category: "State" },
    MonthEnded: { name: "Month Ended", value: 0x6A, category: "State" },
    MonthStarted: { name: "Month Started", value: 0x6B, category: "State" },
    QuestFailed: { name: "Quest Failed", value: 0x6C, category: "Quest" },
    RotateExit: { name: "Rotate Exit", value: 0x6D, category: "Seals" },
    RotateLoop: { name: "Rotate Loop", value: 0x6E, category: "Seals" },
    RotateStart: { name: "Rotate Start", value: 0x6F, category: "Seals" },
    TowerSeal: { name: "Tower Seal", value: 0x70, category: "Seals" },
    TowerSkullDropped: { name: "Tower Skull Dropped", value: 0x71, category: "State" },
};
// Volume level descriptions (firmware: 0=loudest, 1=medium, 2=quiet, 3=mute)
exports.VOLUME_DESCRIPTIONS = {
    0: 'Loud',
    1: 'Medium',
    2: 'Quiet',
    3: 'Mute'
};
// Volume level icons
exports.VOLUME_ICONS = {
    0: '🔊',
    1: '🔉',
    2: '🔈',
    3: '🔇' // Mute - muted speaker
};
//# sourceMappingURL=udtConstants.js.map