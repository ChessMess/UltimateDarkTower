// DungeonListRail — the left rail of the dungeon builder: the dungeon list (library.dungeons) with
// add (validated id) + delete + selection, plus "Import dungeons JSON" (a two-target merge of
// { dungeons, images } — the import-official-maps.mjs output). Mirrors DeckListRail.

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { smallBtn, dangerIconBtn, inputStyle, ID_RE } from './shared';

export interface DungeonListRailProps {
  ids: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onImport: (fragment: Record<string, unknown>) => void;
}

export function DungeonListRail({
  ids,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onImport,
}: DungeonListRailProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [newId, setNewId] = useState('');
  const valid = newId.trim() !== '' && ID_RE.test(newId.trim()) && !ids.includes(newId.trim());

  const add = () => {
    if (!valid) return;
    onAdd(newId.trim());
    setNewId('');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') onImport(parsed);
      } catch {
        // ignore malformed import; L1 validation would flag it anyway
      }
    });
  };

  return (
    <div style={rail}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={sectionTitle}>Dungeons</span>
        <span style={{ flex: 1 }} />
        <button style={{ ...smallBtn, fontSize: 10 }} onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      {ids.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--c-text-faint)', padding: '2px 4px' }}>None yet.</div>
      )}
      {ids.map((id) => (
        <div
          key={id}
          style={{ ...item, ...(id === selectedId ? itemSelected : null) }}
          onClick={() => onSelect(id)}
        >
          <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {id}
          </span>
          <span style={{ flex: 1 }} />
          <button
            style={dangerIconBtn}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="new-dungeon-id"
          style={{ ...inputStyle, flex: 1, borderColor: newId && !valid ? 'var(--c-danger)' : 'var(--c-border-strong)' }}
        />
        <button style={smallBtn} disabled={!valid} onClick={add}>
          +
        </button>
      </div>
    </div>
  );
}

const rail: CSSProperties = {
  width: 220,
  flex: '0 0 220px',
  borderRight: '1px solid var(--c-border)',
  background: 'var(--c-surface)',
  padding: 12,
  overflowY: 'auto',
};
const sectionTitle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.04,
  textTransform: 'uppercase',
  color: 'var(--c-text-faint)',
};
const item: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 7px',
  borderRadius: 5,
  cursor: 'pointer',
  marginBottom: 2,
  border: '1px solid transparent',
};
const itemSelected: CSSProperties = {
  background: 'var(--c-surface-raised)',
  border: '1px solid var(--c-primary)',
};
