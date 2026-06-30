import { selectTarget, simulateRelayDisconnect } from '../game';
import { usePlayerStore } from '../store';
import { connColor, fmtConnState } from '../utils';

export function RelayPanel() {
  const phase = usePlayerStore((s) => s.phase);
  const relayConnState = usePlayerStore((s) => s.relayConnState);
  const relayStatus = usePlayerStore((s) => s.relayStatus);
  const relayUrl = usePlayerStore((s) => s.relayUrl);
  const checkpoint = usePlayerStore((s) => s.checkpoint);

  const showTargetPicker = phase === 'connecting' && relayConnState === 'connected' && !relayStatus?.relaying;
  const isPlaying = phase === 'playing' || phase === 'waiting' || phase === 'ended';

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
        {relayUrl !== 'stub' && (
          <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>{relayUrl}</span>
        )}
        {relayUrl === 'stub' && (
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>(stub mode)</span>
        )}
      </div>

      {/* URL input — only shown before connecting */}
      {phase === 'idle' || phase === 'error' ? (
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="ws://localhost:3000 or &quot;stub&quot;"
            defaultValue={relayUrl}
            onChange={(e) => usePlayerStore.getState().setRelayUrl(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '4px 8px', border: '1px solid #D1D5DB',
              borderRadius: 5, fontSize: 12,
            }}
          />
        </div>
      ) : null}

      {/* Target picker (shown once relay is connected but target not yet selected) */}
      {showTargetPicker && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Select target:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={() => selectTarget('emulator')}>
              Emulator
            </button>
            <button style={btnStyle} onClick={() => selectTarget('tower')}>
              Real Tower
            </button>
          </div>
        </div>
      )}

      {/* Relay status */}
      {relayStatus && (
        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>
          {relayStatus.relaying ? (
            <>
              {relayStatus.targetKind} · {relayStatus.targetState}
              {relayStatus.calibrated ? (
                <span style={{ color: '#059669', marginLeft: 6 }}>✓ calibrated</span>
              ) : (
                <span style={{ color: '#F59E0B', marginLeft: 6 }}>calibrating…</span>
              )}
            </>
          ) : (
            'Not relaying'
          )}
        </div>
      )}

      {/* Checkpoint info */}
      {checkpoint && (
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
          Checkpoint #{checkpoint.seq} saved
        </div>
      )}

      {/* Gate test helper — simulate disconnect while playing */}
      {isPlaying && relayConnState === 'connected' && (
        <button
          style={{ ...btnStyle, marginTop: 8, fontSize: 11, color: '#DC2626', borderColor: '#FECACA' }}
          onClick={simulateRelayDisconnect}
        >
          Simulate Disconnect
        </button>
      )}
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: 14,
};

const headStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
};

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  background: '#F9FAFB',
  fontSize: 13,
  cursor: 'pointer',
};
