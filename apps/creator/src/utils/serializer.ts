import type { Node, Edge } from '@xyflow/react';
import type { ScenarioDoc, SchemaNode, CreatorNodeData } from '../types';

export type CreatorNode = Node<CreatorNodeData, 'scenarioNode'>;

const NODE_W = 200;
const NODE_H = 60;

export function schemaToFlow(doc: ScenarioDoc): { nodes: CreatorNode[]; edges: Edge[] } {
  const positions = doc.meta.layout?.positions ?? {};
  const schemaNodes = doc.graph.nodes;

  const nodes: CreatorNode[] = schemaNodes.map((sn, i) => {
    const saved = positions[sn.id];
    const position = saved ?? { x: i * 260, y: 0 };
    return {
      id: sn.id,
      type: 'scenarioNode' as const,
      position,
      data: {
        schemaNode: sn,
        isEntry: sn.id === doc.graph.entry,
        hasErrors: false,
        errorMessages: [],
      },
    };
  });

  const edges: Edge[] = [];
  for (const sn of schemaNodes) {
    if (!sn.wires) continue;
    for (const [handleName, targets] of Object.entries(sn.wires)) {
      for (const targetId of targets) {
        edges.push({
          id: `${sn.id}::${handleName}->${targetId}`,
          source: sn.id,
          sourceHandle: handleName,
          target: targetId,
          targetHandle: 'in',
          type: 'default',
        });
      }
    }
  }

  return { nodes, edges };
}

export function flowToSchema(
  rfNodes: CreatorNode[],
  rfEdges: Edge[],
  doc: ScenarioDoc,
): ScenarioDoc {
  // Rebuild wires from edges (sort targets for stable ordering)
  const wiresMap: Record<string, Record<string, string[]>> = {};
  for (const edge of rfEdges) {
    const handleName = edge.sourceHandle ?? 'out';
    wiresMap[edge.source] ??= {};
    wiresMap[edge.source][handleName] ??= [];
    wiresMap[edge.source][handleName].push(edge.target);
  }
  for (const nodeWires of Object.values(wiresMap)) {
    for (const targets of Object.values(nodeWires)) {
      targets.sort();
    }
  }

  // Rebuild schema nodes preserving all props, updating only wires
  const updatedNodes: SchemaNode[] = rfNodes.map((rfNode) => {
    const sn = rfNode.data.schemaNode;
    const wires = wiresMap[sn.id];
    if (wires && Object.keys(wires).length > 0) return { ...sn, wires };
    const { wires: _w, ...rest } = sn;
    void _w;
    return rest;
  });

  // Update layout sidecar with current RF positions
  const positions: Record<string, { x: number; y: number }> = {};
  for (const rfNode of rfNodes) {
    positions[rfNode.id] = { x: rfNode.position.x, y: rfNode.position.y };
  }

  return {
    ...doc,
    meta: { ...doc.meta, layout: { positions } },
    graph: { ...doc.graph, nodes: updatedNodes },
  };
}

export { NODE_W, NODE_H };
