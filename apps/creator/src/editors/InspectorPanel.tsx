import { useCallback } from 'react';
import { useCreatorStore } from '../store';
import { categoryFor } from '../types';
import { errorMentionsNode } from '../utils/nodeErrors';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { GroupEditor } from './inspector/GroupEditor';
import { ScenarioSetupEditor } from './inspector/ScenarioSetupEditor';
import { NODE_EDITORS } from './inspector/registry';

export function InspectorPanel() {
  // Narrow selectors (one field each) — this panel used to subscribe to the whole store twice.
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const rfNodes = useCreatorStore((s) => s.rfNodes);
  const selectedNodeId = useCreatorStore((s) => s.selectedNodeId);
  const validationResults = useCreatorStore((s) => s.validationResults);
  const updateNodeLabel = useCreatorStore((s) => s.updateNodeLabel);
  const updateNodeProps = useCreatorStore((s) => s.updateNodeProps);
  const updateNodeDescription = useCreatorStore((s) => s.updateNodeDescription);
  const updateScenarioDescription = useCreatorStore((s) => s.updateScenarioDescription);
  const updateSetupSelections = useCreatorStore((s) => s.updateSetupSelections);
  const updateMainGoal = useCreatorStore((s) => s.updateMainGoal);
  const setEntry = useCreatorStore((s) => s.setEntry);
  const deleteNode = useCreatorStore((s) => s.deleteNode);
  const syncLibraryHeroes = useCreatorStore((s) => s.syncLibraryHeroes);
  const setCenterView = useCreatorStore((s) => s.setCenterView);
  const setDungeonSelection = useCreatorStore((s) => s.setDungeonSelection);

  const selectedNode = rfNodes.find((n) => n.id === selectedNodeId);
  const sn = selectedNode?.data?.schemaNode;

  const lib = (schemaDoc?.library as Record<string, unknown> | undefined) ?? {};
  const battleDeckCount = Object.keys((lib.battleDefs as Record<string, unknown>) ?? {}).length;
  const cardDeckCount = Object.keys((lib.decks as Record<string, unknown>) ?? {}).length;

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (sn) updateNodeLabel(sn.id, e.target.value);
    },
    [sn, updateNodeLabel],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (sn) updateNodeDescription(sn.id, e.target.value);
    },
    [sn, updateNodeDescription],
  );

  const handleScenarioDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateScenarioDescription(e.target.value);
    },
    [updateScenarioDescription],
  );

  const handleSetEntry = useCallback(() => {
    if (sn) setEntry(sn.id);
  }, [sn, setEntry]);

  const handleDelete = useCallback(() => {
    if (sn && window.confirm(`Delete node "${sn.id}"?`)) deleteNode(sn.id);
  }, [sn, deleteNode]);

  const nodeErrors = sn
    ? [...(validationResults?.l2.errors ?? []), ...(validationResults?.l3.errors ?? [])].filter(
        (e) => errorMentionsNode(e, sn.id),
      )
    : [];

  const style = {
    panel: {
      width: 260,
      background: 'var(--c-surface)',
      borderLeft: '1px solid var(--c-border)',
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
      color: 'var(--c-text-muted)',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid var(--c-border)',
    },
    section: {
      padding: '10px 12px',
      borderBottom: '1px solid var(--c-border)',
    },
    label: {
      fontSize: 10,
      color: 'var(--c-text-faint)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: 4,
    },
    value: {
      fontSize: 12,
      color: 'var(--c-text)',
    },
    input: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid var(--c-border-strong)',
      borderRadius: 4,
      fontSize: 12,
      fontFamily: 'inherit',
      background: 'var(--c-surface-raised)',
      color: 'var(--c-text)',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid var(--c-border-strong)',
      borderRadius: 4,
      fontSize: 12,
      fontFamily: 'inherit',
      background: 'var(--c-surface-raised)',
      color: 'var(--c-text)',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
    },
    btn: {
      padding: '4px 10px',
      border: '1px solid var(--c-border-strong)',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      background: 'var(--c-surface-raised)',
      color: 'var(--c-text-2)',
    },
    btnDanger: {
      padding: '4px 10px',
      border: '1px solid #FCA5A5',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      background: '#FEF2F2',
      color: 'var(--c-danger)',
    },
  };

  if (!schemaDoc) {
    return (
      <div style={style.panel}>
        <div style={style.header}>Inspector</div>
        <div
          style={{ padding: 12, color: 'var(--c-text-faint)', fontStyle: 'italic', fontSize: 11 }}
        >
          No scenario loaded
        </div>
      </div>
    );
  }

  if (!sn) {
    return (
      <div style={style.panel}>
        <div style={style.header}>Inspector</div>
        <div
          style={{ padding: 12, color: 'var(--c-text-faint)', fontStyle: 'italic', fontSize: 11 }}
        >
          Select a node to inspect
        </div>

        {/* Scenario meta — collapsed shows version + node count; expanded shows all meta + description */}
        <CollapsibleSection
          title="Scenario"
          defaultOpen
          collapsedSummary={
            <>
              <div style={{ ...style.value, fontWeight: 700 }}>{schemaDoc.meta.title}</div>
              <div>
                v{schemaDoc.meta.scenarioVersion} · {schemaDoc.graph.nodes.length} nodes
              </div>
            </>
          }
          sectionStyle={style.section}
          labelStyle={style.label}
        >
          <div style={{ ...style.value, fontWeight: 700 }}>{schemaDoc.meta.title}</div>
          <div style={{ color: 'var(--c-text-muted)', marginTop: 2 }}>
            v{schemaDoc.meta.scenarioVersion}
          </div>
          <div style={{ color: 'var(--c-text-muted)' }}>by {schemaDoc.meta.designer?.name}</div>
          <div style={{ marginTop: 6, color: 'var(--c-text-muted)' }}>
            Entry: <code>{schemaDoc.graph.entry}</code>
          </div>
          <div style={{ color: 'var(--c-text-muted)' }}>{schemaDoc.graph.nodes.length} nodes</div>

          <div style={{ ...style.label, marginTop: 10 }}>Description</div>
          <textarea
            style={style.textarea}
            value={schemaDoc.meta.description ?? ''}
            onChange={handleScenarioDescriptionChange}
            rows={5}
            placeholder="What is this scenario about? Shown to future authors, not players."
          />
        </CollapsibleSection>

        {/* Setup — standard-game selections (all optional since schema 0.4.1). Leave blank for a
            rule-variant scenario that doesn't use these mechanics. */}
        <CollapsibleSection title="Setup" sectionStyle={style.section} labelStyle={style.label}>
          <ScenarioSetupEditor
            schemaDoc={schemaDoc}
            labelStyle={style.label}
            inputStyle={style.input}
            updateSetupSelections={updateSetupSelections}
            updateMainGoal={updateMainGoal}
          />
        </CollapsibleSection>

        {/* Decks — the first-class deck builder lives in the center 'Decks' view (deck-builder-first-class) */}
        <CollapsibleSection title="Decks" sectionStyle={style.section} labelStyle={style.label}>
          <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 8 }}>
            {battleDeckCount} battle deck{battleDeckCount === 1 ? '' : 's'} · {cardDeckCount} card
            deck{cardDeckCount === 1 ? '' : 's'}
          </div>
          <button
            onClick={() => setCenterView('decks')}
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--c-primary-fg)',
              background: 'var(--c-primary)',
              border: 'none',
              borderRadius: 6,
            }}
          >
            Open Deck Builder →
          </button>
        </CollapsibleSection>

        {/* L1 errors */}
        {validationResults && validationResults.l1.errors.length > 0 && (
          <div style={{ ...style.section, background: '#FEF2F2' }}>
            <div style={{ ...style.label, color: 'var(--c-danger)' }}>L1 Schema Errors</div>
            {validationResults.l1.errors.slice(0, 5).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--c-danger)', marginBottom: 2 }}>
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
  const KindEditor = NODE_EDITORS[sn.kind];

  return (
    <div style={style.panel}>
      <div
        style={{
          ...style.header,
          background: cat.bgColor,
          color: cat.textColor,
          borderLeft: `3px solid ${cat.color}`,
        }}
      >
        Inspector — {cat.label}
      </div>

      {nodeErrors.length > 0 && (
        <div
          style={{ padding: '8px 12px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}
        >
          {nodeErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--c-danger)' }}>
              ⚠ {e}
            </div>
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
        <div style={style.label}>{sn.kind === 'util.comment' ? 'Headline' : 'Label'}</div>
        <input
          style={style.input}
          value={sn.label ?? ''}
          onChange={handleLabelChange}
          placeholder={sn.kind === 'util.comment' ? 'Comment headline' : 'Optional display label'}
        />
      </div>

      <div style={style.section}>
        <div style={style.label}>{sn.kind === 'util.comment' ? 'Note' : 'Description'}</div>
        <textarea
          style={style.textarea}
          value={sn.description ?? ''}
          onChange={handleDescriptionChange}
          rows={sn.kind === 'util.comment' ? 8 : 4}
          placeholder={
            sn.kind === 'util.comment'
              ? 'Body of the sticky note — author documentation, no runtime meaning.'
              : 'Author-facing notes about this node.'
          }
        />
      </div>

      {sn.kind === 'util.group' && (
        <GroupEditor
          sn={sn}
          allNodes={rfNodes.map((n) => n.data.schemaNode)}
          onUpdate={(props) => updateNodeProps(sn.id, props)}
        />
      )}

      {sn.props && sn.kind !== 'util.group' && sn.kind !== 'util.comment' && (
        <div style={style.section}>
          <div style={style.label}>Props</div>
          <pre
            style={{
              fontSize: 10,
              background: 'var(--c-surface)',
              padding: 8,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 180,
              margin: 0,
              color: 'var(--c-text)',
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
            <div key={handle} style={{ fontSize: 11, color: 'var(--c-text)', marginBottom: 2 }}>
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
          <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 600 }}>
            ✓ Entry node
          </span>
        )}
        <button style={style.btnDanger} onClick={handleDelete}>
          Delete
        </button>
      </div>

      {/* Per-node-kind props editor, looked up from the NODE_EDITORS registry (editors/inspector/
          registry.ts) rather than a `sn.kind === 'x' && <XEditor/>` chain. Keyed so a selection
          change always remounts the editor instead of reusing a stale instance. */}
      {KindEditor && (
        <KindEditor
          key={sn.id}
          sn={sn}
          schemaDoc={schemaDoc}
          onUpdate={(props) => updateNodeProps(sn.id, props)}
          onSyncLibraryHeroes={syncLibraryHeroes}
          onEditInBuilder={(dungeonId) => {
            setDungeonSelection(dungeonId);
            setCenterView('dungeons');
          }}
        />
      )}
    </div>
  );
}
