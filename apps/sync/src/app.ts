/**
 * App — main application controller for the DarkTowerSync client.
 *
 * Wires together the UI, TowerRelay (WebSocket), and UltimateDarkTower
 * (Web Bluetooth) into the top-level event loop.
 */

import { UI } from './ui';
import { TowerRelay } from './towerRelay';
import type { TowerRelayEvent } from './towerRelay';

/**
 * App is the top-level controller.
 *
 * @example
 * ```ts
 * const app = new App();
 * app.init();
 * ```
 */
export class App {
  private readonly ui: UI;
  private relay: TowerRelay | null = null;

  constructor() {
    this.ui = new UI();
  }

  /**
   * Bind UI events and initialize the application.
   *
   * TODO: Persist the last-used host URL in localStorage and pre-fill the input.
   */
  init(): void {
    this.ui.connectBtn.addEventListener('click', () => void this.handleConnectClick());
    this.ui.towerBtn.addEventListener('click', () => void this.handleTowerClick());

    this.ui.log('DarkTowerSync client ready. Enter the host URL and connect.');
    this.ui.setRelayState('disconnected');
    this.ui.setTowerState('disconnected');
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle the "Connect to Host" button click.
   *
   * TODO: Validate URL format before connecting.
   *       Save valid URL to localStorage for next session.
   */
  private async handleConnectClick(): Promise<void> {
    const url = this.ui.hostUrlInput.value.trim();
    const label = this.ui.playerNameInput.value.trim() || undefined;

    if (!url) {
      this.ui.log('Error: enter the host WebSocket URL (e.g., ws://192.168.1.5:8765).');
      return;
    }

    if (this.relay?.isConnected) {
      this.relay.disconnect();
      this.relay = null;
      this.ui.setRelayState('disconnected');
      this.ui.connectBtn.textContent = 'Connect to Host';
      this.ui.log('Disconnected from relay.');
      return;
    }

    this.ui.setRelayState('connecting');
    this.ui.connectBtn.disabled = true;

    this.relay = new TowerRelay({
      label,
      onEvent: (event) => this.handleRelayEvent(event),
    });

    try {
      // TODO: Implement TowerRelay.connect().
      await this.relay.connect(url);
      this.ui.log(`Connecting to ${url}…`);
    } catch (err) {
      this.ui.setRelayState('error');
      this.ui.log(`Connection failed: ${String(err)}`);
      this.ui.connectBtn.disabled = false;
    }
  }

  /**
   * Handle the "Connect to Tower" button click.
   *
   * TODO: Implement using UltimateDarkTower Web Bluetooth API:
   *   1. Instantiate UltimateDarkTower with the WebBluetoothAdapter.
   *   2. Call tower.connect() — this triggers the browser's Bluetooth device picker.
   *   3. On success: update UI state, enable tower command replay in TowerRelay.
   *   4. On error: display error in log and reset state.
   */
  private async handleTowerClick(): Promise<void> {
    this.ui.setTowerState('connecting');
    this.ui.towerBtn.disabled = true;
    this.ui.log('Requesting Bluetooth device — approve in the browser prompt…');

    // TODO: Implement Web Bluetooth tower connection via UltimateDarkTower.
    this.ui.log('Tower connection not yet implemented.');
    this.ui.setTowerState('disconnected');
    this.ui.towerBtn.disabled = false;
  }

  // ---------------------------------------------------------------------------
  // Relay event handling
  // ---------------------------------------------------------------------------

  /**
   * Handle events from {@link TowerRelay} and update the UI accordingly.
   */
  private handleRelayEvent(event: TowerRelayEvent): void {
    switch (event.type) {
      case 'relay:connected':
        this.ui.setRelayState('connected');
        this.ui.connectBtn.textContent = 'Disconnect';
        this.ui.connectBtn.disabled = false;
        this.ui.towerBtn.disabled = false;
        this.ui.log('Connected to relay host.');
        break;

      case 'relay:disconnected':
        this.ui.setRelayState('disconnected');
        this.ui.connectBtn.textContent = 'Connect to Host';
        this.ui.connectBtn.disabled = false;
        this.ui.towerBtn.disabled = true;
        this.ui.log(`Relay disconnected (code ${event.code}).`);
        break;

      case 'relay:error':
        this.ui.setRelayState('error');
        this.ui.connectBtn.disabled = false;
        this.ui.log('Relay connection error.');
        break;

      case 'tower:command':
        this.ui.log(`Command received: [${event.data.slice(0, 4).join(', ')}…]`);
        break;

      case 'sync:state':
        if (event.lastCommand) {
          this.ui.log('Received full tower state sync from host.');
        } else {
          this.ui.log('Connected — no prior tower state to sync.');
        }
        break;
    }
  }
}
