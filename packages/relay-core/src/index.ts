/**
 * ultimatedarktowerrelay-core
 *
 * Headless relay engine. Re-exports the core classes so they can be consumed
 * as a library (by the CLI daemon and, later, the Electron main process),
 * mirroring how Sync's host package re-exports its classes.
 */

export { FakeTower } from './fakeTower';
export { RelayServer } from './relayServer';
export { HostLogger, pruneOldLogs } from './logger';
export {
  CommandParser,
  buildSkullDropPacket,
  TOWER_COMMAND_LENGTH,
  TOWER_STATE_NOTIFICATION_TYPE,
} from './commandParser';
export { ObserverDisplay } from './observerDisplay';
export { MockTower } from './mockTower';
export { NotificationSynthesizer } from './notificationSynthesizer';
export {
  DEFAULT_DEVICE_INFO,
  resolveDeviceInfo,
  shouldExposeDeviceInfoService,
} from './deviceInfo';

export type { HostLoggerOptions } from './logger';
export type { RelayServerOptions } from './relayServer';
export type { CommandReceivedCallback } from './fakeTower';
export type { ParsedCommand } from './commandParser';
export type { MockTowerOptions } from './mockTower';
export type { TowerSource, TowerSourceEventMap } from './towerSource';
export type { NotificationSink, NotificationSynthesizerOptions } from './notificationSynthesizer';
export type { FakeTowerOptions } from './fakeTower';
export type { DeviceInformation } from './deviceInfo';
