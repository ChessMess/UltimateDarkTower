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
export declare const LIGHT_PACKETS: {
    doorway: {
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
    base: {
        north: {
            a: number;
            b: number;
        };
        east: {
            a: number;
            b: number;
        };
        south: {
            a: number;
            b: number;
        };
        west: {
            a: number;
            b: number;
        };
    };
    ledge: {
        north: number;
        west: number;
        south: number;
        east: number;
    };
    overrides: number;
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
    position: TowerSide;
    style: string;
};
export type BaseLightLevel = "top" | "bottom";
export type BaseLightPosition = {
    side: TowerSide;
    level: BaseLightLevel;
};
export type BaseLight = {
    position: BaseLightPosition;
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
export declare const BASE_LEDGE_LIGHTS_TO_BIT_SHIFT: string[];
export declare const DOORWAY_LIGHTS_TO_BIT_SHIFT: string[];
export declare const LIGHT_EFFECTS: {
    on: number;
    off: number;
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
export type AudioLibrary = {
    [name: string]: {
        name: string;
        value: number;
        category: SoundCategory;
    };
};
export declare const TOWER_AUDIO_LIBRARY: AudioLibrary;
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
