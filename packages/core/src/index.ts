/**
 * UltimateDarkTower - Main entry point
 * Export the main class and constants for public use
 */

export { default as UltimateDarkTower } from './UltimateDarkTower';
export type { UltimateDarkTowerConfig } from './UltimateDarkTower';
export * from './udtConstants';
export {
  logger,
  Logger,
  ConsoleOutput,
  DOMOutput,
  BufferOutput,
  type LogLevel,
  type LogOutput,
} from './udtLogger';
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
export {
  createDefaultTowerState,
  parseDifferentialReadings,
  type ParsedDifferentialReadings,
} from './udtHelpers';

// Tower response types
export type { TowerResponseConfig } from './udtTowerResponse';

// Connection types
export type { TowerEventCallbacks, DeviceInformation, ConnectionStatus } from './udtBleConnection';

// BLE disconnect diagnostics ("flight recorder") - off by default, see docs/BLE_DIAGNOSTICS.md
export { UdtDiagnosticsRecorder, InMemorySink, bytesToHex } from './udtDiagnostics';
export type {
  DiagnosticsConfig,
  DiagnosticsSink,
  DiagEvent,
  DiagEventKind,
  DisconnectCause,
  IncidentReport,
  BatterySample,
  CommandQueueSnapshot,
} from './udtDiagnostics';
export { IndexedDBSink } from './sinks/IndexedDBSink';

// Game / board reference data — grouped by domain sub-namespaces (heroes, monuments, foes,
// board, content, inventory). e.g. data.heroes.HEROES, data.board.BOARD_LOCATIONS,
// data.content.HEROES (gameplay), data.inventory.expansions. See docs/api/board-data.md.
export * as data from './data';

// Seed encode/decode + RNG subsystem. e.g. seed.decodeSeed(...), seed.TIER1_FOES,
// seed.SystemRandom. See docs/api/seed.md.
export * as seed from './seed';

// For convenience, also export as default
import UltimateDarkTower from './UltimateDarkTower';
export default UltimateDarkTower;
