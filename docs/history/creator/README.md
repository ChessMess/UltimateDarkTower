# UltimateDarkTowerCreator

Scenario authoring tool and live table runtime for custom *Return to Dark Tower* scenarios.

## Overview

Two applications sharing a common rules engine and schema:

- **Creator** (`apps/creator`) — node-based visual scenario editor (React Flow canvas, embedded simulator)
- **Player** (`apps/player`) — live table runtime that drives the physical tower via the Relay

Three shared packages:

- **`@udtc/schema`** — Canonical JSON Schema v0.4 (draft 2020-12), TypeScript types, and L1 validator (ajv strict)
- **`@udtc/engine`** — Pure `(EngineState, Input) → StepResult` reducer; headless, deterministic, 242-assertion test suite
- **`@udtc/adapters`** — Ecosystem wrappers (UDT, Display, Board stub, Relay stub) and L2/L3 validators

## Architecture

Dependency direction is fixed — never reversed:

```
apps/creator ──┐
               ├──→ @udtc/adapters ──→ UDT / Display / Board / Relay
apps/player  ──┘
               ├──→ @udtc/engine   ──→ @udtc/schema
               └──→ @udtc/schema
```

The Creator's built-in simulator and the Player's runtime both call the **identical** `engine.step` — same `(scenario, seed, inputStream)` produces byte-identical results in both contexts (lockstep guarantee).

## Package roles

| Package | Role | Status |
|---|---|---|
| `packages/schema` | Scenario schema + L1 validator | stub (Phase 1) |
| `packages/engine` | Rules engine reducer | JS artifacts in place, 242 tests |
| `packages/adapters` | Ecosystem adapters + L2/L3 | stub (Phase 3) |
| `apps/creator` | Visual scenario editor | stub (Phase 4) |
| `apps/player` | Live table runtime | stub (Phase 5) |

## Getting started

Requires Node.js ≥ 20 and pnpm ≥ 9.

```bash
pnpm install
pnpm build
pnpm test
```

Run the engine test suite directly:

```bash
node packages/engine/test/run-all.js
```

Start the Creator dev server:

```bash
pnpm --filter @udtc/creator dev
```

Start the Player dev server:

```bash
pnpm --filter @udtc/player dev
```

## Planning docs

The `planning/` directory contains the complete design corpus:

| Doc | Purpose |
|---|---|
| `repo-build-guide-v0_1.md` | **Start here** — five invariants, target tree, build order, acceptance gates |
| `scenario-schema-v0_4.md` | Canonical scenario schema spec (67 node kinds, 36 effect verbs) |
| `rules-engine-contract-v0_3.md` | Engine API contract (init/step surface, directive vocab, lockstep) |
| `creator-app-prd-v0_3.md` | Creator PRD (authoring model, validation, simulator) |
| `player-app-prd-v0_3.md` | Player PRD (runtime loop, Relay client, persistence) |
| `creator-ui-architecture-v0_3.md` | Frontend architecture (React Flow, Zustand, node registry) |
| `creator-block-catalog-v0_3.md` | Node block palette (categories A–K) |

## License

MIT
