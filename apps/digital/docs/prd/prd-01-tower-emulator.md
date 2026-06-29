# PRD-01 — Tower Emulator & Interactions

> MVP feature. Depends on PRD-00. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

The tower emulator is the software stand-in for the physical Bluetooth tower. It renders the tower's
current `TowerState` (drum positions, the 24 LEDs across 6 layers, broken seals/revealed glyphs,
audio) and lets the player perform the physical interactions they'd normally do with the real tower:
**drop a skull**, **break/remove a seal**, **rotate drums**, and trigger **lights/sounds**. In the MVP
the player drives these directly; later (PRD-05) the official app drives them and the player only
performs the "physical" inputs (drop skull, break seal).

## 2. Goals

- Faithfully render `TowerState` using UDT Display inside the shared 3D scene from PRD-00.
- Let the player perform every tower action the real game requires, manually.
- Own the tower's state exclusively through a `TowerStateSource` (the `ManualSource` from PRD-00).
- Reflect skull drops as a running count and seal breaks as revealed glyphs.

## 3. User Stories

- *As a player*, I can drop a skull into the emulated tower and see the skull-drop count increase, so
  I can perform the mandatory end-of-turn action.
- *As a player*, I can break (remove) a seal at a chosen level/side and see its glyph revealed on the
  tower, so I can track which glyphs are in play.
- *As a player*, I can rotate the drums and see the new positions, so the tower reflects events the app
  would normally trigger.
- *As a player*, I can trigger a light effect or sound to rehearse/visualize a tower cue.
- *As a player*, I can see which glyph currently faces each kingdom, so I know when a glyph constraint
  applies to my home kingdom.

## 4. Functional Requirements

1. **FR-01.1** The tower MUST render the full `TowerState` (3 drums w/ positions, 6 layers × 4 lights
   with their effects, audio) via UDT Display's 3D view within the PRD-00 shared scene.
2. **FR-01.2** The tower's state MUST be owned by a `TowerStateSource`; all reads/writes go through it,
   not through a `UltimateDarkTower` instance directly. (No BLE in MVP.)
3. **FR-01.3** The player MUST be able to **drop a skull**; doing so increments a tracked skull-drop
   count (modeled via the `beam.count` semantics) and is surfaced in the UI.
4. **FR-01.4** The player MUST be able to **break/remove a seal** identified by `{ level, side }`, and
   **restore** it; broken seals MUST be reflected on the tower (glyph revealed) via `applySeals`, and
   the set of broken seals MUST be queryable.
5. **FR-01.5** The player MUST be able to **rotate** any drum to a cardinal position (N/E/S/W); the 3D
   tower MUST animate/reflect the new positions.
6. **FR-01.6** The player MUST be able to trigger LED effects (per `LIGHT_EFFECTS`) and play sounds,
   with the 3D view reflecting lights and playing audio samples.
7. **FR-01.7** The UI MUST show **glyph positions** — which of the 5 glyphs faces which direction —
   derived from drum positions and revealed seals (reuse UDT core glyph helpers).
8. **FR-01.8** All tower mutations MUST emit through the source so the store updates and the 3D view
   re-renders consistently (single source of truth).
9. **FR-01.9** Tower interactions MUST be reachable from a tower control panel in the tower pane.

## 5. Non-Goals (Out of Scope)

- Connecting to a real tower or the official app over BLE (PRD-05).
- Deciding *which* kingdom skulls emerge from or *how many* (that's the app's rules logic; in MVP the
  player resolves emergence manually on the board, see PRD-02).
- Skull physics simulation beyond what UDT Display offers out of the box.
- Calibration flow (no hardware to calibrate; default to calibrated state).

## 6. Design Considerations

- Tower control panel: grouped controls for Drop Skull, Seals (a 12-seal grid by level×side),
  Rotate (3 drums), Lights, Sounds. Mirror the affordances in UDT Display's example/controller.
- Show the skull count and the live glyph-facing readout prominently — these matter during play.

## 7. Technical Considerations

- `TowerState` and helpers (`createDefaultTowerState`, `rtdt_pack/unpack_state`, `isCalibrated`) come
  from `ultimatedarktower`; rendering from `ultimatedarktowerdisplay` (`Tower3DView` /
  `BoardStageView`'s tower). Glyph + light constants from UDT core.
- Seal/skull/glyph state can be tracked in the source as plain data; the UD `UltimateDarkTower` class
  is BLE-oriented, so MVP may model these on the source directly and reuse the class's pure helpers,
  keeping a clean swap to a BLE-backed source in PRD-05.

## 8. Success Metrics

- Every base-game tower interaction is performable in-app and visibly reflected in 3D.
- Skull count and revealed glyphs are accurate after a sequence of actions.
- Switching the tower state source implementation requires no UI changes.

## 9. Open Questions

Resolved for MVP (decisions made during implementation):

- **Player vs. app-driven actions** — the player only performs the two **physical** tower actions:
  **drop a skull** and **break/remove a seal**. **Drum rotation, lights, and sounds are driven by
  the official app**, not the player, so they are *not* exposed as manual controls in MVP. They stay
  on the `TowerStateSource` (so hydration and the PRD-05 bridge can set them) and the 3D tower already
  reflects them via `applyState` — they simply have no player UI. This narrows FR-01.5/FR-01.6 to
  "reflected in 3D, driven by the source" rather than "player-operated".
- **Sounds** — **silent in MVP**. No app to decide emergence/audio, so UTDD does not fabricate tower
  audio; the bridge will drive `state.audio` later through the same `applyState` path.
- **Glyph-facing readout / "spirit" hint** (FR-01.7) — **deferred**. With seals reflected on the 3D
  tower and no rules enforcement, a separate glyph-facing panel wasn't needed for MVP; it can return
  with the bridge when the app actually drives drum positions.

## 10. Implementation status (MVP — built)

Implemented and verified (in-browser): the tower's `TowerState` + broken seals are owned by the
`ManualTowerSource` (FR-01.2) and **pushed into the shared 3D scene** — `TowerBoardStage` subscribes
the source to the stage's `TowerRenderView` and calls `applyState` / `applySeals` on every mutation
and when the lazy 3D tower finishes loading (FR-01.1, FR-01.8). The tower control panel
(`features/tower/TowerPanel.tsx`) offers the two player actions: **Drop skull** (increments the
`beam.count`-based skull-drop count, FR-01.3) and a 12-cell **seal grid** that breaks a seal and
**toggles to restore** it, reflecting broken seals as a count + highlighted cells and revealing the
glyph on the 3D tower (FR-01.4). All of it round-trips through the `GameSession` (seals + skull count
survive save/load and repaint in 3D). Drums/lights/sounds are intentionally **app-driven** and absent
from the panel (see §9), with a note in the UI pointing to the PRD-05 bridge. Code:
`src/lib/TowerBoardStage.tsx` (3D wiring), `src/features/tower/TowerPanel.tsx`, and the unchanged
`src/sources/ManualTowerSource.ts`.
