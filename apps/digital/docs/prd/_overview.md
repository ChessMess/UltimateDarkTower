# UTDD — Product Vision & Architecture Overview

> Read this first. It frames every PRD in this folder. Individual PRDs follow the
> [ai-dev-tasks](https://github.com/snarktank/ai-dev-tasks) structure and are written so a
> junior developer can implement them.

## What UTDD is

**UltimateDarkTowerDigital (UTDD)** is a web app that lets one person play a full **solo base game**
of *Return to Dark Tower* (Restoration Games, 2022) — 1 player controlling **up to 4 heroes**, **no
expansions** — by combining a **software tower emulator**, a **digital game board**, and **digital
player boards** in the browser.

UTDD is built by composing the existing UDT library family:

| Library | npm | What UTDD uses it for |
|---|---|---|
| UDT core | `ultimatedarktower` | `TowerState`, command/seal/skull/glyph logic, and reusable game data (heroes, foes, adversaries, 60 board locations, adjacency, seed parser) |
| UDT Display | `ultimatedarktowerdisplay` | text/2D/3D tower renderers + the `ScenePlugin` seam |
| UDT Board | `ultimatedarktowerboard` | `BoardState` + the all-in-one `BoardStageView` (2D + 3D board) |
| UDT Sync | `dark-tower-sync` | reference for the **future** Node `bleno` FakeTower bridge (PRD-05) |

## The single most important design idea: UTDD is a *display*, not a rules engine

In the real game **the official companion app is the brain**: it owns the rules, the random events,
the hero/adversary/item/dungeon specifics, and it tells players where to place foes, when to break
seals, etc. UTDD's long-term role is to be the *tower and board that the official app talks to* — it
renders what the app commands and lets the player perform the physical actions (drop a skull, break a
seal) that feed back to the app.

UTDD **does not** reimplement the rules. Much of that data lives only inside the official app and on
physical cards.

## Why the MVP is browser-only (and how the app connects later)

The official app connects to a tower as a **Bluetooth LE *peripheral*** (the app is the "central").
**A browser cannot advertise as a BLE peripheral** — Web Bluetooth is central-only. So a genuine
connection to the official app requires a small **Node/Electron process running a fake BLE peripheral**
(UDT Sync already has one: `packages/host/src/fakeTower.ts`). That process must also *synthesize* the
notifications a real tower would send back (skull drops, calibration, battery) so the player's actions
reach the app.

That Node layer is real work, so we **defer it** (PRD-05). For the **MVP the player drives everything
manually** in the browser: they operate the tower emulator, place foes/heroes on the board, and track
their player boards by hand — exactly the inputs that will later come from the official app.

## The keystone abstraction: state sources

Every feature is built behind two interfaces:

```
TowerStateSource   // who decides the current TowerState
BoardStateSource   // who decides the current BoardState
```

- **MVP** ships a `ManualSource` for each: the player's UI actions mutate state directly.
- **PRD-05** ships a `BridgeSource`: the official app (via the Node FakeTower + WebSocket) drives the
  same state, and the UI is unchanged.
- **PRD-06** reuses the same seam for networked multiplayer.

This is *why* a browser-only MVP can grow into the official-app-driven product without a rewrite.

## How the player coordinates with the official app (MVP)

In the MVP there is **no live connection** to the official app. The player runs the real companion app
(on their phone/tablet) as they normally would and **mirrors it into UTDD by hand**: when the app says
"place [foe] at [location]" or "remove the glowing seal," the player performs that action in UTDD; when
UTDD is used to drop a skull or break a seal, the player also does it in the app. UTDD is the screen
they look at and act on; the app remains the rules brain. PRD-05 later removes the manual mirroring for
the tower channel (the app drives UTDD directly); board placement instructions are out-of-band of the
BLE tower protocol and may stay manual/assisted — see
[assumptions-and-open-questions.md](assumptions-and-open-questions.md).

## Rendering

UTDD uses UDT Board's **`BoardStageView`** (2D + lazy-loaded 3D + a `2d | 3d | 2d3d | pip-*` mode
switcher) as the rendering foundation from day one, with the tower 3D model composed into the **same**
WebGL scene via UDT Display's `ScenePlugin`. Tower and board share one canvas, camera, and lighting.

## The whole game is one portable JSON object

A game is captured as a single **`GameSession`** object: the initial **configuration** (entered manually,
since the official app does setup), the **tower state**, the **board state**, the **player boards**, and
the **progress** (month/turn). That one object is the unit of **save, load, and share** — save it to
resume, export it to a file, or send the JSON to a friend who imports it and continues the *identical*
game. The state sources own the live tower/board; the session layer (PRD-04) composes everything into
this single serializable snapshot. Because tower and board state are already plain JSON, this is just
`JSON.stringify` — no custom format.

## PRD map

| PRD | Title | Status |
|---|---|---|
| [00](prd-00-scaffolding.md) | Scaffolding & Architecture | MVP foundation |
| [01](prd-01-tower-emulator.md) | Tower Emulator & Interactions | MVP |
| [02](prd-02-game-board.md) | Digital Game Board | MVP |
| [03](prd-03-player-boards.md) | Digital Player Boards | MVP |
| [04](prd-04-session-solo.md) | Game Session & Solo Orchestration | MVP |
| [05](prd-05-official-app-bridge.md) | Official App Bridge | Future (stub) |
| [06](prd-06-online-multiplayer.md) | Online Multiplayer | Future (stub) |

## Glossary

- **TowerState / BoardState** — plain data objects from UDT core / UDT Board describing the tower and
  board. Both are *dumb*: they hold state, they don't enforce rules.
- **State source** — an object that owns and emits the current TowerState/BoardState (`ManualSource`
  now, `BridgeSource` later).
- **ScenePlugin** — UDT Display's hook for attaching extra 3D objects (the board) to the tower scene.
- **Official app** — Restoration Games' Bluetooth companion app; the game's rules brain.

## Before building: read the ledger

[**assumptions-and-open-questions.md**](assumptions-and-open-questions.md) records what we've **verified**
against source vs. what we're **assuming**, the **known discrepancies** (e.g. foe status has 3 states in
the library but 5 in the rules), and the **intellectual-property / asset-provenance** stance (UTDD is an
unofficial fan companion; *Return to Dark Tower* art, text, audio © Restoration Games — do not
redistribute beyond what the UDT libraries already do, and settle licensing before any public build).
