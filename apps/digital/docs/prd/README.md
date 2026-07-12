# UTDD PRDs

Product Requirements Documents for **UltimateDarkTowerDigital**. Start with
**[_overview.md](_overview.md)** — it explains the product vision, the "UTDD is a display, not a rules
engine" principle, why the MVP is browser-only, and the state-source abstraction that ties everything
together.

These PRDs follow the [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) convention: each has an
Overview, Goals, User Stories, **numbered Functional Requirements**, Non-Goals, Design/Technical
Considerations, Success Metrics, and Open Questions. Functional requirements are referenced as
`FR-<prd>.<n>` (e.g. `FR-01.3`).

## How to use these

1. Read `_overview.md`.
2. Implement **PRD-00** first — it scaffolds the repo and the state-source seam everything else builds on.
3. PRDs 01–04 are the MVP game features; they can be tackled in parallel once 00 lands, though
   01 (tower) and 02 (board) come before 04 (session glue).
4. To turn a PRD into an implementation task list, run it through `ai-dev-tasks/generate-tasks.md`.
   PRD-00 also ships a worked task-list example inline.

## Index

| PRD                                              | Title                                   | Scope                                                                                                                    |
| ------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [_overview](_overview.md)                        | Vision & Architecture                   | Read first                                                                                                               |
| [assumptions](assumptions-and-open-questions.md) | Assumptions, Verified Facts, Risks & IP | Read second — verified vs. assumed, known discrepancies, IP stance                                                       |
| [00](prd-00-scaffolding.md)                      | Scaffolding & Architecture              | Repo skeleton, stack, state-source seam, app shell, CI/deploy                                                            |
| [01](prd-01-tower-emulator.md)                   | Tower Emulator & Interactions           | Render tower; drop skull, break seal, rotate, lights/sounds                                                              |
| [02](prd-02-game-board.md)                       | Digital Game Board                      | Place/move heroes, foes, adversary, skulls, markers on locations                                                         |
| [03](prd-03-player-boards.md)                    | Digital Player Boards                   | Per-hero tracking: virtues, resources, items, corruption                                                                 |
| [04](prd-04-session-solo.md)                     | Game Session & Solo Orchestration       | Manual setup capture; the single portable `GameSession` JSON (save / load / export / import / share); month-turn tracker |
| [05](prd-05-official-app-bridge.md)              | Official App Bridge _(future)_          | Node FakeTower + WS; swap ManualSource→BridgeSource                                                                      |
| [06](prd-06-online-multiplayer.md)               | Online Multiplayer _(future)_           | Networked shared session                                                                                                 |
