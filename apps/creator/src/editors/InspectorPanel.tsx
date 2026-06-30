import { useCallback } from 'react';
import { useCreatorStore } from '../store';
import { categoryFor } from '../types';

export function InspectorPanel() {
  const { schemaDoc, rfNodes, selectedNodeId, validationResults } = useCreatorStore();
  const { updateNodeLabel, updateNodeProps, setEntry, deleteNode } = useCreatorStore();

  const selectedNode = rfNodes.find((n) => n.id === selectedNodeId);
  const sn = selectedNode?.data?.schemaNode;

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (sn) updateNodeLabel(sn.id, e.target.value);
    },
    [sn, updateNodeLabel],
  );

  const handleSetEntry = useCallback(() => {
    if (sn) setEntry(sn.id);
  }, [sn, setEntry]);

  const handleDelete = useCallback(() => {
    if (sn && window.confirm(`Delete node "${sn.id}"?`)) deleteNode(sn.id);
  }, [sn, deleteNode]);

  const nodeErrors = sn
    ? [...(validationResults?.l2.errors ?? []), ...(validationResults?.l3.errors ?? [])].filter(
        (e) => e.includes(`"${sn.id}"`),
      )
    : [];

  const style = {
    panel: {
      width: 260,
      background: '#F8FAFC',
      borderLeft: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column' as const,
      fontSize: 12,
      overflowY: 'auto' as const,
    },
    header: {
      padding: '10px 12px 6px',
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.08em',
      color: '#64748B',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid #E2E8F0',
    },
    section: {
      padding: '10px 12px',
      borderBottom: '1px solid #F1F5F9',
    },
    label: {
      fontSize: 10,
      color: '#94A3B8',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: 4,
    },
    value: {
      fontSize: 12,
      color: '#1E293B',
    },
    input: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid #CBD5E1',
      borderRadius: 4,
      fontSize: 12,
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
    },
    btn: {
      padding: '4px 10px',
      border: '1px solid #CBD5E1',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      background: '#fff',
    },
    btnDanger: {
      padding: '4px 10px',
      border: '1px solid #FCA5A5',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      background: '#FEF2F2',
      color: '#DC2626',
    },
  };

  if (!schemaDoc) {
    return (
      <div style={style.panel}>
        <div style={style.header}>Inspector</div>
        <div style={{ padding: 12, color: '#94A3B8', fontStyle: 'italic', fontSize: 11 }}>
          No scenario loaded
        </div>
      </div>
    );
  }

  if (!sn) {
    return (
      <div style={style.panel}>
        <div style={style.header}>Inspector</div>
        <div style={{ padding: 12, color: '#94A3B8', fontStyle: 'italic', fontSize: 11 }}>
          Select a node to inspect
        </div>

        {/* Scenario meta */}
        <div style={style.section}>
          <div style={style.label}>Scenario</div>
          <div style={{ ...style.value, fontWeight: 700 }}>{schemaDoc.meta.title}</div>
          <div style={{ color: '#64748B', marginTop: 2 }}>v{schemaDoc.meta.scenarioVersion}</div>
          <div style={{ color: '#64748B' }}>by {schemaDoc.meta.designer?.name}</div>
          <div style={{ marginTop: 6, color: '#64748B' }}>Entry: <code>{schemaDoc.graph.entry}</code></div>
          <div style={{ color: '#64748B' }}>{schemaDoc.graph.nodes.length} nodes</div>
        </div>

        {/* L1 errors */}
        {validationResults && validationResults.l1.errors.length > 0 && (
          <div style={{ ...style.section, background: '#FEF2F2' }}>
            <div style={{ ...style.label, color: '#DC2626' }}>L1 Schema Errors</div>
            {validationResults.l1.errors.slice(0, 5).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: '#B91C1C', marginBottom: 2 }}>
                {e}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cat = categoryFor(sn.kind);
  const isEntry = sn.id === schemaDoc.graph.entry;

  return (
    <div style={style.panel}>
      <div style={{ ...style.header, background: cat.bgColor, color: cat.textColor, borderLeft: `3px solid ${cat.color}` }}>
        Inspector — {cat.label}
      </div>

      {nodeErrors.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
          {nodeErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: '#B91C1C' }}>⚠ {e}</div>
          ))}
        </div>
      )}

      <div style={style.section}>
        <div style={style.label}>Kind</div>
        <div style={{ ...style.value, fontFamily: 'monospace' }}>{sn.kind}</div>
      </div>

      <div style={style.section}>
        <div style={style.label}>ID</div>
        <div style={{ ...style.value, fontFamily: 'monospace' }}>{sn.id}</div>
      </div>

      <div style={style.section}>
        <div style={style.label}>Label</div>
        <input
          style={style.input}
          value={sn.label ?? ''}
          onChange={handleLabelChange}
          placeholder="Optional display label"
        />
      </div>

      {sn.props && (
        <div style={style.section}>
          <div style={style.label}>Props</div>
          <pre
            style={{
              fontSize: 10,
              background: '#F1F5F9',
              padding: 8,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 180,
              margin: 0,
              color: '#1E293B',
            }}
          >
            {JSON.stringify(sn.props, null, 2)}
          </pre>
        </div>
      )}

      {sn.wires && Object.keys(sn.wires).length > 0 && (
        <div style={style.section}>
          <div style={style.label}>Wires</div>
          {Object.entries(sn.wires).map(([handle, targets]) => (
            <div key={handle} style={{ fontSize: 11, color: '#1E293B', marginBottom: 2 }}>
              <span style={{ color: cat.color, fontFamily: 'monospace' }}>{handle}</span>
              {' → '}
              <span style={{ fontFamily: 'monospace' }}>{targets.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...style.section, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isEntry && (
          <button style={style.btn} onClick={handleSetEntry} title="Make this the graph entry node">
            Set Entry
          </button>
        )}
        {isEntry && (
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Entry node</span>
        )}
        <button style={style.btnDanger} onClick={handleDelete}>
          Delete
        </button>
      </div>

      {/* Props editor for effect.apply */}
      {sn.kind === 'effect.apply' && (
        <EffectApplyEditor
          sn={sn}
          onUpdate={(props) => updateNodeProps(sn.id, props)}
        />
      )}

      {/* Props editor for tower.op */}
      {sn.kind === 'tower.op' && (
        <TowerOpEditor sn={sn} onUpdate={(props) => updateNodeProps(sn.id, props)} />
      )}
    </div>
  );
}

function EffectApplyEditor({
  sn,
  onUpdate,
}: {
  sn: { props?: Record<string, unknown> };
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const effectsRaw = (sn.props?.effects ?? sn.props?.effect) as unknown;
  const effectsStr = JSON.stringify(effectsRaw ?? [], null, 2);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const parsed = JSON.parse(e.target.value);
        if (Array.isArray(parsed)) {
          onUpdate({ effects: parsed });
        } else {
          onUpdate({ effect: parsed });
        }
      } catch {
        // ignore parse errors while typing
      }
    },
    [onUpdate],
  );

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>
        Edit Effects (JSON)
      </div>
      <textarea
        defaultValue={effectsStr}
        onChange={handleChange}
        rows={6}
        style={{
          width: '100%',
          fontSize: 10,
          fontFamily: 'monospace',
          border: '1px solid #CBD5E1',
          borderRadius: 4,
          padding: 6,
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
      />
    </div>
  );
}

const TOWER_CHANNELS = [
  'skull.dropTrigger', 'light.named', 'sound', 'drum.rotate',
  'seal.break', 'seal.replace', 'wait', 'rotationBundle', 'timeline',
  'light.custom', 'light.effect',
];

function TowerOpEditor({
  sn,
  onUpdate,
}: {
  sn: { props?: Record<string, unknown> };
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const towerOp = sn.props?.towerOp as Record<string, unknown> | undefined;
  const currentChannel = (towerOp?.channel as string) ?? 'skull.dropTrigger';

  const handleChannelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newOp: Record<string, unknown> = { channel: e.target.value };
      onUpdate({ towerOp: newOp });
    },
    [onUpdate],
  );

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>
        Tower Channel
      </div>
      <select
        value={currentChannel}
        onChange={handleChannelChange}
        style={{ width: '100%', padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }}
      >
        {TOWER_CHANNELS.map((ch) => (
          <option key={ch} value={ch}>{ch}</option>
        ))}
      </select>
    </div>
  );
}
