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
        background: '#F8FAFC',
        borderRight: '1px solid #E2E8F0',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
      }}
    >
      <div
        style={{
          padding: '10px 12px 6px',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          color: '#64748B',
          textTransform: 'uppercase',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        Node Palette
      </div>

      {!schemaDoc && (
        <div style={{ padding: 12, color: '#94A3B8', fontSize: 11, fontStyle: 'italic' }}>
          Load a scenario to add nodes
        </div>
      )}

      {NODE_CATEGORIES.map((cat) => {
        const kinds = KINDS_BY_PREFIX[cat.prefix] ?? [];
        if (kinds.length === 0) return null;
        return (
          <div key={cat.prefix} style={{ marginBottom: 2 }}>
            <div
              style={{
                padding: '5px 12px',
                background: cat.bgColor,
                color: cat.textColor,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderLeft: `3px solid ${cat.color}`,
              }}
            >
              {cat.label}
            </div>
            {kinds.map((kind) => {
              const label = kind.split('.')[1];
              return (
                <div
                  key={kind}
                  draggable={!!schemaDoc}
                  onDragStart={(e) => handleDragStart(e, kind)}
                  onDoubleClick={() => handleDoubleClick(kind)}
                  style={{
                    padding: '4px 12px 4px 18px',
                    cursor: schemaDoc ? 'grab' : 'default',
                    color: schemaDoc ? cat.textColor : '#CBD5E1',
                    fontSize: 11,
                    userSelect: 'none',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (schemaDoc) (e.currentTarget as HTMLElement).style.background = cat.bgColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                  title={schemaDoc ? `Drag or double-click to add ${kind}` : 'Load a scenario first'}
                >
                  {label}
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ padding: '8px 12px', color: '#94A3B8', fontSize: 10, marginTop: 'auto', borderTop: '1px solid #E2E8F0' }}>
        Drag to canvas or double-click to add
      </div>
    </div>
  );
}

export function categoryForKind(kind: string) {
  return categoryFor(kind);
}
