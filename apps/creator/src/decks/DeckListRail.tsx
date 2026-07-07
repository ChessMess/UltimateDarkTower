// DeckListRail — the left rail: a "Battle Decks" section (library.battleDefs) and a "Card Decks"
// section (library.decks), each with add (validated id) + delete + selection. "Import decks JSON"
// (battle decks) is moved here from the old BattleDeckEditor; legacy strikes decks keep a read-only
// badge.

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { smallBtn, dangerIconBtn, legacyBadge, inputStyle, ID_RE, type DeckSelection, type DeckKind } from './shared';

export interface DeckListRailProps {
  battleIds: string[];
  legacyBattleIds: Set<string>;
  cardDeckIds: string[];
  selection: DeckSelection | null;
  onSelect: (sel: DeckSelection) => void;
  onAddBattle: (id: string) => void;
  onAddCardDeck: (id: string) => void;
  onRemove: (sel: DeckSelection) => void;
  onImportBattle: (defs: Record<string, unknown>) => void;
}

export function DeckListRail(props: DeckListRailProps) {
  const {
    battleIds,
    legacyBattleIds,
    cardDeckIds,
    selection,
    onSelect,
    onAddBattle,
    onAddCardDeck,
    onRemove,
    onImportBattle,
  } = props;
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') onImportBattle(parsed);
      } catch {
        // ignore malformed import; L1 validation would flag it anyway
      }
    });
  };

  const isSel = (kind: DeckKind, id: string) => selection?.kind === kind && selection.id === id;

  return (
    <div style={rail}>
      <Section
        title="Battle Decks"
        ids={battleIds}
        renderBadge={(id) => (legacyBattleIds.has(id) ? <span style={legacyBadge}>legacy</span> : null)}
        isSelected={(id) => isSel('battle', id)}
        onSelect={(id) => onSelect({ kind: 'battle', id })}
        onRemove={(id) => onRemove({ kind: 'battle', id })}
        onAdd={onAddBattle}
        extra={
          <>
            <button style={{ ...smallBtn, fontSize: 10 }} onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onImport} />
          </>
        }
      />
      <Section
        title="Card Decks"
        ids={cardDeckIds}
        renderBadge={() => null}
        isSelected={(id) => isSel('card', id)}
        onSelect={(id) => onSelect({ kind: 'card', id })}
        onRemove={(id) => onRemove({ kind: 'card', id })}
        onAdd={onAddCardDeck}
      />
    </div>
  );
}

function Section({
  title,
  ids,
  renderBadge,
  isSelected,
  onSelect,
  onRemove,
  onAdd,
  extra,
}: {
  title: string;
  ids: string[];
  renderBadge: (id: string) => React.ReactNode;
  isSelected: (id: string) => boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  extra?: React.ReactNode;
}) {
  const [newId, setNewId] = useState('');
  const valid = newId.trim() !== '' && ID_RE.test(newId.trim()) && !ids.includes(newId.trim());
  const add = () => {
    if (!valid) return;
    onAdd(newId.trim());
    setNewId('');
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={sectionTitle}>{title}</span>
        <span style={{ flex: 1 }} />
        {extra}
      </div>
      {ids.length === 0 && <div style={{ fontSize: 11, color: 'var(--c-text-faint)', padding: '2px 4px' }}>None yet.</div>}
      {ids.map((id) => (
        <div key={id} style={{ ...deckItem, ...(isSelected(id) ? deckItemSelected : null) }} onClick={() => onSelect(id)}>
          <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id}</span>
          {renderBadge(id)}
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
          placeholder="new-deck-id"
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
const deckItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 7px',
  borderRadius: 5,
  cursor: 'pointer',
  marginBottom: 2,
  border: '1px solid transparent',
};
const deckItemSelected: CSSProperties = {
  background: 'var(--c-surface-raised)',
  border: '1px solid var(--c-primary)',
};
