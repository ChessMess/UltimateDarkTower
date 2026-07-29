/**
 * Official app bridge controls (PRD-05).
 *
 * Points UTDD at a relay host — `apps/relay-cli` or `apps/relay-electron`, running
 * the BLE tower emulator the official companion app connects to. Once connected,
 * the app drives the tower here: drums, lights and audio arrive as decoded state,
 * and "Drop skull" is reported back so the host synthesizes the notification a
 * real tower would have sent.
 *
 * Without a connection UTDD is unchanged — the player drives the tower by hand.
 */
import { useState } from 'react';
import { useRelay } from '@/lib/hooks';
import type { RelayStatus } from '@/sources/BridgeTowerSource';

const URL_STORAGE_KEY = 'udtd.relayUrl';
const DEFAULT_URL = 'ws://localhost:8765';

/** What the player should read for each connection state. */
function describe(status: RelayStatus): string {
  switch (status.state) {
    case 'disconnected':
      return 'Not connected — you are driving the tower.';
    case 'connecting':
      return 'Connecting…';
    case 'connected':
      return 'Connected — the official app is driving the tower.';
    case 'paused':
      return `Paused — ${status.detail ?? 'the app disconnected from the tower emulator'}. Reconnect it in the app.`;
    case 'reconnecting':
      return `Lost the host — reconnecting (${status.detail ?? ''}).`;
    case 'version-mismatch':
      return `Host speaks a different relay protocol (${status.detail ?? ''}). Reload UTDD after updating.`;
    case 'error':
      return `Could not connect — ${status.detail ?? 'unknown error'}.`;
  }
}

export function BridgePanel() {
  const { status, connect, disconnect } = useRelay();
  const [url, setUrl] = useState(() => localStorage.getItem(URL_STORAGE_KEY) ?? DEFAULT_URL);

  const busy = status.state === 'connecting';
  const live = status.state === 'connected' || status.state === 'paused';

  const onConnect = () => {
    localStorage.setItem(URL_STORAGE_KEY, url);
    void connect(url);
  };

  return (
    <section className="panel">
      <h2>Official app</h2>

      <label>
        Relay host
        <input
          type="url"
          value={url}
          disabled={live || busy}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={DEFAULT_URL}
        />
      </label>

      <button className="tower-drop" onClick={live ? disconnect : onConnect} disabled={busy}>
        {live ? 'Disconnect' : 'Connect'}
      </button>

      <p className={`bridge-status is-${status.state}`}>{describe(status)}</p>

      {/* Someone who is stuck looks here, not in the repo. Relative so it resolves
          both on the Pages deploy (/digital/) and in a local dev server. */}
      <p className="bridge-help">
        <a href="./connecting-the-official-app.html" target="_blank" rel="noreferrer">
          How do I set this up?
        </a>
      </p>
    </section>
  );
}
