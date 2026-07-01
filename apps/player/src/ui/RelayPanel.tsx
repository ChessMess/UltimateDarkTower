import { useEffect, useState } from 'react';
import { selectTarget, simulateRelayDisconnect } from '../game';
import { usePlayerStore } from '../store';
import { connColor, fmtConnState } from '../utils';

type Target = 'emulator' | 'tower';

// The RelayClient treats the sentinel URL 'stub' as "simulate the relay in-process" (no server);
// any other value is a real relay WebSocket URL. We keep that sentinel internal and present the
// choice as Simulated vs Relay server in the UI.
const STUB_URL = 'stub';
const DEFAULT_WS_URL = 'ws://localhost:3000';

// Persisted target preference — defaults to 'emulator', restored across browser refreshes.
const TARGET_PREF_KEY = 'udt-player-target';

function loadTargetPref(): Target {
  try {
    return localStorage.getItem(TARGET_PREF_KEY) === 'tower' ? 'tower' : 'emulator';
  } catch {
    return 'emulator';
  }
}

function saveTargetPref(target: Target): void {
  try {
    localStorage.setItem(TARGET_PREF_KEY, target);
  } catch {
    // storage unavailable (private mode etc.) — preference is just not persisted
  }
}

export function RelayPanel() {
  const phase = usePlayerStore((s) => s.phase);
  const relayConnState = usePlayerStore((s) => s.relayConnState);
  const relayStatus = usePlayerStore((s) => s.relayStatus);
  const relayUrl = usePlayerStore((s) => s.relayUrl);
  const checkpoint = usePlayerStore((s) => s.checkpoint);

  const [target, setTarget] = useState<Target>(loadTargetPref);

  // Connection mode — Simulated (in-app, the default) vs a real relay server (WebSocket URL).
  const [useServer, setUseServer] = useState(relayUrl !== STUB_URL);
  const [serverUrl, setServerUrl] = useState(relayUrl !== STUB_URL ? relayUrl : DEFAULT_WS_URL);

  const chooseSimulated = () => {
    setUseServer(false);
    usePlayerStore.getState().setRelayUrl(STUB_URL);
  };
  const chooseServer = () => {
    setUseServer(true);
    usePlayerStore.getState().setRelayUrl(serverUrl);
  };
  const changeServerUrl = (url: string) => {
    setServerUrl(url);
    usePlayerStore.getState().setRelayUrl(url);
  };

  const showTargetPicker = phase === 'connecting' && relayConnState === 'connected' && !relayStatus?.relaying;
  const isPlaying = phase === 'playing' || phase === 'waiting' || phase === 'ended';
  // Show the target switch until a game is live (lets the preference be set before loading).
  const showTargetSwitch = phase !== 'playing' && phase !== 'ended';

  // Auto-apply the saved preference once the relay reaches the target-picker step.
  useEffect(() => {
    if (showTargetPicker) selectTarget(target);
    // Only re-run when the picker step toggles — not on every preference tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTargetPicker]);

  const changeTarget = (next: Target) => {
    setTarget(next);
    saveTargetPref(next);
    // If we're sitting at the picker step, re-request the newly chosen target immediately.
    if (showTargetPicker) selectTarget(next);
  };

  return (
    <section style={panelStyle}>
      <h3 style={headStyle}>Relay</h3>

      {/* URL + connection state */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connColor(relayConnState),
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, color: connColor(relayConnState), fontWeight: 600 }}>
          {fmtConnState(relayConnState)}
        </span>
        {relayUrl !== STUB_URL && (
          <span style={{ fontSize: 11, color: 'var(--c-text-faint)', marginLeft: 4 }}>{relayUrl}</span>
        )}
        {relayUrl === STUB_URL && (
          <span style={{ fontSize: 11, color: 'var(--c-text-faint)' }}>(simulated)</span>
        )}
      </div>

      {/* Connection mode — only editable before connecting */}
      {(phase === 'idle' || phase === 'error') && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 6 }}>Connection</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={modeBtnStyle(!useServer)} onClick={chooseSimulated}>
              Simulated
            </button>
            <button style={modeBtnStyle(useServer)} onClick={chooseServer}>
              Relay server
            </button>
          </div>
          {useServer ? (
            <input
              type="text"
              placeholder="ws://host:port"
              value={serverUrl}
              onChange={(e) => changeServerUrl(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', marginTop: 6,
                padding: '4px 8px', border: '1px solid var(--c-border-strong)',
                borderRadius: 5, fontSize: 12,
                background: 'var(--c-surface-raised)',
                color: 'var(--c-text)',
              }}
            />
          ) : (
            <div style={{ fontSize: 11, color: 'var(--c-text-faint)', marginTop: 6 }}>
              Runs the relay in-app — no server needed.
            </div>
          )}
        </div>
      )}

      {/* Target switch — persisted preference (default Emulator), applied at the picker step */}
      {showTargetSwitch && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 6 }}>Target</div>
          <TargetSwitch value={target} onChange={changeTarget} />
        </div>
      )}

      {/* Relay status */}
      {relayStatus && (
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 6 }}>
          {relayStatus.relaying ? (
            <>
              {relayStatus.targetKind} · {relayStatus.targetState}
              {relayStatus.calibrated ? (
                <span style={{ color: 'var(--c-success)', marginLeft: 6 }}>✓ calibrated</span>
              ) : (
                <span style={{ color: 'var(--c-warning)', marginLeft: 6 }}>calibrating…</span>
              )}
            </>
          ) : (
            'Not relaying'
          )}
        </div>
      )}

      {/* Checkpoint info */}
      {checkpoint && (
        <div style={{ fontSize: 11, color: 'var(--c-text-faint)', marginTop: 4 }}>
          Checkpoint #{checkpoint.seq} saved
        </div>
      )}

      {/* Gate test helper — simulate disconnect while playing */}
      {isPlaying && relayConnState === 'connected' && (
        <button
          style={{ ...btnStyle, marginTop: 8, fontSize: 11, color: 'var(--c-danger)', borderColor: '#FECACA' }}
          onClick={simulateRelayDisconnect}
        >
          Simulate Disconnect
        </button>
      )}
    </section>
  );
}

// A two-position sliding switch: Emulator (left) ⟷ Real Tower (right).
function TargetSwitch({ value, onChange }: { value: Target; onChange: (t: Target) => void }) {
  const isTower = value === 'tower';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isTower}
      aria-label="Relay target"
      onClick={() => onChange(isTower ? 'emulator' : 'tower')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <span style={{ color: isTower ? 'var(--c-text-faint)' : 'var(--c-primary)' }}>Emulator</span>
      <span
        style={{
          position: 'relative',
          width: 44,
          height: 22,
          flexShrink: 0,
          borderRadius: 999,
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border-strong)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: isTower ? 'calc(100% - 20px)' : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--c-primary)',
            transition: 'left 0.15s ease',
          }}
        />
      </span>
      <span style={{ color: isTower ? 'var(--c-primary)' : 'var(--c-text-faint)' }}>Real Tower</span>
    </button>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'var(--c-surface-raised)',
  border: '1px solid var(--c-border)',
  borderRadius: 8,
  padding: 14,
};

const headStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--c-text-2)',
};

function modeBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '5px 10px',
    borderRadius: 6,
    border: `1px solid ${active ? 'var(--c-primary)' : 'var(--c-border-strong)'}`,
    background: active ? 'var(--c-primary)' : 'var(--c-surface)',
    color: active ? '#fff' : 'var(--c-text-2)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 13,
  cursor: 'pointer',
};
