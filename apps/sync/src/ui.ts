/**
 * UI — DOM management for the DarkTowerSync client web page.
 *
 * Provides typed accessors for all interactive elements and helpers for
 * updating status indicators and the event log.
 */

/** Connection state reflected in the UI status indicators. */
export type UiConnectionState = 'disconnected' | 'connecting' | 'calibrating' | 'connected' | 'error';

/**
 * UI manages all DOM interaction for the DarkTowerSync client page.
 *
 * @example
 * ```ts
 * const ui = new UI();
 * ui.setRelayState('connected');
 * ui.log('Relay connected — waiting for tower commands.');
 * ```
 */
export class UI {
  // Input elements
  readonly hostUrlInput: HTMLInputElement;
  readonly playerNameInput: HTMLInputElement;

  // Buttons
  readonly connectBtn: HTMLButtonElement;
  readonly towerBtn: HTMLButtonElement;
  readonly sendLogsBtn: HTMLButtonElement;
  readonly downloadLogsBtn: HTMLButtonElement;

  // Status indicators
  private readonly relayDot: HTMLElement;
  private readonly relayStatus: HTMLElement;
  private readonly towerDot: HTMLElement;
  private readonly towerStatus: HTMLElement;

  // Log
  private readonly logEl: HTMLElement;

  // Pause overlay
  private pauseOverlay: HTMLElement | null = null;

  constructor() {
    this.hostUrlInput = this.require<HTMLInputElement>('host-url');
    this.playerNameInput = this.require<HTMLInputElement>('player-name');
    this.connectBtn = this.require<HTMLButtonElement>('connect-btn');
    this.towerBtn = this.require<HTMLButtonElement>('tower-btn');
    this.sendLogsBtn = this.require<HTMLButtonElement>('send-logs-btn');
    this.downloadLogsBtn = this.require<HTMLButtonElement>('download-logs-btn');
    this.relayDot = this.require('relay-dot');
    this.relayStatus = this.require('relay-status');
    this.towerDot = this.require('tower-dot');
    this.towerStatus = this.require('tower-status');
    this.logEl = this.require('log');
  }

  /**
   * Update the relay connection status indicator.
   *
   * @param state - New connection state.
   * @param label - Optional human-readable label override.
   */
  setRelayState(state: UiConnectionState, label?: string): void {
    this.setDot(this.relayDot, state);
    const labels: Record<UiConnectionState, string> = {
      disconnected: 'Not connected to relay',
      connecting: 'Connecting to relay…',
      calibrating: 'Relay calibrating…',
      connected: 'Connected to relay',
      error: 'Relay connection error',
    };
    this.relayStatus.textContent = label ?? labels[state];
  }

  /**
   * Update the tower (Web Bluetooth) connection status indicator.
   *
   * @param state - New connection state.
   * @param label - Optional human-readable label override.
   */
  setTowerState(state: UiConnectionState, label?: string): void {
    this.setDot(this.towerDot, state);
    const labels: Record<UiConnectionState, string> = {
      disconnected: 'Tower not connected',
      connecting: 'Connecting to tower…',
      calibrating: 'Tower calibrating…',
      connected: 'Tower connected',
      error: 'Tower connection error',
    };
    this.towerStatus.textContent = label ?? labels[state];
  }

  /**
   * Append a timestamped line to the event log panel.
   *
   * @param message - Text to append.
   */
  log(message: string): void {
    const ts = new Date().toLocaleTimeString();
    const p = document.createElement('p');
    p.textContent = `[${ts}] ${message}`;
    this.logEl.appendChild(p);
    this.logEl.scrollTop = this.logEl.scrollHeight;

    // Cap log to prevent unbounded DOM growth.
    const MAX_LOG_ENTRIES = 200;
    while (this.logEl.childElementCount > MAX_LOG_ENTRIES) {
      this.logEl.removeChild(this.logEl.firstChild!);
    }
  }

  // ---------------------------------------------------------------------------
  // Pause overlay
  // ---------------------------------------------------------------------------

  /**
   * Show a full-screen pause overlay with a message.
   * Used when the host's companion app disconnects from FakeTower.
   */
  showPauseOverlay(message: string): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.textContent = message;
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);color:#fce8bf;display:flex;' +
      'align-items:center;justify-content:center;z-index:9999;font-size:1.2rem;' +
      'text-align:center;padding:2rem;font-family:system-ui,sans-serif;';
    overlay.textContent = message;
    document.body.appendChild(overlay);
    this.pauseOverlay = overlay;
  }

  /** Remove the pause overlay if present. */
  hidePauseOverlay(): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.remove();
      this.pauseOverlay = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private require<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Required element #${id} not found in DOM`);
    return el as T;
  }

  private setDot(dot: HTMLElement, state: UiConnectionState): void {
    dot.className = 'dot';
    if (state === 'connected') dot.classList.add('connected');
    else if (state === 'error') dot.classList.add('error');
    else if (state === 'connecting' || state === 'calibrating') dot.classList.add('connecting');
  }
}
