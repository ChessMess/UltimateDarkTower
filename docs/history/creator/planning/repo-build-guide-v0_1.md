# Repo Build Guide — Creator / Player Monorepo (v0.1)

**2026-06-29 · A build playbook for an autonomous LLM agent · Built to: Creator PRD v0.3, Player PRD v0.3, Rules-Engine Contract v0.3, Scenario Schema v0.4, Player↔Relay Protocol v0.1.2, Creator UI Architecture v0.3, Node Block Catalog v0.3**

> **Who this is for.** An LLM coding agent scaffolding the monorepo from an empty directory. It assumes the contract documents and the existing engine artifacts (`engine.js`, `pcg32.js`, `golden-fixture.js`, and the six test suites) are available to copy in. It does **not** restate the rules of *Return to Dark Tower*; it tells you where each concern lives and the order to build it in. Every claim here traces to a contract section cited inline (e.g. "RE-Contract §2.2"); when this guide and a contract disagree, **the contract wins** — surface the conflict, don't paper over it.

---

## 0. Read this first — the five invariants

If you violate one of these, the project's core guarantee (a scenario previews exactly as it plays) breaks. They are non-negotiable and they constrain every later decision.

1. **Compose, never redefine** *(Creator PRD §2.2/§2.3, Schema decision #4).* Foes, adversary, locations, statuses, glyphs, heroes (identity), light sequences, audio clips, and `BoardState` come from the ecosystem packages. Reference them **by id** and resolve those ids against the **pinned** versions in `meta.pins`. Never copy their contents into this repo.

2. **The headless-engine rule** *(RE-Contract §2.2).* The engine depends only on `schema` and `adapters`. It has **no direct dependency on UDT / Board / Display / Relay**, no DOM, no network, no hardware. Ecosystem data is *injected* by adapters at load via the `resolver` passed to `init`. This is what lets the engine run and test headless.

3. **Lockstep** *(RE-Contract §1.1, §9; both PRDs §2.4).* The Creator simulator and the Player runtime import the **identical** engine package at the **identical** version. Same `(scenario, seed, inputStream)` → byte-identical `(per-step state digest, ordered directives, status)`. The shared test corpus exists to make any divergence detectable.

4. **Closed vocabularies fail at load, never mid-game** *(Schema decision #2, Player PRD §8).* Every effect op, tower channel, node kind, input, and directive is a discriminated union over a `const`. An unknown member is rejected at validation. *A scenario that would fail mid-game must fail at load.*

5. **The skull invariant** *(RE-Contract §1.2, Schema §8).* No effect and no directive ever dictates **how many** skulls emerge. The engine triggers emergence (`tower.program` carrying `skull.dropTrigger`, no count) and reacts to the reported counter delta as an *observed* input. `skull.place {count}` exists only for scenario-authored additions, never emergence.

A sixth, structural rule follows from #3: **the canonical scenario schema is the single source of truth.** In the Creator, React Flow's `nodes`/`edges` are a *derived view*; the schema `graph` is authoritative (Creator UI §4.6).

---

## 1. Target tree

```
rtdt-toolchain/
├── package.json                 # workspace root; pins ecosystem deps once (§3)
├── pnpm-workspace.yaml           # or npm "workspaces" — see §2
├── tsconfig.base.json            # shared compiler options; project references
├── .npmrc                        # single-instance three, peer policy (§3)
├── README.md
│
├── packages/
│   ├── schema/                   # role: scenario schema + types  (BUILD: §5)
│   │   ├── src/
│   │   │   ├── scenario.schema.json        # the canonical contract (drop-in)
│   │   │   ├── types.ts                     # generated TS types (json-schema-to-typescript)
│   │   │   ├── validate.ts                  # L1 validator (ajv 2020-12, strict)
│   │   │   └── index.ts
│   │   ├── fixtures/             # valid/ + invalid/ corpus, shared by both apps
│   │   └── test/                # conformance_test.js (L1) lives here
│   │
│   ├── engine/                   # role: rules engine — THE REDUCER (WRAP: §6)
│   │   ├── src/
│   │   │   ├── engine.js          # EXISTING reference impl — copy in, do not rewrite
│   │   │   ├── pcg32.js           # EXISTING engine-local PRNG — copy in
│   │   │   ├── golden-fixture.js  # EXISTING golden MVP scenario (9 exports)
│   │   │   └── index.d.ts         # hand-written types over the §2.3 surface
│   │   └── test/                 # verbs / battle / dungeon / lockstep / corpus suites
│   │
│   └── adapters/                 # role: ecosystem adapters + L2/L3 validation (BUILD: §7)
│       └── src/
│           ├── resolver.ts        # pinned-ecosystem lookup injected into init()
│           ├── udt.ts             # UDT v4.1.0 reference layer wrapper
│           ├── board.ts           # Board reducer wrapper  [STUB — Board unpublished]
│           ├── display.ts         # Display emulator + seal subsystem wrapper
│           ├── relay-client.ts    # WebSocket client to the Relay  [STUB — repo pending]
│           ├── validate-refs.ts   # L2 reference resolution
│           └── validate-graph.ts  # L3 graph/semantic checks
│
└── apps/
    ├── creator/                  # node-authoring tool + simulator   (BUILD: §8)
    │   └── src/   (React + Vite; React Flow + Dagre; Zustand store)
    └── player/                   # live table runtime + Relay client  (BUILD: §9)
        └── src/   (React + Vite; setup → turn loop → effects → reconcile)
```

Working names for the three packages are non-normative; the **roles** are the contract (RE-Contract §2.1). The `apps/` ↔ `packages/` dependency direction is fixed:

```
creator / player  ─→  engine  ─→  schema
                         └──────→  adapters  ─→  (UDT / Display / Board / Relay)
```

---

## 2. Prerequisites & workspace manager

- **Node.js ≥ 20 LTS**, **TypeScript ≥ 5.4**.
- **pnpm workspaces** recommended over npm. Rationale, not preference: the ecosystem requires a **single instance of `three`** and has **peer-range** constraints (Creator PRD §10); pnpm's strict, content-addressed store enforces single-instance peers cleanly. npm `workspaces` is an acceptable fallback if pnpm is unavailable — if you use it, add `overrides` to force one `three`.
- **Vite + React + TypeScript** for both apps (the natural host for React Flow).
- The engine and its tests currently run on **plain Node with no test framework** — they are scripts that print `PASS`/`XXXX` and `process.exit(fail ? 1 : 0)`. Keep that runner; don't migrate them to Jest/Vitest during scaffolding (it would risk the 242-assertion regression gate). They use `ajv/dist/2020` + `ajv-formats` for L1.

Root `package.json` scripts the agent should create:

```jsonc
{
  "scripts": {
    "build": "tsc -b",
    "test": "pnpm -r --workspace-concurrency=1 test",   // each package's node-script suites
    "validate:golden": "node packages/schema/test/conformance_test.js",
    "lint": "eslint .",
    "typecheck": "tsc -b --noEmit"
  }
}
```

---

## 3. Pin the ecosystem once (the platform)

The external ecosystem packages are the platform; pin them at the **workspace root** so both apps stay version-aligned (Creator PRD §2.4, RE-Contract §8). These same versions are echoed into each scenario's `meta.pins.*` and checked at `init` — a mismatch is a **load-time** compatibility error (RE-Contract §8).

| Package | Pin | Status | Notes |
|---|---|---|---|
| `ultimatedarktower` (UDT) | **v4.1.0** | published, verified | BLE driver, board data, rosters, seeds, `TOWER_LIGHT_SEQUENCES` (21), `TOWER_AUDIO_LIBRARY` (12), `GLYPHS`, `HEROES` (identity-only), 4 building types, 6 light effects. Schema §13. |
| `ultimatedarktowerdisplay` (Display) | latest compatible | published | Software tower render + light playback + **seal subsystem** (`SealManager.applySeals`, `SealIdentifier`). The emulator target. |
| `ultimatedarktowerboard` (Board) | **unpublished** | **STUB** | `BoardState` + reducer. Until it ships, adapters expose a stub that reads/writes the `BoardState` shape; the real reducer drops in later. Creator PRD §10, RE-Contract §10.5. |
| Relay client | **repo pending** | **STUB** | WebSocket client. Build against the protocol contract (§4 of this guide); swap to the real client when the repo lands. |

Add `.npmrc`:

```
public-hoist-pattern[]=*three*
strict-peer-dependencies=false
```

> **Blocked content** *(Creator PRD §10, Schema §13).* Hero rich stats (7+1 start, move value, banner, 3+3 virtues) and gear/treasure/potion/adversary-card effects are **not** in any published source. Author the rich layer against **placeholders** and pin versions when the content repo (`mcp-server-return-to-dark-tower`) ships. Rosters/locations/adjacency/identity **have** landed in UDT v4.1.0 — those are real.

---

## 4. Build order (phases & acceptance gates)

Build bottom-up. Each phase has a single acceptance gate — a command and its expected result. **Do not start a phase until the previous gate is green.** Phases 1–2 reuse existing, proven artifacts and should land first and fast; the apps (4–5) are where the net-new UI work is.

| Phase | Package/App | Gate (command → expected) |
|---|---|---|
| **0** | workspace scaffold | `tsc -b` builds an empty graph of project refs with no error |
| **1** | `packages/schema` | `node conformance_test.js` → **12 passed, 0 failed** (ajv strict, draft 2020-12) |
| **2** | `packages/engine` | all six suites green → **242 assertions, 0 failed** (see §6) |
| **3** | `packages/adapters` | L2 rejects an out-of-roster `FoeId`; L3 rejects a wire to a nonexistent node; golden resolves clean |
| **4** | `apps/creator` | author golden → export → re-import is byte-identical (round-trip, CR-7.13.1); export blocked while any layer red |
| **5** | `apps/player` | load golden → run to a terminal against the **emulator** target through the Relay stub |

The whole-project done bar (§10) is: the golden fixture passes all four validation layers **and** runs end-to-end in the Player, and Creator-sim == Player-run byte-identical.

---

## 5. Phase 1 — `packages/schema`

**Goal:** the contract, its TypeScript types, and the L1 validator, with the conformance corpus.

1. Drop the canonical schema in as `src/scenario.schema.json` (`schemaVersion 0.4.0`, draft 2020-12, every object `additionalProperties:false`, every vocabulary a discriminated union over a `const`). It has three live parts plus metadata: **`graph`** (nodes + wires the engine walks), **`library`** (config "nouns" referenced by id), **`setup`** (scenario-wide levers + selections), and **`meta`** (Schema decision #3).
2. Generate `src/types.ts` from the JSON Schema (`json-schema-to-typescript`). Re-generate, never hand-edit, so types can't drift from the contract. Export the `ValidScenario` type.
3. Write `src/validate.ts`: an ajv 2020-12 instance in **strict mode** with `ajv-formats`, compiling the schema once and exposing `validateL1(doc) → { ok, errors }`.
4. Copy the conformance corpus into `fixtures/valid/` and `fixtures/invalid/`, and `test/conformance_test.js`. Keep `fixtures.js`'s `base`/`clone` helpers.

**Carry the `meta.layout` sidecar** (Creator UI §4.6): canvas positions, groups, comments are non-semantic and must round-trip without the engine ever seeing them. Add the one-line schema note acknowledging the sidecar if it isn't already present.

**Gate:** `node test/conformance_test.js` → `12 passed, 0 failed`. The 12 cases are all L1 closure: the valid MVP scenario plus rejections for an unknown op, an extra prop on `resource.gain`, a 5th building type, `skull.dropTrigger` carrying a count, missing `meta.pins`, a malformed seed, an incomplete foe selection, `light.named` without `sequenceId`, an empty `effect.apply`, and `corruption.remove` with neither `all` nor `count`, plus the positive `corruption.remove {count}` (RE-Contract §9). *(The schema v0.4 doc references a grown 38-case suite; if you have that version of the corpus, the expected count is 38 — match the corpus you're given, not a hardcoded number.)*

---

## 6. Phase 2 — `packages/engine` (WRAP the existing reducer; do not rewrite)

**Goal:** package the already-built, lockstep-proven reducer behind the §2.3 API, with all six suites green.

> **Critical:** `engine.js` is a working reference implementation at `ENGINE_VERSION = "0.1.0"`, `SUPPORTED_SCHEMA_RANGE = ">=0.4.0 <0.5.0"`, with **242 assertions across six suites** proving the contract. **Do not rewrite it from scratch.** If you port it to TypeScript, port incrementally and keep the existing suites as the regression gate — every suite must stay green at every step. The cheapest correct path is to ship it as JS inside a TS package (`allowJs`, plus a hand-written `index.d.ts` over the public surface).

1. Copy in `engine.js`, `pcg32.js`, `golden-fixture.js`.
2. Public exports (RE-Contract §2.3) — the Creator simulator and Player runtime import **exactly these**:

   | Export | Kind | Purpose |
   |---|---|---|
   | `init(scenario, opts) → StepResult` | fn | Validate (L2/L3 via adapters; L1 assumed done by `schema`), resolve refs, build initial `EngineState`, advance to the first input boundary. `opts = { seed, playerCount: 1\|2\|3\|4, resolver }`. |
   | `step(state, input) → StepResult` | fn | The pure reducer. Advances the graph from the cursor until it blocks on input or hits a terminal. |
   | `replay(scenario, opts, inputs[]) → StepResult[]` | fn | `init` then fold `step` — the lockstep harness. |
   | `serialize` / `deserialize` | fn | Stable canonical (de)serialization for checkpoints + replay. |
   | `digest(state)` | fn | Hashes all state except a pruned clock; determinism tests compare replay-to-replay, never hardcoded digests. |
   | `EngineState`, `Input`, `Directive`, `StepResult`, `InputRequest` | type | The opaque state + closed unions (§A appendix). |
   | `ENGINE_VERSION`, `SUPPORTED_SCHEMA_RANGE` | const | Version metadata. |

   `__internals` (e.g. `applyEffect`, `makeTestState`, `startBattle`) is a **test-only** surface — not part of the public API. Keep it exported for the suites; don't let the apps import it.
3. Write `index.d.ts` describing only the public surface. Hand-written is fine; this is the seam both apps type against.

**Gate — run each suite, expect all green (242 total):**

| Suite | Asserts | Covers |
|---|---|---|
| `conformance_test.js` | 12 | L1 schema closure (ajv strict) — *lives in `schema`; re-runnable here* |
| `verbs_test.js` | 47 | the §4.3 instruction set (effect verbs) against minimal states |
| `battle_test.js` | 19 | battle subflow + mutual-consent trade |
| `dungeon_test.js` | 30 | dungeon subflow + glyph gate + cross-hero cleared-room persistence |
| `lockstep_test.js` | 13 | L4 win/loss harness (replay determinism) |
| `corpus_test.js` | 121 | loss/win corpus + multi-hero streams; every byte-identical replay |

Determinism comes from the **engine-local `pcg32` PRNG**, seeded by a **separate runtime seed — never the official 12-char game seed** (RE-Contract §6; the official seed's RNG section is not reproducible, only its `setup` section is usable). If you add state fields later, `digest()` tolerates it because determinism tests compare replay-to-replay, not against a frozen digest.

---

## 7. Phase 3 — `packages/adapters`

**Goal:** the thin wrappers that inject ecosystem data into the headless engine, plus validation layers L2/L3. This is the only package allowed to import UDT/Display/Board/Relay.

- **`resolver.ts`** — the pinned-ecosystem lookup passed into `init(scenario, { resolver })`. Resolves `FoeId`, `AdversaryId`, location, status, glyph, hero-identity, `TOWER_LIGHT_SEQUENCES` key, and `TOWER_AUDIO_LIBRARY` key against UDT v4.1.0 (RE-Contract §2.2). This is how the engine stays headless.
- **`udt.ts`** — wraps UDT's reference layer (`udtGameBoard` + re-exported rosters, seed parser, light/audio libraries).
- **`board.ts`** — **STUB.** Reads/writes the `BoardState` shape and accepts `board.mutate` commands (`spawnFoe`, `moveFoe`, `removeFoe`, `placeHero`, `placeSkull`, `removeBuilding`, `placeMonument`, `placeMarker`). The exact command set **pins to Board when it publishes** (RE-Contract §5.2/§10.5). Keep a read-side **projection** the engine can query for rule evaluation (RE-Contract §3.3).
- **`display.ts`** — wraps Display's render + light playback + **seal subsystem** (`TowerRenderView.applySeals(SealIdentifier[])`). The seal subsystem already exists in UDT+Display; only an app-level `tower:seals` sidecar is net-new (Seal Reconciliation v0.1; Protocol R12).
- **`relay-client.ts`** — **STUB** against the protocol in §4 of this guide.
- **`validate-refs.ts` (L2)** — every typed id resolves against the pinned enum or an intra-file `library` key; a pin mismatch or missing export is a **hard fail** (Schema §9 L2).
- **`validate-graph.ts` (L3)** — reachability from `entry`; no orphan nodes; port-type compatibility on every wire; exactly one target room per dungeon, target-reachable-from-entrance, door geometry consistent; building types ≤ 4; foe selection = one each at tiers 2/3/4; main goal present; at least one win + the three default losses; `monthEnd` `min ≤ max` within player-count bounds; skull supply > 0; **no scenario-dictated emergence count**; competitive nodes only when `setup.mode = competitive` (Schema §9 L3).

**Gate:** unit-test that L2 rejects an out-of-roster `FoeId`, L3 rejects a wire to a nonexistent node and a dungeon with two target rooms, and the golden fixture resolves clean through `resolver` + L2 + L3.

---

## 8. Phase 4 — `apps/creator`

**Goal:** the node-authoring tool and the embedded simulator. Library decision is **made**: **React Flow (`@xyflow/react` v12, MIT)** for the canvas, **Dagre** for on-demand auto-layout (Creator UI §3). Do not substitute Reaflow (its ELK auto-layout is the opposite of the required manual placement), LiteGraph (canvas-rendered nodes can't host embedded React editors), or Rete (brings its own execution VM that would compete with the shared engine).

**App shell** (Creator UI §4.1) — four regions:

```
┌────────────┬──────────────────────────────────────┬──────────────┐
│  PALETTE   │              CANVAS                   │  INSPECTOR   │
│ (cat A–K,  │   React Flow: spine + subflows,       │ edit form for│
│  drag in)  │   pan/zoom/multi-select, Background,   │ selected node│
│            │   MiniMap, Controls                   │ (props = its │
│            │                                       │  contract)   │
├────────────┴──────────────────────────────────────┴──────────────┤
│  PREVIEW / SIMULATOR — run the graph via engine.step against       │
│  Display (software tower) + Board (software board); problem panel  │
└───────────────────────────────────────────────────────────────────┘
```

Build, in order:

1. **Node-type registry** (Creator UI §4.2) — a single `nodeTypes` map keyed by the schema's **closed `kind` enum** → a React component. An unknown `kind` fails at load (L1). Category families collapse per the audited mappings: **F effects → `effect.apply`** (discriminated by `op`); **G tower ops → `tower.op`** (discriminated by `channel`, 11 channels); **J config nodes are `library` entries, not graph node kinds** (they have an edit form but no ports/runtime presence). Palette categories A–K each carry **color *and* icon/shape *and* label — never color alone** (Creator UI R6).
2. **Graph ↔ schema serializer** (Creator UI §4.6) — the load-bearing seam. The schema `graph` is authoritative; React Flow state is derived. A node's named outputs are separate `Handle`s; each edge carries its `sourceHandle`. On serialize, edges collapse into the schema's `wires` map (`namedOutput → [targetNodeIds]`); on deserialize, the map fans back out into edges. Visual-only data goes in the `meta.layout` sidecar. **Export = serialize; import = deserialize; round-trip must be byte-identical** under canonical JSON ordering (CR-7.13.1).
3. **State store** — Zustand holding `{ schemaDoc, derivedNodes/edges, selection, validationResults }`, with **autosave + versioning** and **no silent data loss** (Creator UI §4.6, R8). The schema doc is authoritative; RF state is disposable.
4. **Typed reference pins** (Creator UI R4) — a foe/location/building/room/advantage/deck/light-sequence pin accepts only its own type, so an invalid wire is impossible at author time. Backed by the L2 resolver's typed dropdowns.
5. **Three full editors inside a node/modal** (Creator UI R3): the **Timeline** node (per-channel lanes compiling to `towerOp` `timeline`; it composes *real* ops — a named sequence id, an audio clip, a rotation, a seal break — it is **not** a freeform brightness curve, the firmware has no interpolation); the **embedded Board editor** (hosts Board's own editing UI → produces `BoardState`; **stub until Board ships**); the **dungeon grid sub-editor** (a Subflow node; double-click → nested grid; the master bitmap previews beneath the cells; rooms exist only inside the subflow; **the grid is exempt from auto-arrange** because positions are tied to the bitmap).
6. **Live validation** (Creator UI §4.7) — L1 makes invalid nodes unconstructable; L2 powers typed dropdowns; L3 drives a **problem panel + per-node error rings**; L4 is the simulator. **Export is blocked unless all green.** L1–L3 gate export from Phase 1 of the app; L4 lands with the simulator.
7. **Simulator / Run panel** (Creator UI §4.8, R10) — drives the shared engine's `init`/`step` over the authored graph, scripts the inputs the engine asks for (`awaitingInput`), and executes returned directives against **Display** (software tower) and **Board** (software board). Because it's the **same `step` the Player calls**, sim and runtime produce identical results from the same seed + input stream. This dry-run **is** validation L4. The default preview targets software tower + software board — no hardware, no Bluetooth — which is why the Creator barely needs Web Bluetooth (CR-9.1).

**Gate:** author the golden scenario, export it, re-import — byte-identical; corrupt a wire and confirm export is blocked with the offending node ringed.

---

## 9. Phase 5 — `apps/player`

**Goal:** the live table runtime. It authors nothing and reinvents nothing; it runs the shared engine, renders through Display/Board, and sends tower commands to the Relay (Player PRD §0–§2).

The runtime loop per turn (Player PRD §2.2):

1. **Collect input** — gather the engine's requested `InputRequest` from players (and observed values from the Relay).
2. **`step`** — feed the input to the shared engine.
3. **Dispatch directives** — `board.mutate` → Board's reducer; `tower.program` → a command stream to the **Relay** (the Player is agnostic to which targets exist); `ui.*`/`media.*` → the host UI.
4. **Reconcile** — update `TowerState`/`BoardState`, persist a checkpoint, reflect in the UI.

Build, in order:

1. **Scenario load + validation** (Player PRD §7.1) — load a file, run **all four** validation layers before starting, refuse an invalid scenario (mirror the Creator's export gate), resolve all references against pinned versions, show metadata before play.
2. **Relay client** (Player PRD §7.2/§7.3; Protocol §4–§7) — connect over WebSocket; `source:hello` is the **first** message and negotiates `protocolVersion` by **semver-range** (same minor pre-1.0); present the user a **target choice — real tower or emulator** — and send `target:request`; emit `tower:command` full-state snapshots; read `relay:status`; gate the scenario's **first rotation** on `relay:status.calibrated === true`. The Player **never opens Bluetooth** — the Relay owns the radio, discovery, GATT, calibration, and fan-out.
3. **Observed-input bridge** (RE-Contract §5.4; Protocol §4.3) — `tower:observed` (`skullCounter`, `towerState`, revealed glyph, indicated seal) flows back up and re-enters the engine as `observed` inputs. This is the *only* way emergence counts enter the engine — the tower reports, the engine reacts.
4. **Persistence & recovery** (Player PRD §7.15; Protocol §7) — checkpoint the engine `EngineState` + Board's versioned save + the last full-state command. On **network drop**: auto-reconnect with backoff, re-handshake, resync (`source:hello` → `relay:sync {lastCommand}` → `relay:status` → re-emit own last snapshot → `tower:observed` to re-mirror). On **target drop**: hold state, show pause; the Relay owns reconnect/recalibrate. Game state is **never** reconstructed from the Relay — the Relay holds none.
5. **Table UX** (Player PRD §6.2) — reproduce the official app's button set against the scenario's content (Battle, Dungeon, Foe Status, Advantage, Event, Companion Quest, Adversary Quest, Main Goal, Completed Quest, Market, Game-Lost) plus an always-on tower/board readout on the **light** Display/Board renderers (lazy-load 3D per CR-9.2).

**Platform reality** (CR-9.1): Web Bluetooth runs in Chrome/Edge/Samsung Internet on desktop and Android, not iOS Safari/Chrome (needs Bluefy) and not Firefox — but this only bites the **Relay** host, not the Player, which needs only a network link.

**Gate:** load the golden scenario, select the **emulator** target, and run to a terminal through the Relay stub; kill and restore the WebSocket mid-game and confirm the session resyncs from the checkpoint without abandoning the game.

---

## 10. Whole-project done criteria

From Schema §10 and both PRDs:

- **Golden scenario, executable.** *Recover Azkol's Treasures* / adversary **Ashstrider** / foes **Brigands · Frost Trolls · Dragons** / ally Zaida / seed `AA9A-AAGS-W634` passes all four validation layers **and** runs end-to-end in the Player. This *is* the MVP bar as a test.
- **Round-trip fidelity.** `export → import → export` is byte-identical under canonical JSON ordering.
- **Lockstep.** The same `(scenario, seed, inputStream)` produces byte-identical results through the Creator simulator harness and the Player runtime harness (they call the same engine).
- **Conformance corpus green in both apps** — the shared `valid/`/`invalid/` fixtures live in `packages/schema` so both apps test against the same corpus.

---

## 11. Guardrails — do NOT do these

- **Don't redefine ecosystem types.** No copy of the foe roster, locations, light sequences, or `BoardState` shape into this repo — reference by id, resolve against pins.
- **Don't import UDT/Board/Display/Relay from the engine.** Only `adapters` may. The engine takes a `resolver`.
- **Don't make React Flow state authoritative.** The schema `graph` is the source of truth; RF nodes/edges are derived.
- **Don't put game logic in the Relay.** It is a dumb, source-agnostic router of full-state idempotent snapshots — no turn state, no scenario data, no seal logic, no timeline clock.
- **Don't chain tower ops on command-complete.** The firmware reports "complete" when an action *starts*. Cross-channel timing uses explicit `wait` ops on the 50 Hz / 20 ms tick, pre-resolved by the source into scheduled snapshots (Protocol §5.3/§5.4).
- **Don't author emergence counts** anywhere — effect, directive, or scenario. The skull invariant.
- **Don't rewrite the engine to "clean it up."** It is the proven core. Any change keeps all six suites green; bump `ENGINE_VERSION` only when the engine's behavior actually changes (proof-only passes stay on the same version).
- **Don't let a scenario fail mid-game.** If it can't run, it must fail at load with a structured error code.

---

## 12. Blocked / stubbed register (track these)

| Item | State | Unblocks when |
|---|---|---|
| Board reducer + live `BoardState` editor | **stub** | `ultimatedarktowerboard` publishes; pin it, swap the stub, freeze the `board.mutate` command set |
| Relay client | **stub** | Relay repo lands; verify against the R1–R12 checklist (Protocol §11) |
| `heroAtLocation` condition subject | **deferred** | the Board adapter (E2) exists — heroes carry no headless position today |
| Hero rich stats, gear/treasure/potion/adversary-card effects | **placeholders** | `mcp-server-return-to-dark-tower` content ships; pin and replace |
| `light.custom` / `light.effect` authoring | **post-MVP** | software-tower path; MVP is Tier-1 baked sequences (`light.named`) only |

---

## Appendix A — closed vocabularies (reference)

**Directives (engine → host, closed)** — RE-Contract §5.2:

| Directive | Target | Carries |
|---|---|---|
| `tower.program` | **Relay** | resolved tower program: `towerOp`s and/or a `timeline` with `wait`s on the 50 Hz tick; idempotent/full-state; **never** an emergence count |
| `board.mutate` | **Board reducer** | a named Board command + args; Board validates placement |
| `ui.*` / `media.*` | **host UI** | prompts, choices, narration, images — the engine has no UI |

**Inputs (host → engine, closed)** — RE-Contract §5.3, with `InputRequest.kind ∈ {choice, target, advantageSpend, confirm, rollDecision, observed}`. The **observed** kind is the tower-reported bridge (§5.4): `skullCounter`, `towerState`, revealed glyph, indicated seal. `control` inputs (pause/resume/resync) map to `source:control` on the wire.

**Tower channels (11)** — Schema `$defs/towerOp`: `light.named · light.custom · light.effect · sound · drum.rotate · seal.break · seal.replace · skull.dropTrigger · wait · rotationBundle · timeline`.

**Status** — `StepResult.status ∈ {running, awaitingInput, won, lost, ended}`. Note `state.outcome.status` is `"awaitingInput"` (not `"running"`) while awaiting input. `replay` index semantics: index 0 = init state, index *i* = state after input *i*.

## Appendix B — Relay message vocabulary (reference)

Two closed vocabularies over a WebSocket (Protocol §4). **Source → Relay:** `source:hello` (first message; `{role, label?, protocolVersion, engineVersion?, udtPin?}`), `target:request` (`{target: "tower"|"emulator", targetId?}`), `calibrate:request`, `tower:command` (`{data: number[], seq?}` — the full-state snapshot), `source:control` (`{action: "pause"|"resume"|"resyncRequest"}`). **Relay → Source:** `relay:status` (`{relaying, targetKind, targetState ∈ {idle,connecting,connected,calibrating,ready,dropped,error}, calibrated, ...}`), `tower:observed` (→ engine observed inputs), `relay:sync {lastCommand}`, `relay:ack` (resync handshake only), `relay:paused`/`relay:resumed`, plus the `tower:seals` sidecar (full broken-seal set; emulator renders via `applySeals`, physical tower ignores). Hard-close `4000` only on genuine `protocolVersion` incompatibility.

## Appendix C — version axes (reference)

Five independent version numbers (Schema decision #6, RE-Contract §8): **`schemaVersion`** (the contract; drives strict validation), **`meta.scenarioVersion`** (the designer's), **`meta.pins.*`** (ecosystem package versions references resolve against), **`ENGINE_VERSION`** (the engine package; pinned once → Creator-sim and Player-run always match — the structural root of lockstep), and the **document version** of each spec `.md`. At `init`: if `scenario.schemaVersion` is outside `SUPPORTED_SCHEMA_RANGE`, or `meta.pins.*` don't satisfy the running packages → **hard fail at load**, never mid-game.

---

*Companion to the contract set. Where this guide is terse, the cited section is authoritative. Update this guide's version banner when the package roles, build order, or invariants change; leave it untouched for proof-only or content-only passes.*
