// CardEditorPanel — the right zone: the structured editor for the selected card plus a live CardFace
// preview. Battle cards edit name/advantage/critical/copies/note/artRef + a step ladder (text +
// EffectListEditor per step, with a per-step preview selector). Generic cards edit
// name/type/description/flavor/artRef + effects. Legacy decks are read-only.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { CardFace } from '@udtc/card-render';
import type { ScenarioDoc } from '../types';
import { EffectListEditor } from '../editors/effects';
import { ImagePicker } from './ImagePicker';
import {
  ADVANTAGES,
  inputStyle,
  labelStyle,
  smallBtn,
  dangerBtn,
  dangerIconBtn,
  ladderToFace,
  genericToFace,
  type Appearance,
  type DeckSelection,
  type LadderCard,
  type LadderStep,
  type GenericCard,
} from './shared';

export interface CardEditorPanelProps {
  doc: ScenarioDoc | null;
  selection: DeckSelection;
  appearance: Appearance | undefined;
  images: Record<string, string>;
  onManageImages: () => void;
  deckIds: string[];
  foeIds: string[];
  onRemove: () => void;
  legacy: boolean;
  battleCard?: LadderCard;
  onBattleCardChange?: (card: LadderCard) => void;
  genericCard?: GenericCard;
  copies?: number;
  onGenericCardChange?: (card: GenericCard) => void;
  onCopiesChange?: (n: number) => void;
}

const PREVIEW_W = 260;

export function CardEditorPanel(props: CardEditorPanelProps) {
  if (props.legacy) {
    return <div style={panel}>Legacy strikes decks are read-only.</div>;
  }
  if (props.selection.kind === 'battle' && props.battleCard && props.onBattleCardChange) {
    return <BattleCardEditor {...props} card={props.battleCard} onChange={props.onBattleCardChange} />;
  }
  if (props.selection.kind === 'card' && props.genericCard && props.onGenericCardChange) {
    return <GenericCardEditor {...props} card={props.genericCard} onChange={props.onGenericCardChange} />;
  }
  return <div style={panel}>Select a card to edit, or add one with the “+ Card” tile.</div>;
}

function BattleCardEditor(
  props: CardEditorPanelProps & { card: LadderCard; onChange: (c: LadderCard) => void },
) {
  const { doc, appearance, images, onManageImages, deckIds, foeIds, onRemove, card, onChange } = props;
  const steps = card.steps ?? [];
  const [previewStep, setPreviewStep] = useState(0);
  const clampStep = Math.min(previewStep, Math.max(0, steps.length - 1));

  const patch = (p: Partial<LadderCard>) => onChange({ ...card, ...p });
  const setSteps = (next: LadderStep[]) => onChange({ ...card, steps: next });
  const patchStep = (i: number, p: Partial<LadderStep>) =>
    setSteps(steps.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  return (
    <div style={panel}>
      <Preview>
        <CardFace data={ladderToFace(doc, card, appearance, clampStep)} width={PREVIEW_W} />
        {steps.length > 1 && (
          <div style={stepPips}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setPreviewStep(i)}
                title={`Preview step ${i}`}
                style={{ ...pip, ...(i === clampStep ? pipActive : null) }}
              />
            ))}
          </div>
        )}
      </Preview>

      <Field label="Name">
        <input value={card.name ?? ''} onChange={(e) => patch({ name: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Advantage">
          <select value={card.advantage ?? ''} onChange={(e) => patch({ advantage: e.target.value })} style={inputStyle}>
            <option value="">—</option>
            {ADVANTAGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Copies">
          <input
            type="number"
            min={1}
            value={card.copies ?? 1}
            onChange={(e) => patch({ copies: Math.max(1, Number(e.target.value)) })}
            style={{ ...inputStyle, width: 60 }}
          />
        </Field>
      </div>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, margin: '8px 0' }}>
        <input type="checkbox" checked={!!card.critical} onChange={(e) => patch({ critical: e.target.checked })} />
        critical (red styling)
      </label>
      <Field label="Note">
        <input value={card.note ?? ''} onChange={(e) => patch({ note: e.target.value || undefined })} style={{ ...inputStyle, width: '100%' }} />
      </Field>
      <Field label="Art">
        <ImagePicker images={images} value={card.artRef} onChange={(k) => patch({ artRef: k })} onManage={onManageImages} />
      </Field>

      <div style={labelStyle}>Steps (worst → best)</div>
      {steps.map((step, i) => (
        <div key={i} style={stepBox}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--c-text-muted)', width: 12 }}>{i}</span>
            <input
              value={step.text ?? ''}
              placeholder="Display text"
              onChange={(e) => patchStep(i, { text: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button style={dangerIconBtn} onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </div>
          <EffectListEditor
            value={step.effects ?? []}
            onChange={(effects) => patchStep(i, { effects })}
            deckIds={deckIds}
            foeIds={foeIds}
          />
        </div>
      ))}
      <button style={smallBtn} onClick={() => setSteps([...steps, { text: '' }])}>
        + Step
      </button>

      <div style={{ marginTop: 16, borderTop: '1px solid var(--c-border)', paddingTop: 10 }}>
        <button style={dangerBtn} onClick={onRemove}>
          Delete card
        </button>
      </div>
    </div>
  );
}

function GenericCardEditor(
  props: CardEditorPanelProps & { card: GenericCard; onChange: (c: GenericCard) => void },
) {
  const { doc, appearance, images, onManageImages, deckIds, foeIds, onRemove, card, onChange, copies, onCopiesChange } = props;
  const patch = (p: Partial<GenericCard>) => onChange({ ...card, ...p });

  return (
    <div style={panel}>
      <Preview>
        <CardFace data={genericToFace(doc, card, appearance)} width={PREVIEW_W} />
      </Preview>

      <Field label="Id">
        <input value={card.id} readOnly style={{ ...inputStyle, width: '100%', color: 'var(--c-text-muted)' }} />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Name">
          <input value={card.name ?? ''} onChange={(e) => patch({ name: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
        </Field>
        <Field label="Type">
          <input value={card.type ?? ''} onChange={(e) => patch({ type: e.target.value })} style={{ ...inputStyle, width: 100 }} />
        </Field>
      </div>
      {onCopiesChange && (
        <Field label="Copies in deck">
          <input
            type="number"
            min={1}
            value={copies ?? 1}
            onChange={(e) => onCopiesChange(Math.max(1, Number(e.target.value)))}
            style={{ ...inputStyle, width: 60 }}
          />
        </Field>
      )}
      <Field label="Description">
        <textarea
          value={card.description ?? ''}
          onChange={(e) => patch({ description: e.target.value || undefined })}
          rows={2}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </Field>
      <Field label="Flavor">
        <input value={card.flavor ?? ''} onChange={(e) => patch({ flavor: e.target.value || undefined })} style={{ ...inputStyle, width: '100%' }} />
      </Field>
      <Field label="Art">
        <ImagePicker images={images} value={card.artRef} onChange={(k) => patch({ artRef: k })} onManage={onManageImages} />
      </Field>

      <div style={labelStyle}>Effects (applied on resolve)</div>
      <EffectListEditor
        value={card.effects ?? []}
        onChange={(effects) => patch({ effects })}
        deckIds={deckIds}
        foeIds={foeIds}
      />

      <div style={{ marginTop: 16, borderTop: '1px solid var(--c-border)', paddingTop: 10 }}>
        <button style={dangerBtn} onClick={onRemove}>
          Remove card from deck
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
      {children}
    </div>
  );
}

const panel: CSSProperties = {
  width: 340,
  flex: '0 0 340px',
  borderLeft: '1px solid var(--c-border)',
  background: 'var(--c-surface)',
  padding: 14,
  overflowY: 'auto',
};
const stepBox: CSSProperties = {
  border: '1px solid var(--c-border)',
  borderRadius: 5,
  padding: 6,
  marginBottom: 6,
  background: 'var(--c-surface-raised)',
};
const stepPips: CSSProperties = { display: 'flex', gap: 5, marginTop: 8 };
const pip: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '1px solid var(--c-border-strong)',
  background: 'var(--c-surface)',
  cursor: 'pointer',
  padding: 0,
};
const pipActive: CSSProperties = { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' };
