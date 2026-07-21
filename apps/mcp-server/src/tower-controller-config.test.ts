/**
 * tower-controller-config.test.ts — the dependency-injection seam.
 *
 * TowerController used to build its own UltimateDarkTower from TOWER_PLATFORM with no way in, so an
 * embedder/test could only mock the whole `ultimatedarktower` module. getInstance now accepts a
 * config whose `towerConfig` is forwarded verbatim to the tower constructor, so an injected
 * `{ adapter }` (e.g. MockBluetoothAdapter) reaches the real driver. These tests pin that seam.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Records the config passed to each `new UltimateDarkTower(...)`.
const constructedWith: unknown[] = [];

vi.mock('ultimatedarktower', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ultimatedarktower')>();
  class FakeTower {
    constructor(config?: unknown) {
      constructedWith.push(config);
    }
    set onTowerConnect(_fn: () => void) {}
    set onTowerDisconnect(_fn: () => void) {}
    set onCalibrationComplete(_fn: () => void) {}
    set onSkullDrop(_fn: (n: number) => void) {}
    set onBatteryLevelNotify(_fn: (n: number) => void) {}
    set onTowerStateUpdate(_fn: unknown) {}
    setLoggerOutputs() {}
  }
  return { ...actual, default: FakeTower, UltimateDarkTower: FakeTower };
});

async function freshController(config?: { towerConfig?: unknown }) {
  vi.resetModules();
  const mod = await import('./tower-controller.js');
  return mod.TowerController.getInstance(config as never);
}

describe('TowerController injection seam', () => {
  beforeEach(() => {
    constructedWith.length = 0;
  });

  it('forwards an injected towerConfig (e.g. { adapter }) to the UltimateDarkTower constructor', async () => {
    const adapter = { marker: 'mock-adapter' };
    const controller = await freshController({ towerConfig: { adapter } });
    controller.setLoggerOutputs([]); // triggers the lazy ensureTower()
    expect(constructedWith).toEqual([{ adapter }]);
  });

  it('falls back to the TOWER_PLATFORM env default when no towerConfig is given', async () => {
    const prev = process.env.TOWER_PLATFORM;
    process.env.TOWER_PLATFORM = 'node';
    try {
      const controller = await freshController();
      controller.setLoggerOutputs([]);
      expect(constructedWith).toHaveLength(1);
      expect(constructedWith[0]).toHaveProperty('platform');
    } finally {
      if (prev === undefined) delete process.env.TOWER_PLATFORM;
      else process.env.TOWER_PLATFORM = prev;
    }
  });

  it('exposes the rolling log buffer via getBuffer()/getBufferSize()', async () => {
    const controller = await freshController();
    expect(Array.isArray(controller.getBuffer())).toBe(true);
    expect(controller.getBufferSize()).toBe(0);
  });
});
