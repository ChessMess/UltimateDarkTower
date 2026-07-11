// DeckHeader — the selected deck's shared presentation controls (back image, front template, accent)
// with a live CardBack preview. Battle decks also show foe→deck assignment rows (moved from the old
// BattleDeckEditor); generic decks show category + marketSize. Legacy strikes decks are read-only.

import type { CSSProperties } from 'react';
import { CardBack } from '@udtc/card-render';
import type { ScenarioDoc } from '../types';
import { ImagePicker } from './ImagePicker';
import {
  TEMPLATES,
  DECK_CATEGORIES,
  DEFAULT_ACCENT,
  inputStyle,
  labelStyle,
  smallBtn,
  resolveImage,
  type Appearance,
  type DeckSelection,
} from './shared';

export interface DeckHeaderProps {
  doc: ScenarioDoc | null;
  selection: DeckSelection;
  appearance: Appearance | undefined;
  onAppearanceChange: (a: Appearance | undefined) => void;
  images: Record<string, string>;
  onManageImages: () => void;
  legacy: boolean;
  // battle-only
  foeIds?: string[];
  foeAssignments?: Record<string, string | undefined>;
  battleDeckIds?: string[];
  onAssignFoe?: (foeId: string, defId: string | null) => void;
  // generic-only
  category?: string;
  marketSize?: number;
  onCategoryChange?: (cat: string) => void;
  onMarketSizeChange?: (n: number | undefined) => void;
}

export function DeckHeader(props: DeckHeaderProps) {
  const { doc, selection, appearance, onAppearanceChange, images, onManageImages, legacy } = props;

  const patch = (p: Partial<Appearance>) => {
    const next: Appearance = { ...(appearance ?? {}), ...p };
    if (!next.backRef) delete next.backRef;
    if (!next.template) delete next.template;
    if (!next.accent) delete next.accent;
    onAppearanceChange(Object.keys(next).length ? next : undefined);
  };

  return (
    <div style={header}>
      <div style={{ display: 'flex', gap: 16 }}>
        <CardBack
          backUrl={resolveImage(doc, appearance?.backRef)}
          accent={appearance?.accent}
          width={108}
          label={selection.id}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{selection.id}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 8 }}>
            {selection.kind === 'battle' ? 'Battle deck (card ladder)' : 'Card deck'}
            {legacy ? ' · legacy strikes (read-only)' : ''}
          </div>

          {legacy ? (
            <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
              This deck uses the legacy strikes format. Remove and re-create it to author a card-ladder deck
              with art.
            </div>
          ) : (
            <>
              <div style={labelStyle}>Card Back</div>
              <ImagePicker
                images={images}
                value={appearance?.backRef}
                onChange={(key) => patch({ backRef: key })}
                onManage={onManageImages}
                label="none"
              />

              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div>
                  <div style={labelStyle}>Template</div>
                  <select
                    value={appearance?.template ?? ''}
                    onChange={(e) => patch({ template: (e.target.value || undefined) as Appearance['template'] })}
                    style={inputStyle}
                  >
                    <option value="">classic (default)</option>
                    {TEMPLATES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Accent</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={appearance?.accent ?? DEFAULT_ACCENT}
                      onChange={(e) => patch({ accent: e.target.value })}
                      style={{ width: 34, height: 26, padding: 0, border: '1px solid var(--c-border-strong)', borderRadius: 4, background: 'none' }}
                    />
                    {appearance?.accent && (
                      <button style={smallBtn} onClick={() => patch({ accent: undefined })}>
                        clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* generic deck: category + marketSize */}
      {selection.kind === 'card' && (
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div>
            <div style={labelStyle}>Category</div>
            <select
              value={props.category ?? 'treasure'}
              onChange={(e) => props.onCategoryChange?.(e.target.value)}
              style={inputStyle}
            >
              {DECK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Market Size</div>
            <input
              type="number"
              min={0}
              value={props.marketSize ?? ''}
              placeholder="—"
              onChange={(e) => props.onMarketSizeChange?.(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))}
              style={{ ...inputStyle, width: 80 }}
            />
          </div>
        </div>
      )}

      {/* battle deck: foe → deck assignment */}
      {selection.kind === 'battle' && props.foeIds && props.foeIds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={labelStyle}>Foe → Deck</div>
          {props.foeIds.map((foeId) => (
            <div key={foeId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 11, flex: 1 }}>{foeId}</span>
              <select
                value={props.foeAssignments?.[foeId] ?? ''}
                onChange={(e) => props.onAssignFoe?.(foeId, e.target.value || null)}
                style={inputStyle}
              >
                <option value="">(defaults to foe id)</option>
                {(props.battleDeckIds ?? []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const header: CSSProperties = {
  padding: 14,
  borderBottom: '1px solid var(--c-border)',
  background: 'var(--c-surface)',
};
