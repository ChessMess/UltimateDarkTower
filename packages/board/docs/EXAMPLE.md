# Example App

Source: [`example/`](../example).

```bash
npm run dev:example        # serve locally
npm run build:example      # output to example/dist (GitHub Pages artifact)
```

The demo mounts a single [`BoardStageView`](./STAGE.md) (`ultimatedarktowerboard/stage`) into
`#board-stage` over a seeded `BoardState`. That one component owns the **entire render stage** —
everything below shares one state, one selection, and one focus:

- the **3D board** (`Board3DPlugin` on a Display `TowerRenderView`, **lazy-loaded** by the stage) — tokens as billboards on the disc,
- the **2D map** (`BoardMap2D`) — the board image with tokens placed via `BOARD_ANCHORS`,
- the **text readout** (deterministic),
- the **mode switcher** (2D / 3D / 2D+3D / PiP) with swap, the movable/resizable PiP inset, Pop Out, the Spin/Pan toggle,
- the **N / E / S / W + All** kingdom-zoom bar, and
- the **dockable editing UI** (palette / inspector / summary).

[`example/src/main.ts`](../example/src/main.ts) is now a thin composition root: it constructs the
stage, seeds a board, and wires the demo's own **page chrome** (the left sidebar's presets / quick-edit /
reset / panel-toggles, and the right column's Board Status readout + JSON copy/apply) onto
`stage.controller` / `stage.view` / `stage.selection`. All the render-stage controllers that used to
live here are now inside the component.

Assets live in `example/public/` and are loaded at runtime (never bundled):

- `board.png` — the base layer (`boardImageUrl: './board.png'`).
- `tokens/{foes,adversaries,heros,monuments,markers}/*.png` — token art (`assetBaseUrl: './tokens/'`). This
  tree is the staging ground for a future standalone board-assets package.

**Two layers of art.** The board **library** ships built-in defaults, so most tokens need no config: foes
and adversaries resolve to their flat 2D board-token icon in the 2D map and their portrait in 3D, and the
standard hero roster (base + all expansions) resolves to its `heros/` portrait — see `OFFICIAL_2D_ICON` /
`OFFICIAL_HERO_ART` in [`src/renderers/assetPaths.ts`](../src/renderers/assetPaths.ts). On top of that, the
demo can set **per-token overrides** (a different 2D vs 3D image, or a 3D model) in
[`example/src/tokenArt/`](../example/src/tokenArt) as per-kind JSON, merged into a `TokenArtConfig` by
[`index.ts`](../example/src/tokenArt/index.ts) and passed to both renderers. Those files ship **empty** now
(the library covers foes/adversaries/heroes); `skull_tokens.json` keeps the one genuine override — a 3D GLB
model. Edit overrides by hand or with the **Token Art Forge** (below).

Try the controls: **N / E / S / W** zoom the 2D map to a kingdom, narrow the readout, and move the 3D
camera to that side; **All** (set apart in its own group at the end of the bar) restores the full board.
The **Spin / Pan** toggle (alongside the kingdom bar) sets what a left-drag does on the 2D map: **Spin**
(default) rotates the whole board about its center — like the 3D board's mouse-orbit — and **Pan** moves
the zoomed-in view (`stage.setDragMode(...)`); the choice is persisted. (The 3D camera's overhead-vs-oblique
tilt is a 3D concept — orbit the 3D view directly — so it is not shown on the 2D-anchored bar.) Clicking a
token in **either** the 2D map or the 3D scene logs a `TokenSelection`, highlights it, and populates the
**inspector**.

## Editing UI

The three HUD panels are docked into Display's overlay (`tower.getOverlayContainer()`, passed as the
`BoardRenderView` `uiContainer`) — `src/ui` itself never imports Display. Drag a panel by its titlebar;
collapse/close it; the **summary** updates live. To add a token: in the **palette** choose a kind (foe /
adversary / marker / skull), click **Add**, then click a space on the 2D map **or** the 3D board (or pick
from the location dropdown) and **Confirm** — both renderers feed the same shared `selection`/`locationPick`
stores the UI reads. The **inspector** edits/removes whatever is selected. The Hero and Monument categories
come from UDT's re-exported `HEROES` / `MONUMENTS` rosters (heroes have no art → programmatic fallback).

## 3D path

The 3D board is owned by the stage (it builds `TowerRenderView` + `attachBoard3D` via the lazily-imported
`ultimatedarktowerboard/plugin/stageTower` adapter), driven by the same controller and focus as the 2D map.
It needs a tower GLB: `example/public/tower.glb` (copied from Display, example-only — excluded from the npm
tarball by `files: ["dist"]`). The stage passes `modelUrl: './tower.glb'`, so the 3D stack is fetched as a
separate chunk on first use — visible in the network panel as a distinct `stageTower-*.js` load. The example
Vite config aliases `ultimatedarktower` to its CJS build, `optimizeDeps.include`s it, and `resolve.dedupe`s
`three` so the plugin and Display share one `three` instance.

The example keeps the **focus controls canonical** so `All` can show the whole board: the 3D camera always
faces a side (no `all` equivalent), so the plugin's `onFocusChange` is logged rather than fanned back into
the shared filter. Apps that want the 3D camera to be the focus source of truth can wire `onFocusChange`
into their shared focus instead.

## Token Art Forge

A small in-browser editor for the per-token art above — open [`/tokens.html`](../example/tokens.html)
(linked from the demo footer), or run `npm run dev:example` and visit `/tokens.html`. Pick a **token type**
then a **token**; review/replace its **2D image**, **3D image**, and **3D model** (URL + scale/rotation),
with a live JSON preview. Under `vite dev` a tiny dev-only middleware
([`example/tokenArtDevPlugin.ts`](../example/tokenArtDevPlugin.ts), `apply: 'serve'`) reads the JSON +
lists `example/public` art, and **Save** writes the kind's `<kind>_tokens.json` straight to disk (the demo
HMR-reloads with the new art). On the static GitHub-Pages build there is no such endpoint, so the tool
shows a **Preview** badge and falls back to **Copy JSON** / **Download**. Source:
[`example/src/tokenArtEditor/`](../example/src/tokenArtEditor).

Each token's preview is the board library's own default (via `resolveTokenImageFor`), so the Forge always
mirrors what the board renders; editing a token writes a **demo override** on top, and an unedited token
saves nothing (the file keeps only genuine overrides).

**Promoting art to a library default.** The Forge edits the demo only — it does not touch the library's
built-in defaults. To make art that everyone (Player included) gets, run `npm run promote-token-art`: it
compares the demo overrides against the current library defaults and prints the exact `OFFICIAL_2D_ICON` /
`OFFICIAL_HERO_ART` entries to paste into [`src/renderers/assetPaths.ts`](../src/renderers/assetPaths.ts),
plus the asset files to copy into each consumer's `public/tokens`. Workflow: add art in the Forge → verify in
the demo → `npm run promote-token-art` → paste the entries + copy the assets → rebuild.
