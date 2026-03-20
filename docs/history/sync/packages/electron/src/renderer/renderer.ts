import type { FakeTowerState, ConnectedClient } from '@dark-tower-sync/shared';

// ─── Window type augmentation ─────────────────────────────────────────────────

interface DarkTowerSyncAPI {
  getVersion(): Promise<string>;
  onTowerState(cb: (payload: { state: FakeTowerState }) => void): () => void;
  onRelayClientChange(cb: (payload: { clients: ConnectedClient[] }) => void): () => void;
  onTowerCommand(cb: (payload: { count: number; lastAt: string }) => void): () => void;
}

declare global {
  interface Window {
    darkTowerSync: DarkTowerSyncAPI;
  }
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const versionEl = document.getElementById('version') as HTMLSpanElement;
const towerStateEl = document.getElementById('tower-state') as HTMLSpanElement;
const towerStateDotEl = document.getElementById('tower-state-dot') as HTMLSpanElement;
const clientCountEl = document.getElementById('client-count') as HTMLSpanElement;
const clientListEl = document.getElementById('client-list') as HTMLUListElement;
const commandCountEl = document.getElementById('command-count') as HTMLSpanElement;
const lastCommandAtEl = document.getElementById('last-command-at') as HTMLSpanElement;

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

function setTowerState(state: FakeTowerState): void {
  towerStateEl.textContent = STATE_LABEL[state] ?? state;
  towerStateDotEl.className = `dot ${STATE_CLASS[state] ?? ''}`;
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
    li.textContent = client.label ? `${client.label} (${client.id})` : client.id;
    clientListEl.appendChild(li);
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const api = window.darkTowerSync;

  const version = await api.getVersion();
  versionEl.textContent = `v${version}`;

  // Initial render defaults.
  setTowerState('idle');
  setClients([]);

  api.onTowerState(({ state }) => setTowerState(state));

  api.onRelayClientChange(({ clients }) => setClients(clients));

  api.onTowerCommand(({ count, lastAt }) => {
    commandCountEl.textContent = String(count);
    lastCommandAtEl.textContent = formatTimestamp(lastAt);
  });
}

init().catch((err) => console.error('[renderer] init error:', err));
