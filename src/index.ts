/**
 * UltimateDarkTower - Main entry point
 * Export the main class and constants for public use
 */

export { default as UltimateDarkTower } from './UltimateDarkTower';
export type { UltimateDarkTowerConfig } from './UltimateDarkTower';
export * from './udtConstants';
export { logger, Logger, ConsoleOutput, DOMOutput, BufferOutput, type LogLevel, type LogOutput } from './udtLogger';
export { milliVoltsToPercentage, milliVoltsToPercentageNumber } from './udtHelpers';

// Bluetooth adapter interfaces for custom implementations
export type { IBluetoothAdapter } from './udtBluetoothAdapter';
export {
  BluetoothError,
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothUserCancelledError,
  BluetoothTimeoutError,
} from './udtBluetoothAdapter';
export { BluetoothPlatform, BluetoothAdapterFactory } from './udtBluetoothAdapterFactory';

// Tower state types and utilities
export type { TowerState, Light, Layer, Drum, Audio, Beam } from './udtTowerState';
export { rtdt_unpack_state, rtdt_pack_state, isCalibrated } from './udtTowerState';
export { createDefaultTowerState, parseDifferentialReadings, type ParsedDifferentialReadings } from './udtHelpers';

// Tower response types
export type { TowerResponseConfig } from './udtTowerResponse';

// Connection types
export type { TowerEventCallbacks, DeviceInformation, ConnectionStatus } from './udtBleConnection';

// Seed parser
export {
  charToValue, valueToChar, validateSeed, decodeSeed, decodeRngSeed,
  createSeed, encodeSeed, compareSeedsRaw, dumpSeedChars,
  TIER1_FOES, TIER2_FOES, TIER3_FOES, ADVERSARIES, ALLIES, DIFFICULTIES, GAME_SOURCES,
} from './udtSeedParser';
export type {
  Tier1Foe, Tier2Foe, Tier3Foe, Adversary, Ally, Difficulty, GameSource, ExpansionType,
  Confidence, SeedBank, DecodedSeed, SeedConfig, CharDiff, SeedComparison, CharInfo, CharDump,
} from './udtSeedParser';

// System.Random replica (C# PRNG)
export { SystemRandom } from './udtSystemRandom';

// Game board data
export {
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_GROUPINGS,
} from './udtGameBoard';
export type { TerrainType, BuildingType, BoardKingdom, BoardGrouping, BoardLocation } from './udtGameBoard';

// For convenience, also export as default
import UltimateDarkTower from './UltimateDarkTower';
export default UltimateDarkTower;
