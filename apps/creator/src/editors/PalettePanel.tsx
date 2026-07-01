import { useState } from 'react';
import { NODE_CATEGORIES, NODE_KINDS, categoryFor, type NodeKind } from '../types';
import { useCreatorStore } from '../store';
import { useReactFlow } from '@xyflow/react';

const KINDS_BY_PREFIX: Record<string, NodeKind[]> = {};
for (const kind of NODE_KINDS) {
  const prefix = kind.split('.')[0];
  KINDS_BY_PREFIX[prefix] ??= [];
  KINDS_BY_PREFIX[prefix].push(kind);
}

export function PalettePanel() {
  const { schemaDoc, addNode } = useCreatorStore();
  const { getViewport } = useReactFlow();

  // Which category prefixes are currently collapsed. Default: all collapsed.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(NODE_CATEGORIES.map((c) => c.prefix)),
  );

  function toggleCategory(prefix: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    setCollapsed(new Set(NODE_CATEGORIES.map((c) => c.prefix)));
  }

  function handleDragStart(e: React.DragEvent, kind: NodeKind) {
    e.dataTransfer.setData('application/node-kind', kind);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function handleDoubleClick(kind: NodeKind) {
    if (!schemaDoc) return;
    const vp = getViewport();
    // Place near center of visible canvas
    addNode(kind, { x: -vp.x / vp.zoom + 200, y: -vp.y / vp.zoom + 100 });
  }

  return (
    <div
      style={{
        width: 200,
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px 6px',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          color: 'var(--c-text-muted)',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--c-border)',
        }}
      >
        <span>Node Palette</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="palette-allbtn"
            onClick={expandAll}
            title="Expand all categories"
            aria-label="Expand all categories"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m7 6 5 5 5-5" />
              <path d="m7 13 5 5 5-5" />
            </svg>
          </button>
          <button
            type="button"
            className="palette-allbtn"
            onClick={collapseAll}
            title="Collapse all categories"
            aria-label="Collapse all categories"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m17 11-5-5-5 5" />
              <path d="m17 18-5-5-5 5" />
            </svg>
          </button>
        </div>
      </div>

      {!schemaDoc && (
        <div style={{ padding: 12, color: 'var(--c-text-faint)', fontSize: 11, fontStyle: 'italic' }}>
          Load a scenario to add nodes
        </div>
      )}

      {NODE_CATEGORIES.map((cat) => {
        const kinds = KINDS_BY_PREFIX[cat.prefix] ?? [];
        if (kinds.length === 0) return null;
        // `--cat-accent` drives the theme-reactive color-mix() rules in App.css.
        const accentVar = { '--cat-accent': cat.color } as React.CSSProperties;
        const isCollapsed = collapsed.has(cat.prefix);
        return (
          <div key={cat.prefix} className="palette-category" style={accentVar}>
            <div
              className="palette-category-header"
              style={accentVar}
              role="button"
              tabIndex={0}
              aria-expanded={!isCollapsed}
              onClick={() => toggleCategory(cat.prefix)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCategory(cat.prefix);
                }
              }}
            >
              <span className={`palette-chevron${isCollapsed ? '' : ' palette-chevron--open'}`}>▸</span>
              {cat.label}
            </div>
            {!isCollapsed &&
              kinds.map((kind) => {
                const label = kind.split('.')[1];
                return (
                  <div
                    key={kind}
                    className={`palette-item${schemaDoc ? '' : ' palette-item--disabled'}`}
                    style={accentVar}
                    draggable={!!schemaDoc}
                    onDragStart={(e) => handleDragStart(e, kind)}
                    onDoubleClick={() => handleDoubleClick(kind)}
                    title={schemaDoc ? `Drag or double-click to add ${kind}` : 'Load a scenario first'}
                  >
                    {label}
                  </div>
                );
              })}
          </div>
        );
      })}

      <div style={{ padding: '8px 12px', color: 'var(--c-text-faint)', fontSize: 10, marginTop: 'auto', borderTop: '1px solid var(--c-border)' }}>
        Drag to canvas or double-click to add
      </div>
    </div>
  );
}

export function categoryForKind(kind: string) {
  return categoryFor(kind);
}
