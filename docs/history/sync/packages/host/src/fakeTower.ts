/**
 * FakeTower — BLE peripheral that mimics the Return to Dark Tower hardware.
 *
 * The host advertises a GATT service with the same UUID and characteristic
 * as the real tower. When the official companion app connects and writes a
 * 20-byte command, FakeTower intercepts it and fires {@link onCommandReceived}
 * so the relay server can broadcast it to all remote clients.
 *
 * Implementation uses @stoprocent/bleno for BLE peripheral mode.
 * Reference: UltimateDarkTower library for service/characteristic UUIDs and
 *            the 20-byte packet format.
 *
 * Platform note: Requires Bluetooth hardware with peripheral-mode support.
 * macOS is the primary target. Linux requires BlueZ. Windows is a stretch goal.
 */

/** Callback invoked when a tower command is intercepted. */
export type CommandReceivedCallback = (data: Buffer) => void;

/**
 * FakeTower emulates the Return to Dark Tower BLE peripheral so the official
 * companion app believes it is connected to a real tower.
 *
 * @example
 * ```ts
 * const tower = new FakeTower();
 * tower.onCommandReceived = (data) => relayServer.broadcast(data);
 * await tower.startAdvertising();
 * ```
 */
export class FakeTower {
  /**
   * Callback fired each time the companion app writes a 20-byte command to
   * the tower characteristic. Wire this to {@link RelayServer.broadcast}.
   *
   * TODO: Replace with EventEmitter pattern if multiple listeners are needed.
   */
  onCommandReceived: CommandReceivedCallback | null = null;

  /**
   * Start advertising as the fake tower BLE peripheral.
   *
   * TODO: Implement using @stoprocent/bleno:
   *   1. Import `bleno` from '@stoprocent/bleno'.
   *   2. Listen for `bleno.on('stateChange', ...)` — only advertise when state === 'poweredOn'.
   *   3. Call `bleno.startAdvertising(TOWER_NAME, [TOWER_SERVICE_UUID])`.
   *   4. Listen for `bleno.on('advertisingStart', ...)` and set up the GATT service.
   *   5. Create a BlenoPrimaryService with the tower's service UUID.
   *   6. Create a BluetoothCharacteristic with the command characteristic UUID.
   *   7. In the characteristic's `onWriteRequest` handler, validate the 20-byte length,
   *      call `this.onCommandReceived(data)`, and call `callback(Bleno.Characteristic.RESULT_SUCCESS)`.
   *
   * Reference UUIDs from UltimateDarkTower src/udtConstants.ts:
   *   - Service UUID: (see library source)
   *   - Command characteristic UUID: (see library source)
   */
  async startAdvertising(): Promise<void> {
    // TODO: Implement BLE peripheral advertising.
    throw new Error('FakeTower.startAdvertising() is not yet implemented.');
  }

  /**
   * Stop advertising and disconnect any connected central (companion app).
   *
   * TODO: Call `bleno.stopAdvertising()` and clean up GATT services.
   */
  async stopAdvertising(): Promise<void> {
    // TODO: Implement advertising teardown.
    throw new Error('FakeTower.stopAdvertising() is not yet implemented.');
  }

  /**
   * Returns true if the fake tower is currently advertising and ready to accept
   * a connection from the companion app.
   *
   * TODO: Track bleno state transitions and return accurate state.
   */
  isAdvertising(): boolean {
    // TODO: Return real advertising state.
    return false;
  }

  /**
   * Returns true if the companion app is currently connected to the fake tower.
   *
   * TODO: Track `bleno.on('accept', ...)` / `bleno.on('disconnect', ...)` events.
   */
  isConnected(): boolean {
    // TODO: Return real connection state.
    return false;
  }
}
