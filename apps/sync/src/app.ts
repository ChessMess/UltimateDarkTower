/**
 * App — main application controller for the DarkTowerSync client.
 *
 * Wires together the UI, RelayClient (WebSocket), and UltimateDarkTower
 * (Web Bluetooth) into the top-level event loop.
 */

import {
  UltimateDarkTower,
  BluetoothUserCancelledError,
  rtdt_unpack_state,
  TOWER_STATE_DATA_OFFSET,
} from 'ultimatedarktower';
import { UI } from './ui';
import {
  RelayClient,
  PhysicalTowerReplay,
  type RelayClientEvent,
} from 'ultimatedarktowerrelay-client';
import { ClientLogger } from './clientLogger';
// Type-only import: the runtime value is pulled in via a dynamic import() in
// loadTowerDisplay() so the heavy visualizer (three / rapier / model / audio)
// is code-split into its own chunk instead of the main bundle.
import type { TowerDisplay } from 'ultimatedarktowerdisplay';

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
  private readonly isObserver: boolean = new URLSearchParams(window.location.search).has(
    'observer',
  );
  private relay: RelayClient | null = null;
  private tower: UltimateDarkTower | null = null;
  private towerDisplay: TowerDisplay | null = null;

  /**
   * Mirrors relayed commands onto the local physical tower (FR-5.2). Owns the
   * serialized write queue, tower-ready gate, and last-command self-heal — so
   * the app no longer tracks any of that itself.
   */
  private readonly replay: PhysicalTowerReplay;

  /** Interval ID for the "Connecting..." dot animation. */
  private connectingAnimationId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ui = new UI();
    this.logger = new ClientLogger();
    this.replay = new PhysicalTowerReplay({
      onLog: (message, error) => this.logger.logEvent(error ? 'error' : 'event', message),
    });
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
        void this.loadTowerDisplay(container);
      }
      this.ui.log('Observer mode — tower display active. Connect to a host to begin.');
    } else {
      const container = document.getElementById('tower-display');
      if (container) {
        void this.loadTowerDisplay(container);
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

  /**
   * Lazy-load the 3D tower visualizer. `ultimatedarktowerdisplay` and its
   * three / rapier / model / audio payload are the bulk of the bundle, so they
   * are code-split into a separate chunk and fetched only here. Any tower state
   * that arrives before the chunk finishes loading is harmless — every
   * `applyState`/`showIdle` call is null-guarded and the relay re-syncs full
   * state, so the visualizer catches up on the next update.
   */
  private async loadTowerDisplay(container: HTMLElement): Promise<void> {
    const { TowerDisplay } = await import('ultimatedarktowerdisplay');
    this.towerDisplay = new TowerDisplay({ container });
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

    this.relay = new RelayClient({
      label,
      observer: this.isObserver,
      onEvent: (event) => {
        // Fan out: mirror onto the local tower *and* drive the UI (the relay's
        // PhysicalTowerReplay owns the write queue / tower-ready gate / self-heal).
        this.replay.handleEvent(event);
        this.handleRelayEvent(event);
      },
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
        this.replay.setTower(null);
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
        this.replay.setTower(tower);
        this.relay?.sendReady(true);
        // Self-heal: replay the last relayed command on (re)calibration so a
        // tower that connected/reconnected mid-session catches up immediately.
        void this.replay.replayLast();
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
      this.replay.setTower(null);
      this.ui.setTowerState('disconnected');
      this.ui.towerBtn.textContent = 'Connect to Tower (Bluetooth)';
      this.ui.towerBtn.classList.remove('btn-connected');
      this.ui.towerBtn.disabled = false;
      this.ui.disconnectTowerBtn.setAttribute('hidden', '');
      this.ui.log('Tower disconnected.');
      this.relay?.sendReady(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Relay event handling
  // ---------------------------------------------------------------------------

  /** Handle events from {@link RelayClient} and update the UI accordingly. */
  private handleRelayEvent(event: RelayClientEvent): void {
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
        this.ui.setRelayState(
          'connecting',
          `Reconnecting in ${Math.round(event.delayMs / 1000)}s (attempt ${event.attempt})…`,
        );
        this.ui.log(
          `Reconnecting in ${Math.round(event.delayMs / 1000)}s (attempt ${event.attempt})…`,
        );
        break;

      case 'relay:reconnect-failed':
        this.ui.setRelayState('disconnected');
        this.ui.connectBtn.textContent = 'Connect to Host';
        this.ui.connectBtn.classList.remove('btn-connected');
        this.ui.connectBtn.disabled = false;
        this.ui.disconnectRelayBtn.setAttribute('hidden', '');
        this.ui.playerNameInput.disabled = false;
        this.ui.log(
          `Could not reconnect after ${event.attempts} attempts. Click "Connect to Host" to try again.`,
        );
        break;

      case 'relay:error':
        this.ui.setRelayState('error');
        this.ui.connectBtn.classList.remove('btn-connected');
        this.ui.connectBtn.disabled = false;
        this.ui.disconnectRelayBtn.setAttribute('hidden', '');
        this.ui.log('Relay connection error.');
        break;

      case 'relay:paused':
        this.ui.showPauseOverlay(
          'Host tower disconnected — game paused. Waiting for host to reconnect…',
        );
        this.ui.log(`Game paused: ${event.reason}`);
        break;

      case 'relay:resumed':
        this.ui.hidePauseOverlay();
        this.ui.log('Game resumed — host tower reconnected.');
        break;

      case 'tower:command': {
        this.logger.logCommand('client←host', event.data, event.seq);
        this.ui.log(`Command received: [${event.data.slice(0, 4).join(', ')}…]`);
        const state = rtdt_unpack_state(Uint8Array.from(event.data).slice(TOWER_STATE_DATA_OFFSET));
        this.towerDisplay?.applyState(state);
        break;
      }

      case 'sync:state':
        if (event.lastCommand) {
          this.ui.log('Received full tower state sync from host.');
          const syncState = rtdt_unpack_state(
            Uint8Array.from(event.lastCommand).slice(TOWER_STATE_DATA_OFFSET),
          );
          this.towerDisplay?.applyState(syncState);
        } else {
          this.ui.log('Connected — no prior tower state to sync.');
        }
        break;

      case 'host:resend': {
        this.ui.log('Host operator re-sent last tower state.');
        const resendState = rtdt_unpack_state(
          Uint8Array.from(event.data).slice(TOWER_STATE_DATA_OFFSET),
        );
        this.towerDisplay?.applyState(resendState);
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
        const detail =
          obs > 0
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
