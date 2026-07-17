<h1 align="center">ultimatedarktowerdata</h1>

<p align="center">
  Return to Dark Tower reference data — board locations, foes, heroes, monuments, box inventory, glyphs, and seed parsing for the <a href="https://github.com/ChessMess/UltimateDarkTower"><strong>UltimateDarkTower</strong></a> ecosystem.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ultimatedarktowerdata"><img alt="npm version" src="https://img.shields.io/npm/v/ultimatedarktowerdata.svg"></a>
  <a href="https://www.npmjs.com/package/ultimatedarktowerdata"><img alt="npm downloads" src="https://img.shields.io/npm/dm/ultimatedarktowerdata.svg"></a>
  <a href="https://github.com/ChessMess/UltimateDarkTower/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/ultimatedarktowerdata.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-blue"></a>
</p>

---

## What this is

Pure Return to Dark Tower reference data, with **zero runtime dependencies** and
no Bluetooth.

Includes:

- **Foes & adversaries** — `FOES`, `ADVERSARY_ROSTER`, `ALL_FOES`, `FOE_BY_ID`, `FOE_BY_NAME`
- **Heroes** — `HEROES`, `HERO_BY_ID` (identity) and gameplay content (banner actions, virtues)
- **Monuments** — `MONUMENTS`, `MONUMENT_BY_ID`
- **Box inventory** — component/token counts per expansion
- **Board** (`ultimatedarktowerdata/board`) — the 60 built-in locations, layout
  anchors, and the movement adjacency graph (`neighborsOf`, `stepDistance`, `shortestPath`)
- **Seed** (`ultimatedarktowerdata/seed`) — scenario seed encode/decode and the
  deterministic `SystemRandom` RNG
- **Glyphs & audio** — `GLYPHS`, `TOWER_LIGHT_SEQUENCES`, `TOWER_AUDIO_LIBRARY`
  (name/category catalogs; the tower's own byte values, unchanged from `ultimatedarktower`)

## Install

```bash
npm install ultimatedarktowerdata
```

## Usage

```ts
import { BOARD_LOCATIONS, FOES, HEROES } from 'ultimatedarktowerdata';
import { decodeSeed } from 'ultimatedarktowerdata/seed';
```

You usually don't need this if you're already using `ultimatedarktower` for a
physical tower connection, `ultimatedarktowerdisplay` for a renderer, or
`ultimatedarktowerboard` for a board UI — they depend on this package and
re-export what they need. Install it directly when you want the reference data
**without** a Bluetooth dependency (a browser app, a content tool, a card generator).

## License

MIT — see [LICENSE](./LICENSE). Some elements are © Restoration Games, LLC and are used with permission.

---

## History

Split out of [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower)
(the BLE driver) in v6. The two were entangled only by packaging, not by code —
the driver never read this data, but every consumer of it had to load a
Node-only Bluetooth stack just to get it.
