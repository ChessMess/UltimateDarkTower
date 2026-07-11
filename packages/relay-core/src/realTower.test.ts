/**
 * realTower.test.ts — unit tests for the RealTower source.
 *
 * BLE-free: imports only ./realTower (which imports UDT's UltimateDarkTower class
 * but never constructs it / loads @stoprocent/noble at import time) and injects a
 * mock TowerDriver, so no Bluetooth and no noble are involved. The library's own
 * connection monitoring (GATT health + verified battery heartbeat) is exercised in
 * the UDT repo's tests; here we cover RealTower's reconnect *policy* on top of the
 * library's `onTowerDisconnect` signal.
 *
 * The mock's default `reconnect: false` (via makeTower) keeps plain-behaviour tests
 * free of background timers; the reconnect suites opt in and drive the backoff with
 * Jest fake timers.
 */

import { TOWER_DEVICE_NAME } from 'ultimatedarktower';
import { RealTower, type RealTowerOptions, type TowerDriver } from './realTower';
import type { TowerEmulatorState } from 'ultimatedarktowerrelay-shared';

/** Minimal mock implementing the TowerDriver surface, plus test controls. */
class MockDriver implements TowerDriver {
  onTowerResponse: (response: Uint8Array) => void = () => undefined;
  onTowerDisconnect: () => void = () => undefined;

  connectCount = 0;
  disconnectCalled = false;
  shouldFailConnect = false;
  writes: number[][] = [];

  async connect(): Promise<void> {
    this.connectCount++;
    if (this.shouldFailConnect) throw new Error('connect failed');
  }
  async disconnect(): Promise<void> {
    this.disconnectCalled = true;
  }
  async sendTowerCommandDirect(command: Uint8Array): Promise<void> {
    this.writes.push(Array.from(command));
  }

  // ── test controls ──
  /** Deliver a raw tower notification (as the library's onTowerResponse would). */
  emitResponse(data: number[]): void {
    this.onTowerResponse(new Uint8Array(data));
  }
  /** Fire a library-detected disconnect. */
  emitDisconnect(): void {
    this.onTowerDisconnect();
  }
}

function makeTower(
  mock: MockDriver,
  options: Partial<RealTowerOptions> = {},
): {
  tower: RealTower;
  commands: Buffer[];
  states: TowerEmulatorState[];
  connected: string[];
  disconnected: string[];
} {
  // Default reconnect:false so plain-behaviour tests schedule no timers; reconnect
  // tests pass `reconnect: true` (+ tuned backoff).
  const tower = new RealTower({ driver: mock, reconnect: false, ...options });
  const commands: Buffer[] = [];
  const states: TowerEmulatorState[] = [];
  const connected: string[] = [];
  const disconnected: string[] = [];
  tower.on('command', (d) => commands.push(d));
  tower.on('state-change', (s) => states.push(s));
  tower.on('companion-connected', (a) => connected.push(a));
  tower.on('companion-disconnected', (a) => disconnected.push(a));
  return { tower, commands, states, connected, disconnected };
}

const PACKET20 = [0x00, 0x11, 0x00, 0x20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0];

describe('RealTower.startAdvertising()', () => {
  it('connects via the driver and signals connected', async () => {
    const mock = new MockDriver();
    const { tower, states, connected } = makeTower(mock);

    await tower.startAdvertising();

    expect(mock.connectCount).toBe(1);
    expect(tower.isConnected()).toBe(true);
    expect(states).toContain('connected');
    expect(connected).toEqual([TOWER_DEVICE_NAME]);
  });

  it('relays each 20-byte tower response as a command Buffer', async () => {
    const mock = new MockDriver();
    const { tower, commands } = makeTower(mock);
    await tower.startAdvertising();

    mock.emitResponse(PACKET20);

    expect(commands).toHaveLength(1);
    expect(Buffer.isBuffer(commands[0])).toBe(true);
    expect(Array.from(commands[0])).toEqual(PACKET20);
  });

  it('relays only full 20-byte state, ignoring shorter responses', async () => {
    const mock = new MockDriver();
    const { tower, commands } = makeTower(mock);
    await tower.startAdvertising();

    mock.emitResponse([0x00, 0x01, 0x02]); // short response — dropped
    expect(commands).toHaveLength(0);

    mock.emitResponse(new Array(20).fill(0)); // 20-byte state — relayed
    expect(commands).toHaveLength(1);
  });

  it('emits an error state and rejects when the connection fails (reconnect disabled)', async () => {
    const mock = new MockDriver();
    mock.shouldFailConnect = true;
    const { tower, states } = makeTower(mock); // reconnect:false by default

    await expect(tower.startAdvertising()).rejects.toThrow(/connect failed/);
    expect(states).toContain('error');
    expect(tower.isConnected()).toBe(false);
  });

  it('is idempotent — a second start while connected is a no-op', async () => {
    const mock = new MockDriver();
    const { tower } = makeTower(mock);
    await tower.startAdvertising();
    await tower.startAdvertising();
    expect(mock.connectCount).toBe(1); // connect not called again
  });
});

describe('RealTower disconnect handling (reconnect disabled)', () => {
  it('signals companion-disconnected + idle on a library-detected disconnect', async () => {
    const mock = new MockDriver();
    const { tower, states, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    mock.emitDisconnect();

    expect(disconnected).toEqual([TOWER_DEVICE_NAME]);
    expect(states[states.length - 1]).toBe('idle');
    expect(tower.isConnected()).toBe(false);
  });
});

describe('RealTower.stopAdvertising()', () => {
  it('disconnects the driver without a spurious pause', async () => {
    const mock = new MockDriver();
    const { tower, states, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    await tower.stopAdvertising();

    expect(mock.disconnectCalled).toBe(true);
    expect(states[states.length - 1]).toBe('idle');
    // Intentional stop must NOT emit companion-disconnected (that's for unexpected drops).
    expect(disconnected).toEqual([]);
  });

  it('does not re-emit companion-disconnected if the driver fires onTowerDisconnect during stop', async () => {
    const mock = new MockDriver();
    const { tower, disconnected } = makeTower(mock);
    await tower.startAdvertising();

    await tower.stopAdvertising();
    mock.emitDisconnect(); // a late disconnect signal after intentional stop

    expect(disconnected).toEqual([]);
  });
});

describe('RealTower reconnect resilience (FR-5.3)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reconnects after a drop and signals resumed', async () => {
    const mock = new MockDriver();
    const { tower, connected, disconnected } = makeTower(mock, { reconnect: true, reconnectBaseMs: 1000 });
    await tower.startAdvertising();
    expect(connected).toEqual([TOWER_DEVICE_NAME]);

    mock.emitDisconnect(); // library-detected drop → pause + schedule reconnect
    expect(disconnected).toEqual([TOWER_DEVICE_NAME]);
    expect(tower.isConnected()).toBe(false);

    await jest.advanceTimersByTimeAsync(1000); // reconnect fires + succeeds

    expect(tower.isConnected()).toBe(true);
    expect(connected).toEqual([TOWER_DEVICE_NAME, TOWER_DEVICE_NAME]); // resumed
    expect(mock.connectCount).toBe(2);
    await tower.stopAdvertising();
  });

  it('retries the initial connect in the background instead of rejecting', async () => {
    const mock = new MockDriver();
    mock.shouldFailConnect = true;
    const { tower, connected } = makeTower(mock, { reconnect: true, reconnectBaseMs: 1000 });

    await expect(tower.startAdvertising()).resolves.toBeUndefined(); // does NOT reject
    expect(connected).toEqual([]); // not connected yet
    expect(mock.connectCount).toBe(1);

    mock.shouldFailConnect = false;
    await jest.advanceTimersByTimeAsync(1000); // retry succeeds

    expect(tower.isConnected()).toBe(true);
    expect(connected).toEqual([TOWER_DEVICE_NAME]);
    await tower.stopAdvertising();
  });

  it('cancels a pending reconnect on stopAdvertising', async () => {
    const mock = new MockDriver();
    const { tower } = makeTower(mock, { reconnect: true, reconnectBaseMs: 1000 });
    await tower.startAdvertising();
    expect(mock.connectCount).toBe(1);

    mock.emitDisconnect(); // schedule reconnect at 1000ms
    await tower.stopAdvertising(); // must cancel it

    await jest.advanceTimersByTimeAsync(5000);
    expect(mock.connectCount).toBe(1); // no reconnect attempt fired
  });
});

describe('RealTower.sendToTower() (bridge write-back)', () => {
  it('writes the command verbatim to the tower when connected', async () => {
    const mock = new MockDriver();
    const { tower } = makeTower(mock);
    await tower.startAdvertising();

    await tower.sendToTower(new Uint8Array([1, 2, 3])); // short packet forwarded verbatim
    await tower.sendToTower(new Uint8Array(new Array(20).fill(0)));

    expect(mock.writes).toEqual([[1, 2, 3], new Array(20).fill(0)]);
  });

  it('is a no-op when the tower is not connected', async () => {
    const mock = new MockDriver();
    const { tower } = makeTower(mock);

    await tower.sendToTower(new Uint8Array([9])); // before connect
    expect(mock.writes).toEqual([]);

    await tower.startAdvertising();
    await tower.stopAdvertising();
    await tower.sendToTower(new Uint8Array([9])); // after disconnect
    expect(mock.writes).toEqual([]);
  });
});
