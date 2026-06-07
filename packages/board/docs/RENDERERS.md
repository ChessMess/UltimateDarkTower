# Renderers

| Renderer | Entry | Notes |
| --- | --- | --- |
| `BoardReadout` | `.` | Deterministic text; the snapshot test target. Optional per-kingdom filter via focus. |
| `BoardMap2D` | `.` | Inline SVG over the board image; tokens placed via `BOARD_ANCHORS`. Click-to-select. |
| `Board3DPlugin` | `./plugin` | 3D in-scene board; a Display `ScenePlugin` (M3). |

All visual renderers implement `BoardRenderer` (`render(state, focus?)`, optional `dispose()`).

## Focus / view controls

```ts
type BoardViewAngle = 'overhead' | 'isometric';
type BoardFocus = { kingdom: BoardKingdom | 'all'; angle: BoardViewAngle };
const DEFAULT_FOCUS: BoardFocus = { kingdom: 'all', angle: 'overhead' };
```

- **`kingdom`** (`all` | `north` | `east` | `south` | `west`) — the cardinal values map to Display's
  `selectSide`. The readout narrows to that kingdom; the 2D map zooms its `viewBox` to the kingdom's
  anchor bounds and dims out-of-kingdom tokens.
- **`angle`** — a 3D-camera concept. It is **inert for the readout and the 2D map** (the 2D map is
  always overhead). The 3D plugin maps it to Display's `CameraConfig` (`elevationFactor` /
  `targetHeightFactor`) for an overhead vs isometric framing.
- `mountFocusControls(container, { focus, onChange })` renders the **All / N / E / S / W** selector +
  the **Overhead / Isometric** toggle. `BoardRenderView` wires it: `setFocus` early-returns on an equal
  focus (`focusEquals`), fans the change out to the readout + 2D map + controls, then fires `onFocusChange`.

## 2D map: assets + fallback

`new BoardMap2D(container, { assetBaseUrl, boardImageUrl, resolveTokenImage?, onTokenSelect? })`.

- **Token art is never bundled.** It is loaded at runtime from `assetBaseUrl` by convention
  `${assetBaseUrl}${group}/${kebab(id)}.png`: `foes/<kebab(foe)>`, `adversaries/<kebab(id)>`,
  `monuments/<kebab(monument)>`, `markers/skull`, `markers/<kebab(marker)>`. `kebab('Utuk'Ku')` →
  `utuk-ku`. Pass `resolveTokenImage` to override.
- When art is missing (image error) or `resolveTokenImage` returns `null`, the token falls back to a
  **programmatic labeled disc**. Heroes always use the fallback (no hero art exists yet).
- `northHeadingDegrees` is **not** applied — `BOARD_ANCHORS` are normalized against the upright board
  image (that field is for the 3D disc only).
- **Click-to-select** fires `onTokenSelect({ kind, id, location })` and draws a selection ring. Selection
  is renderer-local UI state — it is never written to `BoardState`. Add/move/delete editing lives in the
  dockable UI (below).
- **Armed space-pick (M4).** Pass a `LocationPickStore` as `locationPick`. While it reports *armed* (the
  palette's add flow), the map draws clickable space targets at the anchors (building-only when the pending
  placement targets buildings); a space click calls `store.pick(loc)` (and `onLocationPick`). Disarmed, the
  map behaves exactly as before.

## 3D board: `Board3DPlugin` (`./plugin`)

The 3D renderer lives behind the `ultimatedarktowerboard/plugin` subpath (the only place `three` /
`ultimatedarktowerdisplay` are imported). It is a Display `ScenePlugin`: attach it to a live `Tower3DView`
and it places the **same** tokens as the 2D map — as image billboards on Display's ground disc, via
`anchorToWorld` — reusing the shared asset convention (`assetBaseUrl`, `${group}/${kebab(id)}.png`,
programmatic fallback) and emitting the same `TokenSelection` on click. It also honours the same armed
space-pick (`locationPick`) as the 2D map, via a second pointer target over invisible on-disc raycast
discs. See [DISPLAY_INTEGRATION.md](DISPLAY_INTEGRATION.md) for the `attachBoard3D` recipe, the
`northKingdom` orientation note, and the focus/camera wiring.

## Dockable editing UI (M4)

The optional, framework-agnostic editing UI (`mountBoardUI`) lives in the **`.` entry** (`three`-free /
Display-free) and turns the board into an authoring surface. It is a *dumb-container client*: it calls
**only** the controller's public named command methods and reads state/selection — strip it out and the
host keeps every endpoint.

```ts
import { BoardStateController, createSelectionStore, createLocationPickStore, mountBoardUI } from 'ultimatedarktowerboard';

const controller = new BoardStateController();
const selection = createSelectionStore();      // active token → the inspector
const locationPick = createLocationPickStore(); // armed add-placement channel

const ui = mountBoardUI(host, { controller, selection, locationPick });
// host = any HTMLElement; the consumer may pass Display's getOverlayContainer()/getPanelSlot() to dock it.
ui.dispose();
```

Three movable / dockable / show-hide-configurable panels:

- **Palette** — add a foe (type + status), adversary, space marker, or skull. Click **Add**, pick a space
  (click the 2D/3D board while armed, or use the location dropdown), then **Confirm**. A collapsible
  **Setup** section dispatches `setSelections`. *(Hero + monument add are deferred until UDT ships those
  rosters — see the M4 spec; the inspector still edits an already-placed hero.)*
- **Inspector** — edits the active `selection`: move/remove a hero or foe, set foe status, place/clear the
  adversary, change a building's skulls / destroy-restore / monument, or remove a marker.
- **Summary** — per-kingdom counts (heroes, foes, skulls, razed, markers, adversary).

`BoardRenderView` wires this for you: pass `uiContainer` (+ optional `ui` config) and it owns/exposes
`view.selection` and `view.locationPick`, feeding the 2D map's clicks/picks into them. The shared stores
mean a selection or space-pick from the 2D map **or** the 3D plugin drives the same inspector/palette.
