import type { FakeTowerState, ConnectedClient } from 'ultimatedarktowerrelay-shared';

// ─── Window type augmentation ─────────────────────────────────────────────────

type SourceMode = 'fake' | 'mock' | 'real';
interface ActionResult { ok: boolean; reason?: string }

interface DarkTowerRelayAPI {
  getVersion(): Promise<string>;
  getRelayStatus(): Promise<{ running: boolean; port: number; message: string; urls: string[] }>;
  getTowerState(): Promise<{ state: FakeTowerState; detail?: string }>;
  getBleAdapterState(): Promise<{ state: string }>;
  getSource(): Promise<{ source: SourceMode }>;
  setSource(mode: SourceMode): Promise<ActionResult>;
  onTowerState(cb: (payload: { state: FakeTowerState; detail?: string }) => void): () => void;
  onRelayClientChange(cb: (payload: { clients: ConnectedClient[] }) => void): () => void;
  onTowerCommand(cb: (payload: { count: number; lastAt: string }) => void): () => void;
  onRelayStatus(cb: (payload: { running: boolean; port: number; message: string; urls: string[] }) => void): () => void;
  onBleAdapterState(cb: (payload: { state: string }) => void): () => void;
  onSourceChanged(cb: (payload: { source: SourceMode }) => void): () => void;
  triggerSkullDrop(): Promise<ActionResult>;
  startTowerAdvertising(): Promise<ActionResult>;
  stopTowerAdvertising(): Promise<ActionResult>;
  toggleLogging(): Promise<{ enabled: boolean }>;
  getLoggingState(): Promise<{ enabled: boolean }>;
  openLogDir(): Promise<void>;
  resendLastState(): Promise<ActionResult>;
}

declare global {
  interface Window {
    darkTowerRelay: DarkTowerRelayAPI;
  }
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const versionEl = document.getElementById('version') as HTMLSpanElement;
const relayBannerEl = document.getElementById('relay-banner') as HTMLDivElement;
const sourceSelectEl = document.getElementById('source-select') as HTMLSelectElement;
const sourceFeedbackEl = document.getElementById('source-feedback') as HTMLSpanElement;
const towerStateEl = document.getElementById('tower-state') as HTMLSpanElement;
const towerStateDotEl = document.getElementById('tower-state-dot') as HTMLSpanElement;
const bleAdapterDetailEl = document.getElementById('ble-adapter-detail') as HTMLDivElement;
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
const relayUrlBarEl = document.getElementById('relay-url-bar') as HTMLDivElement;
const relayUrlListEl = document.getElementById('relay-url-list') as HTMLDivElement;
const resendBtnEl = document.getElementById('btn-resend-state') as HTMLButtonElement;
const resendFeedbackEl = document.getElementById('resend-feedback') as HTMLSpanElement;
const loggingStateDotEl = document.getElementById('logging-state-dot') as HTMLSpanElement;
const loggingStateLabelEl = document.getElementById('logging-state-label') as HTMLSpanElement;
const loggingBadgeEl = document.getElementById('logging-state-badge') as HTMLSpanElement;
const toggleLoggingBtnEl = document.getElementById('btn-toggle-logging') as HTMLButtonElement;
const openLogsBtnEl = document.getElementById('btn-open-logs') as HTMLButtonElement;
const loggingFeedbackEl = document.getElementById('logging-feedback') as HTMLSpanElement;

// ─── Source + tower state ─────────────────────────────────────────────────────

let currentSource: SourceMode = 'fake';
let lastTowerState: FakeTowerState = 'idle';

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

/** Skull drop only applies to sink-capable sources (fake/mock), and only when connected. */
function skullDropAvailable(): boolean {
  return currentSource !== 'real' && lastTowerState === 'connected';
}

function setTowerState(state: FakeTowerState, detail?: string): void {
  lastTowerState = state;
  towerStateEl.textContent = STATE_LABEL[state] ?? state;
  towerStateDotEl.className = `dot ${STATE_CLASS[state] ?? ''}`;
  if (detail) {
    bleErrorDetailEl.textContent = detail;
    bleErrorDetailEl.hidden = false;
  } else {
    bleErrorDetailEl.hidden = true;
  }

  skullDropBtnEl.disabled = !skullDropAvailable();
  skullDropBtnEl.title = currentSource === 'real'
    ? 'Real tower reports its own skull drops'
    : 'Trigger skull drop';
  if (!skullDropAvailable()) clearSkullFeedback();

  // BLE lifecycle controls — driven by tower state (apply to every source:
  // "advertising" = advertising/connecting, "stop" = idle/disconnect).
  startAdvertisingBtnEl.disabled = state === 'advertising' || state === 'connected';
  stopBleBtnEl.disabled = state === 'idle' || state === 'error';
}

/** Update the source selector + BLE panel applicability for the active source. */
function setSourceUI(mode: SourceMode): void {
  currentSource = mode;
  sourceSelectEl.value = mode;

  // The BLE-adapter panel only means something for the fake (peripheral) source.
  if (mode === 'fake') {
    bleAdapterDetailEl.classList.remove('source-na');
  } else {
    bleAdapterDetailEl.classList.add('source-na');
    setBleAdapterState('n/a');
  }
  // Re-evaluate skull-drop gating for the new source.
  setTowerState(lastTowerState);
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

    const relayBadge = '✓'; // ✓
    const towerIcon = client.towerConnected ? '✓' : '✗'; // ✓ or ✗
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

  const alertPlayers = clients.filter((c) => !c.towerConnected && c.towerLastSeenAt !== null);
  if (alertPlayers.length > 0) {
    const names = alertPlayers.map((c) => c.label ?? c.id.slice(0, 8)).join(', ');
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
  if (clientAlertEl) clientAlertEl.hidden = true;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

const BLE_STATE_HELP: Record<string, string> = {
  unauthorized:
    'Permission denied. Open System Settings → Privacy & Security → Bluetooth and enable "Electron" (dev) or "DarkTowerRelay" (packaged app).',
  poweredOff: 'Bluetooth is off. Enable it in System Settings → Bluetooth.',
  unsupported: 'Bluetooth is not supported on this device.',
  resetting: 'Bluetooth adapter is resetting…',
  poweredOn: '',
  'n/a': '',
  unknown: 'Waiting for Bluetooth adapter…',
};

function setBleAdapterState(state: string): void {
  bleAdapterStateLabelEl.textContent = state;
  bleAdapterStateLabelEl.className = `ble-state-${state}`;
  const help = BLE_STATE_HELP[state] ?? '';
  bleAdapterHelpEl.textContent = help;
  bleAdapterHelpEl.hidden = help === '';
}

function setRelayStatus(status: { running: boolean; message: string; urls?: string[] }): void {
  if (status.running) {
    relayBannerEl.hidden = true;
    relayBannerEl.textContent = '';
  } else {
    relayBannerEl.hidden = false;
    relayBannerEl.textContent = status.message;
  }

  const urls = status.urls ?? [];
  if (status.running && urls.length > 0) {
    relayUrlBarEl.hidden = false;
    relayUrlListEl.innerHTML = '';
    for (const url of urls) {
      const row = document.createElement('div');
      row.className = 'relay-url-row';

      const urlSpan = document.createElement('span');
      urlSpan.className = 'relay-url-value';
      urlSpan.textContent = url;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'relay-url-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });

      row.appendChild(urlSpan);
      row.appendChild(copyBtn);
      relayUrlListEl.appendChild(row);
    }
  } else {
    relayUrlBarEl.hidden = true;
  }
}

// ─── Feedback helpers ─────────────────────────────────────────────────────────

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

function showTransientFeedback(el: HTMLElement, ok: boolean, message: string): void {
  el.textContent = message;
  el.className = `action-feedback ${ok ? 'feedback-ok' : 'feedback-err'}`;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 3000);
}

function setLoggingState(enabled: boolean): void {
  loggingStateDotEl.className = `dot ${enabled ? 'state-connected' : 'state-idle'}`;
  loggingStateLabelEl.textContent = enabled ? 'Active — recording to file' : 'Paused — not recording';
  loggingBadgeEl.textContent = enabled ? 'ON' : 'OFF';
  toggleLoggingBtnEl.textContent = enabled ? 'Pause Logging' : 'Resume Logging';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const api = window.darkTowerRelay;

  versionEl.textContent = `v${await api.getVersion()}`;

  // Initial render — query current state from main process (avoids race with IPC push).
  const { source } = await api.getSource();
  setSourceUI(source);
  const { state: currentTowerState } = await api.getTowerState();
  setTowerState(currentTowerState);
  setClients([]);
  setRelayStatus(await api.getRelayStatus());
  if (source === 'fake') {
    const { state: initialBleState } = await api.getBleAdapterState();
    setBleAdapterState(initialBleState);
  }
  setLoggingState((await api.getLoggingState()).enabled);

  api.onTowerState(({ state, detail }) => setTowerState(state, detail));
  api.onRelayClientChange(({ clients }) => setClients(clients));
  api.onRelayStatus((status) => setRelayStatus(status));
  api.onBleAdapterState(({ state }) => setBleAdapterState(state));
  api.onSourceChanged(({ source: mode }) => setSourceUI(mode));

  api.onTowerCommand(({ count, lastAt }) => {
    commandCountEl.textContent = String(count);
    lastCommandAtEl.textContent = formatTimestamp(lastAt);
    resendBtnEl.disabled = false;
  });

  // ── Source selector ───────────────────────────────────────────────────────
  sourceSelectEl.addEventListener('change', () => {
    const target = sourceSelectEl.value as SourceMode;
    const previous = currentSource;
    sourceSelectEl.disabled = true;
    sourceFeedbackEl.hidden = true;
    api.setSource(target).then(({ ok, reason }) => {
      if (ok) {
        showTransientFeedback(sourceFeedbackEl, true, `Source: ${target}`);
      } else {
        sourceSelectEl.value = previous; // revert
        setSourceUI(previous);
        showTransientFeedback(sourceFeedbackEl, false, reason ?? 'Switch failed');
      }
    }).catch(() => {
      sourceSelectEl.value = previous;
      setSourceUI(previous);
      showTransientFeedback(sourceFeedbackEl, false, 'IPC error');
    }).finally(() => {
      sourceSelectEl.disabled = false;
    });
  });

  // ── Manual controls ─────────────────────────────────────────────────────────
  skullDropBtnEl.addEventListener('click', () => {
    skullDropBtnEl.disabled = true;
    clearSkullFeedback();
    api.triggerSkullDrop().then(({ ok, reason }) => {
      showSkullFeedback(ok, ok ? 'Skull dropped ✓' : (reason ?? 'Failed'));
    }).catch(() => {
      showSkullFeedback(false, 'IPC error');
    }).finally(() => {
      skullDropBtnEl.disabled = !skullDropAvailable();
    });
  });

  startAdvertisingBtnEl.addEventListener('click', () => {
    startAdvertisingBtnEl.disabled = true;
    bleControlFeedbackEl.hidden = true;
    api.startTowerAdvertising().then(({ ok, reason }) => {
      if (!ok) showTransientFeedback(bleControlFeedbackEl, false, reason ?? 'Failed to start');
    }).catch(() => {
      showTransientFeedback(bleControlFeedbackEl, false, 'IPC error');
    });
    // Re-enable is driven by onTowerState when the state settles.
  });

  stopBleBtnEl.addEventListener('click', () => {
    stopBleBtnEl.disabled = true;
    bleControlFeedbackEl.hidden = true;
    api.stopTowerAdvertising().then(({ ok, reason }) => {
      if (!ok) showTransientFeedback(bleControlFeedbackEl, false, reason ?? 'Failed to stop');
    }).catch(() => {
      showTransientFeedback(bleControlFeedbackEl, false, 'IPC error');
    });
  });

  toggleLoggingBtnEl.addEventListener('click', () => {
    toggleLoggingBtnEl.disabled = true;
    api.toggleLogging().then(({ enabled }) => {
      setLoggingState(enabled);
      showTransientFeedback(loggingFeedbackEl, true, enabled ? 'Logging resumed' : 'Logging paused');
    }).catch(() => {
      showTransientFeedback(loggingFeedbackEl, false, 'IPC error');
    }).finally(() => {
      toggleLoggingBtnEl.disabled = false;
    });
  });

  openLogsBtnEl.addEventListener('click', () => {
    api.openLogDir().catch(() => {
      showTransientFeedback(loggingFeedbackEl, false, 'Could not open logs folder');
    });
  });

  resendBtnEl.addEventListener('click', () => {
    resendBtnEl.disabled = true;
    resendFeedbackEl.hidden = true;
    api.resendLastState().then(({ ok, reason }) => {
      showTransientFeedback(resendFeedbackEl, ok, ok ? 'Sent' : (reason ?? 'Failed'));
    }).catch(() => {
      showTransientFeedback(resendFeedbackEl, false, 'IPC error');
    }).finally(() => {
      setTimeout(() => { resendBtnEl.disabled = false; }, 1000);
    });
  });
}

init().catch((err) => console.error('[renderer] init error:', err));
