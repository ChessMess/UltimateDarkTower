import { rtdt_unpack_state, createDefaultTowerState, TOWER_STATE_DATA_OFFSET, type TowerState } from 'ultimatedarktower';

/**
 * ObserverDisplay tracks decoded tower state on the host side.
 *
 * Receives raw 20-byte command packets, decodes the state, and provides
 * accessors for current state, command count, and last-received timestamp.
 *
 * @example
 * ```ts
 * const observer = new ObserverDisplay();
 * tower.on('command', (data) => observer.onCommandReceived(data));
 * console.log(observer.getCurrentState());
 * ```
 */
export class ObserverDisplay {
  private currentState: TowerState = createDefaultTowerState();
  private commandCount = 0;
  private lastReceivedAt: Date | null = null;

  /** Process a raw 20-byte tower command packet. */
  onCommandReceived(data: Buffer | Uint8Array | number[]): void {
    const bytes = data instanceof Buffer ? data : Buffer.from(data);
    if (bytes.length !== 20) {
      console.warn(`[ObserverDisplay] Ignoring packet with unexpected length: ${bytes.length}`);
      return;
    }
    // Slice off the 1-byte command header; rtdt_unpack_state expects 19 bytes of state data
    this.currentState = rtdt_unpack_state(new Uint8Array(bytes).subarray(TOWER_STATE_DATA_OFFSET));
    this.commandCount++;
    this.lastReceivedAt = new Date();
  }

  getCurrentState(): TowerState { return this.currentState; }
  getCommandCount(): number { return this.commandCount; }
  getLastReceivedAt(): Date | null { return this.lastReceivedAt; }

  reset(): void {
    this.currentState = createDefaultTowerState();
    this.commandCount = 0;
    this.lastReceivedAt = null;
  }
}
