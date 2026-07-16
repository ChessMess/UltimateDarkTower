# Board Designer

The Board Designer (the **Boards** tab in the Creator app) lets a creator author a **custom game
board** — their own art, locations, anchors and adjacency — and play it in `@udtc/player`.

A scenario that doesn't author a board keeps using the built-in Return to Dark Tower board exactly
as before. Nothing about custom boards is opt-out; it is entirely opt-in.

## The model

A custom board keeps the RtDT **location shape** — `{name, kingdom, terrain, building?}` — on
purpose. Locations are opaque strings everywhere in the system (engine state, effect ops,
conditions), so a custom vocabulary works with **every existing node kind and effect op
unchanged**. Authoring a board re-sources the dropdowns; it does not add new authoring primitives.

| Field                                                  | Required | Notes                                                                                         |
| ------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `id` / `name`                                          | yes      | `id` is the `library.boards` key and must be kebab/snake case                                 |
| `imageRef`                                             | no       | a `library.resources.images` key; without art the board renders blank                         |
| `imageInfo.width` / `.height`                          | yes      | the image space anchors are normalized against                                                |
| `imageInfo.centerX/centerY/radius/northHeadingDegrees` | no       | all four ⇒ **3D-ready** (see below)                                                           |
| `locations[]`                                          | yes      | `kingdom` is the closed 4-enum; `terrain` is an open string; `building` is the lowercase enum |
| `anchors`                                              | no       | per-location `building`/`skull`/`hero`/`foe`/`marker` points, normalized `[0,1]`              |
| `adjacency`                                            | no       | name → names, symmetric (see the caveat below)                                                |

Stored at `library.boards[id]` (schema **0.4.6**); a scenario selects one with
`setup.board = { boardRef: id }`.

## Authoring flow

1. **Boards tab → Clone RtDT preset.** A full copy of the built-in board — 60 locations, anchors,
   adjacency, calibration — ready to rename and re-art. (Or **Add empty board** to start bare.)
2. **Upload art.** Capped at 2048×2048 / ~1.5 MB. The stored image's real dimensions become
   `imageInfo.width/height`.
3. **Locations.** Add/rename/delete; set kingdom, terrain and building. A **rename remaps this
   board's anchors and adjacency in the same commit** — but it does **not** rewrite graph nodes that
   referenced the old name. Those surface in the Problems panel as dangling refs; fix them there.
4. **Anchors.** Pick a location, pick a slot, click the map. Tokens are drawn at these points.
5. **Adjacency.** Click two locations to link/unlink (always written symmetrically). _Suggest from
   proximity_ seeds the graph from anchor distance.
6. **Calibrate.** Drag the centre dot and radius handle to fit the board's printed circle, and set
   the north heading. Needed only for 3D.
7. **Use in game.** Points `setup.board` at this board. The Inspector's location dropdowns and the
   `foe.spawn` / `foe.move` effect fields immediately offer the custom names, and L2 validates
   against them.

## Things worth knowing

**Each kingdom needs a citadel.** Heroes start on their home kingdom's citadel space. The engine
takes the _first_ citadel authored in each kingdom; a kingdom without one leaves its hero unplaced.
The editor warns about this.

**Adjacency is an authoring aid — it is not enforced during play (v1).** It is saved, validated for
symmetry, and available to tools, but nothing validates hero movement against it. This matches the
built-in board, where adjacency has always been data plus pure helpers. The Adjacency tab says so
in place.

**3D needs calibration.** The 3D disc projection maps a board's anchors from image space onto the
tower's ground disc using `centerX/centerY/radius`. Without all four calibration values the board is
**2D-only**: the player logs a line and stays on the 2D map. (`northHeadingDegrees` is authored but
the 3D pipeline currently consumes quadrant-based `northKingdom` — a known v1 limitation.)

**Board art shares one budget.** `library.boards` is a map, and all art in a document shares the
~5 MB localStorage draft budget with decks and dungeons. Roughly three arted boards will overrun it
and autosave starts failing. The toolbar surfaces the total once a second board gains art.

**Switching boards touches `setup.board`.** It is a schema `oneOf`, so `{boardRef}` is mutually
exclusive with a hand-authored `{boardState}` (hero homes + buildings registry). Toggling a board on
stashes the previous value and toggling back restores it — but that stash is **session-scoped**, so
the editor asks for confirmation before replacing a non-empty inline `boardState`.

## Relationship to the location-marker tool

`packages/core/tools/location-marker/` is the standalone dev tool that generates the **built-in RtDT
board data** (via `gen-board-data.mjs`). It remains the pipeline for that one board. The Board
Designer supersedes it for authoring _custom_ boards inside a scenario.
