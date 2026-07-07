// CardGrid — the center zone: a wrap grid of CardFace thumbnails for the selected deck, with a copies
// badge and click-to-select, plus a "+ Card" tile. Legacy (read-only) decks omit the add tile.

import type { CSSProperties } from 'react';
import { CardFace, type CardFaceData } from '@udtc/card-render';

export interface CardTile {
  key: string;
  face: CardFaceData;
  copies?: number;
}

export interface CardGridProps {
  tiles: CardTile[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onAdd?: () => void;
}

const THUMB_W = 150;

export function CardGrid({ tiles, selectedKey, onSelect, onAdd }: CardGridProps) {
  return (
    <div style={grid}>
      {tiles.map((t) => (
        <div
          key={t.key}
          style={{ ...tileBox, ...(t.key === selectedKey ? tileSelected : null) }}
          onClick={() => onSelect(t.key)}
        >
          <CardFace data={t.face} width={THUMB_W} />
          {t.copies !== undefined && t.copies > 1 && <span style={copiesBadge}>×{t.copies}</span>}
        </div>
      ))}
      {onAdd && (
        <button style={addTile} onClick={onAdd} title="Add a card">
          <span style={{ fontSize: 34, lineHeight: 1 }}>+</span>
          <span style={{ fontSize: 11 }}>Card</span>
        </button>
      )}
      {tiles.length === 0 && !onAdd && (
        <div style={{ fontSize: 12, color: 'var(--c-text-faint)', padding: 16 }}>No cards.</div>
      )}
    </div>
  );
}

const grid: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 14,
  padding: 16,
  alignContent: 'flex-start',
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
};
const tileBox: CSSProperties = {
  position: 'relative',
  padding: 4,
  borderRadius: 10,
  border: '2px solid transparent',
  cursor: 'pointer',
};
const tileSelected: CSSProperties = {
  border: '2px solid var(--c-primary)',
  background: 'var(--c-surface)',
};
const copiesBadge: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  background: 'var(--c-topbar-bg)',
  color: 'var(--c-topbar-fg)',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 10,
  padding: '1px 7px',
};
const addTile: CSSProperties = {
  width: THUMB_W,
  height: Math.round(THUMB_W * (1050 / 750)),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: '2px dashed var(--c-border-strong)',
  borderRadius: 10,
  background: 'transparent',
  color: 'var(--c-text-muted)',
  cursor: 'pointer',
};
