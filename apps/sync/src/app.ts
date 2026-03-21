/**
 * App — main application controller for the DarkTowerSync client.
 *
 * Wires together the UI, TowerRelay (WebSocket), and UltimateDarkTower
 * (Web Bluetooth) into the top-level event loop.
 */

import { UltimateDarkTower, BluetoothUserCancelledError } from 'ultimatedarktower';
import { UI } from './ui';
import { TowerRelay, type TowerRelayEvent } from './towerRelay';

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
  private tower: UltimateDarkTower | null = null;

  constructor() {
    this.ui = new UI();
  }

  /** Bind UI events and initialize the application. */
  init(): void {
    // Restore persisted values.
    const savedUrl = localStorage.getItem('darkTowerSync:hostUrl');
    if (savedUrl) this.ui.hostUrlInput.value = savedUrl;
    const savedName = localStorage.getItem('darkTowerSync:playerName');
    if (savedName) this.ui.playerNameInput.value = savedName;

    this.ui.connectBtn.addEventListener('click', () => void this.handleConnectClick());
    this.ui.towerBtn.addEventListener('click', () => void this.handleTowerClick());

    this.ui.log('DarkTowerSync client ready. Enter the host URL and connect.');
    this.ui.setRelayState('disconnected');
    this.ui.setTowerState('disconnected');
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  /** Handle the "Connect to Host" button click. */
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

    // Validate URL format.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
        this.ui.log('Error: URL must start with ws:// or wss://');
        return;
      }
    } catch {
      this.ui.log('Error: invalid URL format.');
      return;
    }

    // Persist for next session.
    localStorage.setItem('darkTowerSync:hostUrl', url);
    if (label) localStorage.setItem('darkTowerSync:playerName', label);

    this.ui.setRelayState('connecting');
    this.ui.connectBtn.disabled = true;

    this.relay = new TowerRelay({
      label,
      onEvent: (event) => this.handleRelayEvent(event),
    });

    try {
      await this.relay.connect(url);
      this.ui.log(`Connecting to ${url}…`);
    } catch (err) {
      this.ui.setRelayState('error');
      this.ui.log(`Connection failed: ${String(err)}`);
      this.ui.connectBtn.disabled = false;
    }
  }

  /** Handle the "Connect to Tower" button click. */
  private async handleTowerClick(): Promise<void> {
    // Toggle: if already connected, disconnect.
    if (this.tower?.isConnected) {
      await this.tower.disconnect();
      this.tower = null;
      this.ui.setTowerState('disconnected');
      this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
      this.ui.log('Tower disconnected.');
      this.relay?.sendReady(false);
      return;
    }

    this.ui.setTowerState('connecting');
    this.ui.towerBtn.disabled = true;
    this.ui.log('Requesting Bluetooth device — approve in the browser prompt…');

    try {
      const tower = new UltimateDarkTower();

      tower.onTowerDisconnect = () => {
        this.ui.setTowerState('disconnected');
        this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
        this.ui.towerBtn.disabled = false;
        this.ui.log('Tower disconnected unexpectedly.');
        this.tower = null;
        this.relay?.sendReady(false);
      };

      await tower.connect();
      this.tower = tower;

      // Calibrate the tower before marking as ready.
      this.ui.setTowerState('calibrating');
      this.ui.log('Tower connected. Calibrating…');

      tower.onCalibrationComplete = () => {
        this.ui.setTowerState('connected');
        this.ui.towerBtn.textContent = 'Disconnect Tower';
        this.ui.towerBtn.disabled = false;
        this.ui.log('Tower calibrated and ready.');
        this.relay?.sendReady(true);
      };

      await tower.calibrate();
    } catch (err) {
      if (err instanceof BluetoothUserCancelledError) {
        this.ui.log('Bluetooth pairing cancelled.');
        this.ui.setTowerState('disconnected');
      } else {
        this.ui.setTowerState('error');
        this.ui.log(`Tower connection failed: ${String(err)}`);
      }
      this.ui.towerBtn.disabled = false;
    }
  }

  /** Replay a 20-byte command on the local physical tower. */
  private async replayOnTower(data: number[]): Promise<void> {
    if (!this.tower?.isConnected || !this.tower.isCalibrated) return;
    try {
      await this.tower.sendTowerCommandDirect(new Uint8Array(data));
      this.ui.log('Command replayed on tower.');
    } catch (err) {
      this.ui.log(`Tower write failed: ${String(err)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Relay event handling
  // ---------------------------------------------------------------------------

  /** Handle events from {@link TowerRelay} and update the UI accordingly. */
  private handleRelayEvent(event: TowerRelayEvent): void {
    switch (event.type) {
      case 'relay:connected':
        this.ui.setRelayState('connected');
        this.ui.connectBtn.textContent = 'Disconnect';
        this.ui.connectBtn.disabled = false;
        this.ui.towerBtn.disabled = false;
        this.ui.log('Connected to relay host.');
        // If tower is already calibrated, signal readiness immediately.
        if (this.tower?.isConnected && this.tower?.isCalibrated) {
          this.relay?.sendReady(true);
        }
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
        void this.replayOnTower(event.data);
        break;

      case 'sync:state':
        if (event.lastCommand) {
          this.ui.log('Received full tower state sync from host.');
          void this.replayOnTower(event.lastCommand);
        } else {
          this.ui.log('Connected — no prior tower state to sync.');
        }
        break;

      case 'client:connected':
        this.ui.log(`Player joined: ${event.label ?? event.clientId.slice(0, 8)}`);
        break;

      case 'client:disconnected':
        this.ui.log(`Player left: ${event.clientId.slice(0, 8)}`);
        break;

      case 'host:status':
        this.ui.setRelayState('connected', `Connected (${event.status.clientCount} players)`);
        break;
    }
  }
}
