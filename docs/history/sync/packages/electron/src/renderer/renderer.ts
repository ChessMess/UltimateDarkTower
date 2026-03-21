import type { FakeTowerState, ConnectedClient } from '@dark-tower-sync/shared';

// ─── Window type augmentation ─────────────────────────────────────────────────

interface DarkTowerSyncAPI {
  getVersion(): Promise<string>;
  getRelayStatus(): Promise<{ running: boolean; port: number; message: string }>;
  getTowerState(): Promise<{ state: FakeTowerState }>;
  getBleAdapterState(): Promise<{ state: string }>;
  onTowerState(cb: (payload: { state: FakeTowerState; detail?: string }) => void): () => void;
  onRelayClientChange(cb: (payload: { clients: ConnectedClient[] }) => void): () => void;
  onTowerCommand(cb: (payload: { count: number; lastAt: string }) => void): () => void;
  onRelayStatus(cb: (payload: { running: boolean; port: number; message: string }) => void): () => void;
  onBleAdapterState(cb: (payload: { state: string }) => void): () => void;
  triggerSkullDrop(): Promise<{ ok: boolean; reason?: string }>;
  startTowerAdvertising(): Promise<{ ok: boolean; reason?: string }>;
  stopTowerAdvertising(): Promise<{ ok: boolean; reason?: string }>;
  toggleLogging(): Promise<{ enabled: boolean }>;
  getLoggingState(): Promise<{ enabled: boolean }>;
  openLogDir(): Promise<void>;
}

declare global {
  interface Window {
    darkTowerSync: DarkTowerSyncAPI;
  }
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const versionEl = document.getElementById('version') as HTMLSpanElement;
const relayBannerEl = document.getElementById('relay-banner') as HTMLDivElement;
const towerStateEl = document.getElementById('tower-state') as HTMLSpanElement;
const towerStateDotEl = document.getElementById('tower-state-dot') as HTMLSpanElement;
const bleAdapterStateLabelEl = document.getElementById('ble-adapter-state-label') as HTMLSpanElement;
const bleAdapterHelpEl = document.getElementById('ble-adapter-help') as HTMLDivElement;
const bleErrorDetailEl = document.getElementById('ble-error-detail') as HTMLDivElement;
const clientCountEl = document.getElementById('client-count') as HTMLSpanElement;
const clientListEl = document.getElementById('client-list') as HTMLUListElement;
const commandCountEl = document.getElementById('command-count') as HTMLSpanElement;
const lastCommandAtEl = document.getElementById('last-command-at') as HTMLSpanElement;
const skullDropBtnEl = document.getElementById('btn-skull-drop') as HTMLButtonElement;
const skullDropFeedbackEl = document.getElementById('skull-drop-feedback') as HTMLSpanElement;
const startAdvertisingBtnEl = document.getElementById('btn-start-advertising') as HTMLButtonElement;
const stopBleBtnEl = document.getElementById('btn-stop-ble') as HTMLButtonElement;
const bleControlFeedbackEl = document.getElementById('ble-control-feedback') as HTMLSpanElement;
const loggingStateDotEl = document.getElementById('logging-state-dot') as HTMLSpanElement;
const loggingStateLabelEl = document.getElementById('logging-state-label') as HTMLSpanElement;
const loggingBadgeEl = document.getElementById('logging-state-badge') as HTMLSpanElement;
const toggleLoggingBtnEl = document.getElementById('btn-toggle-logging') as HTMLButtonElement;
const openLogsBtnEl = document.getElementById('btn-open-logs') as HTMLButtonElement;
const loggingFeedbackEl = document.getElementById('logging-feedback') as HTMLSpanElement;

// ─── State labels and colours ─────────────────────────────────────────────────

const STATE_LABEL: Record<FakeTowerState, string> = {
  idle: 'Idle',
  advertising: 'Advertising',
  connected: 'Connected',
  error: 'Error',
};

const STATE_CLASS: Record<FakeTowerState, string> = {
  idle: 'state-idle',
  advertising: 'state-advertising',
  connected: 'state-connected',
  error: 'state-error',
};

function setTowerState(state: FakeTowerState, detail?: string): void {
  towerStateEl.textContent = STATE_LABEL[state] ?? state;
  towerStateDotEl.className = `dot ${STATE_CLASS[state] ?? ''}`;
  if (detail) {
    bleErrorDetailEl.textContent = detail;
    bleErrorDetailEl.hidden = false;
  } else {
    bleErrorDetailEl.hidden = true;
  }
  // Enable skull drop button only when companion app is connected.
  skullDropBtnEl.disabled = state !== 'connected';
  if (state !== 'connected') clearSkullFeedback();

  // BLE lifecycle controls — driven entirely by tower state.
  startAdvertisingBtnEl.disabled = state === 'advertising' || state === 'connected';
  stopBleBtnEl.disabled = state === 'idle' || state === 'error';
}

function setClients(clients: ConnectedClient[]): void {
  clientCountEl.textContent = String(clients.length);
  clientListEl.innerHTML = '';
  if (clients.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No clients connected';
    clientListEl.appendChild(li);
    return;
  }
  for (const client of clients) {
    const li = document.createElement('li');
    const name = client.label ?? client.id;

    // Per-player relay + tower health indicators
    const relayBadge = '\u2713'; // ✓
    const towerIcon = client.towerConnected ? '\u2713' : '\u2717'; // ✓ or ✗
    const towerClass = client.towerConnected ? 'tower-ok' : 'tower-disconnected';

    li.innerHTML = `<span class="client-name">${escapeHtml(name)}</span>` +
      `<span class="client-health">` +
      `<span class="health-relay" title="Relay connected">${relayBadge}</span>` +
      `<span class="health-tower ${towerClass}" title="Tower ${client.towerConnected ? 'connected' : 'disconnected'}">${towerIcon}</span>` +
      `</span>`;

    if (!client.towerConnected && client.state !== 'connected') {
      li.classList.add('client-alert');
    }
    clientListEl.appendChild(li);
  }

  // Show alert banner if any previously-seen tower is now disconnected
  const alertPlayers = clients.filter(c => !c.towerConnected && c.towerLastSeenAt !== null);
  if (alertPlayers.length > 0) {
    const names = alertPlayers.map(c => c.label ?? c.id.slice(0, 8)).join(', ');
    showClientAlert(`${names}'s tower is disconnected. Wait for them to reconnect.`);
  } else {
    hideClientAlert();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let clientAlertEl: HTMLDivElement | null = null;

function showClientAlert(message: string): void {
  if (!clientAlertEl) {
    clientAlertEl = document.createElement('div');
    clientAlertEl.className = 'client-alert-banner';
    const card = document.getElementById('card-clients');
    card?.appendChild(clientAlertEl);
  }
  clientAlertEl.textContent = message;
  clientAlertEl.hidden = false;
}

function hideClientAlert(): void {
  if (clientAlertEl) {
    clientAlertEl.hidden = true;
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

const BLE_STATE_HELP: Record<string, string> = {
  unauthorized:
    'Permission denied. Open System Settings → Privacy & Security → Bluetooth and enable "Electron" (dev) or "DarkTowerSync" (packaged app).',
  poweredOff:
    'Bluetooth is off. Enable it in System Settings → Bluetooth.',
  unsupported:
    'Bluetooth is not supported on this device.',
  resetting:
    'Bluetooth adapter is resetting…',
  poweredOn: '',
  unknown: 'Waiting for Bluetooth adapter…',
};

function setBleAdapterState(state: string): void {
  bleAdapterStateLabelEl.textContent = state;
  bleAdapterStateLabelEl.className = `ble-state-${state}`;
  const help = BLE_STATE_HELP[state] ?? '';
  bleAdapterHelpEl.textContent = help;
  bleAdapterHelpEl.hidden = help === '';
}

function setRelayStatus(status: { running: boolean; message: string }): void {
  if (status.running) {
    relayBannerEl.hidden = true;
    relayBannerEl.textContent = '';
    return;
  }

  relayBannerEl.hidden = false;
  relayBannerEl.textContent = status.message;
}

let _feedbackTimer: ReturnType<typeof setTimeout> | null = null;

function clearSkullFeedback(): void {
  if (_feedbackTimer) { clearTimeout(_feedbackTimer); _feedbackTimer = null; }
  skullDropFeedbackEl.hidden = true;
  skullDropFeedbackEl.className = 'action-feedback';
  skullDropFeedbackEl.textContent = '';
}

function showSkullFeedback(ok: boolean, message: string): void {
  clearSkullFeedback();
  skullDropFeedbackEl.textContent = message;
  skullDropFeedbackEl.className = `action-feedback ${ok ? 'feedback-ok' : 'feedback-err'}`;
  skullDropFeedbackEl.hidden = false;
  _feedbackTimer = setTimeout(clearSkullFeedback, 3000);
}

let _bleControlFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

function clearBleControlFeedback(): void {
  if (_bleControlFeedbackTimer) { clearTimeout(_bleControlFeedbackTimer); _bleControlFeedbackTimer = null; }
  bleControlFeedbackEl.hidden = true;
  bleControlFeedbackEl.className = 'action-feedback';
  bleControlFeedbackEl.textContent = '';
}

function showBleControlFeedback(ok: boolean, message: string): void {
  clearBleControlFeedback();
  bleControlFeedbackEl.textContent = message;
  bleControlFeedbackEl.className = `action-feedback ${ok ? 'feedback-ok' : 'feedback-err'}`;
  bleControlFeedbackEl.hidden = false;
  _bleControlFeedbackTimer = setTimeout(clearBleControlFeedback, 3000);
}

// ─── Logging state ───────────────────────────────────────────────────────────

function setLoggingState(enabled: boolean): void {
  loggingStateDotEl.className = `dot ${enabled ? 'state-connected' : 'state-idle'}`;
  loggingStateLabelEl.textContent = enabled ? 'Active — recording to file' : 'Paused — not recording';
  loggingBadgeEl.textContent = enabled ? 'ON' : 'OFF';
  toggleLoggingBtnEl.textContent = enabled ? 'Pause Logging' : 'Resume Logging';
}

let _loggingFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

function showLoggingFeedback(ok: boolean, message: string): void {
  if (_loggingFeedbackTimer) { clearTimeout(_loggingFeedbackTimer); _loggingFeedbackTimer = null; }
  loggingFeedbackEl.textContent = message;
  loggingFeedbackEl.className = `action-feedback ${ok ? 'feedback-ok' : 'feedback-err'}`;
  loggingFeedbackEl.hidden = false;
  _loggingFeedbackTimer = setTimeout(() => { loggingFeedbackEl.hidden = true; }, 3000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const api = window.darkTowerSync;

  const version = await api.getVersion();
  versionEl.textContent = `v${version}`;

  // Initial render — query current state from main process (avoids race with IPC push).
  const { state: currentTowerState } = await api.getTowerState();
  setTowerState(currentTowerState);
  setClients([]);
  setRelayStatus(await api.getRelayStatus());
  const { state: initialBleState } = await api.getBleAdapterState();
  setBleAdapterState(initialBleState);
  const { enabled: loggingEnabled } = await api.getLoggingState();
  setLoggingState(loggingEnabled);

  api.onTowerState(({ state, detail }) => setTowerState(state, detail));

  api.onRelayClientChange(({ clients }) => setClients(clients));

  api.onRelayStatus((status) => setRelayStatus(status));

  api.onBleAdapterState(({ state }) => setBleAdapterState(state));

  api.onTowerCommand(({ count, lastAt }) => {
    commandCountEl.textContent = String(count);
    lastCommandAtEl.textContent = formatTimestamp(lastAt);
  });

  skullDropBtnEl.addEventListener('click', () => {
    skullDropBtnEl.disabled = true;
    clearSkullFeedback();
    api.triggerSkullDrop().then(({ ok, reason }) => {
      showSkullFeedback(ok, ok ? 'Skull dropped ✓' : (reason ?? 'Failed'));
    }).catch(() => {
      showSkullFeedback(false, 'IPC error');
    }).finally(() => {
      // Re-enable only if still connected (state may have changed during the async call).
      const isConnected = towerStateDotEl.classList.contains('state-connected');
      skullDropBtnEl.disabled = !isConnected;
    });
  });

  startAdvertisingBtnEl.addEventListener('click', () => {
    startAdvertisingBtnEl.disabled = true;
    clearBleControlFeedback();
    api.startTowerAdvertising().then(({ ok, reason }) => {
      if (!ok) showBleControlFeedback(false, reason ?? 'Failed to start advertising');
    }).catch(() => {
      showBleControlFeedback(false, 'IPC error');
    });
    // Re-enable is driven by onTowerState when the tower state settles.
  });

  stopBleBtnEl.addEventListener('click', () => {
    stopBleBtnEl.disabled = true;
    clearBleControlFeedback();
    api.stopTowerAdvertising().then(({ ok, reason }) => {
      if (!ok) showBleControlFeedback(false, reason ?? 'Failed to stop BLE');
    }).catch(() => {
      showBleControlFeedback(false, 'IPC error');
    });
    // Re-enable is driven by onTowerState when the tower state settles.
  });

  toggleLoggingBtnEl.addEventListener('click', () => {
    toggleLoggingBtnEl.disabled = true;
    api.toggleLogging().then(({ enabled }) => {
      setLoggingState(enabled);
      showLoggingFeedback(true, enabled ? 'Logging resumed' : 'Logging paused');
    }).catch(() => {
      showLoggingFeedback(false, 'IPC error');
    }).finally(() => {
      toggleLoggingBtnEl.disabled = false;
    });
  });

  openLogsBtnEl.addEventListener('click', () => {
    api.openLogDir().catch(() => {
      showLoggingFeedback(false, 'Could not open logs folder');
    });
  });
}

init().catch((err) => console.error('[renderer] init error:', err));
