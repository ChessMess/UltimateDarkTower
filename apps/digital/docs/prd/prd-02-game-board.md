# PRD-02 — Digital Game Board

> MVP feature. Depends on PRD-00. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

The digital game board is the playable map: the 4 kingdoms, 60 locations, 16 buildings, and the tokens
on them (heroes, foes, the adversary, skulls on buildings, space markers, quest markers). It renders
via UDT Board's `BoardStageView` (2D map + shared 3D disc) and lets the player place and move tokens —
notably **placing foes/adversaries where the official app tells them to** (in MVP the player enters
this manually).

## 2. Goals

- Render the board with all 60 locations and 16 buildings using `BoardStageView`.
- Let the player place/move heroes (up to 4), foes (levels 2–4), and the adversary (level 5) onto
  named locations, and place skulls on buildings (with destruction at 4).
- Own board content exclusively through a `BoardStateSource` (the `ManualSource` from PRD-00).
- Support 2D, 3D, and split (`2d3d`/`pip`) viewing via the stage's mode switcher.

## 3. User Stories

- *As a player*, when the app says "place a [foe] at [location]", I can add that foe token there, so
  the board matches the app's instruction.
- *As a player*, I can move a hero from one location to an adjacent one, so I can take my movement.
- *As a player*, I can add skulls to a building and see it become destroyed at the 4th skull, so the
  board reflects skull emergence.
- *As a player*, I can place the adversary when it spawns and advance a foe's status, so the board
  tracks escalation.
- *As a player*, I can switch between 2D map and 3D disc, so I can use whichever view I prefer.

## 4. Functional Requirements

1. **FR-02.1** The board MUST render all `BOARD_LOCATIONS` (60) and the 16 buildings via
   `BoardStageView`, in 2D and in the shared 3D scene. Note: buildings (Citadel/Sanctuary/Village/
   Bazaar) are a `building?` **property of named locations**, not locations themselves — there is no
   location named "Citadel"; the north citadel is e.g. "Radiant Mountains".
2. **FR-02.2** Board content MUST be owned by a `BoardStateSource`; mutations go through it and the
   underlying `BoardStateController`. UI-only state (selection, armed placement, camera focus) MUST be
   kept separate from `BoardState`.
3. **FR-02.3** The player MUST be able to place and remove **foe** tokens (levels 2–4) at any location,
   choosing the foe type from UDT core's `FOES` roster.
4. **FR-02.4** The player MUST be able to place the **adversary** (from `ADVERSARY_ROSTER`) at a
   location and remove it.
5. **FR-02.5** The player MUST be able to place **hero** tokens (up to 4) and **move** them; movement
   helpers MAY use `BOARD_ADJACENCY` / `neighborsOf` / `shortestPath` to suggest legal moves, but
   movement is **not enforced** (the app/player owns rules).
6. **FR-02.6** The player MUST be able to add/remove **skulls on a building**; reaching 4 skulls MUST
   mark the building destroyed (per `BoardState` building semantics).
7. **FR-02.7** The player MUST be able to set a foe's **status** to any of the game's five values:
   `panicked | unsteady | ready | savage | lethal` (lowest → highest threat). The `ultimatedarktower`
   lib's `FOE_STATUSES`/`FoeStatus` was extended from 3 to these 5 to match the official game's
   foe-status track (resolved — see [assumptions-and-open-questions.md](assumptions-and-open-questions.md#known-discrepancies--risks)).
8. **FR-02.8** The player MUST be able to place/remove **space markers** at locations (e.g. wasteland,
   power-skull). `BoardState.spaceMarkers` uses an open `SpaceMarker` string union, so **quest markers**
   are modeled as a marker variant (there is no dedicated quest-marker field).
9. **FR-02.9** Selecting a token MUST surface its details (type, location, status) in an inspector.
10. **FR-02.10** The board MUST support the stage's display modes (`2d | 3d | 2d3d | pip-2dbig |
    pip-3dbig`) and kingdom focus (N/E/S/W/all).
11. **FR-02.11** Token art MUST load from the configured `assetBaseUrl` using the `${group}/${kebab(id)}`
    convention; missing art MUST degrade gracefully (placeholder, no crash).

## 5. Non-Goals (Out of Scope)

- Deciding *where* foes spawn or *which* foe spawns (the app's rules; player enters it).
- Battle resolution, quest resolution, dungeon exploration (app-owned; UTDD only reflects outcomes via
  token/skull changes).
- Enforcing movement range or legality.

## 6. Design Considerations

- Placement UX: an "armed placement" mode — pick a token type, then click a location (the stage exposes
  a location-pick store / `onLocationPick`).
- Inspector panel for the selected token; a palette for choosing what to place.
- Reuse the stage's built-in editing UI where it fits, but route all mutations through the source.

## 7. Technical Considerations

- `BoardState`, `BoardStateController`, `createDefaultBoardState`, `BoardStageView` come from
  `ultimatedarktowerboard`; rosters and location/adjacency data from `ultimatedarktower`.
- Keep `BoardStateSource` mutations thin wrappers over controller methods (`spawnFoe`, `moveToken`,
  `addSkulls`, …) so PRD-05's `BridgeSource` can apply app-driven board commands the same way.
- The 3D board is the Display ScenePlugin already composed by PRD-00; this PRD just feeds it state.

## 8. Success Metrics

- All token types placeable/movable/removable; building destruction triggers at 4 skulls.
- 2D and 3D stay in sync after a sequence of placements.
- No crashes on missing token art.

## 9. Open Questions

Resolved for MVP (decisions made during implementation):

- **Adjacency move suggestions** — **off in MVP**. Movement isn't enforced (FR-02.5), and the
  inspector's move control lets the player pick any of the 60 locations. `BOARD_ADJACENCY`/
  `neighborsOf` remain available to add an optional "legal moves" assist later.
- **Token art** — UTDD ships **no custom token set**; the stage's built-in programmatic fallback
  (kind-tinted disc/sprite) renders every token, so missing art degrades gracefully (FR-02.11). A
  curated art set can drop into `public/assets/tokens/` later with no code change.
- **Building destruction** — the board library is a dumb container (never auto-destroys), so UTDD
  applies the base-game rule in `ManualBoardSource`: a building flips to **destroyed at its 4th
  skull** (`SKULLS_TO_DESTROY`) and restores if skulls drop below it (undo-friendly).

## 10. Implementation status (MVP — built)

Implemented and verified (unit tests + in-browser): the board renders all 60 locations / 16
buildings via `BoardStageView` in 2D + the shared 3D scene (FR-02.1), with its built-in mode pills
(`2d | 3d | 2d3d | pip`) and N/E/S/W focus covering FR-02.10. All board content is owned by the
`BoardStateSource`; the stage's selection + armed-placement stores are kept separate from
`BoardState` (FR-02.2). The **placement palette** places foes (L2–4, with status), heroes,
the adversary (L5), skulls on buildings, and space/quest markers — each via a grouped location
dropdown **or** by arming "pick on board" and clicking a space in 2D/3D (FR-02.3–02.8). Adding a
building's 4th skull marks it destroyed (FR-02.6). The **inspector** reflects the clicked token and
offers its actions — foe status/move/remove, hero move/remove, adversary move/clear, building
skull ±, marker removal (FR-02.9). Token art degrades to the stage's programmatic fallback
(FR-02.11). Code: `src/sources/ManualBoardSource.ts` (+ the expanded `BoardStateSource`), the
`gameStore` board actions + selection/locationPick wiring, `useBoardSelection`/`useBoardActions`
hooks, and `src/features/board/{BoardPalette,BoardInspector,LocationSelect,boardData}.tsx`.
