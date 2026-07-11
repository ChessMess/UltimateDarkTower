<h1 align="center">Ultimate Dark Tower Creator &amp; Player</h1>

<p align="center">
  Author and play custom scenarios for Restoration Games' <a href="https://restorationgames.com/dark-tower/"><em>Return to Dark Tower</em></a>.<br/>
  A node-based scenario <strong>Creator</strong> and a live-table <strong>Player</strong>, sharing one deterministic rules engine — both running entirely in the browser.
</p>

<p align="center">
  <a href="https://chessmess.github.io/UltimateDarkTowerCreator/"><img alt="Live site" src="https://img.shields.io/badge/Live-GitHub%20Pages-f59e0b"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-blue"></a>
  <img alt="status" src="https://img.shields.io/badge/status-pre--release%20v0.1.0-orange">
</p>

---

<p align="center"><strong>
  <a href="https://chessmess.github.io/UltimateDarkTowerCreator/">▶ Live Site — Creator &amp; Player</a>
</strong></p>

<p align="center">
  <a href="https://chessmess.github.io/UltimateDarkTowerCreator/creator/">Open the Creator</a>
  &nbsp;·&nbsp;
  <a href="https://chessmess.github.io/UltimateDarkTowerCreator/player/">Open the Player</a>
</p>

<p align="center"><em>
  No account, no server, nothing to install — the Player drives a full 3D tower emulator right in the page.
</em></p>

> **Status: pre-release (v0.1.0), in active development.** Features may change, break, or be
> removed at any time, and scenarios or saved games may not survive future updates. Expect rough edges.

---

## Overview

Two applications sharing a common rules engine and schema:

- **Creator** (`apps/creator`) — node-based visual scenario editor (React Flow canvas, embedded simulator), plus first-class **Deck** and **Dungeon** builders (draw a dungeon map on a grid, place rooms and doors, auto-detect rooms from a map image)
- **Player** (`apps/player`) — live table runtime that drives the tower emulator (or, later, a physical tower via the Relay), with masked-map dungeon exploration (rooms unmask as you move, and cleared rooms persist across visits)

Three shared packages:

- **`@udtc/schema`** — Canonical JSON Schema v0.4 (draft 2020-12), TypeScript types, and L1 validator (ajv strict)
- **`@udtc/engine`** — Pure `(EngineState, Input) → StepResult` reducer; headless, deterministic, 242-assertion test suite
- **`@udtc/adapters`** — Ecosystem wrappers (UDT, Display, Board, Relay) and L2/L3 validators

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

| Package             | Role                           | Status                           |
| ------------------- | ------------------------------ | -------------------------------- |
| `packages/schema`   | Scenario schema + L1 validator | stub (Phase 1)                   |
| `packages/engine`   | Rules engine reducer           | JS artifacts in place, 242 tests |
| `packages/adapters` | Ecosystem adapters + L2/L3     | stub (Phase 3)                   |
| `apps/creator`      | Visual scenario editor         | stub (Phase 4)                   |
| `apps/player`       | Live table runtime             | stub (Phase 5)                   |

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

## Deploying the live site

The public site above is the two apps built with GitHub Pages base paths, plus a landing page
([`deploy/index.html`](deploy/index.html)), published to the `gh-pages` branch.

Because the apps depend on locally-built sibling repos (see [Ecosystem](#ecosystem)) via `file:`
dependencies, the build only runs on a machine that has the full repo constellation checked out.
To publish an update, build and push from such a machine:

```bash
npm run deploy   # or: pnpm deploy  /  ./deploy/deploy.sh
```

This builds both apps (`GH_PAGES=1 pnpm build`), assembles `site/`, and force-pushes it to
`gh-pages`, which GitHub Pages serves at
<https://chessmess.github.io/UltimateDarkTowerCreator/>.

## Ecosystem

This repo composes the wider _Return to Dark Tower_ toolchain rather than reimplementing it:

| Repo                                                                                | Role                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`UltimateDarkTower`](https://github.com/ChessMess/UltimateDarkTower)               | BLE driver + 3D tower emulator for the physical tower                  |
| [`UltimateDarkTowerDisplay`](https://github.com/ChessMess/UltimateDarkTowerDisplay) | Composable text / 2D / 3D tower-state renderers                        |
| [`UltimateDarkTowerBoard`](https://github.com/ChessMess/UltimateDarkTowerBoard)     | `BoardState` core + board renderers (2D map / 3D in-scene board)       |
| [`UltimateDarkTowerRelay`](https://github.com/ChessMess/UltimateDarkTowerRelay)     | Relays the official companion app's tower traffic to digital consumers |

## Planning docs

The `planning/` directory contains the complete design corpus:

| Doc                               | Purpose                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `repo-build-guide-v0_1.md`        | **Start here** — five invariants, target tree, build order, acceptance gates             |
| `docs/node-catalog.md`            | Comprehensive node reference (all current node kinds, status, I/O, props, runtime notes) |
| `scenario-schema-v0_4.md`         | Canonical scenario schema spec (67 node kinds, 36 effect verbs)                          |
| `rules-engine-contract-v0_3.md`   | Engine API contract (init/step surface, directive vocab, lockstep)                       |
| `creator-app-prd-v0_3.md`         | Creator PRD (authoring model, validation, simulator)                                     |
| `player-app-prd-v0_3.md`          | Player PRD (runtime loop, Relay client, persistence)                                     |
| `creator-ui-architecture-v0_3.md` | Frontend architecture (React Flow, Zustand, node registry)                               |
| `creator-block-catalog-v0_3.md`   | Node block palette (categories A–K)                                                      |

## Disclaimer

Unofficial fan tool — not affiliated with, sponsored by, or endorsed by Restoration Games.
_Return to Dark Tower_ and all related marks are property of their respective owners.

## License

MIT
