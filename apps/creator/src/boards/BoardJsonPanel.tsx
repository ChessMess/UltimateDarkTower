// BoardJsonPanel — read-only JSON of the selected board, shown in the right sidebar while the
// Boards view is active (mirrors DungeonJsonPanel). Selection is mirrored into the store by
// BoardBuilderView (boardSelection); this component only reads it.

import type { CSSProperties } from 'react';
import { useCreatorStore } from '../store';
import { boardsOf } from './shared';

export function BoardJsonPanel() {
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const boardSelection = useCreatorStore((s) => s.boardSelection);
  const board = boardSelection ? boardsOf(schemaDoc)[boardSelection] : undefined;

  return (
    <div style={wrap}>
      <div style={header}>Board JSON</div>
      {board ? (
        <pre style={pre}>{JSON.stringify(board, null, 2)}</pre>
      ) : (
        <div style={{ padding: 12, fontSize: 12, color: 'var(--c-text-faint)' }}>
          Select a board to view its JSON.
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
};

const header: CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderBottom: '1px solid var(--c-border)',
};

const pre: CSSProperties = {
  margin: 0,
  padding: 10,
  fontSize: 10,
  lineHeight: 1.45,
  overflow: 'auto',
  flex: 1,
  minHeight: 0,
  color: 'var(--c-text-muted)',
};
