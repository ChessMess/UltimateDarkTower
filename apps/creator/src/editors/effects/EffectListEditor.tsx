// EffectListEditor — a structured editor for an effects[] array. Reused by the deck builder's card
// editor (per battle-card step and per generic card). The op dropdown is the schema's closed op
// enum (single source of truth). Adopting it in InspectorPanel's EffectApplyEditor is a follow-up.

import type { CSSProperties } from 'react';
import { EffectRow } from './EffectRow';
import { getOpEnum, defaultEffect } from './opForms';

const OPS = getOpEnum();

export interface EffectListEditorProps {
  value: unknown[];
  onChange: (effects: unknown[]) => void;
  /** deck ids offered by deck.* fields (battle + generic deck ids) */
  deckIds: string[];
  /** foe ids offered by foe.* fields */
  foeIds: string[];
  /** hero.scope nesting depth (0 at top level) */
  depth?: number;
}

export function EffectListEditor({
  value,
  onChange,
  deckIds,
  foeIds,
  depth = 0,
}: EffectListEditorProps) {
  const effects = Array.isArray(value) ? value : [];
  const setAt = (i: number, eff: unknown) => onChange(effects.map((e, idx) => (idx === i ? eff : e)));
  const removeAt = (i: number) => onChange(effects.filter((_, idx) => idx !== i));
  const add = () => onChange([...effects, defaultEffect('resource.gain')]);

  return (
    <div>
      {effects.map((eff, i) => (
        <EffectRow
          key={i}
          effect={eff && typeof eff === 'object' ? (eff as Record<string, unknown>) : { op: '' }}
          ops={OPS}
          onChange={(e) => setAt(i, e)}
          onRemove={() => removeAt(i)}
          deckIds={deckIds}
          foeIds={foeIds}
          depth={depth}
        />
      ))}
      {effects.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--c-text-faint)', margin: '2px 0 4px' }}>
          No effects.
        </div>
      )}
      <button style={addBtn} onClick={add}>
        + Effect
      </button>
    </div>
  );
}

const addBtn: CSSProperties = {
  padding: '3px 10px',
  border: '1px dashed var(--c-border-strong)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-text-muted)',
  fontSize: 11,
  cursor: 'pointer',
};
