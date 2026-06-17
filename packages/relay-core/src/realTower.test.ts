/**
 * realTower.test.ts — unit tests for the RealTower source.
 *
 * BLE-free: imports only ./realTower (which imports the UDT adapter factory but
 * never loads @stoprocent/noble at import time) and injects a mock
 * IBluetoothAdapter, so no Bluetooth and no noble are involved.
 */

import { UART_SERVICE_UUID, DIS_SERVICE_UUID, TOWER_DEVICE_NAME, type IBluetoothAdapter } from 'ultimatedarktower';
import { RealTower } from './realTower';
import type { FakeTowerState } from 'ultimatedarktowerrelay-shared';

/** Minimal mock implementing the IBluetoothAdapter surface RealTower uses, plus test controls. */
class MockAdapter {
  connectArgs: { deviceName: string; serviceUuids: string[] } | null = null;
  disconnectCalled = false;
  cleanupCalled = false;
  shouldFailConnect = false;

  private valueCb: ((d: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private availCb: ((a: boolean) => void) | null = null;

  async connect(deviceName: string, serviceUuids: string[]): Promise<void> {
    this.connectArgs = { deviceName, serviceUuids };
    if (this.shouldFailConnect) throw new Error('connect failed');
  }
  async disconnect(): Promise<void> {
    this.disconnectCalled = true;
  }
  async cleanup(): Promise<void> {
    this.cleanupCalled = true;
  }
  onCharacteristicValueChanged(cb: (d: Uint8Array) => void): void {
    this.valueCb = cb;
  }
  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb;
  }
  onBluetoothAvailabilityChanged(cb: (a: boolean) => void): void {
    this.availCb = cb;
  }

  // ── test controls ──
  emitNotification(data: number[]): void {
    this.valueCb?.(new Uint8Array(data));
  }
  emitDisconnect(): void {
    this.disconnectCb?.();
  }
  emitUnavailable(): void {
    this.availCb?.(false);
  }
}

function makeTower(mock: MockAdapter): {
  tower: RealTower;
  commands: Buffer[];
  states: FakeTowerState[];
  connected: string[];
  disconnected: string[];
} {
  const tower = new RealTower({ adapter: mock as unknown as IBluetoothAdapter });
  const commands: Buffer[] = [];
  const states: FakeTowerState[] = [];
  const connected: string[] = [];
  const disconnected: string[] = [];
  tower.on('command', (d) => commands.push(d));
  tower.on('state-change', (s) => states.push(s));
  tower.on('companion-connected', (a) => connected.push(a));
  tower.on('companion-disconnected', (a) => disconnected.push(a));
  return { tower, commands, states, connected, disconnected };
}

describe('RealTower.startAdvertising()', () => {
  it('connects with the tower name + UART/DIS service UUIDs and signals connected', async () => {
    const mock = new MockAdapter();
    const { tower, states, connected } = makeTower(mock);

    await tower.startAdvertising();

    expect(mock.connectArgs).toEqual({
      deviceName: TOWER_DEVICE_NAME,
      serviceUuids: [UART_SERVICE_UUID, DIS_SERVICE_UUID],
    });
    expect(tower.isConnected()).toBe(true);
    expect(states).toContain('connected');
    expect(connected).toEqual([TOWER_DEVICE_NAME]);
  });

  it('relays each tower notification as a command Buffer', async () => {
    const mock = new MockAdapter();
    const { tower, commands } = makeTower(mock);
    await tower.startAdvertising();

    const packet = [0x00, 0x11, 0x00, 0x20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0];
    mock.emitNotification(packet);

    expect(commands).toHaveLength(1);
    expect(Buffer.isBuffer(commands[0])).toBe(true);
    expect(Array.from(commands[0])).toEqual(packet);
  });

  it('ignores short notifications (e.g. 5-byte battery heartbeats), relaying only 20-byte state', async () => {
    const mock = new MockAdapter();
    const { tower, commands } = makeTower(mock);
    await tower.startAdvertising();

    mock.emitNotification([0x07, 0x00, 0x00, 0x0c, 0x10]); // battery heartbeat — dropped
    expect(commands).toHaveLength(0);

    mock.emitNotification(new Array(20).fill(0)); // 20-byte state — relayed
    expect(commands).toHaveLength(1);
  });

  it('emits an error state and rejects when the connection fails', async () => {
    const mock = new MockAdapter();
    mock.shouldFailConnect = true;
    const { tower, states } = makeTower(mock);

    await expect(tower.startAdvertising()).rejects.toThrow(/connect failed/);
    expect(states).toContain('error');
    expect(tower.isConnected()).toBe(false);
  });

  it('is idempotent — a second start while connected is a no-op', async () => {
    const mock = new MockAdapter();
    const { tower } = makeTower(mock);
    await tower.startAdvertising();
    mock.connectArgs = null;
    await tower.startAdvertising();
    expect(mock.connectArgs).toBeNull(); // connect not called again
  });
});

describe('RealTower disconnect handling', () => {
  it('signals companion-disconnected + idle on an unexpected tower disconnect', async () => {
    const mock = new MockAdapter();
    const { tower, states, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    mock.emitDisconnect();

    expect(disconnected).toEqual([TOWER_DEVICE_NAME]);
    expect(states[states.length - 1]).toBe('idle');
    expect(tower.isConnected()).toBe(false);
  });

  it('treats Bluetooth becoming unavailable as a disconnect', async () => {
    const mock = new MockAdapter();
    const { tower, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    mock.emitUnavailable();

    expect(disconnected).toEqual([TOWER_DEVICE_NAME]);
  });
});

describe('RealTower.stopAdvertising()', () => {
  it('disconnects and cleans up the adapter without a spurious pause', async () => {
    const mock = new MockAdapter();
    const { tower, states, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    await tower.stopAdvertising();

    expect(mock.disconnectCalled).toBe(true);
    expect(mock.cleanupCalled).toBe(true);
    expect(states[states.length - 1]).toBe('idle');
    // Intentional stop must NOT emit companion-disconnected (that's for unexpected drops).
    expect(disconnected).toEqual([]);
  });

  it('does not re-emit companion-disconnected if the adapter fires onDisconnect during stop', async () => {
    const mock = new MockAdapter();
    const { tower, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    await tower.stopAdvertising();
    mock.emitDisconnect(); // adapter's own disconnect callback after intentional stop

    expect(disconnected).toEqual([]);
  });
});
