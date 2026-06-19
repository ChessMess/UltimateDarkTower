/**
 * deviceInfo — the BLE Device Information Service (DIS, 0x180A) identity the
 * tower emulator presents to the official companion app.
 *
 * Why this matters: the official app reads the DIS **firmware revision** to
 * decide whether the tower needs a firmware update. Without a DIS it stalls on
 * the "checking firmware" screen and never proceeds. So a standalone tower emulator
 * must expose a DIS whose firmware revision the app accepts as "up to date"
 * (otherwise the app may try to flash the tower emulator).
 *
 * Platform note: macOS CoreBluetooth blocks standard Bluetooth SIG UUIDs (incl.
 * 0x180A) in peripheral mode, so the DIS can only be exposed on non-macOS hosts
 * (Linux/BlueZ — e.g. a Raspberry Pi — or Windows). See
 * docs/MACOS_BLE_PERIPHERAL_LIMITATION.md.
 *
 * This module is intentionally **BLE-free** (no `@stoprocent/bleno` import) so the
 * resolve/gating logic can be unit-tested without Bluetooth.
 */

/** The five DIS fields the companion app reads after connecting. */
export interface DeviceInformation {
  manufacturerName: string;
  modelNumber: string;
  hardwareRevision: string;
  firmwareRevision: string;
  softwareRevision: string;
}

/**
 * Default DIS identity, captured from a real Return to Dark Tower via BLE
 * sniffing. The firmware revision is the value the app checks; override it (e.g.
 * via `TOWER_DIS_FIRMWARE_REVISION`) if the app reports the tower as out of date.
 */
export const DEFAULT_DEVICE_INFO: Readonly<DeviceInformation> = Object.freeze({
  manufacturerName: 'Restoration Games LLC',
  modelNumber: 'ReturnToDarkTower',
  hardwareRevision: '1.11',
  firmwareRevision: '79556657694099f3ca293f534b9cc5b55bfeaa31',
  softwareRevision: '1.0.0',
});

/**
 * Merge caller overrides over {@link DEFAULT_DEVICE_INFO}. Undefined/omitted
 * fields fall back to the default, so callers can override just the firmware
 * revision (the field the app gates on) and leave the rest.
 */
export function resolveDeviceInfo(overrides?: Partial<DeviceInformation>): DeviceInformation {
  return {
    manufacturerName: overrides?.manufacturerName ?? DEFAULT_DEVICE_INFO.manufacturerName,
    modelNumber: overrides?.modelNumber ?? DEFAULT_DEVICE_INFO.modelNumber,
    hardwareRevision: overrides?.hardwareRevision ?? DEFAULT_DEVICE_INFO.hardwareRevision,
    firmwareRevision: overrides?.firmwareRevision ?? DEFAULT_DEVICE_INFO.firmwareRevision,
    softwareRevision: overrides?.softwareRevision ?? DEFAULT_DEVICE_INFO.softwareRevision,
  };
}

/**
 * Whether the Device Information Service can be exposed on the given platform.
 * macOS (`'darwin'`) cannot (CoreBluetooth blocks 0x180A in peripheral mode);
 * Linux/BlueZ and Windows can.
 *
 * @param platform - A `process.platform` value (e.g. `'darwin'`, `'linux'`, `'win32'`).
 */
export function shouldExposeDeviceInfoService(platform: string): boolean {
  return platform !== 'darwin';
}
