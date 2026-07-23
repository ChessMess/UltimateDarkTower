# Location Marker & Adjacency Tool

A dependency-free, single-file dev tool for authoring two `UltimateDarkTower` board
datasets by clicking on the board artwork:

- **`BOARD_ANCHORS`** — multi-slot token positions per location (`building`, `skull`,
  `hero`, `foe`, `marker`), normalized `[0,1]` against the board image.
- **`BOARD_ADJACENCY`** — the undirected movement graph between the 60 locations.

It also captures `BOARD_IMAGE_INFO` (board-circle center / radius / north heading) and
previews BFS step-distances so the graph can be sanity-checked while it's authored.

This is **dev-only** — it has no runtime relationship to the published package (the
package's `files` whitelist already excludes `tools/`). It only _produces files_ that
get dropped into the library's `src/`.

> **Authoring a _custom_ board? Use the Creator app's Board Designer instead**
> (the **Boards** tab — see [`docs/creator/board-designer.md`](../../../../docs/creator/board-designer.md)).
> It does the same job — locations, anchors, adjacency, circle calibration — but against
> your own art, and stores the result in the scenario document (`library.boards`), so the
> board renders and plays in `@udtc/player` with no code changes.
>
> This tool remains the pipeline for the **built-in Return to Dark Tower board data**: it is
> what regenerates `BOARD_SPOTS` / `BOARD_ADJACENCY` / `BOARD_IMAGE_INFO` as generated
> TypeScript in `packages/game-data/src/board/` via `gen-board-data.mjs` — this is also the
> one place that lifts the tool's legacy five-slot vocabulary (below) into the `BoardSpot`
> shape; see that script's header comment for the slot→spot rules.

## Run it

No build step, no dependencies. Either:

- Open `index.html` directly in a browser (`file://`), **or**
- Serve the folder statically, e.g. `python3 -m http.server` from this directory, then
  open `http://localhost:8000/`. Serving lets the tool auto-load `./board.png` and keeps
  `localStorage` autosave reliable.

Then **Load the board image** (button, top-right) or drag a PNG onto the canvas. The
board artwork lives in the sibling Display repo at
`UltimateDarkTowerDisplay/src/3d/assets/board.png` (4096×4096). For convenience you can
drop a copy or symlink named `board.png` next to this file:

```sh
ln -s ../../../display/src/3d/assets/board.png board.png
```

(`board.png` is git-ignored here so the multi-MB asset isn't committed.)

## Modes

- **Anchors** — select a location (left checklist or click its dot), pick a slot chip,
  click the board to place it. Drag a dot to fine-tune; right-click a dot or press
  <kbd>Del</kbd> to clear it. `building`/`skull` chips are disabled for locations with
  no building.
- **Adjacency** — click location A then B to toggle the undirected edge (symmetry is
  guaranteed on every mutation). Click an edge line to select it, then <kbd>Del</kbd> to
  remove. _Suggest_ proposes edges between anchors within a % of board width — review,
  then _Apply_ or _Dismiss_ (never auto-committed). A location must have at least one
  anchor to appear/clickable on the canvas.
- **Calibrate** — click the board center, then a point on the circle edge (radius), then
  set `northHeadingDegrees` (numeric, or "From selected location"). Feeds Display's
  `getDiscMetrics()` mapping of normalized image coords onto the 3D disc.
- **Distance preview** — pick two locations (dropdowns or click) for BFS step count +
  highlighted shortest path. _Connectivity report_ lists connected components.

**Validate** surfaces missing required slots, out-of-range coords, isolated nodes,
asymmetry, name typos, and the component breakdown. Export is allowed despite warnings.

## Export / import

- **Anchors .ts** → `src/data/board/udtBoardAnchors.ts` (`BOARD_ANCHORS` + `BOARD_IMAGE_INFO`, `as const`).
- **Adjacency .ts** → `src/data/board/udtBoardAdjacency.ts` (`BOARD_ADJACENCY`, neighbor arrays sorted).
- **Combined .json** → `udtBoardData.json` (anchors + adjacency + image info) — round-trips
  via **Import**.
- **Import** accepts the combined `.json`, a previously exported `.ts`, or a
  `locations.json` (to override the embedded location list).

Working state autosaves to `localStorage` on every change; the board image is not stored
(reload it each session). Manual JSON export/import is the source of truth.

## Keeping the location list in sync

The 60-location list is embedded inline in `index.html` (so it's truly single-file). It
was generated from the library's source of truth, `src/data/board/udtGameBoard.ts` → `BOARD_LOCATIONS`.
When that changes, regenerate and paste the printed block back into `index.html`:

```sh
node tools/location-marker/gen-locations.mjs
```

This also (re)writes `locations.json`, which can be imported as an override.
