import { memo, useCallback } from 'react';
import {
  Handle,
  NodeResizer,
  Position,
  type NodeProps,
  type OnResize,
  type OnResizeEnd,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { categoryFor, outputHandlesFor, type CreatorNodeData, type GroupProps } from '../types';
import { useCreatorStore } from '../store';
import { computeGroupRects, type CreatorNode } from '../utils/serializer';

export type ScenarioRFNode = Node<CreatorNodeData, 'scenarioNode'>;
export type CommentRFNode = Node<CreatorNodeData, 'commentNode'>;
export type GroupRFNode = Node<CreatorNodeData, 'groupNode'>;

function ScenarioNodeComponent({ data, selected }: NodeProps<ScenarioRFNode>) {
  const { schemaNode, isEntry, hasErrors } = data;
  const cat = categoryFor(schemaNode.kind);
  const staticOutputs = outputHandlesFor(schemaNode.kind);
  const wireKeys = schemaNode.wires ? Object.keys(schemaNode.wires) : [];
  // For nodes whose actual wire handles don't match the static list (e.g. dungeon.room
  // uses cardinal directions N/S/E/W), derive handles from the wires themselves.
  const outputs =
    wireKeys.length > 0 && wireKeys.some((k) => !staticOutputs.includes(k))
      ? wireKeys
      : staticOutputs;
  const hasInputHandle = schemaNode.kind !== 'lifecycle.gameStart';

  const borderColor = hasErrors ? '#DC2626' : selected ? cat.color : '#CBD5E1';
  const shadowStyle = hasErrors
    ? '0 0 0 2px #FCA5A5'
    : selected
      ? `0 0 0 2px ${cat.bgColor}`
      : 'none';

  return (
    <div
      style={{
        background: cat.bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        minWidth: 200,
        boxShadow: shadowStyle,
        fontFamily: 'monospace',
        fontSize: 11,
        cursor: 'default',
        position: 'relative',
      }}
    >
      {/* Target handle */}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ background: cat.color, width: 10, height: 10 }}
        />
      )}

      {/* Header bar */}
      <div
        style={{
          background: cat.color,
          color: '#fff',
          padding: '3px 8px',
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {isEntry && (
          <span
            style={{
              background: '#FBBF24',
              color: '#000',
              borderRadius: 3,
              padding: '0 4px',
              fontSize: 9,
              fontWeight: 900,
            }}
          >
            ENTRY
          </span>
        )}
        {hasErrors && (
          <span style={{ color: '#FCA5A5', fontWeight: 900 }}>✕</span>
        )}
        <span style={{ opacity: 0.85 }}>{cat.label}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '5px 8px', color: cat.textColor }}>
        <div style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{schemaNode.label || schemaNode.kind.split('.')[1]}</span>
          {schemaNode.description && (
            <span title={schemaNode.description} style={{ opacity: 0.55, fontSize: 10 }}>
              ▤
            </span>
          )}
        </div>
        <div style={{ opacity: 0.6, fontSize: 10 }}>{schemaNode.id}</div>
        {schemaNode.props && (
          <div style={{ opacity: 0.5, fontSize: 9, marginTop: 2 }}>
            {Object.keys(schemaNode.props).join(', ')}
          </div>
        )}
      </div>

      {/* Source handles */}
      {outputs.length === 1 && (
        <Handle
          type="source"
          position={Position.Right}
          id={outputs[0]}
          style={{ background: cat.color, width: 10, height: 10 }}
        />
      )}
      {outputs.length > 1 &&
        outputs.map((handle, i) => (
          <Handle
            key={handle}
            type="source"
            position={Position.Right}
            id={handle}
            style={{
              background: cat.color,
              width: 10,
              height: 10,
              top: `${((i + 1) / (outputs.length + 1)) * 100}%`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                right: 14,
                top: -6,
                fontSize: 9,
                whiteSpace: 'nowrap',
                color: cat.textColor,
                pointerEvents: 'none',
              }}
            >
              {handle}
            </span>
          </Handle>
        ))}
    </div>
  );
}

export const ScenarioNode = memo(ScenarioNodeComponent);

// Applies a comment's new box size to the live canvas (and, on resize end, persists it into
// meta.layout.sizes) — mirrors the group-drag pattern: any group containing this comment as a
// member gets its auto-fit rect refit in the same pass.
function applyCommentResize(id: string, width: number, height: number, persist: boolean) {
  const state = useCreatorStore.getState();
  const resized: CreatorNode[] = state.rfNodes.map((n) =>
    n.id === id ? { ...n, style: { ...(n.style as Record<string, unknown> | undefined), width, height } } : n,
  );
  const rects = computeGroupRects(resized);
  const nextNodes = resized.map((n) => {
    if (n.data.schemaNode.kind !== 'util.group') return n;
    const rect = rects[n.id];
    if (!rect) return n;
    return { ...n, position: { x: rect.x, y: rect.y }, style: { width: rect.width, height: rect.height } };
  });
  if (persist) {
    state.syncFromRF(nextNodes, state.rfEdges);
  } else {
    useCreatorStore.setState({ rfNodes: nextNodes });
  }
}

function CommentNodeComponent({ id, data, selected }: NodeProps<CommentRFNode>) {
  const { schemaNode } = data;

  const onResize = useCallback<OnResize>(
    (_evt, params) => applyCommentResize(id, params.width, params.height, false),
    [id],
  );
  const onResizeEnd = useCallback<OnResizeEnd>(
    (_evt, params) => applyCommentResize(id, params.width, params.height, true),
    [id],
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: '#FEF3C7',
        border: `2px solid ${selected ? '#D97706' : '#FBBF24'}`,
        borderRadius: 4,
        padding: '8px 10px',
        boxShadow: selected ? '0 0 0 2px #FDE68A' : '2px 2px 0 rgba(217, 119, 6, 0.15)',
        fontFamily: 'monospace',
        color: '#78350F',
        overflow: 'hidden',
      }}
    >
      <NodeResizer
        minWidth={140}
        minHeight={70}
        isVisible={selected}
        color="#D97706"
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, flexShrink: 0 }}>
        {schemaNode.label || 'Comment'}
      </div>
      <div
        style={{
          fontSize: 10,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          opacity: 0.85,
          flex: 1,
          overflow: 'auto',
        }}
      >
        {schemaNode.description || ''}
      </div>
    </div>
  );
}

export const CommentNode = memo(CommentNodeComponent);

function GroupNodeComponent({ data, selected }: NodeProps<GroupRFNode>) {
  const { schemaNode } = data;
  const props = schemaNode.props as GroupProps | undefined;
  const color = props?.color || '#6B7280';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `${color}1A`,
        border: `2px ${selected ? 'solid' : 'dashed'} ${color}`,
        borderRadius: 8,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: color,
          color: '#fff',
          padding: '3px 8px',
          borderRadius: '6px 6px 0 0',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {schemaNode.label || 'Group'}
      </div>
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
