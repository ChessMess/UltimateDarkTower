import { useState } from 'react';
import { handleInput } from '../game';
import { usePlayerStore } from '../store';
import { fmtStatus } from '../utils';
import type { ActionChoice } from '../types';

// ---- Action buttons ----
// The engine's full action vocabulary (RE-Contract §5.3)
const ACTION_BUTTONS: Array<{ id: ActionChoice; label: string }> = [
  { id: 'quest', label: 'Quest' },
  { id: 'battle', label: 'Battle' },
  { id: 'cleanse', label: 'Cleanse' },
  { id: 'reinforce', label: 'Reinforce' },
  { id: 'move', label: 'Move' },
  { id: 'dungeon', label: 'Dungeon' },
  { id: 'trade', label: 'Trade' },
  { id: 'pass', label: 'Pass' },
];

// ---- Sub-components ----

function StatusBar() {
  const engineState = usePlayerStore((s) => s.engineState) as EngineStateShape | null;
  if (!engineState) return null;
  const h = engineState.heroes?.['hero1'];
  const clock = engineState.clock;
  const skulls = engineState.skulls;

  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap', marginBottom: 12 }}>
      <Stat label="Month" value={clock?.month ?? '—'} />
      <Stat label="Turn" value={clock?.turnInMonth ?? '—'} />
      {h && <Stat label="Warriors" value={h.warriors} />}
      {h && <Stat label="Spirit" value={h.spirit} />}
      {h && <Stat label="Corruption" value={h.corruption} color={h.corruption >= 2 ? '#DC2626' : undefined} />}
      {h && <Stat label="Advantages" value={h.advantages} />}
      <Stat label="Skull supply" value={skulls?.supply ?? '—'} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 700, color: color ?? '#111827', lineHeight: 1.2 }}>
        {value}
      </span>
    </div>
  );
}

// Minimal shape for display (engine state is opaque `unknown` in types)
interface EngineStateShape {
  clock?: { month: number; turnInMonth: number };
  heroes?: Record<string, { warriors: number; spirit: number; corruption: number; advantages: number }>;
  skulls?: { supply: number };
  foes?: Array<{ foeId: string; instanceId: string; location: string | null }>;
  adversary?: { foeId: string; spawned: boolean; defeated: boolean };
  outcome?: { status: string; reason: string | null };
}

function ActionInput() {
  const awaiting = usePlayerStore((s) => s.awaiting);
  const phase = usePlayerStore((s) => s.phase);
  if (phase !== 'playing' || !awaiting) return null;

  if (awaiting.id === 'action') {
    const allowed = new Set(awaiting.options?.map((o: { id: string }) => o.id) ?? []);
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={awaitLabelStyle}>Choose action:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACTION_BUTTONS.filter((b) => !allowed.size || allowed.has(b.id)).map((b) => (
            <button
              key={b.id}
              style={actionBtn}
              onClick={() => handleInput({ requestId: 'action', value: b.id, kind: 'decision' })}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (awaiting.id === 'skullCounter') {
    return <SkullInput />;
  }

  if (awaiting.id === 'target') {
    return <TargetInput />;
  }

  if (awaiting.id === 'advantageSpend') {
    return <AdvantageInput />;
  }

  return (
    <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 12 }}>
      Awaiting: <strong>{awaiting.id}</strong>
    </div>
  );
}

function SkullInput() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={awaitLabelStyle}>Skull drop count (observed):</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          min={0}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          style={{ width: 60, padding: '4px 8px', border: '1px solid #D1D5DB', borderRadius: 5, fontSize: 13 }}
        />
        <button
          style={{ ...actionBtn, background: '#3B82F6', color: '#fff', borderColor: '#2563EB' }}
          onClick={() => handleInput({ requestId: 'skullCounter', value: count, kind: 'observed' })}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function TargetInput() {
  const engineState = usePlayerStore((s) => s.engineState) as EngineStateShape | null;
  const foes = engineState?.foes ?? [];
  const adversary = engineState?.adversary;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={awaitLabelStyle}>Choose target:</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {adversary?.spawned && !adversary.defeated && (
          <button
            style={{ ...actionBtn, background: '#7C3AED', color: '#fff', borderColor: '#6D28D9' }}
            onClick={() => handleInput({ requestId: 'target', value: { adversary: true }, kind: 'decision' })}
          >
            Adversary ({adversary.foeId})
          </button>
        )}
        {foes
          .filter((f) => f.location !== null)
          .map((f) => (
            <button
              key={f.instanceId}
              style={actionBtn}
              onClick={() => handleInput({ requestId: 'target', value: { foeId: f.foeId }, kind: 'decision' })}
            >
              {f.foeId}
            </button>
          ))}
      </div>
    </div>
  );
}

function AdvantageInput() {
  const [spend, setSpend] = useState(0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={awaitLabelStyle}>Advantage spend:</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          min={0}
          max={10}
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value))}
          style={{ width: 60, padding: '4px 8px', border: '1px solid #D1D5DB', borderRadius: 5, fontSize: 13 }}
        />
        <button
          style={{ ...actionBtn, background: '#059669', color: '#fff', borderColor: '#047857' }}
          onClick={() => handleInput({ requestId: 'advantageSpend', value: { spend }, kind: 'decision' })}
        >
          Spend
        </button>
        <button
          style={actionBtn}
          onClick={() => handleInput({ requestId: 'advantageSpend', value: { retreat: true }, kind: 'decision' })}
        >
          Retreat
        </button>
      </div>
    </div>
  );
}

function OutcomePanel() {
  const status = usePlayerStore((s) => s.status);
  const engineState = usePlayerStore((s) => s.engineState) as EngineStateShape | null;
  const outcome = engineState?.outcome;

  const won = status === 'won';
  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: 8,
        background: won ? '#ECFDF5' : '#FEF2F2',
        border: `2px solid ${won ? '#059669' : '#DC2626'}`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 36 }}>{won ? '🏆' : '💀'}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: won ? '#059669' : '#DC2626', marginTop: 8 }}>
        {won ? 'Victory!' : 'Defeat'}
      </div>
      {outcome?.reason && (
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{outcome.reason}</div>
      )}
    </div>
  );
}

function EventLog() {
  const log = usePlayerStore((s) => s.log);
  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#374151',
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: 6,
        padding: '8px 10px',
        height: 220,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column-reverse',
      }}
    >
      {log.map((line, i) => (
        <div key={i} style={{ padding: '1px 0', borderBottom: '1px solid #F3F4F6' }}>
          {line}
        </div>
      ))}
    </div>
  );
}

// ---- Main panel ----

export function GamePanel() {
  const phase = usePlayerStore((s) => s.phase);
  const status = usePlayerStore((s) => s.status);
  const awaiting = usePlayerStore((s) => s.awaiting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {phase === 'idle' && (
        <div style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          Load a scenario to begin.
        </div>
      )}

      {phase === 'validating' && (
        <div style={{ color: '#F59E0B', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          Validating…
        </div>
      )}

      {(phase === 'connecting' || phase === 'waiting') && (
        <div style={{ color: '#3B82F6', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          {phase === 'connecting' ? 'Connecting to relay…' : 'Waiting for target calibration…'}
        </div>
      )}

      {phase === 'error' && (
        <div style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
          Validation failed. Check the Scenario panel.
        </div>
      )}

      {(phase === 'playing' || phase === 'ended') && (
        <>
          {/* Status bar */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Game State</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: status === 'won' ? '#059669' : status === 'lost' ? '#DC2626' : '#6B7280',
                }}
              >
                {fmtStatus(status)}
                {awaiting && phase === 'playing' ? ` — awaiting ${awaiting.id}` : ''}
              </span>
            </div>
            <StatusBar />
          </div>

          {/* Input area */}
          {phase === 'playing' && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
              <ActionInput />
            </div>
          )}

          {/* Outcome */}
          {phase === 'ended' && <OutcomePanel />}

          {/* Event log */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Event log</div>
            <EventLog />
          </div>
        </>
      )}

      {/* Log always visible once connected */}
      {(phase === 'connecting' || phase === 'waiting') && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Event log</div>
          <EventLog />
        </div>
      )}
    </div>
  );
}

// ---- Styles ----

const awaitLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6B7280',
  fontWeight: 600,
  marginBottom: 6,
};

const actionBtn: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  background: '#F9FAFB',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 600,
};
