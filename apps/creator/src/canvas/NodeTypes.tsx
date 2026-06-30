import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { categoryFor, outputHandlesFor, type CreatorNodeData } from '../types';

export type ScenarioRFNode = Node<CreatorNodeData, 'scenarioNode'>;

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
        <div style={{ fontWeight: 700, fontSize: 12 }}>
          {schemaNode.label || schemaNode.kind.split('.')[1]}
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
