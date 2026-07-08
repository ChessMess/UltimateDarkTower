// DungeonJsonPanel — read-only JSON of the selected dungeon, shown in the right sidebar while the
// Dungeons view is active (mirrors DeckJsonPanel). Selection is mirrored into the store by
// DungeonBuilderView (dungeonSelection); this component only reads it.

import type { CSSProperties } from 'react';
import { useCreatorStore } from '../store';
import { dungeonsOf } from './shared';

export function DungeonJsonPanel() {
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const dungeonSelection = useCreatorStore((s) => s.dungeonSelection);
  const dungeon = dungeonSelection ? dungeonsOf(schemaDoc)[dungeonSelection] : undefined;

  return (
    <div style={wrap}>
      <div style={header}>Dungeon JSON</div>
      {dungeon ? (
        <pre style={pre}>{JSON.stringify(dungeon, null, 2)}</pre>
      ) : (
        <div style={{ padding: 12, fontSize: 12, color: 'var(--c-text-faint)' }}>
          Select a dungeon to view its JSON.
        </div>
      )}
    </div>
  );
}

const wrap: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: 'var(--c-surface)',
};
const header: CSSProperties = {
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.04,
  color: 'var(--c-text-faint)',
  borderBottom: '1px solid var(--c-border)',
};
const pre: CSSProperties = {
  margin: 0,
  padding: 12,
  fontSize: 11,
  fontFamily: 'monospace',
  color: 'var(--c-text-2)',
  overflow: 'auto',
  whiteSpace: 'pre',
};
