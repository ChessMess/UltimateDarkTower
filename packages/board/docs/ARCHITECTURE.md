# Architecture

```
ultimatedarktowerdata ──► data/udtReexports ──► state/ ──► renderers/{readout,map2d} ──► view/BoardRenderView ──► ui/
                                                       │
                                                       └─► plugin/Board3DPlugin ──► ultimatedarktowerdisplay Tower3DView (three)
```

- **Three entry points.** `.` is the headless core + readout/2D + data re-exports and imports no
  `three`/Display; `./stage` is the all-in-one render stage, statically three-free (it loads the 3D
  tower via a dynamic `import()`); `./plugin` is the only place allowed to import `three`/Display
  statically. This mirrors how Display isolates its heavy `./physics` subpath. The invariant is
  enforced at build time by `scripts/check-three-free.mjs` (wired into the `build` script), which
  walks the static import closure of the `.`/`./stage` ESM bundles and fails if either imports `three`.
- **Unidirectional state.** `BoardStateController` holds `BoardState`, runs the pure
  `applyBoardCommand` reducer on dispatch, and emits events; renderers/UI subscribe.
- **No rules.** The library stores/renders/emits; the host owns game rules.
- **Decoupled UI seams.** Two observables — a `SelectionStore` (active token) and a `LocationPickStore`
  (armed add-placement) — connect the renderers (which _produce_ clicks/picks) to the editing UI (which
  _consumes_ them) without either importing the other. `BoardRenderView` owns/exposes both
  (`view.selection`, `view.locationPick`), so a click/pick from the 2D map **or** the 3D plugin drives the
  same `ui/` panels. The UI calls only the controller's public command API.

## Controlled vs. uncontrolled ownership

One command vocabulary and one event surface; only _who owns the truth_ differs, selected by
`new BoardStateController({ mode })`:

- **`self`** (default — uncontrolled): the controller's internal `BoardState` is authoritative.
  `dispatch` / named methods run the reducer, replace the held state, and emit `change` plus the
  derived specific event. Right for the example app, tests, and quick homebrews.
- **`host`** (controlled): the _host_ owns the truth (e.g. a future digital game that runs the rules).
  `dispatch` computes the projected next state and emits it as a `change` **intent** without mutating
  held state; the host applies its rules and commits via `applyState(next)` — the sole commit path in
  both modes. Right for a host that must validate/transform commands before they take effect.

The board enforces **no** rules in either mode — `host` simply moves the decision of _what to commit_
out to the host.

## Data flow

```
command ──► applyBoardCommand (pure reducer) ──► next BoardState ──► controller commits/emits
                                                                      │
                                       change + tokenAdded/Moved/Removed/buildingChanged/…
                                                                      ▼
                                          renderers (readout, 2D map, 3D plugin) + summary UI
```

A mutation always starts as a `BoardCommand` (from a named method, `dispatch`, or the editing UI). The
pure `applyBoardCommand` reducer derives the next state — no side effects, no validation, no clamping
(beyond flooring skull counts at 0). The controller commits that state (in `self`, or via `applyState`
in `host`) and emits a `change` event plus a derived specific event. Renderers and the summary panel
subscribe and re-render; selection/placement flow back the other way through the two UI-seam stores,
never by writing to `BoardState`.
