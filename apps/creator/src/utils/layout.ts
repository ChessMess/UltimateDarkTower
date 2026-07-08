import dagre from '@dagrejs/dagre';
import type { CreatorNode } from './serializer';
import type { Edge } from '@xyflow/react';
import { NODE_W, NODE_H, GROUP_PADDING, GROUP_HEADER_H, computeGroupRects } from './serializer';
import { ANNOTATION_KINDS, type GroupProps } from '../types';

// Extra footprint reserved (beyond the node's own box) so dagre spaces a group's members away
// from neighboring ranks/nodes by enough room for the group's header + padding — otherwise
// computeGroupRects' fitted box can overlap whatever dagre packed immediately above/beside it.
const GROUP_MEMBER_W = NODE_W + GROUP_PADDING * 2;
const GROUP_MEMBER_H = NODE_H + GROUP_HEADER_H + GROUP_PADDING * 2;

export function applyDagreLayout(nodes: CreatorNode[], edges: Edge[]): CreatorNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const groupedIds = new Set<string>();
  for (const node of nodes) {
    if (node.data.schemaNode.kind !== 'util.group') continue;
    const memberIds = (node.data.schemaNode.props as GroupProps | undefined)?.nodeIds ?? [];
    for (const id of memberIds) groupedIds.add(id);
  }

  // Annotation nodes (comments/groups) carry no wires and aren't part of the flow spine —
  // exclude them from dagre. Comments keep their existing position; group rects refit below.
  for (const node of nodes) {
    if (ANNOTATION_KINDS.has(node.data.schemaNode.kind)) continue;
    if (groupedIds.has(node.id)) {
      g.setNode(node.id, { width: GROUP_MEMBER_W, height: GROUP_MEMBER_H });
    } else {
      g.setNode(node.id, { width: NODE_W, height: NODE_H });
    }
  }
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    if (groupedIds.has(node.id)) {
      return {
        ...node,
        position: {
          x: pos.x - GROUP_MEMBER_W / 2 + GROUP_PADDING,
          y: pos.y - GROUP_MEMBER_H / 2 + GROUP_HEADER_H + GROUP_PADDING,
        },
      };
    }
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
