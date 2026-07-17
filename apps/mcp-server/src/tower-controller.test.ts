/**
 * tower-controller.test.ts — calibration must always settle.
 *
 * calibrate() awaited a promise resolved only by the onCalibrationComplete callback,
 * with no timeout and no rejection path. If the tower never reports completion — a
 * jammed drum, a BLE drop mid-calibration, both routine for this hardware — the
 * promise never settled and the MCP client hung forever. wrapToolHandler cannot help
 * with that: there is no error to catch.
 *
 * TowerController is a singleton with a private constructor that builds its own
 * UltimateDarkTower from an env var, so there is no injection seam. vi.mock replaces
 * the library wholesale, which is the right level anyway: what is under test is
 * TowerController's own timeout logic, not the driver's.
 *
 * vi.resetModules() + dynamic import gives each test a fresh singleton — the static
 * instance would otherwise leak calibration state across tests.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Captures the callbacks TowerController assigns, so a test can decide whether
// calibration ever "completes".
const towerHandles: { onCalibrationComplete?: () => void } = {};
const calibrateMock = vi.fn().mockResolvedValue(undefined);
const connectMock = vi.fn().mockResolvedValue(undefined);

// tower-controller.ts uses the named import, so that is the binding to replace —
// swapping `default` alone leaves the real driver in place.
vi.mock('ultimatedarktower', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ultimatedarktower')>();
  class FakeTower {
    isConnected = true;
    isCalibrated = false;
    // The real driver marks itself calibrated before notifying, and
    // TowerController.isCalibrated reads the driver's flag — so model both.
    set onCalibrationComplete(fn: () => void) {
      towerHandles.onCalibrationComplete = () => {
        this.isCalibrated = true;
        fn();
      };
    }
    set onTowerConnect(_fn: () => void) {}
    set onTowerDisconnect(_fn: () => void) {}
    set onSkullDrop(_fn: (n: number) => void) {}
    set onBatteryLevelNotify(_fn: (n: number) => void) {}
    set onTowerStateUpdate(_fn: unknown) {}
    setLoggerOutputs() {}
    connect = connectMock;
    calibrate = calibrateMock;
    getDeviceInformation = () => ({});
    getConnectionStatus = () => ({});
    disconnect = vi.fn().mockResolvedValue(undefined);
  }
  return { ...actual, default: FakeTower, UltimateDarkTower: FakeTower };
});

async function freshController() {
  vi.resetModules();
  const mod = await import('./tower-controller.js');
  return mod.TowerController.getInstance();
}

describe('TowerController.calibrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete towerHandles.onCalibrationComplete;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the tower reports calibration complete', async () => {
    const controller = await freshController();
    await controller.connect();

    const done = controller.calibrate();
    // The driver acknowledged the command; now the tower reports completion.
    await vi.waitFor(() => expect(towerHandles.onCalibrationComplete).toBeDefined());
    towerHandles.onCalibrationComplete!();

    await expect(done).resolves.toBeUndefined();
    expect(controller.isCalibrated).toBe(true);
  });

  // Before the fix this never settled, so the test would fail by timing out rather
  // than by assertion.
  it('rejects instead of hanging when completion never arrives', async () => {
    vi.useFakeTimers();
    const controller = await freshController();
    await controller.connect();

    const done = controller.calibrate();
    const assertion = expect(done).rejects.toThrow(/calibrat/i);

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await assertion;
  });

  it('settles both callers when calibrate is called twice concurrently', async () => {
    vi.useFakeTimers();
    const controller = await freshController();
    await controller.connect();

    // The resolver was a single slot: the second call overwrote the first, orphaning it.
    const first = controller.calibrate();
    const second = controller.calibrate();
    const assertions = Promise.all([
      expect(first).rejects.toThrow(),
      expect(second).rejects.toThrow(),
    ]);

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await assertions;
  });
});
