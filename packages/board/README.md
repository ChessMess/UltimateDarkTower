# UltimateDarkTowerBoard

Composable **state + renderers** for the *Return to Dark Tower* game board. It owns a
`BoardState` (heroes, foes, adversary, skulls-on-buildings, monuments, space markers),
renders it three ways — text readout, 2D overhead map, 3D in-scene board — and ships an
optional dockable editing UI. The 3D board is a `ScenePlugin` for
[`ultimatedarktowerdisplay`](https://github.com/ChessMess/UltimateDarkTowerDisplay)'s
`Tower3DView`. It enforces **no game rules**: it stores, renders, and emits events; hosts own rules.

> **Status: pre-release (v0.1.0).** The headless **state core** (M1) is implemented — structured
> `BoardState`, the full command reducer, the `BoardStateController` (self/host) with events, and
> versioned save/load. Renderers (2D/3D) and the dockable UI are next. See
> [`docs/planning/`](./docs/planning/) for the roadmap and milestone specs.

## Two entry points

| Import | What you get | Heavy deps |
| --- | --- | --- |
| `ultimatedarktowerboard` | headless `BoardState` + controller/reducer/commands/events/save-load, the text **readout** and **2D map** renderers, and re-exports of UDT board data | **none** (no `three`, no Display) |
| `ultimatedarktowerboard/plugin` | `Board3DPlugin` — the 3D board `ScenePlugin` | `three` + `ultimatedarktowerdisplay` |

```ts
// Headless / readout / 2D — three-free:
import { BoardRenderView, BOARD_LOCATIONS } from 'ultimatedarktowerboard';

// 3D board (opt-in):
import { Board3DPlugin } from 'ultimatedarktowerboard/plugin';
```

## Quick start (scaffold)

```bash
npm install
npm run ci          # typecheck + lint + test + build
npm run dev:example # the headless demo
```

## Heads-up on upstream prerequisites

The board datasets are in place; full 3D token placement still waits on one Display symbol:

- `ultimatedarktower` board data/graph: **shipped in `4.1.0`** and re-exported here —
  `BOARD_LOCATIONS`, `BOARD_ANCHORS`, `BOARD_IMAGE_INFO`, `BOARD_ADJACENCY`, and
  `neighborsOf`/`stepDistance`/`shortestPath`.
- `ultimatedarktowerdisplay`'s `anchorToWorld` — still pending (a release after 0.8.0); the 3D
  plugin's token placement (M3) needs it.

The `three` peer range is pinned to **Display's exact declared range** (single-instance
requirement). The 3D path inherits Display's heavy transitive footprint (three + the board
image + audio; ~100 MB installed).

## License

MIT © ChessMess
