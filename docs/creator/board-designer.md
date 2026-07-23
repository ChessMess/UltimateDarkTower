# Board Designer

The Board Designer (the **Boards** tab in the Creator app) lets a creator author a **custom game
board** — their own art, locations, spots and adjacency — and play it in `@udtc/player`.

A scenario that doesn't author a board keeps using the built-in Return to Dark Tower board exactly
as before. Nothing about custom boards is opt-out; it is entirely opt-in.

## The model

A custom board keeps the RtDT **location shape** — `{name, kingdom, terrain, building?}` — on
purpose. Locations are opaque strings everywhere in the system (engine state, effect ops,
conditions), so a custom vocabulary works with **every existing node kind and effect op
unchanged**. Authoring a board re-sources the dropdowns; it does not add new authoring primitives.

| Field                                                  | Required | Notes                                                                                                                                                    |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` / `name`                                          | yes      | `id` is the `library.boards` key and must be kebab/snake case                                                                                            |
| `imageRef`                                             | no       | a `library.resources.images` key, or `builtin:rtdt-board`; without either the board renders blank                                                        |
| `imageInfo.width` / `.height`                          | yes      | the image space spots are normalized against                                                                                                             |
| `imageInfo.centerX/centerY/radius/northHeadingDegrees` | no       | all four ⇒ **3D-ready** (see below)                                                                                                                      |
| `locations[]`                                          | yes      | `kingdom` is the closed 4-enum; `terrain` is an open string; `building` is an open id naming a `library.buildingTypes` entry                             |
| `spots`                                                | no       | per-location list of marked points (`{id, at, accepts}`); `accepts` names the reserved built-in type ids or `library.tokenTypes` keys a spot will render |
| `adjacency`                                            | no       | name → names, symmetric (see the caveat below)                                                                                                           |

Stored at `library.boards[id]` (schema **0.4.6**, spots since **0.5.0**); a scenario selects one
with `setup.board = { boardRef: id }`. The building types a location may name live alongside it in
`library.buildingTypes` (schema **0.4.7**) — see step 4 below. Token types (an open registry a
spot's `accepts` can name, alongside the reserved built-ins) live in `library.tokenTypes` (schema
**0.5.0**) — see step 5.

> **0.5.0 is not backward compatible.** It replaced the old closed five-key `anchors` slot map
> (`building`/`skull`/`hero`/`foe`/`marker`, one point each) with `spots` — an open list per
> location, each with an `accepts` list of the token types it renders. A document authored before
> 0.5.0 (still carrying `anchors`) no longer validates; the Creator detects the older
> `schemaVersion` on open and offers an export-then-clear dialog rather than migrating it — there
> is no migration path. See [save-load.md](./save-load.md).

## Authoring flow

1. **Boards tab → Clone RtDT preset.** A full copy of the built-in board — 60 locations, spots,
   adjacency, calibration — ready to rename and re-art. (Or **Add empty board** to start bare.)
   The clone keeps the built-in board art by **reference** (`imageRef: builtin:rtdt-board`): the
   real image is 4096²/22 MB — ~30 MB of base64 in a shared `.json`, and 20× the 1.5 MB cap on an
   uploaded board image — so nothing is embedded and each app renders it from its own copy. Zero
   bytes in the document, and the Player still plays it at full resolution.
2. **Upload art.** Capped at 2048×2048 / ~1.5 MB. The stored image's real dimensions become
   `imageInfo.width/height`, and the upload replaces the built-in reference. **Use built-in RtDT
   art** puts it back (and restores `imageInfo` to 4096²; normalized spots don't move). A
   replaced upload stays in `library.resources.images` — delete it from the Asset Manager, which
   lists it as unused, if you want the bytes back.
3. **Locations.** Add/rename/delete; set kingdom, terrain and building. **A location's position is
   its spots** — there is no separate "place" record — so a new row exists in data but renders
   nowhere until it has one. **+ Add** therefore drops you straight into Spots mode with the new
   location armed: click the board and it lands. For an existing row, the **◎** button beside it
   does the same (it turns into a filled **◉** once placed), and the Locations header counts how
   many are still off the map. A **rename remaps this
   board's spots and adjacency in the same commit** — but it does **not** rewrite graph nodes that
   referenced the old name. Those surface in the Problems panel as dangling refs; fix them there.
   **Remove…** clears locations in bulk, scoped to everything or to one **kingdom / terrain /
   building** — handy for keeping the RtDT clone's geometry while replacing a kingdom's spaces.
   The picker only offers values the board actually has (with counts), and shows how many of how
   many will go before you confirm. Spots and adjacency edges go with the removed locations;
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

5. **Token types.** The **Token types…** button, mirroring Building types above, opens the
   scenario's open token registry (`library.tokenTypes`) — a type is presentational (name, id,
   placement, whether it's removable, an optional art reference, a fallback tint colour, and a
   stacking capacity), unlike a building type there are no effects to author. A token type's id is
   what a spot's `accepts` list names, alongside the reserved built-ins (hero/foe/adversary/
   building/skull/monument/marker/quest) every board understands with no registry entry at all.
   **Clone** and **rename-retypes-every-reference** work the same way as Building types.
   Unlike buildings, a new scenario seeds **no** default token types — there is no RtDT-equivalent
   starting vocabulary for custom tokens, so the registry starts empty until you add one.
6. **Spots.** Pick a location, pick which types the spot accepts, click the map. Tokens are drawn
   at these points. The status line under the canvas always says what the next click will do.
   Panning does not place a spot — a press only counts as a click if the pointer barely moved.
   **Shape follows the reserved type it single-mindedly accepts** (the five inherited glyphs: ●
   hero, ■ building, ▲ foe, ◆ skull, ▼ marker — adversary shares foe's triangle, monument shares
   building's square, quest shares marker's inverted triangle), **colour is the kingdom**; a spot
   accepting a custom type, or more than one type, draws as a hexagon with an accept-count badge.
   Each spot can be edited from the Locations panel too: a multi-select lists every reserved id
   plus whatever `library.tokenTypes` defines, so one spot can legally host several types (e.g. a
   `foe` spot that also accepts `adversary`, matching the built-in board). In this mode the spots
   themselves are not clickable, so you can drop one on top of another; pick a different location
   from the list instead, or remove/edit it from the Locations panel.
7. **Adjacency.** Click two locations to link/unlink (always written symmetrically). _Suggest from
   proximity_ seeds the graph from spot distance.
8. **Calibrate.** Drag the centre dot and radius handle to fit the board's printed circle, and set
   the north heading. Needed only for 3D.
9. **Use in game.** Points `setup.board` at this board. The Inspector's location dropdowns and the
   `foe.spawn` / `foe.move` effect fields immediately offer the custom names, and L2 validates
   against them. A `token.place`/`token.remove` effect naming a `library.tokenTypes` id now
   actually reaches the board at play time (it used to be a no-op in the Player).

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

**3D needs calibration.** The 3D disc projection maps a board's spots from image space onto the
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

`packages/game-data/tools/location-marker/` is the standalone dev tool that generates the
**built-in RtDT board data** (via `gen-board-data.mjs`, which emits `BOARD_SPOTS`). It remains the
pipeline for that one board. The Board Designer supersedes it for authoring _custom_ boards inside
a scenario.
