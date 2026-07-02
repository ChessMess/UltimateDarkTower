import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  Panel,
  addEdge,
  useReactFlow,
  type NodeTypes,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import engineModule from '@udtc/engine';
import { ScenarioNode, type ScenarioRFNode } from './NodeTypes';
import { useCreatorStore } from '../store';
import type { ScenarioDoc } from '../types';
import { NewScenarioDialog } from '../editors/NewScenarioDialog';
import { clearDraft } from '../utils/draft';

const nodeTypes: NodeTypes = { scenarioNode: ScenarioNode };

// The engine's own golden scenario — the base-game fidelity build (full turn structure,
// buildings, events, monthly quests), guaranteed runnable by the simulator: the same fixture
// the engine's lockstep/full-turn test suites drive end-to-end.
const BASE_SCENARIO = (engineModule as { goldenFull: ScenarioDoc }).goldenFull;

type CreatorCanvasProps = {
  focusMode: boolean;
  onToggleFocusMode: () => void;
};

export function CreatorCanvas({ focusMode, onToggleFocusMode }: CreatorCanvasProps) {
  const { schemaDoc, rfNodes, rfEdges, selectedNodeId, validationResults, isDirty } =
    useCreatorStore();
  const { loadScenario, syncFromRF, selectNode, addNode, applyLayout, exportScenario } =
    useCreatorStore();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes and start a new scenario?')) return;
    setNewDialogOpen(true);
  }, [isDirty]);

  const onNodesChange: OnNodesChange<ScenarioRFNode> = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, rfNodes);
      useCreatorStore.setState({ rfNodes: updated });
    },
    [rfNodes],
  );

  const onEdgesChange: OnEdgesChange<Edge> = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, rfEdges);
      useCreatorStore.setState({ rfEdges: updated });
    },
    [rfEdges],
  );

  const onConnect: OnConnect = useCallback(
    (conn) => {
      const newEdges = addEdge({ ...conn, type: 'default' }, rfEdges);
      syncFromRF(rfNodes, newEdges);
    },
    [rfEdges, rfNodes, syncFromRF],
  );

  const onNodeDragStop = useCallback(() => {
    syncFromRF(rfNodes, rfEdges);
  }, [rfNodes, rfEdges, syncFromRF]);

  const onNodeClick = useCallback(
    (_evt: React.MouseEvent, node: ScenarioRFNode) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const remaining = rfEdges.filter((e) => !deleted.some((d) => d.id === e.id));
      syncFromRF(rfNodes, remaining);
    },
    [rfEdges, rfNodes, syncFromRF],
  );

  const onNodesDelete = useCallback(
    (deleted: ScenarioRFNode[]) => {
      for (const n of deleted) useCreatorStore.getState().deleteNode(n.id);
    },
    [],
  );

  // Import
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const doc = JSON.parse(ev.target?.result as string) as ScenarioDoc;
          loadScenario(doc, !doc.meta.layout?.positions);
          setTimeout(() => fitView({ padding: 0.2 }), 100);
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadScenario, fitView],
  );

  // Export
  const handleExport = useCallback(() => {
    if (!validationResults?.allOk) return;
    const json = exportScenario();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaDoc?.meta.title ?? 'scenario'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    useCreatorStore.setState({ isDirty: false });
    clearDraft();
  }, [validationResults, exportScenario, schemaDoc]);

  const handleLoadGolden = useCallback(() => {
    loadScenario(BASE_SCENARIO, true);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [loadScenario, fitView]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData('application/node-kind');
      if (!kind) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind as Parameters<typeof addNode>[0], position);
    },
    [addNode, screenToFlowPosition],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const allOk = validationResults?.allOk ?? false;
  const hasErrors = validationResults && !validationResults.allOk;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onDrop={onDrop}
        onDragOver={onDragOver}
        deleteKeyCode="Delete"
        fitView
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
      >
        {/* Dot color is themed via --xy-background-pattern-dots-color-default in App.css */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Controls />

        {/* Toolbar */}
        <Panel position="top-center">
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: 'var(--c-surface-raised)',
              border: '1px solid var(--c-border)',
              borderRadius: 8,
              padding: '6px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <button
              className="toolbar-btn"
              onClick={handleNew}
              title="Create a new scenario from scratch"
              style={{ background: '#2563EB', color: '#fff' }}
            >
              New
            </button>
            <button className="toolbar-btn" onClick={handleLoadGolden} title="Load the golden MVP fixture">
              Load Golden
            </button>
            <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import JSON scenario">
              Import JSON
            </button>
            <button
              className="toolbar-btn"
              onClick={handleExport}
              disabled={!schemaDoc || !allOk}
              title={
                !schemaDoc
                  ? 'No scenario loaded'
                  : !allOk
                    ? 'Fix validation errors before exporting'
                    : 'Export canonical JSON'
              }
              style={{
                background: schemaDoc && allOk ? '#059669' : '#9CA3AF',
                color: '#fff',
                cursor: schemaDoc && allOk ? 'pointer' : 'not-allowed',
              }}
            >
              Export JSON
            </button>
            <span style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>|</span>
            <button className="toolbar-btn" onClick={() => { applyLayout(); setTimeout(() => fitView({ padding: 0.2 }), 50); }} disabled={!schemaDoc}>
              Auto-layout
            </button>
            <span style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>|</span>
            <button
              type="button"
              className="palette-allbtn"
              onClick={() => {
                onToggleFocusMode();
                setTimeout(() => fitView({ padding: 0.2 }), 60);
              }}
              title={focusMode ? 'Show panels' : 'Hide panels'}
              aria-label={focusMode ? 'Show panels' : 'Hide panels'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {focusMode ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                ) : (
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                )}
              </svg>
            </button>
            {schemaDoc && (
              <>
                <span style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>|</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: hasErrors ? 'var(--c-danger)' : 'var(--c-success)' }}>
                  {hasErrors ? `⚠ ${(validationResults.l1.errors.length + validationResults.l2.errors.length + validationResults.l3.errors.length)} error(s)` : '✓ Valid'}
                </span>
                {isDirty && <span style={{ color: 'var(--c-warning)', fontSize: 11 }}>●</span>}
              </>
            )}
          </div>
        </Panel>

        {/* Empty state */}
        {!schemaDoc && (
          <Panel position="top-left" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>No scenario loaded</div>
              <div style={{ fontSize: 13, marginTop: 8, marginBottom: 16 }}>
                Start fresh, load the golden fixture, or import an existing file.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  onClick={handleNew}
                  style={{
                    padding: '8px 20px',
                    background: '#2563EB',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  New Scenario
                </button>
                <button
                  onClick={handleLoadGolden}
                  style={{
                    padding: '8px 20px',
                    background: '#F1F5F9',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Load Golden
                </button>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {newDialogOpen && (
        <NewScenarioDialog
          onClose={() => setNewDialogOpen(false)}
          onConfirm={(doc) => {
            loadScenario(doc, true);
            setNewDialogOpen(false);
            setTimeout(() => fitView({ padding: 0.2 }), 100);
          }}
        />
      )}

      {/* Selection highlight */}
      {selectedNodeId && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            fontSize: 11,
            padding: '2px 10px',
            borderRadius: 12,
            pointerEvents: 'none',
          }}
        >
          {selectedNodeId}
        </div>
      )}
    </div>
  );
}
