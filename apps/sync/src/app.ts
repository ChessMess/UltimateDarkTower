/**
 * App — main application controller for the DarkTowerSync client.
 *
 * Wires together the UI, TowerRelay (WebSocket), and UltimateDarkTower
 * (Web Bluetooth) into the top-level event loop.
 */

import { UltimateDarkTower, BluetoothUserCancelledError, rtdt_unpack_state, TOWER_STATE_DATA_OFFSET, TOWER_LIGHT_SEQUENCES, LIGHT_EFFECTS, type TowerState, type SealIdentifier, type TowerSide, type TowerLevels } from 'ultimatedarktower';
import { UI } from './ui';
import { TowerRelay, type TowerRelayEvent } from './towerRelay';
import { ClientLogger } from './clientLogger';
import { TowerDisplay } from 'ultimatedarktowerdisplay';

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
  private readonly logger: ClientLogger;
  private readonly isObserver: boolean = new URLSearchParams(window.location.search).has('observer');
  private relay: TowerRelay | null = null;
  private tower: UltimateDarkTower | null = null;
  private towerDisplay: TowerDisplay | null = null;

  /** Tracked broken seals for display. */
  private brokenSeals: SealIdentifier[] = [];

  /** Cached last command bytes for self-healing replay on tower reconnect. */
  private lastCommandBytes: number[] | null = null;

  /** Serializes replayOnTower calls so concurrent BLE writes can't interleave. */
  private replayQueue: Promise<void> = Promise.resolve();

  /** Interval ID for the "Connecting..." dot animation. */
  private connectingAnimationId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ui = new UI();
    this.logger = new ClientLogger();
  }

  /** Bind UI events and initialize the application. */
  init(): void {
    // Restore persisted values.
    const savedUrl = localStorage.getItem('darkTowerSync:hostUrl');
    if (savedUrl) this.ui.hostUrlInput.value = savedUrl;
    const savedName = localStorage.getItem('darkTowerSync:playerName');
    if (savedName) this.ui.playerNameInput.value = savedName;

    // Disable connect button unless the URL looks like a valid ws:// or wss:// URL.
    this.ui.hostUrlInput.addEventListener('input', () => this.validateConnectButton());
    this.validateConnectButton();

    this.ui.connectBtn.addEventListener('click', () => void this.handleConnectClick());
    this.ui.disconnectRelayBtn.addEventListener('click', () => this.handleRelayDisconnect());
    this.ui.towerBtn.addEventListener('click', () => void this.handleTowerClick());
    this.ui.disconnectTowerBtn.addEventListener('click', () => void this.handleTowerDisconnect());
    this.ui.sendLogsBtn.addEventListener('click', () => {
      this.logger.logEvent('event', 'Sent logs to host manually');
      this.logger.sendLogs();
      this.ui.log('Logs sent to host.');
    });
    this.ui.downloadLogsBtn.addEventListener('click', () => {
      this.logger.downloadAsFile();
    });

    // Observer mode: hide tower card, show visualizer section.
    if (this.isObserver) {
      this.ui.towerBtn.closest('.card')?.setAttribute('hidden', '');
      const container = document.getElementById('tower-visualizer');
      if (container) {
        document.getElementById('visualizer-section')?.removeAttribute('hidden');
        this.towerDisplay = new TowerDisplay({
          container,
          onSealClick: (seal) => this.handleSealClick(seal),
        });
      }
      this.ui.log('Observer mode — tower display active. Connect to a host to begin.');
    } else {
      const container = document.getElementById('tower-display');
      if (container) {
        this.towerDisplay = new TowerDisplay({
          container,
          onSealClick: (seal) => this.handleSealClick(seal),
        });
      }
      this.ui.toggleStateBtn.removeAttribute('hidden');
      this.ui.toggleStateBtn.addEventListener('click', () => {
        const section = document.getElementById('state-section');
        if (!section) return;
        const isHidden = section.hasAttribute('hidden');
        if (isHidden) {
          section.removeAttribute('hidden');
          this.ui.toggleStateBtn.textContent = 'Hide Tower State';
        } else {
          section.setAttribute('hidden', '');
          this.ui.toggleStateBtn.textContent = 'Show Tower State';
        }
      });
      this.ui.log('DarkTowerSync client ready. Enter the host URL and connect.');
    }
    this.ui.setRelayState('disconnected');
    this.ui.setTowerState('disconnected');
  }

  // ---------------------------------------------------------------------------
  // URL validation & connect button helpers
  // ---------------------------------------------------------------------------

  /** Enable the connect button only when the URL field contains a valid ws:// or wss:// URL. */
  private validateConnectButton(): void {
    const url = this.ui.hostUrlInput.value.trim();
    try {
      const parsed = new URL(url);
      this.ui.connectBtn.disabled = parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:';
    } catch {
      this.ui.connectBtn.disabled = true;
    }
  }

  /** Start cycling "Connecting.", "Connecting..", "Connecting..." on the connect button. */
  private startConnectingAnimation(): void {
    let dots = 0;
    this.ui.connectBtn.textContent = 'Connecting';
    this.connectingAnimationId = setInterval(() => {
      dots = (dots % 3) + 1;
      this.ui.connectBtn.textContent = 'Connecting' + '.'.repeat(dots);
    }, 500);
  }

  /** Stop the "Connecting..." animation. */
  private stopConnectingAnimation(): void {
    if (this.connectingAnimationId !== null) {
      clearInterval(this.connectingAnimationId);
      this.connectingAnimationId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Seal management
  // ---------------------------------------------------------------------------

  /** Toggle a seal's broken state when clicked in the display. */
  private handleSealClick(seal: SealIdentifier): void {
    const idx = this.brokenSeals.findIndex(s => s.side === seal.side && s.level === seal.level);
    if (idx >= 0) {
      this.brokenSeals.splice(idx, 1);
    } else {
      this.brokenSeals.push(seal);
    }
    this.towerDisplay?.applySeals(this.brokenSeals);
  }

  /** Detect which seal was broken from a sealReveal tower state. */
  private detectBrokenSeal(state: TowerState): SealIdentifier | null {
    const SIDE_BY_INDEX: TowerSide[] = ['north', 'east', 'south', 'west'];
    const LEVEL_BY_LAYER: TowerLevels[] = ['top', 'middle', 'bottom'];
    for (let layer = 0; layer <= 2; layer++) {
      for (let pos = 0; pos < 4; pos++) {
        if (state.layer[layer].light[pos].effect !== LIGHT_EFFECTS.off) {
          return { side: SIDE_BY_INDEX[pos], level: LEVEL_BY_LAYER[layer] };
        }
      }
    }
    return null;
  }

  /** Add a seal to brokenSeals if not already present, and update the display. */
  private markSealBroken(seal: SealIdentifier): void {
    const exists = this.brokenSeals.some(s => s.side === seal.side && s.level === seal.level);
    if (!exists) {
      this.brokenSeals.push(seal);
      this.towerDisplay?.applySeals(this.brokenSeals);
    }
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
    this.startConnectingAnimation();

    this.relay = new TowerRelay({
      label,
      observer: this.isObserver,
      onEvent: (event) => this.handleRelayEvent(event),
    });

    try {
      this.ui.log(`Connecting to ${url}…`);
      await this.relay.connect(url);
    } catch (err) {
      this.stopConnectingAnimation();
      this.relay?.disconnect();
      this.relay = null;
      this.ui.setRelayState('error');
      this.ui.log(`Connection failed: ${String(err)}`);
      this.ui.connectBtn.textContent = 'Connect to Host';
      this.ui.connectBtn.disabled = false;
    }
  }

  /** Handle the relay disconnect button click. */
  private handleRelayDisconnect(): void {
    if (this.relay?.isConnected) {
      this.relay.disconnect();
      this.relay = null;
      this.ui.setRelayState('disconnected');
      this.ui.connectBtn.textContent = 'Connect to Host';
      this.ui.connectBtn.classList.remove('btn-connected');
      this.ui.connectBtn.disabled = false;
      this.ui.disconnectRelayBtn.setAttribute('hidden', '');
      this.ui.log('Disconnected from relay.');
    }
  }

  /** Handle the "Connect to Tower" button click. */
  private async handleTowerClick(): Promise<void> {
    this.ui.setTowerState('connecting');
    this.ui.towerBtn.disabled = true;
    this.ui.log('Requesting Bluetooth device — approve in the browser prompt…');

    try {
      const tower = new UltimateDarkTower();

      tower.onTowerDisconnect = () => {
        this.ui.setTowerState('disconnected');
        this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
        this.ui.towerBtn.classList.remove('btn-connected');
        this.ui.towerBtn.disabled = false;
        this.ui.disconnectTowerBtn.setAttribute('hidden', '');
        this.ui.log('Tower disconnected unexpectedly.');
        this.tower = null;
        this.relay?.sendReady(false);
      };

      await tower.connect();
      if (!tower.isConnected) {
        this.ui.log('Tower connection was not established.');
        this.ui.setTowerState('disconnected');
        this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
        this.ui.towerBtn.classList.remove('btn-connected');
        this.ui.towerBtn.disabled = false;
        this.ui.disconnectTowerBtn.setAttribute('hidden', '');
        return;
      }
      this.tower = tower;

      // Update button state immediately after BLE connection, before calibration.
      this.ui.towerBtn.textContent = 'Connected to Tower';
      this.ui.towerBtn.classList.add('btn-connected');
      this.ui.disconnectTowerBtn.removeAttribute('hidden');

      // Calibrate the tower before marking as ready.
      this.ui.setTowerState('calibrating');
      this.ui.log('Tower connected. Calibrating…');

      tower.onCalibrationComplete = () => {
        this.ui.setTowerState('connected');
        this.ui.log('Tower calibrated and ready.');
        this.relay?.sendReady(true);

        // Self-heal: replay last known command on tower reconnect.
        if (this.lastCommandBytes) {
          this.ui.log('Replaying last known command on reconnected tower…');
          this.replayQueue = this.replayQueue.then(() => this.replayOnTower(this.lastCommandBytes!)).catch(() => {});
        }
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
      // Fully reset tower button/UI state on any failure.
      this.tower = null;
      this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
      this.ui.towerBtn.classList.remove('btn-connected');
      this.ui.towerBtn.disabled = false;
      this.ui.disconnectTowerBtn.setAttribute('hidden', '');
    }
  }

  /** Handle the tower disconnect button click. */
  private async handleTowerDisconnect(): Promise<void> {
    if (this.tower?.isConnected) {
      await this.tower.disconnect();
      this.tower = null;
      this.ui.setTowerState('disconnected');
      this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
      this.ui.towerBtn.classList.remove('btn-connected');
      this.ui.towerBtn.disabled = false;
      this.ui.disconnectTowerBtn.setAttribute('hidden', '');
      this.ui.log('Tower disconnected.');
      this.relay?.sendReady(false);
    }
  }

  /** Replay a 20-byte command on the local physical tower. */
  private async replayOnTower(data: number[], seq: number | null = null): Promise<void> {
    if (!this.tower?.isConnected || !this.tower.isCalibrated) return;
    try {
      await this.tower.sendTowerCommandDirect(new Uint8Array(data));
      this.logger.logCommand('client→tower', data, seq);
      this.ui.log('Command replayed on tower.');
    } catch (err) {
      this.logger.logEvent('error', `Tower write failed: ${String(err)}`);
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
        this.stopConnectingAnimation();
        this.ui.setRelayState('connected');
        this.ui.connectBtn.textContent = 'Connected to Host';
        this.ui.connectBtn.classList.add('btn-connected');
        this.ui.disconnectRelayBtn.removeAttribute('hidden');
        this.ui.towerBtn.disabled = false;
        this.ui.playerNameInput.disabled = true;
        this.ui.log('Connected to relay host.');
        this.logger.setSendFn((json) => this.relay?.sendRaw(json));
        this.logger.setAutoSend(true);
        this.logger.logEvent('event', 'Connected to relay host');
        // If tower is already calibrated, signal readiness immediately.
        if (this.tower?.isConnected && this.tower?.isCalibrated) {
          this.relay?.sendReady(true);
        }
        // Clear pause overlay on reconnect (we're back online).
        this.ui.hidePauseOverlay();
        break;

      case 'relay:disconnected':
        this.logger.flush();
        this.logger.setAutoSend(false);
        this.logger.logEvent('event', `Relay disconnected (code ${event.code})`);
        this.ui.setRelayState('disconnected');
        this.ui.connectBtn.textContent = 'Connect to Host';
        this.ui.connectBtn.classList.remove('btn-connected');
        this.ui.connectBtn.disabled = false;
        this.ui.disconnectRelayBtn.setAttribute('hidden', '');
        this.ui.towerBtn.disabled = true;
        this.ui.playerNameInput.disabled = false;
        this.ui.log(`Relay disconnected (code ${event.code}).`);
        this.towerDisplay?.showIdle();
        break;

      case 'relay:reconnecting':
        this.ui.setRelayState('connecting', `Reconnecting in ${Math.round(event.delayMs / 1000)}s (attempt ${event.attempt})…`);
        this.ui.log(`Reconnecting in ${Math.round(event.delayMs / 1000)}s (attempt ${event.attempt})…`);
        break;

      case 'relay:reconnect-failed':
        this.ui.setRelayState('disconnected');
        this.ui.connectBtn.textContent = 'Connect to Host';
        this.ui.connectBtn.classList.remove('btn-connected');
        this.ui.connectBtn.disabled = false;
        this.ui.disconnectRelayBtn.setAttribute('hidden', '');
        this.ui.playerNameInput.disabled = false;
        this.ui.log(`Could not reconnect after ${event.attempts} attempts. Click "Connect to Host" to try again.`);
        break;

      case 'relay:error':
        this.ui.setRelayState('error');
        this.ui.connectBtn.classList.remove('btn-connected');
        this.ui.connectBtn.disabled = false;
        this.ui.disconnectRelayBtn.setAttribute('hidden', '');
        this.ui.log('Relay connection error.');
        break;

      case 'relay:paused':
        this.ui.showPauseOverlay('Host tower disconnected — game paused. Waiting for host to reconnect…');
        this.ui.log(`Game paused: ${event.reason}`);
        break;

      case 'relay:resumed':
        this.ui.hidePauseOverlay();
        this.ui.log('Game resumed — host tower reconnected.');
        break;

      case 'tower:command': {
        this.lastCommandBytes = event.data;
        this.logger.logCommand('client←host', event.data, event.seq);
        this.ui.log(`Command received: [${event.data.slice(0, 4).join(', ')}…]`);
        const state = rtdt_unpack_state(Uint8Array.from(event.data).slice(TOWER_STATE_DATA_OFFSET));
        if (state.led_sequence === TOWER_LIGHT_SEQUENCES.sealReveal) {
          const seal = this.detectBrokenSeal(state);
          if (seal) this.markSealBroken(seal);
        }
        this.towerDisplay?.applyState(state);
        if (!this.isObserver) {
          this.replayQueue = this.replayQueue.then(() => this.replayOnTower(event.data, event.seq)).catch(() => {});
        }
        break;
      }

      case 'sync:state':
        if (event.lastCommand) {
          this.lastCommandBytes = event.lastCommand;
          this.ui.log('Received full tower state sync from host.');
          const syncState = rtdt_unpack_state(Uint8Array.from(event.lastCommand).slice(TOWER_STATE_DATA_OFFSET));
          this.towerDisplay?.applyState(syncState);
          if (!this.isObserver) {
            this.replayQueue = this.replayQueue.then(() => this.replayOnTower(event.lastCommand!)).catch(() => {});
          }
        } else {
          this.ui.log('Connected — no prior tower state to sync.');
        }
        break;

      case 'host:resend': {
        this.lastCommandBytes = event.data;
        this.ui.log('Host operator re-sent last tower state.');
        const resendState = rtdt_unpack_state(Uint8Array.from(event.data).slice(TOWER_STATE_DATA_OFFSET));
        this.towerDisplay?.applyState(resendState);
        if (!this.isObserver) {
          this.replayQueue = this.replayQueue.then(() => this.replayOnTower(event.data)).catch(() => {});
        }
        break;
      }

      case 'client:connected':
        this.ui.log(`Player joined: ${event.label ?? event.clientId.slice(0, 8)}`);
        break;

      case 'client:disconnected':
        this.ui.log(`Player left: ${event.clientId.slice(0, 8)}`);
        break;

      case 'host:status': {
        const obs = event.status.observerCount;
        const detail = obs > 0
          ? `Connected (${event.status.clientCount} players, ${obs} observer${obs !== 1 ? 's' : ''})`
          : `Connected (${event.status.clientCount} players)`;
        this.ui.setRelayState('connected', detail);
        break;
      }

      case 'host:log-config':
        this.logger.setAutoSend(event.enabled);
        this.ui.log(`Host ${event.enabled ? 'enabled' : 'disabled'} automatic log submission.`);
        break;

      case 'relay:tower:alert':
        if (event.towerConnected) {
          this.ui.log(`${event.label ?? event.clientId.slice(0, 8)}'s tower reconnected.`);
        } else {
          this.ui.log(`${event.label ?? event.clientId.slice(0, 8)}'s tower disconnected.`);
        }
        break;
    }
  }
}
