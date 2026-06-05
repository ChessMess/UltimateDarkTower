# UltimateDarkTowerBoard

Composable **state + renderers** for the *Return to Dark Tower* game board. It owns a
`BoardState` (heroes, foes, adversary, skulls-on-buildings, monuments, space markers),
renders it three ways — text readout, 2D overhead map, 3D in-scene board — and ships an
optional dockable editing UI. The 3D board is a `ScenePlugin` for
[`ultimatedarktowerdisplay`](https://github.com/ChessMess/UltimateDarkTowerDisplay)'s
`Tower3DView`. It enforces **no game rules**: it stores, renders, and emits events; hosts own rules.

> **Status: scaffold (v0.1.0).** Structure + tooling only — feature work lands on top. See
> [`UltimateDarkTowerBoard-Scaffolding-Spec.md`](./UltimateDarkTowerBoard-Scaffolding-Spec.md).

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

Full 3D token placement depends on symbols **not yet published** upstream (the scaffold is
forward-built around them):

- `ultimatedarktower` board datasets/graph: only `BOARD_LOCATIONS` is shipped today (4.0.x);
  `BOARD_ANCHORS`, adjacency, and `stepDistance` are in progress.
- `ultimatedarktowerdisplay`'s `anchorToWorld` (planned for a release after 0.8.0).

The `three` peer range is pinned to **Display's exact declared range** (single-instance
requirement). The 3D path inherits Display's heavy transitive footprint (three + the board
image + audio; ~100 MB installed).

## License

MIT © ChessMess
