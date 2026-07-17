/**
 * serializer.test.ts — characterization tests for the schema↔flow round-trip.
 *
 * This module is the load-bearing wall of the Creator: all 13 store mutators call it,
 * every autosave calls flowToSchema, and every export calls it again. It had no tests
 * of its own — images.test.ts only exercised it incidentally.
 *
 * These are characterization tests, not red-green: they pin behaviour that is already
 * correct, so a future refactor can't quietly change what gets written to a user's
 * saved scenario. Several assertions look like trivia (a group's rect being absent
 * from layout.sizes, a wires key being deleted rather than emptied) but each one is a
 * deliberate choice the code comments call out, and each would corrupt a saved
 * document if it regressed.
 */

import { describe, expect, it } from 'vitest';

import {
  schemaToFlow,
  flowToSchema,
  computeGroupRects,
  computeGraphBounds,
  type CreatorNode,
} from './serializer';
import { scaffoldScenario } from './scaffold';
import type { ScenarioDoc } from '../types';

function baseDoc(): ScenarioDoc {
  return scaffoldScenario({
    title: 'Serializer test',
    designer: 'Test',
    mode: 'coop',
    difficultyProfile: 'heroic',
    skullSupply: 30,
    monthEndMin: 5,
    monthEndMax: 8,
  });
}

/** A doc with explicit positions for every node — the shape a saved scenario has. */
function laidOutDoc(): ScenarioDoc {
  const doc = baseDoc();
  const positions: Record<string, { x: number; y: number }> = {};
  doc.graph.nodes.forEach((n, i) => {
    positions[n.id] = { x: i * 300, y: i * 40 };
  });
  return { ...doc, meta: { ...doc.meta, layout: { positions } } };
}

describe('schemaToFlow', () => {
  it('maps every schema node to a flow node, preserving ids', () => {
    const doc = laidOutDoc();
    const { nodes } = schemaToFlow(doc);

    expect(nodes.map((n) => n.id)).toEqual(doc.graph.nodes.map((n) => n.id));
  });

  it('restores saved positions', () => {
    const doc = laidOutDoc();
    const { nodes } = schemaToFlow(doc);

    expect(nodes[0].position).toEqual(doc.meta.layout!.positions![doc.graph.nodes[0].id]);
  });

  it('falls back to a spread-out row when a scenario has no layout', () => {
    const doc = baseDoc();
    expect(doc.meta.layout).toBeUndefined();

    const { nodes } = schemaToFlow(doc);

    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[1].position).toEqual({ x: 260, y: 0 });
  });

  it('marks exactly the entry node', () => {
    const doc = laidOutDoc();
    const { nodes } = schemaToFlow(doc);

    const entries = nodes.filter((n) => n.data.isEntry);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(doc.graph.entry);
  });

  it('builds one edge per wire target, with a handle-qualified id', () => {
    const doc = laidOutDoc();
    const { edges } = schemaToFlow(doc);

    const wireCount = doc.graph.nodes.reduce(
      (sum, n) => sum + Object.values(n.wires ?? {}).reduce((s, t) => s + t.length, 0),
      0,
    );
    expect(edges).toHaveLength(wireCount);

    const startEdge = edges.find((e) => e.source === 'n-start');
    expect(startEdge).toMatchObject({
      id: 'n-start::out->n-board-setup',
      source: 'n-start',
      sourceHandle: 'out',
      target: 'n-board-setup',
      targetHandle: 'in',
    });
  });
});

describe('schemaToFlow → flowToSchema round-trip', () => {
  it('returns an equivalent document', () => {
    const doc = laidOutDoc();
    const { nodes, edges } = schemaToFlow(doc);

    expect(flowToSchema(nodes, edges, doc)).toEqual(doc);
  });

  it('is stable when applied twice', () => {
    const doc = laidOutDoc();
    const once = (d: ScenarioDoc) => {
      const { nodes, edges } = schemaToFlow(d);
      return flowToSchema(nodes, edges, d);
    };

    expect(once(once(doc))).toEqual(once(doc));
  });

  it('preserves node props verbatim', () => {
    const doc = laidOutDoc();
    const withProps: ScenarioDoc = {
      ...doc,
      graph: {
        ...doc.graph,
        nodes: doc.graph.nodes.map((n, i) =>
          i === 0 ? { ...n, props: { effects: [{ op: 'resource.gain', amount: 3 }] } } : n,
        ),
      },
    };

    const { nodes, edges } = schemaToFlow(withProps);
    const out = flowToSchema(nodes, edges, withProps);

    expect(out.graph.nodes[0].props).toEqual({ effects: [{ op: 'resource.gain', amount: 3 }] });
  });

  it('adopts positions the author moved', () => {
    const doc = laidOutDoc();
    const { nodes, edges } = schemaToFlow(doc);
    const moved = nodes.map((n) =>
      n.id === 'n-start' ? { ...n, position: { x: 999, y: 888 } } : n,
    );

    const out = flowToSchema(moved, edges, doc);

    expect(out.meta.layout!.positions!['n-start']).toEqual({ x: 999, y: 888 });
  });
});

describe('flowToSchema wires', () => {
  it('sorts wire targets so the output is stable regardless of edge order', () => {
    const doc = laidOutDoc();
    const { nodes, edges } = schemaToFlow(doc);

    const forward = flowToSchema(nodes, edges, doc);
    const reversed = flowToSchema(nodes, [...edges].reverse(), doc);

    expect(reversed).toEqual(forward);
  });

  // A node with no outgoing edges must lose the key entirely — an empty wires object
  // is a different document and would show up in an export diff.
  it('removes the wires key from a node with no outgoing edges', () => {
    const doc = laidOutDoc();
    const { nodes, edges } = schemaToFlow(doc);
    const withoutStartEdges = edges.filter((e) => e.source !== 'n-start');

    const out = flowToSchema(nodes, withoutStartEdges, doc);
    const start = out.graph.nodes.find((n) => n.id === 'n-start')!;

    expect(start).not.toHaveProperty('wires');
  });

  it('rebuilds wires from edges rather than trusting the incoming doc', () => {
    const doc = laidOutDoc();
    const { nodes, edges } = schemaToFlow(doc);
    const rewired = edges.map((e) => (e.source === 'n-start' ? { ...e, target: 'n-game-end' } : e));

    const out = flowToSchema(nodes, rewired, doc);
    const start = out.graph.nodes.find((n) => n.id === 'n-start')!;

    expect(start.wires).toEqual({ out: ['n-game-end'] });
  });
});

describe('computeGroupRects', () => {
  const node = (id: string, x: number, y: number): CreatorNode =>
    ({
      id,
      type: 'scenarioNode',
      position: { x, y },
      data: {
        schemaNode: { id, kind: 'lifecycle.gameStart' },
        isEntry: false,
        hasErrors: false,
        errorMessages: [],
      },
    }) as CreatorNode;

  const group = (id: string, nodeIds: string[]): CreatorNode =>
    ({
      id,
      type: 'groupNode',
      position: { x: 0, y: 0 },
      data: {
        schemaNode: { id, kind: 'util.group', props: { nodeIds } },
        isEntry: false,
        hasErrors: false,
        errorMessages: [],
      },
    }) as CreatorNode;

  it('fits a group around its members with padding', () => {
    const rects = computeGroupRects([
      node('a', 100, 100),
      node('b', 300, 200),
      group('g', ['a', 'b']),
    ]);

    // Nodes are 200x60, padding 24, header 36. Members span x 100→500 and y 100→260, so:
    //   x = 100 - 24                     = 76
    //   y = 100 - 24 - 36                = 40
    //   width  = (500 - 100) + 24 * 2    = 448
    //   height = (260 - 100) + 24 * 2 + 36 = 244   (header only pads the top)
    expect(rects.g).toEqual({ x: 76, y: 40, width: 448, height: 244 });
  });

  it('gives an empty group a default box at its own position', () => {
    const rects = computeGroupRects([{ ...group('g', []), position: { x: 50, y: 60 } }]);

    expect(rects.g).toEqual({ x: 50, y: 60, width: 240, height: 120 });
  });

  it('ignores member ids that no longer exist', () => {
    const rects = computeGroupRects([node('a', 100, 100), group('g', ['a', 'deleted'])]);

    expect(rects.g.width).toBeGreaterThan(0);
    expect(Number.isFinite(rects.g.x)).toBe(true);
  });
});

describe('computeGraphBounds', () => {
  it('returns the bounding box of the given positions', () => {
    expect(computeGraphBounds({ a: { x: 10, y: 20 }, b: { x: 100, y: 5 } })).toEqual({
      minX: 10,
      minY: 5,
      maxX: 100,
      maxY: 20,
    });
  });

  // Callers place a brand-new node relative to these bounds and need to distinguish
  // "no nodes yet" from a real box at the origin.
  it('returns null for an empty graph', () => {
    expect(computeGraphBounds({})).toBeNull();
  });
});
