import { useRef } from 'react';
import { golden, goldenFull } from '@udtc/engine';
import { loadGame, startGame, resumeSession, discardSession } from '../game';
import { usePlayerStore } from '../store';

// Human-friendly "saved N ago" for the resume banner.
function relativeTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function LoadPanel() {
  const phase = usePlayerStore((s) => s.phase);
  const validationError = usePlayerStore((s) => s.validationError);
  const validationResults = usePlayerStore((s) => s.validationResults);
  const resumable = usePlayerStore((s) => s.resumable);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = phase === 'validating';

  // The shipped golden scenario is the base-game fidelity build (full turn structure, buildings,
  // events, monthly quests); the compact legacy fixture stays available for regression play.
  function handleLoadSampleScenario() {
    loadGame(goldenFull);
  }

  function handleLoadSampleCompact() {
    loadGame(golden);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const doc = JSON.parse(ev.target?.result as string);
        loadGame(doc);
      } catch {
        usePlayerStore.getState().addLog('Import error: invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <section style={panelStyle}>
      <h3 style={headStyle}>Scenario</h3>

      {/* Resume prompt — a saved in-progress game was found on load (page-refresh recovery) */}
      {resumable && phase === 'idle' && (
        <div style={resumeCardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-2)' }}>
            Resume session?
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', margin: '4px 0 8px' }}>
            {resumable.scenarioName} · checkpoint #{resumable.seq} · saved{' '}
            {relativeTime(resumable.savedAt)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                ...btnStyle,
                background: 'var(--c-primary)',
                color: '#fff',
                borderColor: 'var(--c-primary)',
              }}
              onClick={() => void resumeSession()}
            >
              Resume
            </button>
            <button style={btnStyle} onClick={() => discardSession()}>
              Discard
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button style={scenarioBtnStyle} onClick={handleLoadSampleScenario} disabled={busy}>
          Load Sample Scenario
        </button>
        <button
          style={scenarioBtnStyle}
          onClick={handleLoadSampleCompact}
          disabled={busy}
          title="Compact sample scenario for quick verification"
        >
          Sample (Compact)
        </button>
        <button style={scenarioBtnStyle} onClick={() => fileRef.current?.click()} disabled={busy}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      {phase === 'ready' && (
        <div style={readyCardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-success)' }}>
            Scenario loaded and ready
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', margin: '4px 0 8px' }}>
            Press Start to begin playing.
          </div>
          <button
            style={{
              ...btnStyle,
              background: 'var(--c-primary)',
              color: '#fff',
              borderColor: 'var(--c-primary)',
            }}
            onClick={startGame}
          >
            Start
          </button>
        </div>
      )}

      {validationResults && !validationResults.allOk && (
        <div style={{ marginTop: 8 }}>
          {(['l1', 'l2', 'l3', 'l4'] as const).map((layer) => {
            const r = validationResults[layer];
            if (r.ok) return null;
            return (
              <div key={layer} style={{ color: 'var(--c-danger)', fontSize: 12, marginTop: 2 }}>
                <strong>{layer.toUpperCase()}</strong> {r.errors[0]}
              </div>
            );
          })}
        </div>
      )}
      {validationError && phase === 'error' && (
        <div style={{ color: 'var(--c-danger)', fontSize: 11, marginTop: 6 }}>
          {validationError.split('\n')[0]}
        </div>
      )}
    </section>
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

const resumeCardStyle: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-primary)',
  borderRadius: 6,
  padding: 10,
  marginBottom: 10,
};

const readyCardStyle: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-success)',
  borderRadius: 6,
  padding: 10,
  marginTop: 10,
};

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 13,
  cursor: 'pointer',
};

// Smaller variant for the scenario-loader row (Load Sample Scenario / Sample (Compact) / Import JSON),
// which is too tight for the default button size in the sidebar's fixed width.
const scenarioBtnStyle: React.CSSProperties = {
  ...btnStyle,
  padding: '4px 8px',
  fontSize: 11,
};
