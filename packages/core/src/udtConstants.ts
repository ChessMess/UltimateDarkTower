// Nordic Semicondutor's UART/Serial IDs for Bluetooth LE
export const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const UART_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const UART_RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const TOWER_DEVICE_NAME = 'ReturnToDarkTower';

// Device Information Service (DIS) UUIDs
export const DIS_SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb';
export const DIS_MANUFACTURER_NAME_UUID = '00002a29-0000-1000-8000-00805f9b34fb';
export const DIS_MODEL_NUMBER_UUID = '00002a24-0000-1000-8000-00805f9b34fb';
export const DIS_SERIAL_NUMBER_UUID = '00002a25-0000-1000-8000-00805f9b34fb';
export const DIS_HARDWARE_REVISION_UUID = '00002a27-0000-1000-8000-00805f9b34fb';
export const DIS_FIRMWARE_REVISION_UUID = '00002a26-0000-1000-8000-00805f9b34fb';
export const DIS_SOFTWARE_REVISION_UUID = '00002a28-0000-1000-8000-00805f9b34fb';
export const DIS_SYSTEM_ID_UUID = '00002a23-0000-1000-8000-00805f9b34fb';
export const DIS_IEEE_REGULATORY_UUID = '00002a2a-0000-1000-8000-00805f9b34fb';
export const DIS_PNP_ID_UUID = '00002a50-0000-1000-8000-00805f9b34fb';
export type CommandPacket = Uint8Array;

// Tower command packet structure constants
export const TOWER_COMMAND_PACKET_SIZE = 20;
export const TOWER_STATE_DATA_SIZE = 19;
export const TOWER_COMMAND_HEADER_SIZE = 1;
export const TOWER_STATE_RESPONSE_MIN_LENGTH = 20;
export const TOWER_STATE_DATA_OFFSET = 1;
export const TOWER_COMMAND_TYPE_TOWER_STATE = 0x00;

// Connection and monitoring constants
export const DEFAULT_CONNECTION_MONITORING_FREQUENCY = 2000; // milliseconds
export const DEFAULT_CONNECTION_MONITORING_TIMEOUT = 30000; // milliseconds
export const DEFAULT_BATTERY_HEARTBEAT_TIMEOUT = 3000; // milliseconds
export const BATTERY_STATUS_FREQUENCY = 200; // Tower sends battery status every ~200ms

// Default retry settings
export const DEFAULT_RETRY_SEND_COMMAND_MAX = 5;

// Tower geometry constants
export const TOWER_SIDES_COUNT = 4; // north, east, south, west

// tower commands
export const TOWER_COMMANDS = {
  towerState: 0, // not a sendable command
  doorReset: 1,
  unjamDrums: 2,
  resetCounter: 3,
  calibration: 4,
  overwriteDrumStates: 5,
  // go no further!
};

// tower commands enum
export const TC = {
  STATE: 'TOWER_STATE',
  INVALID_STATE: 'INVALID_STATE',
  FAILURE: 'HARDWARE_FAILURE',
  JIGGLE: 'MECH_JIGGLE_TRIGGERED',
  UNEXPECTED: 'MECH_UNEXPECTED_TRIGGER',
  DURATION: 'MECH_DURATION',
  DIFFERENTIAL: 'DIFFERENTIAL_READINGS',
  CALIBRATION: 'CALIBRATION_FINISHED',
  BATTERY: 'BATTERY_READING',
};

export const DRUM_PACKETS = {
  topMiddle: 1,
  bottom: 2,
};

export const AUDIO_COMMAND_POS = 15;
export const SKULL_DROP_COUNT_POS = 17;

export type TowerLevels = 'top' | 'middle' | 'bottom';
export type TowerSide = 'north' | 'south' | 'east' | 'west';
export type TowerCorner = 'northeast' | 'southeast' | 'southwest' | 'northwest';

/**
 * Drum sides in clockwise rotation order. The index is the wire position: it is what
 * `TowerState.drum[n].position` holds and what `rotateDrumStateful`'s `position`
 * argument expects. Use `TOWER_SIDES.indexOf(side)` to convert a name to an index and
 * `TOWER_SIDES[index]` to go back.
 *
 * Note this is deliberately not the declaration order of the `TowerSide` union —
 * rotation order is north → east → south → west.
 */
export const TOWER_SIDES = [
  'north',
  'east',
  'south',
  'west',
] as const satisfies readonly TowerSide[];

/**
 * Drum levels in wire order. The index is the drum index: it is what
 * `rotateDrumStateful`'s `drumIndex` argument expects and what indexes
 * `TowerState.drum[]`.
 */
export const TOWER_LEVELS = ['top', 'middle', 'bottom'] as const satisfies readonly TowerLevels[];

export type SealIdentifier = {
  side: TowerSide;
  level: TowerLevels;
};

export type LightTypes = 'base' | 'doorway' | 'ledge';

export type DoorwayLight = { position: TowerSide; level: TowerLevels; style: string };

export type LedgeLight = { position: TowerCorner; style: string };

export type BaseLightLevel = 'top' | 'bottom' | 'a' | 'b';
export type BaseLightPosition = { side: TowerSide; level: BaseLightLevel };
export type BaseLightCornerPosition = { side: TowerCorner; level: BaseLightLevel };
export type BaseLight = { position: BaseLightPosition; style: string };
export type BaseLightCorner = { position: BaseLightCornerPosition; style: string };

export type Lights = {
  doorway?: Array<DoorwayLight>;
  ledge?: Array<LedgeLight>;
  base?: Array<BaseLight>;
};

export type RotateCommand = {
  top: TowerSide;
  middle: TowerSide;
  bottom: TowerSide;
};

// prettier-ignore
export const drumPositionCmds = {
  top: { north: 0b00010000, east: 0b00000010, south: 0b00010100, west: 0b00010110 }, // bits 1-8
  middle: { north: 0b00010000, east: 0b01000000, south: 0b10010000, west: 0b11010000 }, // bits 1-4
  bottom: { north: 0b01000010, east: 0b01001010, south: 0b01010010, west: 0b01011010 },
}

export const LIGHT_EFFECTS: Record<string, number> = {
  off: 0,
  on: 1,
  breathe: 2,
  breatheFast: 3,
  breathe50percent: 4,
  flicker: 5,
};

// Tower Responses
// prettier-ignore
export const TOWER_MESSAGES = {
  TOWER_STATE: { name: "Tower State", value: 0, critical: false },
  INVALID_STATE: { name: "Invalid State", value: 1, critical: true },
  HARDWARE_FAILURE: { name: "Hardware Failure", value: 2, critical: true },
  MECH_JIGGLE_TRIGGERED: { name: "Unjam Jiggle Triggered", value: 3, critical: true },
  MECH_DURATION: { name: "Rotation Duration", value: 4, critical: false },
  MECH_UNEXPECTED_TRIGGER: { name: "Unexpected Trigger", value: 5, critical: true },
  DIFFERENTIAL_READINGS: { name: "Diff Voltage Readings", value: 6, critical: false },
  BATTERY_READING: { name: "Battery Level", value: 7, critical: false },
  CALIBRATION_FINISHED: { name: "Calibration Finished", value: 8, critical: false },
}

// 5% increments - voltages are in millivolts and typical for a 250mA discharge
// at room temperature which roughly matches a single Energizer EN91
// This is a rough approximation as chemical makeup of batteries have differing
// battery performace (Alkaline vs NiMH vs Li etc).
export const VOLTAGE_LEVELS = [
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
  980, // There's an additional 5% until 800mV is reached
];

// Tower Layer Mapping Constants (moved from functions.ts)
// Constants for mapping tower layers to physical locations
export const TOWER_LAYERS = {
  TOP_RING: 0,
  MIDDLE_RING: 1,
  BOTTOM_RING: 2,
  LEDGE: 3,
  BASE1: 4,
  BASE2: 5,
} as const;

// Ring layers use cardinal directions (position 0 = North)
export const RING_LIGHT_POSITIONS = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
} as const;

// Ledge and Base layers use ordinal directions (position 0 = North-East)
export const LEDGE_BASE_LIGHT_POSITIONS = {
  NORTH_EAST: 0,
  SOUTH_EAST: 1,
  SOUTH_WEST: 2,
  NORTH_WEST: 3,
} as const;

// LED Channel Lookup (matches firmware implementation)
// Convert from (layer * 4) + position to LED driver channel (0-23)
export const LED_CHANNEL_LOOKUP = [
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
export const LAYER_TO_POSITION = {
  [TOWER_LAYERS.TOP_RING]: 'TOP_RING',
  [TOWER_LAYERS.MIDDLE_RING]: 'MIDDLE_RING',
  [TOWER_LAYERS.BOTTOM_RING]: 'BOTTOM_RING',
  [TOWER_LAYERS.LEDGE]: 'LEDGE',
  [TOWER_LAYERS.BASE1]: 'BASE1',
  [TOWER_LAYERS.BASE2]: 'BASE2',
} as const;

export const LIGHT_INDEX_TO_DIRECTION = {
  [RING_LIGHT_POSITIONS.NORTH]: 'NORTH',
  [RING_LIGHT_POSITIONS.EAST]: 'EAST',
  [RING_LIGHT_POSITIONS.SOUTH]: 'SOUTH',
  [RING_LIGHT_POSITIONS.WEST]: 'WEST',
} as const;

export const STATE_DATA_LENGTH = 19;

// Volume level descriptions (firmware: 0=loudest, 1=medium, 2=quiet, 3=mute)
export const VOLUME_DESCRIPTIONS = {
  0: 'Loud',
  1: 'Medium',
  2: 'Quiet',
  3: 'Mute',
} as const;

// Volume level icons
export const VOLUME_ICONS = {
  0: '🔊', // Loud - biggest speaker
  1: '🔉', // Medium - medium speaker
  2: '🔈', // Quiet - small speaker
  3: '🔇', // Mute - muted speaker
} as const;
