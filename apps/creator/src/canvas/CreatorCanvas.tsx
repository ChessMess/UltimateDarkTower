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
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ScenarioNode, CommentNode, GroupNode } from './NodeTypes';
import { useCreatorStore } from '../store';
import { SAMPLE_SCENARIO } from '../utils/sampleScenario';
import type { GroupProps } from '../types';
import { computeGroupRects, type CreatorNode } from '../utils/serializer';

const nodeTypes: NodeTypes = {
  scenarioNode: ScenarioNode,
  commentNode: CommentNode,
  groupNode: GroupNode,
};

type CreatorCanvasProps = {
  focusMode: boolean;
  onToggleFocusMode: () => void;
};

export function CreatorCanvas({ focusMode, onToggleFocusMode }: CreatorCanvasProps) {
  // Narrow selectors (one field each) instead of subscribing to the whole store — this is the most
  // expensive subscriber in the app (the React Flow canvas), and a whole-store subscription re-ran
  // it on every unrelated write.
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const rfNodes = useCreatorStore((s) => s.rfNodes);
  const rfEdges = useCreatorStore((s) => s.rfEdges);
  const selectedNodeId = useCreatorStore((s) => s.selectedNodeId);
  // Read the persisted viewport once at mount (lazy useState, not a subscription). It only seeds
  // React Flow's initial fitView/defaultViewport; subscribing would re-render the canvas on every
  // pan/zoom end, because onMoveEnd writes canvasViewport — precisely the churn this removes.
  const [initialViewport] = useState(() => useCreatorStore.getState().canvasViewport);
  const loadScenario = useCreatorStore((s) => s.loadScenario);
  const syncFromRF = useCreatorStore((s) => s.syncFromRF);
  const selectNode = useCreatorStore((s) => s.selectNode);
  const addNode = useCreatorStore((s) => s.addNode);
  const applyLayout = useCreatorStore((s) => s.applyLayout);
  const setCanvasViewport = useCreatorStore((s) => s.setCanvasViewport);
  const setScenarioDialog = useCreatorStore((s) => s.setScenarioDialog);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const groupDragRef = useRef<{
    groupId: string;
    groupStart: { x: number; y: number };
    memberStarts: Map<string, { x: number; y: number }>;
  } | null>(null);

  // Functional updater form (reads live store state, not the closure-captured rfNodes) —
  // required because RF's own dimension-tracking can fire onNodesChange asynchronously,
  // after other code (e.g. comment resize) has already written newer rfNodes to the store.
  const onNodesChange: OnNodesChange<CreatorNode> = useCallback((changes) => {
    useCreatorStore.setState((state) => ({ rfNodes: applyNodeChanges(changes, state.rfNodes) }));
  }, []);

  const onEdgesChange: OnEdgesChange<Edge> = useCallback((changes) => {
    useCreatorStore.setState((state) => ({ rfEdges: applyEdgeChanges(changes, state.rfEdges) }));
  }, []);

  // Persist the viewport so switching to Decks/Dungeons and back doesn't reset pan/zoom.
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setCanvasViewport(viewport);
    },
    [setCanvasViewport],
  );

  const onConnect: OnConnect = useCallback(
    (conn) => {
      const newEdges = addEdge({ ...conn, type: 'default' }, rfEdges);
      syncFromRF(rfNodes, newEdges);
    },
    [rfEdges, rfNodes, syncFromRF],
  );

  // Group drag: moving a groupNode carries its members along; moving any node that
  // belongs to a group live-refits that group's auto-fit rect (see computeGroupRects).
  const onNodeDragStart = useCallback((_evt: MouseEvent | TouchEvent, node: CreatorNode) => {
    if (node.type !== 'groupNode') {
      groupDragRef.current = null;
      return;
    }
    const props = node.data.schemaNode.props as GroupProps | undefined;
    const memberIds = new Set(props?.nodeIds ?? []);
    const memberStarts = new Map<string, { x: number; y: number }>();
    for (const n of useCreatorStore.getState().rfNodes) {
      if (memberIds.has(n.id)) memberStarts.set(n.id, { x: n.position.x, y: n.position.y });
    }
    groupDragRef.current = {
      groupId: node.id,
      groupStart: { x: node.position.x, y: node.position.y },
      memberStarts,
    };
  }, []);

  const onNodeDrag = useCallback((_evt: MouseEvent | TouchEvent, node: CreatorNode) => {
    const drag = groupDragRef.current;
    if (drag && node.id === drag.groupId) {
      const dx = node.position.x - drag.groupStart.x;
      const dy = node.position.y - drag.groupStart.y;
      useCreatorStore.setState((state) => ({
        rfNodes: state.rfNodes.map((n) => {
          const start = drag.memberStarts.get(n.id);
          if (!start) return n;
          return { ...n, position: { x: start.x + dx, y: start.y + dy } };
        }),
      }));
      return;
    }
    // Dragging a plain node (or group member): keep any group's rect fit to its members
    useCreatorStore.setState((state) => {
      const rects = computeGroupRects(state.rfNodes);
      let changed = false;
      const next = state.rfNodes.map((n) => {
        if (n.data.schemaNode.kind !== 'util.group') return n;
        const rect = rects[n.id];
        const style = n.style as { width?: number; height?: number } | undefined;
        if (
          !rect ||
          (n.position.x === rect.x &&
            n.position.y === rect.y &&
            style?.width === rect.width &&
            style?.height === rect.height)
        ) {
          return n;
        }
        changed = true;
        return {
          ...n,
          position: { x: rect.x, y: rect.y },
          style: { width: rect.width, height: rect.height },
          initialWidth: rect.width,
          initialHeight: rect.height,
        };
      });
      return changed ? { rfNodes: next } : {};
    });
  }, []);

  const onNodeDragStop = useCallback(() => {
    groupDragRef.current = null;
    syncFromRF(rfNodes, rfEdges);
  }, [rfNodes, rfEdges, syncFromRF]);

  const onNodeClick = useCallback(
    (_evt: React.MouseEvent, node: CreatorNode) => {
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

  const onNodesDelete = useCallback((deleted: CreatorNode[]) => {
    for (const n of deleted) useCreatorStore.getState().deleteNode(n.id);
  }, []);

  const handleGroupSelection = useCallback(() => {
    const ids = rfNodes
      .filter((n) => n.selected && n.data.schemaNode.kind !== 'util.group')
      .map((n) => n.id);
    if (ids.length === 0) return;
    useCreatorStore.getState().createGroup(ids);
  }, [rfNodes]);

  const canGroupSelection = rfNodes.some(
    (n) => n.selected && n.data.schemaNode.kind !== 'util.group',
  );

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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onMoveEnd={onMoveEnd}
        deleteKeyCode="Delete"
        fitView={!initialViewport}
        defaultViewport={initialViewport ?? undefined}
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
              width: 'max-content',
              maxWidth: 'calc(100vw - 64px)',
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
              onClick={() => {
                applyLayout();
                setTimeout(() => fitView({ padding: 0.2 }), 50);
              }}
              disabled={!schemaDoc}
            >
              Auto-layout
            </button>
            <button
              className="toolbar-btn"
              onClick={handleGroupSelection}
              disabled={!canGroupSelection}
              title={
                canGroupSelection
                  ? 'Wrap the selected nodes in a visual group (shift-drag to select)'
                  : 'Select one or more nodes (shift-drag) to group them'
              }
            >
              Group Selection
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
          </div>
        </Panel>

        {/* Empty state */}
        {!schemaDoc && (
          <Panel
            position="top-left"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>No scenario loaded</div>
              <div style={{ fontSize: 13, marginTop: 8, marginBottom: 16 }}>
                Start fresh, load the sample scenario, or import an existing file.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  onClick={() => setScenarioDialog('new')}
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
                  onClick={() => {
                    loadScenario(SAMPLE_SCENARIO, true);
                    setTimeout(() => fitView({ padding: 0.2 }), 100);
                  }}
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
                  Load Sample Scenario
                </button>
              </div>
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
