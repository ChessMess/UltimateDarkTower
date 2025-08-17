export declare const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export declare const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export declare const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
export declare const TOWER_DEVICE_NAME = "ReturnToDarkTower";
export declare const DIS_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
export declare const DIS_MANUFACTURER_NAME_UUID = "00002a29-0000-1000-8000-00805f9b34fb";
export declare const DIS_MODEL_NUMBER_UUID = "00002a24-0000-1000-8000-00805f9b34fb";
export declare const DIS_SERIAL_NUMBER_UUID = "00002a25-0000-1000-8000-00805f9b34fb";
export declare const DIS_HARDWARE_REVISION_UUID = "00002a27-0000-1000-8000-00805f9b34fb";
export declare const DIS_FIRMWARE_REVISION_UUID = "00002a26-0000-1000-8000-00805f9b34fb";
export declare const DIS_SOFTWARE_REVISION_UUID = "00002a28-0000-1000-8000-00805f9b34fb";
export declare const DIS_SYSTEM_ID_UUID = "00002a23-0000-1000-8000-00805f9b34fb";
export declare const DIS_IEEE_REGULATORY_UUID = "00002a2a-0000-1000-8000-00805f9b34fb";
export declare const DIS_PNP_ID_UUID = "00002a50-0000-1000-8000-00805f9b34fb";
export type CommandPacket = Uint8Array;
export declare const TOWER_COMMAND_PACKET_SIZE = 20;
export declare const TOWER_STATE_DATA_SIZE = 19;
export declare const TOWER_COMMAND_HEADER_SIZE = 1;
export declare const TOWER_STATE_RESPONSE_MIN_LENGTH = 20;
export declare const TOWER_STATE_DATA_OFFSET = 1;
export declare const TOWER_COMMAND_TYPE_TOWER_STATE = 0;
export declare const DEFAULT_CONNECTION_MONITORING_FREQUENCY = 2000;
export declare const DEFAULT_CONNECTION_MONITORING_TIMEOUT = 30000;
export declare const DEFAULT_BATTERY_HEARTBEAT_TIMEOUT = 3000;
export declare const BATTERY_STATUS_FREQUENCY = 200;
export declare const DEFAULT_RETRY_SEND_COMMAND_MAX = 5;
export declare const TOWER_SIDES_COUNT = 4;
export declare const TOWER_COMMANDS: {
    towerState: number;
    doorReset: number;
    unjamDrums: number;
    resetCounter: number;
    calibration: number;
    overwriteDrumStates: number;
};
export declare const TC: {
    STATE: string;
    INVALID_STATE: string;
    FAILURE: string;
    JIGGLE: string;
    UNEXPECTED: string;
    DURATION: string;
    DIFFERENTIAL: string;
    CALIBRATION: string;
    BATTERY: string;
};
export declare const DRUM_PACKETS: {
    topMiddle: number;
    bottom: number;
};
export type Glyphs = "cleanse" | "quest" | "battle" | "banner" | "reinforce";
export declare const GLYPHS: {
    cleanse: {
        name: string;
        level: string;
        side: string;
    };
    quest: {
        name: string;
        level: string;
        side: string;
    };
    battle: {
        name: string;
        level: string;
        side: string;
    };
    banner: {
        name: string;
        level: string;
        side: string;
    };
    reinforce: {
        name: string;
        level: string;
        side: string;
    };
};
export declare const AUDIO_COMMAND_POS = 15;
export declare const SKULL_DROP_COUNT_POS = 17;
export type TowerLevels = "top" | "middle" | "bottom";
export type TowerSide = "north" | "south" | "east" | "west";
export type TowerCorner = "northeast" | "southeast" | "southwest" | "northwest";
export type SealIdentifier = {
    side: TowerSide;
    level: TowerLevels;
};
export type LightTypes = "base" | "doorway" | "ledge";
export type DoorwayLight = {
    position: TowerSide;
    level: TowerLevels;
    style: string;
};
export type LedgeLight = {
    position: TowerCorner;
    style: string;
};
export type BaseLightLevel = "top" | "bottom" | "a" | "b";
export type BaseLightPosition = {
    side: TowerSide;
    level: BaseLightLevel;
};
export type BaseLightCornerPosition = {
    side: TowerCorner;
    level: BaseLightLevel;
};
export type BaseLight = {
    position: BaseLightPosition;
    style: string;
};
export type BaseLightCorner = {
    position: BaseLightCornerPosition;
    style: string;
};
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
export declare const drumPositionCmds: {
    top: {
        north: number;
        east: number;
        south: number;
        west: number;
    };
    middle: {
        north: number;
        east: number;
        south: number;
        west: number;
    };
    bottom: {
        north: number;
        east: number;
        south: number;
        west: number;
    };
};
export declare const LIGHT_EFFECTS: {
    off: number;
    on: number;
    breathe: number;
    breatheFast: number;
    breathe50percent: number;
    flicker: number;
};
export declare const TOWER_LIGHT_SEQUENCES: {
    twinkle: number;
    flareThenFade: number;
    flareThenFadeBase: number;
    flareThenFlicker: number;
    angryStrobe01: number;
    angryStrobe02: number;
    angryStrobe03: number;
    gloat01: number;
    gloat02: number;
    gloat03: number;
    defeat: number;
    victory: number;
    dungeonIdle: number;
    sealReveal: number;
    rotationAllDrums: number;
    rotationDrumTop: number;
    rotationDrumMiddle: number;
    rotationDrumBottom: number;
    monthStarted: number;
};
export type SoundCategory = "Adversary" | "Ally" | "Battle" | "Classic" | "Unlisted" | "Dungeon" | "Foe" | "Spawn" | "Quest" | "Glyph" | "State" | "Seals";
export declare const TOWER_MESSAGES: {
    TOWER_STATE: {
        name: string;
        value: number;
        critical: boolean;
    };
    INVALID_STATE: {
        name: string;
        value: number;
        critical: boolean;
    };
    HARDWARE_FAILURE: {
        name: string;
        value: number;
        critical: boolean;
    };
    MECH_JIGGLE_TRIGGERED: {
        name: string;
        value: number;
        critical: boolean;
    };
    MECH_DURATION: {
        name: string;
        value: number;
        critical: boolean;
    };
    MECH_UNEXPECTED_TRIGGER: {
        name: string;
        value: number;
        critical: boolean;
    };
    DIFFERENTIAL_READINGS: {
        name: string;
        value: number;
        critical: boolean;
    };
    BATTERY_READING: {
        name: string;
        value: number;
        critical: boolean;
    };
    CALIBRATION_FINISHED: {
        name: string;
        value: number;
        critical: boolean;
    };
};
export declare const VOLTAGE_LEVELS: number[];
export declare const TOWER_LAYERS: {
    readonly TOP_RING: 0;
    readonly MIDDLE_RING: 1;
    readonly BOTTOM_RING: 2;
    readonly LEDGE: 3;
    readonly BASE1: 4;
    readonly BASE2: 5;
};
export declare const RING_LIGHT_POSITIONS: {
    readonly NORTH: 0;
    readonly EAST: 1;
    readonly SOUTH: 2;
    readonly WEST: 3;
};
export declare const LEDGE_BASE_LIGHT_POSITIONS: {
    readonly NORTH_EAST: 0;
    readonly SOUTH_EAST: 1;
    readonly SOUTH_WEST: 2;
    readonly NORTH_WEST: 3;
};
export declare const LED_CHANNEL_LOOKUP: number[];
export declare const LAYER_TO_POSITION: {
    readonly 0: "TOP_RING";
    readonly 1: "MIDDLE_RING";
    readonly 2: "BOTTOM_RING";
    readonly 3: "LEDGE";
    readonly 4: "BASE1";
    readonly 5: "BASE2";
};
export declare const LIGHT_INDEX_TO_DIRECTION: {
    readonly 0: "NORTH";
    readonly 1: "EAST";
    readonly 2: "SOUTH";
    readonly 3: "WEST";
};
export declare const STATE_DATA_LENGTH = 19;
export type AudioLibrary = {
    [name: string]: {
        name: string;
        value: number;
        category: SoundCategory;
    };
};
export declare const TOWER_AUDIO_LIBRARY: AudioLibrary;
export declare const VOLUME_DESCRIPTIONS: {
    readonly 0: "Loud";
    readonly 1: "Medium";
    readonly 2: "Quiet";
    readonly 3: "Mute";
};
export declare const VOLUME_ICONS: {
    readonly 0: "🔊";
    readonly 1: "🔉";
    readonly 2: "🔈";
    readonly 3: "🔇";
};
