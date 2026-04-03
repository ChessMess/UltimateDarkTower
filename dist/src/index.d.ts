/**
 * UltimateDarkTower - Main entry point
 * Export the main class and constants for public use
 */
export { default as UltimateDarkTower } from './UltimateDarkTower';
export type { UltimateDarkTowerConfig } from './UltimateDarkTower';
export * from './udtConstants';
export { logger, Logger, ConsoleOutput, DOMOutput, BufferOutput, type LogLevel, type LogOutput } from './udtLogger';
export { milliVoltsToPercentage, milliVoltsToPercentageNumber } from './udtHelpers';
export type { IBluetoothAdapter } from './udtBluetoothAdapter';
export { BluetoothError, BluetoothConnectionError, BluetoothDeviceNotFoundError, BluetoothUserCancelledError, BluetoothTimeoutError, } from './udtBluetoothAdapter';
export { BluetoothPlatform, BluetoothAdapterFactory } from './udtBluetoothAdapterFactory';
export type { TowerState, Light, Layer, Drum, Audio, Beam } from './udtTowerState';
export { rtdt_unpack_state, rtdt_pack_state, isCalibrated } from './udtTowerState';
export { createDefaultTowerState, parseDifferentialReadings, type ParsedDifferentialReadings } from './udtHelpers';
export type { TowerResponseConfig } from './udtTowerResponse';
export type { TowerEventCallbacks, DeviceInformation, ConnectionStatus } from './udtBleConnection';
export { decodeSeed, validateSeed, compareSeedsRaw, dumpSeedBits, extractBits, seedGroupToNumber } from './udtSeedDecoder';
export type { DecodedSeed, DecodedField, SeedComparison, BitDiff, BitDump, Confidence } from './udtSeedDecoder';
export { BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME, BOARD_GROUPINGS, } from './udtGameBoard';
export type { TerrainType, BuildingType, BoardKingdom, BoardGrouping, BoardLocation } from './udtGameBoard';
import UltimateDarkTower from './UltimateDarkTower';
export default UltimateDarkTower;
