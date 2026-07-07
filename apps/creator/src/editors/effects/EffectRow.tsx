// EffectRow — a single effect. Renders a structured per-op form for the common set (op dropdown +
// typed fields), a scope select + nested list for hero.scope (depth-capped), or a raw-JSON textarea
// fallback for every other op / unparseable input. L1 validation (via the store's revalidate) is the
// authority; the red border here is only a local parse hint, matching the old StepEffects textarea.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { EffectListEditor } from './EffectListEditor';
import {
  OP_FORMS,
  RESOURCES,
  KINGDOMS,
  FOE_STATUSES,
  HERO_SCOPES,
  SCOPE_DEPTH_CAP,
  hasStructuredForm,
  defaultEffect,
  coerceFlagValue,
  type FieldSpec,
} from './opForms';

export interface EffectRowProps {
  effect: Record<string, unknown>;
  ops: string[];
  onChange: (effect: unknown) => void;
  onRemove: () => void;
  deckIds: string[];
  foeIds: string[];
  depth: number;
}

export function EffectRow({ effect, ops, onChange, onRemove, deckIds, foeIds, depth }: EffectRowProps) {
  const op = typeof effect.op === 'string' ? effect.op : '';
  const scopeCapped = op === 'hero.scope' && depth >= SCOPE_DEPTH_CAP;
  const structured = hasStructuredForm(op) && !scopeCapped;
  const [jsonMode, setJsonMode] = useState(!structured);

  const changeOp = (nextOp: string) => onChange(defaultEffect(nextOp));

  const setField = (key: string, value: unknown, optional?: boolean) => {
    const next = { ...effect };
    if (optional && (value === '' || value === undefined || value === null)) delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const showJson = jsonMode || !structured;

  return (
    <div style={rowBox}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <select value={op} onChange={(e) => changeOp(e.target.value)} style={opSelect}>
          {!ops.includes(op) && op !== '' && <option value={op}>{op}</option>}
          {ops.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        {hasStructuredForm(op) && !scopeCapped && (
          <button style={toggleBtn} onClick={() => setJsonMode((m) => !m)}>
            {jsonMode ? 'Form' : 'JSON'}
          </button>
        )}
        <button style={dangerBtn} onClick={onRemove} title="Remove effect">
          ✕
        </button>
      </div>

      {!showJson && op === 'hero.scope' && (
        <div style={{ paddingLeft: 8, marginTop: 4, borderLeft: '2px solid var(--c-border)' }}>
          <label style={fieldRow}>
            <span style={fieldLabel}>Scope</span>
            <select
              value={String(effect.scope ?? 'self')}
              onChange={(e) => setField('scope', e.target.value)}
              style={fieldInput}
            >
              {HERO_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div style={{ ...fieldLabel, margin: '4px 0 2px' }}>Effects</div>
          <EffectListEditor
            value={Array.isArray(effect.effects) ? (effect.effects as unknown[]) : []}
            onChange={(effects) => setField('effects', effects)}
            deckIds={deckIds}
            foeIds={foeIds}
            depth={depth + 1}
          />
        </div>
      )}

      {!showJson && op !== 'hero.scope' && (
        <div style={{ paddingLeft: 8, marginTop: 4 }}>
          {(OP_FORMS[op] ?? []).map((f) => (
            <Field
              key={f.key}
              spec={f}
              effect={effect}
              deckIds={deckIds}
              foeIds={foeIds}
              onSet={setField}
            />
          ))}
        </div>
      )}

      {showJson && (
        <JsonField effect={effect} onChange={onChange} />
      )}
    </div>
  );
}

function Field({
  spec,
  effect,
  deckIds,
  foeIds,
  onSet,
}: {
  spec: FieldSpec;
  effect: Record<string, unknown>;
  deckIds: string[];
  foeIds: string[];
  onSet: (key: string, value: unknown, optional?: boolean) => void;
}) {
  const { key, kind, label, min, optional } = spec;
  const raw = effect[key];

  if (kind === 'bool') {
    return (
      <label style={{ ...fieldRow, cursor: 'pointer' }}>
        <span style={fieldLabel}>{label}</span>
        <input type="checkbox" checked={!!raw} onChange={(e) => onSet(key, e.target.checked)} />
      </label>
    );
  }
  if (kind === 'number') {
    return (
      <label style={fieldRow}>
        <span style={fieldLabel}>{label}</span>
        <input
          type="number"
          min={min}
          value={Number(raw ?? min ?? 0)}
          onChange={(e) => onSet(key, Number(e.target.value), optional)}
          style={{ ...fieldInput, width: 70 }}
        />
      </label>
    );
  }
  if (kind === 'resource' || kind === 'kingdom' || kind === 'foeStatus' || kind === 'deck' || kind === 'foe') {
    const options =
      kind === 'resource'
        ? [...RESOURCES]
        : kind === 'kingdom'
          ? [...KINGDOMS]
          : kind === 'foeStatus'
            ? [...FOE_STATUSES]
            : kind === 'deck'
              ? deckIds
              : foeIds;
    const cur = String(raw ?? '');
    return (
      <label style={fieldRow}>
        <span style={fieldLabel}>{label}</span>
        <select value={cur} onChange={(e) => onSet(key, e.target.value, optional)} style={fieldInput}>
          {optional && <option value="">—</option>}
          {cur !== '' && !options.includes(cur) && <option value={cur}>{cur}</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }
  // text
  const isFlagValue = effect.op === 'flag.set' && key === 'value';
  return (
    <label style={fieldRow}>
      <span style={fieldLabel}>{label}</span>
      <input
        type="text"
        value={raw === undefined || raw === null ? '' : String(raw)}
        onChange={(e) => onSet(key, isFlagValue ? coerceFlagValue(e.target.value) : e.target.value, optional)}
        style={{ ...fieldInput, flex: 1 }}
      />
    </label>
  );
}

function JsonField({
  effect,
  onChange,
}: {
  effect: Record<string, unknown>;
  onChange: (effect: unknown) => void;
}) {
  const [bad, setBad] = useState(false);
  return (
    <textarea
      defaultValue={JSON.stringify(effect)}
      rows={2}
      onChange={(e) => {
        try {
          const parsed = JSON.parse(e.target.value || '{}');
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            setBad(false);
            onChange(parsed);
          } else setBad(true);
        } catch {
          setBad(true);
        }
      }}
      style={{
        width: '100%',
        marginTop: 4,
        fontSize: 11,
        fontFamily: 'monospace',
        border: `1px solid ${bad ? 'var(--c-danger)' : 'var(--c-border-strong)'}`,
        borderRadius: 4,
        padding: 4,
        boxSizing: 'border-box',
        resize: 'vertical',
        background: 'var(--c-surface-raised)',
        color: 'var(--c-text)',
      }}
    />
  );
}

const rowBox: CSSProperties = {
  border: '1px solid var(--c-border)',
  borderRadius: 5,
  padding: 6,
  marginBottom: 5,
  background: 'var(--c-surface)',
};
const opSelect: CSSProperties = {
  padding: '3px 4px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  fontSize: 11,
  fontFamily: 'monospace',
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
};
const toggleBtn: CSSProperties = {
  padding: '2px 8px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  background: 'var(--c-surface)',
  color: 'var(--c-text-muted)',
  fontSize: 10,
  cursor: 'pointer',
};
const dangerBtn: CSSProperties = {
  padding: '2px 6px',
  border: '1px solid #FCA5A5',
  borderRadius: 4,
  background: '#FEF2F2',
  color: 'var(--c-danger)',
  fontSize: 11,
  cursor: 'pointer',
};
const fieldRow: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  margin: '3px 0',
};
const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: 'var(--c-text-muted)',
  minWidth: 64,
};
const fieldInput: CSSProperties = {
  padding: '3px 5px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  fontSize: 11,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
};
