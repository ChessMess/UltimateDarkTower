import { useRef } from 'react';
import { golden } from '@udtc/engine';
import { loadGame } from '../game';
import { usePlayerStore } from '../store';

export function LoadPanel() {
  const phase = usePlayerStore((s) => s.phase);
  const validationError = usePlayerStore((s) => s.validationError);
  const validationResults = usePlayerStore((s) => s.validationResults);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = phase === 'validating';

  function handleLoadGolden() {
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
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnStyle} onClick={handleLoadGolden} disabled={busy}>
          Load Golden
        </button>
        <button style={btnStyle} onClick={() => fileRef.current?.click()} disabled={busy}>
          Import JSON
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
      </div>
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

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 13,
  cursor: 'pointer',
};
