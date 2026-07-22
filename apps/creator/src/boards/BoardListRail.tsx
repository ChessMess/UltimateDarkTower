// BoardListRail — the left rail of the board designer: the board list (library.boards) with add
// (validated id) + delete + selection, plus "Clone RRDT preset". Mirrors DungeonListRail.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ID_RE, dangerIconBtn, inputStyle, primaryBtn, smallBtn } from './shared';

export interface BoardListRailProps {
  ids: string[];
  selectedId: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (id: string) => void;
  onClonePreset: (id: string) => void;
  onRemove: (id: string) => void;
}

export function BoardListRail({
  ids,
  selectedId,
  activeId,
  onSelect,
  onAdd,
  onClonePreset,
  onRemove,
}: BoardListRailProps) {
  const [newId, setNewId] = useState('');
  const trimmed = newId.trim();
  const valid = trimmed !== '' && ID_RE.test(trimmed) && !ids.includes(trimmed);

  const freshPresetId = (): string => {
    let id = 'rtdt-copy';
    let n = 1;
    while (ids.includes(id)) id = `rtdt-copy-${++n}`;
    return id;
  };

  return (
    <div style={rail}>
      <div style={header}>Boards</div>

      <div style={{ padding: 8, borderBottom: '1px solid var(--c-border)' }}>
        <button style={primaryBtn} onClick={() => onClonePreset(freshPresetId())}>
          Clone RTDT Board
        </button>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 6, lineHeight: 1.4 }}>
          A full copy of the built-in board — all 60 locations, anchors and adjacency, ready to
          rename and re-art.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {ids.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--c-text-faint)' }}>
            No custom boards. The game uses the built-in Return to Dark Tower board.
          </div>
        )}
        {ids.map((id) => (
          <div
            key={id}
            style={{
              ...item,
              background: id === selectedId ? 'var(--c-surface-2)' : 'transparent',
            }}
            onClick={() => onSelect(id)}
          >
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {id}
            </span>
            {id === activeId && (
              <span style={activeChip} title="Used in game">
                in game
              </span>
            )}
            <button
              style={dangerIconBtn}
              title="Delete board"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: 8, borderTop: '1px solid var(--c-border)' }}>
        <input
          style={{ ...inputStyle, width: '100%' }}
          placeholder="new-board-id"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) {
              onAdd(trimmed);
              setNewId('');
            }
          }}
        />
        <button
          style={{ ...smallBtn, marginTop: 6, opacity: valid ? 1 : 0.5 }}
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onAdd(trimmed);
            setNewId('');
          }}
        >
          + Add empty board
        </button>
      </div>
    </div>
  );
}

const rail: CSSProperties = {
  width: 200,
  flexShrink: 0,
  borderRight: '1px solid var(--c-border)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--c-surface-0)',
};

const header: CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderBottom: '1px solid var(--c-border)',
};

const item: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  fontSize: 12,
  cursor: 'pointer',
};

const activeChip: CSSProperties = {
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 3,
  background: 'var(--c-accent, #38bdf8)',
  color: '#0b1220',
  fontWeight: 600,
};
