import { useCallback, useRef } from 'react';
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

const nodeTypes: NodeTypes = { scenarioNode: ScenarioNode };

// The engine's own golden fixture — guaranteed runnable by the simulator (same fixture
// used by the 242-assertion lockstep test suite in packages/engine).
const BASE_SCENARIO = (engineModule as { golden: ScenarioDoc }).golden;

export function CreatorCanvas() {
  const { schemaDoc, rfNodes, rfEdges, selectedNodeId, validationResults, isDirty } =
    useCreatorStore();
  const { loadScenario, syncFromRF, selectNode, addNode, applyLayout, exportScenario } =
    useCreatorStore();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E2E8F0" />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Controls />

        {/* Toolbar */}
        <Panel position="top-center">
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '6px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
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
            <span style={{ color: '#6B7280', fontSize: 12 }}>|</span>
            <button className="toolbar-btn" onClick={() => { applyLayout(); setTimeout(() => fitView({ padding: 0.2 }), 50); }} disabled={!schemaDoc}>
              Auto-layout
            </button>
            {schemaDoc && (
              <>
                <span style={{ color: '#6B7280', fontSize: 12 }}>|</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: hasErrors ? '#DC2626' : '#059669' }}>
                  {hasErrors ? `⚠ ${(validationResults.l1.errors.length + validationResults.l2.errors.length + validationResults.l3.errors.length)} error(s)` : '✓ Valid'}
                </span>
                {isDirty && <span style={{ color: '#F59E0B', fontSize: 11 }}>●</span>}
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
              <div style={{ fontSize: 13, marginTop: 8 }}>Click "Load Golden" to start with the MVP fixture,</div>
              <div style={{ fontSize: 13 }}>or "Import JSON" to open an existing scenario.</div>
            </div>
          </Panel>
        )}
      </ReactFlow>

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
