# Architecture

> Scaffold stub.

```
ultimatedarktower (data) ──► data/udtReexports ──► state/ ──► renderers/{readout,map2d} ──► view/BoardRenderView ──► ui/
                                                       │
                                                       └─► plugin/Board3DPlugin ──► ultimatedarktowerdisplay Tower3DView (three)
```

- **Two entry points.** `.` is the headless core + readout/2D + data re-exports and imports no
  `three`/Display. `./plugin` is the only place allowed to import them. This mirrors how Display
  isolates its heavy `./physics` subpath, and is enforced by a CI grep.
- **Unidirectional state.** `BoardStateController` holds `BoardState`, runs the pure
  `applyBoardCommand` reducer on dispatch, and emits events; renderers/UI subscribe.
- **No rules.** The library stores/renders/emits; the host owns game rules.
- **Decoupled UI seams.** Two observables — a `SelectionStore` (active token) and a `LocationPickStore`
  (armed add-placement) — connect the renderers (which *produce* clicks/picks) to the editing UI (which
  *consumes* them) without either importing the other. `BoardRenderView` owns/exposes both
  (`view.selection`, `view.locationPick`), so a click/pick from the 2D map **or** the 3D plugin drives the
  same `ui/` panels. The UI calls only the controller's public command API.
