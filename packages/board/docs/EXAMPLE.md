# Example App

Source: [`example/`](../example).

```bash
npm run dev:example        # serve locally
npm run build:example      # output to example/dist (GitHub Pages artifact)
```

The demo composes a `BoardRenderView` over a seeded `BoardState` and renders it several ways at once,
all sharing one state, one selection, and one focus:

- the **3D board** (`Board3DPlugin` on a Display `TowerRenderView`) — tokens as billboards on the disc,
- the **2D map** (`BoardMap2D`) — the board image with tokens placed via `BOARD_ANCHORS`,
- the **text readout** (deterministic),
- the shared **focus controls** (All / N / E / S / W + Overhead / Isometric), and
- the **dockable editing UI** (palette / inspector / summary), docked into Display's overlay HUD.

Assets live in `example/public/` and are loaded at runtime (never bundled):

- `board.png` — the base layer (`boardImageUrl: './board.png'`).
- `tokens/{foes,adversaries,monuments,markers}/*.png` — token art (`assetBaseUrl: './tokens/'`), named
  by the `kebab(UDT id)` convention. This tree is the staging ground for a future standalone board-assets
  package. Heroes have no art, so they render as the programmatic labeled fallback disc.

Try the controls: **N / E / S / W** zoom the 2D map to a kingdom, narrow the readout, and move the 3D
camera to that side; **All** restores the full board. **Overhead / Isometric** tilts the 3D camera
(`CameraConfig`) and is inert on the 2D map. Clicking a token in **either** the 2D map or the 3D scene logs
a `TokenSelection`, highlights it, and populates the **inspector**.

## Editing UI

The three HUD panels are docked into Display's overlay (`tower.getOverlayContainer()`, passed as the
`BoardRenderView` `uiContainer`) — `src/ui` itself never imports Display. Drag a panel by its titlebar;
collapse/close it; the **summary** updates live. To add a token: in the **palette** choose a kind (foe /
adversary / marker / skull), click **Add**, then click a space on the 2D map **or** the 3D board (or pick
from the location dropdown) and **Confirm** — both renderers feed the same shared `selection`/`locationPick`
stores the UI reads. The **inspector** edits/removes whatever is selected. Monuments come from UDT's
re-exported `MONUMENTS` roster. *Hero add is deferred until UDT ships a `HEROES` roster (M4 spec §8); a
hero placed in code can still be edited.*

## 3D path

The 3D board (`TowerRenderView` + `attachBoard3D`) is active in
[`example/src/main.ts`](../example/src/main.ts), driven by the same controller and focus as the 2D demo. It
needs a tower GLB: `example/public/tower.glb` (copied from Display, example-only — excluded from the npm
tarball by `files: ["dist"]`). The example Vite config aliases `ultimatedarktower` to its CJS build,
`optimizeDeps.include`s it, and `resolve.dedupe`s `three` so the plugin and Display share one `three`
instance.

The example keeps the **focus controls canonical** so `All` can show the whole board: the 3D camera always
faces a side (no `all` equivalent), so the plugin's `onFocusChange` is logged rather than fanned back into
the shared filter. Apps that want the 3D camera to be the focus source of truth can wire `onFocusChange`
into their shared focus instead.
