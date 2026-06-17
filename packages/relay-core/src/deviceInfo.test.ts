/**
 * deviceInfo.test.ts — unit tests for the Device Information Service resolve +
 * platform-gating logic. BLE-free: imports only ./deviceInfo (no bleno).
 */

import {
  DEFAULT_DEVICE_INFO,
  resolveDeviceInfo,
  shouldExposeDeviceInfoService,
} from './deviceInfo';

describe('resolveDeviceInfo()', () => {
  it('returns the defaults when no overrides are given', () => {
    expect(resolveDeviceInfo()).toEqual(DEFAULT_DEVICE_INFO);
    expect(resolveDeviceInfo({})).toEqual(DEFAULT_DEVICE_INFO);
  });

  it('overrides only the provided fields, keeping defaults for the rest', () => {
    const resolved = resolveDeviceInfo({ firmwareRevision: 'deadbeef' });
    expect(resolved.firmwareRevision).toBe('deadbeef');
    expect(resolved.manufacturerName).toBe(DEFAULT_DEVICE_INFO.manufacturerName);
    expect(resolved.modelNumber).toBe(DEFAULT_DEVICE_INFO.modelNumber);
    expect(resolved.hardwareRevision).toBe(DEFAULT_DEVICE_INFO.hardwareRevision);
    expect(resolved.softwareRevision).toBe(DEFAULT_DEVICE_INFO.softwareRevision);
  });

  it('overrides all fields when all are provided', () => {
    const all = {
      manufacturerName: 'M',
      modelNumber: 'Mod',
      hardwareRevision: 'H',
      firmwareRevision: 'F',
      softwareRevision: 'S',
    };
    expect(resolveDeviceInfo(all)).toEqual(all);
  });

  it('ignores undefined override fields (falls back to default)', () => {
    const resolved = resolveDeviceInfo({ firmwareRevision: undefined });
    expect(resolved.firmwareRevision).toBe(DEFAULT_DEVICE_INFO.firmwareRevision);
  });

  it('does not mutate DEFAULT_DEVICE_INFO', () => {
    resolveDeviceInfo({ firmwareRevision: 'x' });
    expect(DEFAULT_DEVICE_INFO.firmwareRevision).toBe('79556657694099f3ca293f534b9cc5b55bfeaa31');
  });
});

describe('shouldExposeDeviceInfoService()', () => {
  it('is false on macOS (CoreBluetooth blocks 0x180A in peripheral mode)', () => {
    expect(shouldExposeDeviceInfoService('darwin')).toBe(false);
  });

  it('is true on Linux (BlueZ — e.g. Raspberry Pi) and Windows', () => {
    expect(shouldExposeDeviceInfoService('linux')).toBe(true);
    expect(shouldExposeDeviceInfoService('win32')).toBe(true);
  });
});
