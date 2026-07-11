import type { TowerEmulatorState, ConnectedClient, RelayEvent } from 'ultimatedarktowerrelay-shared';
import type { SessionSummary, TimelineRow } from 'ultimatedarktowerrelay-core';

// ─── Window type augmentation ─────────────────────────────────────────────────

type SourceMode = 'emulator' | 'mock' | 'real';
interface ActionResult { ok: boolean; reason?: string }

interface LogFileInfo { name: string; sizeBytes: number; mtimeMs: number }
interface LogListResult { sessions: LogFileInfo[]; events: LogFileInfo[] }
type LogAnalysisResult =
  | {
      ok: true;
      fileCount: number;
      summary: SessionSummary;
      timeline: { rows: TimelineRow[]; total: number };
      anomalies: Array<{ type: string; message: string }>;
    }
  | { ok: false; reason: string };
type EventLogResult =
  | { ok: true; events: RelayEvent[]; total: number; truncated: boolean }
  | { ok: false; reason: string };

interface DarkTowerRelayAPI {
  getVersion(): Promise<string>;
  getRelayStatus(): Promise<{ running: boolean; port: number; message: string; urls: string[] }>;
  getTowerState(): Promise<{ state: TowerEmulatorState; detail?: string }>;
  getBleAdapterState(): Promise<{ state: string }>;
  getSource(): Promise<{ source: SourceMode }>;
  setSource(mode: SourceMode): Promise<ActionResult>;
  onTowerState(cb: (payload: { state: TowerEmulatorState; detail?: string }) => void): () => void;
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
  listLogs(): Promise<LogListResult>;
  analyzeLogs(session: string | null): Promise<LogAnalysisResult>;
  loadEventLogFile(file: string): Promise<EventLogResult>;
  resizeContentHeight(height: number): void;
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
const loggingSectionEl = document.getElementById('card-logging') as HTMLElement;
const loggingCollapseToggleEl = document.getElementById('logging-collapse-toggle') as HTMLButtonElement;

// Logs panel (FR-7.3 log viewer)
const logsRefreshBtnEl = document.getElementById('btn-logs-refresh') as HTMLButtonElement;
const logsAnalyzeBtnEl = document.getElementById('btn-logs-analyze') as HTMLButtonElement;
const logsLoadEventsBtnEl = document.getElementById('btn-logs-load-events') as HTMLButtonElement;
const logsSessionSelectEl = document.getElementById('logs-session-select') as HTMLSelectElement;
const logsEventSelectEl = document.getElementById('logs-event-select') as HTMLSelectElement;
const logsFeedbackEl = document.getElementById('logs-feedback') as HTMLSpanElement;
const logsHintEl = document.getElementById('logs-hint') as HTMLParagraphElement;
const logsSummaryEl = document.getElementById('logs-summary') as HTMLDivElement;
const logsSummaryBodyEl = document.getElementById('logs-summary-body') as HTMLDivElement;
const logsAnomaliesEl = document.getElementById('logs-anomalies') as HTMLDivElement;
const logsAnomalyCountEl = document.getElementById('logs-anomaly-count') as HTMLSpanElement;
const logsAnomalyListEl = document.getElementById('logs-anomaly-list') as HTMLUListElement;
const logsTimelineEl = document.getElementById('logs-timeline') as HTMLDivElement;
const logsTimelineMetaEl = document.getElementById('logs-timeline-meta') as HTMLSpanElement;
const logsTimelineBodyEl = document.getElementById('logs-timeline-body') as HTMLDivElement;
const logsEventsEl = document.getElementById('logs-events') as HTMLDivElement;
const logsEventsMetaEl = document.getElementById('logs-events-meta') as HTMLSpanElement;
const logsEventsBodyEl = document.getElementById('logs-events-body') as HTMLDivElement;

// ─── Source + tower state ─────────────────────────────────────────────────────

let currentSource: SourceMode = 'emulator';
let lastTowerState: TowerEmulatorState = 'idle';

const STATE_LABEL: Record<TowerEmulatorState, string> = {
  idle: 'Idle',
  advertising: 'Advertising',
  connected: 'Connected',
  error: 'Error',
};

const STATE_CLASS: Record<TowerEmulatorState, string> = {
  idle: 'state-idle',
  advertising: 'state-advertising',
  connected: 'state-connected',
  error: 'state-error',
};

/** Skull drop only applies to sink-capable sources (emulator/mock), and only when connected. */
function skullDropAvailable(): boolean {
  return currentSource !== 'real' && lastTowerState === 'connected';
}

function setTowerState(state: TowerEmulatorState, detail?: string): void {
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

  // The BLE-adapter panel only means something for the emulator (peripheral) source.
  if (mode === 'emulator') {
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

    // Flag a client whose tower has dropped (seen at least once, now down).
    // The server keeps state === 'connected' while the tower is down, so gate on
    // towerLastSeenAt like the alert banner below rather than on state.
    if (!client.towerConnected && client.towerLastSeenAt !== null) {
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

const _transientTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function showTransientFeedback(el: HTMLElement, ok: boolean, message: string): void {
  // Cancel any pending hide for this element so a rapid second message isn't
  // hidden early by the previous message's timer.
  const prev = _transientTimers.get(el);
  if (prev) clearTimeout(prev);
  el.textContent = message;
  el.className = `action-feedback ${ok ? 'feedback-ok' : 'feedback-err'}`;
  el.hidden = false;
  _transientTimers.set(el, setTimeout(() => { el.hidden = true; }, 3000));
}

function setLoggingState(enabled: boolean): void {
  loggingStateDotEl.className = `dot ${enabled ? 'state-connected' : 'state-idle'}`;
  loggingStateLabelEl.textContent = enabled ? 'Active — recording to file' : 'Paused — not recording';
  loggingBadgeEl.textContent = enabled ? 'ON' : 'OFF';
  // Color the badge so the recording state stays obvious when the section is collapsed.
  loggingBadgeEl.className = `badge ${enabled ? 'badge-on' : 'badge-off'}`;
  toggleLoggingBtnEl.textContent = enabled ? 'Pause Logging' : 'Resume Logging';
}

/**
 * Measure the rendered content height and ask main to fit the window to it
 * (main clamps to the display). Called once after layout settles and whenever
 * something changes the page height (collapse toggle, analysis results).
 */
function syncWindowHeight(): void {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  const bodyStyle = getComputedStyle(document.body);
  const pad = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
  const height = Math.ceil(appEl.getBoundingClientRect().height + pad);
  window.darkTowerRelay.resizeContentHeight(height);
}

/** Run syncWindowHeight after the next layout pass (post-DOM-mutation). */
function scheduleWindowSync(): void {
  requestAnimationFrame(syncWindowHeight);
}

// ─── Logs panel (FR-7.3 log viewer) ───────────────────────────────────────────
// Read-only. Analysis runs in main (it has fs); this renders the results.

let _logsFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

function showLogsFeedback(ok: boolean, message: string): void {
  if (_logsFeedbackTimer) { clearTimeout(_logsFeedbackTimer); _logsFeedbackTimer = null; }
  logsFeedbackEl.textContent = message;
  logsFeedbackEl.className = `action-feedback ${ok ? 'feedback-ok' : 'feedback-err'}`;
  logsFeedbackEl.hidden = false;
  _logsFeedbackTimer = setTimeout(() => { logsFeedbackEl.hidden = true; }, 3000);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileOptionLabel(f: LogFileInfo): string {
  const when = f.mtimeMs ? new Date(f.mtimeMs).toLocaleString() : '';
  return `${f.name} · ${formatBytes(f.sizeBytes)}${when ? ` · ${when}` : ''}`;
}

/** List the log files in the app's log dir and (re)populate the two selects. */
async function refreshLogs(): Promise<void> {
  const { sessions, events } = await window.darkTowerRelay.listLogs();

  logsSessionSelectEl.innerHTML = '<option value="">All sessions</option>';
  for (const f of sessions) {
    const opt = document.createElement('option');
    opt.value = f.name;
    opt.textContent = fileOptionLabel(f);
    logsSessionSelectEl.appendChild(opt);
  }

  logsEventSelectEl.innerHTML = '<option value="">— event log —</option>';
  for (const f of events) {
    const opt = document.createElement('option');
    opt.value = f.name;
    opt.textContent = fileOptionLabel(f);
    logsEventSelectEl.appendChild(opt);
  }

  logsHintEl.textContent =
    sessions.length === 0 && events.length === 0
      ? 'No log files yet. Generate some traffic, then Refresh.'
      : `${sessions.length} session file(s), ${events.length} event file(s). Choose one, then Analyze / Load Events.`;
}

function renderAnalysis(result: LogAnalysisResult): void {
  if (!result.ok) {
    logsSummaryEl.hidden = true;
    logsAnomaliesEl.hidden = true;
    logsTimelineEl.hidden = true;
    showLogsFeedback(false, result.reason);
    return;
  }

  // Summary
  const s = result.summary;
  const range =
    s.firstTs && s.lastTs
      ? `${new Date(s.firstTs).toLocaleString()} → ${new Date(s.lastTs).toLocaleTimeString()}`
      : '—';
  const durationStr = `${Math.floor(s.durationMs / 60000)}m ${Math.floor((s.durationMs % 60000) / 1000)}s`;
  const kv: Array<[string, string]> = [
    ['Files', String(result.fileCount)],
    ['Time range', range],
    ['Duration', durationStr],
    ['Entries', `${s.totalEntries} (${s.commandCount} cmd, ${s.eventCount} evt)`],
    ['Sequences', `1 → ${s.maxSeq}`],
    ['Sources', s.sources.join(', ') || '—'],
  ];
  logsSummaryBodyEl.innerHTML = '';
  for (const [k, v] of kv) {
    const row = document.createElement('div');
    row.className = 'logs-kv';
    row.innerHTML = `<span class="logs-k">${escapeHtml(k)}</span><span class="logs-v">${escapeHtml(v)}</span>`;
    logsSummaryBodyEl.appendChild(row);
  }
  logsSummaryEl.hidden = false;

  // Anomalies
  logsAnomalyCountEl.textContent = String(result.anomalies.length);
  logsAnomalyListEl.innerHTML = '';
  if (result.anomalies.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No anomalies detected.';
    logsAnomalyListEl.appendChild(li);
  } else {
    for (const a of result.anomalies) {
      const li = document.createElement('li');
      li.className = 'logs-anomaly';
      li.innerHTML = `<span class="logs-anomaly-type">${escapeHtml(a.type)}</span> ${escapeHtml(a.message)}`;
      logsAnomalyListEl.appendChild(li);
    }
  }
  logsAnomaliesEl.hidden = false;

  // Command timeline
  const { rows, total } = result.timeline;
  logsTimelineMetaEl.textContent =
    rows.length < total ? `showing last ${rows.length} of ${total}` : `${total} command(s)`;
  logsTimelineBodyEl.innerHTML = '';
  if (rows.length === 0) {
    const div = document.createElement('div');
    div.className = 'log-row empty';
    div.textContent = 'No commands in this session.';
    logsTimelineBodyEl.appendChild(div);
  } else {
    for (const r of rows) {
      const div = document.createElement('div');
      div.className = 'log-row';
      const delta = r.deltaMs !== null ? `+${r.deltaMs}ms` : '';
      let html =
        `<span class="log-text">${escapeHtml(r.text)}</span>` +
        `<span class="log-delta">${escapeHtml(delta)}</span>`;
      if (r.extras.length > 0) {
        html += `<span class="log-extra">↳ ${escapeHtml(r.extras.join(' | '))}</span>`;
      }
      div.innerHTML = html;
      logsTimelineBodyEl.appendChild(div);
    }
  }
  logsTimelineEl.hidden = false;
  showLogsFeedback(true, `Analyzed ${result.fileCount} file(s)`);
  scheduleWindowSync();
}

function renderEvents(result: EventLogResult): void {
  if (!result.ok) {
    logsEventsEl.hidden = true;
    showLogsFeedback(false, result.reason);
    return;
  }
  logsEventsMetaEl.textContent = result.truncated
    ? `showing last ${result.events.length} of ${result.total}`
    : `${result.total} event(s)`;
  logsEventsBodyEl.innerHTML = '';
  if (result.events.length === 0) {
    const div = document.createElement('div');
    div.className = 'log-row empty';
    div.textContent = 'No events in this file.';
    logsEventsBodyEl.appendChild(div);
  } else {
    for (const ev of result.events) {
      const div = document.createElement('div');
      div.className = 'log-row';
      const seq = ev.seq !== undefined ? `#${ev.seq}` : '—';
      const time = new Date(ev.timestamp).toLocaleTimeString();
      let payload = '';
      try { payload = JSON.stringify(ev.payload); } catch { payload = ''; }
      if (payload.length > 140) payload = `${payload.slice(0, 137)}…`;
      div.innerHTML =
        `<span class="log-seq">${escapeHtml(seq)}</span>` +
        `<span class="log-time">${escapeHtml(time)}</span>` +
        `<span class="log-type">${escapeHtml(ev.type)}</span>` +
        `<span class="log-payload">${escapeHtml(payload)}</span>`;
      logsEventsBodyEl.appendChild(div);
    }
  }
  logsEventsEl.hidden = false;
  showLogsFeedback(true, `Loaded ${result.total} event(s)`);
  scheduleWindowSync();
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
  if (source === 'emulator') {
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

  // Collapse / expand the whole Logging section (control sits before the title).
  loggingCollapseToggleEl.addEventListener('click', () => {
    const collapsed = loggingSectionEl.classList.toggle('collapsed');
    loggingCollapseToggleEl.setAttribute('aria-expanded', String(!collapsed));
    // Grow / shrink the window to fit the new content height (clamped to screen).
    scheduleWindowSync();
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

  // ── Logs panel ────────────────────────────────────────────────────────────
  logsRefreshBtnEl.addEventListener('click', () => {
    logsRefreshBtnEl.disabled = true;
    refreshLogs()
      .then(() => showLogsFeedback(true, 'Refreshed'))
      .catch((err) => showLogsFeedback(false, err instanceof Error ? err.message : 'Refresh failed'))
      .finally(() => { logsRefreshBtnEl.disabled = false; });
  });

  logsAnalyzeBtnEl.addEventListener('click', () => {
    const session = logsSessionSelectEl.value || null;
    logsAnalyzeBtnEl.disabled = true;
    api.analyzeLogs(session)
      .then(renderAnalysis)
      .catch(() => showLogsFeedback(false, 'IPC error'))
      .finally(() => { logsAnalyzeBtnEl.disabled = false; });
  });

  logsLoadEventsBtnEl.addEventListener('click', () => {
    const file = logsEventSelectEl.value;
    if (!file) { showLogsFeedback(false, 'Choose an event-log file'); return; }
    logsLoadEventsBtnEl.disabled = true;
    api.loadEventLogFile(file)
      .then(renderEvents)
      .catch(() => showLogsFeedback(false, 'IPC error'))
      .finally(() => { logsLoadEventsBtnEl.disabled = false; });
  });

  // Populate the file lists eagerly but GUARDED + non-awaited, so a not-yet-
  // registered handler can't abort init(); the user can always click Refresh.
  void refreshLogs().catch(() => {
    logsHintEl.textContent = 'Click “Refresh” to list log files.';
  });
}

init().catch((err) => console.error('[renderer] init error:', err));

// Fit the window to the rendered content once layout settles (also reveals the
// window — main keeps it hidden until the first measurement to avoid a size jump).
// Runs independently of init() so the window always appears even if init rejects.
requestAnimationFrame(() => requestAnimationFrame(syncWindowHeight));
