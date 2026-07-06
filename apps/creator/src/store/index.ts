import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import { getUDTReferenceLayer } from '@udtc/adapters';
import type { ScenarioDoc, SchemaNode, ValidationResults, NodeKind } from '../types';
import { schemaToFlow, flowToSchema, type CreatorNode } from '../utils/serializer';
import { slugify } from '../utils/scaffold';
import { runValidation } from '../utils/validation';
import { canonicalJson } from '../utils/canonical';
import { applyDagreLayout } from '../utils/layout';

interface CreatorStore {
  schemaDoc: ScenarioDoc | null;
  rfNodes: CreatorNode[];
  rfEdges: Edge[];
  selectedNodeId: string | null;
  validationResults: ValidationResults | null;
  isDirty: boolean;

  // Scenario lifecycle
  loadScenario: (doc: ScenarioDoc, autoLayout?: boolean) => void;
  exportScenario: () => string;
  clearScenario: () => void;

  // RF state sync (called by canvas on drag-end, connect, delete)
  syncFromRF: (nodes: CreatorNode[], edges: Edge[]) => void;
  setRfNodes: (nodes: CreatorNode[]) => void;
  setRfEdges: (edges: Edge[]) => void;

  // Node mutations (patch schemaDoc + re-derive RF state)
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  syncLibraryHeroes: (heroIds: string[]) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeDescription: (id: string, description: string) => void;
  updateScenarioDescription: (description: string) => void;
  // setup.selections editing (optional standard-game selections, schema 0.4.1). A falsy/null value
  // clears the field; a truthy value sets it. Keys absent from the patch are left untouched.
  updateSetupSelections: (patch: {
    adversaryId?: string | null;
    allyId?: string | null;
    tier1FoeId?: string | null;
    tier2FoeId?: string | null;
    tier3FoeId?: string | null;
  }) => void;
  updateMainGoal: (title: string) => void;
  createGroup: (nodeIds: string[]) => void;
  setEntry: (id: string) => void;

  // Selection
  selectNode: (id: string | null) => void;

  // Auto-layout
  applyLayout: () => void;
}

let _nodeCounter = 0;

function deriveRF(doc: ScenarioDoc): { nodes: CreatorNode[]; edges: Edge[] } {
  return schemaToFlow(doc);
}

function revalidate(doc: ScenarioDoc): ValidationResults {
  return runValidation(doc);
}

function annotateErrors(
  nodes: CreatorNode[],
  results: ValidationResults,
): CreatorNode[] {
  const errorsByNode: Record<string, string[]> = {};
  for (const err of [...results.l2.errors, ...results.l3.errors]) {
    // Errors that reference a node id (heuristic: look for quoted ids like "n-xxx")
    const match = err.match(/"([a-z0-9]+(?:[-_][a-z0-9]+)*)"/);
    if (match) {
      const nodeId = match[1];
      errorsByNode[nodeId] ??= [];
      errorsByNode[nodeId].push(err);
    }
  }
  return nodes.map((n) => {
    const msgs = errorsByNode[n.id] ?? [];
    return {
      ...n,
      data: {
        ...n.data,
        hasErrors: msgs.length > 0,
        errorMessages: msgs,
      },
    };
  });
}

export const useCreatorStore = create<CreatorStore>((set, get) => ({
  schemaDoc: null,
  rfNodes: [],
  rfEdges: [],
  selectedNodeId: null,
  validationResults: null,
  isDirty: false,

  loadScenario(doc, autoLayout = false) {
    const { nodes: derivedNodes, edges } = deriveRF(doc);
    let nodes = derivedNodes;
    let finalDoc = doc;
    if (autoLayout) {
      nodes = applyDagreLayout(nodes, edges);
      // Bake the computed positions back into the doc we store, so schemaDoc.meta.layout.positions
      // never diverges from rfNodes — any later mutation re-derives rfNodes from schemaDoc.
      finalDoc = flowToSchema(nodes, edges, doc);
    }
    const results = revalidate(doc);
    const annotated = annotateErrors(nodes, results);
    set({
      schemaDoc: finalDoc,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: false,
    });
  },

  exportScenario() {
    const { schemaDoc, rfNodes, rfEdges } = get();
    if (!schemaDoc) throw new Error('No scenario loaded');
    const updated = flowToSchema(rfNodes, rfEdges, schemaDoc);
    return canonicalJson(updated);
  },

  clearScenario() {
    set({ schemaDoc: null, rfNodes: [], rfEdges: [], selectedNodeId: null, validationResults: null, isDirty: false });
  },

  syncFromRF(nodes, edges) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated = flowToSchema(nodes, edges, schemaDoc);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  setRfNodes(nodes) {
    set({ rfNodes: nodes });
  },

  setRfEdges(edges) {
    set({ rfEdges: edges });
  },

  addNode(kind, position) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    _nodeCounter += 1;
    const id = `n-${kind.replace('.', '-')}-${_nodeCounter}`;
    const newNode: SchemaNode =
      kind === 'util.group' ? { id, kind, props: { nodeIds: [] } } : { id, kind };
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: { ...schemaDoc.graph, nodes: [...schemaDoc.graph.nodes, newNode] },
    };
    const { nodes: derivedNodes, edges } = deriveRF(updated);
    // Set position for the new node
    const nodes = derivedNodes.map((n) => (n.id === id ? { ...n, position } : n));
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  deleteNode(id) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const filteredNodes = schemaDoc.graph.nodes.filter((n) => n.id !== id);
    // Also remove wires pointing to deleted node, and drop it from any group's membership
    const cleanNodes = filteredNodes.map((n) => {
      let next = n;
      if (n.kind === 'util.group') {
        const props = n.props as { color?: string; nodeIds?: string[] } | undefined;
        if (props?.nodeIds?.includes(id)) {
          next = { ...next, props: { ...props, nodeIds: props.nodeIds.filter((m) => m !== id) } };
        }
      }
      if (!next.wires) return next;
      const cleanWires: Record<string, string[]> = {};
      for (const [handle, targets] of Object.entries(next.wires)) {
        const filtered = targets.filter((t) => t !== id);
        if (filtered.length > 0) cleanWires[handle] = filtered;
      }
      return Object.keys(cleanWires).length > 0
        ? { ...next, wires: cleanWires }
        : (() => { const { wires: _w, ...rest } = next; void _w; return rest; })();
    });
    const newEntry = schemaDoc.graph.entry === id && cleanNodes.length > 0
      ? cleanNodes[0].id
      : schemaDoc.graph.entry;
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: { entry: newEntry, nodes: cleanNodes },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
      selectedNodeId: null,
    });
  },

  updateNodeProps(id, props) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: {
        ...schemaDoc.graph,
        nodes: schemaDoc.graph.nodes.map((n) =>
          n.id === id ? { ...n, props: { ...n.props, ...props } } : n,
        ),
      },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  // lifecycle.selectHero: ensure a library.heroes entry exists for every heroId in a node's
  // candidate pool. Additive-only — never prunes an entry when a heroId is removed from one
  // node's pool, since other authoring could still reference it.
  syncLibraryHeroes(heroIds) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const existing = (schemaDoc.library?.heroes as Record<string, unknown>) ?? {};
    const nextHeroes = { ...existing };
    const udtHeroById = getUDTReferenceLayer().heroById;
    for (const id of heroIds) {
      if (!nextHeroes[id]) {
        const h = udtHeroById[id];
        nextHeroes[id] = { heroId: id, source: h?.source ?? 'base' };
      }
    }
    const updated: ScenarioDoc = {
      ...schemaDoc,
      library: { ...schemaDoc.library, heroes: nextHeroes },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  updateNodeLabel(id, label) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: {
        ...schemaDoc.graph,
        nodes: schemaDoc.graph.nodes.map((n) =>
          n.id === id ? { ...n, label } : n,
        ),
      },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  updateNodeDescription(id, description) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: {
        ...schemaDoc.graph,
        nodes: schemaDoc.graph.nodes.map((n) => {
          if (n.id !== id) return n;
          if (description.trim() === '') {
            const { description: _d, ...rest } = n;
            void _d;
            return rest;
          }
          return { ...n, description };
        }),
      },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  updateScenarioDescription(description) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    let meta = { ...schemaDoc.meta };
    if (description.trim() === '') {
      const { description: _d, ...rest } = meta;
      void _d;
      meta = rest;
    } else {
      meta = { ...meta, description };
    }
    const updated: ScenarioDoc = { ...schemaDoc, meta };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // setup.selections are scenario-wide levers (not node-scoped), so — like updateScenarioDescription —
  // this only re-validates; no RF re-derivation is needed.
  updateSetupSelections(patch) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const setup = { ...(schemaDoc.setup as Record<string, unknown>) };
    const selections = { ...((setup.selections as Record<string, unknown>) ?? {}) };
    const foes = { ...((selections.foes as Record<string, unknown>) ?? {}) };

    const setOrDelete = (obj: Record<string, unknown>, key: string, val: string | null | undefined) => {
      if (val) obj[key] = val;
      else delete obj[key];
    };

    if ('adversaryId' in patch) setOrDelete(selections, 'adversaryId', patch.adversaryId);
    if ('allyId' in patch) setOrDelete(selections, 'allyId', patch.allyId);
    if ('tier1FoeId' in patch) setOrDelete(foes, 'tier1', patch.tier1FoeId);
    if ('tier2FoeId' in patch) setOrDelete(foes, 'tier2', patch.tier2FoeId);
    if ('tier3FoeId' in patch) setOrDelete(foes, 'tier3', patch.tier3FoeId);

    if (Object.keys(foes).length > 0) selections.foes = foes;
    else delete selections.foes;
    setup.selections = selections;

    const updated: ScenarioDoc = { ...schemaDoc, setup };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // Sets/clears the main goal. Blank title clears setup.selections.mainGoalId but leaves any existing
  // library.quests entry in place (it may be wired elsewhere via quest.complete). A new title with no
  // existing main goal creates a minimal quest and points mainGoalId at it; an existing main-goal quest
  // is renamed in place.
  updateMainGoal(title) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const trimmed = title.trim();
    const setup = { ...(schemaDoc.setup as Record<string, unknown>) };
    const selections = { ...((setup.selections as Record<string, unknown>) ?? {}) };
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    const quests = { ...((library.quests as Record<string, unknown>) ?? {}) };

    if (!trimmed) {
      delete selections.mainGoalId;
    } else {
      const existingId = typeof selections.mainGoalId === 'string' ? selections.mainGoalId : undefined;
      if (existingId && quests[existingId]) {
        quests[existingId] = { ...(quests[existingId] as Record<string, unknown>), name: trimmed };
      } else {
        const id = slugify(trimmed) || 'main-goal';
        quests[id] = { id, name: trimmed, isMainGoal: true, outcomes: { success: [], failure: [] } };
        selections.mainGoalId = id;
      }
    }

    setup.selections = selections;
    library.quests = quests;
    const updated: ScenarioDoc = { ...schemaDoc, setup, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  createGroup(nodeIds) {
    const { schemaDoc } = get();
    if (!schemaDoc || nodeIds.length === 0) return;
    _nodeCounter += 1;
    const id = `n-util-group-${_nodeCounter}`;
    const newNode: SchemaNode = {
      id,
      kind: 'util.group',
      label: 'Group',
      props: { nodeIds: [...nodeIds].sort() },
    };
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: { ...schemaDoc.graph, nodes: [...schemaDoc.graph.nodes, newNode] },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  setEntry(id) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: { ...schemaDoc.graph, entry: id },
    };
    const { nodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    // Re-annotate isEntry flag
    const annotated = annotateErrors(
      nodes.map((n) => ({ ...n, data: { ...n.data, isEntry: n.id === id } })),
      results,
    );
    set({ schemaDoc: updated, rfNodes: annotated, rfEdges: edges, validationResults: results, isDirty: true });
  },

  selectNode(id) {
    set({ selectedNodeId: id });
  },

  applyLayout() {
    const { rfNodes, rfEdges, schemaDoc } = get();
    if (!schemaDoc) return;
    const laid = applyDagreLayout(rfNodes, rfEdges);
    const updated = flowToSchema(laid, rfEdges, schemaDoc);
    set({ schemaDoc: updated, rfNodes: laid, isDirty: true });
  },
}));
