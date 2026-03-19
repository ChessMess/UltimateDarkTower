/**
 * UI — DOM management for the DarkTowerSync client web page.
 *
 * Provides typed accessors for all interactive elements and helpers for
 * updating status indicators and the event log.
 */

/** Connection state reflected in the UI status indicators. */
export type UiConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

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

  // Status indicators
  private readonly relayDot: HTMLElement;
  private readonly relayStatus: HTMLElement;
  private readonly towerDot: HTMLElement;
  private readonly towerStatus: HTMLElement;

  // Log
  private readonly logEl: HTMLElement;

  constructor() {
    this.hostUrlInput = this.require<HTMLInputElement>('host-url');
    this.playerNameInput = this.require<HTMLInputElement>('player-name');
    this.connectBtn = this.require<HTMLButtonElement>('connect-btn');
    this.towerBtn = this.require<HTMLButtonElement>('tower-btn');
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
    this.relayStatus.textContent =
      label ??
      {
        disconnected: 'Not connected to relay',
        connecting: 'Connecting to relay…',
        connected: 'Connected to relay',
        error: 'Relay connection error',
      }[state];
  }

  /**
   * Update the tower (Web Bluetooth) connection status indicator.
   *
   * @param state - New connection state.
   * @param label - Optional human-readable label override.
   */
  setTowerState(state: UiConnectionState, label?: string): void {
    this.setDot(this.towerDot, state);
    this.towerStatus.textContent =
      label ??
      {
        disconnected: 'Tower not connected',
        connecting: 'Connecting to tower…',
        connected: 'Tower connected',
        error: 'Tower connection error',
      }[state];
  }

  /**
   * Append a timestamped line to the event log panel.
   *
   * TODO: Cap the log to a maximum number of entries to avoid unbounded growth.
   *
   * @param message - Text to append.
   */
  log(message: string): void {
    const ts = new Date().toLocaleTimeString();
    const p = document.createElement('p');
    p.textContent = `[${ts}] ${message}`;
    this.logEl.appendChild(p);
    this.logEl.scrollTop = this.logEl.scrollHeight;
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
    if (state !== 'disconnected') dot.classList.add(state === 'error' ? 'error' : state);
  }
}
