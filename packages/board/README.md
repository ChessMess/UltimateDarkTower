# UltimateDarkTowerBoard

Composable **state + renderers** for the *Return to Dark Tower* game board. It owns a
`BoardState` (heroes, foes, adversary, skulls-on-buildings, monuments, space markers),
renders it three ways — text readout, 2D overhead map, 3D in-scene board — and ships an
optional dockable editing UI. The 3D board is a `ScenePlugin` for
[`ultimatedarktowerdisplay`](https://github.com/ChessMess/UltimateDarkTowerDisplay)'s
`Tower3DView`. It enforces **no game rules**: it stores, renders, and emits events; hosts own rules.

> **Status: pre-release (v0.1.0).** Implemented: the headless **state core** (M1) — structured
> `BoardState`, the full command reducer, the `BoardStateController` (self/host) with events, and
> versioned save/load; the **readout + 2D map + shared focus controls** (M2); the **3D board plugin**
> (M3); and the **dockable editing UI** — palette / inspector / summary (M4). See
> [`docs/planning/`](./docs/planning/) for the roadmap and milestone specs.

## Two entry points

| Import | What you get | Heavy deps |
| --- | --- | --- |
| `ultimatedarktowerboard` | headless `BoardState` + controller/reducer/commands/events/save-load, the text **readout** and **2D map** renderers, and re-exports of UDT board data | **none** (no `three`, no Display) |
| `ultimatedarktowerboard/plugin` | `Board3DPlugin` — the 3D board `ScenePlugin` | `three` + `ultimatedarktowerdisplay` |

```ts
// Headless / readout / 2D / editing UI — three-free:
import { BoardRenderView, mountBoardUI, BOARD_LOCATIONS } from 'ultimatedarktowerboard';

// 3D board (opt-in):
import { Board3DPlugin } from 'ultimatedarktowerboard/plugin';
```

The optional editing UI (`mountBoardUI`, or `BoardRenderView`'s `uiContainer`) ships three movable,
configurable panels — a token **palette**, a selection **inspector**, and a per-kingdom **summary** — that
call only the controller's public command API. It mounts into any element; pass Display's
`getOverlayContainer()` / `getPanelSlot()` to dock it into the 3D scene. See
[`docs/RENDERERS.md`](./docs/RENDERERS.md).

## Quick start (scaffold)

```bash
npm install
npm run ci          # typecheck + lint + test + build
npm run dev:example # the headless demo
```

## Upstream prerequisites

Both upstream dependencies are in place:

- `ultimatedarktower` board data/graph: **shipped in `4.1.0`** and re-exported here —
  `BOARD_LOCATIONS`, `BOARD_ANCHORS`, `BOARD_IMAGE_INFO`, `BOARD_ADJACENCY`, and
  `neighborsOf`/`stepDistance`/`shortestPath`.
- `ultimatedarktowerdisplay`'s `anchorToWorld`: **shipped in `0.9.0`** (peer `^0.9.0`); the 3D plugin's
  token placement uses it.

> **Palette rosters from UDT:** the editing UI's hero / foe / adversary / marker / monument categories all
> source their lists from `ultimatedarktower` re-exports — `HEROES` and `MONUMENTS` were added to UDT for
> this (re-exported, not vendored). No hero art exists, so heroes render via the programmatic fallback.

The `three` peer range is pinned to **Display's exact declared range** (single-instance
requirement). The 3D path inherits Display's heavy transitive footprint (three + the board
image + audio; ~100 MB installed).

## License

MIT © ChessMess
