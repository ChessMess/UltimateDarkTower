/**
 * app.ts — throwaway browser harness for FR-5.2 PhysicalTowerReplay E2E.
 * NOT shipped code; bundled with esbuild and served over http://localhost for a
 * manual validation against a real tower. It is the exact wiring documented in
 * docs/API.md / docs/GETTING_STARTED.md: RelayClient (transport) +
 * PhysicalTowerReplay (mirror writes) + UltimateDarkTower (Web Bluetooth local tower).
 */

import { RelayClient, PhysicalTowerReplay, type RelayClientEvent } from 'ultimatedarktowerrelay-client';
import { UltimateDarkTower } from 'ultimatedarktower';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

const urlInput = $('url') as HTMLInputElement;
const hostBtn = $('host') as HTMLButtonElement;
const towerBtn = $('tower') as HTMLButtonElement;
const logEl = $('log');

function log(message: string): void {
  const time = new Date().toLocaleTimeString();
  logEl.textContent = `${time}  ${message}\n` + logEl.textContent;
}

let client: RelayClient | null = null;

// The consumer under test. onLog surfaces every write attempt's result.
const replay = new PhysicalTowerReplay({
  onLog: (message, error) => log(error ? `⚠ ${message}: ${String(error)}` : `🗼 ${message}`),
});

hostBtn.addEventListener('click', () => void connectHost());
towerBtn.addEventListener('click', () => void connectTower());

async function connectHost(): Promise<void> {
  hostBtn.disabled = true;
  client = new RelayClient({
    label: 'replay-e2e',
    observer: false,
    onEvent: (ev: RelayClientEvent) => {
      replay.handleEvent(ev); // ← the feature under test
      logRelayEvent(ev);
    },
  });
  try {
    log(`connecting to host ${urlInput.value} …`);
    await client.connect(urlInput.value);
    towerBtn.disabled = false;
  } catch (err) {
    log(`✗ host connect failed: ${String(err)}`);
    hostBtn.disabled = false;
  }
}

async function connectTower(): Promise<void> {
  towerBtn.disabled = true;
  const t = new UltimateDarkTower();

  // Lifecycle callbacks assigned BEFORE connect/calibrate so they fire.
  t.onTowerDisconnect = () => {
    log('tower disconnected — replay gated off');
    replay.setTower(null);
    client?.sendReady(false);
    towerBtn.disabled = false;
    towerBtn.textContent = 'Connect to Tower (Bluetooth)';
  };
  t.onCalibrationComplete = () => {
    log('tower calibrated ✓ — ready; self-healing with last command');
    replay.setTower(t);
    client?.sendReady(true);
    void replay.replayLast(); // re-sync a tower that (re)joined mid-session
  };

  try {
    log('requesting Bluetooth device — approve the browser prompt…');
    await t.connect();
    if (!t.isConnected) {
      log('✗ tower connection not established');
      towerBtn.disabled = false;
      return;
    }
    towerBtn.textContent = 'Connected — calibrating…';
    log('tower connected — calibrating…');
    await t.calibrate();
    towerBtn.textContent = 'Connected to Tower';
  } catch (err) {
    log(`✗ tower connect/calibrate failed: ${String(err)}`);
    towerBtn.disabled = false;
    towerBtn.textContent = 'Connect to Tower (Bluetooth)';
  }
}

function logRelayEvent(ev: RelayClientEvent): void {
  switch (ev.type) {
    case 'relay:connected':
      log('✓ connected to host relay');
      hostBtn.textContent = 'Connected to Host';
      break;
    case 'relay:disconnected':
      log(`host disconnected (code ${ev.code})`);
      break;
    case 'tower:command':
      log(`◀ relayed command (seq ${ev.seq})  [${ev.data.slice(0, 4).join(', ')}…]`);
      break;
    case 'sync:state':
      log(ev.lastCommand ? '◀ sync:state (caught up to current state)' : '◀ sync:state (none yet)');
      break;
    case 'relay:reconnecting':
      log(`reconnecting (attempt ${ev.attempt})…`);
      break;
    default:
      break;
  }
}
