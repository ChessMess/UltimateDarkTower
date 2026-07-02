import type { Node, Edge } from '@xyflow/react';
import type { ScenarioDoc, SchemaNode, CreatorNodeData, GroupProps } from '../types';

export type CreatorNodeType = 'scenarioNode' | 'commentNode' | 'groupNode';
export type CreatorNode = Node<CreatorNodeData, CreatorNodeType>;

const NODE_W = 200;
const NODE_H = 60;
const COMMENT_W = 200;
const COMMENT_H = 100;
const GROUP_EMPTY_W = 240;
const GROUP_EMPTY_H = 120;
const GROUP_PADDING = 24;
const GROUP_HEADER_H = 36;

export type GroupRect = { x: number; y: number; width: number; height: number };

function typeForKind(kind: SchemaNode['kind']): CreatorNodeType {
  if (kind === 'util.comment') return 'commentNode';
  if (kind === 'util.group') return 'groupNode';
  return 'scenarioNode';
}

// Prefer the member's actual on-canvas box (e.g. a resized comment) over the kind default,
// so a group's auto-fit bounds always include the full resized note.
function sizeForNode(n: CreatorNode): { w: number; h: number } {
  const style = n.style as { width?: number; height?: number } | undefined;
  if (typeof style?.width === 'number' && typeof style?.height === 'number') {
    return { w: style.width, h: style.height };
  }
  if (n.data.schemaNode.kind === 'util.comment') return { w: COMMENT_W, h: COMMENT_H };
  return { w: NODE_W, h: NODE_H };
}

// Group bounds are never stored — always the auto-fit bounding box of the group's current
// members (+ padding), so export→import re-derives the identical rect (CR-7.13.1).
export function computeGroupRects(nodes: CreatorNode[]): Record<string, GroupRect> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rects: Record<string, GroupRect> = {};
  for (const n of nodes) {
    if (n.data.schemaNode.kind !== 'util.group') continue;
    const props = n.data.schemaNode.props as GroupProps | undefined;
    const memberIds = props?.nodeIds ?? [];
    const members = memberIds
      .map((id) => byId.get(id))
      .filter(
        (m): m is CreatorNode => m !== undefined && m.data.schemaNode.kind !== 'util.group',
      );
    if (members.length === 0) {
      rects[n.id] = { x: n.position.x, y: n.position.y, width: GROUP_EMPTY_W, height: GROUP_EMPTY_H };
      continue;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const m of members) {
      const { w, h } = sizeForNode(m);
      minX = Math.min(minX, m.position.x);
      minY = Math.min(minY, m.position.y);
      maxX = Math.max(maxX, m.position.x + w);
      maxY = Math.max(maxY, m.position.y + h);
    }
    rects[n.id] = {
      x: minX - GROUP_PADDING,
      y: minY - GROUP_PADDING - GROUP_HEADER_H,
      width: maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER_H,
    };
  }
  return rects;
}

export function schemaToFlow(doc: ScenarioDoc): { nodes: CreatorNode[]; edges: Edge[] } {
  const positions = doc.meta.layout?.positions ?? {};
  const sizes = doc.meta.layout?.sizes ?? {};
  const schemaNodes = doc.graph.nodes;

  let nodes: CreatorNode[] = schemaNodes.map((sn, i) => {
    const saved = positions[sn.id];
    const position = saved ?? { x: i * 260, y: 0 };
    const type = typeForKind(sn.kind);
    const base: CreatorNode = {
      id: sn.id,
      type,
      position,
      data: {
        schemaNode: sn,
        isEntry: sn.id === doc.graph.entry,
        hasErrors: false,
        errorMessages: [],
      },
    };
    if (type === 'groupNode') return { ...base, zIndex: -1 };
    if (type === 'commentNode') {
      const savedSize = sizes[sn.id];
      return {
        ...base,
        style: {
          width: savedSize?.width ?? COMMENT_W,
          height: savedSize?.height ?? COMMENT_H,
        },
      };
    }
    return base;
  });

  // Fit group rects to their members' current positions
  const groupRects = computeGroupRects(nodes);
  nodes = nodes.map((n) => {
    const rect = groupRects[n.id];
    if (!rect) return n;
    return {
      ...n,
      position: { x: rect.x, y: rect.y },
      style: { width: rect.width, height: rect.height },
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

  // Persist author-resized comment boxes only (group rects are always re-derived; regular
  // scenario nodes use the fixed default size)
  const sizes: Record<string, { width: number; height: number }> = {};
  for (const rfNode of rfNodes) {
    if (rfNode.data.schemaNode.kind !== 'util.comment') continue;
    const style = rfNode.style as { width?: number; height?: number } | undefined;
    if (typeof style?.width === 'number' && typeof style?.height === 'number') {
      sizes[rfNode.id] = { width: style.width, height: style.height };
    }
  }

  const layout: { positions: typeof positions; sizes?: typeof sizes } = {
    ...doc.meta.layout,
    positions,
  };
  if (Object.keys(sizes).length > 0) {
    layout.sizes = sizes;
  } else {
    delete layout.sizes;
  }

  return {
    ...doc,
    meta: { ...doc.meta, layout },
    graph: { ...doc.graph, nodes: updatedNodes },
  };
}

export { NODE_W, NODE_H, COMMENT_W, COMMENT_H };
