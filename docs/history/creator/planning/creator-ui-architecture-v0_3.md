# Return to Dark Tower — Scenario Creator: UI / Frontend Architecture

**v0.3 · Draft for review · 2026-06-27**
**Companion to:** Creator PRD v0.3 (§6, §6.3), Block Catalog v0.3, Scenario Schema v0.4, Rules-Engine Contract v0.3
**Stack decision:** React + React Flow (`@xyflow/react`)

> **What this document is.** PRD §6.3 already *decided the authoring model* — a Node-RED skin with three borrowed Blueprint ideas. The block catalog already enumerates *what* the palette contains. This document takes those as given and answers the next question: **how the Creator's frontend is actually built in React** — which canvas library, how the catalog's blocks become React components, how the three "special" nodes work, how the on-screen graph round-trips to the canonical schema, and how validation and preview surface in the UI.
>
> **Grounding convention.** Claims tagged **[verified]** are already decided in a pinned project doc (PRD / catalog / schema / contract). Claims tagged **[proposed]** are new frontend-architecture decisions made *here* and open to revision. Ecosystem entities are referenced by id, never redefined.

---

## 1. Scope

**In scope:** the React frontend of the Creator — app shell, the node canvas, the palette, the inspector, the custom node components, typed pins, the graph↔schema serialization boundary, validation surfacing, and the embedded simulator/preview panel.

**Out of scope (consumed, not defined here):** the shared **rules engine** (`engine.js`, a workspace package — the Creator's simulator and the Player's runtime both call its `init`/`step`); the **scenario schema** (v0.4 — the source of truth); the **Relay protocol**; and Board/Display internals. The frontend is a *view and editor* over the schema and a *driver* of the engine; it owns neither.

---

## 2. What the UI must do (requirements distilled)

These are the binding constraints the library and architecture have to satisfy. All are **[verified]** against the cited doc.

| # | Requirement | Source |
|---|---|---|
| R1 | **Free-form manual node placement**, Node-RED style. The reference graph (`IMG_4019`) is hand-positioned, not auto-arranged. | PRD §6.3; catalog §1 |
| R2 | **Every node is a rich custom component** — a battle screen, a market, a read-aloud prompt, a config card — not a generic labelled box. | Catalog §1.1, §3–§13 |
| R3 | **Three nodes need a full editor *inside* the node/modal:** the **Timeline** node (per-channel lanes), the **embedded Board editor**, and the **dungeon grid sub-editor**. | CR-6.11, CR-7.2.2, catalog §5 |
| R4 | **Typed reference pins** — a foe/location/building/dungeon-room/advantage/deck/light-sequence pin accepts only its own type, so an invalid wire is *impossible at author time*. | CR-6.10; schema §9 (L2/L3) |
| R5 | **Flow nodes (ports) vs. config nodes (no ports)** — the Node-RED config-node pattern for the scenario's "nouns." | Catalog §1.2 |
| R6 | **11 palette categories (A–K), each with color *and* icon/shape *and* label — never color alone.** | CR-6.8; catalog §2 |
| R7 | **Graph-hygiene primitives:** Subflow (click-into), Link In/Out, Group, Comment. | Catalog §1.4, §12 |
| R8 | **Large graphs stay responsive; offline-first; autosave + versioning; no silent data loss.** | CR-9.3 |
| R9 | **Optional Power-Author exec/data wire split** (single wire by default). | CR-6.12 |
| R10 | **Embedded simulator/preview** that step-throughs the authored graph against Display (software tower) and Board (software board) — using the *same* engine the Player runs. | PRD §5 & §12; Rules-Engine §5 (`step`); schema §9 (L4) |
| R11 | **Export is gated by validation** — a scenario that would fail mid-game must fail at author time (100% of exports must load in the Player). | PRD §13; schema §9 |

The two requirements that **decide the library** are **R1 (free placement)** and **R2/R3 (every node — including big embedded editors — is arbitrary React)**.

---

## 3. Library decision

> **The PRD's own position.** PRD §6.3 states this is "a UX/semantics decision, not a framework lock-in," and that React Flow, LiteGraph.js, and Rete "can each render either style and impose no runtime of their own." So the candidates were already narrowed; the other-LLM research adds **Reaflow** and **AntV X6**. This section makes the actual call against *our* R1–R11.

### 3.1 Decision matrix

| Requirement | React Flow | Reaflow | Rete.js | AntV X6 | LiteGraph.js |
|---|---|---|---|---|---|
| R1 free manual placement | ✅ absolute coords | ❌ ELK auto-layout is its core | ✅ | ✅ | ✅ |
| R2 node = arbitrary React | ✅ nodes *are* React components | ⚠️ SVG-centric | ✅ via `rete-react-plugin` | ⚠️ SVG/HTML, not React-component-first | ❌ canvas-rendered, not DOM/React |
| R3 embedded sub-editors in a node | ✅ trivial (React inside a node) | ⚠️ awkward | ⚠️ possible, heavier | ⚠️ possible, heavier | ❌ hostile (canvas) |
| R4 typed pins | ✅ `Handle` + `isValidConnection` | ⚠️ manual | ✅ typed sockets (its strength) | ✅ port validation | ✅ typed slots |
| R6 ships background/minimap/controls/toolbar | ✅ all built-in | ⚠️ partial | ✅ via plugins | ✅ | ⚠️ canvas-native |
| R8 large-graph perf | ✅ only changed nodes re-render | ⚠️ | ✅ | ✅ | ✅ (canvas) |
| Brings its *own* execution VM? | ✅ no (pure UI) | ✅ no | ❌ **yes** — dataflow/control-flow engines | ✅ no | ⚠️ has an exec model |
| License / maintenance | **MIT, v12.x, actively maintained** | MIT, maintained | MIT (v2), maintained | MIT, maintained | MIT |

*(React Flow facts confirmed current: `@xyflow/react` is MIT-licensed, on the v12 line, custom nodes are plain React components, and it ships Background / MiniMap / Controls / Panel / NodeToolbar / NodeResizer with only-changed-node rendering.)*

### 3.2 Verdicts

**✅ React Flow (`@xyflow/react`) — chosen.** It is the only candidate that satisfies R1, R2, and R3 *natively and simultaneously*. Nodes are ordinary React components, so the battle screen, the market, the read-aloud form — and crucially the **Timeline node, the embedded Board editor, and the dungeon grid sub-editor** — are just React rendered inside a node or a modal launched from one. `Handle` + `isValidConnection` implements **typed pins (R4)** at the connection layer, which is exactly where CR-6.10 wants validation to live. Background/MiniMap/Controls/NodeToolbar cover R6's chrome out of the box, and "only changed nodes re-render" covers R8. It imports **no runtime of its own** — it is a canvas, not a VM — which keeps the engine boundary clean (the engine is a shared package; the UI must not grow a second one). The other-LLM recommendation lands on the right library; this doc adopts it for the sharper, project-specific reason that *our* nodes are heavyweight embedded editors, not labelled boxes.

**❌ Reaflow — no, and this corrects the research's framing.** The other LLM positioned Reaflow as "ideal if you want nodes to automatically snap into clean DAG workflows." That auto-layout *is the disqualifier* for us: the Creator's entire UX premise (R1) is Node-RED-style **manual** placement — the designer arranges the spine by hand, and the reference graph proves it. Reaflow is ELK-layout-driven by default; adopting it would mean fighting the product's core interaction. Auto-arrange is, at most, an optional one-shot "tidy graph" command — and we can get *that* on top of React Flow with **dagre as a clickable control (§4.9)** when we want it, without surrendering free placement the rest of the time.

**❌ Rete.js — no.** Rete is a visual-*programming framework* with its own dataflow and control-flow **processing engines**. We already own the execution model: the shared rules engine plus the schema's closed effect/tower/media verb vocabulary. Bringing Rete's engine in would duplicate and compete with `engine.js` and blur the "the engine is a shared package, not the Creator's" boundary that the monorepo architecture was specifically designed to keep clean (PRD §2.4). We need a canvas, not a second interpreter.

**❌ AntV X6 — no.** Enterprise-grade SVG/HTML diagramming, very capable, but its node model is not "a React component." The embedded sub-editors (R3) and the typed-pin ergonomics (R4) are more friction than in React Flow, and we'd be pulling in an opinionated diagramming engine whose strengths (topology graphs, mind maps, auto-routing) we don't need.

**❌ LiteGraph.js — no (the PRD's own shortlist entry).** It is the Blueprint-style, **canvas-rendered** library behind ComfyUI. Canvas rendering is fast, but it means nodes are *not* DOM/React — embedding Board's editing UI, a dungeon grid, or rich validated forms *inside a node* is precisely what canvas rendering is bad at (R3). We want the Blueprint *ideas* — typed pins and a Timeline — which CR-6.10/6.11 already scoped; we get those on React Flow **without** giving up React-component nodes.

> **Conclusion.** React Flow, on `@xyflow/react` v12, MIT. It is the load-bearing choice for R1–R4 and R6/R8; everything else in this document assumes it.

---

## 4. Proposed frontend architecture

### 4.1 App shell *(proposed)*

```
┌────────────┬──────────────────────────────────────┬──────────────┐
│  PALETTE   │              CANVAS                   │  INSPECTOR   │
│ (cat A–K,  │   React Flow: spine + subflows,       │ edit form    │
│  drag to   │   pan / zoom / multi-select,          │ for the      │
│  canvas)   │   Background grid · MiniMap · Controls│ selected node│
│            │                                       │ (its props = │
│            │                                       │ its contract)│
├────────────┴──────────────────────────────────────┴──────────────┤
│  PREVIEW / SIMULATOR  — Run the graph via engine.step against      │
│  Display (software tower) + Board (software board); problem panel  │
└───────────────────────────────────────────────────────────────────┘
```

Four regions: **Palette** (left, categories A–K, drag-to-canvas), **Canvas** (center, the React Flow surface), **Inspector** (right, the selected node's edit form — "the block's contract" per catalog §1.1), and a dockable **Preview/Simulator** (bottom). Config nodes (R5) live in a palette section that opens their edit form but places no wired node.

### 4.2 Node-type registry *(proposed; mirrors a [verified] enum)*

A single `nodeTypes` map keyed by the schema's **closed `kind` enum** → React component; an unknown `kind` fails at load (L1). The mapping is *not* uniformly one-block-per-`kind`, and the difference matters for how many components we build:

- **Categories A, B, C, D, E, H, I, K** — block ≈ `kind`: one component each (`lifecycle.gameStart`, `action.battle`, `dungeon.subflow`, `event.router`, …).
- **Category F (effects) collapses to a *single* `kind`: `effect.apply`.** Its `props` carry one `effect` (or `effects[]`) from the closed `$defs/effect` union, discriminated on **`op`**. So the ~35 effect verbs are **one** `EffectNode` component that dispatches on `op` — not 35 node types.
- **Category G (tower) collapses to a *single* `kind`: `tower.op`.** Its `props.towerOp` comes from the closed `$defs/towerOp` union, discriminated on **`channel`**. One `TowerOpNode` dispatches on `channel`; **the Timeline node is simply its `channel: "timeline"` variant** (§4.5).
- **Category J (config/reference) has *no* `kind` at all.** Config "nodes" are the scenario's nouns — they live in the schema's **`library`** (keyed by id) and are referenced by typed pins, never wired into `graph.nodes`. They are edited in a **separate forms/sidebar panel**, not via `nodeTypes`.

So the *palette* is richer than the `kind` enum: a palette entry resolves to a `(kind, props)` pair (e.g. every effect verb is a distinct palette block that drops an `effect.apply` node pre-set to that `op`).

```tsx
const nodeTypes = {
  // A–E, H, I, K — one component per kind (block ≈ kind)
  "lifecycle.gameStart": GameStartNode,
  "lifecycle.playerTurn": PlayerTurnNode,
  "action.battle": BattleNode,
  "action.trade": TradeNode,
  "dungeon.subflow": DungeonSubflowNode,   // click-into nested scope (§4.5)
  "event.router": EventRouterNode,
  // F — ALL effect verbs are ONE kind; props.effect picks the op
  "effect.apply": EffectNode,              // dispatches on $defs/effect `op`
  // G — ALL tower channels are ONE kind; props.towerOp picks the channel
  "tower.op": TowerOpNode,                 // Timeline = the `timeline` channel (§4.5)
  // …one component per remaining graph kind
};
// J config/reference nodes are NOT here — they live in `library`,
// are referenced by id, and are edited in a separate forms panel.
```

Each palette category carries its `{ color, icon, shape, label }` as **structural metadata**, so **CR-6.8 (never color alone, R6)** is enforced once at the category level rather than re-decided per node:

| Cat | Color | Icon/shape | Wired? |
|---|---|---|---|
| A Lifecycle | slate | ▸ bar | flow |
| B Turn actions | amber | 📄 | flow |
| C Battle/Dungeon | red | ⚙ | flow |
| D Events | olive | ✉ | flow |
| E Triggers/Cond | cyan | 🔍/fork | flow |
| F Effects | green | ⚡ | flow |
| G Tower | indigo | 🗼 | flow |
| H Media | purple | 🎬 | flow |
| I Win/Loss | charcoal | 🏁 | flow |
| J Config | grey | 🗺 | **config (no ports)** |
| K Hygiene | neutral | ⋯ | mixed |

(Category **J** appears in the palette but is library-backed — its cards open a forms panel and write to `library`, they are not wired canvas nodes.)

### 4.3 Custom node anatomy *(proposed)*

Every flow node renders the same skeleton: **header** (category color + icon/shape + label), **surface badge** (App / Tower / Media / Silent — the runtime presence from catalog §1.3), **body** (the per-`kind` mini-form or rich UI), **ports** (`Handle`s, left=in / right=out, named outputs as separate handles), and a **validation ring** (green/amber/red from §4.7). Config nodes drop the ports and the surface badge.

### 4.4 Typed pins — R4 *(proposed mechanism for a [verified] requirement)*

Each `Handle` is tagged with its pin type; `isValidConnection` rejects any wire whose source/target types don't match, so the invalid connection never forms. Reference *values* (which foe, which location) come from **typed dropdowns sourced from the pinned ecosystem enums** — `FOES`, `ADVERSARY_ROSTER`, `BOARD_LOCATIONS`, `TOWER_LIGHT_SEQUENCES`, `TOWER_AUDIO_LIBRARY`, `GLYPHS`, `HEROES`, `BuildingType` — at `meta.pins.*`. This pushes schema **validation layers 2 (reference) and 3 (graph/port-type)** to author time, which is the whole point of CR-6.10.

```tsx
const isValidConnection = (c) =>
  pinType(c.sourceHandle) === pinType(c.targetHandle);
```

### 4.5 The three special nodes — R3 *(proposed)*

These are where "every node is React" earns its keep.

- **Timeline node** *(CR-6.11, [verified] spec).* A custom node whose body is a **tick ruler (50 Hz / 20 ms)** with **one lane per channel — lights, sound, drum, seal** — and **explicit timed waits** (never chain-on-complete, because the tower reports "complete" when an action *starts*). It composes **real** ops (a named `TOWER_LIGHT_SEQUENCES` id, a `TOWER_AUDIO_LIBRARY` clip, a rotation, a seal break) and compiles to `$defs/towerOp` `timeline` — it is **not** a freeform brightness-curve editor (the firmware has no interpolation). Because it's larger than a normal node, it renders a compact summary on-canvas and **expands to a full editor** (modal or side panel) on open. MVP exposes only Tier-1 baked sequences.

- **Embedded Board editor** *(CR-7.2.2, [verified]).* The "Board Setup" node hosts/launches **Board's own editing UI** (palette / inspector / summary) and produces a `BoardState` — the Creator *embeds* Board rather than building a board editor. **[blocker]** Board is unpublished; until it ships, this node uses a stub that reads/writes the `BoardState` shape, and the live editor drops in when Board publishes (the adapter-wiring "Step 2" dependency).

- **Dungeon grid sub-editor** *(catalog §5, [verified]).* A **Dungeon** is a **Subflow** node (`enter` in; `completed`/`left` out). Double-click → a **nested grid canvas**: 4-direction square rooms, **doors toggled between adjacent cells (or wired on directional ports)**, the **master bitmap previewed beneath the cells** so the image assembles "like puzzle pieces." Rooms are `dungeon.room` nodes that **exist only inside the subflow**. **[proposed]** implement the grid as either a *nested React Flow instance* (reuses ports/wires for doors) or a *bespoke grid component* (tighter for a fixed square lattice) — decide in Phase 3. Validation: exactly one target room; target reachable from an entrance; door directions geometrically consistent; bitmap covers the grid.

### 4.6 Graph ↔ schema — the source-of-truth boundary *(proposed, load-bearing)*

> **The canonical scenario schema (v0.4) is the source of truth — *not* React Flow's internal state.** React Flow's `nodes`/`edges` are a **view**. On every change the editor serializes to/from the schema's `graph` (`nodes` with `kind`/`props`/`wires`, `subflows`, `entry`). Export = serialize; import = deserialize. This is what guarantees **round-trip fidelity** (PRD §13) and keeps the editor in **lockstep** with the engine — the same graph the author wires is the graph the engine walks.

**Wires ↔ edges.** A node's named outputs are separate `Handle`s; each React Flow edge carries its `sourceHandle`. On serialize, edges collapse into the schema's `wires` map (`namedOutput → [targetNodeIds]`); on deserialize, the map fans back out into edges. Edges hold no game state of their own — they *are* the `wires` map in another shape.

Visual-only data (canvas `position`, groups, comments) is **non-semantic** and must not leak into game logic. **[proposed]** carry it in a schema-side `meta.layout` sidecar so export→import restores the *exact* layout without the engine ever seeing it. (Needs a one-line schema note so the contract acknowledges the sidecar.)

**State management [proposed]:** a Zustand store (the conventional React Flow pairing) holding `{ schemaDoc, derived RF nodes/edges, selection, validationResults }`, with **autosave + versioning** (R8). The schema doc is authoritative; RF state is derived and disposable.

### 4.7 Validation surfaced live — R11 *(proposed mapping of a [verified] strategy)*

The schema's **four validation layers** map to UI affordances, and **both apps run all four** (Creator on export, Player on load):

| Layer | What it checks | UI affordance |
|---|---|---|
| L1 Structural (ajv, draft 2020-12) | closed unions, `additionalProperties:false`, ranges | can't even construct an invalid node; bad paste rejected |
| L2 Reference | every typed id resolves vs the pinned enum or intra-file `library` | **typed dropdowns / typed pins** (§4.4) — unresolvable id not offerable |
| L3 Graph/semantic | entry exists, all wire targets exist, no unreachable nodes, dungeon target reachable, competitive nodes only when `mode=competitive` | **live problem panel** + per-node **error rings** |
| L4 **Simulation dry-run** | the step-through walks the graph against fixtures — the ultimate *authored == runnable* check, and the reason the engine is one shared impl | **this is the §4.8 Run panel**; faults surface in the play log |

**Export gating by phase.** L1–L3 are static and gate export from Phase 1. **L4 is the simulator (§4.8), a Phase-2 capability** — once it lands, "all green" includes a clean dry-run of the golden path.

**Export is blocked unless all green** — the editor cannot emit a scenario that would fail in the Player.

### 4.8 Simulator / preview — R10 *(proposed surface for a [verified] capability)*

A **Run** panel drives the shared engine's `init`/`step` over the authored graph: it scripts the inputs the engine asks for (`awaitingInput`), executes the returned directives against **Display** (software tower) and **Board** (software board), and steps to a terminal. Because it's the **same `step` the Player calls**, the simulator and the live runtime produce identical results from the same seed + input stream — the lockstep guarantee, now visible as a preview. This dry-run **is validation L4** (§4.7).

The default preview targets the **software** tower (Display) and **software** board (Board) — no hardware, no Bluetooth — which is why the Creator barely needs Web Bluetooth at all (CR-9.1). An *optional* live-tower preview over BLE exists for authors who want to watch the real tower, but it is gated to a BLE-capable browser (Chrome/Edge, not iOS Safari/Firefox) and is **never required** to author or validate a scenario.

### 4.9 Auto-layout — a clickable "tidy," not the canvas model *(proposed; engine recommendations [verified] against React Flow's layouting guide)*

> Manual placement (R1) is the default and the canvas's identity. Auto-layout is a **user-triggered, on-demand command** — a button, not a behavior — that re-arranges the *current scope* into a clean directed tree in one click. This is exactly the distinction the Reaflow verdict (§3.2) turned on: keep free placement, and *add* auto-arrange on top.

React Flow ships **no** layouting of its own and instead points to external libraries. Their guide's survey, judged against our needs:

| Engine | Fit | Why |
|---|---|---|
| **Dagre** ✅ **recommended** | directed-tree layout, near drop-in, ~40 KB, **honors dynamic node sizes**, **lays out sub-flows** | The guide explicitly recommends dagre for organizing a flow into a tree. Our spine *is* a directed tree, and our nodes vary wildly in size (config card vs. battle screen vs. expanded Timeline) — dagre uses each node's measured dimensions. |
| **ELK (elkjs)** ⚠️ later | most configurable; the **only** option with built-in **edge routing** + full sub-flow support | Large (~1.45 MB) and complex; the xyflow team note they don't often recommend it. Revisit only if we later want orthogonal edge routing. |
| **D3-Hierarchy** ❌ | tree-only, **single root**, **assigns every node the same size** | Uniform sizing is disqualifying — our node types are very different sizes. |
| **D3-Force** ❌ | physics / force-directed | Scatters a structured directed flow; wrong shape for a spine-with-branches. |

**Decision [proposed]: Dagre, exposed as a clickable control.** A `<Panel>` **"Auto-arrange"** button — with a **direction toggle (Left→Right by default to match the reference graph; Top→Bottom alternative)** — calls a `getLayoutedElements` helper that feeds React Flow's *measured* node dimensions into dagre and writes back positions:

```tsx
// Auto-arrange (Dagre) — VISUAL ONLY; never touches kind / props / wires
function getLayoutedElements(nodes, edges, direction = "LR") {
  const g = new dagre.graphlib.Graph().setGraph({ rankdir: direction });
  nodes.forEach((n) => g.setNode(n.id, { width: n.measured.width, height: n.measured.height }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return { nodes: nodes.map((n) => ({ ...n, position: centerOf(g.node(n.id)) })), edges };
}
```

Three properties make this safe and well-scoped:

- **Non-destructive to game logic.** Auto-layout rewrites only visual `position` / `meta.layout` (§4.6) — never `kind`, `props`, or `wires`. The schema, the engine, and lockstep are untouched; only the picture moves, and one undo step reverts it.
- **Scoped per canvas.** "Tidy" acts on the open scope — the top-level flow, or *inside* an open subflow. Our subflows are port-encapsulated (Battle `enter → [defeated, retreated]`, Dungeon `enter → [completed, left]`), so their internal nodes never wire across the boundary — which means dagre's one documented sub-flow caveat (nodes connected to the outside) doesn't apply to us.
- **Dungeon grid is exempt.** The dungeon sub-editor's positions are **semantic** — each room maps to a master-bitmap slice (§4.5) — so its lattice is never auto-arranged; the control is disabled in that scope.

### 4.10 Editor affordances *(proposed; close gaps an authoring tool needs)*

Beyond drawing the graph, the editor needs the table-stakes interactions of a node authoring tool. None are exotic in React Flow, but they must be designed in rather than discovered late.

- **Subflow scope navigation.** React Flow has no built-in "click into a subflow" — there is one canvas at a time. Battle, Dungeon, Reinforce-at-building, and reusable events are `graph.subflows`, so the editor keeps a **scope stack**: entering a subflow swaps the rendered nodes/edges for that subflow's, shows a **breadcrumb** (`root ▸ Dungeon: Crypt`), and "Back" pops the stack. Auto-layout (§4.9) and validation act on the open scope.
- **Undo / redo.** A history stack over the canonical schema doc (not over React Flow's transient state), so every structural change — including a one-shot auto-arrange — is a single reversible step. This is part of satisfying **R8 (no silent data loss)**, alongside autosave + versioning (§4.6).
- **Copy / paste / duplicate.** Within and across scopes, with **id remapping** on paste so wires stay internally consistent and never collide with existing node ids.
- **Drag-from-palette + multi-select.** Drag a palette entry onto the canvas to create its `(kind, props)` node (§4.2); rubber-band multi-select, group-move, and box-delete for editing large graphs (**R8**).
- **Keyboard + a11y.** React Flow ships keyboard node/edge navigation and ARIA roles; combined with the icon+shape+label rule (CR-6.8, §4.3) this carries the Phase-3 accessibility pass.

---

## 5. Open questions & dependencies

1. **[blocker]** Board publication gates the **embedded Board editor** (§4.5) and the dungeon **bitmap/geometry** underlay — the known adapter-wiring "Step 2" dependency. Stubs in the interim.
2. **[proposed, decide Phase 3]** Dungeon grid: nested React Flow instance vs. bespoke grid canvas.
3. **[proposed, needs schema note]** Where visual/layout metadata lives (`meta.layout` sidecar) so round-trip fidelity holds without polluting game logic.
4. **[verified, defer]** Power-Author exec/data wire split (CR-6.12): ship single-wire first; add typed exec pins later — React Flow supports multiple typed handles, so this is additive.
5. **Licensing:** React Flow core is MIT and complete for everything above; only "Pro examples/templates/support" are paid, and **MVP needs none of them**.

---

## 6. Phasing *(proposed; maps to PRD §12)*

- **Phase 1 — Authoring core.** App shell + React Flow canvas + palette + inspector; node registry for the lifecycle spine, turn actions, events, effects (`effect.apply`), win/loss; config-node forms over `library`; typed pins (R4); core editor affordances (§4.10 — subflow scope nav, undo/redo, copy-paste); schema round-trip (§4.6); validation L1–L3; export/import. Embed Board for starting state (stub until Board publishes).
- **Phase 2 — Tower & test.** The **Timeline node**; tower channels; embed Display as the software tower; the **simulator step-through** (§4.8).
- **Phase 3 — Depth & polish.** The **dungeon grid sub-editor**; skull-economy authoring UI; accessibility pass (verify CR-6.8 end-to-end); groups; the **Dagre auto-arrange** control (§4.9); templates; Power-Author raw editing; optional community library.

---

### Changelog
- **v0.3 (2026-06-27)** — Accuracy + completeness pass. **Corrected the node registry (§4.2):** category F collapses to a single `effect.apply` kind (one `EffectNode`, dispatch on `op`) and G to a single `tower.op` kind (one `TowerOpNode`, dispatch on `channel`; Timeline = the `timeline` channel); category J config nodes are `library` entries, **not** graph `kind`s (removed the bogus `config.foe`); "mirrors catalog one-to-one" replaced with the real per-category mapping. **Corrected validation L4 (§4.7):** it is the *simulation dry-run* — i.e. the §4.8 simulator (lockstep) — not "coverage/intent"; added phase-gating note (L1–L3 static from Phase 1, L4 with the simulator in Phase 2). **Filled gaps:** added §4.10 editor affordances (subflow scope navigation, undo/redo, copy-paste, drag-from-palette, a11y); added the `wires`↔edges serialization detail (§4.6); added the software-tower-default vs. optional-BLE preview distinction (§4.8, CR-9.1). Fixed the R10 source cite.
- **v0.2 (2026-06-27)** — Added §4.9 **Auto-layout**: a clickable, on-demand "Auto-arrange" control (not the canvas default), using **Dagre** per React Flow's layouting guide (recommended for directed trees; honors dynamic node sizes and sub-flows). ELK reserved for later (edge routing, but heavy); D3-Hierarchy/D3-Force rejected (uniform sizing / force-directed). Layout is visual-only metadata, scoped per canvas, with the dungeon grid exempt. Updated the §3.2 Reaflow verdict and §6 Phase 3 to reference it.
- **v0.1 (2026-06-27)** — Initial UI/frontend architecture. Selects React Flow (`@xyflow/react`, MIT) against R1–R11; rejects Reaflow (auto-layout vs. our manual-placement UX), Rete.js (duplicate execution VM), AntV X6 (non-React-component nodes), LiteGraph.js (canvas, hostile to embedded editors). Proposes node registry, typed-pin mechanism, the three special-node implementations, the schema-as-source-of-truth boundary, live validation mapping, and phasing.
