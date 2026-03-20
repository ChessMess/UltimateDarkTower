/**
 * FakeTower — BLE peripheral that mimics the Return to Dark Tower hardware.
 *
 * Advertises a Nordic UART GATT service with the same UUID and characteristic
 * as the real tower. When the official companion app connects and writes a
 * 20-byte command to the RX characteristic, FakeTower fires `onCommandReceived`
 * (and emits the 'command' event) so the relay server can broadcast it.
 *
 * Uses @stoprocent/bleno for BLE peripheral mode on macOS/Linux.
 */

import { EventEmitter } from 'events';
import bleno from '@stoprocent/bleno';
// Characteristic and PrimaryService live on Bleno.prototype, not as own enumerable
// properties of the CJS module export. Accessing them via the default import
// (bleno instance) uses prototype-chain lookup, which works correctly at runtime.
const { Characteristic, PrimaryService } = bleno;
import {
  UART_SERVICE_UUID,
  UART_RX_CHARACTERISTIC_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  TOWER_DEVICE_NAME,
} from 'ultimatedarktower';
import type { FakeTowerState } from '@dark-tower-sync/shared';

/** Callback invoked when a tower command is intercepted. */
export type CommandReceivedCallback = (data: Buffer) => void;

interface FakeTowerEventMap {
  'state-change': [state: FakeTowerState];
  'command': [data: Buffer];
  'companion-connected': [address: string];
  'companion-disconnected': [address: string];
}

/**
 * FakeTower emulates the Return to Dark Tower BLE peripheral so the official
 * companion app believes it is connected to a real tower.
 *
 * Events:
 *   'state-change'          — FakeTowerState changed
 *   'command'               — 20-byte command received from companion app
 *   'companion-connected'   — companion app connected via BLE
 *   'companion-disconnected'— companion app disconnected
 *
 * @example
 * ```ts
 * const tower = new FakeTower();
 * tower.on('command', (data) => relayServer.broadcast(data));
 * tower.on('state-change', (state) => console.log('tower state:', state));
 * await tower.startAdvertising();
 * ```
 */
export class FakeTower extends EventEmitter<FakeTowerEventMap> {
  /**
   * Legacy callback — fires on every intercepted command.
   * Prefer listening to the 'command' event for new code.
   */
  onCommandReceived: CommandReceivedCallback | null = null;

  private _state: FakeTowerState = 'idle';

  private setState(state: FakeTowerState): void {
    this._state = state;
    this.emit('state-change', state);
  }

  /**
   * Start advertising as the fake tower BLE peripheral.
   *
   * Waits for Bluetooth to be powered on (up to 10 s), then begins advertising
   * as "ReturnToDarkTower" with the Nordic UART service UUID. Sets up the GATT
   * service with RX (write) and TX (notify) characteristics.
   *
   * Rejects if Bluetooth times out or is unavailable.
   */
  async startAdvertising(): Promise<void> {
    this.setState('advertising');

    // Track companion app connect / disconnect at the adapter level.
    bleno.on('accept', (address: string) => {
      this.setState('connected');
      this.emit('companion-connected', address);
    });

    bleno.on('disconnect', (address: string) => {
      // After disconnect the peripheral keeps advertising automatically.
      this.setState('advertising');
      this.emit('companion-disconnected', address);
    });

    // RX characteristic — companion app WRITES commands here (tower "receives").
    const rxChar = new Characteristic({
      uuid: UART_RX_CHARACTERISTIC_UUID,
      properties: ['write', 'writeWithoutResponse'],
      onWriteRequest: (_handle, data, _offset, _withoutResponse, callback) => {
        this.onCommandReceived?.(data);
        this.emit('command', data);
        callback(Characteristic.RESULT_SUCCESS);
      },
    });

    // TX characteristic — tower sends responses/notifications here.
    // The companion app subscribes to this for tower state feedback.
    const txChar = new Characteristic({
      uuid: UART_TX_CHARACTERISTIC_UUID,
      properties: ['notify'],
      onSubscribe: () => { /* notifications are not yet implemented */ },
      onUnsubscribe: () => { /* notifications are not yet implemented */ },
    });

    const service = new PrimaryService({
      uuid: UART_SERVICE_UUID,
      characteristics: [rxChar, txChar],
    });

    // Will reject after 10 s if BT never becomes poweredOn.
    await bleno.waitForPoweredOnAsync();
    await bleno.startAdvertisingAsync(TOWER_DEVICE_NAME, [UART_SERVICE_UUID]);
    await bleno.setServicesAsync([service]);
  }

  /**
   * Stop advertising and disconnect any connected companion app.
   */
  async stopAdvertising(): Promise<void> {
    bleno.disconnect();
    await bleno.stopAdvertisingAsync();
    this.setState('idle');
  }

  /** Returns true if currently advertising or connected to companion app. */
  isAdvertising(): boolean {
    return this._state === 'advertising' || this._state === 'connected';
  }

  /** Returns true if the companion app is currently connected. */
  isConnected(): boolean {
    return this._state === 'connected';
  }
}
