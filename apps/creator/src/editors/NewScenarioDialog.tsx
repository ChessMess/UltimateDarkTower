import { useState } from 'react';
import { getUDTReferenceLayer } from '@udtc/adapters';
import { scaffoldScenario, type ScaffoldInput } from '../utils/scaffold';
import type { ScenarioDoc } from '../types';

const udt = getUDTReferenceLayer();

const ADVERSARY_OPTIONS = udt.adversaryRoster.map((a) => ({ id: a.id, name: a.name }));
const TIER1_OPTIONS = udt.tier1Foes.map((id) => ({ id: udt.foeById[id]?.id ?? id, name: udt.foeById[id]?.name ?? id }));
const TIER2_OPTIONS = udt.tier2Foes.map((id) => ({ id: udt.foeById[id]?.id ?? id, name: udt.foeById[id]?.name ?? id }));
const TIER3_OPTIONS = udt.tier3Foes.map((id) => ({ id: udt.foeById[id]?.id ?? id, name: udt.foeById[id]?.name ?? id }));
const ALLY_OPTIONS = udt.allies.map((name) => ({ id: name.toLowerCase(), name }));

interface Props {
  onClose: () => void;
  onConfirm: (doc: ScenarioDoc) => void;
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  padding: '5px 9px',
  border: '1px solid #D1D5DB',
  borderRadius: 5,
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle };

export function NewScenarioDialog({ onClose, onConfirm }: Props) {
  const [title, setTitle] = useState('');
  const [designer, setDesigner] = useState('');
  const [mode, setMode] = useState<'coop' | 'competitive'>('coop');
  const [difficultyProfile, setDifficultyProfile] = useState<'heroic' | 'gritty'>('heroic');
  const [skullSupply, setSkullSupply] = useState(24);
  const [monthEndMin, setMonthEndMin] = useState(3);
  const [monthEndMax, setMonthEndMax] = useState(6);
  // Common Options are optional (schema 0.4.1): a rule-variant scenario may omit the standard
  // adversary/foe-tier/main-goal mechanics, so these default to empty rather than the first roster entry.
  const [adversaryId, setAdversaryId] = useState('');
  const [tier1FoeId, setTier1FoeId] = useState('');
  const [tier2FoeId, setTier2FoeId] = useState('');
  const [tier3FoeId, setTier3FoeId] = useState('');
  const [allyId, setAllyId] = useState('');
  const [mainGoalTitle, setMainGoalTitle] = useState('');

  const canCreate = title.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;
    const input: ScaffoldInput = {
      title: title.trim(),
      designer: designer.trim(),
      mode,
      difficultyProfile,
      skullSupply,
      monthEndMin,
      monthEndMax,
      adversaryId: adversaryId || undefined,
      tier1FoeId: tier1FoeId || undefined,
      tier2FoeId: tier2FoeId || undefined,
      tier3FoeId: tier3FoeId || undefined,
      allyId: allyId || undefined,
      mainGoalTitle: mainGoalTitle.trim() || undefined,
    };
    onConfirm(scaffoldScenario(input));
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          width: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>New Scenario</div>

        {/* Identity */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Identity</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My New Scenario" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Designer</label>
              <input style={inputStyle} value={designer} onChange={(e) => setDesigner(e.target.value)} placeholder="Your name" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Mode</label>
              <select style={selectStyle} value={mode} onChange={(e) => setMode(e.target.value as 'coop' | 'competitive')}>
                <option value="coop">Co-op</option>
                <option value="competitive">Competitive</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Difficulty</label>
              <select style={selectStyle} value={difficultyProfile} onChange={(e) => setDifficultyProfile(e.target.value as 'heroic' | 'gritty')}>
                <option value="heroic">Heroic</option>
                <option value="gritty">Gritty</option>
              </select>
            </div>
          </div>
        </section>

        {/* Supply & Time */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Supply & Time</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Skull Supply</label>
              <input style={inputStyle} type="number" min={1} max={99} value={skullSupply} onChange={(e) => setSkullSupply(Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Month Min Turns</label>
              <input style={inputStyle} type="number" min={1} max={monthEndMax} value={monthEndMin} onChange={(e) => setMonthEndMin(Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Month Max Turns</label>
              <input style={inputStyle} type="number" min={monthEndMin} max={20} value={monthEndMax} onChange={(e) => setMonthEndMax(Number(e.target.value))} />
            </div>
          </div>
        </section>

        {/* Common Options — standard-game selections. All optional: leave blank for a rule-variant
            scenario that doesn't use the standard adversary/foe-tier/main-goal mechanics. */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Common Options</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: -4 }}>
            Optional — used by standard scenarios. Leave blank for a custom-rules scenario.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Adversary</label>
              <select style={selectStyle} value={adversaryId} onChange={(e) => setAdversaryId(e.target.value)}>
                <option value="">— None —</option>
                {ADVERSARY_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Ally</label>
              <select style={selectStyle} value={allyId} onChange={(e) => setAllyId(e.target.value)}>
                <option value="">— None —</option>
                {ALLY_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tier 1 Foe</label>
              <select style={selectStyle} value={tier1FoeId} onChange={(e) => setTier1FoeId(e.target.value)}>
                <option value="">— None —</option>
                {TIER1_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tier 2 Foe</label>
              <select style={selectStyle} value={tier2FoeId} onChange={(e) => setTier2FoeId(e.target.value)}>
                <option value="">— None —</option>
                {TIER2_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tier 3 Foe</label>
              <select style={selectStyle} value={tier3FoeId} onChange={(e) => setTier3FoeId(e.target.value)}>
                <option value="">— None —</option>
                {TIER3_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Goal Title</label>
              <input style={inputStyle} value={mainGoalTitle} onChange={(e) => setMainGoalTitle(e.target.value)} placeholder="Defeat the Adversary" />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 18px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#F9FAFB', cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{
              padding: '7px 18px',
              border: '1px solid #2563EB',
              borderRadius: 6,
              background: canCreate ? '#2563EB' : '#9CA3AF',
              color: '#fff',
              cursor: canCreate ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
