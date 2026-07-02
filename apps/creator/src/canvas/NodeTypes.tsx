import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { categoryFor, outputHandlesFor, type CreatorNodeData, type GroupProps } from '../types';

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

function CommentNodeComponent({ data, selected }: NodeProps<CommentRFNode>) {
  const { schemaNode } = data;
  return (
    <div
      style={{
        background: '#FEF3C7',
        border: `2px solid ${selected ? '#D97706' : '#FBBF24'}`,
        borderRadius: 4,
        minWidth: 180,
        minHeight: 90,
        padding: '8px 10px',
        boxShadow: selected ? '0 0 0 2px #FDE68A' : '2px 2px 0 rgba(217, 119, 6, 0.15)',
        fontFamily: 'monospace',
        color: '#78350F',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
        {schemaNode.label || 'Comment'}
      </div>
      <div style={{ fontSize: 10, whiteSpace: 'pre-wrap', opacity: 0.85 }}>
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
