import { create } from 'zustand';
import type { Edge, Viewport } from '@xyflow/react';
import { getUDTReferenceLayer } from '@udtc/adapters';
import {
  splitImages,
  joinImages,
  readImages,
  measureImages,
  listScenarios,
  saveScenario as dbSaveScenario,
  loadScenarioParts,
  deleteScenario as dbDeleteScenario,
  patchScenarioMeta,
  newScenarioId,
  requestPersistence,
  SNAPSHOT_VERSION,
  type ScenarioMeta,
} from '@udtc/scenario-store';
import type { ScenarioDoc, SchemaNode, ValidationResults, NodeKind } from '../types';
import type { DeckSelection } from '../decks/shared';
import {
  schemaToFlow,
  flowToSchema,
  computeGraphBounds,
  NODE_W,
  NODE_H,
  type CreatorNode,
} from '../utils/serializer';
import { slugify } from '../utils/scaffold';
import { runValidation } from '../utils/validation';
import { canonicalJson } from '../utils/canonical';
import { applyDagreLayout } from '../utils/layout';
import { syncDungeonNodes, BASE_X, BASE_Y } from '../dungeons/dungeonNodes';
import type { Dungeon } from '../dungeons/shared';
import type { Board } from '../boards/shared';
import { activeBoardId } from '../boards/shared';

// The center workspace view. The deck-builder-first-class switcher accommodates the dungeon builder.
export type CenterView = 'canvas' | 'decks' | 'dungeons' | 'boards';

interface CreatorStore {
  schemaDoc: ScenarioDoc | null;
  rfNodes: CreatorNode[];
  rfEdges: Edge[];
  selectedNodeId: string | null;
  validationResults: ValidationResults | null;
  isDirty: boolean;
  // which view fills the center grid cell (canvas vs the first-class deck builder)
  centerView: CenterView;
  // read-only mirror of DeckBuilderView's local deck/card selection, so the right-sidebar
  // DeckJsonPanel can display it. DeckBuilderView remains the sole owner/writer.
  deckSelection: DeckSelection | null;
  deckCardKey: string | null;
  // read-only mirror of DungeonBuilderView's selected dungeonId (for the DungeonJsonPanel sidebar).
  dungeonSelection: string | null;
  boardSelection: string | null;
  /**
   * The `setup.board` value displaced when a custom board was activated. `setup.board` is a
   * schema `oneOf`, so `{boardRef}` is mutually exclusive with a hand-authored `{boardState}`
   * (its `home` hero-start map and `buildings` registry) — writing one destroys the other.
   * Stashing the outgoing value lets `setActiveBoard(null)` put it back verbatim.
   *
   * Session-scoped on purpose: it is NOT persisted (no schema surface for it). The editor
   * therefore also confirms before overwriting a non-empty inline `boardState`, which covers
   * activating a board in a later session than the one that authored it.
   */
  priorSetupBoard?: Record<string, unknown>;
  // set true when an autosave fails to write (surfaced as a topbar warning chip, C3).
  // Under IndexedDB this went from routine (localStorage failed predictably at ~5 MB) to rare and
  // alarming — an IDB write failure means quota exhaustion or eviction, so the chip reads that way.
  draftSaveFailed: boolean;
  /**
   * IDB id of the scenario being edited, or null for one that has never been saved (a fresh
   * scaffold, or a doc that just arrived via Import).
   *
   * The id lives ONLY here and in the IDB envelope — never in the document. The schema forbids it:
   * root and meta are both additionalProperties:false and meta has no `id` property, so a
   * `meta.id` fails L1. The consequence is deliberate and user-visible: an exported file carries no
   * id, so export → import creates a NEW scenario rather than updating the original.
   */
  currentScenarioId: string | null;
  /**
   * The images map object as of the last IDB write — an identity marker, not a copy.
   *
   * updateResourceImages is the sole writer to library.resources.images and always spread-clones
   * it, while the sibling library mutators and flowToSchema pass `library` through by reference.
   * So `readImages(doc) !== lastSavedImages` is an exact "images changed" signal, and it is what
   * keeps the 800ms autosave writing kilobytes instead of megabytes.
   *
   * Seeded on open/save and reset on clear — otherwise a freshly-opened document has a foreign
   * identity and its first autosave needlessly rewrites the whole image blob.
   */
  lastSavedImages: Record<string, string> | undefined;
  /** cached list rows for the scenario dialog; refreshed via refreshScenarioList() */
  scenarioList: ScenarioMeta[];
  /**
   * Which scenario dialog is open. Lives in the store (alongside centerView/canvasViewport) because
   * two surfaces open them: the ScenarioBar in the left rail, and the canvas empty state. The
   * ScenarioBar is the only thing that RENDERS them.
   */
  scenarioDialog: 'new' | 'list' | null;
  // last-known canvas pan/zoom, so switching to Decks/Dungeons and back doesn't reset the viewport.
  // null means "no saved viewport yet" — CreatorCanvas falls back to fitView on mount.
  canvasViewport: Viewport | null;

  // Scenario lifecycle
  loadScenario: (doc: ScenarioDoc, autoLayout?: boolean) => void;
  exportScenario: () => string;
  clearScenario: () => void;

  // Scenario library (IndexedDB). Every one of these degrades to a no-op rather than throwing when
  // storage is unavailable — authoring must never break because persistence did.
  //
  // saveCurrent() is NOT gated on validity: saving a work-in-progress scenario is the whole point.
  // Export keeps its allOk gate, because that artifact is consumed by the Player.
  /** Persist the working document. Assigns an id on first save. Returns false if the write failed. */
  saveCurrent: () => Promise<boolean>;
  /** Persist under a NEW id, leaving any original untouched. Used by Save As, and after an Import. */
  saveCurrentAs: (title: string) => Promise<boolean>;
  /** Replace the working document with a stored one. Routes through clearScenario() first. */
  openScenario: (id: string) => Promise<boolean>;
  refreshScenarioList: () => Promise<void>;
  renameScenario: (id: string, title: string) => Promise<void>;
  duplicateScenario: (id: string) => Promise<void>;
  removeScenario: (id: string) => Promise<void>;
  /** Stamp meta.lastExportedAt — the only durable copy of a scenario is an exported file. */
  markExported: () => Promise<void>;

  // Center-view switcher + autosave-failure flag
  setCenterView: (view: CenterView) => void;
  setScenarioDialog: (dialog: 'new' | 'list' | null) => void;
  setDraftSaveFailed: (failed: boolean) => void;

  // Mirrors DeckBuilderView's local selection state (see deckSelection/deckCardKey above)
  setDeckSelection: (sel: DeckSelection | null) => void;
  setDeckCardKey: (key: string | null) => void;
  setDungeonSelection: (id: string | null) => void;
  setBoardSelection: (id: string | null) => void;
  setCanvasViewport: (viewport: Viewport | null) => void;

  // library.cards / library.decks / library.resources.images editing (schema 0.4.3, deck builder).
  // All clone-library → set-or-delete → revalidate → set, mirroring updateBattleDefs; empty
  // containers are deleted so exports stay clean.
  updateLibraryCards: (cards: Record<string, unknown>) => void;
  updateLibraryDecks: (decks: Record<string, unknown>) => void;
  updateResourceImage: (id: string, dataUrlOrNull: string | null) => void;
  // Bulk image write — one revalidate for the whole patch. Prefer this over looping
  // updateResourceImage, which is O(N²) in bytes (see the implementation).
  updateResourceImages: (patch: Record<string, string | null>) => void;
  // library.dungeons editing (schema 0.4.4, dungeon builder). Replaces the whole map (or clears it
  // when empty) AND re-syncs the subflow-gated dungeon.room graph nodes (see syncDungeonNodes).
  commitDungeons: (dungeons: Record<string, Dungeon>) => void;
  // "Add & wire dungeon subflow" helper: drop a dungeon.subflow node for a dungeon and wire it into
  // the turn loop (actionMiddle.dungeon → subflow, subflow.completed/left → actionEnd), which then
  // triggers room-node materialization. Switches to the canvas so the generated graph is visible.
  addDungeonSubflow: (dungeonId: string) => void;
  // library.boards editing (schema 0.4.6, board designer). Replaces the whole map (or clears it
  // when empty). No node sync — a board has no graph nodes (locations are opaque strings).
  commitBoards: (boards: Record<string, Board>) => void;
  // Points setup.board at a custom board, or back to the built-in RtDT board with `null`.
  // setup.board is a oneOf, so {boardRef} is mutually exclusive with a hand-authored
  // {boardState}/{boardStateRef} — see the implementation for how that value survives.
  setActiveBoard: (boardId: string | null) => void;

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
  // library.battleDefs editing (card-ladder decks, schema 0.4.2). Replaces the whole map (or clears
  // it when empty); the deck editor owns validation via revalidate.
  updateBattleDefs: (defs: Record<string, unknown>) => void;
  // sets/clears library.foes[foeId].battleDefId (defaults to the foeId when cleared).
  updateFoeBattleDefId: (foeId: string, defId: string | null) => void;
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

function annotateErrors(nodes: CreatorNode[], results: ValidationResults): CreatorNode[] {
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

/**
 * The one place a scenario is written to IndexedDB.
 *
 * Flushes the React Flow state into the document (so node positions are current), splits the image
 * payload out, and writes the image record ONLY when the images map's identity differs from the
 * last write. That check is the whole reason the 800ms autosave is affordable: the doc record is
 * kilobytes, the image record is megabytes, and a typical edit touches only the former.
 *
 * Returns false — never throws — when storage is unavailable or the write failed.
 */
async function writeCurrent(
  get: () => CreatorStore,
  set: (partial: Partial<CreatorStore>) => void,
  id: string,
): Promise<boolean> {
  const { schemaDoc, rfNodes, rfEdges, validationResults, lastSavedImages, scenarioList } = get();
  if (!schemaDoc) return false;

  const flushed = flowToSchema(rfNodes, rfEdges, schemaDoc);
  const { doc: docSansImages, images } = splitImages(flushed);
  const liveImages = readImages(flushed);
  const imagesChanged = liveImages !== lastSavedImages;
  const { bytes, count } = measureImages(images);

  // Preserve lastExportedAt across saves — it belongs to the scenario, not to this write.
  const prior = scenarioList.find((r) => r.id === id);
  const meta: ScenarioMeta = {
    version: SNAPSHOT_VERSION,
    id,
    title: schemaDoc.meta.title,
    scenarioVersion: schemaDoc.meta.scenarioVersion,
    updatedAt: Date.now(),
    imageBytes: bytes,
    imageCount: count,
    // null means "never validated", which is not the same as invalid. Saving is never gated on it.
    allOk: validationResults ? validationResults.allOk : null,
    lastExportedAt: prior?.lastExportedAt ?? null,
  };

  const ok = await dbSaveScenario(meta, docSansImages, images, imagesChanged);
  if (ok) {
    set({
      isDirty: false,
      draftSaveFailed: false,
      // Only advance the marker on a successful write, or a failed save would convince the next
      // one that the images are already on disk.
      ...(imagesChanged ? { lastSavedImages: liveImages } : {}),
    });
  } else {
    set({ draftSaveFailed: true });
  }
  return ok;
}

export const useCreatorStore = create<CreatorStore>((set, get) => ({
  schemaDoc: null,
  rfNodes: [],
  rfEdges: [],
  selectedNodeId: null,
  validationResults: null,
  isDirty: false,
  centerView: 'canvas',
  deckSelection: null,
  deckCardKey: null,
  dungeonSelection: null,
  boardSelection: null,
  priorSetupBoard: undefined,
  draftSaveFailed: false,
  canvasViewport: null,
  currentScenarioId: null,
  lastSavedImages: undefined,
  scenarioList: [],
  scenarioDialog: null,

  setCenterView(view) {
    set({ centerView: view });
  },

  setScenarioDialog(dialog) {
    set({ scenarioDialog: dialog });
  },

  setDraftSaveFailed(failed) {
    set({ draftSaveFailed: failed });
  },

  setDeckSelection(sel) {
    set({ deckSelection: sel });
  },

  setDeckCardKey(key) {
    set({ deckCardKey: key });
  },

  setDungeonSelection(id) {
    set({ dungeonSelection: id });
  },

  setBoardSelection(id) {
    set({ boardSelection: id });
  },

  setCanvasViewport(viewport) {
    set({ canvasViewport: viewport });
  },

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
      // Seed the tracker to THIS document's images. Without it a freshly-opened doc carries a
      // foreign identity and its first autosave rewrites the entire image blob for no reason.
      lastSavedImages: readImages(finalDoc),
    });
  },

  exportScenario() {
    const { schemaDoc, rfNodes, rfEdges } = get();
    if (!schemaDoc) throw new Error('No scenario loaded');
    const updated = flowToSchema(rfNodes, rfEdges, schemaDoc);
    return canonicalJson(updated);
  },

  clearScenario() {
    set({
      schemaDoc: null,
      rfNodes: [],
      rfEdges: [],
      selectedNodeId: null,
      deckSelection: null,
      deckCardKey: null,
      dungeonSelection: null,
      boardSelection: null,
      // Session-scoped, no schema surface: the setup.board oneOf stash MUST NOT survive into
      // another scenario. This is why openScenario() routes through here rather than calling
      // loadScenario() directly.
      priorSetupBoard: undefined,
      validationResults: null,
      isDirty: false,
      currentScenarioId: null,
      // A stale identity from the previous scenario would suppress the next one's first image write.
      lastSavedImages: undefined,
    });
  },

  async saveCurrent() {
    const { currentScenarioId, schemaDoc } = get();
    if (!schemaDoc) return false;
    if (!currentScenarioId) return get().saveCurrentAs(schemaDoc.meta.title);
    return writeCurrent(get, set, currentScenarioId);
  },

  async saveCurrentAs(title) {
    const { schemaDoc, rfNodes, rfEdges } = get();
    if (!schemaDoc) return false;
    const id = newScenarioId();
    // Retitle before the write so the stored document and its meta row agree.
    const retitled: ScenarioDoc = { ...schemaDoc, meta: { ...schemaDoc.meta, title } };
    set({ schemaDoc: retitled, rfNodes, rfEdges, currentScenarioId: id });
    // A brand-new library entry is the moment to ask for durable storage. Ignore the answer:
    // a denial is not an error, it just means Export stays the only durable copy.
    void requestPersistence();
    return writeCurrent(get, set, id);
  },

  async openScenario(id) {
    const stored = await loadScenarioParts(id);
    if (!stored) return false;
    // ScenarioDocLike only constrains `library`; the stored document is a full ScenarioDoc that
    // round-tripped through structured clone, so widen through unknown.
    const doc = joinImages(stored.doc, stored.images) as unknown as ScenarioDoc;
    // clearScenario FIRST: it drops priorSetupBoard, which is session-scoped with no schema
    // surface and would otherwise leak a stale setup.board stash across scenarios when the list
    // lets you switch S1 → S2 → S1 without a reload.
    get().clearScenario();
    get().loadScenario(doc, !doc.meta.layout?.positions);
    set({ currentScenarioId: id });
    return true;
  },

  async refreshScenarioList() {
    set({ scenarioList: await listScenarios() });
  },

  async renameScenario(id, title) {
    await patchScenarioMeta(id, { title, updatedAt: Date.now() });
    // Keep the working document's title in step when renaming the one that's open.
    const { currentScenarioId, schemaDoc } = get();
    if (currentScenarioId === id && schemaDoc) {
      set({ schemaDoc: { ...schemaDoc, meta: { ...schemaDoc.meta, title } }, isDirty: true });
    }
    await get().refreshScenarioList();
  },

  async duplicateScenario(id) {
    const stored = await loadScenarioParts(id);
    if (!stored) return;
    const copyId = newScenarioId();
    const title = `${stored.meta.title} (copy)`;
    // The stored record is a ScenarioDoc; ScenarioDocLike just doesn't describe meta.
    const storedDoc = stored.doc as unknown as ScenarioDoc;
    const doc = { ...storedDoc, meta: { ...storedDoc.meta, title } };
    await dbSaveScenario(
      { ...stored.meta, id: copyId, title, updatedAt: Date.now(), lastExportedAt: null },
      doc,
      stored.images,
      true,
    );
    await get().refreshScenarioList();
  },

  async removeScenario(id) {
    await dbDeleteScenario(id);
    // Deleting the open scenario detaches it: the work stays on screen but is no longer bound to a
    // library entry, so the next Save writes a new one rather than resurrecting the deleted id.
    if (get().currentScenarioId === id) set({ currentScenarioId: null, isDirty: true });
    await get().refreshScenarioList();
  },

  async markExported() {
    const { currentScenarioId } = get();
    if (!currentScenarioId) return;
    await patchScenarioMeta(currentScenarioId, { lastExportedAt: Date.now() });
    await get().refreshScenarioList();
  },

  syncFromRF(nodes, edges) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated = flowToSchema(nodes, edges, schemaDoc);
    const results = revalidate(updated);
    const annotated = annotateErrors(nodes, results);
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
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
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
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
        : (() => {
            const { wires: _w, ...rest } = next;
            void _w;
            return rest;
          })();
    });
    const newEntry =
      schemaDoc.graph.entry === id && cleanNodes.length > 0
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
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
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
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
  },

  updateNodeLabel(id, label) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const updated: ScenarioDoc = {
      ...schemaDoc,
      graph: {
        ...schemaDoc.graph,
        nodes: schemaDoc.graph.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
      },
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
    });
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
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
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

    const setOrDelete = (
      obj: Record<string, unknown>,
      key: string,
      val: string | null | undefined,
    ) => {
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
      const existingId =
        typeof selections.mainGoalId === 'string' ? selections.mainGoalId : undefined;
      if (existingId && quests[existingId]) {
        quests[existingId] = { ...(quests[existingId] as Record<string, unknown>), name: trimmed };
      } else {
        const id = slugify(trimmed) || 'main-goal';
        quests[id] = {
          id,
          name: trimmed,
          isMainGoal: true,
          outcomes: { success: [], failure: [] },
        };
        selections.mainGoalId = id;
      }
    }

    setup.selections = selections;
    library.quests = quests;
    const updated: ScenarioDoc = { ...schemaDoc, setup, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // library.battleDefs is scenario-wide (not node-scoped) — like updateSetupSelections, this only
  // re-validates; no React Flow re-derivation is needed.
  updateBattleDefs(defs) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    if (Object.keys(defs).length > 0) library.battleDefs = defs;
    else delete library.battleDefs;
    const updated: ScenarioDoc = { ...schemaDoc, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  updateFoeBattleDefId(foeId, defId) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    const foes = { ...((library.foes as Record<string, unknown>) ?? {}) };
    const foe = { ...((foes[foeId] as Record<string, unknown>) ?? {}) };
    if (defId) foe.battleDefId = defId;
    else delete foe.battleDefId;
    foes[foeId] = foe;
    library.foes = foes;
    const updated: ScenarioDoc = { ...schemaDoc, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // library.cards is scenario-wide (schema 0.4.3) — replaces the whole map or clears it when empty.
  updateLibraryCards(cards) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    if (Object.keys(cards).length > 0) library.cards = cards;
    else delete library.cards;
    const updated: ScenarioDoc = { ...schemaDoc, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // library.decks is scenario-wide (schema 0.4.3) — replaces the whole map or clears it when empty.
  updateLibraryDecks(decks) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    if (Object.keys(decks).length > 0) library.decks = decks;
    else delete library.decks;
    const updated: ScenarioDoc = { ...schemaDoc, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // Set or clear one library.resources.images[id] (a resolved data URL). Empty images/resources
  // containers are deleted so exports never carry empty scaffolding.
  updateResourceImage(id, dataUrlOrNull) {
    get().updateResourceImages({ [id]: dataUrlOrNull });
  },

  // Bulk form of updateResourceImage: one clone + ONE revalidate for the whole patch.
  //
  // Calling the single form in a loop is O(N²) in bytes — each iteration revalidates a document
  // that just grew, and AJV runs its `format: uri` regex over every embedded base64 payload again.
  // Measured importing 20x400KB: 164ms into an empty doc, but 2123ms into one already holding a
  // 50MB image budget. The cost scales with the document's existing size, not the patch's.
  //
  // A null/undefined value clears that id, matching updateResourceImage's contract.
  updateResourceImages(patch) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    if (Object.keys(patch).length === 0) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    const resources = { ...((library.resources as Record<string, unknown>) ?? {}) };
    const images = { ...((resources.images as Record<string, unknown>) ?? {}) };
    for (const [id, dataUrlOrNull] of Object.entries(patch)) {
      if (dataUrlOrNull) images[id] = dataUrlOrNull;
      else delete images[id];
    }
    if (Object.keys(images).length > 0) resources.images = images;
    else delete resources.images;
    if (Object.keys(resources).length > 0) library.resources = resources;
    else delete library.resources;
    const updated: ScenarioDoc = { ...schemaDoc, library };
    const results = revalidate(updated);
    set({ schemaDoc: updated, validationResults: results, isDirty: true });
  },

  // library.dungeons is scenario-wide (schema 0.4.4). Unlike the deck mutators, this also re-syncs
  // the dungeon.room graph nodes — but subflow-gated (syncDungeonNodes): only a dungeon a
  // dungeon.subflow references materializes room nodes, so defining a dungeon never orphans nodes.
  commitDungeons(dungeons) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    if (Object.keys(dungeons).length > 0) library.dungeons = dungeons;
    else delete library.dungeons;

    // Rebuild the graph's dungeon nodes + merge their layout positions.
    const withLibrary: ScenarioDoc = { ...schemaDoc, library };
    const { nodes, positions } = syncDungeonNodes(withLibrary, dungeons);
    const layout = {
      ...schemaDoc.meta.layout,
      positions: { ...(schemaDoc.meta.layout?.positions ?? {}), ...positions },
    };
    const updated: ScenarioDoc = {
      ...withLibrary,
      meta: { ...schemaDoc.meta, layout },
      graph: { ...schemaDoc.graph, nodes },
    };
    const { nodes: rfNodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(rfNodes, results);
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
  },

  commitBoards(boards) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const library = { ...((schemaDoc.library as Record<string, unknown> | undefined) ?? {}) };
    if (Object.keys(boards).length > 0) library.boards = boards;
    else delete library.boards;

    let updated: ScenarioDoc = { ...schemaDoc, library };

    // If the ACTIVE board was just deleted, setup.board would be left pointing at nothing (a
    // dangling boardRef — an L2 error). Fall back to the built-in RtDT board, restoring any
    // stashed inline boardState exactly as setActiveBoard(null) does: deleting a board must not
    // eat an authored boardState either.
    const active = activeBoardId(updated);
    if (active !== null && !(active in boards)) {
      const prior = get().priorSetupBoard;
      updated = {
        ...updated,
        setup: { ...updated.setup, board: prior ?? { boardStateRef: 'board-main' } },
      };
      set({ priorSetupBoard: undefined });
    }

    const { nodes: rfNodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(rfNodes, results);
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
  },

  setActiveBoard(boardId) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    const setup = { ...(schemaDoc.setup as Record<string, unknown>) };
    const current = setup.board;

    if (boardId === null) {
      // Back to the built-in RtDT board: restore whatever setup.board held before the custom
      // board took over, so a hand-authored inline boardState (hero homes + buildings registry)
      // survives the round-trip. Only fall back to the scaffold's boardStateRef if there was
      // nothing to restore.
      const prior = get().priorSetupBoard;
      setup.board = prior ?? { boardStateRef: 'board-main' };
      set({ priorSetupBoard: undefined });
    } else {
      // {boardRef} is a oneOf branch — writing it DESTROYS an inline {boardState}. Stash the
      // outgoing value so toggling back restores it. (Stash it only on the way in from a
      // non-boardRef value; switching custom→custom must not overwrite the original stash.)
      const isBoardRef =
        current !== null &&
        typeof current === 'object' &&
        !Array.isArray(current) &&
        'boardRef' in (current as Record<string, unknown>);
      if (!isBoardRef && current !== undefined) {
        set({ priorSetupBoard: current as Record<string, unknown> });
      }
      setup.board = { boardRef: boardId };
    }

    const updated: ScenarioDoc = { ...schemaDoc, setup };
    const { nodes: rfNodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(rfNodes, results);
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
  },

  addDungeonSubflow(dungeonId) {
    const { schemaDoc } = get();
    if (!schemaDoc) return;
    let nodes: SchemaNode[] = [...schemaDoc.graph.nodes];
    const already = nodes.find(
      (n) =>
        n.kind === 'dungeon.subflow' &&
        (n.props as { dungeonId?: string } | undefined)?.dungeonId === dungeonId,
    );
    let newSubflowId: string | undefined;
    let newSubflowPosition: { x: number; y: number } | undefined;
    if (!already) {
      let subflowId = `n-dsub-${dungeonId}`;
      let i = 2;
      while (nodes.some((n) => n.id === subflowId)) subflowId = `n-dsub-${dungeonId}-${i++}`;
      const middles = nodes.filter((n) => n.kind === 'lifecycle.actionMiddle');
      const returnTarget = nodes.find((n) => n.kind === 'lifecycle.actionEnd')?.id;
      const subflow: SchemaNode = { id: subflowId, kind: 'dungeon.subflow', props: { dungeonId } };
      if (returnTarget) subflow.wires = { completed: [returnTarget], left: [returnTarget] };
      // Wire the turn loop's dungeon port only when there's exactly one actionMiddle AND its dungeon
      // port is empty — never clobber an existing dungeon wire (a turn's dungeon action routes to one
      // subflow; a second dungeon must be routed by the author, so we leave it for manual wiring).
      if (middles.length === 1) {
        const mid = middles[0];
        const dungeonPort = mid.wires?.dungeon ?? [];
        if (dungeonPort.length === 0) {
          nodes = nodes.map((n) =>
            n.id === mid.id ? { ...n, wires: { ...n.wires, dungeon: [subflowId] } } : n,
          );
        }
      }
      // Give the new node a real position instead of leaving it unpositioned (schemaToFlow would
      // otherwise stack it at {x: i*260, y: 0} using its raw array index — far to the right of an
      // already-sizable graph). Anchor near the single actionMiddle it's wiring into when that's
      // unambiguous; otherwise there's no correct node to anchor to, so land it just past the
      // current graph's bounding-box edge instead.
      const midPosition =
        middles.length === 1 ? schemaDoc.meta.layout?.positions?.[middles[0].id] : undefined;
      if (midPosition) {
        newSubflowPosition = { x: midPosition.x + NODE_W + 40, y: midPosition.y + NODE_H + 40 };
      } else {
        const bounds = computeGraphBounds(schemaDoc.meta.layout?.positions ?? {});
        newSubflowPosition = bounds
          ? { x: bounds.maxX + NODE_W + 40, y: bounds.minY }
          : { x: BASE_X, y: BASE_Y };
      }
      newSubflowId = subflowId;
      nodes.push(subflow);
    }
    const withNode: ScenarioDoc = { ...schemaDoc, graph: { ...schemaDoc.graph, nodes } };
    const dungeons = ((withNode.library as Record<string, unknown> | undefined)?.dungeons ??
      {}) as Record<string, Dungeon>;
    const { nodes: synced, positions } = syncDungeonNodes(withNode, dungeons);
    const layout = {
      ...schemaDoc.meta.layout,
      positions: {
        ...(schemaDoc.meta.layout?.positions ?? {}),
        ...(newSubflowId && newSubflowPosition ? { [newSubflowId]: newSubflowPosition } : {}),
        ...positions,
      },
    };
    const updated: ScenarioDoc = {
      ...withNode,
      meta: { ...schemaDoc.meta, layout },
      graph: { ...withNode.graph, nodes: synced },
    };
    const { nodes: rfNodes, edges } = deriveRF(updated);
    const results = revalidate(updated);
    const annotated = annotateErrors(rfNodes, results);
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
      centerView: 'canvas',
      // Force a fit-to-content on the canvas we're about to reveal, so the newly-wired
      // subflow node is visible instead of restoring wherever the user last panned to.
      canvasViewport: null,
    });
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
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
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
    set({
      schemaDoc: updated,
      rfNodes: annotated,
      rfEdges: edges,
      validationResults: results,
      isDirty: true,
    });
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
