import dagre from '@dagrejs/dagre';
import type { CreatorNode } from './serializer';
import type { Edge } from '@xyflow/react';
import { NODE_W, NODE_H, computeGroupRects } from './serializer';
import { ANNOTATION_KINDS } from '../types';

export function applyDagreLayout(nodes: CreatorNode[], edges: Edge[]): CreatorNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  // Annotation nodes (comments/groups) carry no wires and aren't part of the flow spine —
  // exclude them from dagre. Comments keep their existing position; group rects refit below.
  for (const node of nodes) {
    if (ANNOTATION_KINDS.has(node.data.schemaNode.kind)) continue;
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });

  const groupRects = computeGroupRects(laidOut);
  return laidOut.map((node) => {
    const rect = groupRects[node.id];
    if (!rect) return node;
    return { ...node, position: { x: rect.x, y: rect.y }, style: { width: rect.width, height: rect.height } };
  });
}
