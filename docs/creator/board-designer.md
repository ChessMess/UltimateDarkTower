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

| Field                                                  | Required | Notes                                                                                                                        |
| ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `id` / `name`                                          | yes      | `id` is the `library.boards` key and must be kebab/snake case                                                                |
| `imageRef`                                             | no       | a `library.resources.images` key, or `builtin:rtdt-board`; without either the board renders blank                            |
| `imageInfo.width` / `.height`                          | yes      | the image space anchors are normalized against                                                                               |
| `imageInfo.centerX/centerY/radius/northHeadingDegrees` | no       | all four ⇒ **3D-ready** (see below)                                                                                          |
| `locations[]`                                          | yes      | `kingdom` is the closed 4-enum; `terrain` is an open string; `building` is an open id naming a `library.buildingTypes` entry |
| `anchors`                                              | no       | per-location `building`/`skull`/`hero`/`foe`/`marker` points, normalized `[0,1]`                                             |
| `adjacency`                                            | no       | name → names, symmetric (see the caveat below)                                                                               |

Stored at `library.boards[id]` (schema **0.4.6**); a scenario selects one with
`setup.board = { boardRef: id }`. The building types a location may name live alongside it in
`library.buildingTypes` (schema **0.4.7**) — see step 4 below.

## Authoring flow

1. **Boards tab → Clone RtDT preset.** A full copy of the built-in board — 60 locations, anchors,
   adjacency, calibration — ready to rename and re-art. (Or **Add empty board** to start bare.)
   The clone keeps the built-in board art by **reference** (`imageRef: builtin:rtdt-board`): the
   real image is 4096²/22 MB — ~30 MB of base64 in a shared `.json`, and 20× the 1.5 MB cap on an
   uploaded board image — so nothing is embedded and each app renders it from its own copy. Zero
   bytes in the document, and the Player still plays it at full resolution.
2. **Upload art.** Capped at 2048×2048 / ~1.5 MB. The stored image's real dimensions become
   `imageInfo.width/height`, and the upload replaces the built-in reference. **Use built-in RtDT
   art** puts it back (and restores `imageInfo` to 4096²; normalized anchors don't move). A
   replaced upload stays in `library.resources.images` — delete it from the Asset Manager, which
   lists it as unused, if you want the bytes back.
3. **Locations.** Add/rename/delete; set kingdom, terrain and building. **A location's position is
   its anchors** — there is no separate "place" record — so a new row exists in data but renders
   nowhere until it has one. **+ Add** therefore drops you straight into Anchors mode with the new
   location armed: click the board and it lands. For an existing row, the **◎** button beside it
   does the same (it turns into a filled **◉** once placed), and the Locations header counts how
   many are still off the map. A **rename remaps this
   board's anchors and adjacency in the same commit** — but it does **not** rewrite graph nodes that
   referenced the old name. Those surface in the Problems panel as dangling refs; fix them there.
   **Remove…** clears locations in bulk, scoped to everything or to one **kingdom / terrain /
   building** — handy for keeping the RtDT clone's geometry while replacing a kingdom's spaces.
   The picker only offers values the board actually has (with counts), and shows how many of how
   many will go before you confirm. Anchors and adjacency edges go with the removed locations;
   graph references to them do not, so check the Problems panel afterwards. There is no undo.
4. **Building types.** The **Building types…** button at the right of the mode toolbar opens the
   scenario's building registry (`library.buildingTypes`) — and so does **Custom…** in a location's
   building picker. The registry is scenario-wide rather than per-board, so it opens even with no
   board selected. A building is a _rules object_, not a label, so each type carries:
   - **Reinforce — free** and **Reinforce — enhanced**: the effects that run when a hero Reinforces
     on that space, the enhanced set costing the resource you name. A type may define _only_ the
     free set — the Player then simply doesn't offer the paid Reinforce on that building.
   - **skull capacity** (1–9, default 3): how many skulls sit on it before the next one razes it.
   - **hero start**: heroes begin on their kingdom's first building of this type.

   **Clone** copies an existing type as a starting point. **Renaming** a type retypes every
   reference to it — every location on every board, plus a hand-authored inline board state — in one
   undoable step. **Deleting** one that is still in use is allowed but warned about — those locations
   keep the name, which then resolves to nothing, so Reinforce there fails and validation flags it.

   The four RtDT buildings (`citadel`, `sanctuary`, `village`, `bazaar`) are what a new scenario
   starts with and what a cloned RtDT board uses, but they are only suggestions: you can rename
   them, delete them, or add your own. Ids are kebab/snake case (`watchtower`, `ashen-shrine`) — the
   dialog slugifies what you type, since the id is what a location's `building` stores.

   **The registry is the vocabulary.** A location's building picker offers exactly what you have
   defined here (plus whatever that board already holds), so a type you delete stops being offered —
   picking one that isn't defined would fail validation at export. Only when no registry is authored
   at all does the picker fall back to suggesting the RtDT four.

5. **Anchors.** Pick a location, pick a slot, click the map. Tokens are drawn at these points. The
   status line under the canvas always says what the next click will do. Panning does not place an
   anchor — a press only counts as a click if the pointer barely moved.
   **Shape is the slot, colour is the kingdom**: ● hero, ■ building, ▲ foe, ◆ skull, ▼ marker. The
   slot you are placing is drawn larger and the rest recede, and each slot button carries the same
   glyph — filled when the selected location already has that anchor, hollow when it does not. In
   this mode the anchors themselves are not clickable, so you can drop one on top of another; pick
   a different location from the list instead.
6. **Adjacency.** Click two locations to link/unlink (always written symmetrically). _Suggest from
   proximity_ seeds the graph from anchor distance.
7. **Calibrate.** Drag the centre dot and radius handle to fit the board's printed circle, and set
   the north heading. Needed only for 3D.
8. **Use in game.** Points `setup.board` at this board. The Inspector's location dropdowns and the
   `foe.spawn` / `foe.move` effect fields immediately offer the custom names, and L2 validates
   against them.

## Things worth knowing

**Each kingdom needs a hero-start building.** Heroes start on their home kingdom's first building
whose _type_ is marked **hero start** (step 4 above). A kingdom without one leaves its hero
unplaced, and the editor warns about it.

When **no** type is marked — every scenario written before schema 0.4.7, and any you never touch
the flag on — the rule falls back to the literal type `citadel`, exactly as it always worked. So
the marking only matters once you invent your own buildings.

**Adjacency is an authoring aid — it is not enforced during play (v1).** It is saved, validated for
symmetry, and available to tools, but nothing validates hero movement against it. This matches the
built-in board, where adjacency has always been data plus pure helpers. The Adjacency tab says so
in place.

**3D needs calibration.** The 3D disc projection maps a board's anchors from image space onto the
tower's ground disc using `centerX/centerY/radius`. Without all four calibration values the board is
**2D-only**: the player logs a line and stays on the 2D map. (`northHeadingDegrees` is authored but
the 3D pipeline currently consumes quadrant-based `northKingdom` — a known v1 limitation.)

**Board art shares one budget.** `library.boards` is a map, and all art in a document shares one
~50 MB budget with decks and dungeons. That budget is now about **export size**, not storage:
scenarios live in IndexedDB (quota in the hundreds of MB), so the old ~5 MB localStorage ceiling —
which roughly three arted boards would overrun — is gone. What the meter tells you instead is
roughly how large the `.json` you share will be. The toolbar surfaces the total once a second board
gains art. See [save-load.md](./save-load.md).

**Switching boards touches `setup.board`.** It is a schema `oneOf`, so `{boardRef}` is mutually
exclusive with a hand-authored `{boardState}` (hero homes + buildings registry). Toggling a board on
stashes the previous value and toggling back restores it — but that stash is **session-scoped**, so
the editor asks for confirmation before replacing a non-empty inline `boardState`.

## Relationship to the location-marker tool

`packages/core/tools/location-marker/` is the standalone dev tool that generates the **built-in RtDT
board data** (via `gen-board-data.mjs`). It remains the pipeline for that one board. The Board
Designer supersedes it for authoring _custom_ boards inside a scenario.
